"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NewFactureDialog } from "./new-facture-dialog"
import { Icons } from "@/components/icons"
import axios from "axios"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "react-hot-toast"
import {
  parse,
  format,
  differenceInHours,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
} from "date-fns"
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { fr } from 'date-fns/locale'
import { Checkbox } from "@/components/ui/checkbox"


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  MoreHorizontal, 
  Download, 
  X, 
  Send, 
  Search, 
  Filter, 
  Calendar,
  User,
  TrendingUp,
  FileText,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Facture {
  _id: string
  code: string
  clientId: {
    nom: string
    prenom: string
  }
  contratId: {
    code: string
  }
  somme: number
  devise: string
  methode: string
  addBy: { email: string } | null | undefined
  date: string
  status: string
}

interface User {
  _id: string
  email: string
  nom: string
  prenom: string
}

type DatePeriodPreset = "all" | "today" | "week" | "month" | "year" | "last30" | "custom"

function formatYmd(d: Date) {
  return format(d, "yyyy-MM-dd")
}

function getPresetDateRange(preset: Exclude<DatePeriodPreset, "all" | "custom">): {
  from: string
  to: string
} {
  const now = new Date()
  switch (preset) {
    case "today":
      return { from: formatYmd(now), to: formatYmd(now) }
    case "week": {
      const start = startOfWeek(now, { weekStartsOn: 1 })
      const end = endOfWeek(now, { weekStartsOn: 1 })
      return { from: formatYmd(start), to: formatYmd(end) }
    }
    case "month":
      return { from: formatYmd(startOfMonth(now)), to: formatYmd(endOfMonth(now)) }
    case "year":
      return { from: formatYmd(startOfYear(now)), to: formatYmd(endOfYear(now)) }
    case "last30":
      return { from: formatYmd(subDays(now, 29)), to: formatYmd(now) }
    default:
      return { from: "", to: "" }
  }
}

export function FacturePageClient() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [datePeriodPreset, setDatePeriodPreset] = useState<DatePeriodPreset>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [authorFilter, setAuthorFilter] = useState("all")
  const [factures, setFactures] = useState<Facture[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedFacture, setSelectedFacture] = useState<{code: string, notifyClient: boolean}>({code: '', notifyClient: false})
  const [resendDialogOpen, setResendDialogOpen] = useState(false)
  const [factureToResend, setFactureToResend] = useState<string>("")
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [factureToConfirm, setFactureToConfirm] = useState<string>("")
  const [isConfirming, setIsConfirming] = useState(false)
  
  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  const fetchFactures = async (reset = false) => {
    if (reset) {
      setIsLoading(true)
      setCurrentPage(1)
      setFactures([])
      setHasMore(true)
    }
    
    try {
      const token = localStorage.getItem("authToken")
      
      // Build query parameters
      const params = new URLSearchParams({
        page: reset ? '1' : currentPage.toString(),
        limit: '20'
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (statusFilter && statusFilter !== "all" && statusFilter !== "tout") {
        params.append('status', statusFilter)
      }
      if (dateFrom.trim()) {
        params.append("dateFrom", dateFrom.trim())
      }
      if (dateTo.trim()) {
        params.append("dateTo", dateTo.trim())
      }
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/factures?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      const { factures: facturesData, pagination } = response.data
      
      if (reset) {
        setFactures(facturesData || [])
        setCurrentPage(1)
      } else {
        setFactures((prev) => [...prev, ...facturesData])
      }
      
      setHasMore(pagination.hasMore)
      setUsers(response.data.users || [])
    } catch (error) {
      console.error("Error fetching factures:", error)
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error("Vous n'avez pas la permission. Veuillez contacter votre administrateur.")
      } else {
        toast.error("Échec du chargement des factures. Veuillez réessayer.")
      }
      if (reset) {
        setFactures([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreFactures = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const token = localStorage.getItem("authToken")
      const nextPage = currentPage + 1
      
      // Build query parameters
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: '20'
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (statusFilter && statusFilter !== "all" && statusFilter !== "tout") {
        params.append('status', statusFilter)
      }
      if (dateFrom.trim()) {
        params.append("dateFrom", dateFrom.trim())
      }
      if (dateTo.trim()) {
        params.append("dateTo", dateTo.trim())
      }
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/factures?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const { factures: facturesData, pagination } = response.data
      
      setFactures((prev) => [...prev, ...facturesData])
      setHasMore(pagination.hasMore)
      setCurrentPage(nextPage)
    } catch (error) {
      console.error("Error loading more factures:", error)
      toast.error("Erreur lors du chargement des factures supplémentaires")
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentPage, hasMore, isLoadingMore, searchQuery, statusFilter, dateFrom, dateTo])

  const handleExportToExcel = async () => {
    const toastId = toast.loading("Exportation des factures...");
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/factures/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'arraybuffer'
      })

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `factures-${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Exportation réussie", { id: toastId });
    } catch (error) {
      console.error("Error exporting factures:", error)
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error("Vous n'avez pas la permission. Veuillez contacter votre administrateur.", { id: toastId });
      } else {
        toast.error("Échec de l'exportation. Veuillez réessayer.", { id: toastId });
      }
    }
  }

  const handleDownloadFacture = async (code: string) => {
    const toastId = toast.loading("Téléchargement en cours...")
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/factures/download/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })
      const blob = new Blob([response.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `Quittance_${code}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Téléchargement réussi", { id: toastId })
    } catch (error) {
      console.error("Error downloading facture:", error)
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error("Vous n'avez pas la permission. Veuillez contacter votre administrateur.", { id: toastId })
      } else {
        toast.error("Échec du téléchargement. Veuillez réessayer.", { id: toastId })
      }
    }
  }

  const handleRegenerateFacture = async (facture: Facture) => {
    const toastId = toast.loading("Régénération en cours...")
    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        toast.error("Vous n'êtes pas authentifié.", { id: toastId })
        return
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/factures/regenerate-download/${facture._id}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!res.ok) throw new Error("Erreur régénération")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Paiement-${facture.code}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Facture régénérée et téléchargée", { id: toastId })
    } catch (error) {
      console.error("Error regenerating facture:", error)
      toast.error("Échec de la régénération de la facture. Veuillez réessayer.", { id: toastId })
    }
  }

  const handleCancelFacture = async (code: string, notifyClient: boolean) => {
    const toastId = toast.loading("Annulation en cours...");
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/factures/cancel/${code}`, {
        notifyClient
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 200) {
        toast.success("Facture annulée avec succès", { id: toastId });
        fetchFactures(true);
      }
    } catch (error) {
      console.error("Error cancelling facture:", error)
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error("Vous n'avez pas la permission. Veuillez contacter votre administrateur.", { id: toastId });
      } else {
        toast.error("Échec de l'annulation. Veuillez réessayer.", { id: toastId });
      }
    } finally {
      setCancelDialogOpen(false)
    }
  }

  const handleResendFacture = async (id: string) => {
    const toastId = toast.loading("Renvoi en cours...");
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/factures/resend/${id}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      // console.log(response)
      if (response.status === 200) {
        toast.success("Facture renvoyée avec succès", { id: toastId });
        toast.custom((t) => (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 px-4 py-3 rounded-lg shadow-lg">
            {response.data.log.messageLog.split("|").map((item: string, index: number) => (
              <p key={index} className="text-sm">{item}</p>
            ))}
          </div>
        ), {
          duration: 5000,
        })
      }
    } catch (error) {
      console.error("Error resending facture:", error)
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error("Vous n'avez pas la permission. Veuillez contacter votre administrateur.", { id: toastId });
      } else {
        toast.error("Échec du renvoi. Veuillez réessayer.", { id: toastId });
      }
    } finally {
      setResendDialogOpen(false)
      setFactureToResend("")
    }
  }

  const handleConfirmPayment = async (id: string) => {
    const toastId = toast.loading("Confirmation du paiement en cours...");
    setIsConfirming(true);
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/factures/confirm/${id}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.status === 200) {
        toast.success("Paiement confirmé avec succès", { id: toastId });
        if (response.data.log) {
          toast.custom((t) => (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 px-4 py-3 rounded-lg shadow-lg">
              {response.data.log.split("|").filter((item: string) => item.trim()).map((item: string, index: number) => (
                <p key={index} className="text-sm">{item}</p>
              ))}
            </div>
          ), {
            duration: 5000,
          })
        }
        // Refresh the factures list
        fetchFactures(true);
      }
    } catch (error) {
      console.error("Error confirming payment:", error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          toast.error("Vous n'avez pas la permission. Veuillez contacter votre administrateur.", { id: toastId });
        } else if (error.response?.status === 400) {
          toast.error(error.response.data?.message || "Impossible de confirmer ce paiement", { id: toastId });
        } else {
          toast.error("Échec de la confirmation. Veuillez réessayer.", { id: toastId });
        }
      } else {
        toast.error("Échec de la confirmation. Veuillez réessayer.", { id: toastId });
      }
    } finally {
      setIsConfirming(false);
      setConfirmDialogOpen(false);
      setFactureToConfirm("");
    }
  }

  useEffect(() => {
    fetchFactures(true)
  }, [])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMoreFactures()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoadingMore, isLoading, loadMoreFactures])

  // Debounce search term and filters to avoid too many API calls
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      fetchFactures(true)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter, dateFrom, dateTo])

  const handleFactureAdded = () => {
    fetchFactures(true)
  }

  const sortedFactures = useMemo(() => {
    let sortableFactures = [...factures]
    if (sortConfig !== null) {
      sortableFactures.sort((a, b) => {
        let aValue: any
        let bValue: any
        
        // Handle nested properties like 'addBy.email' or 'clientId.nom'
        if (sortConfig.key.includes('.')) {
          const keys = sortConfig.key.split('.')
          aValue = keys.reduce((obj: any, key) => obj?.[key], a)
          bValue = keys.reduce((obj: any, key) => obj?.[key], b)
        } else {
          aValue = a[sortConfig.key as keyof Facture]
          bValue = b[sortConfig.key as keyof Facture]
        }
        
        // Handle null/undefined values - put them at the end
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return 1
        if (bValue == null) return -1
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    return sortableFactures
  }, [factures, sortConfig])

  // Note: Search and filters are now handled server-side
  const filteredFactures = sortedFactures

  const totalSomme = useMemo(() => {
    return filteredFactures.reduce((sum, facture) => sum + facture.somme, 0);
  }, [filteredFactures]);

  const pendingCount = useMemo(() => {
    return factures.filter((facture) => facture.status === "pending").length;
  }, [factures]);


  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: "Payé", variant: "default", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
      pending: { label: "En attente", variant: "secondary", className: "bg-amber-100 text-amber-800 border-amber-200" },
      canceled: { label: "Annulé", variant: "destructive", className: "bg-red-100 text-red-800 border-red-200" },
      révoqué: { label: "Révoqué", variant: "outline", className: "bg-gray-100 text-gray-800 border-gray-200" }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <Badge className={`${config.className} font-medium`}>
        {config.label}
      </Badge>
    )
  }

  const clearFilters = () => {
    setSearchQuery("")
    setDatePeriodPreset("all")
    setDateFrom("")
    setDateTo("")
    setStatusFilter("all")
    setAuthorFilter("all")
  }

  const hasActiveFilters =
    searchQuery ||
    dateFrom ||
    dateTo ||
    statusFilter !== "all" ||
    authorFilter !== "all"

  const handlePeriodPresetChange = (value: string) => {
    const preset = value as DatePeriodPreset
    setDatePeriodPreset(preset)
    if (preset === "all") {
      setDateFrom("")
      setDateTo("")
      return
    }
    if (preset === "custom") {
      return
    }
    const { from, to } = getPresetDateRange(preset)
    setDateFrom(from)
    setDateTo(to)
  }

  const handleDateFromChange = (v: string) => {
    setDateFrom(v)
    setDatePeriodPreset("custom")
  }

  const handleDateToChange = (v: string) => {
    setDateTo(v)
    setDatePeriodPreset("custom")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
              Gestion des Paiements
            </h1>
            <p className="text-slate-600 dark:text-gray-400 text-lg">
              Gérez et suivez tous vos paiements en temps réel
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleExportToExcel} 
              variant="outline" 
              className="border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter Excel
            </Button>
            <Button 
              onClick={() => setIsDialogOpen(true)} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Paiement
            </Button>
          </div>
        </div>

        {/* Warning Alert for Pending Payments */}
        {pendingCount > 0 && (
          <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-amber-900 dark:text-amber-400 font-semibold">Paiements en attente</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-500">
              Il y a {pendingCount} paiement{pendingCount > 1 ? "s" : ""} en attente, veuillez vérifier et confirmer.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 dark:border-gray-700 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-700 dark:text-gray-300 text-sm font-medium">Total des Paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-gray-100">
                  {filteredFactures.length}
                </div>
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 dark:border-gray-700 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-700 dark:text-gray-300 text-sm font-medium">Montant Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-gray-100">
                  {totalSomme.toLocaleString()} USD
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 dark:border-gray-700 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-700 dark:text-gray-300 text-sm font-medium">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => fetchFactures(true)} 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
                {hasActiveFilters && (
                  <Button 
                    onClick={clearFilters} 
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    Effacer les filtres
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <Card className="border-0 dark:border-gray-700 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-gray-200 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres et Recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="space-y-2 md:col-span-2 xl:col-span-2">
                <Label htmlFor="search" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  Recherche
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500" />
                  <Input
                    id="search"
                    placeholder="Client, code, auteur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-slate-200 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 dark:placeholder:text-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period-preset" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  Période
                </Label>
                <Select value={datePeriodPreset} onValueChange={handlePeriodPresetChange}>
                  <SelectTrigger
                    id="period-preset"
                    className="border-slate-200 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <SelectValue placeholder="Toutes les dates" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="all" className="dark:text-gray-100 dark:hover:bg-gray-700">
                      Toutes les dates
                    </SelectItem>
                    <SelectItem value="today" className="dark:text-gray-100 dark:hover:bg-gray-700">
                      Aujourd&apos;hui
                    </SelectItem>
                    <SelectItem value="week" className="dark:text-gray-100 dark:hover:bg-gray-700">
                      Cette semaine
                    </SelectItem>
                    <SelectItem value="month" className="dark:text-gray-100 dark:hover:bg-gray-700">
                      Ce mois
                    </SelectItem>
                    <SelectItem value="year" className="dark:text-gray-100 dark:hover:bg-gray-700">
                      Cette année
                    </SelectItem>
                    <SelectItem value="last30" className="dark:text-gray-100 dark:hover:bg-gray-700">
                      30 derniers jours
                    </SelectItem>
                    <SelectItem value="custom" className="dark:text-gray-100 dark:hover:bg-gray-700">
                      Personnalisé
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-from" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  Du
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                    className="pl-10 border-slate-200 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-to" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  Au
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => handleDateToChange(e.target.value)}
                    className="pl-10 border-slate-200 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  Statut
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-slate-200 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="all" className="dark:text-gray-100 dark:hover:bg-gray-700">Tous les statuts</SelectItem>
                    <SelectItem value="paid" className="dark:text-gray-100 dark:hover:bg-gray-700">Payé</SelectItem>
                    <SelectItem value="pending" className="dark:text-gray-100 dark:hover:bg-gray-700">En attente</SelectItem>
                    <SelectItem value="canceled" className="dark:text-gray-100 dark:hover:bg-gray-700">Annulé</SelectItem>
                    <SelectItem value="révoqué" className="dark:text-gray-100 dark:hover:bg-gray-700">Révoqué</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="author-filter" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  Auteur
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500" />
                  <Select value={authorFilter} onValueChange={setAuthorFilter}>
                    <SelectTrigger className="pl-10 border-slate-200 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400">
                      <SelectValue placeholder="Tous les auteurs" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem value="all" className="dark:text-gray-100 dark:hover:bg-gray-700">Tous les auteurs</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user._id} value={user.email} className="dark:text-gray-100 dark:hover:bg-gray-700">
                          {user.nom} {user.prenom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Section */}
        <Card className="border-0 dark:border-gray-700 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-gray-700">
            <CardTitle className="text-slate-800 dark:text-gray-200">Liste des Paiements</CardTitle>
            <CardDescription className="dark:text-gray-400">
              {filteredFactures.length} paiement(s) trouvé(s) • Total: {totalSomme.toLocaleString()} USD
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  <p className="text-slate-600 dark:text-gray-400">Chargement des paiements...</p>
                </div>
              </div>
            ) : filteredFactures.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="h-16 w-16 text-slate-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-gray-100 mb-2">Aucun paiement trouvé</h3>
                <p className="text-slate-600 dark:text-gray-400 mb-4">
                  {hasActiveFilters 
                    ? "Aucun paiement ne correspond à vos critères de recherche." 
                    : "Commencez par créer votre premier paiement."
                  }
                </p>
                {!hasActiveFilters && (
                  <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un paiement
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 dark:bg-gray-700/50 hover:bg-slate-50/50 dark:hover:bg-gray-700/50">
                        <TableHead 
                          onClick={() => requestSort('code')} 
                          className="cursor-pointer text-slate-700 dark:text-gray-300 font-semibold hover:text-slate-900 dark:hover:text-gray-100 transition-colors"
                        >
                          Code
                        </TableHead>
                        <TableHead 
                          onClick={() => requestSort('contratId.code')} 
                          className="cursor-pointer text-slate-700 dark:text-gray-300 font-semibold hover:text-slate-900 dark:hover:text-gray-100 transition-colors"
                        >
                          Contrat
                        </TableHead>
                        <TableHead 
                          onClick={() => requestSort('clientId.nom')} 
                          className="cursor-pointer text-slate-700 dark:text-gray-300 font-semibold hover:text-slate-900 dark:hover:text-gray-100 transition-colors"
                        >
                          Client
                        </TableHead>
                        <TableHead 
                          onClick={() => requestSort('somme')} 
                          className="cursor-pointer text-slate-700 dark:text-gray-300 font-semibold hover:text-slate-900 dark:hover:text-gray-100 transition-colors"
                        >
                          Montant
                        </TableHead>
                        <TableHead 
                          onClick={() => requestSort('methode')} 
                          className="cursor-pointer text-slate-700 dark:text-gray-300 font-semibold hover:text-slate-900 dark:hover:text-gray-100 transition-colors"
                        >
                          Méthode
                        </TableHead>
                        <TableHead 
                          onClick={() => requestSort('addBy.email')} 
                          className="cursor-pointer text-slate-700 dark:text-gray-300 font-semibold hover:text-slate-900 dark:hover:text-gray-100 transition-colors"
                        >
                          Auteur
                        </TableHead>
                        <TableHead 
                          onClick={() => requestSort('date')} 
                          className="cursor-pointer text-slate-700 dark:text-gray-300 font-semibold hover:text-slate-900 dark:hover:text-gray-100 transition-colors"
                        >
                          Date
                        </TableHead>
                        <TableHead className="text-slate-700 dark:text-gray-300 font-semibold">Statut</TableHead>
                        <TableHead className="text-slate-700 dark:text-gray-300 font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFactures.map((facture) => {
                        // Convert local date to Africa/Kinshasa timezone
                        const timeZone = 'Africa/Kinshasa';
                        const factureDateLocal = parse(facture.date, 'dd/MM/yyyy HH:mm:ss', new Date());
                        const factureDate = toZonedTime(fromZonedTime(factureDateLocal, timeZone), timeZone);
                        const nowInKinshasa = toZonedTime(new Date(), timeZone);
                        const isCancelable = differenceInHours(nowInKinshasa, factureDate) <= 72;
                        // console.log("Today date (Kinshasa): ", nowInKinshasa);
                        // console.log("Facture date (Kinshasa): ", factureDate);
                        // console.log("Difference in hours: ", differenceInHours(nowInKinshasa, factureDate));

                        return (
                          <TableRow key={facture._id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors border-b border-slate-100 dark:border-gray-700">
                            <TableCell className="font-mono text-sm text-slate-900 dark:text-gray-100">
                              {facture.code}
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-gray-300">
                              {facture.contratId?.code || "—"}
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-gray-300">
                              <div className="font-medium">
                                {facture.clientId.prenom} {facture.clientId.nom}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-900 dark:text-gray-100 font-semibold">
                              {facture.somme.toLocaleString()} {facture.devise}
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-gray-300">
                              <Badge variant="outline" className="bg-slate-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                                {facture.methode}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-gray-300">
                              <div className="text-sm">{facture.addBy ? facture.addBy.email : "Client (paiement direct)"}</div>
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-gray-300">
                              {facture.date ? 
                                format(factureDate, 'dd/MM/yyyy', { locale: fr })
                                : "—"
                              }
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(facture.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-gray-700"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Ouvrir le menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 shadow-lg border-slate-200 dark:border-gray-700 dark:bg-gray-800">
                                  <DropdownMenuItem 
                                    onClick={() => handleDownloadFacture(facture.code)}
                                    className="cursor-pointer"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Télécharger la quittance
                                  </DropdownMenuItem>
                                  {facture.status === "pending" && (
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setFactureToConfirm(facture._id)
                                        setConfirmDialogOpen(true)
                                      }}
                                      className="text-emerald-600 focus:text-emerald-600 cursor-pointer"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Confirmer le paiement
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setFactureToResend(facture._id)
                                      setResendDialogOpen(true)
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    Renvoyer la facture
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleRegenerateFacture(facture)}
                                    className="cursor-pointer"
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Regénérer la facture
                                  </DropdownMenuItem>
                                  {(
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedFacture({code: facture._id, notifyClient: false})
                                        setCancelDialogOpen(true)
                                      }} 
                                      className="text-red-600 focus:text-red-600 cursor-pointer"
                                    >
                                      <X className="mr-2 h-4 w-4" />
                                      Annuler le paiement
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Infinite scroll observer target and loading indicator */}
                <div ref={observerTarget} className="h-10 flex items-center justify-center">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Icons.spinner className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <NewFactureDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onFactureAdded={handleFactureAdded} />
      
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-gray-100">Confirmer l'annulation</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-gray-400">
              Êtes-vous sûr de vouloir annuler cette facture ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="notify-client"
              checked={selectedFacture.notifyClient}
              onCheckedChange={(checked) =>
                setSelectedFacture(prev => ({...prev, notifyClient: checked as boolean}))
              }
            />
            <Label htmlFor="notify-client" className="text-slate-700 dark:text-gray-300">
              Notifier le client de l'annulation
            </Label>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-800 dark:text-gray-200"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleCancelFacture(selectedFacture.code, selectedFacture.notifyClient)}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <AlertDialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-gray-100">Confirmer le renvoi</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-400">
              Êtes-vous sûr de vouloir renvoyer cette facture au client ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-800 dark:text-gray-200">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleResendFacture(factureToResend)}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Confirmer le renvoi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Confirmer le paiement</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Êtes-vous sûr de vouloir confirmer ce paiement ? Cette action va :
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Changer le statut du paiement à "Payé"</li>
                <li>Générer la facture en PDF</li>
                <li>Envoyer un email de confirmation au client</li>
                <li>Envoyer un SMS de confirmation au client</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              className="border-slate-200 hover:bg-slate-50"
              disabled={isConfirming}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleConfirmPayment(factureToConfirm)}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isConfirming}
            >
              {isConfirming ? "Confirmation en cours..." : "Confirmer le paiement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
