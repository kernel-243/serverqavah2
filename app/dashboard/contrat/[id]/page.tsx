"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProgressBar } from "@/components/progress-bar"
import axios from "axios"
import { Icons } from "@/components/icons" 
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-hot-toast"
import { Separator } from "@/components/ui/separator"
import { devLog } from "@/lib/devLogger"
import { formatDateOnly } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ContractDetails {
  _id: string
  code: string
  clientId: {
    _id: string
    code: string
    nom: string
    postnom: string
    prenom: string
    sexe: string
    dateNaissance: string
    adresse: string
    email: string
    indicatif: string
    telephone: string
    salarie: boolean
  }
  terrainId: {
    _id: string
    code: string
    numero: string
    dimension: string
    pays: string
    province: string
    ville: string
    commune: string
    quartier: string
    avenue: string
    disponnible: boolean
    prix: number
    certificatVol: string
    certificatFolio: string
    description: string
    cite: {
      _id: string
      nom: string
      pays: string
      province: string
      ville: string
      commune: string
      quartier: string
      avenue: string
    }
  } | null
  total: number
  echelons: number
  dateContrat: string
  dateDebut: string
  dateFin: string
  frequencePaiement: number
  statut: string
  remainingBalance: number
  remainingMonths: number
  remainingFromToday: number
  nbMonth: number
  documentCadastraux: {
    _id: string,
    typeDocument: string,
    code: string,
    description: string,
    dateUpload: string,
    uploadedBy: string
  }[],
  contrat: {
    statut?: "en_attente" | "en_cours" | "termine"
    fichier?: string
    originalName?: string
    mimeType?: string
    addBy?: string
    path?: string
    dateUpload?: string
    uploadedBy?: string
  },
  planEcholon: {
    path: string,
    dateUpload: string,
    uploadedBy: string
  },
  contratCadastral?: {
    statut: "non_disponible" | "en_attente" | "en_cours" | "disponible" | "remis" | "annule"
    lastUpdate?: string
    lastUpdateBy?: string
  }
}

interface Invoice {
  _id: string
  code: string
  date: string
  somme: number
  devise: string
  methode: string
  bonus?: boolean
  status: string
  type?: string
  motif?: {
    typeDocument: string
    description: string
    code: string
  }
}

interface RappelScenario {
  diff: number
  label: string
  subject: string
  html: string
  whatsapp: string
  isToday: boolean
  wouldSendToday: boolean
}

interface RappelPreview {
  contrat: {
    code: string
    total: number
    acompte: number
    echelons: number
    mensualite: number
    dateDebut: string
    dateFin: string
    jourEcheance: number
    rappels: boolean
    client: { nom: string; postnom: string; prenom: string; email: string; telephone: string }
    terrain: { numero: string; cite: string }
  }
  debug: {
    dateSimulation: string
    daysDiff: number
    isReminderDay: boolean
    mensualite: number
    totalPaidGlobal: number
    acompte: number
    totalPaidMensualites: number
    montantDuMensualites: number
    monthsDue: number
    monthsCovered: number
    arrears: number
    currentMonthPaid: boolean
    willSendToday: boolean
  }
  scenarios: RappelScenario[]
}

const CONTRAT_CADASTRAL_STATUTS = [
  { value: "non_disponible", label: "Non disponible" },
  { value: "en_attente", label: "En attente" },
  { value: "en_cours", label: "En cours" },
  { value: "disponible", label: "Disponible" },
  { value: "remis", label: "Remis" },
  { value: "annule", label: "Annulé" },
] as const

function getContratCadastralColor(statut: string) {
  switch (statut) {
    case "non_disponible": return "text-gray-500 dark:text-gray-400"
    case "en_attente": return "text-amber-500 dark:text-amber-400"
    case "en_cours": return "text-blue-500 dark:text-blue-400"
    case "disponible": return "text-emerald-500 dark:text-emerald-400"
    case "remis": return "text-teal-600 dark:text-teal-400"
    case "annule": return "text-red-500 dark:text-red-400"
    default: return "text-gray-500 dark:text-gray-400"
  }
}

function getContratCadastralLabel(statut: string) {
  return CONTRAT_CADASTRAL_STATUTS.find((s) => s.value === statut)?.label ?? statut
}

// Composant statut contrat cadastral avec mise à jour (icône cliquable → dialog choix → dialog confirmation)
function ContratCadastralStatutSection({
  contract,
  onUpdate,
}: {
  contract: ContractDetails
  onUpdate: (contratCadastral: NonNullable<ContractDetails["contratCadastral"]>) => void
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChoiceDialogOpen, setIsChoiceDialogOpen] = useState(false)
  const [confirmStatut, setConfirmStatut] = useState<string | null>(null)
  const [showUnauthorizedDialog, setShowUnauthorizedDialog] = useState(false)
  const statut = contract.contratCadastral?.statut ?? "non_disponible"
  const totalPaid = contract.total - contract.remainingBalance
  const paymentProgress = contract.total ? (totalPaid / contract.total) * 100 : 0
  const cadastralDisabled = paymentProgress < 50

  const handleOpenChoice = () => {
    if (cadastralDisabled) return
    setIsChoiceDialogOpen(true)
  }

  const handleConfirmUpdate = async () => {
    if (!confirmStatut) return
    setIsUpdating(true)
    setShowUnauthorizedDialog(false)
    try {
      const token = localStorage.getItem("authToken")
      const res = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/contrats/${contract._id}/contrat-cadastral`,
        { statut: confirmStatut },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const cadastral = res.data?.contratCadastral ?? { statut: confirmStatut, lastUpdate: new Date().toISOString(), lastUpdateBy: null }
      onUpdate(cadastral)
      setConfirmStatut(null)
      toast.success("Statut cadastral mis à jour")
    } catch (e: any) {
      const code = e.response?.data?.code
      const status = e.response?.status
      if (status === 403 && code === "AGENT_DOCUMENT_NOT_AUTHORIZED") {
        setConfirmStatut(null)
        setShowUnauthorizedDialog(true)
      } else {
        devLog.error("Update contrat cadastral", e)
        toast.error("Erreur lors de la mise à jour du statut cadastral")
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenChoice}
            disabled={isUpdating || cadastralDisabled}
            className="flex items-center justify-center rounded-md p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Modifier le statut cadastral"
            title={cadastralDisabled ? "Modification possible à partir de 50% de paiement" : undefined}
          >
            <Icons.fileText className={`h-5 w-5 ${getContratCadastralColor(statut)} ${cadastralDisabled ? "opacity-50" : ""}`} />
          </button>
          Statut contrat cadastral
        </h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">{getContratCadastralLabel(statut)}</span>
      </div>
      {cadastralDisabled && (
        <p className="text-sm text-amber-600 dark:text-amber-500 mb-1">
          Modification possible à partir de 50% de paiement (actuellement {paymentProgress.toFixed(0)}%)
        </p>
      )}
      {contract.contratCadastral?.lastUpdate && (
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Dernière mise à jour : {new Date(contract.contratCadastral.lastUpdate).toLocaleString()}
        </p>
      )}

      <Dialog open={isChoiceDialogOpen} onOpenChange={setIsChoiceDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Statut cadastral</DialogTitle>
            <DialogDescription>Choisir un statut pour le document cadastral</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1 py-2">
            {CONTRAT_CADASTRAL_STATUTS.map((s) => (
              <Button
                key={s.value}
                variant={statut === s.value ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => {
                  setConfirmStatut(s.value)
                  setIsChoiceDialogOpen(false)
                }}
              >
                <Icons.fileText className={`h-4 w-4 mr-2 ${getContratCadastralColor(s.value)}`} />
                {s.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmStatut !== null} onOpenChange={(open) => { if (!open) setConfirmStatut(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer la mise à jour</DialogTitle>
            <DialogDescription>
              Voulez-vous mettre à jour le statut cadastral vers &quot;{confirmStatut != null ? getContratCadastralLabel(confirmStatut) : ""}&quot; ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmStatut(null); setIsChoiceDialogOpen(true) }}>
              Annuler
            </Button>
            <Button onClick={handleConfirmUpdate} disabled={isUpdating}>
              {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnauthorizedDialog} onOpenChange={setShowUnauthorizedDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Non autorisé</DialogTitle>
            <DialogDescription>
              Vous n&apos;êtes pas autorisé à modifier ce statut, veuillez contacter votre administrateur.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowUnauthorizedDialog(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Composant de statut avec couleurs améliorées (light + dark)
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    en_cours: { label: "En cours", className: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700" },
    termine: { label: "Terminé", className: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700" },
    en_attente: { label: "En attente", className: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700" }
  }
  
  const config = statusConfig[status as keyof typeof statusConfig] || { 
    label: status, 
    className: "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600" 
  }
  
  return (
    <Badge className={`border ${config.className} font-medium px-3 py-1`}>
      {config.label}
    </Badge>
  )
}

// Composant pour les informations clés
const InfoCard = ({ title, value, subtitle, icon: Icon, className = "" }: {
  title: string
  value: string | number
  subtitle?: string
  icon?: any
  className?: string
}) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {Icon && (
        <div className="flex-shrink-0 ml-4">
          <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
      )}
    </div>
  </div>
)

export default function ContractDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [contract, setContract] = useState<ContractDetails | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // États des dialogues
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false)
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
  const [isEditCadastralDialogOpen, setIsEditCadastralDialogOpen] = useState(false)
  const [isDeleteCadastralDialogOpen, setIsDeleteCadastralDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  const [isDownloadErrorDialogOpen, setIsDownloadErrorDialogOpen] = useState(false)
  
  // États des formulaires
  const [newDocument, setNewDocument] = useState({ description: "", typeDocumentId: "" })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [cadastralDocumentTypes, setCadastralDocumentTypes] = useState<any[]>([])
  const [isLoadingDocumentTypes, setIsLoadingDocumentTypes] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState<any>(null)
  const [selectedContractFile, setSelectedContractFile] = useState<File | null>(null)
  const [newPlan, setNewPlan] = useState({ dateDebut: "", echelons: "", frequencePaiement: "1" })
  const [notifyClient, setNotifyClient] = useState(false)
  const [notifyClientCadastral, setNotifyClientCadastral] = useState(false)
  const [notifyClientUpdateCadastral, setNotifyClientUpdateCadastral] = useState(false)
  const [editingDocument, setEditingDocument] = useState<{
    _id: string,
    typeDocument: string,
    code: string,
    description: string,
    dateUpload: string,
    uploadedBy: string
  } | null>(null)
  const [editDocument, setEditDocument] = useState({ description: "", typeDocument: "" })
  const [selectedEditFile, setSelectedEditFile] = useState<File | null>(null)

  // Simulation rappel (mode dev uniquement)
  const [isRappelPreviewOpen, setIsRappelPreviewOpen] = useState(false)
  const [rappelPreview, setRappelPreview] = useState<RappelPreview | null>(null)
  const [rappelPreviewLoading, setRappelPreviewLoading] = useState(false)
  const [selectedScenarioDiff, setSelectedScenarioDiff] = useState<number>(0)
  const [rappelPreviewTab, setRappelPreviewTab] = useState<'email' | 'whatsapp'>('email')

  const fetchCadastralDocumentTypes = async () => {
    try {
      setIsLoadingDocumentTypes(true)
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/cadastral-document-types?isActive=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.data && response.data.success) {
        setCadastralDocumentTypes(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching cadastral document types:", error)
      toast.error("Erreur lors de la récupération des types de documents cadastraux")
    } finally {
      setIsLoadingDocumentTypes(false)
    }
  }

  useEffect(() => {
    const fetchContractDetails = async () => {
      setIsLoading(true)
      try {
        const token = localStorage.getItem("authToken")
        const contractResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/details/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        
        setContract(contractResponse.data)
        setInvoices(contractResponse.data.factures)
      } catch (error) {
        devLog.error("Erreur lors de la récupération des détails du contrat:", error)
        toast.error("Impossible de récupérer les détails du contrat. Veuillez réessayer.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchContractDetails()
    fetchCadastralDocumentTypes()
  }, [id, toast])

  const handleDownloadContract = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/download/${contract?.code}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `contrat_${contract?.code}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      devLog.error("Erreur lors du téléchargement du contrat:", error)
      toast.error(error instanceof Error ? error.message : "Une erreur inattendue s'est produite.")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4 relative">
        <div className="max-w-md w-full relative">
          {/* Main Loading Card */}
          <div className="bg-white/90 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700 p-8 text-center relative overflow-hidden">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none">
              <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-blue-400/20 animate-shimmer" />
            </div>

            {/* Animated Logo/Icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto relative">
                {/* Outer rotating ring */}
                <div className="absolute inset-0 rounded-full border-4 border-blue-200/30 dark:border-blue-500/30"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 animate-spin"></div>
                
                {/* Inner pulsing circle */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-500 animate-pulse"></div>
                
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icons.fileText className="h-8 w-8 text-white animate-bounce" />
                </div>
              </div>
            </div>

            {/* Loading Text */}
            <div className="space-y-3 relative">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Chargement du contrat</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Récupération des détails en cours...</p>
            </div>

            {/* Progress Bar with shimmer */}
            <div className="mt-6 relative">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-full min-w-[30%] max-w-[70%] bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 dark:from-blue-500 dark:via-blue-400 dark:to-indigo-500 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Loading Dots */}
            <div className="flex justify-center space-x-1 mt-4 gap-1">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-4 h-4 bg-blue-400/20 dark:bg-blue-500/30 rounded-full animate-ping" />
          <div className="absolute top-40 right-16 w-3 h-3 bg-indigo-400/20 dark:bg-indigo-500/30 rounded-full animate-ping [animation-delay:0.5s]" />
          <div className="absolute bottom-32 left-20 w-5 h-5 bg-purple-400/20 dark:bg-purple-500/30 rounded-full animate-ping [animation-delay:1s]" />
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.circleX className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Contrat non trouvé</h2>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-6">Le contrat que vous recherchez n'existe pas ou a été supprimé.</p>
            <Button 
              onClick={() => router.back()} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Retour
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const hasContractFile = !!(contract.contrat?.fichier || contract.contrat?.path)
  const contractDisplayName =
    contract.contrat?.originalName ||
    contract.contrat?.fichier ||
    contract.contrat?.path?.split('/').pop() ||
    "—"
  const contractUploadedDate = contract.contrat?.dateUpload?.split('T')[0] || "—"

  const totalPaid = contract.total - contract.remainingBalance
  const paymentProgress = (totalPaid / contract.total) * 100

  const selectedScenario = rappelPreview?.scenarios.find(s => s.diff === selectedScenarioDiff) ?? null

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      en_cours: "bg-yellow-200 text-yellow-900",
      termine: "bg-green-200 text-green-900",
      en_attente: "bg-red-200 text-red-900"
    }
    return statusStyles[status as keyof typeof statusStyles] || "bg-gray-200 text-gray-900 dark:text-gray-100"
  }

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/documents/download/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `document_${documentId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      devLog.error("Erreur lors du téléchargement du document:", error)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Le document a été supprimé avec succès.")
    } catch (error) {
      devLog.error("Erreur lors de la suppression du document:", error)
    }
  }
  const handleDownloadPlan = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/download/plan/${contract?.code}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `Plan_Échelonnement_${contract?.clientId.nom}_${contract?.clientId.prenom}_${contract?.code}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      devLog.error("Erreur lors du téléchargement du plan:", error)
      toast.error(error instanceof Error ? error.message : "Une erreur inattendue s'est produite.")
    }
  }

  const handleDownloadInvoice = async (invoiceCode: string) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/factures/download/${invoiceCode}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })
      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `Quittance_${invoiceCode}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Quittance téléchargée")
    } catch (error) {
      devLog.error("Erreur lors du téléchargement de la facture:", error)
      toast.error(error instanceof Error ? error.message : "Une erreur inattendue s'est produite.")
    }
  }

  const handleAddDocumentCadastral = () => {
    setIsDialogOpen(true)
  }

  const handleConfirmAddDocument = async () => {
    // Validate document type
    if (!newDocument.typeDocumentId || newDocument.typeDocumentId.trim() === "") {
      toast.error("Veuillez sélectionner un type de document.")
      return
    }

    // Check if payment is complete for the selected document type
    // Note: We allow creating the document even if payment is not complete
    // The file can be uploaded later when payment is complete

    const toastId = toast.loading("Ajout du document en cours...")

    try {
      const token = localStorage.getItem("authToken")
      const formData = new FormData()
      formData.append("contractId", contract?._id || "")
      formData.append("description", newDocument.description)
      formData.append("typeDocumentId", newDocument.typeDocumentId)
      if (selectedFile) {
        formData.append("file", selectedFile)
      }
      formData.append("notifyClient", notifyClientCadastral.toString())

     const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/contrats/upload/cadastre`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (response.status === 200 || response.status === 201) {
        toast.success("Le document cadastral a été ajouté avec succès.", { id: toastId })
        setIsDialogOpen(false)
        setSelectedFile(null)
        setNewDocument({ description: "", typeDocumentId: "" })
        setSelectedDocumentType(null)
        setNotifyClientCadastral(false)
        const documentCadastral = response.data.documentCadastral
        // Refresh contract details to get updated document list
        try {
          const contractResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/details/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          setContract(contractResponse.data)
        } catch (refreshError: any) {
          devLog.error("Erreur lors du rafraîchissement du contrat:", refreshError)
          // Don't show error toast for refresh, just log it
          // The document was already added successfully
        }
      } else {
        toast.error("Erreur lors de l'ajout du document cadastral.", { id: toastId })
      }
    } catch (error: any) {
      console.error("Erreur lors de l'ajout du document cadastral:", error)
      devLog.error("Erreur lors de l'ajout du document cadastral:", error)
      
      // Extract error message from axios response
      let errorMessage = "Une erreur inattendue s'est produite."
      if (axios.isAxiosError(error)) {
        // Handle different error statuses
        if (error.response?.status === 500) {
          // Server error - try to get detailed message
          errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        "Erreur serveur (500). Veuillez réessayer plus tard ou contacter le support."
        } else if (error.response?.status === 400) {
          // Bad request - show validation error
          errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        "Données invalides. Veuillez vérifier les informations saisies."
        } else if (error.response?.status === 401) {
          // Unauthorized
          errorMessage = "Vous n'êtes pas authentifié. Veuillez vous reconnecter."
        } else if (error.response?.status === 403) {
          // Forbidden
          errorMessage = "Vous n'avez pas la permission d'effectuer cette action."
        } else if (error.response?.status === 404) {
          // Not found
          errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        "Ressource non trouvée."
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.response?.data?.msg) {
          errorMessage = error.response.data.msg
        } else if (error.message) {
          errorMessage = error.message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, { 
        id: toastId,
        duration: 5000 
      })
    } finally {
      // Don't dismiss the toast here - let it show the error
    }
  }

  const handleDownloadCadastralDocument = async (documentId: string) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/download/cadastre/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      if (response.status === 405) {
        setIsDownloadErrorDialogOpen(true)
        return
      }

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `cadastre_${documentId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      devLog.error("Erreur lors du téléchargement du document cadastral:", error)
      
      // Check if the error response has status 405
      if (error.response && error.response.status === 405) {
        setIsDownloadErrorDialogOpen(true)
      } else {
        toast.error("Erreur lors du téléchargement du document.")
      }
    }
  }

  const handleDeleteCadastralDocument = (documentId: string) => {
    setDocumentToDelete(documentId)
    setIsDeleteCadastralDialogOpen(true)
  }

  const handleConfirmDeleteCadastralDocument = async () => {
    if (!documentToDelete) return

    const toastId = toast.loading("Suppression du document en cours...")

    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/contrats/delete/cadastre/${documentToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (response.status === 200) {
        toast.success("Le document cadastral a été supprimé avec succès.", { id: toastId })
        // Update contrat.documentCadastraux
        if (contract) {
          setContract({
            ...contract,
            documentCadastraux: contract.documentCadastraux.filter((doc) => doc._id !== documentToDelete)
          })
        }
        setIsDeleteCadastralDialogOpen(false)
        setDocumentToDelete(null)
      } else {
        toast.error("Erreur lors de la suppression du document cadastral.", { id: toastId })
      }
    } catch (error) {
      devLog.error("Erreur lors de la suppression du document cadastral:", error)
      toast.error(error instanceof Error ? error.message : "Une erreur inattendue s'est produite.", { id: toastId })
    } finally {
      toast.dismiss(toastId)
    }
  }

  const handleEditCadastralDocument = (document: {
    _id: string,
    typeDocument: string,
    code: string,
    description: string,
    dateUpload: string,
    uploadedBy: string
  }) => {
    setEditingDocument(document)
    setEditDocument({
      description: document.description,
      typeDocument: document.typeDocument
    })
    setSelectedEditFile(null)
    setNotifyClientUpdateCadastral(false)
    setIsEditCadastralDialogOpen(true)
  }

  const handleConfirmUpdateCadastralDocument = async () => {
    if (!editingDocument) return

    const toastId = toast.loading("Mise à jour du document en cours...")

    try {
      const token = localStorage.getItem("authToken")
      const formData = new FormData()
      formData.append("documentId", editingDocument._id)
      formData.append("description", editDocument.description)
      formData.append("typeDocument", editDocument.typeDocument)
      formData.append("contractId", contract?._id || "")
      formData.append("notifyClient", notifyClientUpdateCadastral.toString())
      if (selectedEditFile) {
        formData.append("file", selectedEditFile)
      }

      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/contrats/update/cadastre/${editingDocument._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (response.status === 200) {
        toast.success("Le document cadastral a été mis à jour avec succès.", { id: toastId })
        setIsEditCadastralDialogOpen(false)
        setEditingDocument(null)
        setEditDocument({ description: "", typeDocument: "" })
        setSelectedEditFile(null)
        setNotifyClientUpdateCadastral(false)
        
        // Update the document in the contract state
        if (contract) {
          setContract({
            ...contract,
            documentCadastraux: contract.documentCadastraux.map((doc) => 
              doc._id === editingDocument._id 
                ? { ...doc, ...response.data.documentCadastral }
                : doc
            )
          })
        }
      } else {
        toast.error("Erreur lors de la mise à jour du document cadastral.", { id: toastId })
      }
    } catch (error: any) {
      devLog.error("Erreur lors de la mise à jour du document cadastral:", error)
      
      // Extract error message from axios response
      let errorMessage = "Une erreur inattendue s'est produite."
      if (axios.isAxiosError(error)) {
        // Handle 500 server errors specifically
        if (error.response?.status === 500) {
          errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        "Erreur serveur (500). Veuillez réessayer plus tard ou contacter le support."
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.response?.data?.msg) {
          errorMessage = error.response.data.msg
        } else if (error.message) {
          errorMessage = error.message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, { id: toastId })
    } finally {
      toast.dismiss(toastId)
    }
  }

  const handleUploadContract = () => {
    setIsUploadDialogOpen(true)
  }

  const handleConfirmUploadContract = async () => {
    if (!selectedContractFile) {
      toast.error("Veuillez sélectionner un fichier à télécharger.")
      return
    }

    const toastId = toast.loading("Téléchargement du contrat en cours...")

    try {
      const token = localStorage.getItem("authToken")
      const formData = new FormData()
      formData.append("contractId", contract?._id || "")
      formData.append("file", selectedContractFile || "")

     const resultat= await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/contrats/upload/contrat`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Le contrat a été téléchargé avec succès.", { id: toastId })  
      setIsUploadDialogOpen(false)
      setSelectedContractFile(null)
      //update contrat.contrat
      if (contract) {
        setContract({
          ...contract,
          contrat: resultat.data.contrat.contrat
        })
      }
    } catch (error: any) {
      devLog.error("Erreur lors du téléchargement du contrat:", error)
      
      // Extract error message from axios response
      let errorMessage = "Une erreur inattendue s'est produite."
      if (axios.isAxiosError(error)) {
        // Handle 500 server errors specifically
        if (error.response?.status === 500) {
          errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        "Erreur serveur (500). Veuillez réessayer plus tard ou contacter le support."
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.response?.data?.msg) {
          errorMessage = error.response.data.msg
        } else if (error.message) {
          errorMessage = error.message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, { id: toastId })
    }
  }

  const handlePreviewRappel = async () => {
    if (!contract) return
    setRappelPreview(null)
    setRappelPreviewLoading(true)
    setIsRappelPreviewOpen(true)
    try {
      const token = localStorage.getItem("authToken")
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/contrats/rappel-preview/${contract.code}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setRappelPreview(res.data)
      const todayScenario = res.data.scenarios.find((s: RappelScenario) => s.isToday)
      setSelectedScenarioDiff(todayScenario?.diff ?? res.data.scenarios[2]?.diff ?? 0)
      setRappelPreviewTab('email')
    } catch (err) {
      toast.error("Erreur lors de la simulation du rappel")
      setIsRappelPreviewOpen(false)
    } finally {
      setRappelPreviewLoading(false)
    }
  }

  const handleEditPlan = () => {
    setNewPlan({
      dateDebut: new Date(contract?.dateDebut || '').toISOString().split('T')[0],
      echelons: String(contract?.echelons ?? ""),
      frequencePaiement: String(contract?.frequencePaiement ?? "1"),
    })
    setIsEditPlanDialogOpen(true)
  }

  const handleConfirmEditPlan = async () => {

    const toastId = toast.loading("Modification du plan en cours...")

    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/contrats/update/plan`, {
        contractId: contract?._id,
        newPlan,
        notifyClient
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 200) {
        setIsSuccessDialogOpen(true)
      }
      toast.success("Le plan a été modifié avec succès.", { id: toastId })
      setIsEditPlanDialogOpen(false)
      if (contract) {
        const freq = parseInt(newPlan.frequencePaiement) || 1
        const echelonsNum = parseInt(newPlan.echelons) || contract.echelons
        const finDate = new Date(newPlan.dateDebut)
        finDate.setMonth(finDate.getMonth() + echelonsNum * freq)
        setContract({
          ...contract,
          dateDebut: newPlan.dateDebut,
          dateFin: finDate.toISOString().split('T')[0],
          echelons: echelonsNum,
          frequencePaiement: freq,
        })
      }
    } catch (error: any) {
      devLog.error("Erreur lors de la modification du plan:", error)
      
      // Extract error message from axios response
      let errorMessage = "Une erreur inattendue s'est produite."
      if (axios.isAxiosError(error)) {
        // Handle 500 server errors specifically
        if (error.response?.status === 500) {
          errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        "Erreur serveur (500). Veuillez réessayer plus tard ou contacter le support."
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.response?.data?.msg) {
          errorMessage = error.response.data.msg
        } else if (error.message) {
          errorMessage = error.message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, { id: toastId })
    } finally {
      toast.dismiss(toastId)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header avec navigation et actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Button 
                  onClick={() => router.back()} 
                  variant="ghost" 
                  size="sm"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Icons.arrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <StatusBadge status={contract.statut} />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Détails du Contrat
              </h1>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Code: <span className="text-blue-600 dark:text-blue-400 font-semibold">{contract.code}</span>
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={handleDownloadContract} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Icons.download className="h-4 w-4 mr-2" />
                Télécharger Contrat
              </Button>
              <Button
                onClick={handleDownloadPlan}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Icons.download className="h-4 w-4 mr-2" />
                Télécharger Plan
              </Button>
              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={handlePreviewRappel}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20 px-4 py-2 rounded-lg shadow-sm"
                >
                  <Icons.mail className="h-4 w-4 mr-2" />
                  Simuler rappel
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Onglets principaux */}
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 shadow-sm">
            <TabsTrigger 
              value="overview" 
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-200 data-[state=active]:shadow-sm rounded-lg px-4 py-2 font-medium transition-all"
            >
              Aperçu
            </TabsTrigger>
            <TabsTrigger 
              value="client" 
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-200 data-[state=active]:shadow-sm rounded-lg px-4 py-2 font-medium transition-all"
            >
              Client
            </TabsTrigger>
            <TabsTrigger 
              value="terrain" 
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-200 data-[state=active]:shadow-sm rounded-lg px-4 py-2 font-medium transition-all"
            >
              Terrain
            </TabsTrigger>
            <TabsTrigger 
              value="invoices" 
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-200 data-[state=active]:shadow-sm rounded-lg px-4 py-2 font-medium transition-all"
            >
              Paiements
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-200 data-[state=active]:shadow-sm rounded-lg px-4 py-2 font-medium transition-all"
            >
              Documents
            </TabsTrigger>
          </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Cartes d'informations clés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <InfoCard
              title="Montant Total"
              value={`$${contract.total.toLocaleString()}`}
              subtitle="Valeur du contrat"
              icon={Icons.dollarSign}
              className="border-l-4 border-l-blue-500"
            />
            <InfoCard
              title="Solde Restant"
              value={`$${contract.remainingBalance.toLocaleString()}`}
              subtitle="Montant à payer"
              icon={Icons.dollarSign}
              className="border-l-4 border-l-red-500"
            />
            <InfoCard
              title="Durée"
              value={`${contract.nbMonth} mois`}
              subtitle="Période du contrat"
              icon={Icons.clock}
              className="border-l-4 border-l-emerald-500"
            />
            <InfoCard
              title="Progression"
              value={`${paymentProgress.toFixed(1)}%`}
              subtitle="Paiement effectué"
              icon={Icons.barChart}
              className="border-l-4 border-l-purple-500"
            />
          </div>

          {/* Barre de progression détaillée */}
          <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Icons.barChart className="h-5 w-5 text-blue-600" />
                Progression du Paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Montant payé</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${totalPaid.toLocaleString()}</span>
                </div>
                <ProgressBar total={contract.total} paid={totalPaid} />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Montant restant</span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">${contract.remainingBalance.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations temporelles */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Icons.clock className="h-5 w-5 text-blue-600" />
                  Informations Temporelles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date du Contrat</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {new Date(contract.dateContrat).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date de Début</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {new Date(contract.dateDebut).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date de Fin</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {new Date(contract.dateFin).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fréquence de paiement</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {({"1": "Mensuel", "2": "Bi-mensuel", "3": "Trimestriel", "4": "Quadrimestriel", "6": "Semestriel", "12": "Annuel"} as Record<string, string>)[String(contract.frequencePaiement ?? 1)] ?? `Tous les ${contract.frequencePaiement ?? 1} mois`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mois restants</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {contract.remainingMonths} mois
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <CardHeader className="pb-4">
                              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Icons.eye className="h-5 w-5 text-blue-600" />
                Statut du Contrat
              </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Statut actuel</span>
                  <StatusBadge status={contract.statut} />
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Détails du statut</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {contract.statut === 'en_cours' && 'Le contrat est actuellement en cours d\'exécution'}
                    {contract.statut === 'termine' && 'Le contrat a été complètement finalisé'}
                    {contract.statut === 'en_attente' && 'Le contrat est en attente de démarrage'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="client" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icons.user className="h-5 w-5 text-blue-600" />
                </div>
                Informations du Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Informations personnelles */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Icons.user className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Informations Personnelles
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nom Complet</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          {contract.clientId.prenom} {contract.clientId.nom} {contract.clientId.postnom}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Code Client</p>
                        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{contract.clientId.code}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Date de Naissance</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatDateOnly(contract.clientId.dateNaissance) || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Statut Professionnel</p>
                        <Badge 
                          variant={contract.clientId.salarie ? "default" : "secondary"}
                          className={`${contract.clientId.salarie ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700' : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-500'} border px-3 py-1 font-medium`}
                        >
                          {contract.clientId.salarie ? "Salarié" : "Non-salarié"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informations de contact */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Icons.phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Informations de Contact
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Téléphone</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Icons.phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          {contract.clientId.indicatif} {contract.clientId.telephone}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Icons.mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          {contract.clientId.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Adresse</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Icons.mapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          {contract.clientId.adresse}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terrain" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Icons.mapPin className="h-5 w-5 text-emerald-600" />
                </div>
                Détails du Terrain
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contract.terrainId ? (
                <>
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Informations techniques */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Icons.fileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Informations Techniques
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Code Terrain</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{contract.terrainId.code}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Numéro</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{contract.terrainId.numero}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Dimension</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{contract.terrainId.dimension}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Prix</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          ${contract.terrainId.prix ? contract.terrainId.prix.toLocaleString() : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Localisation */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Icons.mapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Localisation
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cité</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{contract.terrainId.cite.nom}</p>
                      </div>
                      {contract.terrainId.cite.pays && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Pays</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{contract.terrainId.cite.pays}</p>
                        </div>
                      )}
                      {(contract.terrainId.cite.province || contract.terrainId.cite.ville) && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Province/Ville</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {contract.terrainId.cite.province}{contract.terrainId.cite.province && contract.terrainId.cite.ville ? ', ' : ''}{contract.terrainId.cite.ville}
                          </p>
                        </div>
                      )}
                      {(contract.terrainId.cite.commune || contract.terrainId.cite.quartier) && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Commune/Quartier</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {contract.terrainId.cite.commune}{contract.terrainId.cite.commune && contract.terrainId.cite.quartier ? ', ' : ''}{contract.terrainId.cite.quartier}
                          </p>
                        </div>
                      )}
                      {contract.terrainId.cite.avenue && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Avenue</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{contract.terrainId.cite.avenue}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {contract.terrainId.description && (
                <div className="mt-8">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Icons.fileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Description
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{contract.terrainId.description}</p>
                  </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icons.mapPin className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Aucun terrain associé</h3>
                  <p className="text-gray-600 dark:text-gray-400">Ce contrat n'est pas encore associé à un terrain.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Icons.dollarSign className="h-5 w-5 text-purple-600" />
                </div>
                Historique des Paiements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <TableHead className="text-sm font-semibold text-gray-700 dark:text-gray-300 py-4">Date</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 dark:text-gray-300 py-4">Montant</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 dark:text-gray-300 py-4">Type Paiement</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 dark:text-gray-300 py-4">Méthode</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 dark:text-gray-300 py-4">Statut</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 dark:text-gray-300 py-4 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice, index) => (
                        <TableRow 
                          key={invoice._id} 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-800/50' : 'bg-gray-50/50 dark:bg-gray-700/30'}`}
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Icons.clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {new Date(invoice.date).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {invoice.somme.toLocaleString()} {invoice.devise}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Icons.fileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {invoice.type === "cadastral" ? "Cadastral" : "Mensualité"}
                              </span>
                            </div>
                            {invoice.type === "cadastral" && invoice.motif && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Motif: {invoice.motif.typeDocument}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                             <div className="flex items-center gap-2">
                               <Icons.dollarSign className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                               {invoice.bonus
                                 ? <span className="font-semibold text-amber-700 dark:text-amber-400">Bonus</span>
                                 : <span className="font-medium text-gray-700 dark:text-gray-300">{invoice.methode}</span>
                               }
                             </div>
                           </TableCell>
                          <TableCell className="py-4">
                            <Badge 
                              className={`${
                                invoice.status === "paid" 
                                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700" 
                                  : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700"
                              } border px-3 py-1 font-medium`}
                            >
                              {invoice.status === "paid" ? "Payé" : "Annulé"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadInvoice(invoice.code)}
                              className="hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                              <Icons.download className="h-4 w-4 mr-2" />
                              Télécharger
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                                 <div className="text-center py-12">
                   <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Icons.dollarSign className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                   </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Aucun paiement trouvé</h3>
                  <p className="text-gray-600 dark:text-gray-400">Aucun paiement n'a été enregistré pour ce contrat.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Icons.fileText className="h-5 w-5 text-orange-600" />
                </div>
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Contrat */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Icons.fileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Contrat
                  </h3>
                  {!hasContractFile && (
                    <Button 
                      onClick={handleUploadContract}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      <Icons.upload className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  )}
                </div>
                
                {hasContractFile ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                          <Icons.fileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{contractDisplayName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Ajouté le {contractUploadedDate}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleDownloadContract}
                          className="hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-700"
                        >
                          <Icons.download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleUploadContract}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Icons.replace className="h-4 w-4 mr-2" />
                          Remplacer
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <Icons.fileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Aucun contrat téléchargé</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Téléchargez le contrat pour commencer</p>
                  </div>
                )}
              </div>

              {/* Plan d'échelonnement */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Icons.barChart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Plan d'échelonnement
                  </h3>
                  <Button 
                    onClick={handleEditPlan}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
                  >
                    <Icons.edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                </div>
                
                {contract.planEcholon ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center">
                          <Icons.barChart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{contract.planEcholon?.path?.split('/').pop() ?? '—'}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Ajouté le {contract.planEcholon?.dateUpload?.split('T')[0] ?? '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleDownloadPlan}
                          className="hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-700"
                        >
                          <Icons.download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <Icons.barChart className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Aucun plan d'échelonnement</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Créez un plan d'échelonnement pour ce contrat</p>
                  </div>
                )}
              </div>

              {/* Statut contrat cadastral */}
              <ContratCadastralStatutSection contract={contract} onUpdate={(next) => setContract((c) => c ? { ...c, contratCadastral: next } : c)} />

              {/* Documents Cadastraux */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                                     <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                     <Icons.fileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                     Documents Cadastraux
                   </h3>
                  <Button 
                    onClick={handleAddDocumentCadastral}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    <Icons.plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
                
                {contract.documentCadastraux && contract.documentCadastraux.length > 0 ? (
                  <div className="space-y-3">
                    {contract.documentCadastraux.map((document) => (
                      <div key={document._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
                              <Icons.fileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{document.typeDocument}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{document.description}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Code: {document.code} • Ajouté le {document.dateUpload?.split('T')[0] ?? '—'}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadCadastralDocument(document._id)}
                              className="hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-200 dark:hover:border-purple-700"
                            >
                              <Icons.download className="h-4 w-4 mr-2" />
                              Télécharger
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditCadastralDocument(document)}
                              className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                            >
                              <Icons.edit className="h-4 w-4 mr-2" />
                              Modifier
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteCadastralDocument(document._id)}
                              className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                            >
                              <Icons.trash className="h-4 w-4 mr-2" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                                     <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                     <Icons.fileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Aucun document cadastral</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ajoutez des documents cadastraux pour ce contrat</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Dialogues */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icons.plus className="h-5 w-5 text-blue-600" />
              Ajouter un Document Cadastral
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Input
                value={newDocument.description}
                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                placeholder="Description du document"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type de Document *</label>
              {isLoadingDocumentTypes ? (
                <div className="flex items-center justify-center py-4">
                  <Icons.spinner className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Chargement des types...</span>
                </div>
              ) : (
                <Select
                  value={newDocument.typeDocumentId}
                  onValueChange={(value) => {
                    setNewDocument({ ...newDocument, typeDocumentId: value })
                    const docType = cadastralDocumentTypes.find(t => t._id === value)
                    setSelectedDocumentType(docType)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un type de document" />
                  </SelectTrigger>
                  <SelectContent>
                    {cadastralDocumentTypes.length > 0 ? (
                      cadastralDocumentTypes.map((type) => (
                        <SelectItem key={type._id} value={type._id}>
                          {type.titre} - ${type.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-500">
                        Aucun type de document disponible
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
              {selectedDocumentType && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <span className="font-medium">Prix:</span> ${selectedDocumentType.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {selectedDocumentType.description && (
                    <p className="text-xs text-blue-600 mt-1">{selectedDocumentType.description}</p>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Fichier</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Icons.upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Cliquez pour sélectionner un fichier</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PDF, DOC, DOCX (max 10MB)</p>
                </label>
              </div>
              {selectedFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {selectedFile.name} sélectionné
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notify-client-cadastral"
                checked={notifyClientCadastral}
                onChange={(e) => setNotifyClientCadastral(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notify-client-cadastral" className="text-sm font-medium text-gray-700">
                Notifier le client
              </label>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmAddDocument}
              disabled={!newDocument.typeDocumentId || isLoadingDocumentTypes}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icons.upload className="h-5 w-5 text-blue-600" />
              Télécharger le Contrat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Fichier du Contrat</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  onChange={(e) => setSelectedContractFile(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                  id="contract-file-upload"
                  accept=".pdf,.doc,.docx"
                />
                <label htmlFor="contract-file-upload" className="cursor-pointer">
                  <Icons.fileText className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Cliquez pour sélectionner le contrat</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PDF, DOC, DOCX (max 10MB)</p>
                </label>
              </div>
              {selectedContractFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {selectedContractFile.name} sélectionné
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsUploadDialogOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmUploadContract}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Télécharger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icons.edit className="h-5 w-5 text-emerald-600" />
              Modifier le Plan d'échelonnement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
                           <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                 <div className="flex items-start gap-3">
                   <Icons.eye className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Attention</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Vous êtes sur le point de modifier le plan d'échelonnement. Cette action peut affecter les échéances de paiement.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date de Début</label>
                <Input
                  type="date"
                  value={newPlan.dateDebut}
                  onChange={(e) => setNewPlan({ ...newPlan, dateDebut: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nombre d'échelons</label>
                <Input
                  type="number"
                  min="1"
                  value={newPlan.echelons}
                  onChange={(e) => setNewPlan({ ...newPlan, echelons: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Fréquence de paiement</label>
              <Select
                value={newPlan.frequencePaiement}
                onValueChange={(val) => setNewPlan({ ...newPlan, frequencePaiement: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner la fréquence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Mensuel (chaque mois)</SelectItem>
                  <SelectItem value="2">Bi-mensuel (chaque 2 mois)</SelectItem>
                  <SelectItem value="3">Trimestriel (chaque 3 mois)</SelectItem>
                  <SelectItem value="4">Quadrimestriel (chaque 4 mois)</SelectItem>
                  <SelectItem value="6">Semestriel (chaque 6 mois)</SelectItem>
                  <SelectItem value="12">Annuel (chaque 12 mois)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={notifyClient}
                onChange={(e) => setNotifyClient(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">
                Notifier le client par email
              </label>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsEditPlanDialogOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmEditPlan}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              Modifier le Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icons.checkCircle className="h-5 w-5 text-emerald-600" />
              Succès
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.checkCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Plan modifié avec succès
              </h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">
                Le plan d'échelonnement a été mis à jour. Les nouvelles dates sont maintenant actives.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setIsSuccessDialogOpen(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCadastralDialogOpen} onOpenChange={setIsEditCadastralDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icons.edit className="h-5 w-5 text-blue-600" />
              Modifier le Document Cadastral
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Input
                value={editDocument.description}
                onChange={(e) => setEditDocument({ ...editDocument, description: e.target.value })}
                placeholder="Description du document"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type de Document</label>
              <Select
                value={editDocument.typeDocument}
                onValueChange={(value) => setEditDocument({ ...editDocument, typeDocument: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demande_de_terre">Demande de Terre</SelectItem>
                  <SelectItem value="jeton_d_attribution">Jeton d'Attribution</SelectItem>
                  <SelectItem value="contrat_de_location">Contrat de Location</SelectItem>
                  <SelectItem value="certificat_d_enregistrement">Certificat d'Enregistrement</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nouveau Fichier (optionnel)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  onChange={(e) => setSelectedEditFile(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                  id="edit-file-upload"
                />
                <label htmlFor="edit-file-upload" className="cursor-pointer">
                  <Icons.upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Cliquez pour sélectionner un nouveau fichier</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PDF, DOC, DOCX (max 10MB)</p>
                </label>
              </div>
              {selectedEditFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {selectedEditFile.name} sélectionné
                </p>
              )}
              {editingDocument && !selectedEditFile && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Le fichier actuel sera conservé si aucun nouveau fichier n'est sélectionné
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notify-client-update-cadastral"
                checked={notifyClientUpdateCadastral}
                onChange={(e) => setNotifyClientUpdateCadastral(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notify-client-update-cadastral" className="text-sm font-medium text-gray-700">
                Notifier le client
              </label>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsEditCadastralDialogOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmUpdateCadastralDocument}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteCadastralDialogOpen} onOpenChange={setIsDeleteCadastralDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icons.trash className="h-5 w-5 text-red-600" />
              Supprimer le Document Cadastral
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Icons.alertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="space-y-2">
                <p className="text-gray-900 dark:text-gray-100 font-medium">
                  Êtes-vous sûr de vouloir supprimer ce document cadastral ?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                  Cette action est irréversible. Le document sera définitivement supprimé du système.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteCadastralDialogOpen(false)
                setDocumentToDelete(null)
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmDeleteCadastralDocument}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Icons.trash className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDownloadErrorDialogOpen} onOpenChange={setIsDownloadErrorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icons.alertTriangle className="h-5 w-5 text-orange-600" />
              Document Non Disponible
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Icons.file className="h-5 w-5 text-orange-600" />
              </div>
              <div className="space-y-2">
                <p className="text-gray-900 dark:text-gray-100 font-medium">
                  Aucun document Téléversé
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                  Le document cadastral n'a pas encore été téléversé ou n'est pas disponible pour le téléchargement.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsDownloadErrorDialogOpen(false)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Simulation rappel paiement (DEV uniquement) ── */}
      <Dialog open={isRappelPreviewOpen} onOpenChange={(open) => { setIsRappelPreviewOpen(open); if (!open) setRappelPreview(null) }}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden p-0">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
                <Icons.mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Simulation de rappel — {rappelPreview?.contrat.code ?? contract.code}
              </DialogTitle>
              <span className="ml-auto text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full">
                DEV
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-11">
              Mode développement — aucun message n&apos;est envoyé au client
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {rappelPreviewLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Icons.spinner className="h-8 w-8 animate-spin text-amber-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Calcul en cours…</span>
              </div>
            ) : rappelPreview ? (
              <>
                {/* Métriques de calcul */}
                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Métriques · {rappelPreview.debug.dateSimulation}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      { label: "Mensualité", value: `$${rappelPreview.debug.mensualite.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "blue" },
                      { label: "Acompte", value: `$${rappelPreview.debug.acompte.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "gray" },
                      { label: "Total payé", value: `$${rappelPreview.debug.totalPaidGlobal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "emerald" },
                      { label: "Payé (mensualités)", value: `$${rappelPreview.debug.totalPaidMensualites.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "emerald" },
                      { label: "Mois dus", value: String(rappelPreview.debug.monthsDue), color: "gray" },
                      { label: "Mois couverts", value: String(rappelPreview.debug.monthsCovered), color: rappelPreview.debug.monthsCovered >= rappelPreview.debug.monthsDue ? "emerald" : "gray" },
                      { label: "Arriérés", value: String(rappelPreview.debug.arrears), color: rappelPreview.debug.arrears > 0 ? "red" : "emerald" },
                      { label: "Mois courant", value: rappelPreview.debug.currentMonthPaid ? "✓ Payé" : "✗ Impayé", color: rappelPreview.debug.currentMonthPaid ? "emerald" : "red" },
                    ] as { label: string; value: string; color: string }[]).map(m => (
                      <div key={m.label} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{m.label}</p>
                        <p className={`text-sm font-bold ${
                          m.color === 'red' ? 'text-red-600 dark:text-red-400'
                          : m.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
                          : m.color === 'blue' ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-900 dark:text-gray-100'
                        }`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Statut envoi aujourd'hui */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border ${
                  rappelPreview.debug.willSendToday
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700'
                    : rappelPreview.debug.currentMonthPaid
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                }`}>
                  <span className="text-base">{rappelPreview.debug.willSendToday ? '⚡' : rappelPreview.debug.currentMonthPaid ? '✓' : 'ℹ️'}</span>
                  <span>
                    {rappelPreview.debug.willSendToday
                      ? `Un rappel SERA envoyé aujourd'hui — diff : ${rappelPreview.debug.daysDiff >= 0 ? '+' : ''}${rappelPreview.debug.daysDiff}j`
                      : rappelPreview.debug.currentMonthPaid
                        ? "Paiement à jour — aucun rappel aujourd'hui"
                        : `Aujourd'hui n'est pas un jour de rappel — diff : ${rappelPreview.debug.daysDiff >= 0 ? '+' : ''}${rappelPreview.debug.daysDiff}j`
                    }
                  </span>
                  <span className="ml-auto text-xs opacity-70">Échéance le {rappelPreview.contrat.jourEcheance} du mois</span>
                </div>

                {/* Sélecteur de scénario */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Scénario à prévisualiser</p>
                  <div className="flex flex-wrap gap-2">
                    {rappelPreview.scenarios.map(s => (
                      <button
                        key={s.diff}
                        type="button"
                        onClick={() => setSelectedScenarioDiff(s.diff)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          selectedScenarioDiff === s.diff
                            ? s.diff < 0 ? 'bg-blue-600 text-white border-blue-600'
                              : s.diff === 0 ? 'bg-orange-500 text-white border-orange-500'
                              : s.diff <= 5 ? 'bg-red-600 text-white border-red-600'
                              : 'bg-red-900 text-white border-red-900'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400'
                        } ${s.isToday ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                      >
                        {s.label}
                        {s.isToday && <span className="ml-1 opacity-80">← auj.</span>}
                        {s.wouldSendToday && <span className="ml-1">⚡</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Objet email du scénario sélectionné */}
                {selectedScenario && (
                  <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 font-medium">Objet :</span>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{selectedScenario.subject}</span>
                  </div>
                )}

                {/* Onglets Email / WhatsApp */}
                <div className="border-b border-gray-200 dark:border-gray-700 flex gap-0">
                  <button
                    type="button"
                    onClick={() => setRappelPreviewTab('email')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      rappelPreviewTab === 'email'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icons.mail className="h-4 w-4" />
                    Email HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setRappelPreviewTab('whatsapp')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      rappelPreviewTab === 'whatsapp'
                        ? 'border-green-600 text-green-600 dark:text-green-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icons.send className="h-4 w-4" />
                    WhatsApp
                  </button>
                </div>

                {/* Aperçu contenu */}
                {rappelPreviewTab === 'email' ? (
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <iframe
                      srcDoc={selectedScenario?.html ?? ''}
                      className="w-full"
                      style={{ height: '480px', border: 'none', display: 'block', background: '#fff' }}
                      title="Aperçu email"
                      sandbox="allow-same-origin"
                    />
                  </div>
                ) : (
                  <pre className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200 leading-relaxed">
                    {selectedScenario?.whatsapp ?? ''}
                  </pre>
                )}
              </>
            ) : null}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
            <Button variant="outline" className="w-full" onClick={() => setIsRappelPreviewOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
