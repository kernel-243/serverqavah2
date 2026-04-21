"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icons } from "@/components/icons"
import { toast } from "react-hot-toast"
import axios from "axios"
import { motion } from "framer-motion"
import { Download, FileText, BarChart3, User, Hammer, ClipboardList } from "lucide-react"

interface ContratConstructionDetail {
  _id: string
  code: string
  statut: string
  dateContrat: string
  clientId: {
    _id: string
    code?: string
    nom: string
    postnom?: string
    prenom: string
    email: string
    indicatif: string
    telephone: string
    adresse?: string
  }
  contratTerrainId?: {
    _id: string
    code: string
    terrainId?: { numero: string; dimension?: string }
  } | null
  superficie: number
  typeConstruction: string
  montantTotal: number
  acompte: number
  dateDebutTravaux: string
  dureeTravaux: number
  architecte: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  en_cours:   { label: "En cours",   bg: "bg-orange-100 dark:bg-orange-900/30",  text: "text-orange-700 dark:text-orange-300",  dot: "bg-orange-500" },
  termine:    { label: "Terminé",    bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  en_attente: { label: "En attente", bg: "bg-amber-100 dark:bg-amber-900/30",    text: "text-amber-700 dark:text-amber-300",    dot: "bg-amber-500" },
  résilié:    { label: "Résilié",    bg: "bg-red-100 dark:bg-red-900/30",        text: "text-red-700 dark:text-red-300",        dot: "bg-red-500" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-500" }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function InfoRow({ label, value, highlight = false, mono = false }: { label: string; value: React.ReactNode; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0 min-w-0">{label}</span>
      <span className={`text-sm font-medium text-right min-w-0 break-all ${
        highlight
          ? "text-orange-600 dark:text-orange-400 font-bold text-base"
          : mono
          ? "font-mono text-slate-700 dark:text-slate-200"
          : "text-slate-800 dark:text-slate-100"
      }`}>
        {value}
      </span>
    </div>
  )
}

function SectionCard({ icon, title, delay, children, colSpan = 1 }: { icon: React.ReactNode; title: string; delay: number; children: React.ReactNode; colSpan?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={colSpan === 2 ? "col-span-1 md:col-span-2" : ""}
    >
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-800 dark:text-slate-100">
            <span className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              {icon}
            </span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  )
}

function DocumentCard({
  icon, title, description, filename, type, contratId, token
}: {
  icon: React.ReactNode
  title: string
  description: string
  filename: string
  type: "contrat" | "plan"
  contratId: string
  token: string
}) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/contrats-construction/${contratId}/documents/${type}`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      )
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success("Document téléchargé")
    } catch {
      toast.error("Erreur lors du téléchargement")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-orange-300 dark:hover:border-orange-500/50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{filename}</p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={handleDownload}
        disabled={isDownloading}
        className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white shadow-sm"
      >
        {isDownloading ? (
          <Icons.spinner className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-1.5" />
        )}
        {isDownloading ? "..." : "Télécharger"}
      </Button>
    </div>
  )
}

export default function ContratConstructionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contrat, setContrat] = useState<ContratConstructionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState("")

  useEffect(() => {
    const t = localStorage.getItem("authToken") || ""
    setToken(t)
    if (id) fetchContrat(t)
  }, [id])

  const fetchContrat = async (t = token) => {
    setIsLoading(true)
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats-construction/${id}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      setContrat(res.data)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        toast.error("Contrat introuvable")
      } else {
        toast.error("Erreur lors du chargement du contrat")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Icons.spinner className="h-6 w-6 animate-spin text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!contrat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <Icons.hardHat className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Contrat introuvable</h2>
          <Button onClick={() => router.back()} variant="outline">
            <Icons.arrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
        </div>
      </div>
    )
  }

  const dateFin = new Date(contrat.dateDebutTravaux)
  dateFin.setMonth(dateFin.getMonth() + contrat.dureeTravaux)
  const progression = Math.min(100, Math.round((contrat.acompte / contrat.montantTotal) * 100))
  const solde = contrat.montantTotal - contrat.acompte
  const fmt = (d: string | Date) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
  const fmtMoney = (n: number) => `$${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-start md:justify-between gap-5"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Icons.arrowLeft className="h-4 w-4 mr-1.5" />
                Retour
              </Button>
              <StatusBadge status={contrat.statut} />
              {contrat.createdAt && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Créé le {fmt(contrat.createdAt)}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {contrat.code}
              </h1>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                {contrat.typeConstruction} · {contrat.superficie} m²
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchContrat()}
              className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Icons.refresh className="h-4 w-4 mr-1.5" />
              Actualiser
            </Button>
          </div>
        </motion.div>

        {/* ── STATS BAR ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { label: "Montant total", value: fmtMoney(contrat.montantTotal), color: "text-orange-600 dark:text-orange-400" },
            { label: "Acompte versé", value: fmtMoney(contrat.acompte), color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Solde restant", value: fmtMoney(solde), color: "text-red-500 dark:text-red-400" },
            { label: "Progression", value: `${progression}%`, color: "text-blue-600 dark:text-blue-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* ── PROGRESS BAR ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Progression des paiements</span>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{progression}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progression}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="h-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1.5">
            <span>Acompte: {fmtMoney(contrat.acompte)}</span>
            <span>Total: {fmtMoney(contrat.montantTotal)}</span>
          </div>
        </motion.div>

        {/* ── TABS ───────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Tabs defaultValue="details">
            <TabsList className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl mb-6">
              <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-slate-600 dark:text-slate-400">
                <ClipboardList className="h-4 w-4 mr-2" />
                Détails
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-slate-600 dark:text-slate-400">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
            </TabsList>

            {/* ── TAB: DÉTAILS ─────────────────────────────────────────────── */}
            <TabsContent value="details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Infos contrat */}
                <SectionCard icon={<Icons.fileText className="h-4 w-4" />} title="Informations du contrat" delay={0.2}>
                  <InfoRow label="N° de contrat" value={contrat.code} mono />
                  <InfoRow label="Date du contrat" value={fmt(contrat.dateContrat)} />
                  <InfoRow label="Type de construction" value={contrat.typeConstruction} />
                  <InfoRow label="Superficie" value={`${contrat.superficie} m²`} />
                  <InfoRow label="Statut" value={<StatusBadge status={contrat.statut} />} />
                  {contrat.contratTerrainId && (
                    <InfoRow
                      label="Contrat terrain lié"
                      value={`${contrat.contratTerrainId.code}${contrat.contratTerrainId.terrainId?.numero ? ` · Terrain N°${contrat.contratTerrainId.terrainId.numero}` : ""}`}
                      mono
                    />
                  )}
                </SectionCard>

                {/* Client */}
                <SectionCard icon={<User className="h-4 w-4" />} title="Client" delay={0.25}>
                  <InfoRow
                    label="Nom complet"
                    value={`${contrat.clientId.prenom} ${contrat.clientId.postnom ?? ""} ${contrat.clientId.nom}`.replace(/\s+/g, " ").trim()}
                  />
                  {contrat.clientId.code && <InfoRow label="Code client" value={contrat.clientId.code} mono />}
                  <InfoRow label="Email" value={contrat.clientId.email || "—"} />
                  <InfoRow label="Téléphone" value={`${contrat.clientId.indicatif} ${contrat.clientId.telephone}`} />
                  {contrat.clientId.adresse && <InfoRow label="Adresse" value={contrat.clientId.adresse} />}
                </SectionCard>

                {/* Financier */}
                <SectionCard icon={<BarChart3 className="h-4 w-4" />} title="Informations financières" delay={0.3}>
                  <InfoRow label="Montant total" value={fmtMoney(contrat.montantTotal)} highlight />
                  <InfoRow label="Acompte versé" value={fmtMoney(contrat.acompte)} />
                  <InfoRow label="Solde restant" value={fmtMoney(solde)} />
                </SectionCard>

                {/* Travaux */}
                <SectionCard icon={<Hammer className="h-4 w-4" />} title="Travaux & Planning" delay={0.35}>
                  <InfoRow label="Début des travaux" value={fmt(contrat.dateDebutTravaux)} />
                  <InfoRow label="Durée estimée" value={`${contrat.dureeTravaux} mois`} />
                  <InfoRow label="Fin estimée" value={fmt(dateFin)} />
                  <InfoRow label="Architecte / Maître d'œuvre" value={contrat.architecte} />
                </SectionCard>

                {/* Description */}
                {contrat.description && (
                  <SectionCard icon={<Icons.fileText className="h-4 w-4" />} title="Description / Notes" delay={0.4} colSpan={2}>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {contrat.description}
                    </p>
                  </SectionCard>
                )}
              </div>
            </TabsContent>

            {/* ── TAB: DOCUMENTS ───────────────────────────────────────────── */}
            <TabsContent value="documents">
              <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Documents générés automatiquement pour le contrat <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{contrat.code}</span>.
                  Les fichiers sont générés à la demande et ne sont pas stockés sur le serveur.
                </p>

                <div className="space-y-3 mt-4">
                  <DocumentCard
                    icon={<FileText className="h-5 w-5" />}
                    title="Contrat de Construction"
                    description="Document officiel du contrat incluant les clauses, les parties et les conditions."
                    filename={`Contrat_Construction_${contrat.code}.pdf`}
                    type="contrat"
                    contratId={contrat.code}
                    token={token}
                  />
                  <DocumentCard
                    icon={<BarChart3 className="h-5 w-5" />}
                    title="Plan d'échelonnement de paiement"
                    description="Tableau détaillé des versements mensuels sur la durée des travaux."
                    filename={`Plan_Echelonnement_${contrat.code}.pdf`}
                    type="plan"
                    contratId={contrat.code}
                    token={token}
                  />
                </div>

                <div className="mt-6 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50">
                  <div className="flex items-start gap-3">
                    <Icons.hardHat className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Note</p>
                      <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                        Ces documents sont envoyés automatiquement au client par email lors de la création du contrat (si la notification est activée).
                        Vous pouvez les re-télécharger à tout moment depuis cette page.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}
