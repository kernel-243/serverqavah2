"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Icons } from "@/components/icons"
import { motion } from "framer-motion"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Search, Users, UserPlus, Mail, MessageSquare, Calendar, Clock, MapPin, DollarSign, CheckCircle, XCircle, Upload, X, Plus, Trash2 } from "lucide-react"
import ProgressModal from "./ProgressModal"
import SondageProgressModal from "./SondageProgressModal"
import { CountryIndicativeSelect } from "@/components/country-indicative-select"
import { normalizeForSearch } from "@/lib/normalizeForSearch"

interface SondageText {
  _id: string
  code: string
  title: string
  message: string
}

interface DiffusionTemplate {
  filename: string
  name: string
}

interface Client {
  _id: string
  code: string
  nom: string
  prenom: string
  email: string
  indicatif: string
  telephone: string
  type: "client" | "prospect"
  /** Ville du client */
  ville?: string | null
  /** Pays du client */
  pays?: string | null
  /** Cités liées aux terrains des contrats du client */
  cites?: { _id: string; nom: string }[]
  /** Statuts de contrats associés (en_attente, en_cours, termine, ...) */
  contractStatuses?: string[]
  /** Statuts des terrains liés aux contrats (Disponible, Réservé, En cours, Vendu, ...) */
  terrainStatuses?: string[]
  /** Indique si le client a au moins un contrat */
  hasContracts?: boolean
  /** Terrains associés (optionnel, pour compatibilité avec l'affichage existant) */
  terrains?: {
    _id: string
    numero: string
    statut: string
  }[]
  /** Prospect: pays de résidence */
  paysResidence?: string | null
  /** Prospect: ville souhaitée */
  villeSouhaitee?: string | null
  /** Prospect: catégorie */
  categorie?: string | null
}

interface CiteOption {
  _id: string
  nom: string
  code?: string
  ville?: string
}

export interface OtherRecipient {
  _id: string
  nom: string
  prenom: string
  postnom?: string
  sexe?: "M" | "F"
  email: string
  telephone: string
  indicatif: string
}

interface SondageFormData {
  sondageTextId: string
  diffusionTemplate: string
  diffusionSubject: string
  selectedClients: string[]
  selectedProspects: string[]
  dateEnvoi: string
  heureEnvoi: string
  priorite: "normal" | "urgent" | "faible"
  messagePersonnalise: string
  envoyerParMail: boolean
  envoyerParWhatsapp: boolean
}

export default function NewSondagePage() {
  const router = useRouter()
  const [sondageTexts, setSondageTexts] = useState<SondageText[]>([])
  const [diffusionTemplates, setDiffusionTemplates] = useState<DiffusionTemplate[]>([])
  const [selectionMode, setSelectionMode] = useState<"text" | "template">("text")
  const [clients, setClients] = useState<Client[]>([])
  const [prospects, setProspects] = useState<Client[]>([])
  const [villes, setVilles] = useState<string[]>([])
  const [cites, setCites] = useState<CiteOption[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [isLoadingProspects, setIsLoadingProspects] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [bulkId, setBulkId] = useState<string | null>(null)
  const [totalRecipientsForProgress, setTotalRecipientsForProgress] = useState(0)
  
  // Detailed progress modal state
  const [showDetailedProgressModal, setShowDetailedProgressModal] = useState(false)
  const [recipientsStatus, setRecipientsStatus] = useState<any[]>([])
  const [sendingSessionId, setSendingSessionId] = useState<string | null>(null)
  
  // Get current date and time
  const getCurrentDateTime = () => {
    const now = new Date()
    const date = now.toISOString().split('T')[0] // YYYY-MM-DD
    const time = now.toTimeString().slice(0, 5) // HH:MM
    return { date, time }
  }

  const { date: currentDate, time: currentTime } = getCurrentDateTime()

  const [formData, setFormData] = useState<SondageFormData>({
    sondageTextId: "",
    diffusionTemplate: "",
    diffusionSubject: "",
    selectedClients: [],
    selectedProspects: [],
    dateEnvoi: currentDate,
    heureEnvoi: currentTime,
    priorite: "normal",
    messagePersonnalise: "",
    envoyerParMail: true,
    envoyerParWhatsapp: true
  })

  const [filters, setFilters] = useState({
    searchQuery: "",
    typeFilter: "all", // all, client, prospect
    clientContractFilter: "all" as
      | "all"
      | "with_contract"
      | "without_contract"
      | "contrat_en_cours"
      | "contrat_termine"
      | "contrat_en_attente"
      | "terrain_reserve",
    villeFilter: "" as string,
    citeFilter: "" as string,
    clientPaysFilter: "" as string,
    prospectPaysFilter: "" as string,
    prospectVilleFilter: "" as string,
    prospectCategorieFilter: "" as string,
  })

  // Autres destinataires (ni client ni prospect)
  const [otherRecipients, setOtherRecipients] = useState<OtherRecipient[]>([])
  const [showAddOtherDialog, setShowAddOtherDialog] = useState(false)
  const [otherRecipientForm, setOtherRecipientForm] = useState({
    nom: "",
    prenom: "",
    postnom: "",
    sexe: "" as "" | "M" | "F",
    email: "",
    telephone: "",
    indicatif: "+243"
  })

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (!token) {
      toast.error("Token d'authentification manquant")
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        // 1) Load sondage texts + clients first (page is already visible)
        const [newSondageData, diffusionTemplatesRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sondages/new`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sondages/diffusion-templates`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: { data: [] } }))
        ])
        if (cancelled) return
        setSondageTexts(newSondageData.data.sondageTexts || [])
        setDiffusionTemplates(diffusionTemplatesRes.data.data || [])
        setClients(newSondageData.data.clients || [])
        setVilles(newSondageData.data.villes || [])
        setCites(newSondageData.data.cites || [])
        setIsLoadingClients(false)

        // 2) Then load prospects
        try {
          let prospectsResponse
          try {
            prospectsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects?page=1&limit=10000&status=prospect`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          } catch {
            prospectsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects?page=1&limit=10000`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          }
          if (cancelled) return
          let prospectsData: any[] = []
          if (prospectsResponse.data) {
            if (Array.isArray(prospectsResponse.data)) prospectsData = prospectsResponse.data
            else if (Array.isArray(prospectsResponse.data.prospects)) prospectsData = prospectsResponse.data.prospects
            else if (Array.isArray(prospectsResponse.data.data)) prospectsData = prospectsResponse.data.data
          }
          const filtered = prospectsData.filter((p: any) => p.status === "prospect" || p.type === "prospect")
          setProspects(filtered)
        } catch (prospectError) {
          if (cancelled) return
          console.error("Error fetching prospects:", prospectError)
          const fallbackProspects = newSondageData.data.prospects || []
          setProspects(Array.isArray(fallbackProspects) ? fallbackProspects : [])
        } finally {
          if (!cancelled) setIsLoadingProspects(false)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching data:", error)
          toast.error("Erreur lors du chargement des données")
          setIsLoadingClients(false)
          setIsLoadingProspects(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const handleClientSelection = (clientId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedClients: checked 
        ? [...prev.selectedClients, clientId]
        : prev.selectedClients.filter(id => id !== clientId)
    }))
  }

  const handleProspectSelection = (prospectId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedProspects: checked 
        ? [...prev.selectedProspects, prospectId]
        : prev.selectedProspects.filter(id => id !== prospectId)
    }))
  }

  const handleSelectAllClients = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedClients: checked ? filteredClients.map(c => c._id) : []
    }))
  }

  const handleSelectAllProspects = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedProspects: checked ? filteredProspects.map(p => p._id) : []
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...newFiles])
    }
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file: File) => {
    const fileType = file.type
    if (fileType.startsWith('image/')) {
      return <Icons.file className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    }
    return <Icons.file className="h-4 w-4 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const filteredClients = clients.filter(client => {
    const q = normalizeForSearch(filters.searchQuery)
    const matchesSearch =
      !q ||
      normalizeForSearch(client.nom || '').includes(q) ||
      normalizeForSearch(client.prenom || '').includes(q) ||
      normalizeForSearch(client.code || '').includes(q)

    const contractStatuses = client.contractStatuses || []
    const terrainStatuses = client.terrainStatuses || []

    let matchesContractFilter = true
    switch (filters.clientContractFilter) {
      case "with_contract":
        matchesContractFilter = contractStatuses.length > 0 || client.hasContracts === true
        break
      case "without_contract":
        matchesContractFilter = (contractStatuses.length === 0 && client.hasContracts !== true)
        break
      case "contrat_en_cours":
        matchesContractFilter = contractStatuses.includes("en_cours")
        break
      case "contrat_termine":
        matchesContractFilter = contractStatuses.includes("termine")
        break
      case "contrat_en_attente":
        matchesContractFilter = contractStatuses.includes("en_attente")
        break
      case "terrain_reserve":
        matchesContractFilter = terrainStatuses.includes("Réservé")
        break
      case "all":
      default:
        matchesContractFilter = true
        break
    }

    const matchesVille = !filters.villeFilter || (client.ville || "") === filters.villeFilter
    const matchesCite = !filters.citeFilter || (client.cites || []).some((c) => c._id === filters.citeFilter)
    const matchesPays = !filters.clientPaysFilter || (client.pays || "") === filters.clientPaysFilter

    return matchesSearch && matchesContractFilter && matchesVille && matchesCite && matchesPays
  })

  const filteredProspects = prospects.filter(prospect => {
    const q = normalizeForSearch(filters.searchQuery)
    const matchesSearch = !q ||
      normalizeForSearch(prospect.nom || '').includes(q) ||
      normalizeForSearch(prospect.prenom || '').includes(q) ||
      normalizeForSearch(prospect.code || '').includes(q)

    const matchesPays = !filters.prospectPaysFilter ||
      (prospect.paysResidence || "") === filters.prospectPaysFilter
    const matchesVilleSouhaitee = !filters.prospectVilleFilter ||
      (prospect.villeSouhaitee || "") === filters.prospectVilleFilter
    const matchesCategorie = !filters.prospectCategorieFilter ||
      (prospect.categorie || "Normal") === filters.prospectCategorieFilter

    return matchesSearch && matchesPays && matchesVilleSouhaitee && matchesCategorie
  })

  const uniqueClientPays = Array.from(new Set(clients.map(c => c.pays).filter(Boolean))) as string[]
  const uniqueProspectPays = Array.from(new Set(prospects.map(p => p.paysResidence).filter(Boolean))) as string[]
  const uniqueProspectVilles = Array.from(new Set(prospects.map(p => p.villeSouhaitee).filter(Boolean))) as string[]

  const selectedSondageText = sondageTexts.find(st => st._id === formData.sondageTextId)
  const totalSelected = formData.selectedClients.length + formData.selectedProspects.length + otherRecipients.length

  const handleAddOtherRecipient = () => {
    if (!otherRecipientForm.nom?.trim() || !otherRecipientForm.prenom?.trim() || !otherRecipientForm.email?.trim()) {
      toast.error("Veuillez remplir au moins le nom, le prénom et l'email")
      return
    }
    const id = `other_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    setOtherRecipients(prev => [...prev, {
      _id: id,
      nom: otherRecipientForm.nom.trim(),
      prenom: otherRecipientForm.prenom.trim(),
      postnom: otherRecipientForm.postnom?.trim() || undefined,
      sexe: otherRecipientForm.sexe || undefined,
      email: otherRecipientForm.email.trim(),
      telephone: otherRecipientForm.telephone?.trim() || "",
      indicatif: otherRecipientForm.indicatif || "+243"
    }])
    setOtherRecipientForm({ nom: "", prenom: "", postnom: "", sexe: "", email: "", telephone: "", indicatif: "+243" })
    setShowAddOtherDialog(false)
    toast.success("Destinataire ajouté")
  }

  const handleRemoveOtherRecipient = (id: string) => {
    setOtherRecipients(prev => prev.filter(r => r._id !== id))
  }

  // Function to start SSE listener for real-time updates
  // Returns a promise that resolves when the connection is established
  const startSSEListener = (sessionId: string): Promise<EventSource> => {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem("authToken")
      if (!token) {
        console.error('[SSE] No auth token found')
        reject(new Error('No auth token'))
        return
      }
      
      console.log('[SSE] Starting listener for session:', sessionId)
      const eventSource = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/sondages/send/stream/${sessionId}?token=${encodeURIComponent(token)}`
      )
      
      eventSource.onopen = () => {
        console.log('[SSE] Connection opened for session:', sessionId)
      }
      
      // Wait for the 'connected' message to confirm the connection is ready
      const connectionHandler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'connected') {
            console.log('[SSE] Connection confirmed for session:', sessionId)
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
          console.warn('[SSE] Connection timeout for session:', sessionId)
          eventSource.removeEventListener('message', connectionHandler)
          reject(new Error('SSE connection timeout'))
        }
      }, 5000)
      
      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error for session:', sessionId, error)
        eventSource.removeEventListener('message', connectionHandler)
        reject(error)
      }

      // Set up the main message handler for status updates
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[SSE] Message received:', data) // Debug log
          
          if (data.type === 'connected') {
            console.log('[SSE] Connected:', data.sessionId)
            return
          }

        // Update recipient status based on SSE event
        if (data.type === 'whatsapp_sent' || data.type === 'whatsapp_failed' || 
            data.type === 'email_sent' || data.type === 'email_failed') {
          setRecipientsStatus((prev) => {
            return prev.map((recipient) => {
              if (recipient.recipientId === data.recipientId && 
                  recipient.recipientType === data.recipientType) {
                const updated = { ...recipient }
                
                if (data.type === 'whatsapp_sent') {
                  updated.whatsappStatus = 'sent'
                  // Update global status: sent if at least one method succeeded
                  if (updated.emailStatus === 'sent') {
                    updated.status = 'sent'
                  } else if (updated.emailStatus === 'failed' && !updated.emailStatus) {
                    updated.status = 'sent' // Only whatsapp, but it succeeded
                  } else if (!updated.emailStatus) {
                    updated.status = 'sent' // Only whatsapp enabled
                  } else {
                    updated.status = 'pending' // Email still pending
                  }
                } else if (data.type === 'whatsapp_failed') {
                  updated.whatsappStatus = 'failed'
                  updated.whatsappError = data.error
                  // Update global status: failed only if both failed, sent if email succeeded
                  if (updated.emailStatus === 'sent') {
                    updated.status = 'sent'
                  } else if (updated.emailStatus === 'failed') {
                    updated.status = 'failed'
                  } else if (!updated.emailStatus) {
                    updated.status = 'failed' // Only whatsapp enabled and it failed
                  } else {
                    updated.status = 'pending' // Email still pending
                  }
                } else if (data.type === 'email_sent') {
                  updated.emailStatus = 'sent'
                  console.log('[SSE] Email sent for recipient:', data.recipientId, 'WhatsApp status:', updated.whatsappStatus)
                  // Update global status: sent if at least one method succeeded
                  if (!updated.whatsappStatus) {
                    // Only email enabled, so if email succeeded, status is sent
                    updated.status = 'sent'
                  } else if (updated.whatsappStatus === 'sent') {
                    // Both succeeded
                    updated.status = 'sent'
                  } else if (updated.whatsappStatus === 'pending') {
                    // WhatsApp still pending, keep as pending
                    updated.status = 'pending'
                  } else {
                    // WhatsApp failed, but email succeeded, so status is sent
                    updated.status = 'sent'
                  }
                  console.log('[SSE] Updated recipient status to:', updated.status)
                } else if (data.type === 'email_failed') {
                  updated.emailStatus = 'failed'
                  updated.emailError = data.error
                  console.log('[SSE] Email failed for recipient:', data.recipientId, 'Current status:', updated.status)
                  // Update global status: failed only if both failed, sent if whatsapp succeeded
                  if (updated.whatsappStatus === 'sent') {
                    updated.status = 'sent'
                  } else if (updated.whatsappStatus === 'failed') {
                    updated.status = 'failed'
                  } else if (!updated.whatsappStatus) {
                    // Only email enabled and it failed
                    updated.status = 'failed'
                  } else {
                    // WhatsApp still pending
                    updated.status = 'pending'
                  }
                }
                
                return updated
              }
              return recipient
            })
          })
        }

        if (data.type === 'completed') {
          eventSource.close()
          toast.dismiss()
          toast.success(`Envoi terminé: ${data.successfulSends} réussis, ${data.failedSends} échecs`)
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      // Don't close on error, might be temporary network issue
    }
    })
  }
  
  // Cleanup SSE listener on unmount
  useEffect(() => {
    return () => {
      // Cleanup will be handled by individual eventSource.close() calls
    }
  }, [])

  const handleBulkProcessing = (data: any) => {
    // Close submit dialog and loading toast
    setShowSubmitDialog(false)
    setIsSubmitting(false)
    
    // Show info message
    toast.success(
      `Envoi en cours vers ${data.totalRecipients} destinataires. Suivi de la progression en cours...`,
      { duration: 3000 }
    )
    
    // Open progress modal
    setBulkId(data.bulkId)
    setTotalRecipientsForProgress(data.totalRecipients)
    setShowProgressModal(true)
  }

  const handleProgressModalClose = () => {
    setShowProgressModal(false)
    setBulkId(null)
    
    // Reset form and redirect
    setSelectedFiles([])
    router.push("/dashboard/sondages")
  }

  const handleSubmit = async () => {
    if (!formData.sondageTextId && !formData.diffusionTemplate) {
      toast.error("Veuillez sélectionner un texte ou un template de diffusion")
      return
    }

    if (totalSelected === 0) {
      toast.error("Veuillez sélectionner au moins un destinataire (client, prospect ou autre)")
      return
    }

    // Ensure at least one delivery method is selected
    if (!formData.envoyerParMail && !formData.envoyerParWhatsapp) {
      toast.error("Veuillez sélectionner au moins une méthode d'envoi (Email ou WhatsApp)")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading("Envoi du sondage en cours...")
    try {
      const token = localStorage.getItem("authToken")
      
      // Get selected clients and prospects with their contact info
      const selectedClientsData = clients.filter(c => formData.selectedClients.includes(c._id))
      const selectedProspectsData = prospects.filter(p => formData.selectedProspects.includes(p._id))
      
      // Get the sondage text (null if using diffusion template)
      const sondageText = formData.sondageTextId ? sondageTexts.find(st => st._id === formData.sondageTextId) : null
      if (formData.sondageTextId && !sondageText) {
        toast.error("Texte de sondage introuvable", { id: toastId })
        setIsSubmitting(false)
        return
      }

      // Prepare initial recipients list with pending status (clients + prospects + autres)
      const initialRecipients = [
        ...selectedClientsData.map(client => ({
          recipientId: client._id,
          recipientType: 'client' as const,
          recipientInfo: {
            nom: client.nom,
            prenom: client.prenom,
            email: client.email,
            telephone: client.telephone
          },
          status: 'pending' as const,
          emailStatus: formData.envoyerParMail && client.email ? 'pending' as const : undefined,
          whatsappStatus: formData.envoyerParWhatsapp && client.telephone ? 'pending' as const : undefined
        })),
        ...selectedProspectsData.map(prospect => ({
          recipientId: prospect._id,
          recipientType: 'prospect' as const,
          recipientInfo: {
            nom: prospect.nom,
            prenom: prospect.prenom,
            email: prospect.email,
            telephone: prospect.telephone
          },
          status: 'pending' as const,
          emailStatus: formData.envoyerParMail && prospect.email ? 'pending' as const : undefined,
          whatsappStatus: formData.envoyerParWhatsapp && prospect.telephone ? 'pending' as const : undefined
        })),
        ...otherRecipients.map(other => ({
          recipientId: other._id,
          recipientType: 'other' as const,
          recipientInfo: {
            nom: other.nom,
            prenom: other.prenom,
            email: other.email,
            telephone: other.telephone
          },
          status: 'pending' as const,
          emailStatus: formData.envoyerParMail && other.email ? 'pending' as const : undefined,
          whatsappStatus: formData.envoyerParWhatsapp && other.telephone && other.indicatif ? 'pending' as const : undefined
        }))
      ]

      // Set initial recipients and open detailed modal
      setRecipientsStatus(initialRecipients)
      setShowDetailedProgressModal(true)

      // Generate session ID for SSE BEFORE sending the request
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Start SSE listener and wait for connection to be established
      try {
        await startSSEListener(sessionId)
        console.log('[SSE] Connection established, proceeding with send request')
      } catch (error) {
        console.error('[SSE] Failed to establish connection:', error)
        toast.error("Impossible d'établir la connexion de suivi. L'envoi continuera en arrière-plan.")
      }

      // Create FormData if files are present, otherwise use JSON
      if (selectedFiles.length > 0) {
        const formDataToSend = new FormData()
        if (formData.sondageTextId) formDataToSend.append('sondageTextId', formData.sondageTextId)
        if (formData.diffusionTemplate) formDataToSend.append('diffusionTemplate', formData.diffusionTemplate)
        if (formData.diffusionSubject) formDataToSend.append('diffusionSubject', formData.diffusionSubject)
        formDataToSend.append('clients', JSON.stringify(formData.selectedClients))
        formDataToSend.append('prospects', JSON.stringify(formData.selectedProspects))
        formDataToSend.append('otherRecipients', JSON.stringify(otherRecipients))
        formDataToSend.append('dateEnvoi', formData.dateEnvoi)
        formDataToSend.append('heureEnvoi', formData.heureEnvoi)
        formDataToSend.append('priorite', formData.priorite)
        formDataToSend.append('messagePersonnalise', formData.messagePersonnalise)
        formDataToSend.append('envoyerParMail', formData.envoyerParMail.toString())
        formDataToSend.append('envoyerParWhatsapp', formData.envoyerParWhatsapp.toString())
        formDataToSend.append('sessionId', sessionId)
        
        selectedFiles.forEach((file) => {
          formDataToSend.append('files', file)
        })

        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sondages/send`, formDataToSend, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
        
        // Check if this is a bulk processing response (status 202)
        if (response.status === 202 && response.data.bulkId) {
          handleBulkProcessing(response.data)
          return
        }
        
        // Store sessionId from response if provided
        if (response.data.sessionId) {
          setSendingSessionId(response.data.sessionId)
        }
      } else {
        const payload: Record<string, any> = {
          ...(formData.sondageTextId ? { sondageTextId: formData.sondageTextId } : {}),
          ...(formData.diffusionTemplate ? { diffusionTemplate: formData.diffusionTemplate } : {}),
          ...(formData.diffusionSubject ? { diffusionSubject: formData.diffusionSubject } : {}),
          clients: formData.selectedClients,
          prospects: formData.selectedProspects,
          otherRecipients: otherRecipients.map(({ _id, nom, prenom, postnom, sexe, email, telephone, indicatif }) => ({
            _id,
            nom,
            prenom,
            postnom: postnom || "",
            sexe: sexe || undefined,
            email,
            telephone,
            indicatif
          })),
          dateEnvoi: formData.dateEnvoi,
          heureEnvoi: formData.heureEnvoi,
          priorite: formData.priorite,
          messagePersonnalise: formData.messagePersonnalise,
          envoyerParMail: formData.envoyerParMail,
          envoyerParWhatsapp: formData.envoyerParWhatsapp
        }

        // Generate session ID for SSE BEFORE sending the request
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Start SSE listener and wait for connection to be established
        try {
          await startSSEListener(sessionId)
          console.log('[SSE] Connection established, proceeding with send request')
        } catch (error) {
          console.error('[SSE] Failed to establish connection:', error)
          toast.error("Impossible d'établir la connexion de suivi. L'envoi continuera en arrière-plan.")
        }
        
        const payloadWithSession = { ...payload, sessionId }

        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sondages/send`, payloadWithSession, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        // Check if this is a bulk processing response (status 202)
        if (response.status === 202 && response.data.bulkId) {
          handleBulkProcessing(response.data)
          return
        }
        
        // Store sessionId from response if provided
        if (response.data.sessionId) {
          setSendingSessionId(response.data.sessionId)
        }
      }

      // Show success message with details (for immediate processing)
      const emailCount = formData.envoyerParMail 
        ? (selectedClientsData.filter(c => c.email).length + selectedProspectsData.filter(p => p.email).length + otherRecipients.filter(o => o.email).length)
        : 0
      const whatsappCount = formData.envoyerParWhatsapp
        ? (selectedClientsData.filter(c => c.telephone).length + selectedProspectsData.filter(p => p.telephone).length + otherRecipients.filter(o => o.telephone).length)
        : 0

      let successMessage = "Sondage envoyé avec succès"
      if (formData.envoyerParMail && formData.envoyerParWhatsapp) {
        successMessage = `Sondage envoyé par email et WhatsApp à ${totalSelected} destinataire(s)`
      } else if (formData.envoyerParMail) {
        successMessage = `Sondage envoyé par email à ${emailCount} destinataire(s)`
      } else if (formData.envoyerParWhatsapp) {
        successMessage = `Sondage envoyé par WhatsApp à ${whatsappCount} destinataire(s)`
      }

      // Don't redirect immediately - let the modal show the progress
      // The modal will handle the completion and allow user to close when ready
      toast.dismiss(toastId)
    } catch (error: any) {
      console.error("Error sending sondage:", error)
      const errorMessage = error.response?.data?.message || error.message || "Erreur inconnue"
      toast.error("Erreur lors de l'envoi du sondage: " + errorMessage, { id: toastId })
    } finally {
      setIsSubmitting(false)
      setShowSubmitDialog(false)
    }
  }

  const handleCancel = () => {
    router.push("/dashboard/sondages")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Nouveau Sondage</h1>
          <p className="text-gray-600 dark:text-gray-400">Créez et envoyez un nouveau sondage aux clients et prospects</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowCancelDialog(true)}
            className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button 
            onClick={() => setShowSubmitDialog(true)}
            disabled={(!formData.sondageTextId && !formData.diffusionTemplate) || totalSelected === 0 || (!formData.envoyerParMail && !formData.envoyerParWhatsapp)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Envoyer la diffusion
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sondage Text / Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Texte de diffusion ou template
              </CardTitle>
              <CardDescription>
                Sélectionnez un texte de diffusion ou un template HTML à envoyer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mode selector */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode("text")
                      setFormData(prev => ({ ...prev, diffusionTemplate: "" }))
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${selectionMode === "text" ? "bg-blue-600 text-white border-blue-600" : "bg-background border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                  >
                    Texte de diffusion
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode("template")
                      setFormData(prev => ({ ...prev, sondageTextId: "" }))
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${selectionMode === "template" ? "bg-blue-600 text-white border-blue-600" : "bg-background border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                  >
                    Template HTML
                  </button>
                </div>

                {selectionMode === "text" ? (
                  <div>
                    <Label htmlFor="sondage-text">Texte de diffusion</Label>
                    <Select value={formData.sondageTextId} onValueChange={(value) => setFormData(prev => ({ ...prev, sondageTextId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un texte de diffusion" />
                      </SelectTrigger>
                      <SelectContent>
                        {sondageTexts.map((text) => (
                          <SelectItem key={text._id} value={text._id}>
                            {text.code} - {text.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSondageText && (
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-3 border border-gray-200 dark:border-gray-700 mt-3">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{selectedSondageText.code}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSondageText.title}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">{selectedSondageText.message}</p>
                        </div>
                        {formData.messagePersonnalise && (
                          <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Message personnalisé :</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{formData.messagePersonnalise}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="diffusion-template">Template HTML</Label>
                    <Select value={formData.diffusionTemplate} onValueChange={(value) => setFormData(prev => ({ ...prev, diffusionTemplate: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un template de diffusion" />
                      </SelectTrigger>
                      <SelectContent>
                        {diffusionTemplates.map((tpl) => (
                          <SelectItem key={tpl.filename} value={tpl.filename}>
                            {tpl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.diffusionTemplate && (
                      <div className="space-y-3 mt-3">
                        <div>
                          <Label htmlFor="diffusion-subject">Sujet de l'email</Label>
                          <Input
                            id="diffusion-subject"
                            placeholder="Ex: Invitation — Masterclass Immobilier"
                            value={formData.diffusionSubject}
                            onChange={(e) => setFormData(prev => ({ ...prev, diffusionSubject: e.target.value }))}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Évitez les mots promotionnels (Master Class, Gratuit, Revenus...) pour ne pas atterrir dans l'onglet Promotions.
                          </p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Template : <span className="font-medium">{diffusionTemplates.find(t => t.filename === formData.diffusionTemplate)?.name}</span>
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Les variables <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{denomination}}"}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{prenom}}"}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{postnom}}"}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{nom}}"}</code> seront remplacées automatiquement.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client and Prospect Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                Destinataires
              </CardTitle>
              <CardDescription>
                Sélectionnez les clients et prospects qui recevront la diffusion
              </CardDescription>
            </CardHeader>
              <CardContent>
              {/* Filters */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-end gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px] max-w-md">
                      <Label htmlFor="search">Rechercher</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                        <Input
                          id="search"
                          placeholder="Rechercher par nom, prénom ou code..."
                          value={filters.searchQuery}
                          onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                          className="pl-10 bg-background dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-foreground"
                        />
                      </div>
                    </div>

                    <div className="w-full md:w-48 space-y-1">
                      <Label htmlFor="ville-filter">Ville</Label>
                      <Select
                        value={filters.villeFilter || "all"}
                        onValueChange={(v) => setFilters(prev => ({ ...prev, villeFilter: v === "all" ? "" : v }))}
                      >
                        <SelectTrigger
                          id="ville-filter"
                          className="bg-background dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-foreground"
                        >
                          <SelectValue placeholder="Toutes les villes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les villes</SelectItem>
                          {villes.map((ville) => (
                            <SelectItem key={ville} value={ville}>{ville}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-48 space-y-1">
                      <Label htmlFor="cite-filter">Cité</Label>
                      <Select
                        value={filters.citeFilter || "all"}
                        onValueChange={(v) => setFilters(prev => ({ ...prev, citeFilter: v === "all" ? "" : v }))}
                      >
                        <SelectTrigger
                          id="cite-filter"
                          className="bg-background dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-foreground"
                        >
                          <SelectValue placeholder="Toutes les cités" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les cités</SelectItem>
                          {cites.map((cite) => (
                            <SelectItem key={cite._id} value={cite._id}>{cite.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-80 space-y-1">
                      <Label htmlFor="client-contract-filter">Filtrer les clients par contrat</Label>
                      <Select
                        value={filters.clientContractFilter}
                        onValueChange={(value) =>
                          setFilters(prev => ({ ...prev, clientContractFilter: value as typeof filters.clientContractFilter }))
                        }
                      >
                        <SelectTrigger
                          id="client-contract-filter"
                          className="bg-background dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-foreground"
                        >
                          <SelectValue placeholder="Tous les clients" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les clients</SelectItem>
                          <SelectItem value="with_contract">Avec au moins un contrat</SelectItem>
                          <SelectItem value="without_contract">Sans contrat</SelectItem>
                          <SelectItem value="contrat_en_cours">Contrat en cours</SelectItem>
                          <SelectItem value="contrat_termine">Contrat terminé</SelectItem>
                          <SelectItem value="terrain_reserve">Terrain réservé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {uniqueClientPays.length > 0 && (
                      <div className="w-full md:w-48 space-y-1">
                        <Label htmlFor="client-pays-filter">Pays (clients)</Label>
                        <Select
                          value={filters.clientPaysFilter || "all"}
                          onValueChange={(v) => setFilters(prev => ({ ...prev, clientPaysFilter: v === "all" ? "" : v }))}
                        >
                          <SelectTrigger
                            id="client-pays-filter"
                            className="bg-background dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-foreground"
                          >
                            <SelectValue placeholder="Tous les pays" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les pays</SelectItem>
                            {uniqueClientPays.map((pays) => (
                              <SelectItem key={pays} value={pays}>{pays}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Prospect-specific filters */}
                  <div className="flex flex-col md:flex-row md:items-end gap-4 flex-wrap">
                    {uniqueProspectPays.length > 0 && (
                      <div className="w-full md:w-48 space-y-1">
                        <Label htmlFor="prospect-pays-filter">Pays (prospects)</Label>
                        <Select
                          value={filters.prospectPaysFilter || "all"}
                          onValueChange={(v) => setFilters(prev => ({ ...prev, prospectPaysFilter: v === "all" ? "" : v }))}
                        >
                          <SelectTrigger
                            id="prospect-pays-filter"
                            className="bg-background dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-foreground"
                          >
                            <SelectValue placeholder="Tous les pays" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les pays</SelectItem>
                            {uniqueProspectPays.map((pays) => (
                              <SelectItem key={pays} value={pays}>{pays}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {uniqueProspectVilles.length > 0 && (
                      <div className="w-full md:w-52 space-y-1">
                        <Label htmlFor="prospect-ville-filter">Ville souhaitée (prospects)</Label>
                        <Select
                          value={filters.prospectVilleFilter || "all"}
                          onValueChange={(v) => setFilters(prev => ({ ...prev, prospectVilleFilter: v === "all" ? "" : v }))}
                        >
                          <SelectTrigger
                            id="prospect-ville-filter"
                            className="bg-background dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-foreground"
                          >
                            <SelectValue placeholder="Toutes les villes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes les villes</SelectItem>
                            {uniqueProspectVilles.map((ville) => (
                              <SelectItem key={ville} value={ville}>{ville}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="w-full md:w-52 space-y-1">
                      <Label htmlFor="prospect-categorie-filter">Catégorie (prospects)</Label>
                      <Select
                        value={filters.prospectCategorieFilter || "all"}
                        onValueChange={(v) => setFilters(prev => ({ ...prev, prospectCategorieFilter: v === "all" ? "" : v }))}
                      >
                        <SelectTrigger
                          id="prospect-categorie-filter"
                          className="bg-background dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-foreground"
                        >
                          <SelectValue placeholder="Toutes les catégories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les catégories</SelectItem>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="1000 jeunes">1000 jeunes</SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>


              {/* Clients Section */}
              <div className="space-y-4 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium flex items-center gap-2 text-blue-900 dark:text-blue-300">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Clients ({filteredClients.length})
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-clients"
                      checked={formData.selectedClients.length === filteredClients.length && filteredClients.length > 0}
                      onCheckedChange={handleSelectAllClients}
                    />
                    <Label htmlFor="select-all-clients" className="text-sm text-blue-800 dark:text-blue-400">Tout sélectionner</Label>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2 border border-blue-100 dark:border-blue-900 rounded-lg bg-white/80 dark:bg-gray-800/80 p-4">
                  {isLoadingClients ? (
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center space-x-3 p-2 rounded animate-pulse">
                          <div className="h-4 w-4 rounded border bg-gray-200 dark:bg-gray-600" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-600" />
                            <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {filteredClients.map((client) => (
                        <div key={client._id} className="flex items-center space-x-3 p-2 hover:bg-blue-50 dark:bg-blue-950/80 rounded">
                          <Checkbox
                            id={`client-${client._id}`}
                            checked={formData.selectedClients.includes(client._id)}
                            onCheckedChange={(checked) => handleClientSelection(client._id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{client.nom} {client.prenom}</span>
                              <Badge variant="outline" className="text-xs">{client.code}</Badge>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {client.email} • {client.indicatif}{client.telephone}
                            </div>
                            {client.terrains && client.terrains.length > 0 && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                Terrains: {client.terrains.map(t => t.numero).join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {filteredClients.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">Aucun client trouvé</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Prospects Section */}
              <div className="space-y-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <UserPlus className="h-4 w-4 text-orange-600 dark:text-amber-400" />
                    Prospects ({filteredProspects.length})
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-prospects"
                      checked={formData.selectedProspects.length === filteredProspects.length && filteredProspects.length > 0}
                      onCheckedChange={handleSelectAllProspects}
                    />
                    <Label htmlFor="select-all-prospects" className="text-sm text-amber-800 dark:text-amber-300">Tout sélectionner</Label>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2 border border-amber-200 dark:border-amber-800 rounded-lg bg-white/80 dark:bg-gray-800/80 p-4">
                  {isLoadingProspects ? (
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center space-x-3 p-2 rounded animate-pulse">
                          <div className="h-4 w-4 rounded border bg-gray-200 dark:bg-gray-600" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-600" />
                            <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {filteredProspects.map((prospect) => (
                        <div key={prospect._id} className="flex items-center space-x-3 p-2 hover:bg-amber-50/80 dark:hover:bg-amber-950/50 rounded">
                          <Checkbox
                            id={`prospect-${prospect._id}`}
                            checked={formData.selectedProspects.includes(prospect._id)}
                            onCheckedChange={(checked) => handleProspectSelection(prospect._id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{prospect.nom} {prospect.prenom}</span>
                              <Badge variant="outline" className="text-xs">{prospect.code}</Badge>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {prospect.email} • {prospect.indicatif}{prospect.telephone}
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredProspects.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">Aucun prospect trouvé</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Autres destinataires (ni client ni prospect) */}
              <div className="space-y-4 rounded-xl border border-purple-200 bg-purple-50/60 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium flex items-center gap-2 text-purple-900 dark:text-purple-200">
                    <UserPlus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Autres destinataires ({otherRecipients.length})
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddOtherDialog(true)}
                    className="border-purple-300 dark:border-purple-700 bg-white/80 dark:bg-gray-800/80 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un destinataire
                  </Button>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Ajoutez des personnes qui ne sont pas dans la liste clients ou prospects (email et/ou téléphone requis).
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-purple-200 dark:border-purple-700 rounded-lg bg-white/80 dark:bg-gray-800/80 p-4">
                  {otherRecipients.length === 0 ? (
                    <p className="text-center text-purple-600 dark:text-purple-400 py-4">Aucun autre destinataire ajouté</p>
                  ) : (
                    otherRecipients.map((other) => (
                      <div key={other._id} className="flex items-center justify-between p-2 hover:bg-purple-50/80 dark:hover:bg-purple-900/50 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{other.nom} {other.prenom}{other.postnom ? ` ${other.postnom}` : ""}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {other.email} {other.telephone ? `• ${other.indicatif}${other.telephone}` : ""}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/50"
                          onClick={() => handleRemoveOtherRecipient(other._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Extra Information */}
        <div className="space-y-6">
          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Planification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="date-envoi">Date d'envoi</Label>
                <Input
                  id="date-envoi"
                  type="date"
                  value={formData.dateEnvoi}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateEnvoi: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="heure-envoi">Heure d'envoi</Label>
                <Input
                  id="heure-envoi"
                  type="time"
                  value={formData.heureEnvoi}
                  onChange={(e) => setFormData(prev => ({ ...prev, heureEnvoi: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="priorite">Priorité</Label>
                <Select value={formData.priorite} onValueChange={(value: "normal" | "urgent" | "faible") => setFormData(prev => ({ ...prev, priorite: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faible">Faible</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Personal Message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                Message Personnalisé
              </CardTitle>
              <CardDescription>
                Ajoutez un message personnalisé (optionnel)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Votre message personnalisé..."
                value={formData.messagePersonnalise}
                onChange={(e) => setFormData(prev => ({ ...prev, messagePersonnalise: e.target.value }))}
                rows={4}
              />
              
              {/* File Upload Section */}
              <div className="space-y-2">
                <Label>Pièces jointes (optionnel)</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Ajouter des fichiers ou images
                </Button>
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(file)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="ml-2 flex-shrink-0"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                Options d'Envoi
              </CardTitle>
              <CardDescription>
                Le sondage sera envoyé par les méthodes sélectionnées
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="envoyer-mail"
                  checked={formData.envoyerParMail}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, envoyerParMail: checked as boolean }))}
                />
                <Label htmlFor="envoyer-mail" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Envoyer la diffusion par email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="envoyer-whatsapp"
                  checked={formData.envoyerParWhatsapp}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, envoyerParWhatsapp: checked as boolean }))}
                />
                <Label htmlFor="envoyer-whatsapp" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Envoyer la diffusion par WhatsApp
                </Label>
              </div>
              {!formData.envoyerParMail && !formData.envoyerParWhatsapp && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  ⚠️ Veuillez sélectionner au moins une méthode d'envoi
                </p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Résumé
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Sondage:</span>
                <span className="text-sm font-medium">{selectedSondageText?.title || diffusionTemplates.find(t => t.filename === formData.diffusionTemplate)?.name || "Non sélectionné"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Clients sélectionnés:</span>
                <span className="text-sm font-medium">{formData.selectedClients.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Prospects sélectionnés:</span>
                <span className="text-sm font-medium">{formData.selectedProspects.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Total destinataires:</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{totalSelected}</span>
              </div>
              {selectedFiles.length > 0 && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Fichiers joints:</span>
                  <span className="text-sm font-medium text-green-600">{selectedFiles.length}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler le sondage</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous annuler ce sondage ? Toutes les modifications non sauvegardées seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, continuer</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

          {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'envoi</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Voulez-vous confirmer l'envoi de la diffusion <strong>"{selectedSondageText?.title || diffusionTemplates.find(t => t.filename === formData.diffusionTemplate)?.name}"</strong> ?</p>
              <div className="mt-3 space-y-1 text-sm">
                <p>• <strong>{totalSelected}</strong> destinataire{totalSelected > 1 ? 's' : ''} sélectionné{totalSelected > 1 ? 's' : ''}</p>
                <p>• <strong>{formData.selectedClients.length}</strong> client{formData.selectedClients.length > 1 ? 's' : ''}</p>
                <p>• <strong>{formData.selectedProspects.length}</strong> prospect{formData.selectedProspects.length > 1 ? 's' : ''}</p>
                {otherRecipients.length > 0 && (
                  <p>• <strong>{otherRecipients.length}</strong> autre{otherRecipients.length > 1 ? 's' : ''} destinataire{otherRecipients.length > 1 ? 's' : ''}</p>
                )}
                <div className="mt-2 pt-2 border-t">
                  <p className="font-semibold">Méthodes d'envoi :</p>
                  {formData.envoyerParMail && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Email
                    </p>
                  )}
                  {formData.envoyerParWhatsapp && (
                    <p className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                      WhatsApp
                    </p>
                  )}
                  {!formData.envoyerParMail && !formData.envoyerParWhatsapp && (
                    <p className="text-red-600 dark:text-red-400">Aucune méthode sélectionnée</p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmit} 
              disabled={isSubmitting || (!formData.envoyerParMail && !formData.envoyerParWhatsapp)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                  Envoi en cours...
                </span>
              ) : (
                "Confirmer l'envoi"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Modal for Bulk Sending */}
      <ProgressModal
        isOpen={showProgressModal}
        onClose={handleProgressModalClose}
        bulkId={bulkId}
        initialTotalRecipients={totalRecipientsForProgress}
      />
      
      <SondageProgressModal
        isOpen={showDetailedProgressModal}
        onClose={() => {
          setShowDetailedProgressModal(false)
          setRecipientsStatus([])
          setSendingSessionId(null)
          setSelectedFiles([])
          router.push("/dashboard/sondages")
        }}
        recipients={recipientsStatus}
        onStatusUpdate={setRecipientsStatus}
      />

      {/* Dialog Ajouter un autre destinataire */}
      <Dialog open={showAddOtherDialog} onOpenChange={setShowAddOtherDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un destinataire</DialogTitle>
            <DialogDescription>
              Saisissez les coordonnées d&apos;une personne qui n&apos;est pas client ni prospect. Au moins l&apos;email ou le téléphone est requis pour l&apos;envoi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sexe</Label>
                <Select
                  value={otherRecipientForm.sexe || "none"}
                  onValueChange={(v) => setOtherRecipientForm(prev => ({ ...prev, sexe: (v === "none" ? "" : v) as "" | "M" | "F" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="M">M (Masculin)</SelectItem>
                    <SelectItem value="F">F (Féminin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={otherRecipientForm.nom}
                  onChange={(e) => setOtherRecipientForm(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input
                  value={otherRecipientForm.prenom}
                  onChange={(e) => setOtherRecipientForm(prev => ({ ...prev, prenom: e.target.value }))}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label>Postnom</Label>
                <Input
                  value={otherRecipientForm.postnom}
                  onChange={(e) => setOtherRecipientForm(prev => ({ ...prev, postnom: e.target.value }))}
                  placeholder="Postnom (optionnel)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={otherRecipientForm.email}
                onChange={(e) => setOtherRecipientForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Indicatif</Label>
                <CountryIndicativeSelect
                  value={otherRecipientForm.indicatif}
                  onValueChange={(v) => setOtherRecipientForm(prev => ({ ...prev, indicatif: v }))}
                  defaultValue="+243"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={otherRecipientForm.telephone}
                  onChange={(e) => setOtherRecipientForm(prev => ({ ...prev, telephone: e.target.value }))}
                  placeholder="Numéro"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOtherDialog(false)}>Annuler</Button>
            <Button onClick={handleAddOtherRecipient} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
