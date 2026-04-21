"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast, useToast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import * as z from "zod"
import axios, { AxiosError } from "axios"
import { CountryIndicativeSelect } from "@/components/country-indicative-select"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDateOnly } from "@/lib/utils"
import { AIRewriteButton } from "@/components/ai-rewrite-button"
import { VoiceInputButton } from "@/components/voice-input-button"

interface Client {
  _id: string
  code: string
  nom: string
  postnom: string
  prenom: string
  sexe: string
  dateNaissance: string
  pays: string
  province: string
  ville: string
  commune: string
  quartier: string
  adresse: string
  numero: string  
  email: string
  email2: string
  indicatif: string
  telephone: string
  indicatif2: string
  telephone2: string
  profession: string
  typeContrat: string
  revenuMensuel: number
  situationMatrimoniale: string
  nombreEnfants: number
  conjoint?: {
    nom: string
    prenom: string
    sexe: string
    dateNaissance: string
    adresse: string
    email: string
    indicatif: string
    telephone: string
    salarie: boolean
    typeContrat?: string
    revenuMensuel?: number
  }
  enfants?: Array<{
    nom: string
    postnom: string
    prenom: string
    sexe: string
    dateNaissance: string
    occupation: string
  }>
  coproprietaire?: Array<{
    _id: string
    nom: string
    postnom: string
    prenom: string
    sexe: string
    dateNaissance: string
    email: string
    indicatif: string
    telephone: string
    adresse: string
    profession: string
  }>
  entreprise?: string
  reference?: string
  parrain?: {
    _id: string
    code?: string
    nom?: string
    prenom?: string
    email?: string
    indicatif?: string
    telephone?: string
  } | null
  /** Parrain non client Qavah (saisie manuelle) */
  parrainDetails?: {
    lastName?: string
    postName?: string
    firstName?: string
    indicationCode?: string
    telephoneNumber?: string
    email?: string
    clientCode?: string
  } | null
  commercialAttritre?: {
    _id: string
    nom: string
    prenom: string
  }
  commercialAttritreName?: string
  addBy?: {
    _id: string
    nom: string
    prenom: string
  }
  createdAt?: string
  updatedAt?: string
  /** Infos de connexion (lastLogon, otp) envoyées par l’API */
  connexion?: {
    lastLogon?: string | null
    otp?: boolean
    otpCode?: number | null
    otpCodeExpiry?: string | null
  } | null
  notes?: Array<{
    _id: string
    date: string
    addBy: {
      _id: string
      nom: string
      prenom: string
    }
    note: string
    type: 'note' | 'commentaire'
    editedBy?: {
      _id: string
      nom: string
      prenom: string
    }
    editedAt?: string
    history?: Array<{
      note: string
      type: 'note' | 'commentaire'
      editedBy: {
        _id: string
        nom: string
        prenom: string
      }
      editedAt: string
    }>
  }> | null
  parrainages?: Array<{
    _id: string
    code: string
    nom: string
    prenom: string
  }>
  contrats?: Array<{
    _id: string
    code: string
    terrainId: {
      numero: string
      dimension: string
    }
    total: number
    dateContrat: string
    dateDebut: string
    dateFin: string
    statut: string
    remainingBalance: number
  }>
  factures?: Array<{
    _id: string
    code: string
    contratId: {
      code: string
    }
    somme: number
    devise: string
    methode: string
    date: string
    status: string
  }>
  messages?: Array<{
    addBy: {
      _id: string
      nom: string
      prenom: string
      email: string
      indicatif: string
    }
    message: string
    date: string
    from: string
    files: Array<string>
  }>
}

const editSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  sexe: z.enum(["M", "F"]),
  dateNaissance: z.string().optional(),
  adresse: z.string().optional(),
  email: z.string().email("Email invalide"),
  email2: z.string().email("Email invalide").optional(),
  indicatif: z.string().min(1, "L'indicatif est requis"),
  telephone: z.string().min(1, "Le téléphone est requis"),
  indicatif2: z.string().optional(),
  telephone2: z.string().optional(),
  profession: z.string(),
  typeEmploi: z.enum(["cdi", "cdd", "autre"]).optional(),
  revenuMensuel: z.string().optional(),
  entreprise: z.string().optional(),
  reference: z.string().optional(),
})

type EditFormData = z.infer<typeof editSchema> & {
  profession?: string
  typeEmploi?: string
  revenuMensuel?: string
  entreprise?: string
  reference?: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isEditProfessionalDialogOpen, setIsEditProfessionalDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSessionExpiredDialogOpen, setIsSessionExpiredDialogOpen] = useState(false)
  const [commercials, setCommercials] = useState<Array<{ _id: string; nom: string; prenom: string }>>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedCommercial, setSelectedCommercial] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedCCUsers, setSelectedCCUsers] = useState<string[]>([])
  const [manualCCEmails, setManualCCEmails] = useState<string>("")
  const [messageSubject, setMessageSubject] = useState<string>("")
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  })

  const handleSessionExpired = () => {
    setIsSessionExpiredDialogOpen(true)
  }

  const handleRedirectToLogin = () => {
    localStorage.removeItem("authToken")
    router.push("/auth/login")
  }

  useEffect(() => {
    const fetchClientDetails = async () => {
      setIsLoading(true)
      try {
        const token = localStorage.getItem("authToken")
        const [clientResponse, usersResponse, currentUserResponse] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}?module=clients`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users?module=clients`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me?module=clients`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ])
        setClient(clientResponse.data)
        reset(clientResponse.data)
        if (usersResponse.data && Array.isArray(usersResponse.data)) {
          setCommercials(usersResponse.data)
        }
        if (currentUserResponse.data && currentUserResponse.data.role) {
          setCurrentUserRole(currentUserResponse.data.role)
        }
      } catch (error) {
        console.error("Error fetching client details:", error)
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            handleSessionExpired()
            return
          } else if (error.response?.status === 403) {
            toast({
              title: "Erreur",
              description: "Vous n'avez pas la permission d'accéder à cette ressource, veuillez contacter votre administrateur.",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Erreur",
              description: "Impossible de récupérer les détails du client. Veuillez réessayer.",
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "Erreur",
            description: "Impossible de récupérer les détails du client. Veuillez réessayer.",
            variant: "destructive",
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchClientDetails()
  }, [id, toast, reset])

  // Debug: Log when isAssignDialogOpen changes
  useEffect(() => {
    console.log("isAssignDialogOpen changed to:", isAssignDialogOpen)
  }, [isAssignDialogOpen])

  const onSubmit = async (data: EditFormData) => {
    try {
      const token = localStorage.getItem("authToken")
      const salarie = data.profession == "salarié"
      const updateData = {
        ...data,
        profession: data.profession,
        typeEmploi: salarie ? data.typeEmploi : "",
        revenuMensuel: Number.parseFloat(data.revenuMensuel || "0"),
        entreprise: salarie ? data.entreprise : "",
        reference: salarie ? data.reference : "",
      }
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setClient((prevClient) => ({ ...prevClient, ...response.data }) as Client)
      setIsEditDialogOpen(false)
      setIsEditProfessionalDialogOpen(false)
      toast({
        title: "Succès",
        description: "Les informations du client ont été mises à jour.",
      })
    } catch (error) {
      console.error("Error updating client:", error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          toast({
            title: "Erreur",
            description: "Vous n'avez pas la permission d'effectuer cette action, veuillez contacter votre administrateur.",
            variant: "destructive",
          })
        } else if (error.response?.status === 401) {
          handleSessionExpired()
          return
        } else {
          toast({
            title: "Erreur",
            description: "Impossible de mettre à jour les informations du client. Veuillez réessayer.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour les informations du client. Veuillez réessayer.",
          variant: "destructive",
        })
      }
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...Array.from(event.target.files as FileList)])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
  }

  const handleSendMessage = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir envoyer ce message ?")) return

    setIsSending(true)
    try {
      const token = localStorage.getItem("authToken")
      const formData = new FormData()
      formData.append("message", message)
      formData.append("subject", messageSubject.trim() || "Nouveau message")
      selectedFiles.forEach((file) => formData.append("files", file))
      
      // Add CC users
      if (selectedCCUsers.length > 0) {
        formData.append("ccUsers", JSON.stringify(selectedCCUsers))
      }
      
      // Add manual CC emails
      if (manualCCEmails.trim()) {
        formData.append("ccEmails", manualCCEmails.trim())
      }

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}/send-message`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.status === 200 && client) {
        toast({
          title: "Succès",
          description: "Message envoyé avec succès.",
        })
        setSelectedFiles([])
        setMessage("")
        setMessageSubject("")
        setSelectedCCUsers([])
        setManualCCEmails("")
        setClient({...client, messages: response.data.messages})
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorCode = error instanceof AxiosError && error.response ? error.response.status : "Une erreur est survenue. Veuillez réessayer."
      setIsErrorDialogOpen(true)
      setErrorMessage("Une erreur de code " + errorCode + " est survenue. Veuillez réessayer.")
    } finally {
      setIsSending(false)
    }
  }

  const handleFileDownload = async (fileName: string) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}/download-file/${fileName}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Erreur lors du téléchargement du fichier:", error)
      toast({
        title: "Erreur de téléchargement du fichier",
        description: error instanceof Error ? error.message : "Une erreur inattendue s'est produite.",
        variant: "destructive",
      })
    }
  }

  const handleAssignClient = async () => {
    if (!selectedCommercial) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un commercial",
        variant: "destructive"
      })
      return
    }

    try {
      setIsAssigning(true)
      const token = localStorage.getItem("authToken")
      const clientId = Array.isArray(id) ? id[0] : id
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/clients/assign?action=assign`,
        {
          clientIds: [clientId],
          commercialId: selectedCommercial
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      toast({
        title: "Succès",
        description: client?.commercialAttritre ? "Client réaffecté avec succès" : "Client affecté avec succès",
      })
      
      setIsAssignDialogOpen(false)
      setSelectedCommercial("")
      
      // Refresh client data
      const clientResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}?action=assign`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setClient(clientResponse.data)
    } catch (error) {
      console.error("Error assigning client:", error)
      if (axios.isAxiosError(error)) {
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Erreur lors de l'affectation",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue",
          variant: "destructive"
        })
      }
    } finally {
      setIsAssigning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex justify-center items-center">
        <div className="text-center">
          <Icons.spinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Chargement des informations du client...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex justify-center items-center">
        <div className="text-center">
          <Icons.userX className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Client non trouvé</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Le client que vous recherchez n'existe pas ou a été supprimé.</p>
          <Button onClick={() => router.push("/dashboard/clients")}>
            Retour à la liste
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                  {client.prenom?.[0]}{client.nom?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                  {client.prenom} {client.nom}
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    Code: {client.code}
                  </Badge>
                  <Badge variant={client.sexe === 'M' ? 'default' : 'secondary'} className={client.sexe === 'M' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400'}>
                    {client.sexe === 'M' ? 'Masculin' : 'Féminin'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentUserRole?.toLowerCase() === 'admin' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log("Button clicked, opening dialog")
                    setIsAssignDialogOpen(true)
                  }}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950/30"
                >
                  <Icons.userCheck className="h-4 w-4 mr-2" />
                  {client?.commercialAttritre ? "Réaffecter" : "Affecter"}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push(`/dashboard/clients/edit/${id}`)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
              >
                <Icons.edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button 
                onClick={() => router.push("/dashboard/clients")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Icons.arrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <Tabs defaultValue="personal" className="w-full">
            <div className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
              <TabsList className="grid w-full grid-cols-8 h-14 bg-transparent border-0">
                <TabsTrigger value="personal" className="text-gray-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  <Icons.user className="h-4 w-4 mr-2" />
                  Personnel
                </TabsTrigger>
                <TabsTrigger value="professional" className="text-gray-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  <Icons.briefcase className="h-4 w-4 mr-2" />
                  Professionnel
                </TabsTrigger>
                <TabsTrigger value="spouse" className="text-gray-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  <Icons.heart className="h-4 w-4 mr-2" />
                  Conjoint
                </TabsTrigger>
                <TabsTrigger value="children" className="text-gray-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  <Icons.baby className="h-4 w-4 mr-2" />
                  Enfants
                </TabsTrigger>
                <TabsTrigger value="coproprietaires" className="text-gray-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  <Icons.users className="h-4 w-4 mr-2" />
                  Co-Proprietaires
                </TabsTrigger>
                <TabsTrigger value="contrats" className="text-gray-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  <Icons.fileText className="h-4 w-4 mr-2" />
                  Contrats
                </TabsTrigger>
                <TabsTrigger value="factures" className="text-gray-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  <Icons.dollarSign className="h-4 w-4 mr-2" />
                  Paiements
                </TabsTrigger>
                <TabsTrigger value="messages" className="text-gray-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  <Icons.messageSquare className="h-4 w-4 mr-2" />
                  Messages
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="personal" className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-transparent dark:border-slate-600/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                      <Icons.user className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Informations de Base
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nom</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{client.nom || "Non spécifié"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Postnom</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{client.postnom || "Non spécifié"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Prénom</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{client.prenom || "Non spécifié"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sexe</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${client.sexe === 'M' ? 'bg-blue-500' : 'bg-pink-500'}`}></div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{client.sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date de Naissance</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {client.dateNaissance ? formatDateOnly(client.dateNaissance) : "Non spécifiée"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Situation Matrimoniale</p>
                      <Badge variant="outline" className={
                        client.situationMatrimoniale === 'marié' ? 'border-green-200 text-green-800 bg-green-50 dark:border-green-700 dark:text-green-200 dark:bg-green-900/40' :
                        client.situationMatrimoniale === 'celibataire' ? 'border-blue-200 text-blue-800 bg-blue-50 dark:border-blue-700 dark:text-blue-200 dark:bg-blue-900/40' :
                        'border-gray-200 text-gray-800 bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:bg-slate-700/50'
                      }>
                        {client.situationMatrimoniale || "Non spécifiée"}
                      </Badge>
                    </div>
                    {/* Bloc parrainage : parrain (client Qavah) ou parrainDetails (non client Qavah) */}
                    {client.parrain && typeof client.parrain === "object" && (client.parrain._id || client.parrain.nom) ? (
                      <div className="space-y-2 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 p-3 text-sm">
                        <p className="font-semibold text-blue-800 dark:text-blue-200">
                          Ce client a été parrainé par un client Qavah.
                        </p>
                        <div className="space-y-1 text-blue-900 dark:text-blue-100">
                          <p>
                            <span className="font-medium">Parrain :</span>{" "}
                            {[client.parrain.prenom, client.parrain.nom].filter(Boolean).join(" ") || "Non renseigné"}
                          </p>
                          {client.parrain.code && (
                            <p>
                              <span className="font-medium">Code client :</span> {client.parrain.code}
                            </p>
                          )}
                          {(client.parrain.indicatif || client.parrain.telephone) && (
                            <p>
                              <span className="font-medium">Téléphone :</span>{" "}
                              {[client.parrain.indicatif, client.parrain.telephone].filter(Boolean).join(" ")}
                            </p>
                          )}
                          {client.parrain.email && (
                            <p>
                              <span className="font-medium">Email :</span> {client.parrain.email}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : client.parrainDetails && typeof client.parrainDetails === "object" ? (
                      <div className="space-y-2 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm">
                        <p className="font-semibold text-amber-800 dark:text-amber-200">
                          Ce client a été parrainé (parrain non client Qavah).
                        </p>
                        <div className="space-y-1 text-amber-900 dark:text-amber-100">
                          <p>
                            <span className="font-medium">Parrain :</span>{" "}
                            {[
                              client.parrainDetails.firstName,
                              client.parrainDetails.postName,
                              client.parrainDetails.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ") || "Non renseigné"}
                          </p>
                          {client.parrainDetails.telephoneNumber && (
                            <p>
                              <span className="font-medium">Téléphone :</span>{" "}
                              {client.parrainDetails.indicationCode}{" "}
                              {client.parrainDetails.telephoneNumber}
                            </p>
                          )}
                          {client.parrainDetails.email && (
                            <p>
                              <span className="font-medium">Email :</span>{" "}
                              {client.parrainDetails.email}
                            </p>
                          )}
                          {client.parrainDetails.clientCode && (
                            <p>
                              <span className="font-medium">Code client :</span>{" "}
                              {client.parrainDetails.clientCode}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Parrainé par</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personne</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nombre de parrainages</p>
                      <Badge variant="outline" className="border-orange-200 text-orange-800 bg-orange-50 dark:border-orange-700 dark:text-orange-200 dark:bg-orange-900/40">
                        {client.parrainages?.length || 0} client{client.parrainages && client.parrainages.length > 1 ? 's' : ''}
                      </Badge>
                      {client.parrainages && client.parrainages.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {client.parrainages.map((parrainage) => (
                            <p key={parrainage._id} className="text-sm text-gray-700 dark:text-gray-300">
                              • {parrainage.prenom} {parrainage.nom} ({parrainage.code})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border border-transparent dark:border-slate-600/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                      <Icons.phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                      Coordonnées
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
                      <div className="flex items-center gap-2">
                        <Icons.mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{client.email || "Non spécifié"}</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{client.email2 || ""}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Téléphone</p>
                      <div className="flex items-center gap-2">
                        <Icons.phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {client.indicatif} {client.telephone}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {client.indicatif2} {client.telephone2}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Adresse</p>
                      <div className="flex items-start gap-2">
                        <Icons.mapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-1" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {[client.numero, client.adresse, client.quartier, client.commune, client.ville, client.pays]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Professional Summary */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40 lg:col-span-2">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
                      <Icons.briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      Résumé Professionnel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-600">
                        <Icons.briefcase className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Profession</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{client.profession || "Non spécifiée"}</p>
                      </div>
                      <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-600">
                        <Icons.dollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenu Mensuel</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          ${client.revenuMensuel?.toLocaleString() || "0"}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-600">
                        <Icons.baby className="h-8 w-8 text-pink-600 dark:text-pink-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nombre d'Enfants</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{client.nombreEnfants || "0"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Connexion & Sécurité (fin tab Personnel) */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-800 dark:to-slate-800/80 lg:col-span-2 mt-6">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <Icons.key className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      Connexion & Sécurité
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dernière connexion</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {client.connexion?.lastLogon
                            ? new Date(client.connexion.lastLogon).toLocaleString("fr-FR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "Jamais ou non renseigné"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">OTP</p>
                        <Badge
                          variant="outline"
                          className={
                            client.connexion?.otp === true
                              ? "border-green-200 text-green-800 bg-green-50 dark:border-green-700 dark:text-green-200 dark:bg-green-900/40"
                              : "border-gray-200 text-gray-700 bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-700/50"
                          }
                        >
                          {client.connexion?.otp === true ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enregistrement */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 lg:col-span-2 mt-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100 text-sm">
                      <Icons.user className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Enregistrement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ajouté par</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {client.addBy ? `${client.addBy.nom} ${client.addBy.prenom}` : "Non renseigné"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date de création</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {client.createdAt
                            ? new Date(client.createdAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })
                            : "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dernière modification</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {client.updatedAt
                            ? new Date(client.updatedAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="professional">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Informations Professionnelles</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>
                    <strong>profession:</strong> {client.profession || "Profession non spécifiée"}
                  </p>
                  <p>
                    <strong>Revenu Mensuel:</strong> {client.revenuMensuel?.toLocaleString() || 0} $
                  </p>
                  {client.profession.toLowerCase() == "salarié" && (
                    <>
                      <p>
                        <strong>Type de contrat:</strong> {client.typeContrat || "Type de contrat non spécifié"}
                      </p>

                      <p>
                        <strong>Entreprise:</strong> {client.entreprise || "Entreprise non spécifiée"}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="spouse">
              <Card>
                <CardHeader>
                  <CardTitle>Informations du Conjoint</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {client.conjoint ? (
                    <>
                      <p>
                        <strong>Nom:</strong> {client.conjoint.nom || "Nom du conjoint non spécifié"}
                      </p>
                      <p>
                        <strong>Prénom:</strong> {client.conjoint.prenom || "Prénom du conjoint non spécifié"}
                      </p>
                      <p>
                        <strong>Sexe:</strong> {client.conjoint.sexe || "Sexe du conjoint non spécifié"}
                      </p>
                      <p>
                        <strong>Date de Naissance:</strong> {client.conjoint.dateNaissance ? formatDateOnly(client.conjoint.dateNaissance) : "Date de naissance du conjoint non spécifiée"}
                      </p>
                      <p>
                        <strong>Adresse:</strong> {client.conjoint.adresse || "Adresse du conjoint non spécifiée"}
                      </p>
                      <p>
                        <strong>Email:</strong> {client.conjoint.email || "Email du conjoint non spécifié"}
                      </p>
                      <p>
                        <strong>Téléphone:</strong> {client.conjoint.indicatif || "Indicatif du conjoint non spécifié"}
                        {client.conjoint.telephone || "Téléphone du conjoint non spécifié"}
                      </p>
                      <p>
                        <strong>Salarié:</strong> {client.conjoint.salarie ? "Oui" : "Non"}
                      </p>
                      {client.conjoint?.salarie && (
                        <>
                          <p>
                            <strong>Type de Contrat:</strong> {client.conjoint.typeContrat || "Non spécifié"}
                          </p>
                          <p>
                            <strong>Revenu Mensuel:</strong> {(client.conjoint.revenuMensuel || 0).toLocaleString() || "Revenu mensuel du conjoint non spécifié"} $
                          </p>
                        </>
                      )}
                    </>
                  ) : (
                    <p>Aucune information sur le conjoint disponible.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="children">
              <Card>
                <CardHeader>
                  <CardTitle>Informations des Enfants</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.enfants && client.enfants.length > 0 ? (
                    client.enfants.map((enfant, index) => (
                      <div key={index} className="mb-4 p-4 border rounded">
                        <h3 className="font-semibold mb-2">Enfant {index + 1}</h3>
                        <p>
                          <strong>Nom:</strong> {enfant.nom || "Nom de l'enfant non spécifié"}
                        </p>
                        <p>
                          <strong>Prénom:</strong> {enfant.prenom || "Prénom de l'enfant non spécifié"}
                        </p>
                        <p>
                          <strong>Sexe:</strong> {enfant.sexe || "Sexe de l'enfant non spécifié"}
                        </p>
                        <p>
                          <strong>Date de Naissance:</strong> {enfant.dateNaissance ? formatDateOnly(enfant.dateNaissance) : "Date de naissance de l'enfant non spécifiée"}
                        </p>
                        <p>
                          <strong>Occupation:</strong> {enfant.occupation || "Occupation de l'enfant non spécifiée"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p>Aucune information sur les enfants disponible.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coproprietaires">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Co-Proprietaires</CardTitle>
                    <Button 
                      onClick={() => router.push(`/dashboard/clients/new-client?type=coprio&redirect=client-detail&id=${id}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Icons.plus className="h-4 w-4 mr-2" />
                      Ajouter un Co-Proprietaire
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {client.coproprietaire && client.coproprietaire.length > 0 ? (
                    <div className="space-y-4">
                      {client.coproprietaire.map((coproprietaire, index) => (
                        <Card key={coproprietaire._id || index} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Avatar className="w-12 h-12">
                                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white">
                                    {coproprietaire.prenom?.[0]}{coproprietaire.nom?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-semibold text-lg">
                                    {coproprietaire.prenom} {coproprietaire.nom} {coproprietaire.postnom}
                                  </h3>
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <Icons.mail className="h-4 w-4" />
                                      {coproprietaire.email}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Icons.phone className="h-4 w-4" />
                                      {coproprietaire.indicatif} {coproprietaire.telephone}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Icons.briefcase className="h-4 w-4" />
                                      {coproprietaire.profession}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                    <Icons.mapPin className="h-4 w-4" />
                                    {coproprietaire.adresse}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={coproprietaire.sexe === 'M' ? 'default' : 'secondary'} 
                                       className={coproprietaire.sexe === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}>
                                  {coproprietaire.sexe === 'M' ? 'Masculin' : 'Féminin'}
                                </Badge>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/clients/detail/${coproprietaire._id}`)}
                                >
                                  <Icons.eye className="h-4 w-4 mr-1" />
                                  Voir
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Icons.users className="h-12 w-12 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun Co-Proprietaire</h3>
                          <p className="text-gray-600 mb-4">Ce client n'a pas encore de co-proprietaires associés.</p>
                          <Button 
                            onClick={() => router.push(`/dashboard/clients/new-client?type=coprio&redirect=client-detail&id=${id}`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Icons.plus className="h-4 w-4 mr-2" />
                            Ajouter un Co-Proprietaire
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contrats">
              <Card>
                <CardHeader>
                  <CardTitle>Contrats du Client</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.contrats && client.contrats.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Terrain</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Solde Restant</TableHead>
                          <TableHead>Date Début</TableHead>
                          <TableHead>Date Fin</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.contrats?.filter(contrat => contrat.statut !== "révoqué").map((contrat) => (
                          <TableRow key={contrat._id} onClick={() => router.push(`/dashboard/contrat/${contrat.code}`)} className="cursor-pointer">
                            <TableCell>{contrat.code}</TableCell>
                            <TableCell>
                              {contrat.terrainId.numero} - ({contrat.terrainId.dimension})
                            </TableCell>
                            <TableCell>${(contrat.total || 0).toLocaleString()}</TableCell>
                            <TableCell>${(contrat.remainingBalance || 0).toLocaleString()}</TableCell>
                            <TableCell>{new Date(contrat.dateDebut).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(contrat.dateFin).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full ${
                                contrat.statut === "en_cours" ? "bg-blue-200 text-blue-800" :
                                contrat.statut === "termine" ? "bg-green-200 text-green-800" :
                                contrat.statut === "en_attente" ? "bg-yellow-200 text-yellow-800" :
                                "bg-red-200 text-red-800"
                              }`}>
                                {contrat.statut}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button variant="link" onClick={(e) => { e.stopPropagation(); downloadContrat(contrat.code, toast) }}><Icons.download className="h-4 w-4" /></Button>
                              <Button variant="link" onClick={(e) => { e.stopPropagation(); viewEchelonement(contrat.code, client, toast) }}><Icons.plan className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p>Aucun contrat trouvé pour ce client.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="factures">
              <Card>
                <CardHeader>
                  <CardTitle>Paiements du Client</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.factures && client.factures.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Contrat</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Devise</TableHead>
                          <TableHead>Méthode</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.factures?.map((facture) => (
                          <TableRow key={facture._id}>
                            <TableCell>{facture.code}</TableCell>
                            <TableCell>{facture.contratId.code}</TableCell>
                            <TableCell>{(facture.somme || 0).toLocaleString()}</TableCell>
                            <TableCell>{facture.devise}</TableCell>
                            <TableCell>{facture.methode}</TableCell>
                            <TableCell>{new Date(facture.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full ${
                                facture.status === "paid" ? "bg-green-200 text-green-800" :
                                facture.status === "pending" ? "bg-yellow-200 text-yellow-800" :
                                "bg-red-200 text-red-800"
                              }`}>
                                {facture.status=="paid" ? "Payé" : facture.status=="pending" ? "En attente" : "Non payé"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button variant="link" onClick={() => downloadFacture(facture.code, toast)}><Icons.download className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p>Aucune facture trouvée pour ce client.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle>Messages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="message-space border p-4 h-96 overflow-y-auto dark:border-gray-700 dark:bg-gray-900/50">
                    {client.messages && client.messages.length > 0 ? (
                      client.messages.map((message, index) => (
                        <div 
                          key={index} 
                          className={`message-bubble p-2 rounded-lg shadow-sm max-w-xs mb-2 ${
                            message.from === "me" 
                              ? "bg-blue-600 text-white text-left ml-auto dark:bg-blue-700 dark:text-white" 
                              : "bg-gray-100 text-gray-900 text-left dark:bg-gray-800 dark:text-gray-100"
                          }`}
                        >
                           {message.from === "me" && <Icons.user className="inline-block mr-2" />}
                           <p className={`text-sm inline-block ${
                             message.from === "me" 
                               ? "text-white/90 dark:text-white/90" 
                               : "text-gray-700 dark:text-gray-300"
                           }`}>{message.addBy.nom}</p>
                          
                           
                          <p className={`${
                            message.from === "me" 
                              ? "text-white dark:text-white" 
                              : "text-gray-900 dark:text-gray-100"
                          }`}>{message.message}</p>
                          {/* <span className="inline-block">{message.message}</span> */}
                          {message.from !== "me" && <Icons.user className="inline-block ml-2" />}
                          {message.from === "me" && (
                            <small className={`block text-right mt-1 ${
                              "text-white/80 dark:text-white/80"
                            }`}>
                              {new Date(message.date).toLocaleString()}
                            </small>
                          )}
                          {message.files && message.files.length > 0 && (
                            <div className="mt-2">
                              {message.files.map((file, fileIndex) => (
                                <div key={fileIndex} className="flex items-center space-x-2">
                                  <Icons.file className="inline-block" />
                                  <a href="#" onClick={(e) => { 
                                    e.preventDefault()
                                    handleFileDownload(file) 
                                  }} className={`underline ${
                                    message.from === "me"
                                      ? "text-white/90 hover:text-white dark:text-white/90 dark:hover:text-white"
                                      : "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  }`}>
                                    {file}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>Aucun message trouvé.</p>
                    )}
                  </div>
                  <div className="file-list space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{file.name}</span>
                        <Button variant="link" onClick={() => removeFile(index)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="message-subject-client">Objet</Label>
                      <Input
                        id="message-subject-client"
                        type="text"
                        placeholder="Nouveau message"
                        value={messageSubject}
                        onChange={(e) => setMessageSubject(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-sm font-medium">Message</Label>
                        <AIRewriteButton
                          getValue={() => message}
                          onApply={(text) => setMessage(text)}
                          disabled={isSending}
                        />
                        <VoiceInputButton
                          getValue={() => message}
                          onUpdate={(text) => setMessage(text)}
                          onApply={(text) => setMessage(text)}
                          disabled={isSending}
                        />
                      </div>
                      <div className="flex items-start space-x-2">
                        <Input type="file" multiple onChange={handleFileChange} className="hidden" id="file-input" />
                        <Button variant="outline" size="sm" onClick={() => document.getElementById('file-input')?.click()}>Joindre</Button>
                        <textarea
                          placeholder="Tapez votre message..."
                          className="flex-grow border-2 border-gray-300 dark:border-gray-600 rounded-md p-2 min-h-[100px] bg-background text-foreground"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        ></textarea>
                        <Button onClick={handleSendMessage} disabled={isSending}>
                          {isSending ? <Icons.spinner className="h-4 w-4 animate-spin" /> : "Envoyer"}
                        </Button>
                      </div>
                    </div>
                    
                    {/* CC Section */}
                    <div className="border-t pt-4 space-y-3">
                      <Label className="text-sm font-medium">Mettre en copie (CC)</Label>
                      
                      {/* User selection */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Sélectionner des utilisateurs</Label>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value && !selectedCCUsers.includes(value)) {
                              setSelectedCCUsers([...selectedCCUsers, value])
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un commercial/utilisateur" />
                          </SelectTrigger>
                          <SelectContent>
                            {commercials
                              .filter((c) => !selectedCCUsers.includes(c._id))
                              .map((commercial) => (
                                <SelectItem key={commercial._id} value={commercial._id}>
                                  {commercial.prenom} {commercial.nom}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {selectedCCUsers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedCCUsers.map((userId) => {
                              const user = commercials.find((c) => c._id === userId)
                              return (
                                <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                                  {user ? `${user.prenom} ${user.nom}` : userId}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCCUsers(selectedCCUsers.filter((id) => id !== userId))}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <Icons.x className="h-3 w-3" />
                                  </button>
                                </Badge>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* Manual email input */}
                      <div className="space-y-2">
                        <Label htmlFor="cc-emails" className="text-xs text-muted-foreground">
                          Ou saisir des adresses email (séparées par des virgules)
                        </Label>
                        <Input
                          id="cc-emails"
                          type="text"
                          placeholder="email1@example.com, email2@example.com"
                          value={manualCCEmails}
                          onChange={(e) => setManualCCEmails(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Vous pouvez utiliser {'{'}{'{'}denomination{'}'}{'}'} {'{'}{'{'}nom{'}'}{'}'} {'{'}{'{'}postnom{'}'}{'}'} {'{'}{'{'}prenom{'}'}{'}'} pour être remplacé automatiquement
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Erreur</DialogTitle>
            </DialogHeader>
            <p>{errorMessage}</p>
            <DialogFooter>
              <Button onClick={() => setIsErrorDialogOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Session Expired Dialog */}
        <AlertDialog open={isSessionExpiredDialogOpen} onOpenChange={setIsSessionExpiredDialogOpen}>
          <AlertDialogContent className="bg-white border-0 shadow-2xl rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-slate-900">
                Session expirée
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600">
                Votre session a expiré. Veuillez vous reconnecter pour continuer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction 
                onClick={handleRedirectToLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                Se reconnecter
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Assign Client Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
          console.log("Dialog onOpenChange called with:", open)
          setIsAssignDialogOpen(open)
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {client?.commercialAttritre ? "Réaffecter le client" : "Affecter le client"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {client?.commercialAttritre && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    Ce client est actuellement affecté à : <strong>{client.commercialAttritre?.nom} {client.commercialAttritre?.prenom}</strong>
                  </p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Sélectionner un commercial <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedCommercial} onValueChange={setSelectedCommercial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un commercial" />
                  </SelectTrigger>
                  <SelectContent>
                    {commercials.map((commercial) => (
                      <SelectItem key={commercial._id} value={commercial._id}>
                        {commercial.nom} {commercial.prenom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignDialogOpen(false)
                  setSelectedCommercial("")
                }}
                disabled={isAssigning}
              >
                Annuler
              </Button>
              <Button
                onClick={handleAssignClient}
                disabled={!selectedCommercial || isAssigning}
              >
                {isAssigning ? (
                  <>
                    <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
                    Affectation...
                  </>
                ) : (
                  <>
                    <Icons.userCheck className="h-4 w-4 mr-2" />
                    {client?.commercialAttritre ? "Réaffecter" : "Affecter"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

async function downloadContrat(contratCode: string, toast: any) {
  try {
    const token = localStorage.getItem("authToken")
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/download/${contratCode}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    })

    const blob = new Blob([response.data], { type: response.headers["content-type"] })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = `contrat_${contratCode}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Erreur lors du téléchargement du contrat:", error)
    toast({
      title: "Erreur de téléchargement du contrat",
      description: error instanceof Error ? error.message : "Une erreur inattendue s'est produite.",
      variant: "destructive",
    })
  }
}

async function viewEchelonement(contratCode: string, client: any, toast: any) {
  try {
    const token = localStorage.getItem("authToken")
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/download/plan/${contratCode}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    })

    const blob = new Blob([response.data], { type: response.headers["content-type"] })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = `Plan_Échelonnement_${client.nom}_${client.prenom}_${contratCode}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Erreur lors du téléchargement du plan:", error)
    toast({
      title: "Erreur de téléchargement du plan",
      description: error instanceof Error ? error.message : "Une erreur inattendue s'est produite.",
      variant: "destructive",
    })
  }
}

async function downloadFacture(factureCode: string, toast: any) {
  try {
    const token = localStorage.getItem("authToken")
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/factures/download/${factureCode}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    })
    const blob = new Blob([response.data], { type: response.headers["content-type"] })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = `Quittance_${factureCode}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    toast({ title: "Téléchargement réussi", description: "La quittance a été téléchargée." })
  } catch (error) {
    console.error("Erreur lors du téléchargement de la facture:", error)
    toast({
      title: "Erreur de téléchargement de la facture",
      description: error instanceof Error ? error.message : "Une erreur inattendue s'est produite.",
      variant: "destructive",
    })
  }
}
