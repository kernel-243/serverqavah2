"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ContratCard } from "@/components/contrat-card"
import { NewContratDialog } from "@/components/new-contrat-dialog"
import { Icons } from "@/components/icons"
import axios from "axios"
import { Client } from "@/types/client"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "react-hot-toast"
import { ContratStats } from "@/components/dashboard/contrat-stats"
import { devLog } from "@/lib/devLogger"
import { ContratSearch } from "@/components/dashboard/contrat-search"
import { ContratLoading } from "@/components/dashboard/contrat-loading"
import { ContratEmpty } from "@/components/dashboard/contrat-empty"

interface Contrat {
  _id: string
  code: string
  clientId: {
    _id: string
    code: string
    nom: string
    prenom: string
    sexe: string
    dateNaissance: string
    adresse: string
    email: string
    indicatif: string
    telephone: string
    salarie: boolean
  }
  terrainId: {
    _id: string
    code: string
    numero: string
    dimension: string
    pays: string
    province: string
    ville: string
    commune: string
    quartier: string
    avenue: string
    disponnible: boolean
    prix: number
  }
  total: number
  dateContrat: string
  dateDebut: string
  dateFin: string
  statut: "en_cours" | "termine" | "en_attente" | "résilié" | "révoqué"
  // remainingBalance: number
  remainingMonths: number
  remainingFromToday: number
  nbMonth: number
  totalPaid: number
  remainingTotal: number
  contratCadastral?: {
    statut: "non_disponible" | "en_attente" | "en_cours" | "disponible" | "remis" | "annule"
    lastUpdate?: string
    lastUpdateBy?: string
  }
}

interface ContratResponse {
  contrats: Contrat[]
}

interface Terrain {
  _id: string
  code: string
  numero: string
  dimension: string
  cite: Cite
  pays: string
  province: string
  ville: string
  commune: string
  quartier: string
  avenue: string
  disponnible: boolean
  prix: number
  statut: string
}

interface Cite {
  _id: string
  nom: string
  commune: string
  province: string
}

export default function ContratPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [terrains, setTerrains] = useState<Terrain[]>([])
  const [cites, setCites] = useState<Cite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"all" | "en_cours" | "termine" | "en_attente" | "résilié" | "révoqué">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"date" | "client" | "terrain" | "balance">("date")
  
  // Advanced search filters
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month" | "quarter" | "year">("all")
  const [amountFilter, setAmountFilter] = useState<"all" | "low" | "medium" | "high">("all")
  const [progressionFilter, setProgressionFilter] = useState<"all" | "low" | "medium" | "high">("all")
  const [cadastralFilter, setCadastralFilter] = useState<"all" | "non_disponible" | "en_attente" | "en_cours" | "disponible" | "remis" | "annule">("all")
  const [allContrats, setAllContrats] = useState<Contrat[]>([])
  const [contratCount, setContratCount] = useState({
    totalContracts: 0,
    totalContratEnCours: 0,
    totalContratTermine: 0,
    totalContratEnAttente: 0,
    totalContratRevoque: 0,
    totalFactureContrat: 0,
    totalSommeContrat: 0,
    totalSoldeRestant: 0
  })
  const [stats, setStats] = useState<
  {
    total: number
    enCours: number
    termines: number
    enAttente: number
    révoqués: number
    totalValue: number
    remainingValue: number
  }>({
    total: 0,
    enCours: 0,
    termines: 0,
    enAttente: 0,
    révoqués: 0,
    totalValue: 0,
    remainingValue: 0
  })

  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isInitialMount = useRef(true)
  const currentPageRef = useRef(1)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setIsLoading(true)
    setCurrentPage(1)
    currentPageRef.current = 1
    setAllContrats([])
    setHasMore(true)
    
    try {
      const token = localStorage.getItem("authToken")
      
      // Build query parameters
      const params = new URLSearchParams({
        page: '1',
        limit: '20'
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      // Fetch paginated contrats and related data in parallel
      const [contratsResponse, contratCountResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/fetch/all?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/count`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ])
      
      // Set paginated contrats data
      const { contrats, pagination } = contratsResponse.data
      setAllContrats(contrats)
      setHasMore(pagination.hasMore)
      setCurrentPage(1)
      currentPageRef.current = 1
      
      devLog.log(`Initial load: ${contrats.length} contrats, hasMore: ${pagination.hasMore}, totalCount: ${pagination.totalCount}`)
      
      // Set other data
      setContratCount(contratCountResponse.data)
      setClients(contratCountResponse.data.clients || [])
      setTerrains(contratCountResponse.data.terrains || [])
      setCites(contratCountResponse.data.cites || [])
      
      // Calculate stats from count data
      const currentPageStats = {
        total: contratCountResponse.data.totalContracts || 0,
        enCours: contratCountResponse.data.totalContratEnCours || 0,
        termines: contratCountResponse.data.totalContratTermine || 0,
        enAttente: contratCountResponse.data.totalContratEnAttente || 0,
        révoqués: contratCountResponse.data.totalContratRevoque || 0,
        totalValue: contratCountResponse.data.totalSommeContrat || 0,
        remainingValue: contratCountResponse.data.totalSoldeRestant || 0
      }
      setStats(currentPageStats)
      
    } catch (error) {
      devLog.error("Error fetching data:", error)
      toast.error("Erreur lors du chargement des données")
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreContrats = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading) return

    setIsLoadingMore(true)
    try {
      const token = localStorage.getItem("authToken")
      
      // Get current page from ref and increment
      const nextPage = currentPageRef.current + 1
      currentPageRef.current = nextPage
      
      // Build query parameters with filters
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: '20'
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/contrats/fetch/all?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const { contrats, pagination } = response.data
      
      devLog.log(`Loading page ${nextPage}: ${contrats.length} contrats, hasMore: ${pagination.hasMore}, totalCount: ${pagination.totalCount}`)
      
      setAllContrats((prev) => {
        const newContrats = [...prev, ...contrats]
        devLog.log(`Total contrats after loading: ${newContrats.length}`)
        return newContrats
      })
      setHasMore(pagination.hasMore)
      setCurrentPage(nextPage)
    } catch (error) {
      devLog.error("Error loading more contrats:", error)
      toast.error("Erreur lors du chargement des contrats supplémentaires")
      // Revert page ref on error
      currentPageRef.current = currentPageRef.current - 1
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, isLoading, searchQuery, statusFilter])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    
    // Wait a bit for the DOM to be ready
    const timeoutId = setTimeout(() => {
      const target = observerTarget.current
      if (!target) {
        devLog.warn("Observer target not found")
        return
      }

      devLog.log("Setting up Intersection Observer", { hasMore, isLoadingMore, isLoading })

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          devLog.log("Intersection observer triggered", {
            isIntersecting: entry.isIntersecting,
            hasMore,
            isLoadingMore,
            isLoading,
            intersectionRatio: entry.intersectionRatio
          })
          
          if (entry.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
            devLog.log("Conditions met - loading more contrats")
            loadMoreContrats()
          }
        },
        { 
          threshold: 0.01, // Trigger even with 1% visibility
          rootMargin: '200px' // Start loading 200px before reaching the bottom
        }
      )

      observer.observe(target)
      observerRef.current = observer
      devLog.log("Observer attached to target")
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [hasMore, isLoadingMore, isLoading, loadMoreContrats])

  // Apply filters and sorting to allContrats (client-side filters only)
  const applyFilters = (contrats: Contrat[]) => {
    let filtered = [...contrats]

    // Note: Search and status filters are now handled server-side

    // Apply period filter
    if (periodFilter !== "all") {
      const now = new Date()
      const contractDate = new Date()
      
      filtered = filtered.filter(contrat => {
        contractDate.setTime(new Date(contrat.dateContrat).getTime())
        
        switch (periodFilter) {
          case "today":
            return contractDate.toDateString() === now.toDateString()
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return contractDate >= weekAgo
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            return contractDate >= monthAgo
          case "quarter":
            const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            return contractDate >= quarterAgo
          case "year":
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            return contractDate >= yearAgo
          default:
            return true
        }
      })
    }

    // Apply amount filter
    if (amountFilter !== "all") {
      filtered = filtered.filter(contrat => {
        switch (amountFilter) {
          case "low":
            return contrat.total < 10000
          case "medium":
            return contrat.total >= 10000 && contrat.total <= 50000
          case "high":
            return contrat.total > 50000
          default:
            return true
        }
      })
    }

    // Apply progression filter
    if (progressionFilter !== "all") {
      filtered = filtered.filter(contrat => {
        const progression = ((contrat.total - contrat.remainingTotal) / contrat.total) * 100
        switch (progressionFilter) {
          case "low":
            return progression < 25
          case "medium":
            return progression >= 25 && progression <= 75
          case "high":
            return progression > 75
          default:
            return true
        }
      })
    }

    // Apply contrat cadastral statut filter
    if (cadastralFilter !== "all") {
      filtered = filtered.filter(contrat => {
        const statut = contrat.contratCadastral?.statut ?? "non_disponible"
        return statut === cadastralFilter
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.dateContrat).getTime() - new Date(a.dateContrat).getTime()
        case "client":
          return `${a.clientId.nom} ${a.clientId.prenom}`.localeCompare(`${b.clientId.nom} ${b.clientId.prenom}`)
        case "terrain":
          // Handle cases where terrainId might be undefined
          const aTerrainNum = a.terrainId?.numero || ""
          const bTerrainNum = b.terrainId?.numero || ""
          return aTerrainNum.localeCompare(bTerrainNum)
        case "balance":
          return b.remainingTotal - a.remainingTotal
        default:
          return 0
      }
    })

    return filtered
  }

  // Debounce search term and status filter to avoid too many API calls
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      fetchInitialData()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter])

  // Apply filters to allContrats and update display (client-side filters only)
  useEffect(() => {
    const filtered = applyFilters(allContrats)
    setContrats(filtered)
  }, [allContrats, sortBy, periodFilter, amountFilter, progressionFilter, cadastralFilter])

  // Get all filtered contrats to display (no pagination)
  const displayContrats = contrats

  const handleAddContrat = () => {
   
    setIsDialogOpen(true)
  }

  const handleContratAdded = () => {
    refreshData()
    toast.success("Contrat ajouté avec succès")
  }

  const handleContratUpdated = () => {
    refreshData()
  }

  // Function to refresh data without showing loading state
  const refreshData = async () => {
    try {
      const token = localStorage.getItem("authToken")
      
      // Reset pagination and fetch fresh data
      setCurrentPage(1)
      currentPageRef.current = 1
      setAllContrats([])
      setHasMore(true)
      
      // Build query parameters with current filters
      const params = new URLSearchParams({
        page: '1',
        limit: '20'
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      const [contratsResponse, contratCountResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/fetch/all?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/count`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ])
      
      const { contrats, pagination } = contratsResponse.data
      setAllContrats(contrats)
      setHasMore(pagination.hasMore)
      setContratCount(contratCountResponse.data)
      setClients(contratCountResponse.data.clients || [])
      setTerrains(contratCountResponse.data.terrains || [])
      setCites(contratCountResponse.data.cites || [])
      
      // Recalculate stats from count data
      const currentPageStats = {
        total: contratCountResponse.data.totalContracts || 0,
        enCours: contratCountResponse.data.totalContratEnCours || 0,
        termines: contratCountResponse.data.totalContratTermine || 0,
        enAttente: contratCountResponse.data.totalContratEnAttente || 0,
        révoqués: contratCountResponse.data.totalContratRevoque || 0,
        totalValue: contratCountResponse.data.totalSommeContrat || 0,
        remainingValue: contratCountResponse.data.totalSoldeRestant || 0
      }
      setStats(currentPageStats)
      
    } catch (error) {
      devLog.error("Error refreshing data:", error)
      toast.error("Erreur lors du rafraîchissement des données")
    }
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
              Gestion des Contrats
            </h1>
            <p className="text-slate-600 dark:text-gray-400 text-lg">
              Gérez vos contrats immobiliers et suivez les paiements
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={refreshData}
              variant="outline"
              size="lg"
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-slate-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Icons.refresh className="mr-2 h-5 w-5" />
              Actualiser
            </Button>
            <Button 
              onClick={handleAddContrat}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Icons.plus className="mr-2 h-5 w-5" />
              Nouveau Contrat
            </Button>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ContratStats stats={stats} contratCount={contratCount} />
        </motion.div>

        {/* Filters and Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ContratSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
            stats={stats}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            amountFilter={amountFilter}
            setAmountFilter={setAmountFilter}
            progressionFilter={progressionFilter}
            setProgressionFilter={setProgressionFilter}
            cadastralFilter={cadastralFilter}
            setCadastralFilter={setCadastralFilter}
          />
        </motion.div>

        {/* Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {isLoading ? (
            <ContratLoading viewMode={viewMode} count={6} />
          ) : displayContrats.length === 0 ? (
            <ContratEmpty 
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              onAddContrat={handleAddContrat}
            />
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewMode}-${statusFilter}-${sortBy}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={viewMode === "grid" 
                    ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
                    : "space-y-4"
                  }
                >
                  {displayContrats.map((contrat, index) => (
                    <motion.div
                      key={contrat._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={viewMode === "list" ? "w-full" : ""}
                    >
                      <ContratCard 
                        contrat={contrat} 
                        onContratUpdated={handleContratUpdated}
                        viewMode={viewMode}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
              
              {/* Infinite scroll trigger - always render to attach observer */}
              {hasMore && (
                <div ref={observerTarget} className="flex justify-center items-center py-8 min-h-[100px]">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                      <Icons.spinner className="h-5 w-5 animate-spin" />
                      <span>Chargement des contrats...</span>
                    </div>
                  )}
                  {!isLoadingMore && (
                    <div className="text-slate-400 dark:text-gray-500 text-xs">
                      Chargement automatique...
                    </div>
                  )}
                </div>
              )}
              {!hasMore && displayContrats.length > 0 && (
                <div className="flex justify-center items-center py-8">
                  <div className="text-slate-500 dark:text-gray-400 text-sm">
                    Tous les contrats ont été chargés ({displayContrats.length} au total)
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      <NewContratDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onContratAdded={handleContratAdded}
        clients={clients}
        terrains={terrains}
        cites={cites}
      />
    </div>
  )
}
