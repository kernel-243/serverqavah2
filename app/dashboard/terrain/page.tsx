"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TerrainCard } from "@/components/terrain-card"
import { NewTerrainDialog } from "@/components/new-terrain-dialog"
import { Icons } from "@/components/icons"
import axios from "axios"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { LayoutGrid, CheckCircle2, XCircle, Clock, DollarSign, Layers } from "lucide-react"
import { SoldTerrainsWarning, type SoldTerrainEntry } from "@/components/sold-terrains-warning"
interface Terrain {
  _id: string
  numero: string
  disponible: boolean
  superficie: string
  pays: string
  ville: string
  commune: string
  prix: number
  cite: {
    _id: string
    nom: string
    ville: string
    commune: string
    pays: string
    province: string
    quartier: string
    numero: string
    reference: string
  }
  dimension: string
  province: string
  statut: "Disponible" | "Réservé" | "Vendu" | "Annulé" | "Cédé" | "En cours"
  reservation?: {
    dateReservation: Date
    dateDebut: Date
    dateFin: Date
    client?: {
      _id: string
      nom: string
      prenom: string
    }
    prospect?: {
      _id: string
      nom: string
      prenom: string
    }
  }
}

/** Liste des villes pour le filtre (alignée avec paramètres > cités et dashboard). */
const VILLES_OPTIONS = ["Kinshasa", "Kolwezi", "Muanda", "Autre"]

interface Cite {
  _id: string
  nom: string
  code: string
  ville?: string
  description?: string
  addBy?: {
    nom: string
  }
  createdAt?: string
}

interface Client {
  _id: string
  nom: string
  prenom: string
}

interface Prospect {
  _id: string
  nom: string
  prenom: string
}

interface TerrainStats {
  total: number
  disponible: number
  vendu: number
  reserve: number
  enCours: number
  annule: number
  cede: number
}

export default function TerrainPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("tous")
  const [villeFilter, setVilleFilter] = useState<string>("")
  const [citeFilter, setCiteFilter] = useState<string>("")
  const [terrains, setTerrains] = useState<Terrain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cites, setCites] = useState<Cite[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
  const [messageImportation, setMessageImportation] = useState<string>("")
  const [importResults, setImportResults] = useState<any[]>([])
  const [importSummary, setImportSummary] = useState<any>(null)
  const [isCardView, setIsCardView] = useState(true)
  const [terrainStats, setTerrainStats] = useState<TerrainStats | null>(null)
  const [soldWithoutContractCount, setSoldWithoutContractCount] = useState(0)
  const [soldWithoutContractTerrains, setSoldWithoutContractTerrains] = useState<SoldTerrainEntry[]>([])
  const [soldWithoutContractFullTerrains, setSoldWithoutContractFullTerrains] = useState<Terrain[]>([])
  const [isSoldWithoutContractModalOpen, setIsSoldWithoutContractModalOpen] = useState(false)
  const [updatingTerrainIds, setUpdatingTerrainIds] = useState<string[]>([])
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const router = useRouter()

  const fetchTerrainStats = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/terrain-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTerrainStats(response.data)
    } catch {
      // stats non critiques, ne pas bloquer l'interface
    }
  }

  const fetchSoldTerrainsWithoutContract = async () => {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return

      // Fetch all terrains with statut Vendu (limit large enough for typical usage)
      const terrainParams = new URLSearchParams({
        page: "1",
        limit: "2000",
        statut: "Vendu",
      })

      const [terrainsResponse, contratsResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/terrains?${terrainParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/fetch/all?page=1&limit=5000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const allTerrains: Terrain[] = terrainsResponse.data?.terrains ?? []
      // Ne considérer que les terrains avec statut "Vendu" (ignorer Disponible, Réservé, etc.)
      const soldTerrains = allTerrains.filter(
        (t) => t.statut && String(t.statut).toLowerCase() === "vendu"
      )
      const contrats = contratsResponse.data?.contrats ?? []

      if (!soldTerrains.length) {
        setSoldWithoutContractCount(0)
        setSoldWithoutContractTerrains([])
        setSoldWithoutContractFullTerrains([])
        return
      }

      const terrainNumsWithContract = new Set<string>()
      for (const contrat of contrats) {
        if (contrat?.terrainId?.numero) {
          terrainNumsWithContract.add(contrat.terrainId.numero)
        }
      }

      const problematicTerrains = soldTerrains.filter((terrain) => !terrainNumsWithContract.has(terrain.numero))

      setSoldWithoutContractCount(problematicTerrains.length)
      setSoldWithoutContractFullTerrains(problematicTerrains)
      setSoldWithoutContractTerrains(
        problematicTerrains.map((t) => ({
          _id: t._id,
          numero: t.numero,
          cite: {
            nom: t.cite?.nom,
            ville: t.cite?.ville,
            commune: t.cite?.commune,
          },
          prix: t.prix,
          statut: t.statut,
        })),
      )
    } catch (error) {
      console.error("Error checking sold terrains without contract:", error)
      // Non bloquant, donc pas de toast d'erreur global
    }
  }

  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  const fetchTerrains = async () => {
    setIsLoading(true)
    setCurrentPage(1)
    setTerrains([])
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
      if (statusFilter && statusFilter !== 'tous' && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (villeFilter.trim()) {
        params.append('ville', villeFilter.trim())
      }
      if (citeFilter.trim()) {
        params.append('citeId', citeFilter.trim())
      }
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/terrains?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setTerrains(response.data.terrains)
      setCites(response.data.cites || [])
      setClients(response.data.clients || [])
      setProspects(response.data.prospects || [])
      setHasMore(response.data.pagination?.hasMore || false)
      setCurrentPage(1)
    } catch (error) {
      console.error("Error fetching terrains:", error)
      toast.error("Impossible de récupérer les terrains. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreTerrains = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const token = localStorage.getItem("authToken")
      const nextPage = currentPage + 1
      
      // Build query parameters with filters
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: '20'
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (statusFilter && statusFilter !== 'tous' && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (villeFilter.trim()) {
        params.append('ville', villeFilter.trim())
      }
      if (citeFilter.trim()) {
        params.append('citeId', citeFilter.trim())
      }
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/terrains?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const { terrains: terrainsData, pagination } = response.data
      
      setTerrains((prev) => [...prev, ...terrainsData])
      setHasMore(pagination.hasMore)
      setCurrentPage(nextPage)
    } catch (error) {
      console.error("Error loading more terrains:", error)
      toast.error("Erreur lors du chargement des terrains supplémentaires")
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentPage, hasMore, isLoadingMore, searchQuery, statusFilter, villeFilter, citeFilter])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMoreTerrains()
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
  }, [hasMore, isLoadingMore, isLoading, loadMoreTerrains])

  useEffect(() => {
    fetchTerrains()
    fetchTerrainStats()
    fetchSoldTerrainsWithoutContract()
  }, [])

  // Debounce search term and status filter to avoid too many API calls
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      fetchTerrains()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter, villeFilter, citeFilter])

  const filteredTerrains = terrains
  // Note: Search, status, ville and cite filters are handled server-side

  // Cités filtrées par ville sélectionnée (pour le dropdown cité)
  const citesFilteredByVille = useMemo(() => {
    if (!villeFilter.trim()) return cites
    const v = villeFilter.trim()
    return cites.filter((c) => c.ville && c.ville.toLowerCase() === v.toLowerCase())
  }, [cites, villeFilter])

  const resetAllFilters = () => {
    setStatusFilter("tous")
    setVilleFilter("")
    setCiteFilter("")
  }

  const hasActiveFilters = statusFilter !== "tous" || !!villeFilter.trim() || !!citeFilter.trim()


  const handleAddTerrain = () => {
    setIsDialogOpen(true)
  }

  const handleTerrainUpdated = () => {
    // Reset pagination and fetch fresh data
    setCurrentPage(1)
    setTerrains([])
    setHasMore(true)
    fetchTerrains()
    fetchTerrainStats()
    fetchSoldTerrainsWithoutContract()
  }

  const handleMakeTerrainAvailable = async (terrainId: string) => {
    const terrain = soldWithoutContractFullTerrains.find((t) => t._id === terrainId)
    if (!terrain) return

    setUpdatingTerrainIds((prev) => [...prev, terrainId])
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return

      const updatedTerrain = {
        ...terrain,
        disponible: true,
        statut: "Disponible" as Terrain["statut"],
      }

      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/terrains/${terrainId}`, updatedTerrain, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      toast.success(`Le terrain ${terrain.numero} est maintenant disponible.`)

      // Mettre à jour les listes locales pour que l'UI réagisse immédiatement
      setSoldWithoutContractFullTerrains((prev) => prev.filter((t) => t._id !== terrainId))
      setSoldWithoutContractTerrains((prev) => prev.filter((t) => t._id !== terrainId))
      setSoldWithoutContractCount((prev) => Math.max(0, prev - 1))

      // Rafraîchir les listes / stats globales
      handleTerrainUpdated()
    } catch (error) {
      console.error("Error updating terrain status:", error)
      toast.error("Impossible de mettre ce terrain en disponible. Veuillez réessayer.")
    } finally {
      setUpdatingTerrainIds((prev) => prev.filter((id) => id !== terrainId))
    }
  }

  const handleMakeAllTerrainsAvailable = async () => {
    if (!soldWithoutContractFullTerrains.length) return

    setIsBulkUpdating(true)
    setUpdatingTerrainIds(soldWithoutContractFullTerrains.map((t) => t._id))
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return

      await Promise.all(
        soldWithoutContractFullTerrains.map((terrain) => {
          const updatedTerrain = {
            ...terrain,
            disponible: true,
            statut: "Disponible" as Terrain["statut"],
          }

          return axios.put(`${process.env.NEXT_PUBLIC_API_URL}/terrains/${terrain._id}`, updatedTerrain, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
        }),
      )

      toast.success("Tous les terrains sélectionnés ont été mis en disponible.")
      setSoldWithoutContractFullTerrains([])
      setSoldWithoutContractTerrains([])
      setSoldWithoutContractCount(0)
      handleTerrainUpdated()
      setIsSoldWithoutContractModalOpen(false)
    } catch (error) {
      console.error("Error updating all terrain statuses:", error)
      toast.error("Impossible de mettre tous les terrains en disponible. Veuillez réessayer.")
    } finally {
      setIsBulkUpdating(false)
      setUpdatingTerrainIds([])
    }
  }

  const handleImportTerrains = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const toastId = toast.loading("Importation des terrains en cours...");
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/terrains/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200) {
        // Stocker les résultats détaillés
        if (response.data.results) {
          setImportResults(response.data.results);
        }
        if (response.data.summary) {
          setImportSummary(response.data.summary);
        }
        
        // Générer le message de résumé
        const summary = response.data.summary || { success: response.data.nbTerrains || 0, errors: 0 };
        const message = summary.success > 0 
          ? `${summary.success} terrain${summary.success > 1 ? 's' : ''} importé${summary.success > 1 ? 's' : ''} avec succès${summary.errors > 0 ? `, ${summary.errors} erreur${summary.errors > 1 ? 's' : ''}` : ''}`
          : `Aucun terrain importé. ${summary.errors} erreur${summary.errors > 1 ? 's' : ''} rencontrée${summary.errors > 1 ? 's' : ''}`;
        
        setMessageImportation(message);
        setIsSuccessDialogOpen(true);
        
        if (summary.success > 0) {
          toast.success(message, { id: toastId, duration: 5000 });
        } else {
          toast.error(message, { id: toastId, duration: 5000 });
        }
        
        fetchTerrains(); // Refresh the terrain list
      }
    } catch (error) {
      console.error("Error importing terrains:", error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error("Vous n'avez pas la permission d'effectuer cette action, veuillez contacter votre administrateur", { id: toastId });
      } else {
        toast.error("Échec de l'importation des terrains. Veuillez réessayer.", { id: toastId });
      }
    } finally {
      setIsLoading(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleTerrainClick = (terrainId: string) => {
    router.push(`/dashboard/terrain/${terrainId}`)
  }

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      {terrainStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Total",
              value: terrainStats.total,
              icon: Layers,
              colorBg: "bg-slate-50 dark:bg-slate-800/60",
              colorBorder: "border-slate-200 dark:border-slate-700",
              colorIcon: "text-slate-600 dark:text-slate-400",
              colorValue: "text-slate-800 dark:text-slate-100",
            },
            {
              label: "Disponible",
              value: terrainStats.disponible,
              icon: CheckCircle2,
              colorBg: "bg-green-50 dark:bg-green-900/20",
              colorBorder: "border-green-200 dark:border-green-800",
              colorIcon: "text-green-600",
              colorValue: "text-green-700 dark:text-green-400",
            },
            {
              label: "Vendu",
              value: terrainStats.vendu,
              icon: DollarSign,
              colorBg: "bg-blue-50 dark:bg-blue-900/20",
              colorBorder: "border-blue-200 dark:border-blue-800",
              colorIcon: "text-blue-600",
              colorValue: "text-blue-700 dark:text-blue-400",
            },
            {
              label: "Réservé",
              value: terrainStats.reserve,
              icon: Clock,
              colorBg: "bg-amber-50 dark:bg-amber-900/20",
              colorBorder: "border-amber-200 dark:border-amber-800",
              colorIcon: "text-amber-600",
              colorValue: "text-amber-700 dark:text-amber-400",
            },
            {
              label: "En cours",
              value: terrainStats.enCours,
              icon: LayoutGrid,
              colorBg: "bg-purple-50 dark:bg-purple-900/20",
              colorBorder: "border-purple-200 dark:border-purple-800",
              colorIcon: "text-purple-600",
              colorValue: "text-purple-700 dark:text-purple-400",
            },
            {
              label: "Annulé / Cédé",
              value: terrainStats.annule + terrainStats.cede,
              icon: XCircle,
              colorBg: "bg-red-50 dark:bg-red-900/20",
              colorBorder: "border-red-200 dark:border-red-800",
              colorIcon: "text-red-500",
              colorValue: "text-red-600 dark:text-red-400",
            },
          ].map((stat) => (
            <Card key={stat.label} className={`border ${stat.colorBorder} ${stat.colorBg} shadow-sm`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <stat.icon className={`h-4 w-4 ${stat.colorIcon}`} />
                </div>
                <div className={`text-2xl font-bold ${stat.colorValue}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SoldTerrainsWarning
        count={soldWithoutContractCount}
        terrains={soldWithoutContractTerrains}
        open={isSoldWithoutContractModalOpen}
        onOpenChange={setIsSoldWithoutContractModalOpen}
        onMakeAvailable={handleMakeTerrainAvailable}
        onMakeAllAvailable={handleMakeAllTerrainsAvailable}
        updatingIds={updatingTerrainIds}
        isBulkUpdating={isBulkUpdating}
      />

      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Terrains <span className="text-sm text-gray-500">({filteredTerrains.length})</span></h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Rechercher un terrain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          {/* Quelques filtres visibles : ville, cité */}
          <Select
            value={villeFilter || "toutes"}
            onValueChange={(v) => {
              const newVille = v === "toutes" ? "" : v
              setVilleFilter(newVille)
              // Reset cité if it no longer belongs to the new ville
              if (citeFilter && newVille) {
                const cite = cites.find((c) => c._id === citeFilter)
                if (cite?.ville && cite.ville.toLowerCase() !== newVille.toLowerCase()) setCiteFilter("")
              }
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrer par ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les villes</SelectItem>
              {VILLES_OPTIONS.map((ville) => (
                <SelectItem key={ville} value={ville}>{ville}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={citeFilter || "toutes"}
            onValueChange={(v) => setCiteFilter(v === "toutes" ? "" : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par cité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les cités</SelectItem>
              {citesFilteredByVille.map((cite) => (
                <SelectItem key={cite._id} value={cite._id}>
                  {cite.nom}{cite.ville ? ` (${cite.ville})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Bouton icône pour afficher tout le filtre */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={hasActiveFilters ? "border-primary bg-primary/10" : ""}
                aria-label="Afficher tous les filtres"
              >
                <Icons.filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <p className="font-medium text-sm">Tous les filtres</p>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Statut</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous les statuts</SelectItem>
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="Réservé">Réservé</SelectItem>
                      <SelectItem value="vendu">Vendu</SelectItem>
                      <SelectItem value="Annulé">Annulé</SelectItem>
                      <SelectItem value="Cédé">Cédé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Ville</Label>
                  <Select
                    value={villeFilter || "toutes"}
                    onValueChange={(v) => {
                      const newVille = v === "toutes" ? "" : v
                      setVilleFilter(newVille)
                      if (citeFilter && newVille) {
                        const cite = cites.find((c) => c._id === citeFilter)
                        if (cite?.ville && cite.ville.toLowerCase() !== newVille.toLowerCase()) setCiteFilter("")
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Ville" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="toutes">Toutes les villes</SelectItem>
                      {VILLES_OPTIONS.map((ville) => (
                        <SelectItem key={ville} value={ville}>{ville}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cité</Label>
                  <Select value={citeFilter || "toutes"} onValueChange={(v) => setCiteFilter(v === "toutes" ? "" : v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Cité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="toutes">Toutes les cités</SelectItem>
                      {citesFilteredByVille.map((cite) => (
                        <SelectItem key={cite._id} value={cite._id}>
                          {cite.nom}{cite.ville ? ` (${cite.ville})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={resetAllFilters}>
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <span className="cursor-pointer text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md bg-gray-100 flex items-center justify-center" onClick={() => setIsCardView(!isCardView)}>
            {isCardView ? <Icons.list className="mr-2 h-4 w-4" /> : <Icons.grid className="mr-2 h-4 w-4" />}
          </span>
          <Button onClick={handleAddTerrain}>Ajouter un terrain</Button>
          <Button onClick={() => document.getElementById("fileInput")?.click()}>
            <Icons.upload className="mr-2 h-4 w-4" />
            Importer des terrains
          </Button>
          
          <input
            id="fileInput"
            type="file"
            accept=".xlsx"
            style={{ display: "none" }}
            onChange={handleImportTerrains}
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Icons.spinner className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredTerrains.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">Aucun terrain enregistré</div>
      ) : isCardView ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTerrains.map((terrain) => (
              <TerrainCard key={terrain._id} terrain={terrain} cites={cites} clients={clients} prospects={prospects} onTerrainUpdated={handleTerrainUpdated} />
            ))}
          </div>
          
          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={observerTarget} className="flex justify-center items-center py-8">
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Icons.spinner className="h-5 w-5 animate-spin" />
                  <span>Chargement des terrains...</span>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Numéro</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Ville</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Commune</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Cité</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Statut</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Prix</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredTerrains].reverse().map((terrain, index) => (
                <tr key={terrain._id} className={index % 2 === 0 ? "bg-white dark:bg-gray-800 cursor-pointer" : "bg-gray-50 dark:bg-gray-700 cursor-pointer"} onClick={() => handleTerrainClick(terrain._id)}>
                  <td className="py-3 px-4 border-b border-gray-200">{terrain.numero}</td>
                  <td className="py-3 px-4 border-b border-gray-200">{terrain.cite.ville || "-"}</td>
                  <td className="py-3 px-4 border-b border-gray-200">{terrain.cite.commune || "-"}</td>
                  <td className="py-3 px-4 border-b border-gray-200">{terrain.cite.nom || "-"}</td>
                  <td className={`py-3 px-4 border-b border-gray-200 ${terrain.statut.toLocaleLowerCase() === "disponible" ? "bg-green-100" : terrain.statut.toLocaleLowerCase() === "réservé" ? "bg-yellow-100" : terrain.statut.toLocaleLowerCase() === "en cours" ? "bg-orange-100" : terrain.statut.toLocaleLowerCase() === "vendu" ? "bg-blue-100" : terrain.statut.toLocaleLowerCase() === "annulé" ? "bg-red-300" : terrain.statut.toLocaleLowerCase() === "cédé" ? "bg-purple-100" : "bg-gray-100"}`}>
                    {terrain.statut || "-"}
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200">${terrain.prix ? terrain.prix.toLocaleString() : "0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={observerTarget} className="flex justify-center items-center py-8">
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Icons.spinner className="h-5 w-5 animate-spin" />
                  <span>Chargement des terrains...</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <NewTerrainDialog open={isDialogOpen} cites={cites as { _id: string; nom: string; code: string }[]} onOpenChange={setIsDialogOpen} onTerrainAdded={fetchTerrains} />
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Résultats de l'importation</DialogTitle>
            <DialogDescription>
              {importSummary && (
                <div className="flex gap-4 mt-2">
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-semibold">
                    Total: {importSummary.total}
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm font-semibold">
                    ✓ Succès: {importSummary.success}
                  </div>
                  <div className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-semibold">
                    ✗ Erreurs: {importSummary.errors}
                  </div>
                  {importSummary.skipped > 0 && (
                    <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-semibold">
                      Ignorés: {importSummary.skipped}
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto mt-4">
            {importResults.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-6 gap-2 font-semibold text-sm text-gray-700 dark:text-gray-300 pb-2 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                  <div>Ligne</div>
                  <div>Numéro</div>
                  <div>Cité</div>
                  <div>Statut</div>
                  <div className="col-span-2">Message</div>
                </div>
                {importResults.map((result, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-6 gap-2 p-2 rounded-md text-sm ${
                      result.status === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : result.status === 'error'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{result.rowNumber}</div>
                    <div>{result.numero || '-'}</div>
                    <div>{result.cite || '-'}</div>
                    <div>
                      {result.status === 'success' ? (
                        <span className="text-green-600 font-semibold">✓ Succès</span>
                      ) : result.status === 'error' ? (
                        <span className="text-red-600 font-semibold">✗ Erreur</span>
                      ) : (
                        <span className="text-gray-600">⏳ En attente</span>
                      )}
                    </div>
                    <div className="col-span-2 text-xs">
                      {result.message || '-'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>{messageImportation || "Aucun résultat disponible"}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button onClick={() => {
              setIsSuccessDialogOpen(false);
              setImportResults([]);
              setImportSummary(null);
            }}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
