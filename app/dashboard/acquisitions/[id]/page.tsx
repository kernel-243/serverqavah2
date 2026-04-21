"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  ArrowLeft,
  Loader2,
  ShoppingCart,
  User,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  AlertCircle,
} from "lucide-react"

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
    email?: string
  }
  createdAt: string
  updatedAt: string
}

function formatNumber(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
}

function InfoRow({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[180px]">{label}</span>
      <span className={`text-sm font-semibold text-right ${valueClass || "text-gray-900 dark:text-white"}`}>{value}</span>
    </div>
  )
}

export default function AcquisitionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [acquisition, setAcquisition] = useState<Acquisition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchAcquisition = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/acquisitions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = response.data?.data || response.data
      setAcquisition(data)
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || "Impossible de charger l'acquisition"
        : "Impossible de charger l'acquisition"
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchAcquisition()
  }, [id, fetchAcquisition])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !acquisition) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-gray-400">
        <AlertCircle className="h-16 w-16 text-red-400" />
        <p className="text-lg font-medium text-gray-600 dark:text-gray-300">{error || "Acquisition introuvable"}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/acquisitions")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Retour aux acquisitions
        </Button>
      </div>
    )
  }

  const autreFrais = acquisition.autreFrais || {}
  const totalAutreFrais =
    (autreFrais.avisUrbanistique || 0) +
    (autreFrais.bornageCite || 0) +
    (autreFrais.bornageParcelle || 0) +
    (autreFrais.paiementDessinateur || 0) +
    (autreFrais.fraisDocumentCadastraux || 0) +
    (autreFrais.commission || 0) +
    (autreFrais.autresPersonnalises || []).reduce((s: number, f: AutreFraisCustom) => s + (f.valeur || 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard/acquisitions")}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{acquisition.nomCite}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Détail de l&apos;acquisition</p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Total</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatNumber(acquisition.total)} $</p>
          </CardContent>
        </Card>
        <Card className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">Payé</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">{formatNumber(acquisition.montantPayer)} $</p>
          </CardContent>
        </Card>
        <Card className={`border ${acquisition.resteAPayer > 0 ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20" : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"}`}>
          <CardContent className="pt-4 pb-4">
            <p className={`text-xs font-medium uppercase tracking-wide ${acquisition.resteAPayer > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>Reste à payer</p>
            <p className={`text-xl font-bold mt-1 ${acquisition.resteAPayer > 0 ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>
              {formatNumber(acquisition.resteAPayer)} $
            </p>
          </CardContent>
        </Card>
        <Card className="border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wide">Hectares</p>
            <p className="text-xl font-bold text-orange-700 dark:text-orange-300 mt-1">{acquisition.nbHectaresAchetes} ha</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations générales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Nom de la cité" value={acquisition.nomCite} />
            <InfoRow label="Nb hectares achetés" value={`${acquisition.nbHectaresAchetes} ha`} />
            <InfoRow label="Prix unitaire" value={`${formatNumber(acquisition.prixUnitaire)} $`} />
            <InfoRow label="Total" value={`${formatNumber(acquisition.total)} $`} valueClass="text-blue-600 dark:text-blue-400" />
            <InfoRow
              label="Statut paiement"
              value={
                <Badge className={acquisition.resteAPayer <= 0
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }>
                  {acquisition.resteAPayer <= 0 ? "Soldé" : "En cours"}
                </Badge>
              }
            />
          </CardContent>
        </Card>

        {/* Paiements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Paiements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Total" value={`${formatNumber(acquisition.total)} $`} valueClass="text-blue-600 dark:text-blue-400" />
            <InfoRow label="Montant payé" value={`${formatNumber(acquisition.montantPayer)} $`} valueClass="text-green-600 dark:text-green-400" />
            <InfoRow
              label="Reste à payer"
              value={`${formatNumber(acquisition.resteAPayer)} $`}
              valueClass={acquisition.resteAPayer > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}
            />
            {totalAutreFrais > 0 && (
              <InfoRow label="Total autres frais" value={`${formatNumber(totalAutreFrais)} $`} valueClass="text-orange-600 dark:text-orange-400" />
            )}
          </CardContent>
        </Card>

        {/* Autres frais */}
        {totalAutreFrais > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-500" />
                Autres frais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {autreFrais.avisUrbanistique > 0 && <InfoRow label="Avis urbanistique" value={`${formatNumber(autreFrais.avisUrbanistique)} $`} />}
              {autreFrais.bornageCite > 0 && <InfoRow label="Bornage cité" value={`${formatNumber(autreFrais.bornageCite)} $`} />}
              {autreFrais.bornageParcelle > 0 && <InfoRow label="Bornage parcelle" value={`${formatNumber(autreFrais.bornageParcelle)} $`} />}
              {autreFrais.paiementDessinateur > 0 && <InfoRow label="Paiement dessinateur" value={`${formatNumber(autreFrais.paiementDessinateur)} $`} />}
              {autreFrais.fraisDocumentCadastraux > 0 && <InfoRow label="Frais document cadastraux" value={`${formatNumber(autreFrais.fraisDocumentCadastraux)} $`} />}
              {autreFrais.commission > 0 && <InfoRow label="Commission" value={`${formatNumber(autreFrais.commission)} $`} />}
              {(autreFrais.autresPersonnalises || []).map((f: AutreFraisCustom, i: number) => (
                <InfoRow key={i} label={f.label || `Frais ${i + 1}`} value={`${formatNumber(f.valeur)} $`} />
              ))}
              <Separator className="my-2" />
              <InfoRow label="Total" value={`${formatNumber(totalAutreFrais)} $`} valueClass="text-orange-600 dark:text-orange-400" />
            </CardContent>
          </Card>
        )}

        {/* Agent & Dates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" />
              Informations supplémentaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Agent attribué"
              value={acquisition.agentAttribue
                ? `${acquisition.agentAttribue.nom} ${acquisition.agentAttribue.prenom || ""}`
                : "Non attribué"
              }
              valueClass={acquisition.agentAttribue ? undefined : "text-gray-400 dark:text-gray-500"}
            />
            <InfoRow
              label="Créé le"
              value={<span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(acquisition.createdAt)}</span>}
            />
            <InfoRow
              label="Dernière modification"
              value={<span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(acquisition.updatedAt)}</span>}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
