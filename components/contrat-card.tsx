import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { SendContractDialog } from "./send-contract-dialog"
import { toast } from "react-hot-toast"
import axios from "axios"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { motion } from "framer-motion"

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

interface ContratCardProps {
  contrat: {
    _id: string
    code: string
    statut: "en_cours" | "termine" | "en_attente" | "résilié" | "révoqué"
    clientId: {
      _id: string
      nom: string
      prenom: string
    }
    terrainId: {
      numero: string
    }
    total: number
    // remainingBalance: number
    nbMonth: number
    remainingFromToday: number
    dateContrat: string
    totalPaid: number
    dateDebut: string
    dateFin: string
    contratCadastral?: { statut: string }
  }
  onContratUpdated: () => void
  viewMode?: "grid" | "list"
}

export function ContratCard({ contrat, onContratUpdated, viewMode = "grid" }: ContratCardProps) {
  const router = useRouter()
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isRevocationFormOpen, setIsRevocationFormOpen] = useState(false)
  const [revocationReason, setRevocationReason] = useState("")
  const [selectedMotif, setSelectedMotif] = useState("")
  const [motifDetails, setMotifDetails] = useState("")
  const [clientStatus, setClientStatus] = useState("active")
  const [terrainStatus, setTerrainStatus] = useState("Disponible")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [isUpdatingCadastral, setIsUpdatingCadastral] = useState(false)
  const [isCadastralDialogOpen, setIsCadastralDialogOpen] = useState(false)
  const [cadastralConfirmStatut, setCadastralConfirmStatut] = useState<string | null>(null)
  const [showUnauthorizedDialog, setShowUnauthorizedDialog] = useState(false)

  const cadastralStatut = contrat.contratCadastral?.statut ?? "non_disponible"
  const paymentProgress = contrat.total ? Math.round((contrat.totalPaid / contrat.total) * 100) : 0
  const cadastralDisabled = paymentProgress < 50

  const handleOpenCadastralDialog = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (cadastralDisabled) return
    setIsCadastralDialogOpen(true)
  }

  const handleSelectCadastralStatut = (statut: string) => {
    setCadastralConfirmStatut(statut)
  }

  const handleConfirmCadastralUpdate = async () => {
    if (!cadastralConfirmStatut) return
    setIsUpdatingCadastral(true)
    setShowUnauthorizedDialog(false)
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/contrats/${contrat._id}/contrat-cadastral`,
        { statut: cadastralConfirmStatut },
        { headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } }
      )
      toast.success("Statut cadastral mis à jour")
      setCadastralConfirmStatut(null)
      setIsCadastralDialogOpen(false)
      onContratUpdated()
    } catch (e: any) {
      const code = e.response?.data?.code
      const status = e.response?.status
      if (status === 403 && code === "AGENT_DOCUMENT_NOT_AUTHORIZED") {
        setCadastralConfirmStatut(null)
        setIsCadastralDialogOpen(false)
        setShowUnauthorizedDialog(true)
      } else {
        console.error(e)
        toast.error("Erreur lors de la mise à jour du statut cadastral")
      }
    } finally {
      setIsUpdatingCadastral(false)
    }
  }

  const handleCloseCadastralConfirm = () => {
    setCadastralConfirmStatut(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_cours":
        return "bg-orange-500 text-white"
      case "vendu":
        case "termine":
        return "bg-blue-500 text-white"
      case "en_attente":
        return "bg-yellow-500 text-white"
      case "résilié":
      case "révoqué":
        return "bg-red-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "en_cours":
        return "En cours"
      case "vendu":
        case "termine":
        return "Terminé"
      case "en_attente":
        return "En attente"
      case "résilié":
        return "Résilié"
      case "révoqué":
        return "Révoqué"
      default:
        return status
    }
  }

  const getProgressPercentage = () => {
    const total = contrat.total
    const paid = contrat.totalPaid
    return Math.round((paid / total) * 100)
  }

  const handleDownloadPlan = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/download/plan/${contrat.code}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `planEchelon_${contrat.code}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Plan d'échelonnement téléchargé")
    } catch (error) {
      console.error("Error downloading contract:", error)
      toast.error("Erreur lors du téléchargement")
    }
  }

  const handleDetailContrat = () => {
    router.push(`/dashboard/contrat/${contrat.code}`)
  }

  const handleResilierContrat = () => {
    setIsConfirmDialogOpen(true)
  }

  const handleConfirmResiliation = () => {
    setIsConfirmDialogOpen(false)
    setIsRevocationFormOpen(true)
  }

  const handleRevocationSuccess = () => {
    setIsRevocationFormOpen(false)
    onContratUpdated()
  }

  const handleRevocationDialogClose = (open: boolean) => {
    setIsRevocationFormOpen(open)
    if (!open) {
      // Réinitialiser les états quand le dialog se ferme
      setSelectedMotif("")
      setMotifDetails("")
      setRevocationReason("")
    }
  }

  const handleSubmitRevocation = async () => {
    if (!selectedMotif) {
      toast.error("Veuillez sélectionner un motif de résiliation")
      return
    }

    setIsSubmitting(true)
    try {
      const toastId = toast.loading("Résiliation du contrat...");
      
      // Concaténer le motif sélectionné avec les détails
      const fullMotif = motifDetails 
        ? `${selectedMotif}. ${motifDetails}`
        : selectedMotif

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/contrats/revoke/${contrat._id}`,
        {
          motif: fullMotif,
          clientStatus,
          terrainStatus,
          notifyWhatsapp,
          notifyEmail
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      )

      toast.success("Le contrat a été résilié avec succès", { id: toastId });
      
      setIsRevocationFormOpen(false)
      setSelectedMotif("")
      setMotifDetails("")
      setRevocationReason("")
      handleRevocationSuccess()
    } catch (error) {
      console.error("Error revoking contract:", error)
      toast.error("Erreur lors de la résiliation")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendContrat = () => {
    setIsSendDialogOpen(true)
  }

  const clientInitials = `${contrat.clientId.prenom.charAt(0)}${contrat.clientId.nom.charAt(0)}`

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600">
                  <AvatarFallback className="text-dark font-semibold">
                    {clientInitials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 transition-colors" onClick={handleDetailContrat}>
                      {contrat.code}
                    </h3>
                    <Badge className={`${getStatusColor(contrat.statut)}`}>
                      {getStatusText(contrat.statut)}
                    </Badge>
                  </div>
                  <p className="text-slate-600 dark:text-gray-400">
                    <Icons.user className="inline h-4 w-4 mr-1" />
                    {contrat.clientId.prenom} {contrat.clientId.nom}
                  </p>
                  <p className="text-slate-500 dark:text-gray-500 text-sm">
                    <Icons.mapPin className="inline h-4 w-4 mr-1" />
                    Terrain N° {contrat.terrainId.numero}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-500 dark:text-gray-500">Solde restant</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-gray-100">
                    {/* ${contrat.remainingBalance.toLocaleString()} */}
                  </p>
                </div>
                
                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-500 dark:text-gray-500">Progression</p>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-slate-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage()}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{getProgressPercentage()}%</span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-500 dark:text-gray-500">Date début</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-gray-100">
                    {new Date(contrat.dateDebut).toLocaleDateString()}
                  </p>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleOpenCadastralDialog}
                          disabled={isUpdatingCadastral || cadastralDisabled}
                          className="flex items-center justify-center rounded-md p-1 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Modifier le statut cadastral"
                        >
                          <Icons.fileText className={`h-5 w-5 ${getContratCadastralColor(cadastralStatut)} ${cadastralDisabled ? "opacity-50" : ""}`} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{cadastralDisabled ? "Modification possible à partir de 50% de paiement" : `Cadastral: ${getContratCadastralLabel(cadastralStatut)} (cliquer pour modifier)`}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icons.moreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadPlan(); }} className="flex items-center gap-2">
                      <Icons.download className="h-4 w-4" />
                      Télécharger le plan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendContrat(); }} className="flex items-center gap-2">
                      <Icons.send className="h-4 w-4" />
                      Envoyer un message
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDetailContrat(); }} className="flex items-center gap-2">
                      <Icons.eye className="h-4 w-4" />
                      Voir les détails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResilierContrat(); }} className="flex items-center gap-2 text-red-600">
                      <Icons.trash className="h-4 w-4" />
                      Résilier contrat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600">
              <AvatarFallback className="text-dark font-semibold text-sm">
                {clientInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 transition-colors" onClick={handleDetailContrat}>
                {contrat.code}
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-gray-500">
                {contrat.clientId.prenom} {contrat.clientId.nom}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Icons.moreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadPlan(); }} className="flex items-center gap-2">
                <Icons.download className="h-4 w-4" />
                Télécharger le plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendContrat(); }} className="flex items-center gap-2">
                <Icons.send className="h-4 w-4" />
                Envoyer un message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDetailContrat(); }} className="flex items-center gap-2">
                <Icons.eye className="h-4 w-4" />
                Voir les détails
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResilierContrat(); }} className="flex items-center gap-2 text-red-600">
                <Icons.trash className="h-4 w-4" />
                Résilier contrat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge className={`${getStatusColor(contrat.statut)}`}>
              {getStatusText(contrat.statut)}
            </Badge>
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleOpenCadastralDialog}
                      disabled={isUpdatingCadastral || cadastralDisabled}
                      className="flex items-center justify-center shrink-0 rounded-md p-1 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Modifier le statut cadastral"
                    >
                      <Icons.fileText className={`h-5 w-5 ${getContratCadastralColor(cadastralStatut)} ${cadastralDisabled ? "opacity-50" : ""}`} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{cadastralDisabled ? "Modification possible à partir de 50% de paiement" : `Cadastral: ${getContratCadastralLabel(cadastralStatut)} (cliquer pour modifier)`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-gray-500">Terrain</p>
              <p className="text-sm font-medium text-slate-900 dark:text-gray-100">N° {contrat.terrainId?.numero || "N/A"}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-gray-400">Solde restant</span>
              <span className="text-lg font-semibold text-slate-900 dark:text-gray-100">
                {/* ${contrat.remainingBalance.toLocaleString()} */}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-gray-400">Progression</span>
                <span className="font-medium text-slate-900 dark:text-gray-100">{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-slate-100">
            <div>
              <p className="text-slate-500 dark:text-gray-500">Date début</p>
              <p className="font-medium text-slate-900 dark:text-gray-100">{new Date(contrat.dateDebut).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-gray-500">Date fin</p>
              <p className="font-medium text-slate-900 dark:text-gray-100">{new Date(contrat.dateFin).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SendContractDialog
        open={isSendDialogOpen}
        onOpenChange={setIsSendDialogOpen}
        contratCode={contrat.code}
        clientNom={contrat.clientId.nom}
        clientPrenom={contrat.clientId.prenom}
        clientId={contrat.clientId._id}
      />

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation</DialogTitle>
            <DialogDescription>
              Voulez-vous résilier le contrat {contrat.code} ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleConfirmResiliation}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRevocationFormOpen} onOpenChange={handleRevocationDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résiliation du contrat</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="motif">Motif de résiliation</Label>
              <Select value={selectedMotif} onValueChange={setSelectedMotif}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un motif de résiliation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Le client a résilié son contrat">Le client a résilié son contrat</SelectItem>
                  <SelectItem value="Non-paiement des échéances">Non-paiement des échéances</SelectItem>
                  <SelectItem value="Violation des termes du contrat">Violation des termes du contrat</SelectItem>
                  <SelectItem value="Décision mutuelle">Décision mutuelle</SelectItem>
                  <SelectItem value="Problème de terrain">Problème de terrain</SelectItem>
                  <SelectItem value="Changement de situation du client">Changement de situation du client</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedMotif && (
              <div className="grid gap-2">
                <Label htmlFor="details">Détails supplémentaires</Label>
                <Textarea
                  id="details"
                  value={motifDetails}
                  onChange={(e) => setMotifDetails(e.target.value)}
                  placeholder="Ajoutez plus de détails sur le motif de résiliation..."
                  rows={4}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="clientStatus">Statut du client</Label>
              <Select value={clientStatus} onValueChange={setClientStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="supprimer">Supprimer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="terrainStatus">Statut du terrain</Label>
              <Select value={terrainStatus} onValueChange={setTerrainStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disponible">Disponible</SelectItem>
                  <SelectItem value="En cours">En cours</SelectItem>
                  <SelectItem value="Réservé">Réservé</SelectItem>
                  <SelectItem value="Vendu">Vendu</SelectItem>
                  <SelectItem value="Annulé">Annulé</SelectItem>
                  <SelectItem value="Cédé">Cédé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="notifyWhatsapp" 
                checked={notifyWhatsapp}
                onCheckedChange={(checked) => setNotifyWhatsapp(checked as boolean)}
              />
              <Label htmlFor="notifyWhatsapp">Notifier le client par WhatsApp</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="notifyEmail" 
                checked={notifyEmail}
                onCheckedChange={(checked) => setNotifyEmail(checked as boolean)}
              />
              <Label htmlFor="notifyEmail">Notifier le client par email</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRevocationDialogClose(false)}>Annuler</Button>
            <Button onClick={handleSubmitRevocation} disabled={isSubmitting || !selectedMotif}>
              {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog choix statut cadastral */}
      <Dialog open={isCadastralDialogOpen} onOpenChange={(open) => { if (!open) setIsCadastralDialogOpen(false) }}>
        <DialogContent className="sm:max-w-xs" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Statut cadastral</DialogTitle>
            <DialogDescription>Choisir un statut pour le document cadastral</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1 py-2">
            {CONTRAT_CADASTRAL_STATUTS.map((s) => (
              <Button
                key={s.value}
                variant={cadastralStatut === s.value ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => {
                  handleSelectCadastralStatut(s.value)
                  setIsCadastralDialogOpen(false)
                }}
              >
                <Icons.fileText className={`h-4 w-4 mr-2 ${getContratCadastralColor(s.value)}`} />
                {s.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation mise à jour statut cadastral */}
      <Dialog open={cadastralConfirmStatut !== null} onOpenChange={(open) => { if (!open) handleCloseCadastralConfirm() }}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Confirmer la mise à jour</DialogTitle>
            <DialogDescription>
              Voulez-vous mettre à jour le statut cadastral vers &quot;{cadastralConfirmStatut != null ? getContratCadastralLabel(cadastralConfirmStatut) : ""}&quot; ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { handleCloseCadastralConfirm(); setIsCadastralDialogOpen(true) }}>
              Annuler
            </Button>
            <Button onClick={handleConfirmCadastralUpdate} disabled={isUpdatingCadastral}>
              {isUpdatingCadastral && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog non autorisé à modifier le statut cadastral */}
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
    </motion.div>
  )
}
