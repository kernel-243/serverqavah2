"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { BarChart3, Loader2, Users, CheckCircle2, AlertCircle, Calendar, Clock, Shield, Eye, EyeOff } from "lucide-react"
import axios from "axios"
import { toast } from "sonner"

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

export default function StatistiquesPage() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  })

  // Gestion des accès (admin only)
  const [agents, setAgents] = useState<Employee[]>([])
  const [togglingId, setTogglingId] = useState<string | null>(null)

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

      // Agents autorisés : admin OU agent avec statistiquesRH.read
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

      // Charger la liste des agents pour le panneau admin
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

      {/* ── Panneau gestion des accès (admin uniquement) ── */}
      {isAdmin && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <Eye className="h-4 w-4" />
              Visibilité de cette page
              <span className="text-xs font-normal text-blue-600/70 dark:text-blue-400/70 ml-1">
                — Accordez l'accès à des employés spécifiques
              </span>
            </CardTitle>
          </CardHeader>
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
        </Card>
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
        <CardHeader>
          <CardTitle className="text-base">Détail par employé</CardTitle>
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
                {stats.byEmployee.map(({ employee, presents, retards, absents, conges, total, tauxPresence: taux, lastPresence }) => (
                  <TableRow key={employee._id}>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
