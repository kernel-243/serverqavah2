"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  Search,
  Loader2,
  ScrollText,
  RefreshCw,
  ChevronRight,
  User,
  MapPin,
  Calendar,
  Percent,
  FileCheck,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface TpClient {
  _id: string
  contratId: {
    _id: string
    code: string
    total: number
    statut: string
    dateDebut: string
    dateFin: string
  }
  clientId: {
    _id: string
    nom: string
    postnom?: string
    prenom?: string
    email?: string
    telephone?: string
    code?: string
  }
  terrainId: {
    _id: string
    code: string
    numero?: string
    statut?: string
    cite?: { nom?: string; ville?: string; province?: string } | null
  }
  statut: "en_attente" | "en_cours_demande" | "demande_validee" | "retire" | "reporte" | "annule"
  pourcentagePaiement: number
  dateCreation: string
  dateDelivrance?: string
  notes?: string
  createdAt: string
}

const statutColors: Record<string, string> = {
  en_attente:      "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  en_cours_demande:"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  demande_validee: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  retire:          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  reporte:         "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  annule:          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const statutLabels: Record<string, string> = {
  en_attente:      "En attente",
  en_cours_demande:"En cours de demande",
  demande_validee: "Demande validée",
  retire:          "Retiré",
  reporte:         "Reporté",
  annule:          "Annulé",
}

function clientFullName(c: TpClient["clientId"]) {
  return [c.nom, c.postnom, c.prenom].filter(Boolean).join(" ")
}

function fmtDate(d?: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function TpClientPage() {
  const router = useRouter()
  const [tpClients, setTpClients] = useState<TpClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statutFilter, setStatutFilter] = useState("all")
  const [syncing, setSyncing] = useState(false)

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
  })

  const fetchTpClients = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/tp-clients`,
        authHeaders()
      )
      setTpClients(data)
    } catch {
      toast.error("Erreur lors du chargement des titres de propriété")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTpClients()
  }, [fetchTpClients])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/tp-clients/sync`,
        {},
        authHeaders()
      )
      toast.success(`Sync terminé — ${data.created} créé(s), ${data.existing} existant(s)`)
      await fetchTpClients()
    } catch {
      toast.error("Erreur lors de la synchronisation")
    } finally {
      setSyncing(false)
    }
  }

  const filtered = tpClients.filter((tp) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      clientFullName(tp.clientId).toLowerCase().includes(q) ||
      tp.clientId.code?.toLowerCase().includes(q) ||
      tp.contratId?.code?.toLowerCase().includes(q) ||
      tp.terrainId?.code?.toLowerCase().includes(q) ||
      tp.terrainId?.cite?.nom?.toLowerCase().includes(q) ||
      tp.terrainId?.cite?.ville?.toLowerCase().includes(q)
    const matchStatut = statutFilter === "all" || tp.statut === statutFilter
    return matchSearch && matchStatut
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#896137]/10 flex items-center justify-center">
            <ScrollText className="h-5 w-5 text-[#896137]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">PT Client</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Titres de propriété clients
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
            title="Synchroniser les TPs depuis les contrats"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync TP
          </Button>
          <Button variant="outline" size="sm" onClick={fetchTpClients} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total",           value: tpClients.length, color: "text-gray-900 dark:text-gray-100" },
          { label: "En attente",      value: tpClients.filter((t) => t.statut === "en_attente").length, color: "text-gray-600" },
          { label: "En cours",        value: tpClients.filter((t) => t.statut === "en_cours_demande").length, color: "text-blue-600" },
          { label: "Retiré",          value: tpClients.filter((t) => t.statut === "retire").length, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par client, contrat, terrain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-full sm:w-44 dark:bg-gray-800 dark:border-gray-600">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="en_cours_demande">En cours de demande</SelectItem>
            <SelectItem value="demande_validee">Demande validée</SelectItem>
            <SelectItem value="retire">Retiré</SelectItem>
            <SelectItem value="reporte">Reporté</SelectItem>
            <SelectItem value="annule">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#896137]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <FileCheck className="h-12 w-12" />
          <p className="text-sm">Aucun titre de propriété trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((tp) => (
            <Card
              key={tp._id}
              onClick={() => router.push(`/dashboard/gestion-tp/tp-client/${tp._id}`)}
              className="cursor-pointer hover:shadow-md hover:border-[#896137]/30 transition-all dark:bg-gray-800 dark:border-gray-700 dark:hover:border-[#896137]/50"
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-[#896137]/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-[#896137]" />
                    </div>
                    {/* Main info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {clientFullName(tp.clientId)}
                        </p>
                        {tp.clientId.code && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            #{tp.clientId.code}
                          </span>
                        )}
                        <Badge className={`text-xs px-2 py-0 ${statutColors[tp.statut]}`}>
                          {statutLabels[tp.statut]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <MapPin className="h-3 w-3" />
                          {tp.terrainId?.code || "—"}
                          {tp.terrainId?.cite?.nom ? ` · ${tp.terrainId.cite.nom}` : ""}
                          {tp.terrainId?.cite?.ville ? `, ${tp.terrainId.cite.ville}` : ""}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <ScrollText className="h-3 w-3" />
                          {tp.contratId?.code || "—"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3 w-3" />
                          {fmtDate(tp.dateCreation)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Percent className="h-3 w-3" />
                          {tp.pourcentagePaiement}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
