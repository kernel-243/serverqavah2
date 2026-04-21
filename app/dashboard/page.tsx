"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/icons"
import axios from "axios"
import { TerrainChart } from "@/components/dashboard/terrain-chart"
import { ContratChart } from "@/components/dashboard/contrat-chart"
import { FactureChart } from "@/components/dashboard/facture-chart"
import RecentTransactions from "@/components/dashboard/recent-transactions"
import { CommercialProspectChart, StatusPieChart } from "@/components/dashboard/commercial-prospect-chart"
import { motion } from "framer-motion"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Target, Award, Zap, Activity, Trophy, DollarSign, Home, Crown, Medal, Bell, ChevronRight } from "lucide-react"
import { ErrorDialog } from "@/components/error-dialog"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { toast } from "@/components/ui/use-toast"
import { devLog } from "@/lib/devLogger"
import { ObjectifNotifications } from "@/components/dashboard/objectif-notifications"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/** Liste des villes pour le filtre terrains (alignée avec paramètres > cités). */
const VILLES_OPTIONS = ["Kinshasa", "Kolwezi", "Muanda", "Autre"]

interface Transaction {
  _id: string
  code: string
  clientId: {
    nom: string
    prenom: string
    code: string
  }
  contratId: string
  somme: number
  devise: string
  methode: string
  date: string
  status: string
}

interface DashboardData {
  counts: {
    clients: number
    contracts: number
    invoices: number
    terrains: number
    users: number
  }
  revenue: {
    total: number
    monthly: Array<{ _id: number; total: number }>
  }
  terrains: {
    available: number
    total: number
    totalTerrainPrice: number
    statusData?: {
      disponible: number
      enCours: number
      reserve: number
      vendu: number
      annule: number
      cede: number
    }
  }
  expiringContracts: number
  recentTransactions: Transaction[]
}

interface Cite {
  _id: string
  nom: string
  ville: string
  commune?: string
}

interface FilteredTerrainStats {
  total: number
  sommePrix?: number
  disponible: number
  vendu: number
  reserve: number
  enCours: number
  annule: number
  cede: number
  statusData: {
    disponible: number
    vendu: number
    reserve: number
    enCours: number
    annule: number
    cede: number
  }
}

/** Activités enregistrées aujourd'hui (réponse API /dashboard/today) */
interface TodayActivities {
  prospectsEnregistres: number
  prospectsConvertis: number
  clientsEnregistres: number
  contratsEnregistres: number
  paiementsEnregistres: number
  montantEnregistre: number
  terrainsEnregistres: number
}

const defaultTodayActivities: TodayActivities = {
  prospectsEnregistres: 0,
  prospectsConvertis: 0,
  clientsEnregistres: 0,
  contratsEnregistres: 0,
  paiementsEnregistres: 0,
  montantEnregistre: 0,
  terrainsEnregistres: 0,
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
}

// Default empty data for fallback
const emptyDashboardData: DashboardData = {
  counts: {
    clients: 0,
    contracts: 0,
    invoices: 0,
    terrains: 0,
    users: 0,
  },
  revenue: {
    total: 0,
    monthly: [],
  },
  terrains: {
    available: 0,
    total: 0,
    totalTerrainPrice: 0,
    statusData: {
      disponible: 0,
      enCours: 0,
      reserve: 0,
      vendu: 0,
      annule: 0,
      cede: 0,
    },
  },
  expiringContracts: 0,
  recentTransactions: [],
}

interface CommercialDashboardData {
  commercial: {
    id: string
    nom: string
    prenom: string
    email: string
  }
  overview: {
    totalProspects: number
    prospectsThisMonth: number
    prospectsLast30Days: number
    prospectsLast7Days: number
    convertedProspects: number
    conversionRate: number
  }
  byStatus: {
    prospect: number
    client: number
    annuler: number
  }
  performance: {
    contracts: number
    contractsTotalValue: number
    totalRevenue: number
    averageRevenuePerClient: number
  }
  trends: {
    monthly: Array<{
      month: number
      year: number
      count: number
      label: string
    }>
  }
  recentActivity: {
    prospects: Array<{
      _id: string
      nom: string
      prenom: string
      status: string
      createdAt: string
      telephone: string
      email: string
    }>
  }
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [commercialDashboardData, setCommercialDashboardData] = useState<CommercialDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSessionError, setShowSessionError] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [filteredTerrainStats, setFilteredTerrainStats] = useState<FilteredTerrainStats | null>(null)
  const [isLoadingFilteredStats, setIsLoadingFilteredStats] = useState(false)
  const [cites, setCites] = useState<Cite[]>([])
  const [selectedVille, setSelectedVille] = useState<string>("all")
  const [selectedCite, setSelectedCite] = useState<string>("all")
  const [dateDebut, setDateDebut] = useState<string>("")
  const [dateFin, setDateFin] = useState<string>("")
  const [todayActivities, setTodayActivities] = useState<TodayActivities>(defaultTodayActivities)
  const [isLoadingToday, setIsLoadingToday] = useState(false)
  const [periodDateDebut, setPeriodDateDebut] = useState<string>("")
  const [periodDateFin, setPeriodDateFin] = useState<string>("")
  const [periodDetailOpen, setPeriodDetailOpen] = useState(false)
  const [periodDetailType, setPeriodDetailType] = useState<string>("")
  const [periodDetailList, setPeriodDetailList] = useState<Record<string, unknown>[]>([])
  const [periodDetailLoading, setPeriodDetailLoading] = useState(false)
  const [terrainListDialogOpen, setTerrainListDialogOpen] = useState(false)
  const [terrainListDialogTitle, setTerrainListDialogTitle] = useState("")
  const [terrainListDialogList, setTerrainListDialogList] = useState<Record<string, unknown>[]>([])
  const [terrainListDialogLoading, setTerrainListDialogLoading] = useState(false)
  const [topClients, setTopClients] = useState<{ topPayers: any[]; topTerrains: any[] } | null>(null)
  const [rappels, setRappels] = useState<any[]>([])
  const router = useRouter()

  const terrainStatutToBackend: Record<string, string> = {
    disponible: "Disponible",
    vendu: "Vendu",
    reserve: "Réservé",
    enCours: "En cours",
    annule: "Annulé",
    cede: "Cédé",
  }

  const openTerrainListDialog = async (statKey: string) => {
    const hasPeriod = dateDebut && dateFin
    const hasLocation = selectedVille !== "all" || selectedCite !== "all"
    if (!hasPeriod && !hasLocation) {
      toast({ title: "Filtre requis", description: "Sélectionnez une ville, une cité ou une période pour voir la liste.", variant: "destructive" })
      return
    }
    const labels: Record<string, string> = {
      disponible: "Disponible",
      vendu: "Vendu",
      reserve: "Réservé",
      enCours: "En cours",
      annule: "Annulé",
      cede: "Cédé",
    }
    setTerrainListDialogTitle(labels[statKey] ?? statKey)
    setTerrainListDialogOpen(true)
    setTerrainListDialogLoading(true)
    setTerrainListDialogList([])
    const token = localStorage.getItem("authToken")
    if (!token) return
    try {
      const params = new URLSearchParams()
      if (selectedVille !== "all") params.append("ville", selectedVille)
      if (selectedCite !== "all") params.append("cite", selectedCite)
      if (dateDebut) params.append("dateDebut", dateDebut)
      if (dateFin) params.append("dateFin", dateFin)
      const statut = terrainStatutToBackend[statKey]
      if (statut) params.append("statut", statut)
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/dashboard/terrain-stats/list?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.data?.list) setTerrainListDialogList(response.data.list)
    } catch (err) {
      devLog.error("Error fetching terrain list:", err)
      toast({ title: "Erreur", description: "Impossible de charger la liste des terrains", variant: "destructive" })
    } finally {
      setTerrainListDialogLoading(false)
    }
  }

  const periodDetailTitles: Record<string, string> = {
    prospectsEnregistres: "Prospects enregistrés",
    prospectsConvertis: "Prospects convertis",
    clientsEnregistres: "Clients enregistrés",
    contratsEnregistres: "Contrats enregistrés",
    paiementsEnregistres: "Paiements enregistrés",
    terrainsEnregistres: "Terrains enregistrés",
  }

  const openPeriodDetail = async (type: string) => {
    setPeriodDetailType(type)
    setPeriodDetailOpen(true)
    setPeriodDetailLoading(true)
    setPeriodDetailList([])
    const token = localStorage.getItem("authToken")
    if (!token) return
    try {
      const params = new URLSearchParams({ type })
      if (periodDateDebut) params.append("dateDebut", periodDateDebut)
      if (periodDateFin) params.append("dateFin", periodDateFin)
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/dashboard/today/details?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.data?.list) setPeriodDetailList(response.data.list)
    } catch (err) {
      devLog.error("Error fetching period details:", err)
    } finally {
      setPeriodDetailLoading(false)
    }
  }

  const formatDetailDate = (value: unknown) => {
    if (!value) return "—"
    const d = new Date(value as string)
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { dateStyle: "medium" })
  }

  const handleSessionExpired = () => {
    // Clear authentication data
    localStorage.removeItem("authToken")
    Cookies.remove("authToken")

    // Close the error dialog
    setShowSessionError(false)

    // Redirect to login page
    router.push("/auth/login")
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const token = localStorage.getItem("authToken")
        if (!token) {
          setShowSessionError(true)
          setIsLoading(false)
          return
        }

        // Fetch current user to determine role
        const userResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const userRole = userResponse.data?.role || ""
        const userId = userResponse.data?._id || ""
        setCurrentUserRole(userRole)
        setCurrentUserId(userId)

        // If user is Agent, use commercial dashboard endpoint
        if (userRole.toLowerCase() === "agent") {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/dashboard/commercial/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          if (response.data && response.data.success && response.data.data) {
            setCommercialDashboardData(response.data.data)
          } else {
            setError("No commercial dashboard data received from server")
            toast({
              title: "Warning",
              description: "No commercial dashboard data available",
              variant: "destructive",
            })
          }

          // Fetch upcoming prospect reminders for this agent
          try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const rappelRes = await axios.get(
              `${process.env.NEXT_PUBLIC_API_URL}/prospects?hasDateRappel=true&dateRappelFrom=${today.toISOString()}&sort=dateRappel&order=1&limit=10`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            const list = rappelRes.data?.prospects || rappelRes.data?.data || rappelRes.data || []
            const arr = Array.isArray(list) ? list : []
            setRappels(arr.filter((p: any) => p.dateRappel))
          } catch {
            // silently ignore — rappels are non-critical
          }
        } else {
          // Use regular dashboard endpoint for other roles
          const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.data) {
            setDashboardData(response.data)
          } else {
            setDashboardData(emptyDashboardData)
            setError("No data received from server")
            toast({
              title: "Warning",
              description: "No dashboard data available",
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        devLog.error("Error fetching dashboard data:", error)
        setDashboardData(emptyDashboardData)

        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            setShowSessionError(true)
          } else {
            setError(`Error: ${error.response?.data?.message || error.message}`)
            toast({
              title: "Error",
              description: `Failed to load dashboard data: ${error.response?.data?.message || error.message}`,
              variant: "destructive",
            })
          }
        } else {
          setError("An unexpected error occurred")
          toast({
            title: "Error",
            description: "An unexpected error occurred while loading dashboard data",
            variant: "destructive",
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Fetch top clients on mount
  useEffect(() => {
    const fetchTopClients = async () => {
      try {
        const token = localStorage.getItem("authToken")
        if (!token) return
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/top-clients`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.data?.success) {
          setTopClients(response.data.data)
        }
      } catch {
        // non critique
      }
    }
    fetchTopClients()
  }, [])

  // Fetch cites on mount (for filtre par cité)
  useEffect(() => {
    const fetchCites = async () => {
      try {
        const token = localStorage.getItem("authToken")
        if (!token) return

        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/cites`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const citesData = response.data || []
        setCites(citesData)
      } catch (error) {
        console.error("Error fetching cites:", error)
      }
    }

    fetchCites()
  }, [])

  // Fetch today's or period activities (prospects, clients, contracts, payments, terrains)
  useEffect(() => {
    const fetchTodayActivities = async () => {
      const token = localStorage.getItem("authToken")
      if (!token) return
      try {
        setIsLoadingToday(true)
        const params = new URLSearchParams()
        if (periodDateDebut) params.append("dateDebut", periodDateDebut)
        if (periodDateFin) params.append("dateFin", periodDateFin)
        const url = `${process.env.NEXT_PUBLIC_API_URL}/dashboard/today${params.toString() ? `?${params.toString()}` : ""}`
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.data && typeof response.data === "object") {
          setTodayActivities({
            prospectsEnregistres: response.data.prospectsEnregistres ?? 0,
            prospectsConvertis: response.data.prospectsConvertis ?? 0,
            clientsEnregistres: response.data.clientsEnregistres ?? 0,
            contratsEnregistres: response.data.contratsEnregistres ?? 0,
            paiementsEnregistres: response.data.paiementsEnregistres ?? 0,
            montantEnregistre: response.data.montantEnregistre ?? 0,
            terrainsEnregistres: response.data.terrainsEnregistres ?? 0,
          })
        }
      } catch (err) {
        if (!axios.isAxiosError(err) || err.response?.status !== 404) {
          devLog.error("Error fetching today/period activities:", err)
        }
        setTodayActivities(defaultTodayActivities)
      } finally {
        setIsLoadingToday(false)
      }
    }
    fetchTodayActivities()
  }, [periodDateDebut, periodDateFin])

  // Fetch filtered terrain stats when filters change
  useEffect(() => {
    const fetchFilteredStats = async () => {
      const hasPeriod = dateDebut && dateFin
      const hasLocation = selectedVille !== "all" || selectedCite !== "all"
      if (!hasPeriod && !hasLocation) {
        setFilteredTerrainStats(null)
        return
      }

      try {
        setIsLoadingFilteredStats(true)
        const token = localStorage.getItem("authToken")
        if (!token) return

        const params = new URLSearchParams()
        if (selectedVille !== "all") {
          params.append("ville", selectedVille)
        }
        if (selectedCite !== "all") {
          params.append("cite", selectedCite)
        }
        if (dateDebut) {
          params.append("dateDebut", dateDebut)
        }
        if (dateFin) {
          params.append("dateFin", dateFin)
        }

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/dashboard/terrain-stats?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        setFilteredTerrainStats(response.data)
      } catch (error) {
        console.error("Error fetching filtered terrain stats:", error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les statistiques filtrées",
          variant: "destructive",
        })
      } finally {
        setIsLoadingFilteredStats(false)
      }
    }

    fetchFilteredStats()
  }, [selectedVille, selectedCite, dateDebut, dateFin])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Icons.spinner className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des données du tableau de bord...</p>
        </div>
      </div>
    )
  }

  // Use empty data as fallback when dashboardData is null
  const data = dashboardData || emptyDashboardData
  const commercialData = commercialDashboardData

  // Render commercial dashboard for agents
  if (currentUserRole.toLowerCase() === "agent" && commercialData) {
    return (
      <>
        <ErrorDialog
          isOpen={showSessionError}
          onClose={handleSessionExpired}
          title="Session expirée"
          message="Session expirée, veuillez vous reconnecter."
        />

        {error && !showSessionError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6" role="alert">
            <p className="font-medium">Erreur de chargement</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm bg-red-100 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-800 dark:text-red-300 py-1 px-3 rounded transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
          {/* Notifications objectifs */}
          <motion.div variants={itemVariants}>
            <ObjectifNotifications userRole="Agent" />
          </motion.div>

          {/* Commercial Info Header with Animation */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Tableau de bord commercial
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">
                      {commercialData.commercial.prenom} {commercialData.commercial.nom}
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Award className="h-8 w-8 text-yellow-500" />
                  </motion.div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Main Stats Cards with Enhanced Effects */}
          <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer"
            >
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-white">Total Prospects</CardTitle>
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <Icons.users className="h-5 w-5 text-white" />
                  </motion.div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="text-3xl font-bold text-white mb-1"
                  >
                    {commercialData.overview.totalProspects}
                  </motion.div>
                  <p className="text-xs text-blue-100">Prospects totaux</p>
                  <div className="mt-2">
                    <Progress value={100} className="h-1 bg-blue-400/30" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer"
            >
              <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-white">Prospects Convertis</CardTitle>
                  <TrendingUp className="h-5 w-5 text-white" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="text-3xl font-bold text-white mb-1"
                  >
                    {commercialData.overview.convertedProspects}
                  </motion.div>
                  <p className="text-xs text-green-100">
                    Taux de conversion: {commercialData.overview.conversionRate.toFixed(2)}%
                  </p>
                  <div className="mt-2">
                    <Progress
                      value={commercialData.overview.conversionRate}
                      className="h-1 bg-green-400/30"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer"
            >
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-white">Contrats</CardTitle>
                  <Icons.fileText className="h-5 w-5 text-white" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="text-3xl font-bold text-white mb-1"
                  >
                    {commercialData.performance.contracts}
                  </motion.div>
                  <p className="text-xs text-purple-100">
                    Valeur: ${commercialData.performance.contractsTotalValue.toLocaleString()}
                  </p>
                  <div className="mt-2">
                    <Progress
                      value={(commercialData.performance.contracts / Math.max(commercialData.overview.totalProspects, 1)) * 100}
                      className="h-1 bg-purple-400/30"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer"
            >
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-white">Revenu Total</CardTitle>
                  <Icons.dollarSign className="h-5 w-5 text-white" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="text-3xl font-bold text-white mb-1"
                  >
                    ${commercialData.performance.totalRevenue.toLocaleString()}
                  </motion.div>
                  <p className="text-xs text-orange-100">
                    Moyenne: ${commercialData.performance.averageRevenuePerClient.toLocaleString()}
                  </p>
                  <div className="mt-2">
                    <Progress
                      value={Math.min((commercialData.performance.totalRevenue / 100000) * 100, 100)}
                      className="h-1 bg-orange-400/30"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Charts Section */}
          <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2">
            {/* Trends Chart */}
            <motion.div variants={itemVariants}>
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      Tendances des Prospects
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {commercialData.trends.monthly.length > 0 ? (
                    <CommercialProspectChart trends={commercialData.trends.monthly} />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Aucune donnée disponible</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Status Pie Chart */}
            <motion.div variants={itemVariants}>
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Répartition par Statut
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <StatusPieChart
                    data={[
                      {
                        name: "Prospects",
                        value: commercialData.byStatus.prospect,
                        color: "#eab308",
                      },
                      {
                        name: "Clients",
                        value: commercialData.byStatus.client,
                        color: "#10b981",
                      },
                      {
                        name: "Annulés",
                        value: commercialData.byStatus.annuler,
                        color: "#ef4444",
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-3">
            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}>
              <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Prospects ce mois
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {commercialData.overview.prospectsThisMonth}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Activité mensuelle</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}>
              <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Prospects (30 jours)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {commercialData.overview.prospectsLast30Days}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Dernier mois</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}>
              <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-purple-500" />
                    Prospects (7 jours)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {commercialData.overview.prospectsLast7Days}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Cette semaine</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Rappels de prospects */}
          {rappels.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-500" />
                    Rappels prospects
                    <Badge className="ml-auto bg-amber-500 text-white">{rappels.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rappels.map((prospect: any) => {
                      const rappelDate = new Date(prospect.dateRappel)
                      rappelDate.setHours(0, 0, 0, 0)
                      const todayMidnight = new Date()
                      todayMidnight.setHours(0, 0, 0, 0)
                      const diffDays = Math.round((rappelDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))

                      let badgeLabel = ""
                      let badgeClass = ""
                      if (diffDays <= 0) {
                        badgeLabel = "Aujourd'hui"
                        badgeClass = "bg-red-500 text-white"
                      } else if (diffDays === 1) {
                        badgeLabel = "Demain"
                        badgeClass = "bg-orange-500 text-white"
                      } else if (diffDays <= 7) {
                        badgeLabel = `Dans ${diffDays} jours`
                        badgeClass = "bg-blue-500 text-white"
                      } else {
                        badgeLabel = `Dans ${diffDays} jours`
                        badgeClass = "bg-slate-400 text-white"
                      }

                      return (
                        <div
                          key={prospect._id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                          onClick={() => router.push(`/dashboard/prospect/${prospect._id}`)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold shrink-0">
                              {prospect.nom?.[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium group-hover:text-blue-600 transition-colors truncate">
                                {prospect.nom} {prospect.prenom}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {prospect.telephone || prospect.email || ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <Badge className={badgeClass}>{badgeLabel}</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Activity with Enhanced Design */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Activité Récente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {commercialData.recentActivity.prospects.length > 0 ? (
                  <div className="space-y-3">
                    {commercialData.recentActivity.prospects.map((prospect, index) => (
                      <motion.div
                        key={prospect._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {prospect.nom[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium group-hover:text-blue-600 transition-colors">
                              {prospect.nom} {prospect.prenom}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {prospect.telephone} • {prospect.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={prospect.status === "client" ? "default" : "secondary"}
                            className="mb-1"
                          >
                            {prospect.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {new Date(prospect.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">Aucune activité récente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </>
    )
  }

  // Render regular dashboard for other roles
  return (
    <>
      <ErrorDialog
        isOpen={showSessionError}
        onClose={handleSessionExpired}
        title="Session expirée"
        message="Session expirée, veuillez vous reconnecter."
      />

      {error && !showSessionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6" role="alert">
          <p className="font-medium">Erreur de chargement</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm bg-red-100 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-800 dark:text-red-300 py-1 px-3 rounded transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        {/* Notifications objectifs */}
        <motion.div variants={itemVariants}>
          <ObjectifNotifications userRole="Admin" />
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} className="cursor-pointer">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600" onClick={() => router.push("/dashboard/clients")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Clients</CardTitle>
                <Icons.users className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.counts.clients}</div>
                <p className="text-xs text-blue-100">Clients enregistrés</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} className="cursor-pointer">
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600" onClick={() => router.push("/dashboard/contrat")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Contrats Actifs</CardTitle>
                <Icons.fileText className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.counts.contracts}</div>
                <p className="text-xs text-purple-100">
                  {data.expiringContracts > 0
                    ? `${data.expiringContracts} contrats expirant bientôt`
                    : "Aucun contrat expirant bientôt"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} className="cursor-pointer">
            <Card className="bg-gradient-to-br from-green-500 to-green-600" onClick={() => router.push("/dashboard/facture")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Revenu Total</CardTitle>
                <Icons.dollarSign className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${data.revenue.total.toLocaleString()}</div>
                <p className="text-xs text-green-100">{data.counts.invoices} factures au total</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} className="cursor-pointer">
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600" onClick={() => router.push("/dashboard/terrain")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">CA Prévisionnel total</CardTitle>
                <Icons.map className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${dashboardData?.terrains.totalTerrainPrice || 0}</div>
                <p className="text-xs text-orange-100">sur {dashboardData?.terrains.total || 0} terrains au total</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* AUJOURD'HUI / PÉRIODE - Activités du jour ou sur une période */}
        <motion.div variants={itemVariants}>
          <Card className="border-primary/20 bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-900/50 dark:to-slate-800/30">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icons.clock className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {periodDateDebut && periodDateFin ? "Statistiques de la période" : "Aujourd'hui"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-normal">
                      {periodDateDebut && periodDateFin
                        ? `Activités du ${periodDateDebut} au ${periodDateFin}`
                        : "Activités enregistrées ce jour"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="period-date-debut" className="text-xs text-muted-foreground whitespace-nowrap">Début</label>
                    <Input
                      id="period-date-debut"
                      type="date"
                      value={periodDateDebut}
                      onChange={(e) => setPeriodDateDebut(e.target.value)}
                      className="h-9 w-[140px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="period-date-fin" className="text-xs text-muted-foreground whitespace-nowrap">Fin</label>
                    <Input
                      id="period-date-fin"
                      type="date"
                      value={periodDateFin}
                      onChange={(e) => setPeriodDateFin(e.target.value)}
                      className="h-9 w-[140px]"
                    />
                  </div>
                  {(periodDateDebut || periodDateFin) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodDateDebut("")
                        setPeriodDateFin("")
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingToday ? (
                <div className="flex items-center justify-center py-8">
                  <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <button
                    type="button"
                    onClick={() => openPeriodDetail("prospectsEnregistres")}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Icons.userPlus className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Prospect enregistré</p>
                      <p className="text-lg font-semibold tabular-nums">{todayActivities.prospectsEnregistres}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPeriodDetail("prospectsConvertis")}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Icons.checkCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Prospect converti</p>
                      <p className="text-lg font-semibold tabular-nums">{todayActivities.prospectsConvertis}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPeriodDetail("clientsEnregistres")}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Icons.users className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Client enregistré</p>
                      <p className="text-lg font-semibold tabular-nums">{todayActivities.clientsEnregistres}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPeriodDetail("contratsEnregistres")}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Icons.fileText className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Contrat enregistré</p>
                      <p className="text-lg font-semibold tabular-nums">{todayActivities.contratsEnregistres}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPeriodDetail("paiementsEnregistres")}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Icons.activity className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Paiement enregistré</p>
                      <p className="text-lg font-semibold tabular-nums">{todayActivities.paiementsEnregistres}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPeriodDetail("paiementsEnregistres")}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Icons.dollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Montant enregistré</p>
                      <p className="text-lg font-semibold tabular-nums">
                        ${todayActivities.montantEnregistre.toLocaleString()}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPeriodDetail("terrainsEnregistres")}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Icons.map className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Terrain enregistré</p>
                      <p className="text-lg font-semibold tabular-nums">{todayActivities.terrainsEnregistres}</p>
                    </div>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog détail période */}
          <Dialog open={periodDetailOpen} onOpenChange={setPeriodDetailOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {periodDetailType ? periodDetailTitles[periodDetailType] ?? periodDetailType : ""}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-auto flex-1 min-h-0">
                {periodDetailLoading ? (
                  <div className="flex justify-center py-12">
                    <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : periodDetailList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Aucun élément pour cette période.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {periodDetailType === "prospectsEnregistres" && (
                          <>
                            <TableHead>Nom</TableHead>
                            <TableHead>Téléphone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Commercial attitré</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Date</TableHead>
                          </>
                        )}
                        {periodDetailType === "prospectsConvertis" && (
                          <>
                            <TableHead>Nom</TableHead>
                            <TableHead>Téléphone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Commercial attitré</TableHead>
                            <TableHead>Date conversion</TableHead>
                          </>
                        )}
                        {periodDetailType === "clientsEnregistres" && (
                          <>
                            <TableHead>Nom</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Téléphone</TableHead>
                            <TableHead>Date</TableHead>
                          </>
                        )}
                        {periodDetailType === "contratsEnregistres" && (
                          <>
                            <TableHead>Code</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Terrain</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Date</TableHead>
                          </>
                        )}
                        {periodDetailType === "paiementsEnregistres" && (
                          <>
                            <TableHead>Code</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Contrat</TableHead>
                            <TableHead>Montant</TableHead>
                            <TableHead>Méthode</TableHead>
                            <TableHead>Date</TableHead>
                          </>
                        )}
                        {periodDetailType === "terrainsEnregistres" && (
                          <>
                            <TableHead>Numéro</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Cîté</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Date</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodDetailType === "prospectsEnregistres" &&
                        periodDetailList.map((row) => {
                          const commercial = row.commercialAttritre as { nom?: string; prenom?: string } | undefined
                          const commercialLabel = commercial
                            ? `${commercial.prenom ?? ""} ${commercial.nom ?? ""}`.trim() || (row.commercialAttritreName as string) || "—"
                            : (row.commercialAttritreName as string) || "—"
                          const phone = [row.indicatif, row.telephone].filter(Boolean).join(" ").trim() || "—"
                          return (
                            <TableRow key={(row._id as string) ?? row.createdAt}>
                              <TableCell>{(row.prenom as string) ?? ""} {(row.nom as string) ?? ""}</TableCell>
                              <TableCell>{phone}</TableCell>
                              <TableCell>{String(row.email ?? "—")}</TableCell>
                              <TableCell>{commercialLabel}</TableCell>
                              <TableCell>{String(row.status ?? "—")}</TableCell>
                              <TableCell>{formatDetailDate(row.date ?? row.createdAt)}</TableCell>
                            </TableRow>
                          )
                        })}
                      {periodDetailType === "prospectsConvertis" &&
                        periodDetailList.map((row) => {
                          const commercial = row.commercialAttritre as { nom?: string; prenom?: string } | undefined
                          const commercialLabel = commercial
                            ? `${commercial.prenom ?? ""} ${commercial.nom ?? ""}`.trim() || (row.commercialAttritreName as string) || "—"
                            : (row.commercialAttritreName as string) || "—"
                          const phone = [row.indicatif, row.telephone].filter(Boolean).join(" ").trim() || "—"
                          return (
                            <TableRow key={(row._id as string) ?? row.updatedAt}>
                              <TableCell>{(row.prenom as string) ?? ""} {(row.nom as string) ?? ""}</TableCell>
                              <TableCell>{phone}</TableCell>
                              <TableCell>{String(row.email ?? "—")}</TableCell>
                              <TableCell>{commercialLabel}</TableCell>
                              <TableCell>{formatDetailDate(row.date ?? row.updatedAt)}</TableCell>
                            </TableRow>
                          )
                        })}
                      {periodDetailType === "clientsEnregistres" &&
                        periodDetailList.map((row) => (
                          <TableRow key={(row._id as string) ?? row.createdAt}>
                            <TableCell>{(row.prenom as string) ?? ""} {(row.nom as string) ?? ""}</TableCell>
                            <TableCell>{String(row.code ?? "—")}</TableCell>
                            <TableCell>{String(row.indicatif ?? "")}{String(row.telephone ?? "—")}</TableCell>
                            <TableCell>{formatDetailDate(row.date ?? row.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      {periodDetailType === "contratsEnregistres" &&
                        periodDetailList.map((row) => {
                          const client = row.clientId as { nom?: string; prenom?: string; code?: string } | undefined
                          const terrain = row.terrainId as { numero?: string; code?: string } | undefined
                          return (
                            <TableRow key={(row._id as string) ?? row.createdAt}>
                              <TableCell>{String(row.code ?? "—")}</TableCell>
                              <TableCell>{client ? `${client.prenom ?? ""} ${client.nom ?? ""}`.trim() || client.code : "—"}</TableCell>
                              <TableCell>{terrain ? terrain.numero ?? terrain.code ?? "—" : "—"}</TableCell>
                              <TableCell>{typeof row.total === "number" ? `${row.total} USD` : "—"}</TableCell>
                              <TableCell>{formatDetailDate(row.date ?? row.createdAt)}</TableCell>
                            </TableRow>
                          )
                        })}
                      {periodDetailType === "paiementsEnregistres" &&
                        periodDetailList.map((row) => {
                          const client = row.clientId as { nom?: string; prenom?: string } | undefined
                          const contrat = row.contratId as { code?: string } | undefined
                          return (
                            <TableRow key={(row._id as string) ?? row.createdAt}>
                              <TableCell>{String(row.code ?? "—")}</TableCell>
                              <TableCell>{client ? `${client.prenom ?? ""} ${client.nom ?? ""}`.trim() : "—"}</TableCell>
                              <TableCell>{contrat ? contrat.code : "—"}</TableCell>
                              <TableCell>{typeof row.somme === "number" ? `${row.somme.toLocaleString()} ${row.devise ?? "USD"}` : "—"}</TableCell>
                              <TableCell>{String(row.methode ?? "—")}</TableCell>
                              <TableCell>{formatDetailDate(row.date ?? row.createdAt)}</TableCell>
                            </TableRow>
                          )
                        })}
                      {periodDetailType === "terrainsEnregistres" &&
                        periodDetailList.map((row) => {
                          const cite = row.cite as { nom?: string; ville?: string; commune?: string } | undefined
                          const citeLabel = cite ? [cite.nom, cite.ville, cite.commune].filter(Boolean).join(", ") || "—" : "—"
                          return (
                            <TableRow key={(row._id as string) ?? row.createdAt}>
                              <TableCell>{String(row.numero ?? "—")}</TableCell>
                              <TableCell>{String(row.code ?? "—")}</TableCell>
                              <TableCell>{citeLabel}</TableCell>
                              <TableCell>{String(row.statut ?? "—")}</TableCell>
                              <TableCell>{formatDetailDate(row.date ?? row.createdAt)}</TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Charts */}
        <motion.div variants={containerVariants} className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-12">
          <motion.div variants={itemVariants} className="lg:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Aperçu des Revenus</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {data.revenue.monthly.length > 0 ? (
                  <FactureChart data={data.revenue.monthly} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground dark:text-gray-400">Aucune donnée de revenu disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>État des Terrains</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {data.terrains.total > 0 ? (
                  <TerrainChart
                    available={data.terrains.available}
                    total={data.terrains.total}
                    statusData={data.terrains.statusData}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Aucun terrain disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-12">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Statistiques Terrains (Filtre)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ville-filter">Filtrer par Ville</Label>
                      <Select value={selectedVille} onValueChange={(value) => {
                        setSelectedVille(value)
                        if (value !== selectedVille) {
                          setSelectedCite("all")
                        }
                      }}>
                        <SelectTrigger id="ville-filter">
                          <SelectValue placeholder="Sélectionner une ville" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les villes</SelectItem>
                          {VILLES_OPTIONS.map((ville) => (
                            <SelectItem key={ville} value={ville}>
                              {ville}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cite-filter">Filtrer par Cité</Label>
                      <Select 
                        value={selectedCite} 
                        onValueChange={setSelectedCite}
                        disabled={selectedVille === "all"}
                      >
                        <SelectTrigger id="cite-filter">
                          <SelectValue placeholder="Sélectionner une cité" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les cités</SelectItem>
                          {cites
                            .filter((cite) => selectedVille === "all" || cite.ville === selectedVille)
                            .map((cite) => (
                              <SelectItem key={cite._id} value={cite._id}>
                                {cite.nom} {cite.commune ? `(${cite.commune})` : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-debut">Date début</Label>
                      <Input
                        id="date-debut"
                        type="date"
                        value={dateDebut}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateDebut(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-fin">Date fin</Label>
                      <Input
                        id="date-fin"
                        type="date"
                        value={dateFin}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFin(e.target.value)}
                        className="w-full"
                        min={dateDebut || undefined}
                      />
                    </div>
                  </div>
                  {dateDebut && dateFin && (
                    <p className="text-xs text-muted-foreground">
                      Période : terrains dont la dernière mise à jour est entre le {new Date(dateDebut + "T00:00:00").toLocaleDateString("fr-FR")} et le {new Date(dateFin + "T23:59:59").toLocaleDateString("fr-FR")}.
                    </p>
                  )}

                  {/* Filtered Stats */}
                  {isLoadingFilteredStats ? (
                    <div className="flex items-center justify-center py-8">
                      <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredTerrainStats ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <button
                          type="button"
                          onClick={() => openTerrainListDialog("disponible")}
                          className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-left hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                        >
                          <p className="text-sm text-green-700 dark:text-green-400 font-medium">Disponible</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-300">{filteredTerrainStats.disponible}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => openTerrainListDialog("vendu")}
                          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                        >
                          <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Vendu</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{filteredTerrainStats.vendu}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => openTerrainListDialog("reserve")}
                          className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-left hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
                        >
                          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Réservé</p>
                          <p className="text-2xl font-bold text-amber-900 dark:text-amber-300">{filteredTerrainStats.reserve}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => openTerrainListDialog("enCours")}
                          className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 text-left hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
                        >
                          <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">En cours</p>
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{filteredTerrainStats.enCours}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => openTerrainListDialog("annule")}
                          className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-left hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                        >
                          <p className="text-sm text-red-700 dark:text-red-400 font-medium">Annulé</p>
                          <p className="text-2xl font-bold text-red-900 dark:text-red-300">{filteredTerrainStats.annule}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => openTerrainListDialog("cede")}
                          className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 text-left hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                        >
                          <p className="text-sm text-indigo-700 dark:text-indigo-400 font-medium">Cédé</p>
                          <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">{filteredTerrainStats.cede}</p>
                        </button>
                        <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <p className="text-sm text-slate-700 dark:text-slate-400 font-medium">Somme totale</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500">Vendu + En cours</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {(filteredTerrainStats.sommePrix ?? 0).toLocaleString()} USD
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          Total: <span className="font-semibold text-foreground">{filteredTerrainStats.total}</span> terrain{filteredTerrainStats.total > 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* Dialog liste des terrains par statut */}
                      <Dialog open={terrainListDialogOpen} onOpenChange={setTerrainListDialogOpen}>
                        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                          <DialogHeader>
                            <DialogTitle>Terrains — {terrainListDialogTitle}</DialogTitle>
                          </DialogHeader>
                          <div className="overflow-auto flex-1 min-h-0">
                            {terrainListDialogLoading ? (
                              <div className="flex justify-center py-12">
                                <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                              </div>
                            ) : terrainListDialogList.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-8 text-center">Aucun terrain pour ce statut avec les filtres actuels.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Numéro</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Cîté</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Prix</TableHead>
                                    <TableHead>Dernière MAJ</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {terrainListDialogList.map((t) => {
                                    const cite = t.cite as { nom?: string; ville?: string; commune?: string } | undefined
                                    const citeLabel = cite ? [cite.nom, cite.ville, cite.commune].filter(Boolean).join(", ") || "—" : "—"
                                    const dateVal = t.updatedAt as string | undefined
                                    const dateStr = dateVal ? new Date(dateVal).toLocaleDateString("fr-FR", { dateStyle: "medium" }) : "—"
                                    return (
                                      <TableRow key={String(t._id)}>
                                        <TableCell className="font-medium">{String(t.numero ?? "—")}</TableCell>
                                        <TableCell>{String(t.code ?? "—")}</TableCell>
                                        <TableCell>{citeLabel}</TableCell>
                                        <TableCell>{String(t.statut ?? "—")}</TableCell>
                                        <TableCell>{typeof t.prix === "number" ? `${t.prix.toLocaleString()} USD` : "—"}</TableCell>
                                        <TableCell>{dateStr}</TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">Sélectionnez une ville, une cité ou une période (date début et date fin) pour voir les statistiques filtrées</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>État des Contrats</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {data.counts.contracts > 0 ? (
                  <ContratChart active={data.counts.contracts} expiring={data.expiringContracts} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Aucun contrat disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle>Transactions Récentes</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentTransactions.length > 0 ? (
                  <RecentTransactions transactions={data.recentTransactions} />
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">Aucune transaction récente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top 5 clients — meilleurs payeurs */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-6">
            <Card className="h-full border-0 shadow-md bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-800 dark:to-emerald-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <span>Top 5 — Meilleurs Payeurs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!topClients ? (
                  <div className="flex justify-center py-8">
                    <Icons.spinner className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : topClients.topPayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée disponible</p>
                ) : (
                  <div className="space-y-2">
                    {topClients.topPayers.map((c: any, idx: number) => {
                      const rankIcons = [Crown, Trophy, Medal, Award, Award]
                      const rankColors = ["text-amber-500", "text-slate-400", "text-orange-400", "text-blue-400", "text-purple-400"]
                      const RankIcon = rankIcons[idx]
                      const maxPaye = topClients.topPayers[0]?.totalPaye || 1
                      const pct = Math.round((c.totalPaye / maxPaye) * 100)
                      return (
                        <div
                          key={String(c._id)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                          onClick={() => c._id && router.push(`/dashboard/clients/detail/${c._id}`)}
                        >
                          <RankIcon className={`h-4 w-4 flex-shrink-0 ${rankColors[idx]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold truncate">
                                {c.client?.nom} {c.client?.postnom || ""} {c.client?.prenom}
                              </span>
                              <span className="text-sm font-bold text-emerald-600 ml-2 flex-shrink-0">
                                ${c.totalPaye.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0">{c.nbPaiements} pmt</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top 5 clients — plus de terrains */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-6">
            <Card className="h-full border-0 shadow-md bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-blue-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                    <Home className="h-4 w-4 text-white" />
                  </div>
                  <span>Top 5 — Plus de Terrains</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!topClients ? (
                  <div className="flex justify-center py-8">
                    <Icons.spinner className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : topClients.topTerrains.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée disponible</p>
                ) : (
                  <div className="space-y-2">
                    {topClients.topTerrains.map((c: any, idx: number) => {
                      const rankIcons = [Crown, Trophy, Medal, Award, Award]
                      const rankColors = ["text-amber-500", "text-slate-400", "text-orange-400", "text-blue-400", "text-purple-400"]
                      const RankIcon = rankIcons[idx]
                      const maxTerrains = topClients.topTerrains[0]?.nbTerrains || 1
                      const pct = Math.round((c.nbTerrains / maxTerrains) * 100)
                      return (
                        <div
                          key={String(c._id)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                          onClick={() => c._id && router.push(`/dashboard/clients/detail/${c._id}`)}
                        >
                          <RankIcon className={`h-4 w-4 flex-shrink-0 ${rankColors[idx]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold truncate">
                                {c.client?.nom} {c.client?.postnom || ""} {c.client?.prenom}
                              </span>
                              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                <span className="text-sm font-bold text-blue-600">{c.nbTerrains}</span>
                                <span className="text-xs text-muted-foreground">terrain{c.nbTerrains > 1 ? "s" : ""}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                ${(c.montantTotal || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  )
}
