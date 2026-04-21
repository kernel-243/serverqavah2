"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  Video,
  Plus,
  Clock,
  Users,
  ExternalLink,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  MessageSquare,
  ChevronRight,
  Info,
  Repeat,
  User,
  CheckCircle2,
  XCircle,
  PlayCircle,
} from "lucide-react"
import { AIRewriteButton } from "@/components/ai-rewrite-button"
import { VoiceInputButton } from "@/components/voice-input-button"

// ── Types ─────────────────────────────────────────────────────────────────────

type ReunionStatut = "planifiee" | "en_cours" | "terminee" | "annulee"

interface UserRef {
  _id: string
  nom: string
  prenom?: string
  email: string
}

interface Reunion {
  _id: string
  nom: string
  moderateur: UserRef
  lien: string
  duree: number
  commentaire?: string
  resume?: string
  dateHeure: string
  statut: ReunionStatut
  recurrence: {
    active: boolean
    jours: number[]
  }
  addBy?: UserRef
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<ReunionStatut, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  planifiee: {
    label: "Planifiée",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
    icon: <Calendar className="h-3 w-3" />,
  },
  en_cours: {
    label: "En cours",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
    icon: <PlayCircle className="h-3 w-3" />,
  },
  terminee: {
    label: "Terminée",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  annulee: {
    label: "Annulée",
    badgeClass: "bg-red-100 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
    icon: <XCircle className="h-3 w-3" />,
  },
}

const TYPE_COLORS: Record<string, string> = {
  "Réunion de performance": "bg-[#002952]/10 text-[#002952] border-[#002952]/20 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  "Réunion de suivi": "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  "Réunion d'équipe": "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
  "Formation": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  "Point hebdomadaire": "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
  "Autre": "bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600",
}

const DEFAULT_TYPES = [
  "Réunion de performance",
  "Réunion de suivi",
  "Réunion d'équipe",
  "Formation",
  "Point hebdomadaire",
  "Autre",
]

const JOURS_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

const DUREE_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 heure" },
  { value: "90", label: "1h 30" },
  { value: "120", label: "2 heures" },
  { value: "180", label: "3 heures" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return {
    date: d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    dayShort: d.toLocaleDateString("fr-FR", { weekday: "short" }),
    day: d.getDate(),
    month: d.toLocaleDateString("fr-FR", { month: "short" }),
    isToday: new Date(dateStr).toDateString() === new Date().toDateString(),
    isPast: new Date(dateStr) < new Date(),
  }
}

function formatDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function userName(u: UserRef) {
  return `${u.nom}${u.prenom ? " " + u.prenom : ""}`
}

function StatutBadge({ statut }: { statut: ReunionStatut }) {
  const cfg = STATUT_CONFIG[statut]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReunionPage() {
  const [currentUser, setCurrentUser] = useState<UserRef | null>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [reunions, setReunions] = useState<Reunion[]>([])
  const [users, setUsers] = useState<UserRef[]>([])
  const [types, setTypes] = useState<string[]>(DEFAULT_TYPES)
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")

  // Create/edit dialog
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editReunion, setEditReunion] = useState<Reunion | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formNom, setFormNom] = useState("Réunion de performance")
  const [formModerateur, setFormModerateur] = useState("")
  const [formLien, setFormLien] = useState("")
  const [formDuree, setFormDuree] = useState("60")
  const [formDateHeure, setFormDateHeure] = useState("")
  const [formCommentaire, setFormCommentaire] = useState("")
  const [formStatut, setFormStatut] = useState<ReunionStatut>("planifiee")
  const [formRecurrence, setFormRecurrence] = useState(false)
  const [formJours, setFormJours] = useState<number[]>([1, 3, 5]) // Mon, Wed, Fri

  // Resume dialog
  const [resumeReunion, setResumeReunion] = useState<Reunion | null>(null)
  const [resumeText, setResumeText] = useState("")
  const [isSavingResume, setIsSavingResume] = useState(false)

  // Detail dialog
  const [detailReunion, setDetailReunion] = useState<Reunion | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await axios.get(`${api}/users/me`, { headers })
      setCurrentUser(res.data)
      setUserRole(res.data.role)
    } catch { /* ignore */ }
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(`${api}/reunions`, {
        headers,
        params: { range: tab === "upcoming" ? "upcoming" : "past" },
      })
      setReunions(res.data.data || [])
      if (res.data.users) setUsers(res.data.users)
      if (res.data.types) setTypes(res.data.types)
    } catch {
      toast.error("Impossible de charger les réunions")
    } finally {
      setIsLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchCurrentUser() }, [])
  useEffect(() => { fetchData() }, [tab])

  // ── Form helpers ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditReunion(null)
    setFormNom("Réunion de performance")
    setFormModerateur("")
    setFormLien("")
    setFormDuree("60")
    setFormDateHeure("")
    setFormCommentaire("")
    setFormStatut("planifiee")
    setFormRecurrence(false)
    setFormJours([1, 3, 5])
    setIsFormOpen(true)
  }

  function openEdit(r: Reunion) {
    setEditReunion(r)
    setFormNom(r.nom)
    setFormModerateur(r.moderateur._id)
    setFormLien(r.lien)
    setFormDuree(String(r.duree))
    setFormDateHeure(new Date(r.dateHeure).toISOString().slice(0, 16))
    setFormCommentaire(r.commentaire || "")
    setFormStatut(r.statut)
    setFormRecurrence(r.recurrence?.active || false)
    setFormJours(r.recurrence?.jours || [1, 3, 5])
    setIsFormOpen(true)
  }

  function toggleJour(j: number) {
    setFormJours(prev =>
      prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]
    )
  }

  async function handleSubmitForm() {
    if (!formNom || !formModerateur || !formLien || !formDateHeure) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }
    setIsSubmitting(true)
    try {
      const payload = {
        nom: formNom,
        moderateur: formModerateur,
        lien: formLien,
        duree: parseInt(formDuree),
        commentaire: formCommentaire,
        dateHeure: new Date(formDateHeure).toISOString(),
        statut: formStatut,
        recurrence: { active: formRecurrence, jours: formRecurrence ? formJours : [] },
      }

      if (editReunion) {
        await axios.put(`${api}/reunions/${editReunion._id}`, payload, { headers })
        toast.success("Réunion mise à jour")
      } else {
        await axios.post(`${api}/reunions`, payload, { headers })
        toast.success("Réunion planifiée")
      }
      setIsFormOpen(false)
      fetchData()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Erreur lors de l'enregistrement")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette réunion ?")) return
    try {
      await axios.delete(`${api}/reunions/${id}`, { headers })
      toast.success("Réunion supprimée")
      fetchData()
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  function openResume(r: Reunion) {
    setResumeReunion(r)
    setResumeText(r.resume || "")
  }

  async function handleSaveResume() {
    if (!resumeReunion) return
    setIsSavingResume(true)
    try {
      await axios.put(`${api}/reunions/${resumeReunion._id}/resume`, { resume: resumeText }, { headers })
      toast.success("Résumé enregistré")
      setResumeReunion(null)
      fetchData()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Erreur lors de l'enregistrement")
    } finally {
      setIsSavingResume(false)
    }
  }

  const isAdmin = userRole === "Admin"

  function canEditResume(r: Reunion): boolean {
    if (!currentUser) return false
    // Les réunions passées (avant aujourd'hui) ne peuvent plus être résumées
    const reunionDate = new Date(r.dateHeure)
    reunionDate.setHours(0, 0, 0, 0)
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    if (reunionDate < todayMidnight) return false
    if (isAdmin) return true
    return r.moderateur._id === currentUser._id
  }

  // ── Group by date for display ─────────────────────────────────────────────

  function groupByDate(list: Reunion[]) {
    const groups: Record<string, Reunion[]> = {}
    for (const r of list) {
      const key = new Date(r.dateHeure).toDateString()
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }
    return Object.entries(groups).map(([key, items]) => ({
      key,
      date: new Date(items[0].dateHeure),
      items,
    }))
  }

  const grouped = groupByDate(reunions)

  // ── Default schedule banner ───────────────────────────────────────────────

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#002952] flex items-center justify-center">
            <Video className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Réunions</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Calendrier des réunions d&apos;équipe</p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={openCreate}
            className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Planifier une réunion
          </Button>
        )}
      </div>

      {/* Default schedule banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Repeat className="h-4 w-4 text-[#002952] dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-[#002952] dark:text-blue-300">
          <span className="font-semibold">Planning habituel :</span> Les réunions se tiennent par défaut chaque{" "}
          <span className="font-semibold">Lundi</span>,{" "}
          <span className="font-semibold">Mercredi</span> et{" "}
          <span className="font-semibold">Vendredi</span>.
          {isAdmin && <span className="text-blue-600 dark:text-blue-400"> Cliquez sur « Planifier » pour créer une réunion récurrente.</span>}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as "upcoming" | "past")}>
        <TabsList className="bg-gray-100 dark:bg-slate-800">
          <TabsTrigger value="upcoming">À venir</TabsTrigger>
          <TabsTrigger value="past">Passées</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#002952]" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
          <Calendar className="h-10 w-10 opacity-30" />
          <p className="text-sm">Aucune réunion {tab === "upcoming" ? "à venir" : "passée"}</p>
          {isAdmin && tab === "upcoming" && (
            <Button size="sm" onClick={openCreate} variant="outline" className="gap-2 mt-1">
              <Plus className="h-4 w-4" /> Planifier maintenant
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => {
            const dt = formatDateTime(group.items[0].dateHeure)
            return (
              <div key={group.key}>
                {/* Date separator */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex flex-col items-center justify-center h-12 w-12 rounded-xl border-2 text-center shrink-0 ${
                    dt.isToday
                      ? "border-[#002952] bg-[#002952] text-white"
                      : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                  }`}>
                    <span className="text-lg font-bold leading-none">{dt.day}</span>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">{dt.month}</span>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold capitalize ${dt.isToday ? "text-[#002952] dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {dt.isToday ? "Aujourd'hui · " : ""}{group.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <p className="text-xs text-gray-400">{group.items.length} réunion{group.items.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-slate-700 ml-2" />
                </div>

                {/* Meeting cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 ml-0 sm:ml-16">
                  {group.items.map(r => {
                    const rdt = formatDateTime(r.dateHeure)
                    return (
                      <Card
                        key={r._id}
                        className={`border transition-all hover:shadow-md dark:hover:shadow-slate-900/50 ${
                          rdt.isToday
                            ? "border-[#002952]/30 dark:border-blue-700/50 shadow-sm shadow-blue-100 dark:shadow-blue-900/20"
                            : "border-gray-200 dark:border-slate-700"
                        }`}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* Top row: type + statut */}
                          <div className="flex items-start justify-between gap-2">
                            <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${
                              TYPE_COLORS[r.nom] || TYPE_COLORS["Autre"]
                            }`}>
                              {r.nom}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <StatutBadge statut={r.statut} />
                              {r.recurrence?.active && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 dark:text-gray-500">
                                  <Repeat className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time + duration */}
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-medium text-gray-900 dark:text-white">{rdt.time}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="text-gray-300 dark:text-gray-600">·</span>
                              {formatDuree(r.duree)}
                            </span>
                          </div>

                          {/* Moderator */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>Modérateur :</span>
                            <span className="font-medium text-gray-900 dark:text-white">{userName(r.moderateur)}</span>
                          </div>

                          {/* Comment */}
                          {r.commentaire && (
                            <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                              <span className="line-clamp-2">{r.commentaire}</span>
                            </div>
                          )}

                          {/* Resume preview */}
                          {r.resume && (
                            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2">
                              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> Résumé
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap">
                                {r.resume}
                              </p>
                            </div>
                          )}

                          {/* Actions row */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {/* Join meeting */}
                            <a
                              href={r.lien}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#002952] hover:bg-[#003b7a] text-white transition-colors"
                            >
                              <Video className="h-3.5 w-3.5" />
                              Rejoindre
                              <ExternalLink className="h-3 w-3 opacity-70" />
                            </a>

                            {/* Resume button (moderator + admin) */}
                            {canEditResume(r) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openResume(r)}
                                className="h-7 text-xs gap-1.5"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                {r.resume ? "Modifier le résumé" : "Ajouter un résumé"}
                              </Button>
                            )}

                            {/* Detail */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDetailReunion(r)}
                              className="h-7 text-xs gap-1 text-gray-500 ml-auto"
                            >
                              Détails <ChevronRight className="h-3 w-3" />
                            </Button>

                            {/* Admin actions */}
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEdit(r)}
                                  className="h-7 w-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDelete(r._id)}
                                  className="h-7 w-7 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CREATE / EDIT DIALOG ── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Video className="h-5 w-5 text-[#002952] dark:text-blue-300" />
              {editReunion ? "Modifier la réunion" : "Planifier une réunion"}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations de la réunion
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type de réunion */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Type de réunion <span className="text-red-500">*</span></Label>
              <Select value={formNom} onValueChange={setFormNom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modérateur */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Modérateur <span className="text-red-500">*</span></Label>
              <Select value={formModerateur} onValueChange={setFormModerateur}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un modérateur" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u._id} value={u._id}>
                      {userName(u)} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date et heure */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date et heure <span className="text-red-500">*</span></Label>
              <Input
                type="datetime-local"
                value={formDateHeure}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setFormDateHeure(e.target.value)}
              />
            </div>

            {/* Durée */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Durée</Label>
              <Select value={formDuree} onValueChange={setFormDuree}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DUREE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lien Google Meet */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-gray-400" />
                Lien Google Meet <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={formLien}
                onChange={e => setFormLien(e.target.value)}
              />
            </div>

            {/* Statut (édition seulement) */}
            {editReunion && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Statut</Label>
                <Select value={formStatut} onValueChange={v => setFormStatut(v as ReunionStatut)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUT_CONFIG) as [ReunionStatut, typeof STATUT_CONFIG[ReunionStatut]][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">{cfg.icon} {cfg.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Récurrence */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formRecurrence}
                  onClick={() => setFormRecurrence(!formRecurrence)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    formRecurrence ? "bg-[#002952]" : "bg-gray-200 dark:bg-slate-700"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    formRecurrence ? "translate-x-4.5" : "translate-x-0.5"
                  }`} />
                </button>
                <Label className="text-sm font-medium cursor-pointer" onClick={() => setFormRecurrence(!formRecurrence)}>
                  Récurrence hebdomadaire
                </Label>
              </div>
              {formRecurrence && (
                <div className="ml-11 flex items-center gap-1 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 0].map(j => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => toggleJour(j)}
                      className={`h-8 w-10 rounded-lg text-xs font-medium border transition-colors ${
                        formJours.includes(j)
                          ? "bg-[#002952] border-[#002952] text-white"
                          : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 hover:border-[#002952] dark:hover:border-blue-600"
                      }`}
                    >
                      {JOURS_LABELS[j]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Commentaire */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Commentaire</Label>
              <Textarea
                placeholder="Informations supplémentaires (optionnel)"
                value={formCommentaire}
                onChange={e => setFormCommentaire(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSubmitForm}
              disabled={isSubmitting}
              className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              {editReunion ? "Mettre à jour" : "Planifier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RESUME DIALOG ── */}
      <Dialog open={!!resumeReunion} onOpenChange={o => !o && setResumeReunion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#002952] dark:text-blue-300" />
              Résumé de la réunion
            </DialogTitle>
            {resumeReunion && (
              <DialogDescription>
                {resumeReunion.nom} · {formatDateTime(resumeReunion.dateHeure).date}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Résumé de la réunion</Label>
                <AIRewriteButton
                  getValue={() => resumeText}
                  onApply={text => setResumeText(text)}
                />
                <VoiceInputButton
                  getValue={() => resumeText}
                  onUpdate={text => setResumeText(text)}
                  onApply={text => setResumeText(text)}
                />
              </div>
              <Textarea
                placeholder="Rédigez le résumé de la réunion : points discutés, décisions prises, prochaines étapes..."
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                rows={10}
                className="resize-none"
              />
              <p className="text-xs text-gray-400">
                Vous pouvez utiliser les boutons IA et microphone pour vous aider à rédiger.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeReunion(null)}>Annuler</Button>
            <Button
              onClick={handleSaveResume}
              disabled={isSavingResume}
              className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2"
            >
              {isSavingResume ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Enregistrer le résumé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DETAIL DIALOG ── */}
      <Dialog open={!!detailReunion} onOpenChange={o => !o && setDetailReunion(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Video className="h-5 w-5 text-[#002952] dark:text-blue-300" />
              Détails de la réunion
            </DialogTitle>
          </DialogHeader>

          {detailReunion && (() => {
            const ddt = formatDateTime(detailReunion.dateHeure)
            return (
              <div className="space-y-4 py-2">
                <div className="flex items-start gap-3">
                  <span className={`inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full border ${
                    TYPE_COLORS[detailReunion.nom] || TYPE_COLORS["Autre"]
                  }`}>
                    {detailReunion.nom}
                  </span>
                  <StatutBadge statut={detailReunion.statut} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</p>
                    <p className="text-gray-900 dark:text-white capitalize">{ddt.date}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Heure</p>
                    <p className="text-gray-900 dark:text-white font-semibold">{ddt.time}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Durée</p>
                    <p className="text-gray-900 dark:text-white">{formatDuree(detailReunion.duree)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Modérateur</p>
                    <p className="text-gray-900 dark:text-white">{userName(detailReunion.moderateur)}</p>
                  </div>
                </div>

                {detailReunion.recurrence?.active && (
                  <div className="flex items-center gap-2 text-sm text-[#002952] dark:text-blue-400">
                    <Repeat className="h-4 w-4" />
                    <span>Récurrente les{" "}
                      {detailReunion.recurrence.jours.map(j => JOURS_LABELS[j]).join(", ")}
                    </span>
                  </div>
                )}

                {detailReunion.commentaire && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Commentaire</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{detailReunion.commentaire}</p>
                  </div>
                )}

                {detailReunion.resume && (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/10 p-4">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> Résumé de la réunion
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{detailReunion.resume}</p>
                  </div>
                )}

                {/* Join link */}
                <div className="flex gap-2 pt-2">
                  <a
                    href={detailReunion.lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#002952] hover:bg-[#003b7a] text-white transition-colors"
                  >
                    <Video className="h-4 w-4" />
                    Rejoindre la réunion
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </a>
                  {canEditResume(detailReunion) && (
                    <Button
                      variant="outline"
                      onClick={() => { setDetailReunion(null); openResume(detailReunion) }}
                      className="gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {detailReunion.resume ? "Résumé" : "+ Résumé"}
                    </Button>
                  )}
                </div>
              </div>
            )
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailReunion(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
