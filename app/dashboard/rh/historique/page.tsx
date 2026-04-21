"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { History, Loader2, Search, Calendar, Pause, Pencil } from "lucide-react"
import axios from "axios"
import { toast } from "sonner"

interface User {
  _id: string
  nom: string
  email: string
  role: string
}

interface PauseData {
  debut: string
  fin?: string
  duree?: number  // en secondes
}

interface Presence {
  _id: string
  userId: User
  date: string
  heureEntree?: string
  heureSortie?: string
  statut: "present" | "absent" | "retard" | "conge" | "non_defini"
  type: "pointage" | "manuel"
  notes?: string
  pause?: PauseData | null
}

function statutBadge(statut: string) {
  const map: Record<string, { label: string; className: string }> = {
    present: { label: "Présent", className: "bg-green-100 text-green-800" },
    retard: { label: "Retard", className: "bg-yellow-100 text-yellow-800" },
    absent: { label: "Absent", className: "bg-red-100 text-red-800" },
    conge: { label: "Congé", className: "bg-blue-100 text-blue-800" },
    maladie: { label: "Maladie", className: "bg-red-100 text-red-800" },
    non_defini: { label: "—", className: "bg-gray-100 text-gray-600" },
  }
  const s = map[statut] || map["non_defini"]
  return <Badge className={s.className}>{s.label}</Badge>
}

// Les dates sont stockées en heure locale Kinshasa comme UTC naïf → lecture avec méthodes UTC
function formatDate(dt: string) {
  const d = new Date(dt)
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

function formatTime(dt?: string) {
  if (!dt) return "—"
  const d = new Date(dt)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

/** Convertit une datetime ISO en valeur "HH:MM" pour un <input type="time"> */
function toTimeInput(dt?: string) {
  if (!dt) return ""
  const d = new Date(dt)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

function computeDuration(entree?: string, sortie?: string) {
  if (!entree || !sortie) return "—"
  const diff = new Date(sortie).getTime() - new Date(entree).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${h}h${m.toString().padStart(2, "0")}`
}

function formatPauseDuration(seconds?: number | null) {
  if (!seconds) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`
  if (m > 0) return `${m}m${String(s).padStart(2, "0")}s`
  return `${s}s`
}

export default function HistoriquePage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [presences, setPresences] = useState<Presence[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<User[]>([])

  // Edit presence (admin)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPresence, setEditingPresence] = useState<Presence | null>(null)
  const [editForm, setEditForm] = useState({
    heureEntree: "",
    heureSortie: "",
    statut: "present" as Presence["statut"],
    notes: "",
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    selectedEmployee: "all",
    page: 1,
    limit: 20,
  })

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const meRes = await axios.get(`${api}/users/me`, { headers })
      const role = meRes.data.role
      setUserRole(role)

      if (role === "Admin") {
        const usersRes = await axios.get(`${api}/users`, { headers })
        setEmployees(usersRes.data)
      }

      const isAgent = role !== "Admin"
      const endpoint = isAgent ? `${api}/presences/me` : `${api}/presences`

      const params: Record<string, string | number> = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: filters.page,
        limit: filters.limit,
      }
      if (!isAgent && filters.selectedEmployee !== "all") {
        params.userId = filters.selectedEmployee
      }

      const res = await axios.get(endpoint, { headers, params })
      const list = Array.isArray(res.data) ? res.data : (res.data.data ?? [])
      const count = res.data.total ?? list.length
      setPresences(list)
      setTotal(count)
    } catch (e) {
      console.error("[Historique] erreur fetch:", e)
      toast.error("Erreur lors du chargement de l'historique")
    } finally {
      setLoading(false)
    }
  }, [api, filters])

  useEffect(() => { fetchData() }, [fetchData])

  const openEditDialog = (pr: Presence) => {
    setEditingPresence(pr)
    setEditForm({
      heureEntree: toTimeInput(pr.heureEntree),
      heureSortie: toTimeInput(pr.heureSortie),
      statut: pr.statut,
      notes: pr.notes || "",
    })
    setEditDialogOpen(true)
  }

  /** Construit une datetime ISO à partir de la date de présence et d'un HH:MM */
  const buildDatetime = (dateStr: string, timeStr: string): string | null => {
    if (!timeStr) return null
    // dateStr est une ISO date (YYYY-MM-DD ou datetime)
    const d = new Date(dateStr)
    const [h, m] = timeStr.split(":").map(Number)
    // On reconstruit en UTC (même convention que le reste)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m, 0)).toISOString()
  }

  const handleSaveEdit = async () => {
    if (!editingPresence) return
    setIsSavingEdit(true)
    try {
      const body: Record<string, any> = {
        statut: editForm.statut,
        notes: editForm.notes,
      }
      if (editForm.heureEntree) {
        body.heureEntree = buildDatetime(editingPresence.date, editForm.heureEntree)
      } else {
        body.heureEntree = null
      }
      if (editForm.heureSortie) {
        body.heureSortie = buildDatetime(editingPresence.date, editForm.heureSortie)
      } else {
        body.heureSortie = null
      }

      await axios.put(`${api}/presences/${editingPresence._id}`, body, { headers })
      toast.success("Présence mise à jour avec succès")
      setEditDialogOpen(false)
      setEditingPresence(null)
      fetchData()
    } catch (e) {
      console.error("[Historique] erreur update:", e)
      toast.error("Erreur lors de la mise à jour de la présence")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const totalPages = Math.ceil(total / filters.limit)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-blue-500" />
          Historique de présence
        </h1>
        <p className="text-muted-foreground mt-1">Consultez votre historique de présence</p>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Date de début</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))}
              />
            </div>
            <div>
              <Label>Date de fin</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))}
              />
            </div>
            {userRole === "Admin" && (
              <div>
                <Label>Employé</Label>
                <Select value={filters.selectedEmployee} onValueChange={v => setFilters(f => ({ ...f, selectedEmployee: v, page: 1 }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les agents</SelectItem>
                    {employees.map(e => (
                      <SelectItem key={e._id} value={e._id}>{e.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end">
              <Button onClick={fetchData} className="w-full gap-2">
                <Search className="h-4 w-4" /> Rechercher
              </Button>
            </div>
          </div>

          {/* Raccourcis de période */}
          <div className="flex gap-2 mt-4 flex-wrap">
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
                onClick={() => setFilters(f => ({
                  ...f,
                  startDate: p.start.toISOString().slice(0, 10),
                  endDate: p.end.toISOString().slice(0, 10),
                  page: 1,
                }))}
              >
                <Calendar className="h-3 w-3" />
                {p.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Résumé */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Présences", value: presences.filter(p => p.statut === "present").length, color: "text-green-600" },
            { label: "Retards", value: presences.filter(p => p.statut === "retard").length, color: "text-yellow-600" },
            { label: "Absences", value: presences.filter(p => p.statut === "absent").length, color: "text-red-600" },
            { label: "Congés", value: presences.filter(p => p.statut === "conge").length, color: "text-blue-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {total} entrée{total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : presences.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune présence trouvée pour cette période.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {userRole === "Admin" && <TableHead>Employé</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Entrée</TableHead>
                    <TableHead>Pause</TableHead>
                    <TableHead>Durée pause</TableHead>
                    <TableHead>Sortie</TableHead>
                    <TableHead>Durée travail</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                    {userRole === "Admin" && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presences.map(pr => (
                    <TableRow key={pr._id}>
                      {userRole === "Admin" && (
                        <TableCell>
                          <p className="font-medium">{pr.userId?.nom || "—"}</p>
                        </TableCell>
                      )}
                      <TableCell>{formatDate(pr.date)}</TableCell>
                      <TableCell>{statutBadge(pr.statut)}</TableCell>
                      <TableCell>{formatTime(pr.heureEntree)}</TableCell>
                      <TableCell>
                        {pr.pause?.debut ? (
                          <div className="text-xs text-muted-foreground">
                            <p>{formatTime(pr.pause.debut)}{pr.pause.fin ? ` → ${formatTime(pr.pause.fin)}` : ""}</p>
                            {!pr.pause.fin && <Badge className="mt-0.5 bg-yellow-100 text-yellow-700 text-xs">En cours</Badge>}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {pr.pause?.duree ? (
                          <div className="flex items-center gap-1">
                            <Pause className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs font-medium text-yellow-700">{formatPauseDuration(pr.pause.duree)}</span>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{formatTime(pr.heureSortie)}</TableCell>
                      <TableCell>{computeDuration(pr.heureEntree, pr.heureSortie)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {pr.type === "pointage" ? "Pointage" : "Manuel"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{pr.notes || "—"}</TableCell>
                      {userRole === "Admin" && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(pr)}
                            title="Modifier cette présence"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {filters.page} / {totalPages}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page <= 1}
                      onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page >= totalPages}
                      onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog modifier présence (admin) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Modifier la présence
            </DialogTitle>
          </DialogHeader>
          {editingPresence && (
            <div className="space-y-4 py-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{editingPresence.userId?.nom || "Employé"}</span>
                {" — "}{formatDate(editingPresence.date)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-entree">Heure d'entrée</Label>
                  <Input
                    id="edit-entree"
                    type="time"
                    value={editForm.heureEntree}
                    onChange={e => setEditForm(f => ({ ...f, heureEntree: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sortie">Heure de sortie</Label>
                  <Input
                    id="edit-sortie"
                    type="time"
                    value={editForm.heureSortie}
                    onChange={e => setEditForm(f => ({ ...f, heureSortie: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-statut">Statut</Label>
                <Select
                  value={editForm.statut}
                  onValueChange={v => setEditForm(f => ({ ...f, statut: v as Presence["statut"] }))}
                >
                  <SelectTrigger id="edit-statut">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Présent</SelectItem>
                    <SelectItem value="retard">Retard</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="conge">Congé</SelectItem>
                    <SelectItem value="maladie">Maladie</SelectItem>
                    <SelectItem value="non_defini">Non défini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Note optionnelle..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSavingEdit}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
