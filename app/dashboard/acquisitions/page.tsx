"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface AutreFraisCustom {
  label: string
  valeur: number
}

interface Acquisition {
  _id: string
  nomCite: string
  nbHectaresAchetes: number
  prixUnitaire: number
  montantPayer: number
  resteAPayer: number
  total: number
  autreFrais: {
    avisUrbanistique: number
    bornageCite: number
    bornageParcelle: number
    paiementDessinateur: number
    fraisDocumentCadastraux: number
    commission: number
    autresPersonnalises: AutreFraisCustom[]
  }
  agentAttribue?: {
    _id: string
    nom: string
    prenom?: string
  }
  createdAt: string
  updatedAt: string
}

interface Agent {
  _id: string
  nom: string
  prenom?: string
  email: string
  role: string
}

const defaultAutreFrais = {
  avisUrbanistique: 0,
  bornageCite: 0,
  bornageParcelle: 0,
  paiementDessinateur: 0,
  fraisDocumentCadastraux: 0,
  commission: 0,
  autresPersonnalises: [] as AutreFraisCustom[],
}

interface FormData {
  nomCite: string
  nbHectaresAchetes: string
  prixUnitaire: string
  montantPayer: string
  agentAttribue: string
  autreFrais: typeof defaultAutreFrais
}

const defaultForm: FormData = {
  nomCite: "",
  nbHectaresAchetes: "",
  prixUnitaire: "",
  montantPayer: "",
  agentAttribue: "",
  autreFrais: { ...defaultAutreFrais, autresPersonnalises: [] },
}

function formatNumber(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AcquisitionsPage() {
  const router = useRouter()
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [agentFilter, setAgentFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState("")

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isResumeOpen, setIsResumeOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [isErrorOpen, setIsErrorOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [acquisitionToDelete, setAcquisitionToDelete] = useState<string | null>(null)

  // Edit state
  const [editingAcquisition, setEditingAcquisition] = useState<Acquisition | null>(null)

  // Form state
  const [form, setForm] = useState<FormData>(defaultForm)
  const [showAutreFrais, setShowAutreFrais] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const fetchAcquisitions = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/acquisitions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.data?.data) {
        setAcquisitions(response.data.data)
      } else if (Array.isArray(response.data)) {
        setAcquisitions(response.data)
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error("Accès refusé")
      } else {
        toast.error("Impossible de charger les acquisitions")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchAgents = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (Array.isArray(response.data)) {
        setAgents(response.data)
      }
    } catch {
      // non-blocking
    }
  }, [])

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCurrentUserRole(response.data.role || "")
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchAcquisitions()
    fetchAgents()
    fetchCurrentUser()
  }, [fetchAcquisitions, fetchAgents, fetchCurrentUser])

  // Calculated fields
  const total = (parseFloat(form.nbHectaresAchetes) || 0) * (parseFloat(form.prixUnitaire) || 0)
  const resteAPayer = total - (parseFloat(form.montantPayer) || 0)

  const totalAutreFrais =
    (form.autreFrais.avisUrbanistique || 0) +
    (form.autreFrais.bornageCite || 0) +
    (form.autreFrais.bornageParcelle || 0) +
    (form.autreFrais.paiementDessinateur || 0) +
    (form.autreFrais.fraisDocumentCadastraux || 0) +
    (form.autreFrais.commission || 0) +
    form.autreFrais.autresPersonnalises.reduce((s, f) => s + (f.valeur || 0), 0)

  // Filter
  const filtered = acquisitions.filter((a) => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      !q ||
      a.nomCite.toLowerCase().includes(q) ||
      (a.agentAttribue?.nom || "").toLowerCase().includes(q)
    const matchAgent =
      agentFilter === "all" || (a.agentAttribue?._id === agentFilter) || (!a.agentAttribue && agentFilter === "none")
    return matchSearch && matchAgent
  })

  function validateForm() {
    const errors: Record<string, string> = {}
    if (!form.nomCite.trim()) errors.nomCite = "Nom de la cité requis"
    if (!form.nbHectaresAchetes || parseFloat(form.nbHectaresAchetes) <= 0)
      errors.nbHectaresAchetes = "Nombre d'hectares requis"
    if (!form.prixUnitaire || parseFloat(form.prixUnitaire) <= 0)
      errors.prixUnitaire = "Prix unitaire requis"
    if (!form.montantPayer || parseFloat(form.montantPayer) < 0)
      errors.montantPayer = "Montant payé requis"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleOpenNew() {
    setEditingAcquisition(null)
    setForm(defaultForm)
    setFormErrors({})
    setShowAutreFrais(false)
    setIsFormOpen(true)
  }

  function handleOpenEdit(acq: Acquisition) {
    setEditingAcquisition(acq)
    setForm({
      nomCite: acq.nomCite,
      nbHectaresAchetes: String(acq.nbHectaresAchetes),
      prixUnitaire: String(acq.prixUnitaire),
      montantPayer: String(acq.montantPayer),
      agentAttribue: acq.agentAttribue?._id || "",
      autreFrais: {
        avisUrbanistique: acq.autreFrais?.avisUrbanistique || 0,
        bornageCite: acq.autreFrais?.bornageCite || 0,
        bornageParcelle: acq.autreFrais?.bornageParcelle || 0,
        paiementDessinateur: acq.autreFrais?.paiementDessinateur || 0,
        fraisDocumentCadastraux: acq.autreFrais?.fraisDocumentCadastraux || 0,
        commission: acq.autreFrais?.commission || 0,
        autresPersonnalises: acq.autreFrais?.autresPersonnalises || [],
      },
    })
    setFormErrors({})
    setShowAutreFrais(false)
    setIsFormOpen(true)
  }

  function handleValidate() {
    if (!validateForm()) return
    setIsFormOpen(false)
    setIsResumeOpen(true)
  }

  async function handleSubmit() {
    setIsResumeOpen(false)
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("authToken")
      const payload = {
        nomCite: form.nomCite,
        nbHectaresAchetes: parseFloat(form.nbHectaresAchetes),
        prixUnitaire: parseFloat(form.prixUnitaire),
        montantPayer: parseFloat(form.montantPayer),
        agentAttribue: form.agentAttribue || null,
        autreFrais: form.autreFrais,
      }
      if (editingAcquisition) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/acquisitions/${editingAcquisition._id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/acquisitions`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
      }
      await fetchAcquisitions()
      setIsSuccessOpen(true)
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.message || "Une erreur est survenue"
        : "Une erreur est survenue"
      setErrorMessage(msg)
      setIsErrorOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDeleteRequest(id: string) {
    setAcquisitionToDelete(id)
    setIsDeleteOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!acquisitionToDelete) return
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/acquisitions/${acquisitionToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setAcquisitions((prev) => prev.filter((a) => a._id !== acquisitionToDelete))
      toast.success("Acquisition supprimée")
    } catch {
      toast.error("Impossible de supprimer l'acquisition")
    } finally {
      setIsDeleteOpen(false)
      setAcquisitionToDelete(null)
    }
  }

  function addCustomFrais() {
    setForm((prev) => ({
      ...prev,
      autreFrais: {
        ...prev.autreFrais,
        autresPersonnalises: [...prev.autreFrais.autresPersonnalises, { label: "", valeur: 0 }],
      },
    }))
  }

  function updateCustomFrais(index: number, field: "label" | "valeur", value: string | number) {
    setForm((prev) => {
      const updated = [...prev.autreFrais.autresPersonnalises]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, autreFrais: { ...prev.autreFrais, autresPersonnalises: updated } }
    })
  }

  function removeCustomFrais(index: number) {
    setForm((prev) => ({
      ...prev,
      autreFrais: {
        ...prev.autreFrais,
        autresPersonnalises: prev.autreFrais.autresPersonnalises.filter((_, i) => i !== index),
      },
    }))
  }

  const selectedAgent = agents.find((a) => a._id === form.agentAttribue)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Acquisitions</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} acquisition{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button
          onClick={handleOpenNew}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle acquisition
        </Button>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom de cité ou agent..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtres
          {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {showFilters && (
        <Card className="border border-gray-200 dark:border-slate-700">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Agent</Label>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="none">Sans agent</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.nom} {a.prenom || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
          <ShoppingCart className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">Aucune acquisition trouvée</p>
          {!searchQuery && agentFilter === "all" && (
            <Button variant="outline" onClick={handleOpenNew} className="gap-2">
              <Plus className="h-4 w-4" /> Créer la première acquisition
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Nom de la cité</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Hectares</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Payé</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Reste</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Agent</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filtered.map((acq) => (
                <tr
                  key={acq._id}
                  className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {acq.nomCite}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                    {acq.nbHectaresAchetes} ha
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200 font-medium">
                    {formatNumber(acq.total)} $
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-medium">
                    {formatNumber(acq.montantPayer)} $
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      className={
                        acq.resteAPayer <= 0
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }
                    >
                      {formatNumber(acq.resteAPayer)} $
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {acq.agentAttribue ? `${acq.agentAttribue.nom} ${acq.agentAttribue.prenom || ""}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/acquisitions/${acq._id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> Voir détail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(acq)}>
                          <Pencil className="h-4 w-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteRequest(acq._id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── FORM DIALOG ─── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {editingAcquisition ? "Modifier l'acquisition" : "Nouvelle acquisition"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations relatives à l&apos;acquisition foncière.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Nom cité */}
            <div className="space-y-1">
              <Label>Nom de la cité <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: Cité des palmiers"
                value={form.nomCite}
                onChange={(e) => setForm({ ...form, nomCite: e.target.value })}
              />
              {formErrors.nomCite && <p className="text-xs text-red-500">{formErrors.nomCite}</p>}
            </div>

            {/* Hectares & Prix */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nb hectares achetés <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.nbHectaresAchetes}
                  onChange={(e) => setForm({ ...form, nbHectaresAchetes: e.target.value })}
                />
                {formErrors.nbHectaresAchetes && <p className="text-xs text-red-500">{formErrors.nbHectaresAchetes}</p>}
              </div>
              <div className="space-y-1">
                <Label>Prix unitaire ($) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.prixUnitaire}
                  onChange={(e) => setForm({ ...form, prixUnitaire: e.target.value })}
                />
                {formErrors.prixUnitaire && <p className="text-xs text-red-500">{formErrors.prixUnitaire}</p>}
              </div>
            </div>

            {/* Totaux calculés */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatNumber(total)} $</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Montant payé</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatNumber(parseFloat(form.montantPayer) || 0)} $</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reste à payer</p>
                <p className={`text-lg font-bold ${resteAPayer > 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                  {formatNumber(resteAPayer)} $
                </p>
              </div>
            </div>

            {/* Montant payé */}
            <div className="space-y-1">
              <Label>Montant payé ($) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.montantPayer}
                onChange={(e) => setForm({ ...form, montantPayer: e.target.value })}
              />
              {formErrors.montantPayer && <p className="text-xs text-red-500">{formErrors.montantPayer}</p>}
            </div>

            {/* Autres frais (collapsible) */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAutreFrais(!showAutreFrais)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span>Autres frais {totalAutreFrais > 0 && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">({formatNumber(totalAutreFrais)} $)</span>}</span>
                {showAutreFrais ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {showAutreFrais && (
                <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "avisUrbanistique", label: "Avis urbanistique" },
                      { key: "bornageCite", label: "Bornage cité" },
                      { key: "bornageParcelle", label: "Bornage parcelle" },
                      { key: "paiementDessinateur", label: "Paiement dessinateur" },
                      { key: "fraisDocumentCadastraux", label: "Frais document cadastraux" },
                      { key: "commission", label: "Commission" },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{label} ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.autreFrais[key as keyof typeof defaultAutreFrais] as number}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              autreFrais: { ...prev.autreFrais, [key]: parseFloat(e.target.value) || 0 },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Frais personnalisés */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Autres frais personnalisés</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addCustomFrais} className="gap-1 h-7 text-xs">
                        <Plus className="h-3 w-3" /> Ajouter
                      </Button>
                    </div>
                    {form.autreFrais.autresPersonnalises.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          placeholder="Libellé"
                          value={item.label}
                          onChange={(e) => updateCustomFrais(idx, "label", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.valeur}
                          onChange={(e) => updateCustomFrais(idx, "valeur", parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomFrais(idx)}
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Agent */}
            {currentUserRole === "Admin" && (
              <div className="space-y-1">
                <Label>Attribuer à un agent</Label>
                <Select
                  value={form.agentAttribue}
                  onValueChange={(v) => setForm({ ...form, agentAttribue: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun agent</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.nom} {a.prenom || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button
              onClick={handleValidate}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Valider & voir le résumé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── RESUME DIALOG ─── */}
      <Dialog open={isResumeOpen} onOpenChange={setIsResumeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Résumé de l&apos;acquisition</DialogTitle>
            <DialogDescription>Vérifiez les informations avant de confirmer.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-2 pr-2">
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    <tr className="bg-gray-50 dark:bg-slate-800">
                      <td className="px-4 py-2 font-medium text-gray-500">Cité</td>
                      <td className="px-4 py-2 font-semibold text-gray-900 dark:text-white">{form.nomCite}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-gray-500">Hectares</td>
                      <td className="px-4 py-2">{form.nbHectaresAchetes} ha</td>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-slate-800">
                      <td className="px-4 py-2 font-medium text-gray-500">Prix unitaire</td>
                      <td className="px-4 py-2">{formatNumber(parseFloat(form.prixUnitaire) || 0)} $</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-gray-500">Total</td>
                      <td className="px-4 py-2 font-bold text-blue-600">{formatNumber(total)} $</td>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-slate-800">
                      <td className="px-4 py-2 font-medium text-gray-500">Montant payé</td>
                      <td className="px-4 py-2 font-bold text-green-600">{formatNumber(parseFloat(form.montantPayer) || 0)} $</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-gray-500">Reste à payer</td>
                      <td className={`px-4 py-2 font-bold ${resteAPayer > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatNumber(resteAPayer)} $
                      </td>
                    </tr>
                    {totalAutreFrais > 0 && (
                      <tr className="bg-gray-50 dark:bg-slate-800">
                        <td className="px-4 py-2 font-medium text-gray-500">Autres frais</td>
                        <td className="px-4 py-2 font-bold text-orange-600">{formatNumber(totalAutreFrais)} $</td>
                      </tr>
                    )}
                    {selectedAgent && (
                      <tr>
                        <td className="px-4 py-2 font-medium text-gray-500">Agent</td>
                        <td className="px-4 py-2">{selectedAgent.nom} {selectedAgent.prenom || ""}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Détail autres frais */}
              {totalAutreFrais > 0 && (
                <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 p-4">
                  <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-3">Détail des autres frais</h4>
                  <div className="space-y-1 text-sm">
                    {form.autreFrais.avisUrbanistique > 0 && (
                      <div className="flex justify-between"><span className="text-gray-600">Avis urbanistique</span><span>{formatNumber(form.autreFrais.avisUrbanistique)} $</span></div>
                    )}
                    {form.autreFrais.bornageCite > 0 && (
                      <div className="flex justify-between"><span className="text-gray-600">Bornage cité</span><span>{formatNumber(form.autreFrais.bornageCite)} $</span></div>
                    )}
                    {form.autreFrais.bornageParcelle > 0 && (
                      <div className="flex justify-between"><span className="text-gray-600">Bornage parcelle</span><span>{formatNumber(form.autreFrais.bornageParcelle)} $</span></div>
                    )}
                    {form.autreFrais.paiementDessinateur > 0 && (
                      <div className="flex justify-between"><span className="text-gray-600">Paiement dessinateur</span><span>{formatNumber(form.autreFrais.paiementDessinateur)} $</span></div>
                    )}
                    {form.autreFrais.fraisDocumentCadastraux > 0 && (
                      <div className="flex justify-between"><span className="text-gray-600">Frais document cadastraux</span><span>{formatNumber(form.autreFrais.fraisDocumentCadastraux)} $</span></div>
                    )}
                    {form.autreFrais.commission > 0 && (
                      <div className="flex justify-between"><span className="text-gray-600">Commission</span><span>{formatNumber(form.autreFrais.commission)} $</span></div>
                    )}
                    {form.autreFrais.autresPersonnalises.filter(f => f.label || f.valeur > 0).map((f, i) => (
                      <div key={i} className="flex justify-between"><span className="text-gray-600">{f.label || `Frais ${i + 1}`}</span><span>{formatNumber(f.valeur)} $</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsResumeOpen(false); setIsFormOpen(true) }}>
              Modifier
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Confirmer & enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── LOADER DIALOG ─── */}
      <Dialog open={isSubmitting} onOpenChange={() => {}}>
        <DialogContent className="max-w-xs text-center" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-base font-medium text-gray-700 dark:text-gray-300">Enregistrement en cours...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── SUCCESS DIALOG ─── */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Enregistré !</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              L&apos;acquisition a été {editingAcquisition ? "mise à jour" : "créée"} avec succès.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSuccessOpen(false)} className="w-full">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ERROR DIALOG ─── */}
      <Dialog open={isErrorOpen} onOpenChange={setIsErrorOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-6">
            <AlertCircle className="h-16 w-16 text-red-500" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Erreur</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{errorMessage}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsErrorOpen(false)} className="w-full">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRM ─── */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;acquisition ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L&apos;acquisition sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
