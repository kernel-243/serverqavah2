"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Users,
  User,
  FileText,
  Calendar,
  Award,
  Banknote,
  AlignLeft,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Phone,
  MapPin,
  Shield,
  BookOpen,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmployeeListItem {
  _id: string
  nom: string
  email: string
  role: string
  status: string
  salaire?: number
  dossier?: {
    informationsProfessionnelles?: {
      poste?: string
      departement?: string
      typeContrat?: string
      statut?: string
    }
    informationsPersonnelles?: {
      prenom?: string
    }
  }
}

interface DossierData {
  _id: string
  userId: { _id: string; nom: string; email: string; role: string; status: string }
  informationsPersonnelles: {
    prenom: string
    dateNaissance?: string
    lieuNaissance: string
    nationalite: string
    genre: string
    telephone: string
    adresse: string
    numeroCNI: string
    photo: string
    etatCivil: string
    nombreEnfants: number
  }
  informationsProfessionnelles: {
    poste: string
    departement: string
    matricule: string
    dateEmbauche?: string
    typeContrat: string
    dateDebutEssai?: string
    dateFinEssai?: string
    dateFinContrat?: string
    bureau: string
    superviseur?: { _id: string; nom: string; email: string }
    statut: string
  }
  informationsSalariales: {
    salaireBase: number
    devise: string
    modePaiement: string
    banque: string
    numeroBancaire: string
    jourPaiement: number
  }
  contactUrgence: { nom: string; relation: string; telephone: string; adresse: string }
  conges: { soldeAnnuel: number; soldePris: number; reportN1: number }
  competences: string[]
  formations: Array<{
    _id: string
    titre: string
    organisme: string
    dateDebut?: string
    dateFin?: string
    certificat: string
    description: string
  }>
  notes?: Array<{
    _id: string
    texte: string
    type: string
    auteur?: { nom: string }
    date: string
  }>
}

interface DocumentData {
  _id: string
  type: string
  titre: string
  description: string
  dateDocument?: string
  ajoutePar?: { nom: string }
  confidentiel?: boolean
  cloudinaryPublicId?: string
  cloudinaryOriginalName?: string
  cloudinaryFormat?: string
  cloudinaryBytes?: number
  cloudinarySecureUrl?: string
  createdAt: string
}

interface CongeData {
  _id: string
  type: string
  dateDebut: string
  dateFin: string
  nombreJours: number
  motif: string
  statut: string
  commentaireAdmin?: string
}

interface NoteData {
  _id: string
  texte: string
  type: string
  auteur?: { nom: string }
  date: string
}

// ── Helpers & config ──────────────────────────────────────────────────────────

function fmt(d?: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

function fmtShort(d?: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function toInputDate(d?: string) {
  if (!d) return ""
  return d.slice(0, 10)
}

const STATUT_CONFIG: Record<string, { label: string; cls: string }> = {
  actif: { label: "Actif", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  en_conge: { label: "En congé", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  suspendu: { label: "Suspendu", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  demissionnaire: { label: "Démissionnaire", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  licencie: { label: "Licencié", cls: "bg-red-100 text-red-700 border-red-200" },
}

const STATUT_CONGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  en_attente: { label: "En attente", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> },
  approuve: { label: "Approuvé", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  refuse: { label: "Refusé", cls: "bg-red-100 text-red-600 border-red-200", icon: <XCircle className="h-3 w-3" /> },
  annule: { label: "Annulé", cls: "bg-gray-100 text-gray-500 border-gray-200", icon: <XCircle className="h-3 w-3" /> },
}

const NOTE_TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  note: { label: "Note", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  avertissement: { label: "Avertissement", cls: "bg-red-100 text-red-600 border-red-200" },
  felicitation: { label: "Félicitation", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  changement_poste: { label: "Changement de poste", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  autre: { label: "Autre", cls: "bg-gray-100 text-gray-600 border-gray-200" },
}

const DOC_TYPE_LABELS: Record<string, string> = {
  contrat: "Contrat", cv: "CV", cni: "CNI", passeport: "Passeport",
  diplome: "Diplôme", certificat: "Certificat", attestation: "Attestation", autre: "Autre",
}

const TYPE_CONGE_LABELS: Record<string, string> = {
  annuel: "Congé annuel", maladie: "Maladie", maternite: "Maternité",
  paternite: "Paternité", exceptionnel: "Exceptionnel", sans_solde: "Sans solde", autre: "Autre",
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 dark:border-slate-800 last:border-0">
      {icon && <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
          {value != null && value !== "" ? value : (
            <span className="text-gray-300 dark:text-gray-600 font-normal">Non renseigné</span>
          )}
        </p>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  icon,
  children,
  onEdit,
  isEditing,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  onEdit?: () => void
  isEditing?: boolean
}) {
  return (
    <Card className="border border-gray-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#002952] dark:text-blue-400">{icon}</span>
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</CardTitle>
        </div>
        {onEdit && !isEditing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-gray-500 hover:text-[#002952] hover:bg-blue-50"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Modifier
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DossiersAdminPage() {
  const api = process.env.NEXT_PUBLIC_API_URL
  const getHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    return { Authorization: `Bearer ${token}` }
  }

  // Employee list state
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Selected employee
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null)
  const [dossier, setDossier] = useState<DossierData | null>(null)
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [conges, setConges] = useState<CongeData[]>([])
  const [notes, setNotes] = useState<NoteData[]>([])
  const [loadingDossier, setLoadingDossier] = useState(false)

  // Edit states
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [savingSection, setSavingSection] = useState(false)

  // Form state — informations personnelles
  const [formIP, setFormIP] = useState({
    prenom: "", dateNaissance: "", lieuNaissance: "", nationalite: "",
    genre: "", telephone: "", adresse: "", numeroCNI: "", etatCivil: "", nombreEnfants: 0,
  })

  // Form state — informations professionnelles
  const [formIPRO, setFormIPRO] = useState({
    poste: "", departement: "", matricule: "", dateEmbauche: "",
    typeContrat: "", dateFinContrat: "", bureau: "", statut: "",
  })

  // Form state — contact urgence
  const [formCU, setFormCU] = useState({ nom: "", relation: "", telephone: "", adresse: "" })

  // Form state — salaire
  const [formSal, setFormSal] = useState({
    salaireBase: 0, devise: "USD", modePaiement: "virement",
    banque: "", numeroBancaire: "", jourPaiement: 28,
  })

  // Form state — conges
  const [formConges, setFormConges] = useState({ soldeAnnuel: 0, soldePris: 0, reportN1: 0 })

  // Documents
  const [showDocForm, setShowDocForm] = useState(false)
  const [docForm, setDocForm] = useState({ type: "autre", titre: "", description: "", dateDocument: "", confidentiel: false })
  const [docFile, setDocFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [savingDoc, setSavingDoc] = useState(false)
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null)

  // Congés
  const [congeComments, setCongeComments] = useState<Record<string, string>>({})
  const [processingConge, setProcessingConge] = useState<string | null>(null)

  // Notes
  const [noteForm, setNoteForm] = useState({ texte: "", type: "note" })
  const [savingNote, setSavingNote] = useState(false)
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)

  // Compétences
  const [newCompetence, setNewCompetence] = useState("")
  const [savingComp, setSavingComp] = useState(false)

  // Formations
  const [showFormationForm, setShowFormationForm] = useState(false)
  const [formationForm, setFormationForm] = useState({ titre: "", organisme: "", dateDebut: "", dateFin: "", certificat: "", description: "" })
  const [savingFormation, setSavingFormation] = useState(false)
  const [deleteFormationId, setDeleteFormationId] = useState<string | null>(null)

  // ── Fetch employees ──

  const fetchEmployees = useCallback(async () => {
    setLoadingList(true)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (statusFilter !== "all") params.status = statusFilter
      const res = await axios.get(`${api}/dossiers/employes`, { headers: getHeaders(), params })
      setEmployees(res.data.data || [])
    } catch {
      toast.error("Impossible de charger la liste des employés")
    } finally {
      setLoadingList(false)
    }
  }, [search, statusFilter])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  // ── Fetch dossier ──

  const fetchDossier = useCallback(async (userId: string) => {
    setLoadingDossier(true)
    setEditingSection(null)
    try {
      const [dossierRes, docsRes, congesRes, notesRes] = await Promise.all([
        axios.get(`${api}/dossiers/${userId}`, { headers: getHeaders() }),
        axios.get(`${api}/dossiers/${userId}/documents`, { headers: getHeaders() }),
        axios.get(`${api}/dossiers/${userId}/conges`, { headers: getHeaders() }),
        axios.get(`${api}/dossiers/${userId}/notes`, { headers: getHeaders() }),
      ])
      const d: DossierData = dossierRes.data.data
      setDossier(d)
      setDocuments(docsRes.data.data || [])
      setConges(congesRes.data.data || [])
      setNotes((notesRes.data.data || []).sort((a: NoteData, b: NoteData) => new Date(b.date).getTime() - new Date(a.date).getTime()))

      // Pre-fill forms
      const ip = d.informationsPersonnelles
      setFormIP({
        prenom: ip.prenom || "", dateNaissance: toInputDate(ip.dateNaissance),
        lieuNaissance: ip.lieuNaissance || "", nationalite: ip.nationalite || "",
        genre: ip.genre || "", telephone: ip.telephone || "", adresse: ip.adresse || "",
        numeroCNI: ip.numeroCNI || "", etatCivil: ip.etatCivil || "", nombreEnfants: ip.nombreEnfants || 0,
      })
      const ipro = d.informationsProfessionnelles
      setFormIPRO({
        poste: ipro.poste || "", departement: ipro.departement || "", matricule: ipro.matricule || "",
        dateEmbauche: toInputDate(ipro.dateEmbauche), typeContrat: ipro.typeContrat || "",
        dateFinContrat: toInputDate(ipro.dateFinContrat), bureau: ipro.bureau || "", statut: ipro.statut || "",
      })
      const cu = d.contactUrgence
      setFormCU({ nom: cu.nom || "", relation: cu.relation || "", telephone: cu.telephone || "", adresse: cu.adresse || "" })
      const sal = d.informationsSalariales
      setFormSal({
        salaireBase: sal.salaireBase || 0, devise: sal.devise || "USD",
        modePaiement: sal.modePaiement || "virement", banque: sal.banque || "",
        numeroBancaire: sal.numeroBancaire || "", jourPaiement: sal.jourPaiement || 28,
      })
      setFormConges({ soldeAnnuel: d.conges.soldeAnnuel || 0, soldePris: d.conges.soldePris || 0, reportN1: d.conges.reportN1 || 0 })
    } catch {
      toast.error("Impossible de charger le dossier")
    } finally {
      setLoadingDossier(false)
    }
  }, [])

  function handleSelectEmployee(emp: EmployeeListItem) {
    setSelectedEmployee(emp)
    fetchDossier(emp._id)
  }

  // ── Save section ──

  async function saveSection(section: string, data: Record<string, unknown>) {
    if (!selectedEmployee) return
    setSavingSection(true)
    try {
      const res = await axios.put(`${api}/dossiers/${selectedEmployee._id}`, { section, data }, { headers: getHeaders() })
      setDossier(res.data.data)
      toast.success("Section mise à jour")
      setEditingSection(null)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Erreur lors de la sauvegarde")
    } finally {
      setSavingSection(false)
    }
  }

  // ── Documents ──

  async function handleAddDocument() {
    if (!selectedEmployee) return
    if (!docForm.titre.trim()) { toast.error("Le titre est requis"); return }
    if (!docFile) { toast.error("Veuillez sélectionner un fichier"); return }

    const formData = new FormData()
    formData.append("file", docFile)
    formData.append("type", docForm.type)
    formData.append("titre", docForm.titre.trim())
    formData.append("description", docForm.description)
    formData.append("dateDocument", docForm.dateDocument)
    formData.append("confidentiel", String(docForm.confidentiel))

    setSavingDoc(true)
    setUploadProgress(0)
    try {
      const res = await axios.post(
        `${api}/dossiers/${selectedEmployee._id}/documents`,
        formData,
        {
          headers: { ...getHeaders(), "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total))
          },
        }
      )
      setDocuments(prev => [...prev, res.data.data])
      setDocForm({ type: "autre", titre: "", description: "", dateDocument: "", confidentiel: false })
      setDocFile(null)
      setUploadProgress(0)
      setShowDocForm(false)
      toast.success("Document uploadé avec succès")
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Erreur lors de l'upload")
    } finally {
      setSavingDoc(false)
    }
  }

  async function handleSecureUrl(docId: string, download = false) {
    if (!selectedEmployee) return
    try {
      const res = await axios.get(
        `${api}/dossiers/${selectedEmployee._id}/documents/${docId}/secure-url`,
        { headers: getHeaders(), params: { download: download ? "1" : "0" } }
      )
      const { url, filename } = res.data
      if (download) {
        const a = document.createElement("a")
        a.href = url
        a.download = filename || "document"
        a.click()
      } else {
        window.open(url, "_blank", "noopener,noreferrer")
      }
    } catch {
      toast.error("Impossible d'ouvrir le document")
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!selectedEmployee) return
    try {
      await axios.delete(`${api}/dossiers/${selectedEmployee._id}/documents/${docId}`, { headers: getHeaders() })
      setDocuments(prev => prev.filter(d => d._id !== docId))
      toast.success("Document supprimé")
    } catch {
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeleteDocId(null)
    }
  }

  // ── Congés ──

  async function handleTraiterConge(congeId: string, action: "approuver" | "refuser") {
    setProcessingConge(congeId)
    try {
      const res = await axios.put(
        `${api}/dossiers/conges/${congeId}/traiter`,
        { action, commentaireAdmin: congeComments[congeId] || "" },
        { headers: getHeaders() }
      )
      setConges(prev => prev.map(c => c._id === congeId ? res.data.data : c))
      toast.success(action === "approuver" ? "Congé approuvé" : "Congé refusé")
    } catch {
      toast.error("Erreur lors du traitement")
    } finally {
      setProcessingConge(null)
    }
  }

  // ── Notes ──

  async function handleAddNote() {
    if (!selectedEmployee || !noteForm.texte.trim()) {
      toast.error("Le texte de la note est requis")
      return
    }
    setSavingNote(true)
    try {
      const res = await axios.post(`${api}/dossiers/${selectedEmployee._id}/notes`, noteForm, { headers: getHeaders() })
      setNotes(prev => [res.data.data, ...prev])
      setNoteForm({ texte: "", type: "note" })
      toast.success("Note ajoutée")
    } catch {
      toast.error("Erreur lors de l'ajout")
    } finally {
      setSavingNote(false)
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!selectedEmployee) return
    try {
      await axios.delete(`${api}/dossiers/${selectedEmployee._id}/notes/${noteId}`, { headers: getHeaders() })
      setNotes(prev => prev.filter(n => n._id !== noteId))
      toast.success("Note supprimée")
    } catch {
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeleteNoteId(null)
    }
  }

  // ── Compétences ──

  async function handleAddCompetence() {
    if (!selectedEmployee || !newCompetence.trim() || !dossier) return
    setSavingComp(true)
    const updated = [...(dossier.competences || []), newCompetence.trim()]
    try {
      const res = await axios.put(`${api}/dossiers/${selectedEmployee._id}`, { section: "competences", data: updated }, { headers: getHeaders() })
      setDossier(res.data.data)
      setNewCompetence("")
      toast.success("Compétence ajoutée")
    } catch {
      toast.error("Erreur lors de l'ajout")
    } finally {
      setSavingComp(false)
    }
  }

  async function handleRemoveCompetence(index: number) {
    if (!selectedEmployee || !dossier) return
    const updated = dossier.competences.filter((_, i) => i !== index)
    try {
      const res = await axios.put(`${api}/dossiers/${selectedEmployee._id}`, { section: "competences", data: updated }, { headers: getHeaders() })
      setDossier(res.data.data)
      toast.success("Compétence supprimée")
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  // ── Formations ──

  async function handleAddFormation() {
    if (!selectedEmployee || !formationForm.titre || !formationForm.organisme) {
      toast.error("Titre et organisme sont requis")
      return
    }
    setSavingFormation(true)
    try {
      const res = await axios.post(`${api}/dossiers/${selectedEmployee._id}/formations`, formationForm, { headers: getHeaders() })
      setDossier(res.data.data)
      setFormationForm({ titre: "", organisme: "", dateDebut: "", dateFin: "", certificat: "", description: "" })
      setShowFormationForm(false)
      toast.success("Formation ajoutée")
    } catch {
      toast.error("Erreur lors de l'ajout")
    } finally {
      setSavingFormation(false)
    }
  }

  async function handleDeleteFormation(formationId: string) {
    if (!selectedEmployee) return
    try {
      const res = await axios.delete(`${api}/dossiers/${selectedEmployee._id}/formations/${formationId}`, { headers: getHeaders() })
      setDossier(res.data.data)
      toast.success("Formation supprimée")
    } catch {
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeleteFormationId(null)
    }
  }

  // ── Filtered employees ──

  const filteredEmployees = employees.filter(emp => {
    const q = search.toLowerCase()
    const matchSearch = !q || emp.nom.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q)
    const empStatut = emp.dossier?.informationsProfessionnelles?.statut || emp.status
    const matchStatus = statusFilter === "all" || empStatut === statusFilter
    return matchSearch && matchStatus
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* ── Left Panel ── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-[#002952] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Employés</h2>
            <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0.5">
              {filteredEmployees.length}
            </Badge>
          </div>
          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="en_conge">En congé</SelectItem>
              <SelectItem value="suspendu">Suspendu</SelectItem>
              <SelectItem value="demissionnaire">Démissionnaire</SelectItem>
              <SelectItem value="licencie">Licencié</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-[#002952]" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <Users className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Aucun employé trouvé</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-slate-800">
              {filteredEmployees.map(emp => {
                const ipro = emp.dossier?.informationsProfessionnelles
                const ip = emp.dossier?.informationsPersonnelles
                const prenom = ip?.prenom || ""
                const initials = [(prenom[0] || ""), (emp.nom[0] || "")].filter(Boolean).join("").toUpperCase() || emp.nom.slice(0, 2).toUpperCase()
                const statut = ipro?.statut || emp.status || "actif"
                const statutCfg = STATUT_CONFIG[statut] || STATUT_CONFIG.actif
                const isSelected = selectedEmployee?._id === emp._id

                return (
                  <li key={emp._id}>
                    <button
                      onClick={() => handleSelectEmployee(emp)}
                      className={cn(
                        "w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors",
                        isSelected && "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-[#002952]"
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 text-white",
                        isSelected ? "bg-[#002952]" : "bg-gradient-to-br from-[#002952] to-[#0056b3]"
                      )}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {[prenom, emp.nom].filter(Boolean).join(" ")}
                          </p>
                          {isSelected && <ChevronRight className="h-3.5 w-3.5 text-[#002952] shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {ipro?.poste || emp.role || "—"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn("inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border", statutCfg.cls)}>
                            {statutCfg.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{emp.email}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Right Panel ── */}
      <main className="flex-1 overflow-y-auto">
        {!selectedEmployee ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="h-20 w-20 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
              <User className="h-10 w-10 text-[#002952]/40 dark:text-blue-400/40" />
            </div>
            <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Sélectionnez un employé
            </h3>
            <p className="text-sm text-gray-400">pour voir son dossier complet</p>
          </div>
        ) : loadingDossier ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-[#002952]" />
          </div>
        ) : dossier ? (
          <div className="p-6">
            {/* Employee header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#002952] to-[#0056b3] flex items-center justify-center text-xl font-bold text-white shadow">
                {[(dossier.informationsPersonnelles.prenom?.[0] || ""), (dossier.userId.nom?.[0] || "")].filter(Boolean).join("").toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {[dossier.informationsPersonnelles.prenom, dossier.userId.nom].filter(Boolean).join(" ") || dossier.userId.nom}
                </h1>
                <p className="text-sm text-gray-500">{dossier.userId.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {dossier.informationsProfessionnelles.poste && (
                    <Badge variant="outline" className="text-xs">{dossier.informationsProfessionnelles.poste}</Badge>
                  )}
                  {dossier.informationsProfessionnelles.departement && (
                    <Badge variant="outline" className="text-xs">{dossier.informationsProfessionnelles.departement}</Badge>
                  )}
                  {(() => {
                    const s = dossier.informationsProfessionnelles.statut
                    const cfg = STATUT_CONFIG[s] || STATUT_CONFIG.actif
                    return <Badge className={cn("text-xs border", cfg.cls)}>{cfg.label}</Badge>
                  })()}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="profil" className="space-y-4">
              <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                <TabsTrigger value="profil" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <User className="h-3.5 w-3.5" /> Profil
                </TabsTrigger>
                <TabsTrigger value="salaire" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <Banknote className="h-3.5 w-3.5" /> Salaire & Contrat
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <FileText className="h-3.5 w-3.5" /> Documents
                </TabsTrigger>
                <TabsTrigger value="conges" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <Calendar className="h-3.5 w-3.5" /> Congés
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <AlignLeft className="h-3.5 w-3.5" /> Notes RH
                </TabsTrigger>
                <TabsTrigger value="competences" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <Award className="h-3.5 w-3.5" /> Compétences & Formations
                </TabsTrigger>
              </TabsList>

              {/* ── TAB 1: Profil ── */}
              <TabsContent value="profil" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Informations personnelles */}
                  <SectionCard
                    title="Informations personnelles"
                    icon={<User className="h-4 w-4" />}
                    onEdit={() => setEditingSection("informationsPersonnelles")}
                    isEditing={editingSection === "informationsPersonnelles"}
                  >
                    {editingSection === "informationsPersonnelles" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Prénom</Label>
                            <Input className="h-8 text-xs mt-1" value={formIP.prenom} onChange={e => setFormIP(f => ({ ...f, prenom: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Date de naissance</Label>
                            <Input type="date" className="h-8 text-xs mt-1" value={formIP.dateNaissance} onChange={e => setFormIP(f => ({ ...f, dateNaissance: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Lieu de naissance</Label>
                            <Input className="h-8 text-xs mt-1" value={formIP.lieuNaissance} onChange={e => setFormIP(f => ({ ...f, lieuNaissance: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Nationalité</Label>
                            <Input className="h-8 text-xs mt-1" value={formIP.nationalite} onChange={e => setFormIP(f => ({ ...f, nationalite: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Genre</Label>
                            <Select value={formIP.genre} onValueChange={v => setFormIP(f => ({ ...f, genre: v }))}>
                              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="M">Masculin</SelectItem>
                                <SelectItem value="F">Féminin</SelectItem>
                                <SelectItem value="Autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">État civil</Label>
                            <Select value={formIP.etatCivil} onValueChange={v => setFormIP(f => ({ ...f, etatCivil: v }))}>
                              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="celibataire">Célibataire</SelectItem>
                                <SelectItem value="marie">Marié(e)</SelectItem>
                                <SelectItem value="divorce">Divorcé(e)</SelectItem>
                                <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Téléphone</Label>
                            <Input className="h-8 text-xs mt-1" value={formIP.telephone} onChange={e => setFormIP(f => ({ ...f, telephone: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">N° CNI</Label>
                            <Input className="h-8 text-xs mt-1" value={formIP.numeroCNI} onChange={e => setFormIP(f => ({ ...f, numeroCNI: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Nombre d'enfants</Label>
                            <Input type="number" min={0} className="h-8 text-xs mt-1" value={formIP.nombreEnfants} onChange={e => setFormIP(f => ({ ...f, nombreEnfants: parseInt(e.target.value) || 0 }))} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Adresse</Label>
                          <Textarea className="text-xs mt-1 resize-none" rows={2} value={formIP.adresse} onChange={e => setFormIP(f => ({ ...f, adresse: e.target.value }))} />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingSection(null)}>Annuler</Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white"
                            disabled={savingSection}
                            onClick={() => saveSection("informationsPersonnelles", formIP)}
                          >
                            {savingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            Enregistrer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <InfoRow label="Prénom" value={dossier.informationsPersonnelles.prenom} icon={<User className="h-3.5 w-3.5" />} />
                        <InfoRow label="Date de naissance" value={fmt(dossier.informationsPersonnelles.dateNaissance)} />
                        <InfoRow label="Lieu de naissance" value={dossier.informationsPersonnelles.lieuNaissance} />
                        <InfoRow label="Nationalité" value={dossier.informationsPersonnelles.nationalite} />
                        <InfoRow label="Genre" value={dossier.informationsPersonnelles.genre} />
                        <InfoRow label="État civil" value={dossier.informationsPersonnelles.etatCivil} />
                        <InfoRow label="Téléphone" value={dossier.informationsPersonnelles.telephone} icon={<Phone className="h-3.5 w-3.5" />} />
                        <InfoRow label="Adresse" value={dossier.informationsPersonnelles.adresse} icon={<MapPin className="h-3.5 w-3.5" />} />
                        <InfoRow label="N° CNI" value={dossier.informationsPersonnelles.numeroCNI} icon={<Shield className="h-3.5 w-3.5" />} />
                        <InfoRow label="Nombre d'enfants" value={dossier.informationsPersonnelles.nombreEnfants} />
                      </div>
                    )}
                  </SectionCard>

                  {/* Informations professionnelles */}
                  <SectionCard
                    title="Informations professionnelles"
                    icon={<BookOpen className="h-4 w-4" />}
                    onEdit={() => setEditingSection("informationsProfessionnelles")}
                    isEditing={editingSection === "informationsProfessionnelles"}
                  >
                    {editingSection === "informationsProfessionnelles" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Poste</Label>
                            <Input className="h-8 text-xs mt-1" value={formIPRO.poste} onChange={e => setFormIPRO(f => ({ ...f, poste: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Département</Label>
                            <Input className="h-8 text-xs mt-1" value={formIPRO.departement} onChange={e => setFormIPRO(f => ({ ...f, departement: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Matricule</Label>
                            <Input className="h-8 text-xs mt-1" value={formIPRO.matricule} onChange={e => setFormIPRO(f => ({ ...f, matricule: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Date d'embauche</Label>
                            <Input type="date" className="h-8 text-xs mt-1" value={formIPRO.dateEmbauche} onChange={e => setFormIPRO(f => ({ ...f, dateEmbauche: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Type de contrat</Label>
                            <Select value={formIPRO.typeContrat} onValueChange={v => setFormIPRO(f => ({ ...f, typeContrat: v }))}>
                              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CDI">CDI</SelectItem>
                                <SelectItem value="CDD">CDD</SelectItem>
                                <SelectItem value="Stage">Stage</SelectItem>
                                <SelectItem value="Prestataire">Prestataire</SelectItem>
                                <SelectItem value="Essai">Essai</SelectItem>
                                <SelectItem value="Autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Date fin de contrat</Label>
                            <Input type="date" className="h-8 text-xs mt-1" value={formIPRO.dateFinContrat} onChange={e => setFormIPRO(f => ({ ...f, dateFinContrat: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Bureau</Label>
                            <Input className="h-8 text-xs mt-1" value={formIPRO.bureau} onChange={e => setFormIPRO(f => ({ ...f, bureau: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Statut</Label>
                            <Select value={formIPRO.statut} onValueChange={v => setFormIPRO(f => ({ ...f, statut: v }))}>
                              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="actif">Actif</SelectItem>
                                <SelectItem value="en_conge">En congé</SelectItem>
                                <SelectItem value="suspendu">Suspendu</SelectItem>
                                <SelectItem value="demissionnaire">Démissionnaire</SelectItem>
                                <SelectItem value="licencie">Licencié</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingSection(null)}>Annuler</Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white"
                            disabled={savingSection}
                            onClick={() => saveSection("informationsProfessionnelles", formIPRO)}
                          >
                            {savingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            Enregistrer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <InfoRow label="Poste" value={dossier.informationsProfessionnelles.poste} />
                        <InfoRow label="Département" value={dossier.informationsProfessionnelles.departement} />
                        <InfoRow label="Matricule" value={dossier.informationsProfessionnelles.matricule} />
                        <InfoRow label="Date d'embauche" value={fmt(dossier.informationsProfessionnelles.dateEmbauche)} />
                        <InfoRow label="Type de contrat" value={dossier.informationsProfessionnelles.typeContrat} />
                        <InfoRow label="Date fin de contrat" value={fmt(dossier.informationsProfessionnelles.dateFinContrat)} />
                        <InfoRow label="Bureau" value={dossier.informationsProfessionnelles.bureau} />
                        {dossier.informationsProfessionnelles.superviseur && (
                          <InfoRow label="Superviseur" value={dossier.informationsProfessionnelles.superviseur.nom} />
                        )}
                        <InfoRow label="Statut" value={STATUT_CONFIG[dossier.informationsProfessionnelles.statut]?.label || dossier.informationsProfessionnelles.statut} />
                      </div>
                    )}
                  </SectionCard>
                </div>

                {/* Contact urgence */}
                <SectionCard
                  title="Contact d'urgence"
                  icon={<Phone className="h-4 w-4" />}
                  onEdit={() => setEditingSection("contactUrgence")}
                  isEditing={editingSection === "contactUrgence"}
                >
                  {editingSection === "contactUrgence" ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nom</Label>
                          <Input className="h-8 text-xs mt-1" value={formCU.nom} onChange={e => setFormCU(f => ({ ...f, nom: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Relation</Label>
                          <Input className="h-8 text-xs mt-1" value={formCU.relation} onChange={e => setFormCU(f => ({ ...f, relation: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Téléphone</Label>
                          <Input className="h-8 text-xs mt-1" value={formCU.telephone} onChange={e => setFormCU(f => ({ ...f, telephone: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Adresse</Label>
                          <Input className="h-8 text-xs mt-1" value={formCU.adresse} onChange={e => setFormCU(f => ({ ...f, adresse: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingSection(null)}>Annuler</Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white"
                          disabled={savingSection}
                          onClick={() => saveSection("contactUrgence", formCU)}
                        >
                          {savingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-6">
                      <InfoRow label="Nom" value={dossier.contactUrgence.nom} />
                      <InfoRow label="Relation" value={dossier.contactUrgence.relation} />
                      <InfoRow label="Téléphone" value={dossier.contactUrgence.telephone} icon={<Phone className="h-3.5 w-3.5" />} />
                      <InfoRow label="Adresse" value={dossier.contactUrgence.adresse} icon={<MapPin className="h-3.5 w-3.5" />} />
                    </div>
                  )}
                </SectionCard>
              </TabsContent>

              {/* ── TAB 2: Salaire & Contrat ── */}
              <TabsContent value="salaire" className="space-y-4">
                {/* Informations salariales */}
                <SectionCard
                  title="Informations salariales"
                  icon={<Banknote className="h-4 w-4" />}
                  onEdit={() => setEditingSection("informationsSalariales")}
                  isEditing={editingSection === "informationsSalariales"}
                >
                  {editingSection === "informationsSalariales" ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Salaire de base</Label>
                          <Input type="number" className="h-8 text-xs mt-1" value={formSal.salaireBase} onChange={e => setFormSal(f => ({ ...f, salaireBase: parseFloat(e.target.value) || 0 }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Devise</Label>
                          <Select value={formSal.devise} onValueChange={v => setFormSal(f => ({ ...f, devise: v }))}>
                            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="CDF">CDF</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Mode de paiement</Label>
                          <Select value={formSal.modePaiement} onValueChange={v => setFormSal(f => ({ ...f, modePaiement: v }))}>
                            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="virement">Virement bancaire</SelectItem>
                              <SelectItem value="especes">Espèces</SelectItem>
                              <SelectItem value="mobile_money">Mobile Money</SelectItem>
                              <SelectItem value="cheque">Chèque</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Banque</Label>
                          <Input className="h-8 text-xs mt-1" value={formSal.banque} onChange={e => setFormSal(f => ({ ...f, banque: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">N° de compte bancaire</Label>
                          <Input className="h-8 text-xs mt-1" value={formSal.numeroBancaire} onChange={e => setFormSal(f => ({ ...f, numeroBancaire: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Jour de paiement</Label>
                          <Input type="number" min={1} max={31} className="h-8 text-xs mt-1" value={formSal.jourPaiement} onChange={e => setFormSal(f => ({ ...f, jourPaiement: parseInt(e.target.value) || 28 }))} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingSection(null)}>Annuler</Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white"
                          disabled={savingSection}
                          onClick={() => saveSection("informationsSalariales", formSal)}
                        >
                          {savingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-6">
                      <InfoRow label="Salaire de base" value={`${dossier.informationsSalariales.salaireBase?.toLocaleString("fr-FR")} ${dossier.informationsSalariales.devise}`} />
                      <InfoRow label="Mode de paiement" value={dossier.informationsSalariales.modePaiement} />
                      <InfoRow label="Banque" value={dossier.informationsSalariales.banque} />
                      <InfoRow label="N° bancaire" value={dossier.informationsSalariales.numeroBancaire} />
                      <InfoRow label="Jour de paiement" value={`Le ${dossier.informationsSalariales.jourPaiement} du mois`} />
                    </div>
                  )}
                </SectionCard>

                {/* Solde congés */}
                <SectionCard
                  title="Solde de congés"
                  icon={<Calendar className="h-4 w-4" />}
                  onEdit={() => setEditingSection("congesSolde")}
                  isEditing={editingSection === "congesSolde"}
                >
                  {editingSection === "congesSolde" ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Solde annuel (jours)</Label>
                          <Input type="number" min={0} className="h-8 text-xs mt-1" value={formConges.soldeAnnuel} onChange={e => setFormConges(f => ({ ...f, soldeAnnuel: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Jours pris</Label>
                          <Input type="number" min={0} className="h-8 text-xs mt-1" value={formConges.soldePris} onChange={e => setFormConges(f => ({ ...f, soldePris: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Report N-1</Label>
                          <Input type="number" min={0} className="h-8 text-xs mt-1" value={formConges.reportN1} onChange={e => setFormConges(f => ({ ...f, reportN1: parseInt(e.target.value) || 0 }))} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingSection(null)}>Annuler</Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white"
                          disabled={savingSection}
                          onClick={() => saveSection("conges", formConges)}
                        >
                          {savingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6">
                      {[
                        { label: "Solde annuel", value: dossier.conges.soldeAnnuel, color: "text-[#002952] dark:text-blue-400" },
                        { label: "Pris", value: dossier.conges.soldePris, color: "text-amber-600" },
                        { label: "Report N-1", value: dossier.conges.reportN1, color: "text-gray-500" },
                        { label: "Disponible", value: (dossier.conges.soldeAnnuel + dossier.conges.reportN1) - dossier.conges.soldePris, color: "text-emerald-600" },
                      ].map(item => (
                        <div key={item.label} className="text-center">
                          <p className={cn("text-2xl font-bold", item.color)}>{item.value}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </TabsContent>

              {/* ── TAB 3: Documents ── */}
              <TabsContent value="documents" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {documents.length} document{documents.length !== 1 ? "s" : ""}
                  </h3>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white gap-1.5"
                    onClick={() => setShowDocForm(v => !v)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un document
                  </Button>
                </div>

                {/* Add document form */}
                {showDocForm && (
                  <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select value={docForm.type} onValueChange={v => setDocForm(f => ({ ...f, type: v }))}>
                            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Titre *</Label>
                          <Input className="h-8 text-xs mt-1" value={docForm.titre} onChange={e => setDocForm(f => ({ ...f, titre: e.target.value }))} placeholder="Titre du document" />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Fichier *</Label>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt"
                            className="mt-1 w-full text-xs text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-[#002952] file:text-white hover:file:bg-[#003b7a] cursor-pointer"
                            onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                          />
                          {docFile && <p className="text-[10px] text-gray-400 mt-1">{docFile.name} ({(docFile.size / 1024).toFixed(0)} Ko)</p>}
                          {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="mt-2">
                              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[#002952] transition-all" style={{ width: `${uploadProgress}%` }} />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">{uploadProgress}%</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Input className="h-8 text-xs mt-1" value={docForm.description} onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Date du document</Label>
                          <Input type="date" className="h-8 text-xs mt-1" value={docForm.dateDocument} onChange={e => setDocForm(f => ({ ...f, dateDocument: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="confidentiel"
                          checked={docForm.confidentiel}
                          onChange={e => setDocForm(f => ({ ...f, confidentiel: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="confidentiel" className="text-xs cursor-pointer">Document confidentiel</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowDocForm(false)}>Annuler</Button>
                        <Button size="sm" className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white" disabled={savingDoc} onClick={handleAddDocument}>
                          {savingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          Ajouter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Document list */}
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <FileText className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Aucun document</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc._id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-gray-300 transition-colors">
                        <FileText className="h-4 w-4 text-[#002952] dark:text-blue-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{doc.titre}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{DOC_TYPE_LABELS[doc.type] || doc.type}</Badge>
                            {doc.confidentiel && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-600 border-red-200">Confidentiel</Badge>
                            )}
                          </div>
                          {doc.description && <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            {doc.dateDocument && <span className="text-[10px] text-gray-400">{fmtShort(doc.dateDocument)}</span>}
                            {doc.ajoutePar && <span className="text-[10px] text-gray-400">Par {doc.ajoutePar.nom}</span>}
                            {doc.cloudinaryPublicId && (
                              <>
                                <button onClick={() => handleSecureUrl(doc._id, false)} className="text-[10px] text-blue-600 hover:underline">Voir</button>
                                <button onClick={() => handleSecureUrl(doc._id, true)} className="text-[10px] text-blue-600 hover:underline">Télécharger</button>
                              </>
                            )}
                            {doc.cloudinaryBytes && <span className="text-[10px] text-gray-400">{(doc.cloudinaryBytes / 1024).toFixed(0)} Ko</span>}
                            {doc.cloudinaryOriginalName && <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{doc.cloudinaryOriginalName}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteDocId(doc._id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── TAB 4: Congés ── */}
              <TabsContent value="conges" className="space-y-4">
                {/* Solde summary */}
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="flex items-center gap-6">
                      {[
                        { label: "Total annuel", value: dossier.conges.soldeAnnuel, cls: "text-blue-800 dark:text-blue-200" },
                        { label: "Pris", value: dossier.conges.soldePris, cls: "text-amber-700 dark:text-amber-400" },
                        { label: "Reportés", value: dossier.conges.reportN1, cls: "text-gray-600 dark:text-gray-400" },
                        { label: "Disponibles", value: (dossier.conges.soldeAnnuel + dossier.conges.reportN1) - dossier.conges.soldePris, cls: "text-emerald-700 dark:text-emerald-400" },
                      ].map(item => (
                        <div key={item.label} className="text-center">
                          <p className={cn("text-xl font-bold", item.cls)}>{item.value}</p>
                          <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Leave requests list */}
                {conges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Calendar className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Aucune demande de congé</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conges.map(conge => {
                      const sc = STATUT_CONGE[conge.statut] || STATUT_CONGE.en_attente
                      const isPending = conge.statut === "en_attente"
                      return (
                        <div key={conge._id} className={cn(
                          "rounded-lg border bg-white dark:bg-slate-800/50 p-4",
                          isPending ? "border-amber-200 dark:border-amber-800" : "border-gray-200 dark:border-slate-700"
                        )}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {TYPE_CONGE_LABELS[conge.type] || conge.type}
                                </p>
                                <Badge className={cn("text-[10px] px-1.5 py-0 gap-0.5 border inline-flex items-center", sc.cls)}>
                                  {sc.icon}
                                  <span className="ml-0.5">{sc.label}</span>
                                </Badge>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {conge.nombreJours} jour{conge.nombreJours > 1 ? "s" : ""}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500">
                                Du {fmtShort(conge.dateDebut)} au {fmtShort(conge.dateFin)}
                              </p>
                              {conge.motif && <p className="text-xs text-gray-400 mt-1 italic">{conge.motif}</p>}
                              {conge.commentaireAdmin && (
                                <p className="text-xs text-gray-500 mt-1 bg-gray-50 dark:bg-slate-700 rounded px-2 py-1">
                                  Note admin : {conge.commentaireAdmin}
                                </p>
                              )}
                            </div>
                          </div>

                          {isPending && (
                            <div className="mt-3 border-t border-amber-100 dark:border-amber-800 pt-3 space-y-2">
                              <Input
                                placeholder="Commentaire (optionnel)"
                                className="h-7 text-xs"
                                value={congeComments[conge._id] || ""}
                                onChange={e => setCongeComments(prev => ({ ...prev, [conge._id]: e.target.value }))}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                  disabled={processingConge === conge._id}
                                  onClick={() => handleTraiterConge(conge._id, "approuver")}
                                >
                                  {processingConge === conge._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                  Approuver
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 gap-1"
                                  disabled={processingConge === conge._id}
                                  onClick={() => handleTraiterConge(conge._id, "refuser")}
                                >
                                  {processingConge === conge._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                  Refuser
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ── TAB 5: Notes RH ── */}
              <TabsContent value="notes" className="space-y-4">
                {/* Add note form */}
                <Card className="border border-gray-200 dark:border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Ajouter une note
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Rédigez votre note interne..."
                      rows={3}
                      className="text-sm resize-none"
                      value={noteForm.texte}
                      onChange={e => setNoteForm(f => ({ ...f, texte: e.target.value }))}
                    />
                    <div className="flex items-center gap-3">
                      <Select value={noteForm.type} onValueChange={v => setNoteForm(f => ({ ...f, type: v }))}>
                        <SelectTrigger className="h-8 text-xs w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="avertissement">Avertissement</SelectItem>
                          <SelectItem value="felicitation">Félicitation</SelectItem>
                          <SelectItem value="changement_poste">Changement de poste</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white gap-1.5 ml-auto"
                        disabled={savingNote || !noteForm.texte.trim()}
                        onClick={handleAddNote}
                      >
                        {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Ajouter
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes list */}
                {notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <AlignLeft className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Aucune note RH</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notes.map(note => {
                      const cfg = NOTE_TYPE_CONFIG[note.type] || NOTE_TYPE_CONFIG.note
                      return (
                        <div key={note._id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={cn("text-[10px] px-1.5 py-0 border", cfg.cls)}>{cfg.label}</Badge>
                              <span className="text-[10px] text-gray-400">{fmtShort(note.date)}</span>
                              {note.auteur && <span className="text-[10px] text-gray-400">· {note.auteur.nom}</span>}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{note.texte}</p>
                          </div>
                          <button
                            onClick={() => setDeleteNoteId(note._id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ── TAB 6: Compétences & Formations ── */}
              <TabsContent value="competences" className="space-y-4">
                {/* Compétences */}
                <SectionCard title="Compétences" icon={<Award className="h-4 w-4" />}>
                  <div className="space-y-3">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 min-h-8">
                      {(dossier.competences || []).length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Aucune compétence renseignée</p>
                      ) : (
                        dossier.competences.map((comp, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-[#002952] dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                          >
                            {comp}
                            <button
                              onClick={() => handleRemoveCompetence(i)}
                              className="ml-0.5 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    {/* Add competence input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nouvelle compétence..."
                        className="h-8 text-xs"
                        value={newCompetence}
                        onChange={e => setNewCompetence(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAddCompetence() }}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white px-3"
                        disabled={savingComp || !newCompetence.trim()}
                        onClick={handleAddCompetence}
                      >
                        {savingComp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </SectionCard>

                {/* Formations */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#002952] dark:text-blue-400" />
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Formations</h3>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white gap-1.5"
                      onClick={() => setShowFormationForm(v => !v)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter
                    </Button>
                  </div>

                  {/* Formation form */}
                  {showFormationForm && (
                    <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 mb-3">
                      <CardContent className="pt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Titre *</Label>
                            <Input className="h-8 text-xs mt-1" value={formationForm.titre} onChange={e => setFormationForm(f => ({ ...f, titre: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Organisme *</Label>
                            <Input className="h-8 text-xs mt-1" value={formationForm.organisme} onChange={e => setFormationForm(f => ({ ...f, organisme: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Date de début</Label>
                            <Input type="date" className="h-8 text-xs mt-1" value={formationForm.dateDebut} onChange={e => setFormationForm(f => ({ ...f, dateDebut: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Date de fin</Label>
                            <Input type="date" className="h-8 text-xs mt-1" value={formationForm.dateFin} onChange={e => setFormationForm(f => ({ ...f, dateFin: e.target.value }))} />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">URL du certificat</Label>
                            <Input className="h-8 text-xs mt-1" placeholder="https://..." value={formationForm.certificat} onChange={e => setFormationForm(f => ({ ...f, certificat: e.target.value }))} />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Description</Label>
                            <Textarea className="text-xs mt-1 resize-none" rows={2} value={formationForm.description} onChange={e => setFormationForm(f => ({ ...f, description: e.target.value }))} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowFormationForm(false)}>Annuler</Button>
                          <Button size="sm" className="h-8 text-xs bg-[#002952] hover:bg-[#003b7a] text-white" disabled={savingFormation} onClick={handleAddFormation}>
                            {savingFormation ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            Ajouter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Formations list */}
                  {(dossier.formations || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-center border border-dashed border-gray-200 rounded-lg">
                      <BookOpen className="h-6 w-6 text-gray-300 mb-1" />
                      <p className="text-xs text-gray-400">Aucune formation</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dossier.formations.map(formation => (
                        <div key={formation._id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                          <BookOpen className="h-4 w-4 text-[#002952] dark:text-blue-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{formation.titre}</p>
                            <p className="text-xs text-gray-500">{formation.organisme}</p>
                            {(formation.dateDebut || formation.dateFin) && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {fmtShort(formation.dateDebut)} {formation.dateFin ? `→ ${fmtShort(formation.dateFin)}` : ""}
                              </p>
                            )}
                            {formation.description && <p className="text-xs text-gray-500 mt-1">{formation.description}</p>}
                            {formation.certificat && (
                              <a href={formation.certificat} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline mt-0.5 inline-block">
                                Voir le certificat
                              </a>
                            )}
                          </div>
                          <button
                            onClick={() => setDeleteFormationId(formation._id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </main>

      {/* ── Delete Document Dialog ── */}
      <Dialog open={!!deleteDocId} onOpenChange={open => { if (!open) setDeleteDocId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le document</DialogTitle>
            <DialogDescription>Cette action est irréversible. Le document sera définitivement supprimé.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteDocId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteDocId && handleDeleteDocument(deleteDocId)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Note Dialog ── */}
      <Dialog open={!!deleteNoteId} onOpenChange={open => { if (!open) setDeleteNoteId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la note</DialogTitle>
            <DialogDescription>Cette note sera définitivement supprimée.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteNoteId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteNoteId && handleDeleteNote(deleteNoteId)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Formation Dialog ── */}
      <Dialog open={!!deleteFormationId} onOpenChange={open => { if (!open) setDeleteFormationId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la formation</DialogTitle>
            <DialogDescription>Cette formation sera définitivement supprimée du dossier.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteFormationId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteFormationId && handleDeleteFormation(deleteFormationId)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
