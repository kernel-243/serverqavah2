"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import {
  BarChart3, Loader2, Users, CheckCircle2, AlertCircle, Calendar,
  Clock, Shield, Eye, EyeOff, Download, ChevronDown, FileSpreadsheet,
} from "lucide-react"
import axios from "axios"
import { toast } from "sonner"
import * as XLSX from "xlsx"

interface Employee {
  _id: string
  nom: string
  email: string
  role: string
  permissions?: {
    statistiquesRH?: { read: boolean; write: boolean }
  }
}

interface PresenceRecord {
  _id: string
  date: string
  heureEntree?: string
  heureSortie?: string
  statut: string
  type?: string
}

interface EmployeeStat {
  employee: Employee
  presents: number
  retards: number
  absents: number
  conges: number
  total: number
  tauxPresence?: number
  lastPresence: PresenceRecord | null
}

interface GlobalStats {
  totalEmployees: number
  presentsAujourdhui: number
  retardsAujourdhui: number
  absentsAujourdhui: number
  congesAujourdhui?: number
}

interface StatsData {
  periode: { start: string; end: string }
  globalStats: GlobalStats
  byEmployee: EmployeeStat[]
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function formatTime(dt?: string) {
  if (!dt) return "—"
  return new Date(dt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

function tauxPresence(presents: number, total: number) {
  if (total === 0) return 0
  return Math.round((presents / total) * 100)
}

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  present:    { label: "Présent",  color: "text-green-600" },
  retard:     { label: "Retard",   color: "text-yellow-600" },
  absent:     { label: "Absent",   color: "text-red-600" },
  conge:      { label: "Congé",    color: "text-blue-600" },
  maladie:    { label: "Maladie",  color: "text-purple-600" },
  ferie:      { label: "Férié",    color: "text-gray-600" },
  non_defini: { label: "—",        color: "text-gray-400" },
}

export default function StatistiquesPage() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  })

  // Accès (admin only)
  const [agents, setAgents] = useState<Employee[]>([])
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [visibiliteOpen, setVisibiliteOpen] = useState(false)

  // Dialog employé
  const [selectedStat, setSelectedStat] = useState<EmployeeStat | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [employeePresences, setEmployeePresences] = useState<PresenceRecord[]>([])
  const [loadingPresences, setLoadingPresences] = useState(false)

  // Export
  const [isExportingAll, setIsExportingAll] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const meRes = await axios.get(`${api}/users/me`, { headers })
      const me = meRes.data
      setCurrentUser(me)
      const admin = me.role === "Admin"
      setIsAdmin(admin)

      const hasAccess = admin || me.permissions?.statistiquesRH?.read === true
      if (!hasAccess) {
        setLoading(false)
        return
      }

      const res = await axios.get(`${api}/presences/stats`, {
        headers,
        params: { startDate: filters.startDate, endDate: filters.endDate },
      })
      setStats(res.data.data)

      if (admin) {
        const usersRes = await axios.get(`${api}/users`, { headers })
        setAgents((usersRes.data as Employee[]).filter((u: Employee) => u.role !== "Admin"))
      }
    } catch {
      toast.error("Erreur lors du chargement des statistiques")
    } finally {
      setLoading(false)
    }
  }, [api, filters])

  useEffect(() => { fetchStats() }, [fetchStats])

  async function toggleAccess(agent: Employee) {
    const currentAccess = agent.permissions?.statistiquesRH?.read === true
    setTogglingId(agent._id)
    try {
      const updatedPermissions = {
        ...(agent.permissions || {}),
        statistiquesRH: { read: !currentAccess, write: false },
      }
      await axios.post(`${api}/users/${agent._id}/permissions`, { permissions: updatedPermissions }, { headers })
      setAgents(prev => prev.map(a =>
        a._id === agent._id
          ? { ...a, permissions: { ...a.permissions, statistiquesRH: { read: !currentAccess, write: false } } }
          : a
      ))
      toast.success(!currentAccess
        ? `${agent.nom} peut maintenant voir les statistiques`
        : `Accès statistiques retiré à ${agent.nom}`
      )
    } catch {
      toast.error("Erreur lors de la mise à jour des accès")
    } finally {
      setTogglingId(null)
    }
  }

  async function handleEmployeeClick(stat: EmployeeStat) {
    setSelectedStat(stat)
    setDialogOpen(true)
    setLoadingPresences(true)
    setEmployeePresences([])
    try {
      const res = await axios.get(`${api}/presences`, {
        headers,
        params: {
          userId: stat.employee._id,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      })
      const data = res.data?.data ?? res.data?.presences ?? res.data ?? []
      setEmployeePresences(Array.isArray(data) ? data : [])
    } catch {
      // On affiche quand même le résumé sans les détails
    } finally {
      setLoadingPresences(false)
    }
  }

  function exportEmployeeExcel(stat: EmployeeStat, presences: PresenceRecord[]) {
    const wb = XLSX.utils.book_new()
    const taux = stat.tauxPresence ?? tauxPresence(stat.presents, stat.total)

    const summaryRows = [
      ["Employé", stat.employee.nom],
      ["Email", stat.employee.email],
      ["Rôle", stat.employee.role],
      ["Période", `${filters.startDate} → ${filters.endDate}`],
      [],
      ["Indicateur", "Valeur"],
      ["Jours présents", stat.presents],
      ["Retards", stat.retards],
      ["Absences", stat.absents],
      ["Congés", stat.conges],
      ["Total jours travaillés", stat.total],
      ["Taux de présence", `${taux}%`],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(wb, ws1, "Résumé")

    if (presences.length > 0) {
      const detailRows = [
        ["Date", "Heure d'entrée", "Heure de sortie", "Statut", "Type"],
        ...presences.map(p => [
          formatDate(p.date),
          formatTime(p.heureEntree),
          formatTime(p.heureSortie),
          STATUT_LABELS[p.statut]?.label ?? p.statut,
          p.type ?? "—",
        ]),
      ]
      const ws2 = XLSX.utils.aoa_to_sheet(detailRows)
      XLSX.utils.book_append_sheet(wb, ws2, "Présences détaillées")
    }

    XLSX.writeFile(wb, `stats_${stat.employee.nom.replace(/\s+/g, "_")}_${filters.startDate}_${filters.endDate}.xlsx`)
    toast.success("Export Excel réussi")
  }

  function exportAllExcel() {
    if (!stats) return
    setIsExportingAll(true)
    try {
      const wb = XLSX.utils.book_new()

      const rows = [
        [`Statistiques de présence — Période : ${filters.startDate} → ${filters.endDate}`],
        [],
        ["Employé", "Email", "Rôle", "Présents", "Retards", "Absents", "Congés", "Total jours", "Taux (%)"],
        ...stats.byEmployee.map(({ employee, presents, retards, absents, conges, total, tauxPresence: taux }) => [
          employee.nom,
          employee.email,
          employee.role,
          presents,
          retards,
          absents,
          conges,
          total,
          taux ?? tauxPresence(presents, total),
        ]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, "Tous les employés")
      XLSX.writeFile(wb, `stats_presence_${filters.startDate}_${filters.endDate}.xlsx`)
      toast.success("Export Excel réussi")
    } catch {
      toast.error("Erreur lors de l'export")
    } finally {
      setIsExportingAll(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const hasAccess = isAdmin || currentUser?.permissions?.statistiquesRH?.read === true

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Shield className="h-12 w-12 text-red-400" />
        <h2 className="text-xl font-semibold">Accès restreint</h2>
        <p className="text-muted-foreground">Vous n&apos;avez pas accès à cette page.</p>
      </div>
    )
  }

  const g = stats?.globalStats

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-500" />
          Statistiques de présence
        </h1>
        <p className="text-muted-foreground mt-1">Vue d&apos;ensemble des présences de tous les agents</p>
      </div>

      {/* ── Panneau gestion des accès (admin uniquement) — dossier déroulant ── */}
      {isAdmin && (
        <Collapsible open={visibiliteOpen} onOpenChange={setVisibiliteOpen}>
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 pt-4 cursor-pointer select-none">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
                  <Eye className="h-4 w-4 shrink-0" />
                  Visibilité de la page
                  <span className="text-xs font-normal text-blue-600/70 dark:text-blue-400/70 ml-1">
                    — Accordez l&apos;accès à des employés spécifiques
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 ml-auto text-blue-600/70 transition-transform duration-200 ${visibiliteOpen ? "rotate-180" : ""}`}
                  />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pb-4">
                {agents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun agent trouvé.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {agents.map(agent => {
                      const hasStatsAccess = agent.permissions?.statistiquesRH?.read === true
                      const isToggling = togglingId === agent._id
                      return (
                        <div
                          key={agent._id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                            hasStatsAccess
                              ? "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700"
                              : "bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                              {agent.nom}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-[140px]">{agent.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasStatsAccess
                              ? <Eye className="h-3.5 w-3.5 text-blue-500" />
                              : <EyeOff className="h-3.5 w-3.5 text-gray-400" />
                            }
                            {isToggling
                              ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              : (
                                <Switch
                                  checked={hasStatsAccess}
                                  onCheckedChange={() => toggleAccess(agent)}
                                  className="scale-90"
                                />
                              )
                            }
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Filtres de période */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Du</Label>
              <Input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="w-44" />
            </div>
            <div>
              <Label>Au</Label>
              <Input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="w-44" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Aujourd'hui", start: new Date(), end: new Date() },
                { label: "Cette semaine", start: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d })(), end: new Date() },
                { label: "Ce mois", start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() },
                { label: "Mois dernier", start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0) },
              ].map(p => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setFilters({
                    startDate: p.start.toISOString().slice(0, 10),
                    endDate: p.end.toISOString().slice(0, 10),
                  })}
                >
                  <Calendar className="h-3 w-3" />
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résumé global */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total employés", value: g?.totalEmployees ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Présents", value: g?.presentsAujourdhui ?? 0, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
          { label: "Retards", value: g?.retardsAujourdhui ?? 0, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50" },
          { label: "Absents", value: g?.absentsAujourdhui ?? 0, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Période affichée */}
      {stats && (
        <p className="text-sm text-muted-foreground">
          Période : {formatDate(stats.periode.start)} → {formatDate(stats.periode.end)}
        </p>
      )}

      {/* Tableau par employé */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Détail par employé</CardTitle>
          {stats && stats.byEmployee.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={exportAllExcel}
              disabled={isExportingAll}
            >
              {isExportingAll
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileSpreadsheet className="h-4 w-4 text-green-600" />
              }
              Exporter tous
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!stats || stats.byEmployee.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Aucune donnée pour cette période.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-center">Présents</TableHead>
                  <TableHead className="text-center">Retards</TableHead>
                  <TableHead className="text-center">Absents</TableHead>
                  <TableHead className="text-center">Congés</TableHead>
                  <TableHead className="text-center">Taux</TableHead>
                  <TableHead>Dernière présence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.byEmployee.map((stat) => {
                  const { employee, presents, retards, absents, conges, total, tauxPresence: taux, lastPresence } = stat
                  return (
                    <TableRow
                      key={employee._id}
                      className="cursor-pointer hover:bg-muted/60 transition-colors"
                      onClick={() => handleEmployeeClick(stat)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.nom}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{employee.role}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-green-600">{presents}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-yellow-600">{retards}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-red-600">{absents}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-blue-600">{conges}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-green-500 h-1.5 rounded-full"
                              style={{ width: `${taux ?? tauxPresence(presents, total)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{taux ?? tauxPresence(presents, total)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {lastPresence ? (
                          <div>
                            <p>{formatDate(lastPresence.date)}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(lastPresence.heureEntree)}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog détails employé ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedStat && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                    {selectedStat.employee.nom.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span>{selectedStat.employee.nom}</span>
                    <Badge variant="outline" className="ml-2 text-xs font-normal">{selectedStat.employee.role}</Badge>
                  </div>
                </DialogTitle>
                <p className="text-xs text-muted-foreground pt-0.5">{selectedStat.employee.email}</p>
              </DialogHeader>

              <Separator />

              {/* Résumé stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Présents",  value: selectedStat.presents, color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20",  icon: CheckCircle2 },
                  { label: "Retards",   value: selectedStat.retards,  color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20", icon: Clock },
                  { label: "Absents",   value: selectedStat.absents,  color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20",      icon: AlertCircle },
                  { label: "Congés",    value: selectedStat.conges,   color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",    icon: Calendar },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg p-3 ${s.bg} flex flex-col items-center gap-1`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Taux de présence */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taux de présence</span>
                  <span className="font-semibold">
                    {selectedStat.tauxPresence ?? tauxPresence(selectedStat.presents, selectedStat.total)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${selectedStat.tauxPresence ?? tauxPresence(selectedStat.presents, selectedStat.total)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedStat.total} jour{selectedStat.total > 1 ? "s" : ""} sur la période
                </p>
              </div>

              <Separator />

              {/* Tableau des présences détaillées */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Présences sur la période</h3>
                {loadingPresences ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Chargement…</span>
                  </div>
                ) : employeePresences.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucun enregistrement détaillé disponible.</p>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Entrée</TableHead>
                          <TableHead className="text-xs">Sortie</TableHead>
                          <TableHead className="text-xs">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeePresences.map(p => {
                          const s = STATUT_LABELS[p.statut] ?? { label: p.statut, color: "text-gray-500" }
                          return (
                            <TableRow key={p._id}>
                              <TableCell className="text-xs py-2">{formatDate(p.date)}</TableCell>
                              <TableCell className="text-xs py-2">{formatTime(p.heureEntree)}</TableCell>
                              <TableCell className="text-xs py-2">{formatTime(p.heureSortie)}</TableCell>
                              <TableCell className="py-2">
                                <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Bouton export */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => exportEmployeeExcel(selectedStat, employeePresences)}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  disabled={loadingPresences}
                >
                  <Download className="h-4 w-4" />
                  Exporter en Excel
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
