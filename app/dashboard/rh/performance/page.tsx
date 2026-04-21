"use client"

import { useState, useEffect, useCallback } from "react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  Target,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  RotateCcw,
} from "lucide-react"
import { AIRewriteButton } from "@/components/ai-rewrite-button"
import { VoiceInputButton } from "@/components/voice-input-button"

// ── Types ────────────────────────────────────────────────────────────────────

type TacheStatut = "a_faire" | "en_cours" | "completee" | "reportee" | "annulee"

interface Agent {
  _id: string
  nom: string
  prenom?: string
  email: string
  role: string
}

interface Tache {
  _id: string
  agentId: { _id: string; nom: string; prenom?: string; email: string }
  titre: string
  description?: string
  statut: TacheStatut
  dateCible: string
  heureDebut?: string | null
  heureFin?: string | null
  createdAt?: string
  updatedAt?: string
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TacheStatut,
  { label: string; badgeClass: string; icon: React.ReactNode; dotClass: string }
> = {
  a_faire: {
    label: "À faire",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    icon: <Circle className="h-3.5 w-3.5" />,
    dotClass: "bg-slate-400",
  },
  en_cours: {
    label: "En cours",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
    icon: <Clock className="h-3.5 w-3.5" />,
    dotClass: "bg-blue-500",
  },
  completee: {
    label: "Complétée",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    dotClass: "bg-emerald-500",
  },
  reportee: {
    label: "Reportée",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    dotClass: "bg-amber-500",
  },
  annulee: {
    label: "Annulée",
    badgeClass: "bg-red-100 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
    icon: <XCircle className="h-3.5 w-3.5" />,
    dotClass: "bg-red-500",
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
const DAY_NAMES_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

// Always use LOCAL date — never toISOString() which converts to UTC first
function toDateStr(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function todayStr(): string {
  return toDateStr(new Date())
}

// Extract YYYY-MM-DD from a UTC ISO string (e.g. "2026-04-03T00:00:00.000Z")
// without creating a new Date (avoids UTC→local conversion)
function isoToDateStr(iso: string): string {
  return iso.slice(0, 10)
}

function formatDateLabel(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function weekLabel(monday: Date): string {
  const sat = new Date(monday)
  sat.setDate(sat.getDate() + 5)
  return `${formatDateLabel(monday)} – ${formatDateLabel(sat)} ${sat.getFullYear()}`
}

function StatusBadge({ statut }: { statut: TacheStatut }) {
  const cfg = STATUS_CONFIG[statut]
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [currentUser, setCurrentUser] = useState<Agent | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [taches, setTaches] = useState<Tache[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()))
  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const [selectedAgent, setSelectedAgent] = useState<string>("me")

  // Dialog état
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editTache, setEditTache] = useState<Tache | null>(null)
  const [viewTache, setViewTache] = useState<Tache | null>(null)

  // Filtre par statut
  const [filterStatut, setFilterStatut] = useState<TacheStatut | null>(null)

  // Dialog reporter
  const [reportDialog, setReportDialog] = useState(false)
  const [reportTache, setReportTache] = useState<Tache | null>(null)
  const [reportDate, setReportDate] = useState("")
  const [isReporting, setIsReporting] = useState(false)
  const [formDay, setFormDay] = useState<string>("")
  const [formTitre, setFormTitre] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formStatut, setFormStatut] = useState<TacheStatut>("a_faire")
  const [formHeureDebut, setFormHeureDebut] = useState("")
  const [formHeureFin, setFormHeureFin] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  const today = todayStr()
  const isCurrentWeek = toDateStr(weekStart) === toDateStr(getMondayOfWeek(new Date()))

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await axios.get(`${api}/users/me`, { headers })
      setCurrentUser(res.data)
    } catch { /* ignore */ }
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const agentParam = selectedAgent === "me" ? undefined : selectedAgent
      const res = await axios.get(`${api}/taches`, {
        headers,
        params: {
          weekStart: toDateStr(weekStart),
          agentId: agentParam || "me",
        },
      })
      setTaches(res.data.data || [])
      if (res.data.agents) setAgents(res.data.agents)
    } catch {
      toast.error("Impossible de charger les tâches")
    } finally {
      setIsLoading(false)
    }
  }, [weekStart, selectedAgent, currentUser])

  useEffect(() => { fetchCurrentUser() }, [])
  useEffect(() => { if (currentUser) fetchData() }, [weekStart, selectedAgent, currentUser])

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getTachesForDay(dayStr: string, agentId?: string): Tache[] {
    return taches.filter(t => {
      const d = isoToDateStr(t.dateCible)
      const agentMatch = agentId ? t.agentId._id === agentId : t.agentId._id === currentUser?._id
      return d === dayStr && agentMatch
    })
  }

  function openCreate(dayStr: string) {
    setEditTache(null)
    setFormDay(dayStr)
    setFormTitre("")
    setFormDesc("")
    setFormStatut("a_faire")
    setFormHeureDebut("")
    setFormHeureFin("")
    setIsFormOpen(true)
  }

  function openEdit(t: Tache) {
    setEditTache(t)
    setFormDay(isoToDateStr(t.dateCible))
    setFormTitre(t.titre)
    setFormDesc(t.description || "")
    setFormStatut(t.statut)
    setFormHeureDebut(t.heureDebut || "")
    setFormHeureFin(t.heureFin || "")
    setIsFormOpen(true)
  }

  async function handleSubmit() {
    if (!formTitre.trim()) {
      toast.error("Le titre est requis")
      return
    }
    if (!formHeureDebut || !formHeureFin) {
      toast.error("Le créneau horaire (début et fin) est requis")
      return
    }
    setIsSubmitting(true)
    try {
      if (editTache) {
        await axios.put(`${api}/taches/${editTache._id}`, {
          titre: formTitre,
          description: formDesc,
          statut: formStatut,
          dateCible: formDay,
          heureDebut: formHeureDebut || null,
          heureFin: formHeureFin || null,
        }, { headers })
        toast.success("Tâche mise à jour")
      } else {
        await axios.post(`${api}/taches`, {
          titre: formTitre,
          description: formDesc,
          statut: formStatut,
          dateCible: formDay,
          heureDebut: formHeureDebut || null,
          heureFin: formHeureFin || null,
        }, { headers })
        toast.success("Tâche créée")
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
    if (!confirm("Supprimer cette tâche ?")) return
    try {
      await axios.delete(`${api}/taches/${id}`, { headers })
      toast.success("Tâche supprimée")
      fetchData()
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  function handleStatusChange(tache: Tache, newStatut: TacheStatut) {
    if (newStatut === "reportee") {
      // Ouvrir le dialog de report au lieu de mettre à jour directement
      setReportTache(tache)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setReportDate(toDateStr(tomorrow))
      setReportDialog(true)
      return
    }
    applyStatusChange(tache._id, newStatut)
  }

  async function applyStatusChange(tacheId: string, newStatut: TacheStatut) {
    try {
      await axios.put(`${api}/taches/${tacheId}`, { statut: newStatut }, { headers })
      setTaches(prev => prev.map(t => t._id === tacheId ? { ...t, statut: newStatut } : t))
    } catch {
      toast.error("Erreur lors de la mise à jour du statut")
    }
  }

  async function handleConfirmReport() {
    if (!reportTache || !reportDate) return
    if (reportDate <= isoToDateStr(reportTache.dateCible)) {
      toast.error("La date de report doit être postérieure à la date originale")
      return
    }
    setIsReporting(true)
    try {
      const res = await axios.post(`${api}/taches/${reportTache._id}/reporter`, {
        nouvelleDateCible: reportDate,
      }, { headers })
      // Remplacer l'originale (maintenant reportée) et ajouter la nouvelle
      const { originale, nouvelle } = res.data.data
      setTaches(prev => [
        ...prev.map(t => t._id === originale._id ? originale : t),
        nouvelle,
      ])
      toast.success("Tâche reportée — une copie a été créée pour le " + new Date(reportDate + "T12:00:00").toLocaleDateString("fr-FR"))
      setReportDialog(false)
      setReportTache(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Erreur lors du report")
    } finally {
      setIsReporting(false)
    }
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      const agentParam = selectedAgent === "me" ? currentUser?._id : selectedAgent
      const res = await axios.get(`${api}/performances/export`, {
        headers,
        params: { weekStart: toDateStr(weekStart), agentId: agentParam || "all" },
        responseType: "blob",
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement("a")
      a.href = url
      a.download = `performances_semaine_${toDateStr(weekStart)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Impossible d'exporter")
    } finally {
      setIsExporting(false)
    }
  }

  const isAdmin = currentUser?.role === "Admin"

  function canEditTache(t: Tache): boolean {
    const dateStr = isoToDateStr(t.dateCible)
    if (dateStr < today) return false
    if (isAdmin) return true
    return t.agentId._id === currentUser?._id
  }

  /** Tâche passée dont on peut encore changer le statut (non verrouillé) */
  function canUpdateStatusOnly(t: Tache): boolean {
    const dateStr = isoToDateStr(t.dateCible)
    if (dateStr >= today) return false // tâche courante/future → canEditTache gère
    if (t.statut === "completee" || t.statut === "reportee") return false
    if (isAdmin) return true
    return t.agentId._id === currentUser?._id
  }

  // ── Progress stats ────────────────────────────────────────────────────────

  function getDayStats(tasks: Tache[]) {
    const total = tasks.length
    const done = tasks.filter(t => t.statut === "completee").length
    const inProgress = tasks.filter(t => t.statut === "en_cours").length
    return { total, done, inProgress }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#002952] flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestion des tâches hebdomadaires</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Legend — cliquable pour filtrer */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {(Object.entries(STATUS_CONFIG) as [TacheStatut, typeof STATUS_CONFIG[TacheStatut]][]).map(([key, cfg]) => {
              const isActive = filterStatut === key
              return (
                <button
                  key={key}
                  onClick={() => setFilterStatut(v => v === key ? null : key)}
                  title={isActive ? "Cliquer pour retirer le filtre" : `Filtrer : ${cfg.label}`}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all ${cfg.badgeClass} ${isActive ? "ring-2 ring-offset-1 ring-current font-semibold scale-105" : "hover:opacity-80"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
                  {cfg.label}
                  {isActive && <span className="ml-0.5">✕</span>}
                </button>
              )
            })}
            {filterStatut && (
              <button onClick={() => setFilterStatut(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                Tout afficher
              </button>
            )}
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporter
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Mes tâches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Mes tâches</SelectItem>
              {isAdmin && <SelectItem value="all">Tous les agents</SelectItem>}
              {agents
                .filter(a => a._id !== currentUser?._id)
                .map(a => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.nom} {a.prenom || ""}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const d = new Date(weekStart)
              d.setDate(d.getDate() - 7)
              setWeekStart(d)
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[190px] text-center">
            {isCurrentWeek ? "Semaine en cours · " : ""}{weekLabel(weekStart)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const d = new Date(weekStart)
              d.setDate(d.getDate() + 7)
              setWeekStart(d)
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600"
              onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
            >
              Aujourd&apos;hui
            </Button>
          )}
        </div>
      </div>

      {/* Weekly Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#002952]" />
        </div>
      ) : selectedAgent !== "all" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {weekDays.map((day, idx) => {
            const dayStr = toDateStr(day)
            const isToday = dayStr === today
            const isFuture = dayStr > today
            const agentId = selectedAgent === "me" ? currentUser?._id : selectedAgent
            const dayTachesAll = getTachesForDay(dayStr, agentId)
            const dayTaches = filterStatut ? dayTachesAll.filter(t => t.statut === filterStatut) : dayTachesAll
            const stats = getDayStats(dayTachesAll) // stats always on unfiltered
            const canAdd = selectedAgent === "me" || (!isAdmin && selectedAgent === "me")
            const canAddForDay = selectedAgent === "me"

            return (
              <Card
                key={dayStr}
                className={`border transition-all ${
                  isToday
                    ? "border-[#002952] dark:border-blue-700 shadow-md shadow-blue-100 dark:shadow-blue-900/20"
                    : "border-gray-200 dark:border-slate-700"
                }`}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {DAY_NAMES[idx]}
                      </span>
                      <span className="text-xs text-gray-400">{formatDateLabel(day)}</span>
                      {isToday && (
                        <Badge className="bg-blue-100 text-[#002952] dark:bg-blue-900/30 dark:text-blue-300 text-xs px-1.5 py-0">
                          Aujourd&apos;hui
                        </Badge>
                      )}
                    </div>
                    {/* Progress badge */}
                    {stats.total > 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        stats.done === stats.total
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400"
                      }`}>
                        {stats.done}/{stats.total}
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  {stats.total > 0 && (
                    <div className="h-1 w-full bg-gray-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(stats.done / stats.total) * 100}%` }}
                      />
                    </div>
                  )}
                </CardHeader>

                <CardContent className="px-4 pb-4 space-y-2">
                  {/* Task list */}
                  {dayTaches.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2 text-center">
                      {isFuture ? "Planifiez vos tâches" : "Aucune tâche"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dayTaches.map(t => (
                        <div
                          key={t._id}
                          onClick={() => setViewTache(t)}
                          className={`group flex items-start gap-2 rounded-lg p-2 border transition-colors cursor-pointer hover:shadow-sm ${
                            t.statut === "completee"
                              ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-300"
                              : t.statut === "annulee"
                              ? "bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 opacity-60 hover:border-red-300"
                              : "bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium text-gray-800 dark:text-gray-200 truncate ${
                              t.statut === "completee" ? "line-through text-gray-400 dark:text-gray-500" : ""
                            }`}>
                              {t.titre}
                            </p>
                            {t.description && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                {t.description}
                              </p>
                            )}
                            {/* Status badge with quick change */}
                            {(canEditTache(t) || canUpdateStatusOnly(t)) ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button onClick={e => e.stopPropagation()} className="mt-1 inline-flex items-center gap-0.5 cursor-pointer hover:opacity-80">
                                    <StatusBadge statut={t.statut} />
                                    <ChevronDown className="h-3 w-3 text-gray-400" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-44">
                                  {(Object.entries(STATUS_CONFIG) as [TacheStatut, typeof STATUS_CONFIG[TacheStatut]][])
                                    .filter(([key]) => canUpdateStatusOnly(t) ? key !== "reportee" : true)
                                    .map(([key, cfg]) => (
                                    <DropdownMenuItem
                                      key={key}
                                      onClick={() => handleStatusChange(t, key)}
                                      className={`gap-2 ${t.statut === key ? "bg-gray-50 dark:bg-slate-800 font-medium" : ""}`}
                                    >
                                      <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
                                      {cfg.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <div className="mt-1">
                                <StatusBadge statut={t.statut} />
                              </div>
                            )}
                          </div>
                          {/* Actions */}
                          {canEditTache(t) && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={e => { e.stopPropagation(); openEdit(t) }}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(t._id) }}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add task button — today or future only */}
                  {canAddForDay && dayStr >= today && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openCreate(dayStr)}
                      className="w-full h-7 text-xs gap-1 text-[#002952] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-dashed border-blue-200 dark:border-blue-800 mt-1"
                    >
                      <Plus className="h-3 w-3" />
                      Ajouter une tâche
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Vue tous les agents — tableau */
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-slate-800 z-10">Agent</th>
                {weekDays.map((d, i) => (
                  <th
                    key={i}
                    className={`text-center px-3 py-3 font-medium text-gray-600 dark:text-gray-400 min-w-[100px] ${toDateStr(d) === today ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                  >
                    <div>{DAY_NAMES_SHORT[i]}</div>
                    <div className="text-xs font-normal text-gray-400">{formatDateLabel(d)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {agents.map(agent => (
                <tr key={agent._id} className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td
                    className="px-4 py-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 cursor-pointer group/agent"
                    onClick={() => setSelectedAgent(agent._id)}
                    title="Voir les tâches de cet agent"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="group-hover/agent:text-[#002952] dark:group-hover/agent:text-blue-400 transition-colors">{agent.nom} {agent.prenom || ""}</span>
                      <ChevronDown className="h-3 w-3 text-gray-300 dark:text-gray-600 -rotate-90 opacity-0 group-hover/agent:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-xs text-gray-400">{agent.role}</div>
                  </td>
                  {weekDays.map((d, i) => {
                    const dayStr = toDateStr(d)
                    const dayTaches = getTachesForDay(dayStr, agent._id)
                    const stats = getDayStats(dayTaches)
                    const isToday = dayStr === today
                    return (
                      <td
                        key={i}
                        className={`text-center px-3 py-3 ${isToday ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                      >
                        {dayTaches.length === 0 ? (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                              stats.done === stats.total && stats.total > 0
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            }`}>
                              {stats.done}/{stats.total}
                            </span>
                            <div className="flex flex-wrap gap-1 justify-center max-w-[120px]">
                              {dayTaches.slice(0, 3).map(t => (
                                <span
                                  key={t._id}
                                  className={`h-2 w-2 rounded-full ${STATUS_CONFIG[t.statut].dotClass}`}
                                  title={`${t.titre} — ${STATUS_CONFIG[t.statut].label}`}
                                />
                              ))}
                              {dayTaches.length > 3 && (
                                <span className="text-xs text-gray-400">+{dayTaches.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── REPORT DIALOG ── */}
      <Dialog open={reportDialog} onOpenChange={v => { if (!v) { setReportDialog(false); setReportTache(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Reporter la tâche
            </DialogTitle>
            <DialogDescription>
              La tâche originale sera marquée <strong>Reportée</strong> et une copie sera créée pour la nouvelle date.
            </DialogDescription>
          </DialogHeader>
          {reportTache && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg bg-gray-50 dark:bg-slate-800 p-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700">
                <p className="font-medium">{reportTache.titre}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Originalement prévue le {new Date(isoToDateStr(reportTache.dateCible) + "T12:00:00").toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nouvelle date cible <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={reportDate}
                  min={toDateStr(new Date())}
                  onChange={e => setReportDate(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReportDialog(false); setReportTache(null) }}>Annuler</Button>
            <Button
              onClick={handleConfirmReport}
              disabled={isReporting || !reportDate}
              className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
            >
              {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Confirmer le report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DETAIL DIALOG ── */}
      <Dialog open={!!viewTache} onOpenChange={v => { if (!v) setViewTache(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Target className="h-5 w-5 text-[#002952] dark:text-blue-300 shrink-0" />
              <span className="leading-tight">{viewTache?.titre}</span>
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {viewTache && <StatusBadge statut={viewTache.statut} />}
                {viewTache && (
                  <span className="text-xs text-gray-400">
                    {new Date(isoToDateStr(viewTache.dateCible) + "T12:00:00").toLocaleDateString("fr-FR", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {viewTache && (
            <div className="space-y-4 py-1">
              {viewTache.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{viewTache.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100 dark:border-slate-700">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Agent</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {viewTache.agentId.nom} {viewTache.agentId.prenom || ""}
                  </p>
                  <p className="text-xs text-gray-400">{viewTache.agentId.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Statut</p>
                  {canUpdateStatusOnly(viewTache) ? (
                    <Select
                      value={viewTache.statut}
                      onValueChange={(v) => { handleStatusChange(viewTache, v as TacheStatut); setViewTache({ ...viewTache, statut: v as TacheStatut }) }}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(STATUS_CONFIG) as [TacheStatut, typeof STATUS_CONFIG[TacheStatut]][])
                          .filter(([key]) => key !== "reportee")
                          .map(([key, cfg]) => (
                            <SelectItem key={key} value={key} className="text-xs">
                              <span className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
                                {cfg.label}
                              </span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusBadge statut={viewTache.statut} />
                  )}
                </div>
              </div>
              {(viewTache.heureDebut || viewTache.heureFin) && (
                <div className="pt-1 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Créneau</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {viewTache.heureDebut || "?"} — {viewTache.heureFin || "?"}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-1 pt-2 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-400 dark:text-gray-500">
                {viewTache.createdAt && (
                  <span>Créée le {new Date(viewTache.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                )}
                {viewTache.updatedAt && viewTache.updatedAt !== viewTache.createdAt && (
                  <span>Mise à jour le {new Date(viewTache.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                )}
              </div>
              {canEditTache(viewTache) && (
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setViewTache(null); openEdit(viewTache) }}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setViewTache(null); handleDelete(viewTache._id) }}
                    className="gap-1.5 text-xs h-8 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── FORM DIALOG ── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-[#002952] dark:text-blue-300" />
              {editTache ? "Modifier la tâche" : "Nouvelle tâche"}
            </DialogTitle>
            <DialogDescription>
              {formDay && new Date(formDay + "T12:00:00").toLocaleDateString("fr-FR", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Titre */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Titre <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: Appeler les prospects en attente"
                value={formTitre}
                onChange={e => setFormTitre(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Description</Label>
                <AIRewriteButton
                  getValue={() => formDesc}
                  onApply={(text) => setFormDesc(text)}
                />
                <VoiceInputButton
                  getValue={() => formDesc}
                  onUpdate={(text) => setFormDesc(text)}
                  onApply={(text) => setFormDesc(text)}
                />
              </div>
              <Textarea
                placeholder="Détails supplémentaires (optionnel)"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Statut + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Statut</Label>
                <Select value={formStatut} onValueChange={v => setFormStatut(v as TacheStatut)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_CONFIG) as [TacheStatut, typeof STATUS_CONFIG[TacheStatut]][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Date cible</Label>
                <Input
                  type="date"
                  value={formDay}
                  onChange={e => setFormDay(e.target.value)}
                />
              </div>
            </div>

            {/* Créneau horaire */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Créneau de réalisation <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={formHeureDebut}
                  onChange={e => setFormHeureDebut(e.target.value)}
                  className="flex-1"
                  placeholder="09:00"
                />
                <span className="text-sm text-gray-500 shrink-0">à</span>
                <Input
                  type="time"
                  value={formHeureFin}
                  onChange={e => setFormHeureFin(e.target.value)}
                  className="flex-1"
                  placeholder="12:00"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {editTache ? "Mettre à jour" : "Créer la tâche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
