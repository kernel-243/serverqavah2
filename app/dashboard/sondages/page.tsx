"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icons } from "@/components/icons"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"
import axios, { AxiosError } from "axios"
import { Sondage } from "@/types/sondage"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Client } from "@/types/client"
import SICInvitationProgressModal from "@/components/sic-invitation-progress-modal"
import { Loader2, UserPlus, Upload, FileSpreadsheet } from "lucide-react"
import { CountryIndicativeSelect } from "@/components/country-indicative-select"
import { normalizeForSearch } from "@/lib/normalizeForSearch"

interface SatisfactionSurvey {
  _id: string
  isClient: string
  wantsToBecomeClient?: string
  opinion?: string
  services?: string[]
  autreService?: string
  location?: string
  autreLocation?: string
  nom?: string
  prenom?: string
  sexe?: string
  pays?: string
  indicatif?: string
  telephone?: string
  email?: string
  projet?: string
  howKnown?: string
  autreHowKnown?: string
  clientServices?: string[]
  responses?: any
  evaluation?: any
  interlocuteur?: string
  noteInterlocuteur?: number
  commentaires?: string
  statut?: string
  createdAt?: string
  updatedAt?: string
}

export default function SondagesPage() {
  const [sondages, setSondages] = useState<Sondage[]>([])
  const [satisfactionSurveys, setSatisfactionSurveys] = useState<SatisfactionSurvey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSatisfaction, setIsLoadingSatisfaction] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("sondages")
  const [searchQuery, setSearchQuery] = useState("")
  const [satisfactionSearchQuery, setSatisfactionSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "deleted">("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isSatisfactionDetailOpen, setIsSatisfactionDetailOpen] = useState(false)
  const [selectedSondage, setSelectedSondage] = useState<Sondage | null>(null)
  const [selectedSatisfactionSurvey, setSelectedSatisfactionSurvey] = useState<SatisfactionSurvey | null>(null)
  const [newSondage, setNewSondage] = useState({
    title: "",
    message: ""
  })
  
  // Invitation SIC states
  const [sicClients, setSicClients] = useState<Client[]>([])
  const [sicProspects, setSicProspects] = useState<any[]>([])
  const [sicUsers, setSicUsers] = useState<any[]>([])
  const [isLoadingSIC, setIsLoadingSIC] = useState(false)
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isLoadingProspects, setIsLoadingProspects] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [sicSearchQuery, setSicSearchQuery] = useState("")
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [selectedProspects, setSelectedProspects] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedManualGuests, setSelectedManualGuests] = useState<string[]>([])
  const [selectAllClients, setSelectAllClients] = useState(false)
  const [selectAllProspects, setSelectAllProspects] = useState(false)
  const [selectAllUsers, setSelectAllUsers] = useState(false)
  const [selectAllManualGuests, setSelectAllManualGuests] = useState(false)
  
  // SIC Invitation sending states
  const [isSendingInvitations, setIsSendingInvitations] = useState(false)
  const [showSICConfirmDialog, setShowSICConfirmDialog] = useState(false)
  const [showSICProgressModal, setShowSICProgressModal] = useState(false)
  const [sicRecipientsStatus, setSicRecipientsStatus] = useState<any[]>([])
  const [sicSendingSessionId, setSicSendingSessionId] = useState<string | null>(null)
  const sicEventSourceRef = useRef<EventSource | null>(null)
  const [sicSendByEmail, setSicSendByEmail] = useState(true)
  const [sicSendByWhatsApp, setSicSendByWhatsApp] = useState(true)
  
  // Add manual guest dialog state
  const [isAddGuestDialogOpen, setIsAddGuestDialogOpen] = useState(false)
  const [manualGuestForm, setManualGuestForm] = useState({
    sexe: "",
    nom: "",
    postnom: "",
    prenom: "",
    email: "",
    indicatif: "+243",
    telephone: ""
  })
  
  // Import Excel state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importedUsers, setImportedUsers] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      if (activeTab === "sondages") {
        fetchSondages()
      } else if (activeTab === "satisfaction") {
        fetchSatisfactionSurveys()
      }
    }
  }, [isMounted, activeTab])

  const fetchSondages = async () => {
    if (!isMounted) return
    
    setIsLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null
      if (!token) {
        toast.error("Token d'authentification manquant")
        return
      }
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sondages/list`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      // Ensure we always set an array
      if (Array.isArray(response.data)) {
        setSondages(response.data)
      } else if (response.data && Array.isArray(response.data.sondages)) {
        setSondages(response.data.sondages)
      } else {
        console.warn("Unexpected API response format:", response.data)
        setSondages([])
      }
    } catch (error) {
      console.error("Error fetching sondages:", error)
      toast.error("Erreur lors du chargement des sondages")
      setSondages([]) // Ensure we always have an array
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSondage = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null
      if (!token) {
        toast.error("Token d'authentification manquant")
        return
      }
      
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sondages`, newSondage, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Sondage créé avec succès")
      setIsCreateDialogOpen(false)
      setNewSondage({ title: "", message: "" })
      fetchSondages()
    } catch (error) {
      console.error("Error creating sondage:", error)
      toast.error("Erreur lors de la création du sondage")
    }
  }

  const handleEditSondage = async () => {
    if (!selectedSondage) return
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null
      if (!token) {
        toast.error("Token d'authentification manquant")
        return
      }
      
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/sondages/${selectedSondage._id}`, {
        title: newSondage.title,
        message: newSondage.message
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Sondage modifié avec succès")
      setIsEditDialogOpen(false)
      setSelectedSondage(null)
      setNewSondage({ title: "", message: "" })
      fetchSondages()
    } catch (error) {
      console.error("Error updating sondage:", error)
      toast.error("Erreur lors de la modification du sondage")
    }
  }

  const handleArchiveSondage = async () => {
    if (!selectedSondage) return
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null
      if (!token) {
        toast.error("Token d'authentification manquant")
        return
      }
      
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/sondages/${selectedSondage._id}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Sondage archivé avec succès")
      setIsArchiveDialogOpen(false)
      setSelectedSondage(null)
      fetchSondages()
    } catch (error) {
      console.error("Error archiving sondage:", error)
      toast.error("Erreur lors de l'archivage du sondage")
    }
  }

  const handleViewSondage = (sondage: Sondage) => {
    router.push(`/dashboard/sondages/${sondage._id}`)
  }

  const handleEditClick = (sondage: Sondage) => {
    setSelectedSondage(sondage)
    setNewSondage({
      title: sondage.title,
      message: sondage.message
    })
    setIsEditDialogOpen(true)
  }

  const handleArchiveClick = (sondage: Sondage) => {
    setSelectedSondage(sondage)
    setIsArchiveDialogOpen(true)
  }

  const fetchSatisfactionSurveys = async () => {
    setIsLoadingSatisfaction(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null
      if (!token) {
        toast.error("Token d'authentification manquant")
        return
      }
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/satisfaction-surveys`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (response.data.success && Array.isArray(response.data.data)) {
        setSatisfactionSurveys(response.data.data)
      } else if (Array.isArray(response.data)) {
        setSatisfactionSurveys(response.data)
      } else {
        console.warn("Unexpected API response format:", response.data)
        setSatisfactionSurveys([])
      }
    } catch (error) {
      console.error("Error fetching satisfaction surveys:", error)
      if (error instanceof AxiosError && error.response?.status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.")
        router.push("/auth/login")
      } else {
        toast.error("Erreur lors du chargement des sondages de satisfaction")
      }
      setSatisfactionSurveys([])
    } finally {
      setIsLoadingSatisfaction(false)
    }
  }

  const fetchSatisfactionSurveyDetail = async (id: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null
      if (!token) {
        toast.error("Token d'authentification manquant")
        return
      }
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/satisfaction-surveys/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (response.data.success) {
        setSelectedSatisfactionSurvey(response.data.data)
        setIsSatisfactionDetailOpen(true)
      } else {
        toast.error("Erreur lors du chargement des détails")
      }
    } catch (error) {
      console.error("Error fetching satisfaction survey detail:", error)
      if (error instanceof AxiosError && error.response?.status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.")
        router.push("/auth/login")
      } else {
        toast.error("Erreur lors du chargement des détails")
      }
    }
  }

  const handleViewSatisfactionSurvey = (survey: SatisfactionSurvey) => {
    fetchSatisfactionSurveyDetail(survey._id)
  }

  const filteredSatisfactionSurveys = (satisfactionSurveys || []).filter(survey => {
    if (!satisfactionSearchQuery) return true
    const q = normalizeForSearch(satisfactionSearchQuery)
    return normalizeForSearch(`${survey.prenom || ''} ${survey.nom || ''}`).includes(q) ||
           normalizeForSearch(survey.email || '').includes(q) ||
           normalizeForSearch(survey.telephone || '').includes(q) ||
           (survey.isClient === 'yes' ? 'client' : 'non-client').includes(q)
  })

  const formatEvaluationValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === '') return '-'
    
    const valueStr = String(value)
    
    // Mapping des valeurs courantes
    const mappings: Record<string, Record<string, string>> = {
      transparence: {
        'oui': 'Oui',
        'partiellement': 'Partiellement',
        'non': 'Non'
      },
      rapidite: {
        'tres-rapide': 'Très rapide',
        'rapide': 'Rapide',
        'moyen': 'Moyen',
        'lent': 'Lent',
        'tres-lent': 'Très lent'
      },
      recommander: {
        'oui-toujours': 'Oui, toujours',
        'oui-souvent': 'Oui, souvent',
        'peut-etre': 'Peut-être',
        'non-jamais': 'Non, jamais'
      },
      ecoute: {
        'yes': 'Oui',
        'no': 'Non'
      },
      prixRaisonnables: {
        'tres': 'Très raisonnables',
        'moyennement': 'Moyennement raisonnables',
        'peu': 'Peu raisonnables',
        'pas': 'Pas raisonnables'
      },
      difficultes: {
        'yes': 'Oui',
        'no': 'Non'
      },
      futursProjets: {
        'oui': 'Oui',
        'peut-etre': 'Peut-être',
        'non': 'Non'
      }
    }
    
    if (mappings[key] && mappings[key][valueStr.toLowerCase()]) {
      return mappings[key][valueStr.toLowerCase()]
    }
    
    return valueStr
  }

  const getEvaluationLabel = (key: string): string => {
    const labels: Record<string, string> = {
      note: 'Note globale',
      notePourquoi: 'Pourquoi cette note',
      transparence: 'Transparence',
      rapidite: 'Rapidité',
      recommander: 'Recommanderiez-vous nos services',
      ecoute: 'Écoute',
      prixRaisonnables: 'Prix raisonnables',
      difficultes: 'Difficultés rencontrées',
      futursProjets: 'Futurs projets',
      attentes: 'Attentes',
      ameliorations: 'Améliorations suggérées'
    }
    return labels[key] || key
  }

  const getResponseLabel = (key: string): string => {
    const labels: Record<string, string> = {
      isClient: 'Est client',
      gestionCity: 'Ville de gestion',
      gestionOpinion: 'Opinion sur la gestion',
      ecoute: 'Écoute',
      courtois: 'Courtoisie',
      prixRaisonnables: 'Prix raisonnables',
      difficultes: 'Difficultés',
      futursProjets: 'Futurs projets',
      attentes: 'Attentes',
      ameliorations: 'Améliorations',
      interlocuteurNote: 'Note de l\'interlocuteur',
      commentairesFinaux: 'Commentaires finaux'
    }
    return labels[key] || key
  }

  const handleExportToExcel = () => {
    if (filteredSatisfactionSurveys.length === 0) {
      toast.error("Aucune donnée à exporter")
      return
    }
    
    setIsExporting(true)
    const toastId = toast.loading("Exportation en cours...")
    
    try {
      const dataToExport = filteredSatisfactionSurveys.map((survey, index) => {
        const evaluation = survey.evaluation || {}
        const responses = survey.responses || {}
        
        return {
          '#': index + 1,
          'Nom': survey.nom || '',
          'Prénom': survey.prenom || '',
          'Nom complet': `${survey.prenom || ''} ${survey.nom || ''}`.trim(),
          'Email': survey.email || '',
          'Téléphone': survey.telephone ? `${survey.indicatif || ''} ${survey.telephone}`.trim() : '',
          'Sexe': survey.sexe || '',
          'Pays': survey.pays || '',
          'Statut': survey.isClient === 'yes' ? 'Client' : 'Non-client',
          'Souhaite devenir client': survey.wantsToBecomeClient === 'yes' ? 'Oui' : survey.wantsToBecomeClient === 'no' ? 'Non' : '',
          'Services souhaités': survey.services ? survey.services.join(', ') : '',
          'Autre service': survey.autreService || '',
          'Localisation': survey.location || '',
          'Autre localisation': survey.autreLocation || '',
          'Projet': survey.projet || '',
          'Opinion': survey.opinion || '',
          'Comment nous avez-vous connu': survey.howKnown || '',
          'Autre (comment connu)': survey.autreHowKnown || '',
          'Services utilisés': survey.clientServices ? survey.clientServices.join(', ') : '',
          'Interlocuteur': survey.interlocuteur || '',
          'Note interlocuteur': survey.noteInterlocuteur || '',
          'Note globale': evaluation.note || '',
          'Pourquoi cette note': evaluation.notePourquoi || '',
          'Transparence': formatEvaluationValue('transparence', evaluation.transparence),
          'Rapidité': formatEvaluationValue('rapidite', evaluation.rapidite),
          'Recommander': formatEvaluationValue('recommander', evaluation.recommander),
          'Écoute': formatEvaluationValue('ecoute', evaluation.ecoute),
          'Prix raisonnables': formatEvaluationValue('prixRaisonnables', evaluation.prixRaisonnables),
          'Difficultés': formatEvaluationValue('difficultes', evaluation.difficultes),
          'Futurs projets': formatEvaluationValue('futursProjets', evaluation.futursProjets),
          'Attentes': evaluation.attentes || '',
          'Améliorations': evaluation.ameliorations || '',
          'Ville de gestion': responses.gestionCity || '',
          'Opinion gestion': responses.gestionOpinion || '',
          'Commentaires finaux': responses.commentairesFinaux || '',
          'Commentaires': survey.commentaires || '',
          'Date de création': survey.createdAt ? new Date(survey.createdAt).toLocaleString('fr-FR') : ''
        }
      })

      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Sondages Satisfaction")
      
      // Ajuster la largeur des colonnes
      if (dataToExport.length > 0) {
        const colWidths = Object.keys(dataToExport[0]).map(key => ({ wch: 20 }))
        ws['!cols'] = colWidths
      }

      const fileName = `sondages-satisfaction-${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      toast.success("Exportation Excel réussie", { id: toastId })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast.error("Erreur lors de l'exportation Excel", { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportToPDF = () => {
    if (filteredSatisfactionSurveys.length === 0) {
      toast.error("Aucune donnée à exporter")
      return
    }
    
    setIsExporting(true)
    const toastId = toast.loading("Exportation en cours...")
    
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4')
      const pageHeight = doc.internal.pageSize.height
      const pageWidth = doc.internal.pageSize.width
      const margin = 14
      const maxWidth = pageWidth - (margin * 2)
      
      // Fonction helper pour vérifier et ajouter une nouvelle page si nécessaire
      const checkPageBreak = (currentY: number, requiredSpace: number = 10): number => {
        if (currentY + requiredSpace > pageHeight - margin) {
          doc.addPage()
          return margin
        }
        return currentY
      }
      
      // Fonction helper pour ajouter du texte avec gestion de débordement
      const addText = (text: string, x: number, y: number, fontSize: number = 10, textMaxWidth: number = maxWidth): number => {
        doc.setFontSize(fontSize)
        const lines = doc.splitTextToSize(text, textMaxWidth)
        let currentY = checkPageBreak(y, lines.length * (fontSize * 0.4 + 2))
        
        doc.text(lines, x, currentY)
        return currentY + (lines.length * (fontSize * 0.4 + 2))
      }
      
      // Page 1: Tableau récapitulatif
      let yPos = margin
      
      // Titre
      doc.setFontSize(18)
      doc.text('Sondages de Satisfaction', margin, yPos)
      yPos += 8
      
      doc.setFontSize(10)
      doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`, margin, yPos)
      yPos += 10
      
      // Préparer les données pour le tableau
      const tableData = filteredSatisfactionSurveys.map((survey, index) => [
        String(index + 1),
        `${survey.prenom || ''} ${survey.nom || ''}`.trim() || '-',
        survey.email || '-',
        survey.telephone ? `${survey.indicatif || ''} ${survey.telephone}`.trim() : '-',
        survey.isClient === 'yes' ? 'Client' : 'Non-client',
        survey.createdAt ? new Date(survey.createdAt).toLocaleDateString('fr-FR') : '-'
      ])

      // Créer le tableau
      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Nom complet', 'Email', 'Téléphone', 'Statut', 'Date']],
        body: tableData,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 50 },
          2: { cellWidth: 60 },
          3: { cellWidth: 50 },
          4: { cellWidth: 30 },
          5: { cellWidth: 40 }
        }
      })

      // Récupérer la position Y finale après le tableau
      const finalY = (doc as any).lastAutoTable.finalY || yPos + 50
      
      // Ajouter les détails pour chaque sondage sur des pages séparées
      filteredSatisfactionSurveys.forEach((survey, index) => {
        // Nouvelle page pour chaque sondage détaillé
        doc.addPage()
        yPos = margin
        
        // Titre de la page
        doc.setFontSize(16)
        doc.setFont(undefined, 'bold')
        doc.text(`Sondage #${index + 1}`, margin, yPos)
        yPos += 10
        
        // Informations personnelles
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text('Informations personnelles', margin, yPos)
        yPos += 8
        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        
        yPos = addText(`Nom: ${survey.prenom || ''} ${survey.nom || ''}`, margin, yPos, 10)
        yPos = addText(`Email: ${survey.email || '-'}`, margin, yPos, 10)
        yPos = addText(`Téléphone: ${survey.telephone ? `${survey.indicatif || ''} ${survey.telephone}` : '-'}`, margin, yPos, 10)
        yPos = addText(`Statut: ${survey.isClient === 'yes' ? 'Client' : 'Non-client'}`, margin, yPos, 10)
        yPos += 5
        
        // Informations pour non-clients
        if (survey.isClient === 'no') {
          yPos = checkPageBreak(yPos, 15)
          doc.setFontSize(12)
          doc.setFont(undefined, 'bold')
          doc.text('Informations pour non-clients', margin, yPos)
          yPos += 8
          doc.setFontSize(10)
          doc.setFont(undefined, 'normal')
          
          if (survey.wantsToBecomeClient) {
            yPos = addText(`Souhaite devenir client: ${survey.wantsToBecomeClient === 'yes' ? 'Oui' : 'Non'}`, margin, yPos, 10)
          }
          if (survey.services && survey.services.length > 0) {
            yPos = addText(`Services souhaités: ${survey.services.join(', ')}`, margin, yPos, 10)
          }
          if (survey.location) {
            yPos = addText(`Localisation: ${survey.location}`, margin, yPos, 10)
          }
          if (survey.projet) {
            yPos = addText(`Projet: ${survey.projet}`, margin, yPos, 10)
          }
          if (survey.opinion) {
            yPos = addText(`Opinion: ${survey.opinion}`, margin, yPos, 10)
          }
          yPos += 5
        }
        
        // Informations pour clients
        if (survey.isClient === 'yes') {
          yPos = checkPageBreak(yPos, 15)
          doc.setFontSize(12)
          doc.setFont(undefined, 'bold')
          doc.text('Informations pour clients', margin, yPos)
          yPos += 8
          doc.setFontSize(10)
          doc.setFont(undefined, 'normal')
          
          if (survey.howKnown) {
            yPos = addText(`Comment nous avez-vous connu: ${survey.howKnown}`, margin, yPos, 10)
          }
          if (survey.clientServices && survey.clientServices.length > 0) {
            yPos = addText(`Services utilisés: ${survey.clientServices.join(', ')}`, margin, yPos, 10)
          }
          if (survey.interlocuteur) {
            yPos = addText(`Interlocuteur: ${survey.interlocuteur}`, margin, yPos, 10)
          }
          if (survey.noteInterlocuteur) {
            yPos = addText(`Note interlocuteur: ${survey.noteInterlocuteur}/10`, margin, yPos, 10)
          }
          yPos += 5
        }
        
        // Évaluation
        if (survey.evaluation && Object.keys(survey.evaluation).length > 0) {
          yPos = checkPageBreak(yPos, 15)
          doc.setFontSize(12)
          doc.setFont(undefined, 'bold')
          doc.text('Évaluation', margin, yPos)
          yPos += 8
          doc.setFontSize(10)
          doc.setFont(undefined, 'normal')
          
          Object.entries(survey.evaluation).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '' && typeof value !== 'object') {
              const label = getEvaluationLabel(key)
              const formattedValue = formatEvaluationValue(key, value)
              const text = `${label}: ${formattedValue}`
              yPos = addText(text, margin, yPos, 10)
            }
          })
          yPos += 5
        }
        
        // Réponses détaillées
        if (survey.responses && Object.keys(survey.responses).length > 0) {
          yPos = checkPageBreak(yPos, 15)
          doc.setFontSize(12)
          doc.setFont(undefined, 'bold')
          doc.text('Réponses détaillées', margin, yPos)
          yPos += 8
          doc.setFontSize(10)
          doc.setFont(undefined, 'normal')
          
          Object.entries(survey.responses).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '' && typeof value !== 'object' && key !== 'isClient') {
              const label = getResponseLabel(key)
              const formattedValue = formatEvaluationValue(key, value)
              const text = `${label}: ${formattedValue}`
              yPos = addText(text, margin, yPos, 10)
            }
          })
          yPos += 5
        }
        
        // Commentaires
        if (survey.commentaires) {
          yPos = checkPageBreak(yPos, 15)
          doc.setFontSize(12)
          doc.setFont(undefined, 'bold')
          doc.text('Commentaires', margin, yPos)
          yPos += 8
          doc.setFontSize(10)
          doc.setFont(undefined, 'normal')
          
          yPos = addText(survey.commentaires, margin, yPos, 10)
        }
      })

      const fileName = `sondages-satisfaction-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      toast.success("Exportation PDF réussie", { id: toastId })
    } catch (error) {
      console.error("Error exporting to PDF:", error)
      toast.error("Erreur lors de l'exportation PDF", { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  // Fetch SIC data (clients, prospects, users)
  const fetchSICData = async () => {
    setIsLoadingSIC(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null
    if (!token) {
      toast.error("Token d'authentification manquant")
      setIsLoadingSIC(false)
      return
    }

    // Fetch clients
    setIsLoadingClients(true)
    try {
      const clientsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients?page=1&limit=10000`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const clientsData = Array.isArray(clientsResponse.data) 
        ? clientsResponse.data 
        : (clientsResponse.data.clients || [])
      setSicClients(clientsData.filter((c: any) => c.statut === "active"))
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast.error("Erreur lors du chargement des clients")
    } finally {
      setIsLoadingClients(false)
    }

    // Fetch prospects
    setIsLoadingProspects(true)
    try {
      const prospectsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects?page=1&limit=10000`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const prospectsData = Array.isArray(prospectsResponse.data)
        ? prospectsResponse.data
        : (prospectsResponse.data.prospects || prospectsResponse.data.data || [])
      setSicProspects(prospectsData.filter((p: any) => p.status === "prospect" || p.statut === "active"))
    } catch (error) {
      console.error("Error fetching prospects:", error)
      toast.error("Erreur lors du chargement des prospects")
    } finally {
      setIsLoadingProspects(false)
    }

    // Fetch users
    setIsLoadingUsers(true)
    try {
      const usersResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users?module=parametres`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSicUsers(Array.isArray(usersResponse.data) ? usersResponse.data : [])
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Erreur lors du chargement des utilisateurs")
    } finally {
      setIsLoadingUsers(false)
      setIsLoadingSIC(false)
    }
  }

  // Filter SIC data based on search
  const filteredSICClients = sicClients.filter(client => {
    if (!sicSearchQuery) return true
    const q = normalizeForSearch(sicSearchQuery)
    return (
      normalizeForSearch(client.nom || '').includes(q) ||
      normalizeForSearch(client.prenom || '').includes(q) ||
      normalizeForSearch(client.code || '').includes(q) ||
      normalizeForSearch(client.email || '').includes(q) ||
      normalizeForSearch(client.telephone || '').includes(q)
    )
  })

  const filteredSICProspects = sicProspects.filter((prospect: any) => {
    if (!sicSearchQuery) return true
    const q = normalizeForSearch(sicSearchQuery)
    return (
      normalizeForSearch(prospect.nom || '').includes(q) ||
      normalizeForSearch(prospect.prenom || '').includes(q) ||
      normalizeForSearch(prospect.email || '').includes(q) ||
      normalizeForSearch(prospect.telephone || '').includes(q)
    )
  })

  // Separate normal users from manual/imported guests
  const normalUsers = sicUsers.filter((user: any) => !user.isManual && !user.isImported)
  const manualGuests = sicUsers.filter((user: any) => user.isManual || user.isImported)

  const filteredSICUsers = normalUsers.filter((user: any) => {
    if (!sicSearchQuery) return true
    const q = normalizeForSearch(sicSearchQuery)
    return (
      normalizeForSearch(user.nom || '').includes(q) ||
      normalizeForSearch(user.prenom || '').includes(q) ||
      normalizeForSearch(user.email || '').includes(q)
    )
  })

  const filteredManualGuests = manualGuests.filter((guest: any) => {
    if (!sicSearchQuery) return true
    const q = normalizeForSearch(sicSearchQuery)
    return (
      normalizeForSearch(guest.nom || '').includes(q) ||
      normalizeForSearch(guest.prenom || '').includes(q) ||
      normalizeForSearch(guest.email || '').includes(q)
    )
  })

  // Handle select all for clients
  const handleSelectAllClients = (checked: boolean) => {
    setSelectAllClients(checked)
    if (checked) {
      setSelectedClients(filteredSICClients.map(c => c._id))
    } else {
      setSelectedClients([])
    }
  }

  // Handle select all for prospects
  const handleSelectAllProspects = (checked: boolean) => {
    setSelectAllProspects(checked)
    if (checked) {
      setSelectedProspects(filteredSICProspects.map((p: any) => p._id))
    } else {
      setSelectedProspects([])
    }
  }

  // Handle select all for users
  const handleSelectAllUsers = (checked: boolean) => {
    setSelectAllUsers(checked)
    if (checked) {
      setSelectedUsers(filteredSICUsers.map((u: any) => u._id))
    } else {
      setSelectedUsers(selectedUsers.filter(id => !filteredSICUsers.some((u: any) => u._id === id)))
    }
  }

  // Handle select all for manual guests
  const handleSelectAllManualGuests = (checked: boolean) => {
    setSelectAllManualGuests(checked)
    if (checked) {
      setSelectedManualGuests(filteredManualGuests.map((g: any) => g._id))
    } else {
      setSelectedManualGuests([])
    }
  }

  // Handle individual client selection
  const handleClientToggle = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClients([...selectedClients, clientId])
    } else {
      setSelectedClients(selectedClients.filter(id => id !== clientId))
      setSelectAllClients(false)
    }
  }

  // Handle individual prospect selection
  const handleProspectToggle = (prospectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProspects([...selectedProspects, prospectId])
    } else {
      setSelectedProspects(selectedProspects.filter(id => id !== prospectId))
      setSelectAllProspects(false)
    }
  }

  // Handle individual user selection
  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
      setSelectAllUsers(false)
    }
  }

  // Handle individual manual guest selection
  const handleManualGuestToggle = (guestId: string, checked: boolean) => {
    if (checked) {
      setSelectedManualGuests([...selectedManualGuests, guestId])
    } else {
      setSelectedManualGuests(selectedManualGuests.filter(id => id !== guestId))
      setSelectAllManualGuests(false)
    }
  }

  // Handle adding manual guest
  const handleAddManualGuest = () => {
    // Validate required fields
    if (!manualGuestForm.nom || !manualGuestForm.prenom || !manualGuestForm.email) {
      toast.error("Veuillez remplir au moins le nom, prénom et email")
      return
    }

    // Generate a temporary ID for the manual guest
    const manualGuestId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create the manual guest object
    const manualGuest = {
      _id: manualGuestId,
      nom: manualGuestForm.nom,
      postnom: manualGuestForm.postnom || "",
      prenom: manualGuestForm.prenom,
      sexe: manualGuestForm.sexe || "",
      email: manualGuestForm.email,
      indicatif: manualGuestForm.indicatif || "+243",
      telephone: manualGuestForm.telephone || "",
      isManual: true // Flag to identify manual guests
    }

    // Add to users list
    setSicUsers([...sicUsers, manualGuest])
    
    // Automatically select the new guest
    setSelectedManualGuests([...selectedManualGuests, manualGuestId])
    
    // Reset form
    setManualGuestForm({
      sexe: "",
      nom: "",
      postnom: "",
      prenom: "",
      email: "",
      indicatif: "+243",
      telephone: ""
    })
    
    // Close dialog
    setIsAddGuestDialogOpen(false)
    
    toast.success("Invité ajouté avec succès")
  }

  // Handle Excel file import
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validExtensions = ['.xlsx', '.xls']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validExtensions.includes(fileExtension)) {
      toast.error("Veuillez sélectionner un fichier Excel (.xlsx ou .xls)")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        if (jsonData.length < 2) {
          toast.error("Le fichier Excel doit contenir au moins une ligne d'en-tête et une ligne de données")
          return
        }

        // Get headers (first row)
        const headers = jsonData[0].map((h: any) => String(h || '').toLowerCase().trim())
        
        // Expected columns (case-insensitive, with variations)
        const expectedColumns = {
          'numero': ['#', 'numero', 'numéro', 'no', 'n°'],
          'nom': ['nom'],
          'postnom': ['postnom'],
          'prenom': ['prenom', 'prénom'],
          'sexe': ['sexe'],
          'email': ['email'],
          'indicatif': ['indicatif'],
          'telephone': ['telephone', 'téléphone', 'tel']
        }
        
        // Find column indices
        const columnMap: Record<string, number> = {}
        Object.entries(expectedColumns).forEach(([key, variations]) => {
          for (const variation of variations) {
            const index = headers.findIndex(h => h === variation || h.includes(variation))
            if (index !== -1) {
              columnMap[key] = index
              break
            }
          }
        })

        // Validate required columns
        if (columnMap['nom'] === undefined || columnMap['prenom'] === undefined || columnMap['email'] === undefined) {
          toast.error("Le fichier Excel doit contenir les colonnes : nom, prenom, email")
          return
        }

        // Parse data rows
        const parsedUsers: any[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const nom = String(row[columnMap['nom']] || '').trim()
          const prenom = String(row[columnMap['prenom']] || '').trim()
          const email = String(row[columnMap['email']] || '').trim()

          // Skip empty rows
          if (!nom && !prenom && !email) continue

          // Validate required fields
          if (!nom || !prenom || !email) {
            console.warn(`Ligne ${i + 1} ignorée : nom, prénom et email sont requis`)
            continue
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) {
            console.warn(`Ligne ${i + 1} ignorée : email invalide (${email})`)
            continue
          }

          const user = {
            nom,
            postnom: columnMap['postnom'] !== undefined ? String(row[columnMap['postnom']] || '').trim() : '',
            prenom,
            sexe: columnMap['sexe'] !== undefined ? String(row[columnMap['sexe']] || '').trim().toUpperCase() : '',
            email,
            indicatif: columnMap['indicatif'] !== undefined ? String(row[columnMap['indicatif']] || '').trim() : '+243',
            telephone: columnMap['telephone'] !== undefined ? String(row[columnMap['telephone']] || '').trim() : ''
          }

          // Validate sexe (M or F)
          if (user.sexe && user.sexe !== 'M' && user.sexe !== 'F') {
            user.sexe = ''
          }

          // Ensure indicatif starts with +
          if (user.indicatif && !user.indicatif.startsWith('+')) {
            user.indicatif = '+' + user.indicatif
          }

          parsedUsers.push(user)
        }

        if (parsedUsers.length === 0) {
          toast.error("Aucun utilisateur valide trouvé dans le fichier Excel")
          return
        }

        // Show preview dialog
        setImportedUsers(parsedUsers)
        setIsImportDialogOpen(true)
      } catch (error) {
        console.error("Error reading Excel file:", error)
        toast.error("Erreur lors de la lecture du fichier Excel")
      }
    }

    reader.readAsArrayBuffer(file)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Confirm and import users
  const handleConfirmImport = () => {
    if (importedUsers.length === 0) {
      toast.error("Aucun utilisateur à importer")
      return
    }

    setIsImporting(true)
    
    try {
      const newUsers = importedUsers.map((user, index) => {
        const userId = `import_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`
        return {
          _id: userId,
          nom: user.nom,
          postnom: user.postnom || '',
          prenom: user.prenom,
          sexe: user.sexe || '',
          email: user.email,
          indicatif: user.indicatif || '+243',
          telephone: user.telephone || '',
          isManual: true,
          isImported: true
        }
      })

      // Add to users list
      setSicUsers([...sicUsers, ...newUsers])
      
      // Automatically select all imported users
      const newUserIds = newUsers.map(u => u._id)
      setSelectedManualGuests([...selectedManualGuests, ...newUserIds])
      
      // Close dialog and reset
      setIsImportDialogOpen(false)
      setImportedUsers([])
      
      toast.success(`${newUsers.length} utilisateur(s) importé(s) avec succès`)
    } catch (error) {
      console.error("Error importing users:", error)
      toast.error("Erreur lors de l'importation des utilisateurs")
    } finally {
      setIsImporting(false)
    }
  }

  // Update select all states when individual selections change
  useEffect(() => {
    if (filteredSICClients.length > 0) {
      setSelectAllClients(selectedClients.length === filteredSICClients.length && filteredSICClients.every(c => selectedClients.includes(c._id)))
    }
  }, [selectedClients, filteredSICClients])

  useEffect(() => {
    if (filteredSICProspects.length > 0) {
      setSelectAllProspects(selectedProspects.length === filteredSICProspects.length && filteredSICProspects.every((p: any) => selectedProspects.includes(p._id)))
    }
  }, [selectedProspects, filteredSICProspects])

  useEffect(() => {
    if (filteredSICUsers.length > 0) {
      setSelectAllUsers(selectedUsers.length === filteredSICUsers.length && filteredSICUsers.every((u: any) => selectedUsers.includes(u._id)))
    }
  }, [selectedUsers, filteredSICUsers])

  useEffect(() => {
    if (filteredManualGuests.length > 0) {
      setSelectAllManualGuests(selectedManualGuests.length === filteredManualGuests.length && filteredManualGuests.every((g: any) => selectedManualGuests.includes(g._id)))
    }
  }, [selectedManualGuests, filteredManualGuests])

  // Function to start SSE listener for SIC invitations
  const startSICSSEListener = (sessionId: string): Promise<EventSource> => {
    return new Promise((resolve, reject) => {
      // Check if EventSource is available (client-side only)
      if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
        console.error('[SSE SIC] EventSource is not available')
        reject(new Error('EventSource is not available'))
        return
      }

      const token = localStorage.getItem("authToken")
      if (!token) {
        console.error('[SSE SIC] No auth token found')
        reject(new Error('No auth token'))
        return
      }
      
      console.log('[SSE SIC] Starting listener for session:', sessionId)
      const eventSource = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/generate-sic-invitation/stream/${sessionId}?token=${encodeURIComponent(token)}`
      )
      
      eventSource.onopen = () => {
        console.log('[SSE SIC] Connection opened for session:', sessionId)
      }
      
      // Wait for the 'connected' message to confirm the connection is ready
      const connectionHandler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'connected') {
            console.log('[SSE SIC] Connection confirmed for session:', sessionId)
            eventSource.removeEventListener('message', connectionHandler)
            resolve(eventSource)
          }
        } catch (error) {
          // Ignore parsing errors for other messages
        }
      }
      
      eventSource.addEventListener('message', connectionHandler)
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (eventSource.readyState !== EventSource.OPEN) {
          console.warn('[SSE SIC] Connection timeout for session:', sessionId)
          eventSource.removeEventListener('message', connectionHandler)
          reject(new Error('SSE connection timeout'))
        }
      }, 5000)
      
      eventSource.onerror = (error) => {
        console.error('[SSE SIC] Connection error for session:', sessionId, error)
        eventSource.removeEventListener('message', connectionHandler)
        reject(error)
      }

      // Set up the main message handler for status updates
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[SSE SIC] Received update:', data)
          
          if (data.type === 'connected') {
            return // Already handled
          }
          
          // Update recipient status based on SSE data
          setSicRecipientsStatus(prev => {
            const updated = [...prev]
            const recipientIndex = updated.findIndex(r => r.recipientId === data.userId)
            
            if (recipientIndex >= 0) {
              // Update existing recipient
              if (data.type === 'email_sent' || data.type === 'email_failed' || data.type === 'email_skipped') {
                updated[recipientIndex] = {
                  ...updated[recipientIndex],
                  emailStatus: data.emailStatus,
                  emailError: data.emailError
                }
              } else if (data.type === 'whatsapp_sent' || data.type === 'whatsapp_failed' || data.type === 'whatsapp_skipped') {
                updated[recipientIndex] = {
                  ...updated[recipientIndex],
                  whatsappStatus: data.whatsappStatus,
                  whatsappError: data.whatsappError
                }
              } else if (data.type === 'recipient_complete') {
                updated[recipientIndex] = {
                  ...updated[recipientIndex],
                  status: data.status,
                  emailStatus: data.emailStatus,
                  whatsappStatus: data.whatsappStatus,
                  emailError: data.emailError,
                  whatsappError: data.whatsappError
                }
              }
            } else if (data.type === 'processing' || data.type === 'recipient_complete') {
              // Add new recipient
              updated.push({
                recipientId: data.userId,
                recipientType: data.recipientType || 'user',
                recipientInfo: data.recipientInfo,
                status: data.status || 'pending',
                emailStatus: data.emailStatus,
                whatsappStatus: data.whatsappStatus,
                emailError: data.emailError,
                whatsappError: data.whatsappError
              })
            }
            
            return updated
          })
          
          // Handle completion
          if (data.type === 'completed') {
            console.log('[SSE SIC] All invitations completed')
            if (sicEventSourceRef.current) {
              sicEventSourceRef.current.close()
              sicEventSourceRef.current = null
            }
          }
        } catch (error) {
          console.error('[SSE SIC] Error parsing SSE message:', error)
        }
      }
      
      sicEventSourceRef.current = eventSource
    })
  }

  // Handle sending SIC invitations
  const handleSendSICInvitations = async () => {
    const totalSelected = selectedClients.length + selectedProspects.length + selectedUsers.length + selectedManualGuests.length
    
    if (totalSelected === 0) {
      toast.error("Veuillez sélectionner au moins un destinataire")
      return
    }
    
    setShowSICConfirmDialog(true)
  }

  // Confirm and send SIC invitations
  const confirmSendSICInvitations = async () => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      toast.error("Cette fonctionnalité n'est disponible que côté client")
      return
    }

    setShowSICConfirmDialog(false)
    setIsSendingInvitations(true)
    
    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        toast.error("Token d'authentification manquant")
        setIsSendingInvitations(false)
        return
      }

      // Prepare recipients list
      const recipients: any[] = []
      
      // Add selected clients
      selectedClients.forEach(clientId => {
        const client = sicClients.find(c => c._id === clientId)
        if (client) {
          recipients.push({
            _id: client._id,
            nom: client.nom,
            prenom: client.prenom,
            postnom: client.postnom || '',
            sexe: client.sexe || '',
            email: client.email,
            telephone: client.telephone,
            indicatif: client.indicatif,
            recipientType: 'client'
          })
        }
      })
      
      // Add selected prospects
      selectedProspects.forEach(prospectId => {
        const prospect = sicProspects.find((p: any) => p._id === prospectId)
        if (prospect) {
          recipients.push({
            _id: prospect._id,
            nom: prospect.nom,
            prenom: prospect.prenom,
            postnom: prospect.postnom || '',
            sexe: prospect.sexe || '',
            email: prospect.email,
            telephone: prospect.telephone,
            indicatif: prospect.indicatif,
            recipientType: 'prospect'
          })
        }
      })
      
      // Add selected users
      selectedUsers.forEach(userId => {
        const user = sicUsers.find((u: any) => u._id === userId)
        if (user) {
          recipients.push({
            _id: user._id,
            nom: user.nom,
            prenom: user.prenom,
            postnom: user.postnom || '',
            sexe: user.sexe || '',
            email: user.email,
            telephone: user.telephone || '',
            indicatif: user.indicatif || '+243',
            recipientType: 'user'
          })
        }
      })

      // Add selected manual guests
      selectedManualGuests.forEach(guestId => {
        const guest = sicUsers.find((u: any) => u._id === guestId)
        if (guest) {
          recipients.push({
            _id: guest._id,
            nom: guest.nom,
            prenom: guest.prenom,
            postnom: guest.postnom || '',
            sexe: guest.sexe || '',
            email: guest.email,
            telephone: guest.telephone || '',
            indicatif: guest.indicatif || '+243',
            recipientType: 'user'
          })
        }
      })

      // Prepare initial recipients status
      const initialRecipients = recipients.map(recipient => ({
        recipientId: recipient._id,
        recipientType: recipient.recipientType,
        recipientInfo: {
          nom: recipient.nom,
          prenom: recipient.prenom,
          email: recipient.email,
          telephone: recipient.telephone
        },
        status: 'pending' as const,
        emailStatus: (recipient.email && sicSendByEmail) ? 'pending' as const : undefined,
        whatsappStatus: (recipient.telephone && recipient.indicatif && sicSendByWhatsApp) ? 'pending' as const : undefined
      }))

      setSicRecipientsStatus(initialRecipients)
      setShowSICProgressModal(true)

      // Generate session ID for SSE
      const sessionId = `sic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSicSendingSessionId(sessionId)
      
      // Start SSE listener and wait for connection to be established (only if EventSource is available)
      if (typeof EventSource !== 'undefined') {
        try {
          await startSICSSEListener(sessionId)
          console.log('[SSE SIC] Connection established, proceeding with send request')
        } catch (error) {
          console.error('[SSE SIC] Failed to establish connection:', error)
          toast.error("Impossible d'établir la connexion de suivi. L'envoi continuera en arrière-plan.")
        }
      } else {
        console.warn('[SSE SIC] EventSource not available, skipping SSE connection')
      }

      // Send invitations
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/generate-sic-invitation`,
        {
          users: recipients,
          sessionId: sessionId,
          mailIsChecked: sicSendByEmail,
          whatsappIsChecked: sicSendByWhatsApp
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.status === 202) {
        toast.success("Envoi des invitations en cours...")
      } else {
        toast.success("Invitations envoyées avec succès")
      }
    } catch (error: any) {
      console.error("Error sending SIC invitations:", error)
      const errorMessage = error.response?.data?.message || error.message || "Erreur inconnue"
      toast.error("Erreur lors de l'envoi des invitations: " + errorMessage)
    } finally {
      setIsSendingInvitations(false)
    }
  }

  const filteredSondages = (sondages || []).filter(sondage => {
    const matchesSearch =
      !searchQuery ||
      normalizeForSearch(sondage.code).includes(normalizeForSearch(searchQuery)) ||
      normalizeForSearch(sondage.title).includes(normalizeForSearch(searchQuery))
    
    const matchesStatus = statusFilter === "all" || sondage.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Actif</Badge>
      case "inactive":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Inactif</Badge>
      case "deleted":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Supprimé</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{status}</Badge>
    }
  }

  if (!isMounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Diffusions</h1>
          <p className="text-gray-600 dark:text-gray-400">Gérez vos diffusions et collectez les retours</p>
        </div>
        {activeTab === "sondages" && (
          <Button onClick={() => router.push('/dashboard/sondages/new-sondage')} className="bg-blue-600 hover:bg-blue-700">
            <Icons.plus className="h-4 w-4 mr-2" />
            Nouvelle diffusion
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] bg-gray-50/50 dark:bg-gray-800/50 p-1 rounded-xl">
          <TabsTrigger value="sondages" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
            <Icons.clipboardList className="h-4 w-4" />
            <span>Sondages</span>
          </TabsTrigger>
          <TabsTrigger value="satisfaction" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
            <Icons.checkCircle className="h-4 w-4" />
            <span>Sondage Satisfaction</span>
          </TabsTrigger>
        </TabsList>

        {/* Sondages Tab */}
        <TabsContent value="sondages" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher par code ou titre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="deleted">Supprimé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sondages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sondages ({filteredSondages.length})</CardTitle>
          <CardDescription>
            Liste de tous les sondages avec leurs détails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé par</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredSondages.map((sondage, index) => (
                  <motion.tr
                    key={sondage._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleViewSondage(sondage)}
                  >
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{sondage.code}</TableCell>
                    <TableCell className="font-medium">{sondage.title}</TableCell>
                    <TableCell>{getStatusBadge(sondage.status)}</TableCell>
                    <TableCell>
                      {sondage.createdBy.nom} {sondage.createdBy.prenom}
                    </TableCell>
                    <TableCell>
                      {new Date(sondage.dateCreated).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <Icons.moreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            handleViewSondage(sondage)
                          }}>
                            <Icons.eye className="h-4 w-4 mr-2" />
                            Voir plus
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            handleEditClick(sondage)
                          }}>
                            <Icons.edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchiveClick(sondage)
                            }}
                            className="text-orange-600 dark:text-orange-400"
                          >
                            <Icons.archive className="h-4 w-4 mr-2" />
                            Archiver
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
          
          {filteredSondages.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucun sondage trouvé
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Satisfaction Surveys Tab */}
        <TabsContent value="satisfaction" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher par nom, email ou téléphone..."
                    value={satisfactionSearchQuery}
                    onChange={(e) => setSatisfactionSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Satisfaction Surveys Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sondages de Satisfaction ({filteredSatisfactionSurveys.length})</CardTitle>
                  <CardDescription>
                    Liste de tous les sondages de satisfaction
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportToExcel}
                    disabled={isExporting || filteredSatisfactionSurveys.length === 0}
                    className="flex items-center gap-2"
                  >
                    {isExporting ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.download className="h-4 w-4" />
                    )}
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportToPDF}
                    disabled={isExporting || filteredSatisfactionSurveys.length === 0}
                    className="flex items-center gap-2"
                  >
                    {isExporting ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.download className="h-4 w-4" />
                    )}
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSatisfaction ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredSatisfactionSurveys.map((survey, index) => (
                          <motion.tr
                            key={survey._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => handleViewSatisfactionSurvey(survey)}
                          >
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {survey.prenom} {survey.nom}
                            </TableCell>
                            <TableCell>{survey.email || '-'}</TableCell>
                            <TableCell>
                              {survey.indicatif && survey.telephone 
                                ? `${survey.indicatif} ${survey.telephone}`
                                : survey.telephone || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={survey.isClient === 'yes' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}>
                                {survey.isClient === 'yes' ? 'Client' : 'Non-client'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {survey.createdAt 
                                ? new Date(survey.createdAt).toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewSatisfactionSurvey(survey)
                                }}
                              >
                                <Icons.eye className="h-4 w-4 mr-2" />
                                Voir
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                  
                  {filteredSatisfactionSurveys.length === 0 && !isLoadingSatisfaction && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Aucun sondage de satisfaction trouvé
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Sondage Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau Sondage</DialogTitle>
            <DialogDescription>
              Créez un nouveau sondage pour collecter les retours
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={newSondage.title}
                onChange={(e) => setNewSondage({ ...newSondage, title: e.target.value })}
                placeholder="Titre du sondage"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={newSondage.message}
                onChange={(e) => setNewSondage({ ...newSondage, message: e.target.value })}
                placeholder="Message du sondage"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateSondage} disabled={!newSondage.title || !newSondage.message}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sondage Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Sondage</DialogTitle>
            <DialogDescription>
              Modifiez les informations du sondage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Titre</Label>
              <Input
                id="edit-title"
                value={newSondage.title}
                onChange={(e) => setNewSondage({ ...newSondage, title: e.target.value })}
                placeholder="Titre du sondage"
              />
            </div>
            <div>
              <Label htmlFor="edit-message">Message</Label>
              <Textarea
                id="edit-message"
                value={newSondage.message}
                onChange={(e) => setNewSondage({ ...newSondage, message: e.target.value })}
                placeholder="Message du sondage"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditSondage} disabled={!newSondage.title || !newSondage.message}>
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Sondage Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver le Sondage</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir archiver ce sondage ? Cette action peut être annulée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleArchiveSondage} className="bg-orange-600 hover:bg-orange-700">
              Archiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Satisfaction Survey Detail Dialog */}
      <Dialog open={isSatisfactionDetailOpen} onOpenChange={setIsSatisfactionDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du Sondage de Satisfaction</DialogTitle>
            <DialogDescription>
              Informations complètes du sondage
            </DialogDescription>
          </DialogHeader>
          {selectedSatisfactionSurvey && (
            <div className="space-y-6">
              {/* Informations personnelles */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icons.user className="h-5 w-5" />
                  Informations personnelles
                </h3>
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 p-6 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Nom complet</Label>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedSatisfactionSurvey.prenom} {selectedSatisfactionSurvey.nom}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Sexe</Label>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{selectedSatisfactionSurvey.sexe || '-'}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Email</Label>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-all">{selectedSatisfactionSurvey.email || '-'}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Téléphone</Label>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {selectedSatisfactionSurvey.indicatif && selectedSatisfactionSurvey.telephone 
                          ? `${selectedSatisfactionSurvey.indicatif} ${selectedSatisfactionSurvey.telephone}`
                          : selectedSatisfactionSurvey.telephone || '-'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Pays</Label>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{selectedSatisfactionSurvey.pays || '-'}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Statut</Label>
                      <Badge className={selectedSatisfactionSurvey.isClient === 'yes' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700' : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'}>
                        {selectedSatisfactionSurvey.isClient === 'yes' ? 'Client' : 'Non-client'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations pour non-clients */}
              {selectedSatisfactionSurvey.isClient === 'no' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Icons.userPlus className="h-5 w-5" />
                    Informations pour non-clients
                  </h3>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-100 dark:border-amber-800 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                        <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Souhaite devenir client</Label>
                        <Badge className={selectedSatisfactionSurvey.wantsToBecomeClient === 'yes' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700' : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'}>
                          {selectedSatisfactionSurvey.wantsToBecomeClient === 'yes' ? 'Oui' : 'Non'}
                        </Badge>
                      </div>
                      {selectedSatisfactionSurvey.wantsToBecomeClient === 'yes' && (
                        <>
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                            <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Services souhaités</Label>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {selectedSatisfactionSurvey.services && selectedSatisfactionSurvey.services.length > 0
                                ? selectedSatisfactionSurvey.services.join(', ')
                                : '-'}
                            </p>
                          </div>
                          {selectedSatisfactionSurvey.autreService && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Autre service</Label>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{selectedSatisfactionSurvey.autreService}</p>
                            </div>
                          )}
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                            <Label className="text-sm text-gray-600 mb-1 block">Localisation</Label>
                            <p className="font-medium text-gray-900">{selectedSatisfactionSurvey.location || '-'}</p>
                          </div>
                          {selectedSatisfactionSurvey.autreLocation && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Autre localisation</Label>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{selectedSatisfactionSurvey.autreLocation}</p>
                            </div>
                          )}
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                            <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Projet</Label>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{selectedSatisfactionSurvey.projet || '-'}</p>
                          </div>
                        </>
                      )}
                      {selectedSatisfactionSurvey.opinion && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-700 md:col-span-2">
                          <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Opinion</Label>
                          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{selectedSatisfactionSurvey.opinion}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Informations pour clients */}
              {selectedSatisfactionSurvey.isClient === 'yes' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Icons.users className="h-5 w-5" />
                    Informations pour clients
                  </h3>
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-800 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700">
                        <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Comment nous avez-vous connu</Label>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{selectedSatisfactionSurvey.howKnown || '-'}</p>
                      </div>
                      {selectedSatisfactionSurvey.autreHowKnown && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700">
                          <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Autre</Label>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{selectedSatisfactionSurvey.autreHowKnown}</p>
                        </div>
                      )}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700">
                        <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Services utilisés</Label>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedSatisfactionSurvey.clientServices && selectedSatisfactionSurvey.clientServices.length > 0
                            ? selectedSatisfactionSurvey.clientServices.join(', ')
                            : '-'}
                        </p>
                      </div>
                      {selectedSatisfactionSurvey.interlocuteur && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700">
                          <Label className="text-sm text-gray-600 mb-1 block">Interlocuteur</Label>
                          <p className="font-medium text-gray-900">{selectedSatisfactionSurvey.interlocuteur}</p>
                        </div>
                      )}
                      {selectedSatisfactionSurvey.noteInterlocuteur && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700">
                          <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Note interlocuteur</Label>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${
                              selectedSatisfactionSurvey.noteInterlocuteur >= 8 ? 'text-green-600 dark:text-green-400' : 
                              selectedSatisfactionSurvey.noteInterlocuteur >= 6 ? 'text-yellow-600 dark:text-yellow-400' : 
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {selectedSatisfactionSurvey.noteInterlocuteur}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">/10</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Évaluation */}
              {selectedSatisfactionSurvey.evaluation && Object.keys(selectedSatisfactionSurvey.evaluation).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Icons.barChart className="h-5 w-5" />
                    Évaluation
                  </h3>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedSatisfactionSurvey.evaluation).map(([key, value]) => {
                        if (value === null || value === undefined || value === '' || typeof value === 'object') return null
                        
                        const formattedValue = formatEvaluationValue(key, value)
                        const label = getEvaluationLabel(key)
                        
                        // Affichage spécial pour la note
                        if (key === 'note') {
                          const noteNum = parseInt(String(value))
                          const noteColor = noteNum >= 8 ? 'text-green-600 dark:text-green-400' : noteNum >= 6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                          return (
                            <div key={key} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">{label}</Label>
                              <div className="flex items-center gap-2">
                                <span className={`text-3xl font-bold ${noteColor}`}>{String(value)}</span>
                                <span className="text-gray-400 dark:text-gray-500">/10</span>
                              </div>
                            </div>
                          )
                        }
                        
                        return (
                          <div key={key} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                            <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">{label}</Label>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{formattedValue}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Réponses détaillées */}
              {selectedSatisfactionSurvey.responses && Object.keys(selectedSatisfactionSurvey.responses).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Icons.fileText className="h-5 w-5" />
                    Réponses détaillées
                  </h3>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-100 dark:border-purple-800 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedSatisfactionSurvey.responses).map(([key, value]) => {
                        if (value === null || value === undefined || value === '' || typeof value === 'object') return null
                        
                        // Ignorer les champs déjà affichés ailleurs
                        if (key === 'isClient') return null
                        
                        const formattedValue = formatEvaluationValue(key, value)
                        const label = getResponseLabel(key)
                        
                        // Affichage spécial pour les notes
                        if (key === 'interlocuteurNote') {
                          const noteNum = parseInt(String(value))
                          const noteColor = noteNum >= 8 ? 'text-green-600 dark:text-green-400' : noteNum >= 6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                          return (
                            <div key={key} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">{label}</Label>
                              <div className="flex items-center gap-2">
                                <span className={`text-3xl font-bold ${noteColor}`}>{String(value)}</span>
                                <span className="text-gray-400 dark:text-gray-500">/10</span>
                              </div>
                            </div>
                          )
                        }
                        
                        // Affichage spécial pour les commentaires
                        if (key === 'commentairesFinaux' || key === 'attentes' || key === 'ameliorations') {
                          return (
                            <div key={key} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700 md:col-span-2">
                              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">{label}</Label>
                              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{formattedValue}</p>
                            </div>
                          )
                        }
                        
                        return (
                          <div key={key} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                            <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">{label}</Label>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{formattedValue}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Commentaires */}
              {selectedSatisfactionSurvey.commentaires && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Icons.messageSquare className="h-5 w-5" />
                    Commentaires supplémentaires
                  </h3>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-100 dark:border-green-800 p-6 rounded-lg">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                        {selectedSatisfactionSurvey.commentaires}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date */}
              <div>
                <Label className="text-sm text-gray-500 dark:text-gray-400">Date de création</Label>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedSatisfactionSurvey.createdAt 
                    ? new Date(selectedSatisfactionSurvey.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSatisfactionDetailOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SIC Invitation Confirmation Dialog */}
      <Dialog open={showSICConfirmDialog} onOpenChange={setShowSICConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'envoi des invitations SIC</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d'envoyer des invitations SIC aux destinataires sélectionnés.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Résumé de l'envoi :</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {selectedClients.length} client(s)</li>
                <li>• {selectedProspects.length} prospect(s)</li>
                <li>• {selectedUsers.length} utilisateur(s)</li>
                <li className="font-semibold mt-2">Total : {selectedClients.length + selectedProspects.length + selectedUsers.length} destinataire(s)</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              Les invitations seront envoyées selon les options sélectionnées (Email et/ou WhatsApp) à chaque destinataire.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSICConfirmDialog(false)}>
              Annuler
            </Button>
            <Button onClick={confirmSendSICInvitations} className="bg-blue-600 hover:bg-blue-700">
              Confirmer l'envoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SIC Invitation Progress Modal */}
      <SICInvitationProgressModal
        isOpen={showSICProgressModal}
        onClose={() => {
          setShowSICProgressModal(false)
          if (sicEventSourceRef.current) {
            sicEventSourceRef.current.close()
            sicEventSourceRef.current = null
          }
          // Reset selections after closing
          setSelectedClients([])
          setSelectedProspects([])
          setSelectedUsers([])
          setSelectedManualGuests([])
          setSelectAllClients(false)
          setSelectAllProspects(false)
          setSelectAllUsers(false)
          setSelectAllManualGuests(false)
        }}
        recipients={sicRecipientsStatus}
        onStatusUpdate={setSicRecipientsStatus}
      />

      {/* Import Excel Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Prévisualisation de l'import Excel
            </DialogTitle>
            <DialogDescription>
              {importedUsers.length} utilisateur(s) trouvé(s) dans le fichier. Vérifiez les données avant de confirmer l'importation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <ScrollArea className="h-[400px] border rounded-md p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Postnom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Sexe</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Indicatif</TableHead>
                    <TableHead>Téléphone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedUsers.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{user.nom || '-'}</TableCell>
                      <TableCell>{user.postnom || '-'}</TableCell>
                      <TableCell>{user.prenom || '-'}</TableCell>
                      <TableCell>{user.sexe || '-'}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{user.indicatif || '+243'}</TableCell>
                      <TableCell>{user.telephone || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note :</strong> Les utilisateurs importés seront automatiquement ajoutés à la liste et sélectionnés pour l'invitation.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsImportDialogOpen(false)
                setImportedUsers([])
              }}
              disabled={isImporting}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmImport} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isImporting || importedUsers.length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importation...
                </>
              ) : (
                `Importer ${importedUsers.length} utilisateur(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual Guest Dialog */}
      <Dialog open={isAddGuestDialogOpen} onOpenChange={setIsAddGuestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un Invité</DialogTitle>
            <DialogDescription>
              Ajoutez manuellement un invité à la liste des utilisateurs à inviter
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sexe">Dénomination *</Label>
                <Select
                  value={manualGuestForm.sexe}
                  onValueChange={(value) => setManualGuestForm({ ...manualGuestForm, sexe: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={manualGuestForm.nom}
                  onChange={(e) => setManualGuestForm({ ...manualGuestForm, nom: e.target.value })}
                  placeholder="Nom"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postnom">Postnom</Label>
                <Input
                  id="postnom"
                  value={manualGuestForm.postnom}
                  onChange={(e) => setManualGuestForm({ ...manualGuestForm, postnom: e.target.value })}
                  placeholder="Postnom"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={manualGuestForm.prenom}
                  onChange={(e) => setManualGuestForm({ ...manualGuestForm, prenom: e.target.value })}
                  placeholder="Prénom"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={manualGuestForm.email}
                onChange={(e) => setManualGuestForm({ ...manualGuestForm, email: e.target.value })}
                placeholder="email@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="indicatif">Indicatif</Label>
                <CountryIndicativeSelect
                  value={manualGuestForm.indicatif}
                  onValueChange={(value) => setManualGuestForm({ ...manualGuestForm, indicatif: value })}
                  defaultValue="+243"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={manualGuestForm.telephone}
                  onChange={(e) => setManualGuestForm({ ...manualGuestForm, telephone: e.target.value })}
                  placeholder="Numéro de téléphone"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddGuestDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddManualGuest} className="bg-blue-600 hover:bg-blue-700">
              Ajouter l'invité
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
