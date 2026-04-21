"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Eye,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  MessageSquare,
  X,
  User,
  Receipt,
  CheckCircle2,
  ShieldCheck,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────
type InvoiceType = "normale" | "proforma"
type Devise = "USD" | "EUR" | "CDF"
type Statut = "brouillon" | "envoye" | "paye" | "annule"

interface Ligne {
  description: string
  quantite: number
  prixUnitaire: number
  total: number
}

interface ClientInfo {
  nom: string
  prenom?: string
  email?: string
  telephone?: string
  indicatif?: string
  adresse?: string
}

interface ClientResult {
  _id: string
  nom: string
  prenom?: string
  email?: string
  telephone?: string
  indicatif?: string
  _type: "client" | "prospect"
}

interface FacturePro {
  _id: string
  numero: string
  type: InvoiceType
  date: string
  dateEcheance?: string
  clientInfo: ClientInfo
  lignes: Ligne[]
  devise: Devise
  sousTotal: number
  tauxTVA: number
  montantTVA: number
  total: number
  notes?: string
  conditions?: string
  statut: Statut
  createdAt: string
}

// ── Config ────────────────────────────────────────────────────
const STATUT_CONFIG: Record<Statut, { label: string; cls: string }> = {
  brouillon: { label: "Brouillon",   cls: "bg-gray-100 text-gray-600 border-gray-200" },
  envoye:    { label: "Envoyé",      cls: "bg-blue-100 text-blue-700 border-blue-200" },
  paye:      { label: "Payé",        cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  annule:    { label: "Annulé",      cls: "bg-red-100 text-red-600 border-red-200" },
}

const QAVAH_COLOR = "#896137"

function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function fmtAmt(n: number, devise: string) {
  return `${Number(n).toLocaleString("fr-FR")} ${devise}`
}

const emptyLigne = (): Ligne => ({ description: "", quantite: 1, prixUnitaire: 0, total: 0 })

// ── Main Component ────────────────────────────────────────────
export default function FacturesProPage() {
  const [factures, setFactures] = useState<FacturePro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statutFilter, setStatutFilter] = useState("all")

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  // PDF preview
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Access dialog
  type AgentAccess = { _id: string; nom: string; prenom?: string; email: string; hasAccess: boolean }
  const [showAccessDialog, setShowAccessDialog] = useState(false)
  const [agentsList, setAgentsList] = useState<AgentAccess[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)
  const [checkedAgents, setCheckedAgents] = useState<Set<string>>(new Set())
  const [isSavingAccess, setIsSavingAccess] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Form state
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("normale")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])
  const [invoiceDateEcheance, setInvoiceDateEcheance] = useState("")
  const [devise, setDevise] = useState<Devise>("USD")
  const [notes, setNotes] = useState("")
  const [conditions, setConditions] = useState("")
  const [lignes, setLignes] = useState<Ligne[]>([emptyLigne()])
  const [tauxTVA, setTauxTVA] = useState(0)

  // Client selection
  const [clientSearch, setClientSearch] = useState("")
  const [clientResults, setClientResults] = useState<ClientResult[]>([])
  const [isSearchingClient, setIsSearchingClient] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null)
  const [clientInfo, setClientInfo] = useState<ClientInfo>({ nom: "", prenom: "", email: "", telephone: "", indicatif: "", adresse: "" })
  const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Actions
  const [enregistrer, setEnregistrer] = useState(true)
  const [envoyerEmail, setEnvoyerEmail] = useState(false)
  const [envoyerWhatsapp, setEnvoyerWhatsapp] = useState(false)
  const [telecharger, setTelecharger] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  // ── Computed totals ──────────────────────────────────────────
  const sousTotal = lignes.reduce((s, l) => s + (l.total || 0), 0)
  const montantTVA = sousTotal * (tauxTVA / 100)
  const totalFacture = sousTotal + montantTVA

  // ── Detect admin role ────────────────────────────────────────
  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
    if (role) { setIsAdmin(role === "Admin"); return }
    // Fallback: fetch from API
    axios.get(`${api}/users/me`, { headers }).then(r => setIsAdmin(r.data?.role === "Admin")).catch(() => {})
  }, [])

  // ── Access dialog ────────────────────────────────────────────
  async function openAccessDialog() {
    setShowAccessDialog(true)
    setIsLoadingAgents(true)
    try {
      const res = await axios.get(`${api}/factures-pro/agents-access`, { headers })
      const agents: AgentAccess[] = res.data.data || []
      setAgentsList(agents)
      setCheckedAgents(new Set(agents.filter(a => a.hasAccess).map(a => a._id)))
    } catch { toast.error("Impossible de charger la liste des agents") }
    finally { setIsLoadingAgents(false) }
  }

  function toggleAgent(id: string) {
    setCheckedAgents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function saveAccess() {
    setIsSavingAccess(true)
    try {
      await axios.post(`${api}/factures-pro/agents-access`, { userIds: [...checkedAgents] }, { headers })
      toast.success("Accès mis à jour")
      setShowAccessDialog(false)
    } catch { toast.error("Erreur lors de la mise à jour des accès") }
    finally { setIsSavingAccess(false) }
  }

  // ── Fetch factures ───────────────────────────────────────────
  const fetchFactures = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: 15 }
      if (searchTerm) params.search = searchTerm
      if (typeFilter !== "all") params.type = typeFilter
      if (statutFilter !== "all") params.statut = statutFilter
      const res = await axios.get(`${api}/factures-pro`, { headers, params })
      setFactures(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch {
      toast.error("Impossible de charger les factures")
    } finally {
      setIsLoading(false)
    }
  }, [page, searchTerm, typeFilter, statutFilter])

  useEffect(() => { fetchFactures() }, [fetchFactures])

  // ── Client search ────────────────────────────────────────────
  useEffect(() => {
    if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current)
    if (clientSearch.trim().length < 2) { setClientResults([]); return }
    clientSearchTimer.current = setTimeout(async () => {
      setIsSearchingClient(true)
      try {
        const res = await axios.get(`${api}/factures-pro/search-clients`, { headers, params: { q: clientSearch } })
        const clients: ClientResult[] = (res.data.clients || []).map((c: ClientResult) => ({ ...c, _type: "client" as const }))
        const prospects: ClientResult[] = (res.data.prospects || []).map((p: ClientResult) => ({ ...p, _type: "prospect" as const }))
        setClientResults([...clients, ...prospects])
      } catch { setClientResults([]) }
      finally { setIsSearchingClient(false) }
    }, 300)
  }, [clientSearch])

  function selectClient(c: ClientResult) {
    setSelectedClient(c)
    setClientInfo({
      nom: c.nom,
      prenom: c.prenom || "",
      email: c.email || "",
      telephone: c.telephone || "",
      indicatif: c.indicatif || "",
      adresse: "",
    })
    setClientSearch(`${c.nom}${c.prenom ? " " + c.prenom : ""}`)
    setClientResults([])
  }

  // ── Line item helpers ─────────────────────────────────────────
  function updateLigne(index: number, field: keyof Ligne, value: string | number) {
    setLignes(prev => {
      const updated = [...prev]
      const ligne = { ...updated[index], [field]: value }
      if (field === "quantite" || field === "prixUnitaire") {
        ligne.total = Number(ligne.quantite) * Number(ligne.prixUnitaire)
      }
      updated[index] = ligne
      return updated
    })
  }

  function addLigne() { setLignes(prev => [...prev, emptyLigne()]) }
  function removeLigne(i: number) { setLignes(prev => prev.filter((_, idx) => idx !== i)) }

  // ── Reset form ────────────────────────────────────────────────
  function resetForm() {
    setInvoiceType("normale")
    setInvoiceDate(new Date().toISOString().split("T")[0])
    setInvoiceDateEcheance("")
    setDevise("USD")
    setNotes("")
    setConditions("")
    setLignes([emptyLigne()])
    setTauxTVA(0)
    setClientSearch("")
    setSelectedClient(null)
    setClientInfo({ nom: "", prenom: "", email: "", telephone: "", indicatif: "", adresse: "" })
    setClientResults([])
    setEnregistrer(true)
    setEnvoyerEmail(false)
    setEnvoyerWhatsapp(false)
    setTelecharger(false)
    setStep(1)
    if (pdfPreviewUrl) { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null) }
  }

  // ── Validate step 1 ───────────────────────────────────────────
  function validateStep1(): boolean {
    if (!clientInfo.nom.trim()) { toast.error("Sélectionnez ou renseignez un client"); return false }
    if (lignes.some(l => !l.description.trim())) { toast.error("Renseignez la description de chaque ligne"); return false }
    if (lignes.some(l => l.prixUnitaire <= 0)) { toast.error("Le prix unitaire doit être supérieur à 0"); return false }
    return true
  }

  // ── PDF Preview ───────────────────────────────────────────────
  async function handlePreviewPdf() {
    if (!validateStep1()) return
    setIsPreviewLoading(true)
    try {
      const res = await axios.post(
        `${api}/factures-pro/preview`,
        buildPayload(),
        { headers, responseType: "blob" }
      )
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      setPdfPreviewUrl(url)
    } catch {
      toast.error("Erreur lors de la génération du PDF")
    } finally {
      setIsPreviewLoading(false)
    }
  }

  // ── Build payload ─────────────────────────────────────────────
  function buildPayload() {
    return {
      type: invoiceType,
      date: invoiceDate,
      dateEcheance: invoiceDateEcheance || undefined,
      clientType: selectedClient?._type || "client",
      clientId: selectedClient?._type === "client" ? selectedClient._id : undefined,
      prospectId: selectedClient?._type === "prospect" ? selectedClient._id : undefined,
      clientInfo,
      lignes,
      devise,
      sousTotal,
      tauxTVA,
      montantTVA,
      total: totalFacture,
      notes: notes || undefined,
      conditions: conditions || undefined,
      enregistrer,
      envoyerEmail,
      envoyerWhatsapp,
      telecharger,
    }
  }

  // ── Submit ────────────────────────────────────────────────────
  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const res = await axios.post(`${api}/factures-pro`, buildPayload(), { headers })
      const { numero, pdfBase64, results } = res.data

      // Download PDF if requested
      if (telecharger && pdfBase64) {
        const byteArray = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
        const blob = new Blob([byteArray], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${numero}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      // Toast results
      const msgs: string[] = [`Facture ${numero} créée`]
      if (enregistrer) msgs.push("enregistrée")
      if (results?.email?.success) msgs.push("email envoyé ✓")
      if (results?.email?.success === false) msgs.push("email échoué ✗")
      if (results?.whatsapp?.success) msgs.push("WhatsApp envoyé ✓")
      if (results?.whatsapp?.success === false) msgs.push("WhatsApp échoué ✗")
      toast.success(msgs.join(" · "))

      setShowCreateDialog(false)
      resetForm()
      fetchFactures()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Erreur lors de la création de la facture")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Download existing ─────────────────────────────────────────
  async function handleDownload(id: string, numero: string) {
    try {
      const res = await axios.get(`${api}/factures-pro/${id}/download`, { headers, responseType: "blob" })
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      const a = document.createElement("a")
      a.href = url; a.download = `${numero}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { toast.error("Erreur lors du téléchargement") }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette facture ?")) return
    try {
      await axios.delete(`${api}/factures-pro/${id}`, { headers })
      toast.success("Facture supprimée")
      fetchFactures()
    } catch { toast.error("Erreur lors de la suppression") }
  }

  const totalPages = Math.ceil(total / 15)

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: QAVAH_COLOR }}>
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Factures</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Créez et gérez vos factures professionnelles</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={openAccessDialog}
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              title="Gérer les droits d'accès"
            >
              <Shield className="h-4 w-4" />
              Droits d&apos;accès
            </Button>
          )}
          <Button
            onClick={() => { resetForm(); setShowCreateDialog(true) }}
            className="gap-2 text-white"
            style={{ background: QAVAH_COLOR }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle facture
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, bg: "bg-amber-50 border-amber-200 dark:bg-amber-900/10" },
          { label: "Envoyées", value: factures.filter(f => f.statut === "envoye").length, bg: "bg-blue-50 border-blue-200 dark:bg-blue-900/10" },
          { label: "Payées", value: factures.filter(f => f.statut === "paye").length, bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10" },
          { label: "Brouillons", value: factures.filter(f => f.statut === "brouillon").length, bg: "bg-gray-50 border-gray-200 dark:bg-gray-900/10" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par numéro ou client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="normale">Normale</SelectItem>
            <SelectItem value="proforma">Pro Forma</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.entries(STATUT_CONFIG) as [Statut, { label: string; cls: string }][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: QAVAH_COLOR }} />
        </div>
      ) : factures.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune facture trouvée</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                {["Numéro", "Type", "Client", "Date", "Total", "Statut", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {factures.map(f => (
                <tr key={f._id} className="bg-white dark:bg-slate-900 hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {f.numero}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      f.type === "proforma" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"
                    )}>
                      {f.type === "proforma" ? "Pro Forma" : "Normale"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {f.clientInfo?.nom} {f.clientInfo?.prenom || ""}
                    </div>
                    {f.clientInfo?.email && (
                      <div className="text-xs text-gray-400">{f.clientInfo.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {fmt(f.date)}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: QAVAH_COLOR }}>
                    {fmtAmt(f.total, f.devise)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", STATUT_CONFIG[f.statut]?.cls)}>
                      {STATUT_CONFIG[f.statut]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(f._id, f.numero)}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-amber-100 text-gray-400 hover:text-amber-700 transition-colors"
                        title="Télécharger PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(f._id)}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CREATE DIALOG (multi-step)
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showCreateDialog} onOpenChange={v => { if (!v) { setShowCreateDialog(false); resetForm() } }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          {/* Dialog header */}
          <div className="p-6 pb-4 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: QAVAH_COLOR }}>
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {step === 1 ? "Nouvelle facture" : "Récapitulatif & Validation"}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-400">
                  {step === 1 ? "Renseignez les informations de la facture" : "Vérifiez les détails avant de valider"}
                </DialogDescription>
              </div>
              {/* Step indicator */}
              <div className="ml-auto flex items-center gap-2">
                {[1, 2].map(s => (
                  <div
                    key={s}
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                      s === step ? "text-white" : s < step ? "text-white" : "bg-gray-100 text-gray-400"
                    )}
                    style={s <= step ? { background: QAVAH_COLOR } : {}}
                  >
                    {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* ───── STEP 1: FORM ───── */}
            {step === 1 && (
              <>
                {/* Type & Date row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Type de facture <span className="text-red-500">*</span></Label>
                    <Select value={invoiceType} onValueChange={v => setInvoiceType(v as InvoiceType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normale">Facture Normale</SelectItem>
                        <SelectItem value="proforma">Facture Pro Forma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Date <span className="text-red-500">*</span></Label>
                    <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Date d&apos;échéance</Label>
                    <Input type="date" value={invoiceDateEcheance} onChange={e => setInvoiceDateEcheance(e.target.value)} />
                  </div>
                </div>

                {/* Client search */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Client / Prospect <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un client ou prospect (min. 2 lettres)..."
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); if (!e.target.value) setSelectedClient(null) }}
                      className="pl-9"
                    />
                    {isSearchingClient && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                    )}
                    {clientResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-lg max-h-52 overflow-y-auto">
                        {clientResults.map(c => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => selectClient(c)}
                            className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-amber-50 dark:hover:bg-slate-700 text-left transition-colors"
                          >
                            <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: c._type === "client" ? "#896137" : "#3b82f6" }}>
                              <User className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                {c.nom} {c.prenom || ""}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {c._type === "client" ? "Client" : "Prospect"}{c.email ? ` · ${c.email}` : ""}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual client info fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-4 bg-amber-50/40 dark:bg-slate-800/40 rounded-lg border border-amber-100 dark:border-slate-700">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Nom <span className="text-red-500">*</span></Label>
                      <Input value={clientInfo.nom} onChange={e => setClientInfo(p => ({ ...p, nom: e.target.value }))} placeholder="Nom" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Prénom</Label>
                      <Input value={clientInfo.prenom || ""} onChange={e => setClientInfo(p => ({ ...p, prenom: e.target.value }))} placeholder="Prénom" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Email</Label>
                      <Input type="email" value={clientInfo.email || ""} onChange={e => setClientInfo(p => ({ ...p, email: e.target.value }))} placeholder="email@exemple.com" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Téléphone</Label>
                      <div className="flex gap-1.5">
                        <Input value={clientInfo.indicatif || ""} onChange={e => setClientInfo(p => ({ ...p, indicatif: e.target.value }))} placeholder="+243" className="h-8 text-sm w-20 shrink-0" />
                        <Input value={clientInfo.telephone || ""} onChange={e => setClientInfo(p => ({ ...p, telephone: e.target.value }))} placeholder="Téléphone" className="h-8 text-sm flex-1" />
                      </div>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs text-gray-500">Adresse (optionnel)</Label>
                      <Input value={clientInfo.adresse || ""} onChange={e => setClientInfo(p => ({ ...p, adresse: e.target.value }))} placeholder="Adresse complète" className="h-8 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Devise */}
                <div className="flex items-center gap-4">
                  <div className="space-y-1.5 w-36">
                    <Label className="text-sm">Devise</Label>
                    <Select value={devise} onValueChange={v => setDevise(v as Devise)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="CDF">CDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 w-36">
                    <Label className="text-sm">TVA (%)</Label>
                    <Input
                      type="number" min="0" max="100" step="0.1"
                      value={tauxTVA}
                      onChange={e => setTauxTVA(Math.max(0, Math.min(100, Number(e.target.value))))}
                    />
                  </div>
                </div>

                {/* Line items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Lignes de facture <span className="text-red-500">*</span></Label>
                    <Button type="button" size="sm" variant="outline" onClick={addLigne} className="h-7 text-xs gap-1">
                      <Plus className="h-3 w-3" /> Ajouter une ligne
                    </Button>
                  </div>

                  {/* Table header */}
                  <div className="rounded-t-lg text-xs font-medium text-white px-3 py-2 grid grid-cols-[1fr_80px_110px_100px_30px] gap-2" style={{ background: QAVAH_COLOR }}>
                    <span>Description</span>
                    <span className="text-center">Qté</span>
                    <span className="text-right">Prix unitaire</span>
                    <span className="text-right">Total</span>
                    <span />
                  </div>

                  <div className="border border-amber-100 dark:border-slate-700 rounded-b-lg overflow-hidden divide-y divide-amber-50 dark:divide-slate-800">
                    {lignes.map((ligne, i) => (
                      <div key={i} className={cn(
                        "grid grid-cols-[1fr_80px_110px_100px_30px] gap-2 px-3 py-2 items-center",
                        i % 2 === 0 ? "bg-amber-50/30 dark:bg-slate-900" : "bg-white dark:bg-slate-800"
                      )}>
                        <Input
                          value={ligne.description}
                          onChange={e => updateLigne(i, "description", e.target.value)}
                          placeholder="Description de la prestation..."
                          className="h-8 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
                        />
                        <Input
                          type="number" min="1"
                          value={ligne.quantite}
                          onChange={e => updateLigne(i, "quantite", Number(e.target.value))}
                          className="h-8 text-xs text-center border-amber-200 dark:border-slate-700"
                        />
                        <Input
                          type="number" min="0" step="0.01"
                          value={ligne.prixUnitaire}
                          onChange={e => updateLigne(i, "prixUnitaire", Number(e.target.value))}
                          className="h-8 text-xs text-right border-amber-200 dark:border-slate-700"
                        />
                        <div className="text-xs font-semibold text-right pr-1" style={{ color: QAVAH_COLOR }}>
                          {fmtAmt(ligne.total, devise)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLigne(i)}
                          disabled={lignes.length === 1}
                          className="h-6 w-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Totals summary */}
                  <div className="flex justify-end pt-2">
                    <div className="w-64 space-y-1.5 text-sm">
                      <div className="flex justify-between text-gray-500">
                        <span>Sous-total</span>
                        <span className="font-medium text-gray-900 dark:text-white">{fmtAmt(sousTotal, devise)}</span>
                      </div>
                      {tauxTVA > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>TVA ({tauxTVA}%)</span>
                          <span className="font-medium text-gray-900 dark:text-white">{fmtAmt(montantTVA, devise)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base pt-1.5 border-t border-amber-200 dark:border-slate-700">
                        <span style={{ color: QAVAH_COLOR }}>TOTAL</span>
                        <span style={{ color: QAVAH_COLOR }}>{fmtAmt(totalFacture, devise)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes & Conditions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Remarques, informations complémentaires..."
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Conditions de paiement</Label>
                    <Textarea
                      value={conditions}
                      onChange={e => setConditions(e.target.value)}
                      placeholder="Paiement à 30 jours, virement bancaire..."
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ───── STEP 2: SUMMARY ───── */}
            {step === 2 && (
              <>
                {/* Invoice summary card */}
                <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: QAVAH_COLOR + "40" }}>
                  {/* Header */}
                  <div className="px-5 py-4 text-white" style={{ background: QAVAH_COLOR }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg">{invoiceType === "proforma" ? "FACTURE PRO FORMA" : "FACTURE"}</p>
                        <p className="text-sm opacity-80">Date : {invoiceDate}</p>
                        {invoiceDateEcheance && <p className="text-sm opacity-80">Échéance : {invoiceDateEcheance}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{fmtAmt(totalFacture, devise)}</p>
                        <p className="text-sm opacity-80">{devise}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-5 bg-white dark:bg-slate-900">
                    {/* Client */}
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-slate-800 border border-amber-100 dark:border-slate-700">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: QAVAH_COLOR }}>Facturé à</p>
                      <p className="font-bold text-gray-900 dark:text-white">{clientInfo.nom} {clientInfo.prenom || ""}</p>
                      {clientInfo.email && <p className="text-sm text-gray-500">{clientInfo.email}</p>}
                      {(clientInfo.indicatif || clientInfo.telephone) && (
                        <p className="text-sm text-gray-500">{clientInfo.indicatif}{clientInfo.telephone}</p>
                      )}
                      {clientInfo.adresse && <p className="text-sm text-gray-500">{clientInfo.adresse}</p>}
                    </div>

                    {/* Lines */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: QAVAH_COLOR }}>Prestations</p>
                      <div className="rounded-lg overflow-hidden border border-amber-100 dark:border-slate-700">
                        <div className="grid grid-cols-[1fr_60px_100px_90px] text-xs font-medium text-white px-3 py-2 gap-2" style={{ background: QAVAH_COLOR }}>
                          <span>Description</span><span className="text-center">Qté</span>
                          <span className="text-right">P.U.</span><span className="text-right">Total</span>
                        </div>
                        {lignes.map((l, i) => (
                          <div key={i} className={cn(
                            "grid grid-cols-[1fr_60px_100px_90px] text-sm px-3 py-2 gap-2",
                            i % 2 === 0 ? "bg-amber-50/40 dark:bg-slate-800" : "bg-white dark:bg-slate-900"
                          )}>
                            <span className="truncate">{l.description}</span>
                            <span className="text-center text-gray-500">{l.quantite}</span>
                            <span className="text-right text-gray-500">{fmtAmt(l.prixUnitaire, devise)}</span>
                            <span className="text-right font-semibold">{fmtAmt(l.total, devise)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-gray-500">
                        <span>Sous-total</span><span>{fmtAmt(sousTotal, devise)}</span>
                      </div>
                      {tauxTVA > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>TVA ({tauxTVA}%)</span><span>{fmtAmt(montantTVA, devise)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base border-t border-amber-200 dark:border-slate-700 pt-2" style={{ color: QAVAH_COLOR }}>
                        <span>TOTAL</span><span>{fmtAmt(totalFacture, devise)}</span>
                      </div>
                    </div>

                    {notes && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: QAVAH_COLOR }}>Notes</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{notes}</p>
                      </div>
                    )}
                    {conditions && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: QAVAH_COLOR }}>Conditions de paiement</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{conditions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* PDF Preview button */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handlePreviewPdf}
                    disabled={isPreviewLoading}
                    className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    {isPreviewLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Eye className="h-4 w-4" />}
                    Prévisualiser le PDF
                  </Button>
                </div>

                {/* Actions checkboxes */}
                <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Actions à effectuer</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: "enregistrer", checked: enregistrer, set: setEnregistrer, icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, label: "Enregistrer dans la base de données", desc: "Conserve la facture pour un accès futur" },
                      { key: "telecharger", checked: telecharger, set: setTelecharger, icon: <Download className="h-4 w-4 text-blue-600" />, label: "Télécharger une copie PDF", desc: "Télécharge le PDF sur votre appareil" },
                      { key: "email", checked: envoyerEmail, set: setEnvoyerEmail, icon: <Send className="h-4 w-4 text-purple-600" />, label: "Envoyer par email au client", desc: clientInfo.email ? `Email : ${clientInfo.email}` : "Aucun email renseigné", disabled: !clientInfo.email },
                      { key: "whatsapp", checked: envoyerWhatsapp, set: setEnvoyerWhatsapp, icon: <MessageSquare className="h-4 w-4 text-green-600" />, label: "Envoyer via WhatsApp", desc: (clientInfo.indicatif || clientInfo.telephone) ? `${clientInfo.indicatif || ""}${clientInfo.telephone || ""}` : "Aucun téléphone renseigné", disabled: !clientInfo.telephone },
                    ].map(opt => (
                      <label
                        key={opt.key}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          opt.disabled ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-800 border-gray-200" :
                            opt.checked ? "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700" :
                              "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-amber-200"
                        )}
                      >
                        <Checkbox
                          checked={opt.checked}
                          onCheckedChange={v => !opt.disabled && opt.set(!!v)}
                          disabled={opt.disabled}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                            {opt.icon}
                            {opt.label}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Dialog footer ── */}
          <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
            {step === 1 ? (
              <>
                <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm() }}>
                  Annuler
                </Button>
                <Button
                  onClick={() => { if (validateStep1()) setStep(2) }}
                  className="gap-2 text-white"
                  style={{ background: QAVAH_COLOR }}
                >
                  Suivant — Récapitulatif
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Retour
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2 text-white"
                  style={{ background: QAVAH_COLOR }}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Valider et finaliser
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Access Management Dialog ─── */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" style={{ color: QAVAH_COLOR }} />
              Droits d&apos;accès — Factures
            </DialogTitle>
            <DialogDescription>
              Cochez les agents qui peuvent voir la page &laquo; Factures &raquo; dans leur menu.
            </DialogDescription>
          </DialogHeader>

          {isLoadingAgents ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: QAVAH_COLOR }} />
            </div>
          ) : agentsList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun agent actif trouvé</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {agentsList.map(agent => (
                <label
                  key={agent._id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors border",
                    checkedAgents.has(agent._id)
                      ? "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700"
                      : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-amber-200"
                  )}
                >
                  <Checkbox
                    checked={checkedAgents.has(agent._id)}
                    onCheckedChange={() => toggleAgent(agent._id)}
                  />
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: QAVAH_COLOR }}
                    >
                      {agent.nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {agent.nom} {agent.prenom || ""}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{agent.email}</p>
                    </div>
                  </div>
                  {checkedAgents.has(agent._id) && (
                    <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: QAVAH_COLOR }} />
                  )}
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
            <p className="text-xs text-gray-400">
              {checkedAgents.size} agent{checkedAgents.size !== 1 ? "s" : ""} sélectionné{checkedAgents.size !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAccessDialog(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={saveAccess}
                disabled={isSavingAccess}
                className="gap-1.5 text-white"
                style={{ background: QAVAH_COLOR }}
              >
                {isSavingAccess ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── PDF Preview Dialog ─── */}
      <Dialog open={!!pdfPreviewUrl} onOpenChange={v => { if (!v && pdfPreviewUrl) { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null) } }}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: QAVAH_COLOR }}>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-white" />
              <span className="text-white font-semibold text-sm">Prévisualisation PDF</span>
            </div>
            <button
              onClick={() => { if (pdfPreviewUrl) { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null) } }}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {pdfPreviewUrl && (
            <iframe
              src={pdfPreviewUrl}
              className="flex-1 w-full"
              title="Prévisualisation facture PDF"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
