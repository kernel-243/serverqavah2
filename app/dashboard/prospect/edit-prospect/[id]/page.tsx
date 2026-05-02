"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FieldErrors } from "react-hook-form"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Controller } from "react-hook-form"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Villes prédéfinies
const PREDEFINED_CITIES = ["KINSHASA", "KOLWEZI", "MUANDA", "MOANDA", "LUBUMBASHI"]
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  CalendarIcon,
  Save,
  Edit3,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react"
import axios from "axios"
import { useRouter, useParams } from "next/navigation"
import Cookies from "js-cookie"
import { AIRewriteButton } from "@/components/ai-rewrite-button"
import { VoiceInputButton } from "@/components/voice-input-button"

// Schéma complet du formulaire - Seuls ville, nom, prénom, sexe et téléphone sont obligatoires
const formSchema = z.object({
  // Champs obligatoires
  villesSouhaitees: z.array(z.string()).min(1, "Au moins une ville souhaitée est requise"),
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  sexe: z.enum(["M", "F", "Monsieur/Madame"]).default("M"),
  telephone: z.string().min(1, "Le téléphone est requis"),

  // Champs optionnels de base
  postNom: z.string().optional(),
  email: z.string().optional().or(z.literal("")),
  indicatif: z.string().default("+243"),

  commentaire: z.string().optional(),
  dateRappel: z.date({
    required_error: "La date de rappel est requise",
  }),

  // Options avancées (tous optionnels)
  nomCite: z.string().optional().or(z.literal("")),
  commercialAttritre: z.string().optional().or(z.literal("")),
  datePremierContact: z.date().optional().nullable(),
  prospectClient: z.boolean().default(false),
  numeroPC: z.string().optional(),
  dateNaissance: z.date().optional().nullable(),
  paysResidence: z.string().optional().or(z.literal("RDC")),
  provinceResidence: z.string().optional().or(z.literal("Kinshasa")),
  villeResidence: z.string().optional().or(z.literal("Kinshasa")),
  adresse: z.string().optional(),
  indicatif2: z.string().optional().or(z.literal("+243")),
  telephone2: z.string().optional(),
  email2: z.string().optional().or(z.literal("")),
  profession: z.string().optional(),
  situationMatrimoniale: z.string().optional(),
  dimensionSouhaitee: z.string().optional().or(z.literal("0")),
  dateVente: z.date().optional().nullable(),
  prixVente: z.number().optional().default(0),
  modePaiement: z.string().optional(),
  situationFinanciere: z.string().optional(),
  montantImpaye: z.number().optional().nullable(),
  volonteConstruire: z.boolean().default(false),
  anneeConstruction: z.number().optional().nullable(),
  dateVisiteTerrain: z.date().optional().nullable(),
  status: z.enum(["prospect", "client", "annuler"]).default("prospect"),
  categorie: z.enum(["Normal", "1000 jeunes", "Autre"]).default("Normal"),
  prospectPlusDe18Ans: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.categorie === "1000 jeunes" && !data.prospectPlusDe18Ans) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prospectPlusDe18Ans"],
      message: "Le prospect doit avoir plus de 18 ans pour la catégorie 1000 jeunes",
    })
  }
})

// Types pour les cités et utilisateurs
interface Cite {
  _id: string
  nom: string
}

interface User {
  _id: string
  nom: string
  prenom: string
}

export default function EditProspectPage() {
  const [loading, setLoading] = useState(false)
  const [showSessionError, setShowSessionError] = useState(false)
  const [error, setError] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: "",
    message: "",
  })
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [cites, setCites] = useState<Cite[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [otherCity, setOtherCity] = useState("")
  const router = useRouter()
  const { id } = useParams()

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
      dateRappel: new Date(),
      commentaire: "",
      nomCite: "",
      commercialAttritre: "",
      prospectClient: false,
      numeroPC: "",
      paysResidence: "",
      provinceResidence: "",
      villeResidence: "",
      adresse: "",
      indicatif2: "+243",
      telephone2: "",
      email2: "",
      profession: "",
      situationMatrimoniale: "",
      dimensionSouhaitee: "0",
      modePaiement: "",
      situationFinanciere: "",
      prixVente: 0,
      montantImpaye: 0,
      volonteConstruire: false,
      anneeConstruction: 0,
      status: "prospect",
      categorie: "Normal",
      prospectPlusDe18Ans: false,
    },
  })

  const handleSessionExpired = () => {
    localStorage.removeItem("authToken")
    Cookies.remove("authToken")
    setShowSessionError(false)
    router.push("/auth/login")
  }

  // Récupérer les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true)
        const token = localStorage.getItem("authToken")

        const [prospectNewData, prospectResponse, currentUserResponse] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/new-data`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ])

        setCites(prospectNewData.data.cites)
        setUsers(prospectNewData.data.users)

        // Set current user role
        if (currentUserResponse.data?._id) setCurrentUserId(currentUserResponse.data._id)

        // Transformer les données pour le formulaire
        const prospectData = prospectResponse.data
        const currentUserId = currentUserResponse.data?._id || ""

        // Normaliser commercialAttritre vers une string (éviter object/null)
        const commercialAttritre =
          typeof prospectData.commercialAttritre === "string"
            ? prospectData.commercialAttritre
            : prospectData.commercialAttritre?._id || currentUserId || ""

        // Construire villesSouhaitees depuis le tableau ou la valeur unique (rétrocompat)
        const villesSouhaitees: string[] =
          Array.isArray(prospectData.villesSouhaitees) && prospectData.villesSouhaitees.length > 0
            ? prospectData.villesSouhaitees
            : prospectData.villeSouhaitee
            ? [prospectData.villeSouhaitee]
            : []

        form.reset({
          ...prospectData,
          villesSouhaitees,
          commercialAttritre: commercialAttritre,
          nomCite: typeof prospectData.nomCite === "string" ? prospectData.nomCite : "",
          modePaiement: typeof prospectData.modePaiement === "string" ? prospectData.modePaiement : "comptant",
          datePremierContact: prospectData.datePremierContact ? new Date(prospectData.datePremierContact) : null,
          dateNaissance: prospectData.dateNaissance ? new Date(prospectData.dateNaissance) : null,
          dateVente: prospectData.dateVente ? new Date(prospectData.dateVente) : null,
          dateVisiteTerrain: prospectData.dateVisiteTerrain ? new Date(prospectData.dateVisiteTerrain) : null,
          dateRappel: prospectData.dateRappel ? new Date(prospectData.dateRappel) : new Date(),
          dimensionSouhaitee: prospectData.dimensionSouhaitee ?? "0",
          prixVente: prospectData.prixVente ?? 0,
          montantImpaye: prospectData.montantImpaye ?? 0,
          anneeConstruction: prospectData.anneeConstruction ?? 0,
          // Prospect 1000 jeunes existant → checkbox déjà validée
          prospectPlusDe18Ans: prospectData.categorie === "1000 jeunes",
        })
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
  }, [id, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setValidationErrors([])

    // Appliquer les valeurs par défaut pour les champs optionnels vides
    if (!values.situationMatrimoniale) values.situationMatrimoniale = "célibataire"
    if (!values.modePaiement) values.modePaiement = "comptant"
    if (!values.situationFinanciere) values.situationFinanciere = "à jour"

    try {
      setLoading(true)
      const token = localStorage.getItem("authToken")

      const payload = {
        ...values,
        villeSouhaitee: values.villesSouhaitees[0] ?? "",
        // Champs normalisés pour éviter les erreurs backend "expected string"
        nomCite: typeof values.nomCite === "string" ? values.nomCite : "",
        modePaiement: typeof values.modePaiement === "string" && values.modePaiement ? values.modePaiement : "comptant",
        commercialAttritre:
          typeof values.commercialAttritre === "string"
            ? values.commercialAttritre
            : currentUserId || "",
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/prospects/${id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      toast({
        title: "Succès",
        description: "Le prospect a été mis à jour avec succès",
      })

      router.push("/dashboard/prospect")
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setShowSessionError(true)
        } else {
          setError({
            show: true,
            title: "Erreur",
            message: error.response?.data?.message || "Une erreur est survenue lors de la mise à jour du prospect",
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  function onInvalid(errors: FieldErrors<z.infer<typeof formSchema>>) {
    const fieldLabels: Record<string, string> = {
      villesSouhaitees: "Villes souhaitées",
      nom: "Nom",
      prenom: "Prénom",
      telephone: "Téléphone",
      dateRappel: "Date de rappel",
    }

    const messages = Object.entries(errors)
      .map(([field, err]) => {
        const label = fieldLabels[field] || field
        return err?.message ? `${label} : ${err.message}` : null
      })
      .filter(Boolean) as string[]

    setValidationErrors(messages)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Chargement...</p>
        </div>
      </div>
    )
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
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/prospect")}
                className="hover:bg-white/80 dark:hover:bg-slate-700 backdrop-blur-sm border-slate-200 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Modifier le Prospect</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Modifiez les informations du prospect</p>
              </div>
            </div>
          </div>

          {/* Erreurs de validation */}
          {validationErrors.length > 0 && (
            <div className="max-w-3xl mx-auto mb-6">
              <Alert variant="destructive" className="dark:bg-red-950 dark:border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Veuillez corriger les erreurs suivantes :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {validationErrors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="max-w-3xl mx-auto">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm dark:border dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 border-b dark:border-slate-700">
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-300">
                  <Edit3 className="h-5 w-5 mr-2" />
                  Informations du Prospect
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-400">
                  Modifiez les informations essentielles du prospect
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                {/* SECTION DE BASE */}

                {/* Villes souhaitées */}
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
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">{ville}</span>
                              </label>
                            ))}
                          </div>

                          {/* Saisie d'une ville personnalisée */}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Autre ville..."
                              value={otherCity}
                              onChange={(e) => setOtherCity(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOtherCity() } }}
                              className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                            />
                            <Button type="button" variant="outline" onClick={addOtherCity} className="shrink-0">
                              Ajouter
                            </Button>
                          </div>

                          {/* Badges des villes personnalisées sélectionnées */}
                          {selected.filter((v) => !PREDEFINED_CITIES.includes(v)).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {selected.filter((v) => !PREDEFINED_CITIES.includes(v)).map((ville) => (
                                <Badge
                                  key={ville}
                                  variant="secondary"
                                  className="flex items-center gap-1 cursor-pointer"
                                  onClick={() => toggle(ville)}
                                >
                                  {ville} <span className="ml-1 text-xs">×</span>
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
                      className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
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
                      className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
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
                      className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
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
                    onValueChange={(value) => form.setValue("sexe", value as "M" | "F" | "Monsieur/Madame")}
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
                    value={form.watch("categorie") || "Normal"}
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

                {/* Validation âge — visible uniquement pour la catégorie 1000 jeunes */}
                {form.watch("categorie") === "1000 jeunes" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Validation âge</Label>
                    <Controller
                      name="prospectPlusDe18Ans"
                      control={form.control}
                      render={({ field }) => (
                        <div className="flex items-start gap-3 rounded-md border border-slate-200 dark:border-slate-600 px-3 py-2">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                            className="mt-0.5 border-slate-400 dark:border-slate-500"
                          />
                          <div className="space-y-1">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              Prospect a plus de 18 ans <span className="text-red-500">*</span>
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Ce champ doit être coché pour enregistrer un prospect de catégorie 1000 jeunes.
                            </p>
                          </div>
                        </div>
                      )}
                    />
                    {form.formState.errors.prospectPlusDe18Ans && (
                      <p className="text-sm text-red-500">{form.formState.errors.prospectPlusDe18Ans.message as string}</p>
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
                    className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
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
                      className="flex-1 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  {form.formState.errors.telephone && (
                    <p className="text-sm text-red-500">{form.formState.errors.telephone.message}</p>
                  )}
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
                              "w-full justify-start text-left font-normal border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-blue-500",
                              !field.value && "text-muted-foreground dark:text-slate-400"
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
                    className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* OPTIONS AVANCÉES - Section dépliante */}
                <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-between border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-all"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Options avancées</span>
                      {isAdvancedOpen ? (
                        <ChevronUp className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-6 pt-6">
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-6">
                      <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-4">Informations complémentaires</h3>

                      {/* Cité */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="nomCite" className="text-sm font-medium text-slate-700 dark:text-slate-300">Cité</Label>
                          <Select onValueChange={(value) => form.setValue("nomCite", value)} value={form.watch("nomCite")}>
                            <SelectTrigger id="nomCite" className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Sélectionnez une cité" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                              {cites.map((cite) => (
                                <SelectItem key={cite._id} value={cite._id} className="dark:text-slate-200 dark:focus:bg-slate-700">
                                  {cite.nom}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Date premier contact et Numéro PC */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="datePremierContact" className="text-sm font-medium text-slate-700 dark:text-slate-300">Date du premier contact</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className="w-full justify-start text-left font-normal border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.watch("datePremierContact") ? (
                                  format(form.watch("datePremierContact") as Date, "PPP", { locale: fr })
                                ) : (
                                  <span className="text-slate-500 dark:text-slate-400">Sélectionnez une date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 dark:bg-slate-800 dark:border-slate-700">
                              <Calendar
                                mode="single"
                                selected={form.watch("datePremierContact") as Date | undefined}
                                onSelect={(date) => form.setValue("datePremierContact", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="numeroPC" className="text-sm font-medium text-slate-700 dark:text-slate-300">Numéro PC</Label>
                          <Input
                            id="numeroPC"
                            {...form.register("numeroPC")}
                            placeholder="Entrez le numéro PC"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                          />
                        </div>
                      </div>

                      {/* Date de naissance — masquée pour la catégorie 1000 jeunes (le checkbox suffit) */}
                      {form.watch("categorie") !== "1000 jeunes" && (
                        <div className="space-y-2">
                          <Label htmlFor="dateNaissance" className="text-sm font-medium text-slate-700 dark:text-slate-300">Date de naissance</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className="w-full justify-start text-left font-normal border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.watch("dateNaissance") ? (
                                  format(form.watch("dateNaissance") as Date, "PPP", { locale: fr })
                                ) : (
                                  <span className="text-slate-500 dark:text-slate-400">Sélectionnez une date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 dark:bg-slate-800 dark:border-slate-700">
                              <Calendar
                                mode="single"
                                selected={form.watch("dateNaissance") as Date | undefined}
                                onSelect={(date) => form.setValue("dateNaissance", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}

                      {/* Résidence */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="paysResidence" className="text-sm font-medium text-slate-700 dark:text-slate-300">Pays de résidence</Label>
                          <Input
                            id="paysResidence"
                            {...form.register("paysResidence")}
                            placeholder="Entrez le pays"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="provinceResidence" className="text-sm font-medium text-slate-700 dark:text-slate-300">Province</Label>
                          <Input
                            id="provinceResidence"
                            {...form.register("provinceResidence")}
                            placeholder="Entrez la province"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="villeResidence" className="text-sm font-medium text-slate-700 dark:text-slate-300">Ville</Label>
                          <Input
                            id="villeResidence"
                            {...form.register("villeResidence")}
                            placeholder="Entrez la ville"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                          />
                        </div>
                      </div>

                      {/* Adresse */}
                      <div className="space-y-2">
                        <Label htmlFor="adresse" className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresse</Label>
                        <Input
                          id="adresse"
                          {...form.register("adresse")}
                          placeholder="Entrez l'adresse complète"
                          className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                        />
                      </div>

                      {/* Téléphone secondaire */}
                      <div className="space-y-2">
                        <Label htmlFor="telephone2" className="text-sm font-medium text-slate-700 dark:text-slate-300">Téléphone secondaire</Label>
                        <div className="flex gap-2">
                          <CountryIndicativeSelect
                            value={form.watch("indicatif2") || "+243"}
                            onValueChange={(value) => form.setValue("indicatif2", value)}
                          />
                          <Input
                            id="telephone2"
                            {...form.register("telephone2")}
                            placeholder="Entrez le numéro secondaire"
                            className="flex-1 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                          />
                        </div>
                      </div>

                      {/* Email secondaire */}
                      <div className="space-y-2">
                        <Label htmlFor="email2" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email secondaire</Label>
                        <Input
                          id="email2"
                          type="email"
                          {...form.register("email2")}
                          placeholder="Entrez l'email secondaire"
                          className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                        />
                      </div>

                      {/* Profession et situation matrimoniale */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="profession" className="text-sm font-medium text-slate-700 dark:text-slate-300">Profession</Label>
                          <Input
                            id="profession"
                            {...form.register("profession")}
                            placeholder="Entrez la profession"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="situationMatrimoniale" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Situation matrimoniale
                            <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">(Célibataire par défaut)</span>
                          </Label>
                          <Select
                            onValueChange={(value) => form.setValue("situationMatrimoniale", value)}
                            value={form.watch("situationMatrimoniale")}
                          >
                            <SelectTrigger id="situationMatrimoniale" className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Célibataire (défaut)" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                              <SelectItem value="célibataire" className="dark:text-slate-200 dark:focus:bg-slate-700">Célibataire</SelectItem>
                              <SelectItem value="marié(e)" className="dark:text-slate-200 dark:focus:bg-slate-700">Marié(e)</SelectItem>
                              <SelectItem value="divorcé(e)" className="dark:text-slate-200 dark:focus:bg-slate-700">Divorcé(e)</SelectItem>
                              <SelectItem value="veuf(ve)" className="dark:text-slate-200 dark:focus:bg-slate-700">Veuf(ve)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Informations sur le terrain */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="dimensionSouhaitee" className="text-sm font-medium text-slate-700 dark:text-slate-300">Dimension souhaitée</Label>
                          <Input
                            id="dimensionSouhaitee"
                            {...form.register("dimensionSouhaitee")}
                            placeholder="Ex: 15x20m"
                            defaultValue="0"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dateVente" className="text-sm font-medium text-slate-700 dark:text-slate-300">Date de vente</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className="w-full justify-start text-left font-normal border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.watch("dateVente") ? (
                                  format(form.watch("dateVente") as Date, "PPP", { locale: fr })
                                ) : (
                                  <span className="text-slate-500 dark:text-slate-400">Sélectionnez une date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 dark:bg-slate-800 dark:border-slate-700">
                              <Calendar
                                mode="single"
                                selected={form.watch("dateVente") as Date | undefined}
                                onSelect={(date) => form.setValue("dateVente", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Informations financières */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="prixVente" className="text-sm font-medium text-slate-700 dark:text-slate-300">Prix de vente ($)</Label>
                          <Input
                            id="prixVente"
                            type="number"
                            {...form.register("prixVente", { valueAsNumber: true })}
                            placeholder="Entrez le prix"
                            defaultValue={0}
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="modePaiement" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Mode de paiement
                            <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">(Comptant par défaut)</span>
                          </Label>
                          <Select
                            onValueChange={(value) => form.setValue("modePaiement", value)}
                            value={form.watch("modePaiement")}
                          >
                            <SelectTrigger id="modePaiement" className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Comptant (défaut)" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                              <SelectItem value="comptant" className="dark:text-slate-200 dark:focus:bg-slate-700">Comptant</SelectItem>
                              <SelectItem value="échelonné" className="dark:text-slate-200 dark:focus:bg-slate-700">Échelonné</SelectItem>
                              <SelectItem value="mixte" className="dark:text-slate-200 dark:focus:bg-slate-700">Mixte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Situation financière */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="situationFinanciere" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Situation financière
                            <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">(À jour par défaut)</span>
                          </Label>
                          <Select
                            onValueChange={(value) => form.setValue("situationFinanciere", value)}
                            value={form.watch("situationFinanciere")}
                          >
                            <SelectTrigger id="situationFinanciere" className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="À jour (défaut)" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                              <SelectItem value="à jour" className="dark:text-slate-200 dark:focus:bg-slate-700">À jour</SelectItem>
                              <SelectItem value="en retard" className="dark:text-slate-200 dark:focus:bg-slate-700">En retard</SelectItem>
                              <SelectItem value="impayé" className="dark:text-slate-200 dark:focus:bg-slate-700">Impayé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="montantImpaye" className="text-sm font-medium text-slate-700 dark:text-slate-300">Montant impayé ($)</Label>
                          <Input
                            id="montantImpaye"
                            type="number"
                            {...form.register("montantImpaye", { valueAsNumber: true })}
                            placeholder="Entrez le montant"
                            defaultValue={0}
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                          />
                        </div>
                      </div>

                      {/* Construction */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                          <Checkbox
                            id="volonteConstruire"
                            checked={form.watch("volonteConstruire")}
                            onCheckedChange={(checked) => form.setValue("volonteConstruire", checked === true)}
                            className="dark:border-slate-500"
                          />
                          <Label htmlFor="volonteConstruire" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                            Volonté de construire
                          </Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="anneeConstruction" className="text-sm font-medium text-slate-700 dark:text-slate-300">Année de construction prévue</Label>
                          <Input
                            id="anneeConstruction"
                            type="number"
                            {...form.register("anneeConstruction", { valueAsNumber: true })}
                            placeholder="Entrez l'année"
                            defaultValue={0}
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dateVisiteTerrain" className="text-sm font-medium text-slate-700 dark:text-slate-300">Date de visite du terrain</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className="w-full justify-start text-left font-normal border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.watch("dateVisiteTerrain") ? (
                                  format(form.watch("dateVisiteTerrain") as Date, "PPP", { locale: fr })
                                ) : (
                                  <span className="text-slate-500 dark:text-slate-400">Sélectionnez une date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 dark:bg-slate-800 dark:border-slate-700">
                              <Calendar
                                mode="single"
                                selected={form.watch("dateVisiteTerrain") as Date | undefined}
                                onSelect={(date) => form.setValue("dateVisiteTerrain", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Statut */}
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">Statut</Label>
                        <Select
                          onValueChange={(value) => form.setValue("status", value as "prospect" | "client" | "annuler")}
                          value={form.watch("status")}
                        >
                          <SelectTrigger id="status" className="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            <SelectValue placeholder="Sélectionnez un statut" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            <SelectItem value="prospect" className="dark:text-slate-200 dark:focus:bg-slate-700">Prospect</SelectItem>
                            <SelectItem value="client" className="dark:text-slate-200 dark:focus:bg-slate-700">Client</SelectItem>
                            <SelectItem value="annuler" className="dark:text-slate-200 dark:focus:bg-slate-700">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>

              <CardContent className="flex justify-end p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t dark:border-slate-700">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Mise à jour..." : "Mettre à jour le Prospect"}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </>
  )
}
