"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Eye,
  UserMinus,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────
type Frequence = "journalier" | "mensuel" | "bimestriel" | "trimestriel" | "annuel" | "personnalise"
type TypeValidation = "automatique" | "manuel"
type Priorite = "faible" | "normale" | "haute"
type StatutAssignation =
  | "non_demarre"
  | "en_cours"
  | "atteint"
  | "non_atteint"
  | "en_attente_validation"
  | "valide"

interface Objectif {
  _id: string
  titre: string
  description?: string
  frequence: Frequence
  typeValidation: TypeValidation
  regle?: { indicateur?: string; seuil?: number; devise?: string }
  categorie?: string
  priorite: Priorite
  createdAt: string
}

interface Agent {
  _id: string
  nom: string
  prenom?: string
  email: string
  role: string
}

interface Assignation {
  _id: string
  objectifId: Objectif
  agentId: Agent
  dateDebut: string
  dateFin: string
  statut: StatutAssignation
  progression: number
  commentaireAgent?: string
  preuveUrl?: string
  dateAtteint?: string
  validePar?: { nom: string; prenom?: string }
  dateValidation?: string
}

// ── Status config ─────────────────────────────────────────────

const STATUT_CONFIG: Record<StatutAssignation, { label: string; badgeClass: string }> = {
  non_demarre: { label: "Non démarré", badgeClass: "bg-slate-100 text-slate-600 border-slate-200" },
  en_cours: { label: "En cours", badgeClass: "bg-blue-100 text-blue-700 border-blue-200" },
  atteint: { label: "Atteint", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  non_atteint: { label: "Non atteint", badgeClass: "bg-red-100 text-red-600 border-red-200" },
  en_attente_validation: { label: "En attente", badgeClass: "bg-amber-100 text-amber-700 border-amber-200" },
  valide: { label: "Validé", badgeClass: "bg-purple-100 text-purple-700 border-purple-200" },
}

const FREQUENCE_LABELS: Record<Frequence, string> = {
  journalier: "Journalier",
  mensuel: "Mensuel",
  bimestriel: "Bimestriel",
  trimestriel: "Trimestriel",
  annuel: "Annuel",
  personnalise: "Personnalisé",
}

const PRIORITE_CONFIG: Record<Priorite, { label: string; badgeClass: string }> = {
  faible: { label: "Faible", badgeClass: "bg-gray-100 text-gray-600" },
  normale: { label: "Normale", badgeClass: "bg-blue-100 text-blue-600" },
  haute: { label: "Haute", badgeClass: "bg-red-100 text-red-600" },
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

// ── Component ─────────────────────────────────────────────────

export default function ObjectifsAdminPage() {
  const [objectifs, setObjectifs] = useState<Objectif[]>([])
  const [assignations, setAssignations] = useState<Assignation[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)

  // Filtres assignations
  const [filterAgent, setFilterAgent] = useState("all")
  const [filterStatut, setFilterStatut] = useState("all")

  // Dialog objectif
  const [objDialogOpen, setObjDialogOpen] = useState(false)
  const [editObj, setEditObj] = useState<Objectif | null>(null)
  const [formTitre, setFormTitre] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formFrequence, setFormFrequence] = useState<Frequence>("mensuel")
  const [formType, setFormType] = useState<TypeValidation>("manuel")
  const [formIndicateur, setFormIndicateur] = useState("")
  const [formSeuil, setFormSeuil] = useState("")
  const [formDevise, setFormDevise] = useState("USD")
  const [formCategorie, setFormCategorie] = useState("")
  const [formPriorite, setFormPriorite] = useState<Priorite>("normale")
  const [isSaving, setIsSaving] = useState(false)

  // Dialog assignation
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignObjId, setAssignObjId] = useState("")
  const [assignAgentId, setAssignAgentId] = useState("")
  const [assignDateDebut, setAssignDateDebut] = useState("")
  const [assignDateFin, setAssignDateFin] = useState("")
  const [isAssigning, setIsAssigning] = useState(false)

  // Dialog détail assignation
  const [detailDialog, setDetailDialog] = useState<Assignation | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Dialog désassigner
  const [desassignPending, setDesassignPending] = useState<{ assignId: string; nomAgent: string; titreObjectif: string } | null>(null)
  const [isDesassigning, setIsDesassigning] = useState(false)

  // Dialog supprimer objectif
  const [deleteConfirmObj, setDeleteConfirmObj] = useState<Objectif | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteWarningMsg, setDeleteWarningMsg] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  const fetchObjectifs = useCallback(async () => {
    try {
      const res = await axios.get(`${api}/objectifs`, { headers })
      setObjectifs(res.data.data || [])
    } catch {
      toast.error("Impossible de charger les objectifs")
    }
  }, [])

  const fetchAssignations = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (filterAgent !== "all") params.agentId = filterAgent
      if (filterStatut !== "all") params.statut = filterStatut

      const res = await axios.get(`${api}/objectifs/assignations`, { headers, params })
      setAssignations(res.data.data || [])
      if (res.data.agents) setAgents(res.data.agents)
    } catch {
      toast.error("Impossible de charger les assignations")
    }
  }, [filterAgent, filterStatut])

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    await Promise.all([fetchObjectifs(), fetchAssignations()])
    setIsLoading(false)
  }, [fetchObjectifs, fetchAssignations])

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { fetchAssignations() }, [filterAgent, filterStatut])

  // ── Check auto ────────────────────────────────────────────
  const handleCheckAuto = async () => {
    setIsChecking(true)
    try {
      const res = await axios.post(`${api}/objectifs/check-auto`, {}, { headers })
      toast.success(`Vérification terminée — ${res.data.checked} objectif(s) vérifié(s)`)
      fetchAssignations()
    } catch {
      toast.error("Erreur lors de la vérification")
    } finally {
      setIsChecking(false)
    }
  }

  // ── Objectif CRUD ─────────────────────────────────────────
  function openCreateObj() {
    setEditObj(null)
    setFormTitre("")
    setFormDesc("")
    setFormFrequence("mensuel")
    setFormType("manuel")
    setFormIndicateur("")
    setFormSeuil("")
    setFormDevise("USD")
    setFormCategorie("")
    setFormPriorite("normale")
    setObjDialogOpen(true)
  }

  function openEditObj(obj: Objectif) {
    setEditObj(obj)
    setFormTitre(obj.titre)
    setFormDesc(obj.description || "")
    setFormFrequence(obj.frequence)
    setFormType(obj.typeValidation)
    setFormIndicateur(obj.regle?.indicateur || "")
    setFormSeuil(obj.regle?.seuil?.toString() || "")
    setFormDevise(obj.regle?.devise || "USD")
    setFormCategorie(obj.categorie || "")
    setFormPriorite(obj.priorite)
    setObjDialogOpen(true)
  }

  async function handleSaveObj() {
    if (!formTitre.trim()) { toast.error("Le titre est requis"); return }
    if (formType === "automatique" && (!formIndicateur || !formSeuil)) {
      toast.error("L'indicateur et le seuil sont requis pour une validation automatique")
      return
    }
    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        titre: formTitre,
        description: formDesc,
        frequence: formFrequence,
        typeValidation: formType,
        categorie: formCategorie,
        priorite: formPriorite,
      }
      if (formType === "automatique") {
        payload.regle = { indicateur: formIndicateur, seuil: Number(formSeuil), devise: formDevise }
      }
      if (editObj) {
        await axios.put(`${api}/objectifs/${editObj._id}`, payload, { headers })
        toast.success("Objectif mis à jour")
      } else {
        await axios.post(`${api}/objectifs`, payload, { headers })
        toast.success("Objectif créé")
      }
      setObjDialogOpen(false)
      fetchObjectifs()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteObj(obj: Objectif) {
    setDeleteConfirmObj(obj)
  }

  async function confirmDeleteObj() {
    if (!deleteConfirmObj) return
    setIsDeleting(true)
    try {
      await axios.delete(`${api}/objectifs/${deleteConfirmObj._id}`, { headers })
      toast.success("Objectif supprimé")
      setDeleteConfirmObj(null)
      fetchObjectifs()
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: { message?: string; hasAssignations?: boolean } } })?.response?.data
      if (resp?.hasAssignations) {
        setDeleteConfirmObj(null)
        setDeleteWarningMsg(resp.message || "Cet objectif est assigné à des agents. Désassignez-le avant de le supprimer.")
      } else {
        toast.error(resp?.message || "Erreur lors de la suppression")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Assigner ──────────────────────────────────────────────
  function openAssign(objId?: string) {
    setAssignObjId(objId || "")
    setAssignAgentId("")
    setAssignDateDebut("")
    setAssignDateFin("")
    setAssignDialogOpen(true)
  }

  async function handleAssign() {
    if (!assignObjId || !assignAgentId || !assignDateDebut || !assignDateFin) {
      toast.error("Tous les champs sont requis")
      return
    }
    setIsAssigning(true)
    try {
      await axios.post(
        `${api}/objectifs/assigner`,
        { objectifId: assignObjId, agentId: assignAgentId, dateDebut: assignDateDebut, dateFin: assignDateFin },
        { headers }
      )
      toast.success("Objectif assigné avec succès")
      setAssignDialogOpen(false)
      fetchAssignations()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Erreur lors de l'assignation")
    } finally {
      setIsAssigning(false)
    }
  }

  // ── Désassigner ───────────────────────────────────────────
  function handleDesassigner(assignId: string, nomAgent: string, titreObjectif: string) {
    setDesassignPending({ assignId, nomAgent, titreObjectif })
  }

  async function confirmDesassigner() {
    if (!desassignPending) return
    setIsDesassigning(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      await axios.delete(`${api}/objectifs/assignations/${desassignPending.assignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Objectif désassigné")
      setDesassignPending(null)
      fetchAssignations()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Erreur lors de la désassignation")
    } finally {
      setIsDesassigning(false)
    }
  }

  // ── Valider / Rejeter ─────────────────────────────────────
  async function handleValider(assignId: string, action: "valider" | "rejeter") {
    setIsValidating(true)
    try {
      await axios.put(`${api}/objectifs/assignations/${assignId}/valider`, { action }, { headers })
      toast.success(action === "valider" ? "Objectif validé" : "Objectif rejeté — remis en cours")
      setDetailDialog(null)
      fetchAssignations()
    } catch {
      toast.error("Erreur lors de la validation")
    } finally {
      setIsValidating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#002952]" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#002952] flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Objectifs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestion des objectifs employés</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckAuto}
            disabled={isChecking}
            className="gap-2"
          >
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Vérifier objectifs auto
          </Button>
          <Button
            size="sm"
            onClick={() => openAssign()}
            className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Assigner un objectif
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={openCreateObj}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Créer un objectif
          </Button>
        </div>
      </div>

      <Tabs defaultValue="assignations">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="assignations" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignations ({assignations.length})
          </TabsTrigger>
          <TabsTrigger value="objectifs" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Définitions ({objectifs.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Assignations ── */}
        <TabsContent value="assignations" className="space-y-4 mt-4">
          {/* Filtres */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les agents</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.nom} {a.prenom || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {(Object.entries(STATUT_CONFIG) as [StatutAssignation, { label: string; badgeClass: string }][]).map(
                  ([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {assignations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune assignation trouvée</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Agent</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Objectif</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Période</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Progression</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {assignations.map((a) => {
                    const seuil = a.objectifId?.regle?.seuil
                    const pct = seuil && seuil > 0 ? Math.min(100, Math.round((a.progression / seuil) * 100)) : null
                    return (
                      <tr key={a._id} className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {a.agentId?.nom} {a.agentId?.prenom || ""}
                          </div>
                          <div className="text-xs text-gray-400">{a.agentId?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white max-w-[200px] truncate">
                            {a.objectifId?.titre}
                          </div>
                          <div className="text-xs text-gray-400">
                            {a.objectifId?.typeValidation === "automatique" ? "Auto" : "Manuel"} ·{" "}
                            {a.objectifId?.frequence ? FREQUENCE_LABELS[a.objectifId.frequence] : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          <div>{fmt(a.dateDebut)}</div>
                          <div>→ {fmt(a.dateFin)}</div>
                        </td>
                        <td className="px-4 py-3">
                          {pct !== null ? (
                            <div className="space-y-1 min-w-[100px]">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {a.progression.toLocaleString("fr-FR")}
                                </span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{pct}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STATUT_CONFIG[a.statut].badgeClass}`}
                          >
                            {STATUT_CONFIG[a.statut].label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDetailDialog(a)}
                              className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600"
                              title="Voir le détail"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDesassigner(a._id, `${a.agentId?.nom} ${a.agentId?.prenom || ""}`.trim(), a.objectifId?.titre)}
                              className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Désassigner"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                            {a.statut === "en_attente_validation" && (
                              <>
                                <button
                                  onClick={() => handleValider(a._id, "valider")}
                                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-emerald-100 text-gray-400 hover:text-emerald-600"
                                  title="Valider"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleValider(a._id, "rejeter")}
                                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                                  title="Rejeter"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Tab Définitions d'objectifs ── */}
        <TabsContent value="objectifs" className="mt-4">
          {objectifs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun objectif créé</p>
              <Button size="sm" onClick={openCreateObj} className="mt-4 bg-[#002952] hover:bg-[#003b7a] text-white gap-2">
                <Plus className="h-4 w-4" />
                Créer le premier objectif
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {objectifs.map((obj) => (
                <Card key={obj._id} className="border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{obj.titre}</h3>
                        {obj.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">{obj.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditObj(obj)}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteObj(obj)}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        {FREQUENCE_LABELS[obj.frequence]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITE_CONFIG[obj.priorite].badgeClass}`}>
                        {PRIORITE_CONFIG[obj.priorite].label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${obj.typeValidation === "automatique" ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"}`}>
                        {obj.typeValidation === "automatique" ? "Auto" : "Manuel"}
                      </span>
                    </div>
                    {obj.typeValidation === "automatique" && obj.regle?.seuil && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Seuil : {obj.regle.seuil.toLocaleString("fr-FR")} {obj.regle.devise || "USD"}
                      </p>
                    )}
                    {obj.categorie && (
                      <p className="text-xs text-gray-400">Catégorie : {obj.categorie}</p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openAssign(obj._id)}
                      className="w-full h-7 text-xs gap-1 text-[#002952] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-dashed border-blue-200 dark:border-blue-800 mt-2"
                    >
                      <Plus className="h-3 w-3" />
                      Assigner à un employé
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog Créer/Modifier objectif ── */}
      <Dialog open={objDialogOpen} onOpenChange={setObjDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#002952]" />
              {editObj ? "Modifier l'objectif" : "Créer un objectif"}
            </DialogTitle>
            <DialogDescription>Définissez les paramètres de l&apos;objectif.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Total paiements mensuel" value={formTitre} onChange={(e) => setFormTitre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Description détaillée..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fréquence</Label>
                <Select value={formFrequence} onValueChange={(v) => setFormFrequence(v as Frequence)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(FREQUENCE_LABELS) as [Frequence, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type de validation</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as TypeValidation)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manuel">Manuel</SelectItem>
                    <SelectItem value="automatique">Automatique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formType === "automatique" && (
              <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3 space-y-3">
                <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Règle de validation automatique</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Indicateur</Label>
                  <Select value={formIndicateur} onValueChange={setFormIndicateur}>
                    <SelectTrigger><SelectValue placeholder="Choisir un indicateur" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total_paiements">Total paiements encaissés (montant)</SelectItem>
                      <SelectItem value="nombre_clients">Nombre de clients enregistrés</SelectItem>
                      <SelectItem value="nombre_prospects">Nombre de prospects enregistrés</SelectItem>
                      <SelectItem value="nombre_contrats">Nombre de contrats à créer</SelectItem>
                      <SelectItem value="nombre_terrains_acquis">Nombre de terrains acquis</SelectItem>
                      <SelectItem value="nombre_terrains_vendus">Nombre de terrains vendus</SelectItem>
                      <SelectItem value="nombre_presences">Nombre de jours de présence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={`grid gap-3 ${formIndicateur === "total_paiements" ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Seuil cible <span className="text-red-500">*</span>
                      {formIndicateur && formIndicateur !== "total_paiements" && (
                        <span className="ml-1 font-normal text-gray-400">(nombre)</span>
                      )}
                    </Label>
                    <Input type="number" placeholder={formIndicateur === "total_paiements" ? "5000" : "10"} value={formSeuil} onChange={(e) => setFormSeuil(e.target.value)} />
                  </div>
                  {formIndicateur === "total_paiements" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Devise</Label>
                      <Select value={formDevise} onValueChange={setFormDevise}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="CDF">CDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Input placeholder="Ex: Performance" value={formCategorie} onChange={(e) => setFormCategorie(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select value={formPriorite} onValueChange={(v) => setFormPriorite(v as Priorite)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faible">Faible</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveObj} disabled={isSaving} className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {editObj ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Assigner ── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#002952]" />
              Assigner un objectif
            </DialogTitle>
            <DialogDescription>Choisissez l&apos;objectif, l&apos;employé et la période.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Objectif <span className="text-red-500">*</span></Label>
              <Select value={assignObjId} onValueChange={setAssignObjId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un objectif" /></SelectTrigger>
                <SelectContent>
                  {objectifs.map((o) => (
                    <SelectItem key={o._id} value={o._id}>{o.titre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employé <span className="text-red-500">*</span></Label>
              <Select value={assignAgentId} onValueChange={setAssignAgentId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a._id} value={a._id}>{a.nom} {a.prenom || ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date début <span className="text-red-500">*</span></Label>
                <Input type="date" value={assignDateDebut} onChange={(e) => setAssignDateDebut(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Date fin <span className="text-red-500">*</span></Label>
                <Input type="date" value={assignDateFin} onChange={(e) => setAssignDateFin(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAssign} disabled={isAssigning} className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2">
              {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmation Désassigner ── */}
      <Dialog open={!!desassignPending} onOpenChange={() => setDesassignPending(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-red-500" />
              Désassigner l&apos;objectif
            </DialogTitle>
            <DialogDescription>
              Voulez-vous désassigner &ldquo;{desassignPending?.titreObjectif}&rdquo; de{" "}
              <strong>{desassignPending?.nomAgent}</strong> ? Cette action supprimera le suivi de progression.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesassignPending(null)} disabled={isDesassigning}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDesassigner}
              disabled={isDesassigning}
              className="gap-2"
            >
              {isDesassigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
              Désassigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmation Supprimer objectif ── */}
      <Dialog open={!!deleteConfirmObj} onOpenChange={() => setDeleteConfirmObj(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Supprimer l&apos;objectif
            </DialogTitle>
            <DialogDescription>
              Voulez-vous supprimer l&apos;objectif &ldquo;<strong>{deleteConfirmObj?.titre}</strong>&rdquo; ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmObj(null)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteObj}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Warning — objectif assigné ── */}
      <Dialog open={!!deleteWarningMsg} onOpenChange={() => setDeleteWarningMsg(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Users className="h-5 w-5" />
              Objectif assigné à des agents
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-700 dark:text-gray-300 mt-2">
              {deleteWarningMsg}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteWarningMsg(null)}>
              Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Détail assignation ── */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          {detailDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#002952]" />
                  Détail de l&apos;assignation
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Objectif</p>
                    <p className="font-medium text-gray-900 dark:text-white">{detailDialog.objectifId?.titre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Agent</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {detailDialog.agentId?.nom} {detailDialog.agentId?.prenom || ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Période</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {fmt(detailDialog.dateDebut)} → {fmt(detailDialog.dateFin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Statut</p>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STATUT_CONFIG[detailDialog.statut].badgeClass}`}>
                      {STATUT_CONFIG[detailDialog.statut].label}
                    </span>
                  </div>
                </div>
                {detailDialog.commentaireAgent && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Commentaire agent</p>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 rounded p-2 text-xs">
                      {detailDialog.commentaireAgent}
                    </p>
                  </div>
                )}
                {detailDialog.preuveUrl && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Pièce justificative</p>
                    <a href={detailDialog.preuveUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline">
                      Voir le document
                    </a>
                  </div>
                )}
              </div>
              {detailDialog.statut === "en_attente_validation" && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => handleValider(detailDialog._id, "rejeter")}
                    disabled={isValidating}
                    className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Rejeter
                  </Button>
                  <Button
                    onClick={() => handleValider(detailDialog._id, "valider")}
                    disabled={isValidating}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Valider
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
