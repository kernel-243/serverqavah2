"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { NewContratConstructionDialog } from "@/components/new-contrat-construction-dialog"
import { ContratConstructionCard, type ContratConstruction } from "@/components/contrat-construction-card"
import type { Client } from "@/types/client"

interface ContratTerrain {
  _id: string
  code: string
  clientId: { nom: string; prenom: string }
  terrainId?: { numero: string }
}

interface Stats {
  total: number
  enCours: number
  termines: number
  enAttente: number
  totalValue: number
}

export default function ContratConstructionPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [contrats, setContrats] = useState<ContratConstruction[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [contratsTerrains, setContratsTerrains] = useState<ContratTerrain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"all" | "en_cours" | "termine" | "en_attente" | "résilié">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"date" | "client" | "montant">("date")
  const [stats, setStats] = useState<Stats>({ total: 0, enCours: 0, termines: 0, enAttente: 0, totalValue: 0 })

  // Infinite scroll
  const [allContrats, setAllContrats] = useState<ContratConstruction[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const currentPageRef = useRef(1)
  const observerTarget = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setIsLoading(true)
    currentPageRef.current = 1
    setAllContrats([])
    setHasMore(true)

    try {
      const token = localStorage.getItem("authToken")
      const params = new URLSearchParams({ page: "1", limit: "20" })
      if (searchQuery.trim()) params.append("search", searchQuery.trim())
      if (statusFilter !== "all") params.append("status", statusFilter)

      const [contratsRes, clientsRes, contratsTerrainRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats-construction?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { contrats: [], pagination: { hasMore: false } } })),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients?page=1&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { clients: [] } })),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/fetch/all?page=1&limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { contrats: [] } })),
      ])

      const fetchedContrats: ContratConstruction[] = contratsRes.data.contrats || contratsRes.data || []
      const pagination = contratsRes.data.pagination || { hasMore: false }

      setAllContrats(fetchedContrats)
      setHasMore(pagination.hasMore)
      setClients(clientsRes.data.clients || clientsRes.data || [])
      setContratsTerrains(contratsTerrainRes.data.contrats || [])

      // Compute stats
      computeStats(fetchedContrats)
    } catch (error) {
      toast.error("Erreur lors du chargement des données")
    } finally {
      setIsLoading(false)
    }
  }

  const computeStats = (list: ContratConstruction[]) => {
    setStats({
      total: list.length,
      enCours: list.filter((c) => c.statut === "en_cours").length,
      termines: list.filter((c) => c.statut === "termine").length,
      enAttente: list.filter((c) => c.statut === "en_attente").length,
      totalValue: list.reduce((sum, c) => sum + (c.montantTotal || 0), 0),
    })
  }

  const loadMoreContrats = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading) return
    setIsLoadingMore(true)
    try {
      const token = localStorage.getItem("authToken")
      const nextPage = currentPageRef.current + 1
      currentPageRef.current = nextPage
      const params = new URLSearchParams({ page: nextPage.toString(), limit: "20" })
      if (searchQuery.trim()) params.append("search", searchQuery.trim())
      if (statusFilter !== "all") params.append("status", statusFilter)

      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats-construction?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { contrats: newContrats, pagination } = res.data
      setAllContrats((prev) => [...prev, ...newContrats])
      setHasMore(pagination.hasMore)
    } catch {
      currentPageRef.current -= 1
      toast.error("Erreur lors du chargement")
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, isLoading, searchQuery, statusFilter])

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null }
    const timeoutId = setTimeout(() => {
      const target = observerTarget.current
      if (!target) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) loadMoreContrats()
        },
        { threshold: 0.01, rootMargin: "200px" }
      )
      observer.observe(target)
      observerRef.current = observer
    }, 100)
    return () => { clearTimeout(timeoutId); if (observerRef.current) observerRef.current.disconnect() }
  }, [hasMore, isLoadingMore, isLoading, loadMoreContrats])

  // Re-fetch on filter/search change
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return }
    const timeout = setTimeout(fetchInitialData, 500)
    return () => clearTimeout(timeout)
  }, [searchQuery, statusFilter])

  // Client-side sort
  const displayContrats = [...allContrats].sort((a, b) => {
    switch (sortBy) {
      case "date":    return new Date(b.dateContrat).getTime() - new Date(a.dateContrat).getTime()
      case "client":  return `${a.clientId.nom} ${a.clientId.prenom}`.localeCompare(`${b.clientId.nom} ${b.clientId.prenom}`)
      case "montant": return b.montantTotal - a.montantTotal
      default: return 0
    }
  })

  const handleContratAdded = () => {
    fetchInitialData()
    toast.success("Contrat construction ajouté avec succès")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              Contrats Construction
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Gérez vos contrats de construction et suivez l'avancement des projets
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={fetchInitialData}
              variant="outline"
              size="lg"
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
            >
              <Icons.refresh className="mr-2 h-5 w-5" />
              Actualiser
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
              size="lg"
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Icons.plus className="mr-2 h-5 w-5" />
              Nouveau Contrat
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          {[
            { label: "Total", value: stats.total, color: "text-slate-800 dark:text-slate-100" },
            { label: "En cours", value: stats.enCours, color: "text-orange-600 dark:text-orange-400" },
            { label: "Terminés", value: stats.termines, color: "text-blue-600 dark:text-blue-400" },
            { label: "En attente", value: stats.enAttente, color: "text-amber-600 dark:text-amber-400" },
            { label: "Valeur totale", value: `$${stats.totalValue.toLocaleString()}`, color: "text-emerald-600 dark:text-emerald-400" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-5"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un contrat, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-48 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="résilié">Résilié</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-48 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="montant">Montant</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Icons.grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <Icons.list className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <Icons.spinner className="h-8 w-8 animate-spin text-orange-600 dark:text-orange-400" />
            </div>
          ) : displayContrats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Icons.hardHat className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-300">
                Aucun contrat construction
              </h3>
              <p className="text-slate-400 dark:text-slate-500">
                {searchQuery || statusFilter !== "all"
                  ? "Aucun résultat pour ces filtres."
                  : "Commencez par créer votre premier contrat construction."}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
                >
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Nouveau Contrat
                </Button>
              )}
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewMode}-${statusFilter}-${sortBy}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={
                    viewMode === "grid"
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
                    >
                      <ContratConstructionCard contrat={contrat} viewMode={viewMode} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {hasMore && (
                <div ref={observerTarget} className="flex justify-center items-center py-8 min-h-[100px]">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                      <Icons.spinner className="h-5 w-5 animate-spin" />
                      <span>Chargement...</span>
                    </div>
                  )}
                </div>
              )}
              {!hasMore && displayContrats.length > 0 && (
                <div className="flex justify-center items-center py-8">
                  <p className="text-slate-500 dark:text-gray-400 text-sm">
                    Tous les contrats ont été chargés ({displayContrats.length} au total)
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      <NewContratConstructionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onContratAdded={handleContratAdded}
        clients={clients}
        contratsTerrains={contratsTerrains}
      />
    </div>
  )
}
