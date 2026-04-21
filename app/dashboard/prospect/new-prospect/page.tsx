"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { CountryIndicativeSelect } from "@/components/country-indicative-select"
import { ErrorDialog } from "@/components/error-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, Save, UserPlus, CalendarIcon, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import axios from "axios"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { Controller } from "react-hook-form"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { AIRewriteButton } from "@/components/ai-rewrite-button"
import { VoiceInputButton } from "@/components/voice-input-button"

// Villes prédéfinies
const PREDEFINED_CITIES = ["KINSHASA", "KOLWEZI", "MUANDA", "MOANDA", "LUBUMBASHI"]

// Define simplified schema - Seuls ville, nom, prénom, sexe et téléphone sont obligatoires
const formSchema = z.object({
  villesSouhaitees: z.array(z.string()).min(1, "Au moins une ville souhaitée est requise"),
  nom: z.string().min(1, "Le nom est requis"),
  postNom: z.string().optional(),
  prenom: z.string().min(1, "Le prénom est requis"),
  sexe: z.enum(["M", "F"]).default("M"),
  email: z.string().optional().or(z.literal("")),
  indicatif: z.string().default("+243"),
  telephone: z.string().min(1, "Le téléphone est requis"),
  commercialAttritre: z.string().optional(),
  commentaire: z.string().optional(),
  dateRappel: z.date({
    required_error: "La date de rappel est requise",
  }),
  status: z.enum(["prospect", "client", "annuler"]).default("prospect"),
  categorie: z.enum(["Normal", "1000 jeunes", "Autre"]).default("Normal"),
  dateNaissance: z.date().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.categorie === "1000 jeunes") {
    if (!data.dateNaissance) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateNaissance"], message: "La date de naissance est requise pour la catégorie 1000 jeunes" })
      return
    }
    const today = new Date()
    const age = today.getFullYear() - data.dateNaissance.getFullYear() -
      (today < new Date(today.getFullYear(), data.dateNaissance.getMonth(), data.dateNaissance.getDate()) ? 1 : 0)
    if (age < 18) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateNaissance"], message: "Le prospect doit avoir au moins 18 ans pour la catégorie 1000 jeunes" })
    if (age > 28) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateNaissance"], message: "Le prospect doit avoir au maximum 28 ans pour la catégorie 1000 jeunes" })
  }
})

// Define types for users
interface User {
  _id: string
  nom: string
  prenom: string
}

export default function NewProspectPage() {
  const [loading, setLoading] = useState(false)
  const [showSessionError, setShowSessionError] = useState(false)
  const [error, setError] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: "",
    message: "",
  })
  const [users, setUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [otherCity, setOtherCity] = useState("")
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      villesSouhaitees: [],
      nom: "",
      postNom: "",
      prenom: "",
      sexe: "M",
      email: "",
      indicatif: "+243",
      telephone: "",
      commercialAttritre: "",
      commentaire: "",
      dateRappel: new Date(),
      status: "prospect",
      categorie: "Normal",
      dateNaissance: null,
    },
  })

  const handleSessionExpired = () => {
    localStorage.removeItem("authToken")
    Cookies.remove("authToken")
    setShowSessionError(false)
    router.push("/auth/login")
  }

  // Fetch users (parrains) and current user on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true)
        const token = localStorage.getItem("authToken")

        // Fetch both new-prospect data and current user in parallel
        const [newProspectData, currentUserResponse] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/new-data`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        ])

        setUsers(newProspectData.data.users)
        
        // Set current user ID and role
        if (currentUserResponse.data && currentUserResponse.data._id) {
          const userId = currentUserResponse.data._id
          const userRole = currentUserResponse.data.role || ""
          setCurrentUserId(userId)
          setCurrentUserRole(userRole)
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            setShowSessionError(true)
          } else {
            setError({
              show: true,
              title: "Erreur",
              message: error.response?.data?.message || "Une erreur est survenue lors du chargement des données",
            })
          }
        }
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])

  // Set commercialAttritre to current user when users list is loaded
  useEffect(() => {
    if (currentUserId && users.length > 0) {
      form.setValue("commercialAttritre", currentUserId)
    }
  }, [currentUserId, users, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)
      const token = localStorage.getItem("authToken")

      // Format the data for the API — on envoie villesSouhaitees ET villeSouhaitee (première ville) pour rétrocompatibilité
      const prospectData = {
        ...values,
        villeSouhaitee: values.villesSouhaitees[0] ?? "",
      }

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/prospects`, prospectData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      toast({
        title: "Succès",
        description: "Le prospect a été ajouté avec succès",
      })

      // Redirect to the prospects list
      router.push("/dashboard/prospect")
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setShowSessionError(true)
        } else {
          setError({
            show: true,
            title: "Erreur",
            message: error.response?.data?.message || "Une erreur est survenue lors de l'ajout du prospect",
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ErrorDialog
        isOpen={showSessionError}
        onClose={handleSessionExpired}
        title="Session expirée"
        message="Votre session a expiré, veuillez vous reconnecter."
      />

      <ErrorDialog
        isOpen={error.show}
        onClose={() => setError({ show: false, title: "", message: "" })}
        title={error.title}
        message={error.message}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto py-8 px-4">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/prospect")}
                className="hover:bg-white/80 dark:hover:bg-slate-700/80 backdrop-blur-sm border-slate-200 dark:border-slate-600 dark:text-slate-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Nouveau Prospect</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Créez un nouveau prospect rapidement</p>
              </div>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-3xl mx-auto">

            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm dark:border dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 border-b dark:border-slate-700">
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-300">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Informations du Prospect
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-400">
                  Remplissez les informations essentielles du prospect
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* Villes souhaitées (multi-sélection) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Villes souhaitées <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="villesSouhaitees"
                    control={form.control}
                    render={({ field }) => {
                      const selected: string[] = field.value ?? []

                      const toggle = (ville: string) => {
                        if (selected.includes(ville)) {
                          field.onChange(selected.filter((v) => v !== ville))
                        } else {
                          field.onChange([...selected, ville])
                        }
                      }

                      const addOtherCity = () => {
                        const trimmed = otherCity.trim().toUpperCase()
                        if (trimmed && !selected.includes(trimmed)) {
                          field.onChange([...selected, trimmed])
                        }
                        setOtherCity("")
                      }

                      return (
                        <div className="space-y-3">
                          {/* Cases à cocher pour les villes prédéfinies */}
                          <div className="grid grid-cols-2 gap-2">
                            {PREDEFINED_CITIES.map((ville) => (
                              <label
                                key={ville}
                                className="flex items-center space-x-2 cursor-pointer rounded-md border border-slate-200 dark:border-slate-600 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                              >
                                <Checkbox
                                  checked={selected.includes(ville)}
                                  onCheckedChange={() => toggle(ville)}
                                  className="border-slate-400 dark:border-slate-500"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">{ville}</span>
                              </label>
                            ))}
                          </div>

                          {/* Ajout d'une ville personnalisée */}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Autre ville..."
                              value={otherCity}
                              onChange={(e) => setOtherCity(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOtherCity() } }}
                              className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addOtherCity}
                              className="shrink-0 border-slate-200 dark:border-slate-600 dark:text-slate-200"
                            >
                              Ajouter
                            </Button>
                          </div>

                          {/* Badges des villes sélectionnées (dont les villes personnalisées) */}
                          {selected.filter((v) => !PREDEFINED_CITIES.includes(v)).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {selected.filter((v) => !PREDEFINED_CITIES.includes(v)).map((ville) => (
                                <Badge
                                  key={ville}
                                  variant="secondary"
                                  className="flex items-center gap-1 pr-1 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                >
                                  {ville}
                                  <button
                                    type="button"
                                    onClick={() => field.onChange(selected.filter((v) => v !== ville))}
                                    className="ml-1 hover:text-red-600 transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }}
                  />
                  {form.formState.errors.villesSouhaitees && (
                    <p className="text-sm text-red-500">{form.formState.errors.villesSouhaitees.message}</p>
                  )}
                </div>

                {/* Nom, Postnom, Prénom */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nom" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nom <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nom"
                      {...form.register("nom")}
                      placeholder="Entrez le nom"
                      className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    />
                    {form.formState.errors.nom && (
                      <p className="text-sm text-red-500">{form.formState.errors.nom.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postNom" className="text-sm font-medium text-slate-700 dark:text-slate-300">Postnom</Label>
                    <Input
                      id="postNom"
                      {...form.register("postNom")}
                      placeholder="Entrez le postnom"
                      className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prenom" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Prénom <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="prenom"
                      {...form.register("prenom")}
                      placeholder="Entrez le prénom"
                      className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    />
                    {form.formState.errors.prenom && (
                      <p className="text-sm text-red-500">{form.formState.errors.prenom.message}</p>
                    )}
                  </div>
                </div>

                {/* Sexe */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sexe</Label>
                  <RadioGroup
                    value={form.watch("sexe")}
                    onValueChange={(value) => form.setValue("sexe", value as "M" | "F")}
                    className="flex space-x-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="M" id="sexe-m" className="text-blue-600 dark:border-slate-500" />
                      <Label htmlFor="sexe-m" className="text-slate-700 dark:text-slate-300 cursor-pointer">Masculin</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="F" id="sexe-f" className="text-blue-600 dark:border-slate-500" />
                      <Label htmlFor="sexe-f" className="text-slate-700 dark:text-slate-300 cursor-pointer">Féminin</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Catégorie */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Catégorie</Label>
                  <Select
                    onValueChange={(value) => form.setValue("categorie", value as "Normal" | "1000 jeunes" | "Autre")}
                    value={form.watch("categorie")}
                  >
                    <SelectTrigger className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Sélectionnez une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="1000 jeunes">1000 jeunes</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date de naissance — visible uniquement pour la catégorie 1000 jeunes */}
                {form.watch("categorie") === "1000 jeunes" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Date de naissance <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-slate-500 font-normal">(18 à 28 ans requis)</span>
                    </Label>
                    <Controller
                      name="dateNaissance"
                      control={form.control}
                      render={({ field }) => {
                        const today = new Date()
                        const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
                        const minDate = new Date(today.getFullYear() - 28, today.getMonth(), today.getDate())
                        const age = field.value
                          ? (() => {
                              const a = today.getFullYear() - field.value.getFullYear() -
                                (today < new Date(today.getFullYear(), field.value.getMonth(), field.value.getDate()) ? 1 : 0)
                              return a
                            })()
                          : null
                        const ageInvalid = age !== null && (age < 18 || age > 28)
                        return (
                          <div className="space-y-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600",
                                    !field.value && "text-muted-foreground",
                                    ageInvalid && "border-red-400"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "dd MMMM yyyy", { locale: fr }) : "Sélectionnez la date de naissance"}
                                  {age !== null && !ageInvalid && <span className="ml-auto text-xs text-green-600 font-medium">{age} ans</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 dark:bg-slate-800 dark:border-slate-700">
                                <Calendar
                                  mode="single"
                                  selected={field.value ?? undefined}
                                  onSelect={field.onChange}
                                  defaultMonth={maxDate}
                                  fromDate={minDate}
                                  toDate={maxDate}
                                  initialFocus
                                  locale={fr}
                                />
                              </PopoverContent>
                            </Popover>
                            {ageInvalid && (
                              <p className="text-xs text-red-500">
                                {age! < 18
                                  ? `Âge insuffisant (${age} ans) — minimum 18 ans requis pour la catégorie 1000 jeunes.`
                                  : `Âge dépassé (${age} ans) — maximum 28 ans pour la catégorie 1000 jeunes.`}
                              </p>
                            )}
                          </div>
                        )
                      }}
                    />
                    {form.formState.errors.dateNaissance && (
                      <p className="text-sm text-red-500">{form.formState.errors.dateNaissance.message as string}</p>
                    )}
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="exemple@email.com"
                    className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* Téléphone */}
                <div className="space-y-2">
                  <Label htmlFor="telephone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Téléphone <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <CountryIndicativeSelect
                      value={form.watch("indicatif")}
                      onValueChange={(value) => form.setValue("indicatif", value)}
                    />
                    <Input
                      id="telephone"
                      {...form.register("telephone")}
                      placeholder="Entrez le numéro"
                      className="flex-1 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  {form.formState.errors.telephone && (
                    <p className="text-sm text-red-500">{form.formState.errors.telephone.message}</p>
                  )}
                </div>

                {/* Commercial attitré*/}
                <div className="space-y-2">
                  <Label htmlFor="commercialAttritre" className="text-sm font-medium text-slate-700 dark:text-slate-300">Commercial attitré</Label>
                  <Select
                    onValueChange={(value) => form.setValue("commercialAttritre", value)}
                    value={form.watch("commercialAttritre")}
                    disabled={currentUserRole.toLocaleLowerCase() === "agent"}
                  >
                    <SelectTrigger id="commercialAttritre" className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Sélectionnez un commercial attitré" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.nom} {user.prenom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date de rappel */}
                <div className="space-y-2">
                  <Label htmlFor="dateRappel" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Date de rappel <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="dateRappel"
                    control={form.control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 focus:border-blue-500 focus:ring-blue-500",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              <span>Sélectionnez une date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 dark:bg-slate-800 dark:border-slate-700">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {form.formState.errors.dateRappel && (
                    <p className="text-sm text-red-500">{form.formState.errors.dateRappel.message}</p>
                  )}
                </div>

                {/* Commentaire */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="commentaire" className="text-sm font-medium text-slate-700 dark:text-slate-300">Commentaire</Label>
                    <AIRewriteButton
                      getValue={() => form.getValues("commentaire") ?? ""}
                      onApply={(text) => form.setValue("commentaire", text, { shouldDirty: true })}
                    />
                    <VoiceInputButton
                      getValue={() => form.getValues("commentaire") ?? ""}
                      onUpdate={(text) => form.setValue("commentaire", text, { shouldDirty: true })}
                      onApply={(text) => form.setValue("commentaire", text, { shouldDirty: true })}
                    />
                  </div>
                  <Textarea
                    id="commentaire"
                    {...form.register("commentaire")}
                    placeholder="Ajoutez un commentaire ou des notes importantes..."
                    rows={4}
                    className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  />
                </div>
              </CardContent>
              <CardContent className="flex justify-end p-6 bg-slate-50/50 dark:bg-slate-700/30 border-t dark:border-slate-700">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Enregistrement..." : "Enregistrer le Prospect"}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </>
  )
}
