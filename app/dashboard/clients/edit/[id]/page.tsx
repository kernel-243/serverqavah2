"use client"

import { useState, useEffect } from "react"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { CountryIndicativeSelect } from "@/components/country-indicative-select"
import { toast } from "react-hot-toast"
import { Icons } from "@/components/icons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorDialog } from "@/components/error-dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ArrowLeft, Save, Edit3, ChevronDown, ChevronUp, Plus, Trash2, Search } from "lucide-react"
import axios from "axios"
import { CountryList } from "@/components/country-list"

const enfantSchema = z.object({
  nom: z.string().optional().nullable(),
  postnom: z.string().optional().nullable(),
  prenom: z.string().optional().nullable(),
  sexe: z.enum(["M", "F"]).default("M").optional().nullable(),
  occupation: z.enum(["eleve", "etudiant", "employe", "travailleur independant", "autre"]).optional().nullable(),
  dateNaissance: z.string().nullable().optional(),
})

const conjointSchema = z.object({
  nom: z.string().optional().nullable(),
  postnom: z.string().optional().nullable(),
  prenom: z.string().optional().nullable(),
  sexe: z.enum(["M", "F"]).default("M").optional().nullable(),
  dateNaissance: z.string().nullable().optional(),
  adresse: z.string().optional(),
  email: z.string().optional(),
  indicatif: z.string().optional(),
  telephone: z.string().optional(),
})

const formSchema = z.object({
  // Champs essentiels
  nom: z.string().min(1, "Le nom est requis"),
  postnom: z.string().optional().nullable(),
  prenom: z.string().min(1, "Le prénom est requis"),
  sexe: z.enum(["M", "F"]).default("M"),
  email: z.string().optional().nullable(),
  email2: z.string().optional().nullable(),
  indicatif: z.string().min(1, "Indicatif is required"),
  telephone: z.string().min(1, "Le téléphone est requis"),
  indicatif2: z.string().optional().nullable(),
  telephone2: z.string().optional().nullable(),
  
  // Options avancées
  dateNaissance: z.string().optional().nullable(),
  pays: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  commune: z.string().optional().nullable(),
  quartier: z.string().optional().nullable(),
  adresse: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  profession: z.enum(["Salarié", "Commercant", "Entrepreneur", "Travailleur Independant", "Etudiant", "Autre"]).optional().nullable(),
  typeContrat: z.enum(["CDI", "CDD", "Journalier", "Autre"]).default("CDI").optional().nullable(),
  entreprise: z.string().optional().nullable(),
  revenuMensuel: z.number().optional().default(0).nullable(),
  situationMatrimoniale: z.enum(["celibataire", "marié", "divorcé", "veuf", "autre"]).default("celibataire").optional().nullable(),
  nombreEnfants: z.number().min(0).default(0),
  conjoint: conjointSchema.optional().nullable(),
  enfants: z.array(enfantSchema).optional().nullable(),
  parrain: z.string().optional().nullable(),
})

type FormData = z.infer<typeof formSchema>

interface ClientOption {
  _id: string
  code: string
  nom: string
  prenom: string
}

export default function EditClientPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSessionExpiredDialogOpen, setIsSessionExpiredDialogOpen] = useState(false)
  const [parrainResults, setParrainResults] = useState<ClientOption[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [parrainSearchQuery, setParrainSearchQuery] = useState("")
  const [selectedParrain, setSelectedParrain] = useState<ClientOption | null>(null)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const router = useRouter()
  const { id } = useParams()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profession: "Autre",
      indicatif: "+243",
      indicatif2: "+243",
      sexe: "M",
      pays: "RDC",
      ville: "Kinshasa",
      commune: "",
      quartier: "",
      situationMatrimoniale: "celibataire",
      nombreEnfants: 0,
      revenuMensuel: 0,
    },
    mode: "onChange",
  })

  const {
    fields: enfantsFields,
    append: appendEnfant,
    remove: removeEnfant,
  } = useFieldArray({
    control,
    name: "enfants",
  })

  const situationMatrimoniale = watch("situationMatrimoniale")
  const nombreEnfants = watch("nombreEnfants")
  const profession = watch("profession")

  // Fetch client data
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("authToken")
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const clientData = response.data
        
        // Set form values
        Object.keys(clientData).forEach((key) => {
          if (key in formSchema.shape) {
            // Handle parrain field - it might be an object with _id
            if (key === 'parrain' && clientData[key] && typeof clientData[key] === 'object') {
              setValue('parrain', clientData[key]._id || null)
              setSelectedParrain({ _id: clientData[key]._id, code: clientData[key].code || '', nom: clientData[key].nom || '', prenom: clientData[key].prenom || '' })
            } else if (key === 'enfants' && Array.isArray(clientData[key])) {
              // Handle enfants array - useFieldArray will handle this
              setValue('enfants', clientData[key] || [])
            } else if (key === 'situationMatrimoniale') {
              const val = clientData[key]
              const normalized = (val && String(val).trim() !== '') ? String(val).toLowerCase() : null
              const valid: FormData["situationMatrimoniale"] = normalized === 'celibataire' || normalized === 'marié' || normalized === 'divorcé' || normalized === 'veuf' || normalized === 'autre' ? normalized : 'celibataire'
              setValue('situationMatrimoniale', valid)
            } else {
              setValue(key as keyof FormData, clientData[key] ?? null)
            }
          }
        })
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            handleSessionExpired()
            return
          } else if (error.response?.status === 403) {
            setErrorMessage("Vous n'avez pas la permission d'accéder à cette ressource, veuillez contacter votre administrateur.")
            setErrorDialogOpen(true)
          } else {
            setErrorMessage("Erreur lors de la récupération des données du client.")
            setErrorDialogOpen(true)
          }
        } else {
          setErrorMessage("Erreur lors de la récupération des données du client.")
          setErrorDialogOpen(true)
        }
        router.push("/dashboard/clients")
      } finally {
        setIsLoading(false)
      }
    }
    if (id) {
      fetchClientData()
    }
  }, [id, setValue, router])

  // Debounced search for parrain
  useEffect(() => {
    const query = parrainSearchQuery.trim()
    if (query.length < 2) {
      setParrainResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsLoadingClients(true)
      try {
        const token = localStorage.getItem("authToken")
        if (!token) return
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/new-client-fetch`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: query },
        })
        let clientsData: ClientOption[] = []
        if (Array.isArray(response.data.clients)) clientsData = response.data.clients
        else if (Array.isArray(response.data.data)) clientsData = response.data.data
        setParrainResults(
          clientsData
            .map((c: any) => ({ _id: c._id, code: c.code || '', nom: c.nom || '', prenom: c.prenom || '' }))
            .filter((c: ClientOption) => c._id && c.nom && c.prenom && c._id !== id)
        )
      } catch (error) {
        console.error("Error searching clients for parrain:", error)
      } finally {
        setIsLoadingClients(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [parrainSearchQuery, id])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    const toastId = toast.loading("Mise à jour des informations du client...")
    
    try {
      const token = localStorage.getItem("authToken")
      if (!token) throw new Error("Authentication token not found")
      
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      
      toast.success("Informations du client mises à jour avec succès.", { id: toastId })
      setTimeout(() => {
        router.push("/dashboard/clients")
      }, 1000)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          setErrorMessage("Vous n'avez pas la permission d'effectuer cette action, veuillez contacter votre administrateur.")
          setErrorDialogOpen(true)
        } else if (error.response?.status === 401) {
          handleSessionExpired()
          return
        } else {
          setErrorMessage("Erreur lors de la mise à jour du client. " + (error.response?.data?.message || ""))
          setErrorDialogOpen(true)
        }
      } else {
        setErrorMessage("Erreur lors de la mise à jour du client. " + (error instanceof Error ? error.message : ""))
        setErrorDialogOpen(true)
      }
      toast.error("Échec de la mise à jour du client.", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSessionExpired = () => {
    setIsSessionExpiredDialogOpen(true)
  }

  const handleRedirectToLogin = () => {
    localStorage.removeItem("authToken")
    router.push("/auth/login")
  }

  const getErrorMessage = (error: any): string => {
    if (typeof error === "string") return error
    if (error instanceof Error) return error.message
    if (error?.message) return error.message
    return "Une erreur s'est produite"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Icons.spinner className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Chargement des données du client...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="hover:bg-white/80 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Modifier le Client</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Modifiez les informations du client</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/90 dark:border dark:border-slate-700 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-b dark:border-slate-700">
              <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                <Edit3 className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Informations du Client
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Modifiez les informations essentielles du client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Nom, Postnom, Prénom */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nom <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="nom" 
                    {...register("nom")} 
                    placeholder="Entrez le nom"
                    className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  {errors.nom && (
                    <p className="text-sm text-red-500">{getErrorMessage(errors.nom.message)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postnom" className="text-sm font-medium text-slate-700 dark:text-slate-300">Postnom</Label>
                  <Input 
                    id="postnom" 
                    {...register("postnom")} 
                    placeholder="Entrez le postnom"
                    className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Prénom <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="prenom" 
                    {...register("prenom")} 
                    placeholder="Entrez le prénom"
                    className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  {errors.prenom && (
                    <p className="text-sm text-red-500">{getErrorMessage(errors.prenom.message)}</p>
                  )}
                </div>
              </div>

              {/* Sexe */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sexe</Label>
                <Controller
                  name="sexe"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="M" id="sexe-m" className="text-blue-600" />
                        <Label htmlFor="sexe-m" className="text-slate-700 dark:text-slate-300 cursor-pointer">Masculin</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="F" id="sexe-f" className="text-blue-600" />
                        <Label htmlFor="sexe-f" className="text-slate-700 dark:text-slate-300 cursor-pointer">Féminin</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  {...register("email")} 
                  placeholder="exemple@email.com"
                  className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="telephone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Téléphone <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Controller
                    name="indicatif"
                    control={control}
                    defaultValue="+243"
                    render={({ field }) => (
                      <CountryIndicativeSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        defaultValue="+243"
                      />
                    )}
                  />
                  <Input
                    id="telephone"
                    {...register("telephone")}
                    placeholder="Entrez le numéro"
                    className="flex-1 border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                  />
                </div>
                {(errors.indicatif || errors.telephone) && (
                  <p className="text-sm text-red-500">
                    {getErrorMessage(errors.indicatif?.message || errors.telephone?.message)}
                  </p>
                )}
              </div>

              {/* Parrain */}
              <div className="space-y-2">
                <Label htmlFor="parrain" className="text-sm font-medium text-slate-700 dark:text-slate-300">Client parrainé par</Label>
                {selectedParrain && (
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm">
                    <span className="text-blue-800 dark:text-blue-300 font-medium">{selectedParrain.code} — {selectedParrain.prenom} {selectedParrain.nom}</span>
                    <button
                      type="button"
                      className="text-blue-500 hover:text-red-500 ml-2 text-xs underline"
                      onClick={() => { setSelectedParrain(null); setValue("parrain", null) }}
                    >Retirer</button>
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                  <Input
                    placeholder="Tapez au moins 2 caractères pour rechercher..."
                    value={parrainSearchQuery}
                    onChange={(e) => setParrainSearchQuery(e.target.value)}
                    className="pl-10 border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                  />
                </div>
                {parrainSearchQuery.trim().length >= 2 && (
                  <Controller
                    name="parrain"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
                        onValueChange={(value) => {
                          const found = parrainResults.find((c) => c._id === value) || null
                          setSelectedParrain(found)
                          field.onChange(value || null)
                          setParrainSearchQuery("")
                        }}
                        disabled={isLoadingClients}
                      >
                        <SelectTrigger className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400">
                          <SelectValue placeholder={isLoadingClients ? "Recherche en cours..." : "Sélectionnez un client"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {parrainResults.length === 0 ? (
                            <div className="px-2 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                              {isLoadingClients ? "Recherche en cours..." : "Aucun client trouvé"}
                            </div>
                          ) : (
                            parrainResults.map((client) => (
                              <SelectItem key={client._id} value={client._id}>
                                {client.code} - {client.prenom} {client.nom}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </div>

              {/* OPTIONS AVANCÉES */}
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-between border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
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
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-600 space-y-6">
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-4">Informations complémentaires</h3>

                    {/* Date de naissance */}
                    <div className="space-y-2">
                      <Label htmlFor="dateNaissance" className="text-sm font-medium text-slate-700 dark:text-slate-300">Date de naissance</Label>
                      <Input 
                        id="dateNaissance" 
                        type="date" 
                        {...register("dateNaissance")} 
                        className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>

                    {/* Email 2 */}
                    <div className="space-y-2">
                      <Label htmlFor="email2" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email 2</Label>
                      <Input 
                        id="email2" 
                        type="email" 
                        {...register("email2")} 
                        placeholder="exemple2@email.com"
                        className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>

                    {/* Téléphone 2 */}
                    <div className="space-y-2">
                      <Label htmlFor="telephone2" className="text-sm font-medium text-slate-700 dark:text-slate-300">Téléphone 2</Label>
                      <div className="flex gap-2">
                        <Controller
                          name="indicatif2"
                          control={control}
                          defaultValue="+243"
                          render={({ field }) => (
                            <CountryIndicativeSelect
                              value={field.value || "+243"}
                              onValueChange={field.onChange}
                              defaultValue="+243"
                            />
                          )}
                        />
                        <Input
                          id="telephone2"
                          {...register("telephone2")}
                          placeholder="Entrez le numéro"
                          className="flex-1 border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Adresse */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-800 dark:text-slate-200">Adresse</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="pays" className="text-sm font-medium text-slate-700 dark:text-slate-300">Pays</Label>
                          <Controller
                            name="pays"
                            control={control}
                            render={({ field }) => (
                              <CountryList
                                value={field.value != null ? field.value : undefined}
                                onValueChange={field.onChange}
                                defaultValue="RD Congo"
                              />
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ville" className="text-sm font-medium text-slate-700 dark:text-slate-300">Ville</Label>
                          <Input 
                            id="ville" 
                            {...register("ville")} 
                            placeholder="Entrez la ville"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="commune" className="text-sm font-medium text-slate-700 dark:text-slate-300">Commune</Label>
                          <Input 
                            id="commune" 
                            {...register("commune")} 
                            placeholder="Entrez la commune"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quartier" className="text-sm font-medium text-slate-700 dark:text-slate-300">Quartier</Label>
                          <Input 
                            id="quartier" 
                            {...register("quartier")} 
                            placeholder="Entrez le quartier"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="adresse" className="text-sm font-medium text-slate-700 dark:text-slate-300">Avenue</Label>
                          <Input 
                            id="adresse" 
                            {...register("adresse")} 
                            placeholder="Entrez l'avenue"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="numero" className="text-sm font-medium text-slate-700 dark:text-slate-300">Numéro</Label>
                          <Input 
                            id="numero" 
                            {...register("numero")} 
                            placeholder="Numéro de maison"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Profession */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-800 dark:text-slate-200">Profession</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="profession" className="text-sm font-medium text-slate-700 dark:text-slate-300">Profession</Label>
                          <Controller
                            name="profession"
                            control={control}
                            defaultValue="Autre"
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value || "Autre"}>
                                <SelectTrigger className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400">
                                  <SelectValue placeholder="Sélectionner la profession" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Salarié">Salarié</SelectItem>
                                  <SelectItem value="Commercant">Commerçant</SelectItem>
                                  <SelectItem value="Entrepreneur">Entrepreneur</SelectItem>
                                  <SelectItem value="Travailleur Independant">Travailleur Indépendant</SelectItem>
                                  <SelectItem value="Etudiant">Étudiant</SelectItem>
                                  <SelectItem value="Autre">Autre</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="revenuMensuel" className="text-sm font-medium text-slate-700 dark:text-slate-300">Revenu mensuel</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400">$</span>
                            <Input 
                              id="revenuMensuel" 
                              type="number" 
                              className="pl-8 border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"  
                              {...register("revenuMensuel", {
                                setValueAs: (value) => {
                                  if (value === "" || value === null) return 0
                                  return parseFloat(value)
                                }
                              })} 
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      {profession === "Salarié" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="space-y-2">
                            <Label htmlFor="typeContrat" className="text-sm font-medium text-slate-700 dark:text-slate-300">Type de Contrat</Label>
                            <Controller
                              name="typeContrat"
                              control={control}
                              defaultValue="CDI"
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || "CDI"}>
                                  <SelectTrigger className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400">
                                    <SelectValue placeholder="Sélectionner le type de contrat" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CDI">CDI</SelectItem>
                                    <SelectItem value="CDD">CDD</SelectItem>
                                    <SelectItem value="Journalier">Journalier</SelectItem>
                                    <SelectItem value="Autre">Autre</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="entreprise" className="text-sm font-medium text-slate-700 dark:text-slate-300">Entreprise</Label>
                            <Input 
                              id="entreprise" 
                              {...register("entreprise")} 
                              placeholder="Nom de l'entreprise"
                              className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Situation familiale */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-800 dark:text-slate-200">Situation familiale</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="situationMatrimoniale" className="text-sm font-medium text-slate-700 dark:text-slate-300">Situation Matrimoniale</Label>
                          <Controller
                            name="situationMatrimoniale"
                            control={control}
                            defaultValue="celibataire"
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value || "celibataire"}>
                                <SelectTrigger className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400">
                                  <SelectValue placeholder="Sélectionner la situation matrimoniale" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="celibataire">Célibataire</SelectItem>
                                  <SelectItem value="marié">Marié(e)</SelectItem>
                                  <SelectItem value="divorcé">Divorcé(e)</SelectItem>
                                  <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                                  <SelectItem value="autre">Autre</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nombreEnfants" className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre d'enfants</Label>
                          <Input 
                            id="nombreEnfants" 
                            type="number" 
                            {...register("nombreEnfants", { valueAsNumber: true })} 
                            placeholder="0"
                            className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </div>
                      </div>

                      {/* Conjoint */}
                      {situationMatrimoniale === "marié" && (
                        <div className="p-4 bg-pink-50 dark:bg-pink-950/40 rounded-lg border border-pink-200 dark:border-pink-800 space-y-4">
                          <h5 className="font-medium text-pink-900 dark:text-pink-200">Informations du conjoint</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="conjoint.nom" className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom</Label>
                              <Input 
                                id="conjoint.nom" 
                                {...register("conjoint.nom")} 
                                placeholder="Nom du conjoint"
                                className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="conjoint.postnom" className="text-sm font-medium text-slate-700 dark:text-slate-300">Postnom</Label>
                              <Input 
                                id="conjoint.postnom" 
                                {...register("conjoint.postnom")} 
                                placeholder="Postnom du conjoint"
                                className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="conjoint.prenom" className="text-sm font-medium text-slate-700 dark:text-slate-300">Prénom</Label>
                              <Input 
                                id="conjoint.prenom" 
                                {...register("conjoint.prenom")} 
                                placeholder="Prénom du conjoint"
                                className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sexe</Label>
                              <Controller
                                name="conjoint.sexe"
                                control={control}
                                render={({ field }) => (
                                  <RadioGroup onValueChange={field.onChange} value={field.value || "F"} className="flex space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="M" id="conjoint-sexe-m" />
                                      <Label htmlFor="conjoint-sexe-m" className="text-sm">Masculin</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="F" id="conjoint-sexe-f" />
                                      <Label htmlFor="conjoint-sexe-f" className="text-sm">Féminin</Label>
                                    </div>
                                  </RadioGroup>
                                )}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="conjoint.dateNaissance" className="text-sm font-medium text-slate-700 dark:text-slate-300">Date de naissance</Label>
                              <Input 
                                id="conjoint.dateNaissance" 
                                type="date" 
                                {...register("conjoint.dateNaissance")} 
                                className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="conjoint.email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</Label>
                              <Input 
                                id="conjoint.email" 
                                type="email" 
                                {...register("conjoint.email")} 
                                placeholder="email@exemple.com"
                                className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="conjoint.telephone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Téléphone</Label>
                              <div className="flex">
                                <Controller
                                  name="conjoint.indicatif"
                                  control={control}
                                  render={({ field }) => (
                                    <CountryIndicativeSelect 
                                      value={field.value || "+243"} 
                                      onValueChange={field.onChange} 
                                      defaultValue="+243"
                                      className="rounded-r-none"
                                    />
                                  )}
                                />
                                <Input 
                                  id="conjoint.telephone" 
                                  {...register("conjoint.telephone")} 
                                  placeholder="Numéro de téléphone"
                                  className="rounded-l-none border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="conjoint.adresse" className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresse</Label>
                            <Input 
                              id="conjoint.adresse" 
                              {...register("conjoint.adresse")} 
                              placeholder="Adresse du conjoint"
                              className="border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                            />
                          </div>
                        </div>
                      )}

                      {/* Enfants */}
                      {nombreEnfants > 0 && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-950/40 rounded-lg border border-orange-200 dark:border-orange-800 space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-orange-900 dark:text-orange-200">Informations des enfants ({nombreEnfants} enfant{nombreEnfants > 1 ? 's' : ''})</h5>
                          </div>
                          {enfantsFields.map((field, index) => (
                            <div key={field.id} className="p-3 bg-white dark:bg-slate-800 rounded border border-orange-200 dark:border-orange-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Enfant {index + 1}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeEnfant(index)}
                                  className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-2">
                                  <Label htmlFor={`enfants.${index}.nom`} className="text-xs font-medium text-slate-700 dark:text-slate-300">Nom</Label>
                                  <Input 
                                    {...register(`enfants.${index}.nom`)} 
                                    placeholder="Nom"
                                    className="h-9 text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`enfants.${index}.postnom`} className="text-xs font-medium text-slate-700 dark:text-slate-300">Postnom</Label>
                                  <Input 
                                    {...register(`enfants.${index}.postnom`)} 
                                    placeholder="Postnom"
                                    className="h-9 text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`enfants.${index}.prenom`} className="text-xs font-medium text-slate-700 dark:text-slate-300">Prénom</Label>
                                  <Input 
                                    {...register(`enfants.${index}.prenom`)} 
                                    placeholder="Prénom"
                                    className="h-9 text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Sexe</Label>
                                  <Controller
                                    name={`enfants.${index}.sexe`}
                                    control={control}
                                    render={({ field }) => (
                                      <RadioGroup onValueChange={field.onChange} value={field.value || "M"} className="flex space-x-3">
                                        <div className="flex items-center space-x-1">
                                          <RadioGroupItem value="M" id={`enfants-${index}-sexe-m`} className="h-4 w-4" />
                                          <Label htmlFor={`enfants-${index}-sexe-m`} className="text-xs">M</Label>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <RadioGroupItem value="F" id={`enfants-${index}-sexe-f`} className="h-4 w-4" />
                                          <Label htmlFor={`enfants-${index}-sexe-f`} className="text-xs">F</Label>
                                        </div>
                                      </RadioGroup>
                                    )}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`enfants.${index}.occupation`} className="text-xs font-medium text-slate-700 dark:text-slate-300">Occupation</Label>
                                  <Controller
                                    name={`enfants.${index}.occupation`}
                                    control={control}
                                    render={({ field }) => (
                                      <Select onValueChange={field.onChange} value={field.value || "eleve"}>
                                        <SelectTrigger className="h-9 text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                                          <SelectValue placeholder="Occupation" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="eleve">Élève</SelectItem>
                                          <SelectItem value="etudiant">Étudiant</SelectItem>
                                          <SelectItem value="employe">Employé</SelectItem>
                                          <SelectItem value="travailleur independant">Travailleur indépendant</SelectItem>
                                          <SelectItem value="autre">Autre</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`enfants.${index}.dateNaissance`} className="text-xs font-medium text-slate-700 dark:text-slate-300">Date de naissance</Label>
                                  <Input 
                                    type="date" 
                                    {...register(`enfants.${index}.dateNaissance`)} 
                                    className="h-9 text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          {enfantsFields.length < nombreEnfants && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                appendEnfant({ 
                                  nom: "", 
                                  postnom: "", 
                                  prenom: "", 
                                  sexe: "M", 
                                  occupation: "eleve", 
                                  dateNaissance: "" 
                                })
                              }
                              className="w-full border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/50"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Ajouter un enfant
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-600">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Mettre à jour le Client
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <ErrorDialog
          isOpen={errorDialogOpen}
          onClose={() => setErrorDialogOpen(false)}
          title="Erreur"
          message={errorMessage}
        />

        <AlertDialog open={isSessionExpiredDialogOpen} onOpenChange={setIsSessionExpiredDialogOpen}>
          <AlertDialogContent className="bg-white dark:bg-slate-800 border-0 dark:border dark:border-slate-700 shadow-2xl rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Session expirée
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
                Votre session a expiré. Veuillez vous reconnecter pour continuer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction 
                onClick={handleRedirectToLogin}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl"
              >
                Se reconnecter
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
