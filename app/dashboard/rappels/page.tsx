"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Loader2, Download, FlaskConical, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react"
import axios from "axios"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { matchesSearch } from "@/lib/normalizeForSearch"

interface Contract {
  _id: string
  clientId: {
    nom: string
    postnom: string
    prenom: string
  }
  code: string
  terrainId: {
    code: string
    cite: {
      nom: string
    }
  }
  echelons: number
  total: number
  dateDebut: string
  statut: "en_cours" | "termine" | "en_retard"
  rappels: boolean
  totalPaid: number
}

export default function RappelsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [rappelFilter, setRappelFilter] = useState<"all" | "active" | "inactive">("all")
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "3days" | "7days" | "30days" | "far">("all")
  const [simulating, setSimulating] = useState(false)
  const [simDialog, setSimDialog] = useState(false)
  const [simResult, setSimResult] = useState<{ success: boolean; duration?: number; logs?: { level: string; msg: string }[]; message?: string } | null>(null)
  const [logsExpanded, setLogsExpanded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("authToken")
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        // Filter only active contracts; default rappels to true if undefined/null
        const activeContracts = response.data
          .filter((contract: Contract) => contract.statut === "en_cours")
          .map((contract: Contract) => ({
            ...contract,
            rappels: contract.rappels !== false, // default true
          }))
        setContracts(activeContracts)
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            router.push("/auth/login")
          } else {
            setError(error.response?.data?.message || "Une erreur s'est produite")
          }
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleExport = async () => {
    try {
      setExporting(true)
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/mensualite`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'arraybuffer'
      })

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `mensualite-${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      setError("Erreur lors de l'exportation")
    } finally {
      setExporting(false)
    }
  }

  const handleAutoRappelToggle = async (contractId: string) => {
    try {
      const token = localStorage.getItem("authToken")
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/contrats/autorappel/${contractId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setContracts(contracts.map(contract => {
        if (contract._id === contractId) {
          return {
            ...contract,
            rappels: !contract.rappels
          }
        }
        return contract
      }))
    } catch (error) {
      setError("Erreur lors de la modification du rappel automatique")
    }
  }

  const handleToggleAllRappels = async (activate: boolean) => {
    try {
      const token = localStorage.getItem("authToken")
      await Promise.all(contracts.map(contract =>
        axios.post(`${process.env.NEXT_PUBLIC_API_URL}/contrats/autorappel/${activate? "activate" : "desactivate"}`,
          { rappels: activate },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
      ))

      setContracts(contracts.map(contract => ({
        ...contract,
        rappels: activate
      })))
    } catch (error) {
      setError("Erreur lors de la modification des rappels automatiques")
    }
  }

  const getDaysLeft = (dateDebut: string) => {
    const paymentDay = new Date(new Date(dateDebut).toLocaleString('en-US', { timeZone: 'Africa/Kinshasa' })).getDate()
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Kinshasa' }))
    const nextPayment = new Date(today.getFullYear(), today.getMonth(), paymentDay)
    if (nextPayment < today) {
      nextPayment.setMonth(nextPayment.getMonth() + 1)
    }
    return Math.ceil((nextPayment.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const filteredContracts = contracts.filter((contract) => {
    const matchSearch = !searchQuery || Object.values({
      nom: contract.clientId.nom,
      postnom: contract.clientId.postnom,
      prenom: contract.clientId.prenom,
      code: contract.code,
      terrain: contract.terrainId.code,
      cite: contract.terrainId.cite,
    }).some((value) => matchesSearch(value.toString(), searchQuery))

    const matchRappel =
      rappelFilter === "all" ||
      (rappelFilter === "active" && contract.rappels) ||
      (rappelFilter === "inactive" && !contract.rappels)

    let matchUrgency = true
    if (urgencyFilter !== "all") {
      const daysLeft = getDaysLeft(contract.dateDebut)
      if (urgencyFilter === "3days") matchUrgency = daysLeft <= 3
      else if (urgencyFilter === "7days") matchUrgency = daysLeft <= 7
      else if (urgencyFilter === "30days") matchUrgency = daysLeft <= 30
      else if (urgencyFilter === "far") matchUrgency = daysLeft > 30
    }

    return matchSearch && matchRappel && matchUrgency
  })

  const handleSimulateRappel = async () => {
    setSimulating(true)
    setSimResult(null)
    setLogsExpanded(false)
    try {
      const token = localStorage.getItem("authToken")
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/contrats/simulate-rappel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSimResult(res.data)
    } catch (err: any) {
      setSimResult({ success: false, message: err.response?.data?.message || err.message })
    } finally {
      setSimulating(false)
      setSimDialog(true)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Rappels</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleToggleAllRappels(true)}
              variant="outline"
              size="icon"
              title="Activer tous les rappels"
            >
              <Bell className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              onClick={() => handleToggleAllRappels(false)}
              variant="outline"
              size="icon"
              title="Désactiver tous les rappels"
            >
              <Bell className="h-4 w-4 text-red-500" />
            </Button>
            {/* Simulate button — dev mode */}
            <Button
              onClick={handleSimulateRappel}
              disabled={simulating}
              variant="outline"
              size="icon"
              title="Simuler l'envoi des rappels (dev)"
              className="border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              {simulating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exporter Excel
          </Button>
        </div>
      </div>

      {/* Dialog résultat simulation */}
      <Dialog open={simDialog} onOpenChange={setSimDialog}>
        <DialogContent className="sm:max-w-2xl dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-gray-100">
              <FlaskConical className="h-5 w-5 text-amber-500" />
              Simulation — autoRappel
            </DialogTitle>
          </DialogHeader>

          {simResult && (
            <div className="space-y-4">
              {/* Statut global */}
              <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${simResult.success ? 'bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800'}`}>
                {simResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                )}
                <div>
                  <p className={`font-semibold text-sm ${simResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                    {simResult.success ? 'Traitement terminé avec succès' : 'Erreur lors du traitement'}
                  </p>
                  {simResult.duration != null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Durée : {(simResult.duration / 1000).toFixed(2)}s
                    </p>
                  )}
                  {simResult.message && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{simResult.message}</p>
                  )}
                </div>
              </div>

              {/* Résumé rapide depuis les logs */}
              {simResult.logs && (() => {
                const sent    = simResult.logs.filter(l => l.msg.includes('📤') || l.msg.includes('Email envoyé')).length
                const upToDate = simResult.logs.filter(l => l.msg.includes('à jour')).length
                const errs    = simResult.logs.filter(l => l.level === 'error' || l.msg.includes('❌')).length
                return (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 py-3">
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{sent}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Rappels envoyés</p>
                    </div>
                    <div className="text-center rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-800 py-3">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">{upToDate}</p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">À jour</p>
                    </div>
                    <div className="text-center rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 py-3">
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">{errs}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Erreurs</p>
                    </div>
                  </div>
                )
              })()}

              {/* Logs détaillés (toggle) */}
              {simResult.logs && simResult.logs.length > 0 && (
                <div>
                  <button
                    onClick={() => setLogsExpanded(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    {logsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {logsExpanded ? 'Masquer' : 'Voir'} les logs ({simResult.logs.length} lignes)
                  </button>

                  {logsExpanded && (
                    <ScrollArea className="mt-2 h-64 rounded-md border dark:border-gray-700 bg-gray-950 p-3">
                      <div className="space-y-0.5 font-mono text-xs">
                        {simResult.logs.map((l, i) => (
                          <div
                            key={i}
                            className={
                              l.level === 'error' ? 'text-red-400' :
                              l.level === 'warn'  ? 'text-amber-400' :
                              l.msg.includes('✓') || l.msg.includes('📧') ? 'text-green-400' :
                              l.msg.includes('❌') ? 'text-red-400' :
                              l.msg.includes('═') || l.msg.includes('─') ? 'text-gray-600' :
                              'text-gray-300'
                            }
                          >
                            {l.msg}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm mb-1 block">Rechercher</Label>
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-full md:w-52">
              <Label className="text-sm mb-1 block">Rappel automatique</Label>
              <Select value={rappelFilter} onValueChange={(v) => setRappelFilter(v as typeof rappelFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Activé</SelectItem>
                  <SelectItem value="inactive">Désactivé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-56">
              <Label className="text-sm mb-1 block">Échéance</Label>
              <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v as typeof urgencyFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les échéances</SelectItem>
                  <SelectItem value="3days">Dans les 3 prochains jours</SelectItem>
                  <SelectItem value="7days">Dans les 7 prochains jours</SelectItem>
                  <SelectItem value="30days">Dans les 30 prochains jours</SelectItem>
                  <SelectItem value="far">Au-delà de 30 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredContracts.length} contrat{filteredContracts.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Contrats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du client</TableHead>
                  <TableHead>Contrat</TableHead>
                  <TableHead>Terrain</TableHead>
                  <TableHead>Cité</TableHead>
                  <TableHead>Mensualité</TableHead>
                  <TableHead>Frais de Mensualité</TableHead>
                  <TableHead>Montant Contrat</TableHead>
                  <TableHead>Montant Payé</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Rappel Auto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const paymentDay = new Date(new Date(contract.dateDebut).toLocaleString('en-US', { timeZone: 'Africa/Kinshasa' })).getDate()
                  const daysLeft = getDaysLeft(contract.dateDebut)
                  const fraisMensualite = (contract.total / contract.echelons).toFixed(2)

                  return (
                    <TableRow key={contract._id}>
                      <TableCell>{contract.clientId.nom} {contract.clientId.postnom || "-"} {contract.clientId.prenom}</TableCell>
                      <TableCell>{contract.code}</TableCell>
                      <TableCell>{contract.terrainId.code}</TableCell>
                      <TableCell>{contract.terrainId.cite.nom || "-"}</TableCell>
                      <TableCell><span className="text-sm text-gray-500">Chaque {paymentDay} du mois</span></TableCell>
                      <TableCell>{fraisMensualite} $</TableCell>
                      <TableCell>{contract.total} $</TableCell>
                      <TableCell>{contract.totalPaid} $</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            daysLeft < 5
                              ? "destructive"
                              : daysLeft < 10
                              ? "warning"
                              : "default"
                          }
                        >
                          <span className="text-xs">{daysLeft} jour{daysLeft > 1 ? 's' : ''}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleAutoRappelToggle(contract._id)}>
                          <Bell className={`h-4 w-4 ${contract.rappels ? 'text-green-500' : 'text-red-500'}`} />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredContracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Aucun contrat trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
