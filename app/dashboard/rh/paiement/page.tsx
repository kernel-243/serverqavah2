"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Banknote, Loader2, Plus, Pencil, Trash2, CheckCircle2, Clock, AlertCircle, FileDown, Mail } from "lucide-react"
import axios from "axios"
import { toast } from "sonner"

interface User {
  _id: string
  nom: string
  email: string
  role: string
  salaire?: number
}

interface PaiementEmploye {
  _id: string
  userId: User
  montant: number
  devise: string
  periode: { mois: number; annee: number }
  statut: "en_attente" | "paye" | "partiel"
  datePaiement?: string
  description?: string
  montantPaye: number
  salaireBase: number
  tauxIPR: number
  montantIPR: number
  tauxCNSS: number
  montantCNSS: number
  prime: number
  bonus: number
  montantNet: number
  createdBy?: User
  createdAt: string
}

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

function statutBadge(statut: string) {
  const map: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    en_attente: { label: "En attente", icon: Clock, className: "bg-yellow-100 text-yellow-800" },
    paye: { label: "Payé", icon: CheckCircle2, className: "bg-green-100 text-green-800" },
    partiel: { label: "Partiel", icon: AlertCircle, className: "bg-blue-100 text-blue-800" },
  }
  const s = map[statut] || map["en_attente"]
  const Icon = s.icon
  return (
    <Badge className={`${s.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </Badge>
  )
}

function fmt(n: number, devise: string) {
  return `${(n || 0).toLocaleString("fr-FR")} ${devise}`
}

const TODAY = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM = (year: number) => ({
  userId: "",
  salaireBase: "",
  tauxIPR: "16",
  tauxCNSS: "15",
  prime: "0",
  bonus: "0",
  devise: "USD",
  mois: (new Date().getMonth() + 1).toString(),
  annee: year.toString(),
  statut: "paye",
  datePaiement: TODAY(),
  description: "",
  notifier: false,
})

export default function PaiementPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [paiements, setPaiements] = useState<PaiementEmploye[]>([])
  const [employees, setEmployees] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PaiementEmploye | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const currentYear = new Date().getFullYear()
  const [form, setForm] = useState(EMPTY_FORM(currentYear))

  const [filters, setFilters] = useState({
    statut: "all",
    annee: currentYear.toString(),
    mois: "all",
    userId: "all",
    page: 1,
    limit: 20,
  })

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  // Computed values
  const salaireBase = parseFloat(form.salaireBase) || 0
  const tauxIPR = parseFloat(form.tauxIPR) || 0
  const tauxCNSS = parseFloat(form.tauxCNSS) || 0
  const montantIPR = +(salaireBase * tauxIPR / 100).toFixed(2)
  const montantCNSS = +(salaireBase * tauxCNSS / 100).toFixed(2)
  const prime = parseFloat(form.prime) || 0
  const bonus = parseFloat(form.bonus) || 0
  const montantNet = +(salaireBase - montantIPR - montantCNSS + prime + bonus).toFixed(2)
  const devise = form.devise

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

      const params: Record<string, string | number> = { page: filters.page, limit: filters.limit }
      if (filters.statut !== "all") params.statut = filters.statut
      if (filters.annee) params.annee = filters.annee
      if (filters.mois !== "all") params.mois = filters.mois
      if (filters.userId !== "all") params.userId = filters.userId

      const res = await axios.get(`${api}/presences/paiements`, { headers, params })
      setPaiements(res.data.data)
      setTotal(res.data.total)
    } catch {
      toast.error("Erreur lors du chargement des paiements")
    } finally {
      setLoading(false)
    }
  }, [api, filters])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM(currentYear))
    setDialogOpen(true)
  }

  const openEdit = (p: PaiementEmploye) => {
    setEditTarget(p)
    setForm({
      userId: p.userId?._id || "",
      salaireBase: p.salaireBase?.toString() || "0",
      tauxIPR: p.tauxIPR?.toString() || "16",
      tauxCNSS: p.tauxCNSS?.toString() || "15",
      prime: p.prime?.toString() || "0",
      bonus: p.bonus?.toString() || "0",
      devise: p.devise,
      mois: p.periode.mois.toString(),
      annee: p.periode.annee.toString(),
      statut: p.statut,
      datePaiement: p.datePaiement ? new Date(p.datePaiement).toISOString().slice(0, 10) : "",
      description: p.description || "",
      notifier: false,
    })
    setDialogOpen(true)
  }

  // When employee is selected, auto-populate salary
  const handleSelectEmployee = (userId: string) => {
    const emp = employees.find(e => e._id === userId)
    setForm(f => ({
      ...f,
      userId,
      salaireBase: emp?.salaire !== undefined ? emp.salaire.toString() : f.salaireBase,
    }))
  }

  const downloadPDF = async (paiementId: string) => {
    try {
      const res = await axios.get(`${api}/presences/paiements/${paiementId}/fiche-pdf`, {
        headers,
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      const link = document.createElement("a")
      link.href = url
      link.download = `fiche_paie.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Erreur lors du téléchargement de la fiche de paie")
    }
  }

  const handleSave = async () => {
    if (!form.userId && !editTarget) {
      toast.error("Veuillez sélectionner un employé")
      return
    }
    setActionLoading(true)
    try {
      const payload = {
        userId: form.userId || editTarget?.userId?._id,
        montant: montantNet,
        devise: form.devise,
        periode: { mois: parseInt(form.mois), annee: parseInt(form.annee) },
        statut: form.statut,
        datePaiement: form.datePaiement || undefined,
        description: form.description,
        montantPaye: montantNet,
        salaireBase,
        tauxIPR,
        tauxCNSS,
        prime,
        bonus,
      }

      let paiementId: string
      if (editTarget) {
        const res = await axios.put(`${api}/presences/paiements/${editTarget._id}`, payload, { headers })
        paiementId = editTarget._id
        void res
      } else {
        const res = await axios.post(`${api}/presences/paiements`, payload, { headers })
        paiementId = res.data.data._id
      }

      setDialogOpen(false)
      fetchData()

      // Download PDF
      await downloadPDF(paiementId)

      // Send email if notifier is checked
      if (form.notifier) {
        try {
          await axios.post(`${api}/presences/paiements/${paiementId}/envoyer-fiche`, {}, { headers })
          setSuccessMessage(`Paiement ${editTarget ? "modifié" : "créé"} et fiche de paie envoyée par email.`)
        } catch {
          setSuccessMessage(`Paiement ${editTarget ? "modifié" : "créé"} mais l'envoi de l'email a échoué.`)
        }
      } else {
        setSuccessMessage(`Paiement ${editTarget ? "modifié" : "créé"} avec succès.`)
      }
      setSuccessOpen(true)

    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setErrorMessage(err?.response?.data?.message || "Une erreur est survenue")
      setErrorOpen(true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce paiement ?")) return
    try {
      await axios.delete(`${api}/presences/paiements/${id}`, { headers })
      toast.success("Paiement supprimé")
      fetchData()
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  const totalPages = Math.ceil(total / filters.limit)
  const totalMontant = paiements.reduce((s, p) => s + (p.montantNet || p.montant), 0)
  const totalPaye = paiements.reduce((s, p) => s + p.montantPaye, 0)
  const totalRestant = totalMontant - totalPaye

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-blue-500" />
            Paiement Employé
          </h1>
          <p className="text-muted-foreground mt-1">
            {userRole === "Admin" ? "Gérez les paiements de tous les employés" : "Consultez vos paiements"}
          </p>
        </div>
        {userRole === "Admin" && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau paiement
          </Button>
        )}
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {userRole === "Admin" && (
              <div>
                <Label>Employé</Label>
                <Select value={filters.userId} onValueChange={v => setFilters(f => ({ ...f, userId: v, page: 1 }))}>
                  <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {employees.map(e => (
                      <SelectItem key={e._id} value={e._id}>{e.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Année</Label>
              <Select value={filters.annee} onValueChange={v => setFilters(f => ({ ...f, annee: v, page: 1 }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mois</Label>
              <Select value={filters.mois} onValueChange={v => setFilters(f => ({ ...f, mois: v, page: 1 }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {MOIS.map((m, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={filters.statut} onValueChange={v => setFilters(f => ({ ...f, statut: v, page: 1 }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="paye">Payé</SelectItem>
                  <SelectItem value="partiel">Partiel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résumé financier */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total net</p>
              <p className="text-2xl font-bold">{totalMontant.toLocaleString("fr-FR")} USD</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total payé</p>
              <p className="text-2xl font-bold text-green-600">{totalPaye.toLocaleString("fr-FR")} USD</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Restant</p>
              <p className="text-2xl font-bold text-red-500">{totalRestant.toLocaleString("fr-FR")} USD</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{total} paiement{total > 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : paiements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Aucun paiement trouvé.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {userRole === "Admin" && <TableHead>Employé</TableHead>}
                    <TableHead>Période</TableHead>
                    <TableHead>Salaire base</TableHead>
                    <TableHead>IPR</TableHead>
                    <TableHead>CNSS</TableHead>
                    <TableHead>Prime/Bonus</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Payé</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Fiche</TableHead>
                    {userRole === "Admin" && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paiements.map(p => (
                    <TableRow key={p._id}>
                      {userRole === "Admin" && (
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.userId?.nom || "—"}</p>
                            <p className="text-xs text-muted-foreground">{p.userId?.email}</p>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="font-medium">{MOIS[p.periode.mois - 1]} {p.periode.annee}</span>
                      </TableCell>
                      <TableCell>{fmt(p.salaireBase, p.devise)}</TableCell>
                      <TableCell className="text-red-500">-{fmt(p.montantIPR, p.devise)}</TableCell>
                      <TableCell className="text-red-500">-{fmt(p.montantCNSS, p.devise)}</TableCell>
                      <TableCell className="text-green-600">
                        {(p.prime > 0 || p.bonus > 0) ? `+${fmt((p.prime || 0) + (p.bonus || 0), p.devise)}` : "—"}
                      </TableCell>
                      <TableCell className="font-semibold">{fmt(p.montantNet || p.montant, p.devise)}</TableCell>
                      <TableCell>
                        <span className={p.montantPaye >= (p.montantNet || p.montant) ? "text-green-600 font-medium" : "text-orange-500"}>
                          {fmt(p.montantPaye, p.devise)}
                        </span>
                      </TableCell>
                      <TableCell>{statutBadge(p.statut)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Télécharger la fiche de paie" onClick={() => downloadPDF(p._id)}>
                          <FileDown className="h-4 w-4 text-blue-500" />
                        </Button>
                      </TableCell>
                      {userRole === "Admin" && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(p._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {filters.page} / {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Précédent</Button>
                    <Button variant="outline" size="sm" disabled={filters.page >= totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Suivant</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog création/édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Modifier le paiement" : "Nouveau paiement"}</DialogTitle>
            <DialogDescription>Renseigner les informations de rémunération. Le montant net est calculé automatiquement.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Employé */}
            {!editTarget && (
              <div>
                <Label>Employé <span className="text-red-500">*</span></Label>
                <Select value={form.userId} onValueChange={handleSelectEmployee}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e._id} value={e._id}>{e.nom} — {e.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Période + Devise */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Mois</Label>
                <Select value={form.mois} onValueChange={v => setForm(f => ({ ...f, mois: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOIS.map((m, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Année</Label>
                <Input type="number" value={form.annee} onChange={e => setForm(f => ({ ...f, annee: e.target.value }))} />
              </div>
              <div>
                <Label>Devise</Label>
                <Select value={form.devise} onValueChange={v => setForm(f => ({ ...f, devise: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CDF">CDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Salaire de base */}
            <div>
              <Label>Salaire de base ({devise})</Label>
              <Input
                type="number"
                value={form.salaireBase}
                onChange={e => setForm(f => ({ ...f, salaireBase: e.target.value }))}
                placeholder="0"
              />
            </div>

            {/* IPR + CNSS */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Taux IPR (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.tauxIPR}
                  onChange={e => setForm(f => ({ ...f, tauxIPR: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Déduction : <span className="font-medium text-red-500">-{fmt(montantIPR, devise)}</span>
                </p>
              </div>
              <div>
                <Label>Taux CNSS (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.tauxCNSS}
                  onChange={e => setForm(f => ({ ...f, tauxCNSS: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Déduction : <span className="font-medium text-red-500">-{fmt(montantCNSS, devise)}</span>
                </p>
              </div>
            </div>

            {/* Prime + Bonus */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prime ({devise})</Label>
                <Input
                  type="number"
                  value={form.prime}
                  onChange={e => setForm(f => ({ ...f, prime: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Bonus ({devise})</Label>
                <Input
                  type="number"
                  value={form.bonus}
                  onChange={e => setForm(f => ({ ...f, bonus: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <Separator />

            {/* Montant net calculé */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Montant net à payer</span>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{fmt(montantNet, devise)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {fmt(salaireBase, devise)} − {fmt(montantIPR, devise)} (IPR) − {fmt(montantCNSS, devise)} (CNSS)
                {prime > 0 ? ` + ${fmt(prime, devise)} (prime)` : ""}
                {bonus > 0 ? ` + ${fmt(bonus, devise)} (bonus)` : ""}
              </p>
            </div>

            {/* Statut */}
            <div>
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={v => setForm(f => ({ ...f, statut: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="paye">Payé</SelectItem>
                  <SelectItem value="partiel">Partiel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date de paiement</Label>
              <Input type="date" value={form.datePaiement} onChange={e => setForm(f => ({ ...f, datePaiement: e.target.value }))} />
            </div>

            <div>
              <Label>Description / Commentaire</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            {/* Notifier */}
            <div className="flex items-center gap-3 border rounded-lg p-3 bg-gray-50 dark:bg-slate-800/50">
              <Checkbox
                id="notifier"
                checked={form.notifier}
                onCheckedChange={v => setForm(f => ({ ...f, notifier: !!v }))}
              />
              <label htmlFor="notifier" className="flex items-center gap-2 cursor-pointer text-sm">
                <Mail className="h-4 w-4 text-blue-500" />
                Notifier et envoyer la fiche de paie à l'employé par email
              </label>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading}>Annuler</Button>
            <Button onClick={handleSave} disabled={actionLoading}>
              {actionLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Traitement...</>
              ) : (
                <><FileDown className="h-4 w-4 mr-2" />{editTarget ? "Modifier" : "Créer et télécharger"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success dialog */}
      <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Succès
            </AlertDialogTitle>
            <AlertDialogDescription>{successMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSuccessOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error dialog */}
      <AlertDialog open={errorOpen} onOpenChange={setErrorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Erreur
            </AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorOpen(false)}>Fermer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
