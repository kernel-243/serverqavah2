"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import axios from "axios"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Download } from "lucide-react" 
import type { ComptabiliteRow } from "@/types/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Icons } from "@/components/icons"
import { toast } from "react-hot-toast"

type Status = "all" | "En cours" | "Terminé" | "En retard"

export default function ComptabilitePage() {
  const [data, setData] = useState<ComptabiliteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSessionExpired, setShowSessionExpired] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<Status>("all")
  const [exporting, setExporting] = useState(false)
  const router = useRouter()

  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  const fetchData = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true)
      setCurrentPage(1)
      setData([])
      setHasMore(true)
    }

    try {
      const token = localStorage.getItem("authToken")
      const pageToFetch = reset ? 1 : currentPage
      
      // Build query parameters
      const params = new URLSearchParams({
        page: pageToFetch.toString(),
        limit: '20'
      })
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      if (statusFilter && statusFilter !== "all") {
        params.append('status', statusFilter)
      }
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/comptabilite?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      const { data: comptabiliteData, pagination } = response.data
      
      if (reset) {
        setData(comptabiliteData || [])
        setCurrentPage(1)
      } else {
        setData((prev) => [...prev, ...comptabiliteData])
      }
      
      setHasMore(pagination.hasMore)
    } catch (error) {
      console.error("Error fetching comptabilite:", error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setShowSessionExpired(true)
        } else if (error.response?.status === 403) {
          toast.error("Vous n'avez pas la permission. Veuillez contacter votre administrateur.")
        } else {
          setError(error.response?.data?.message || "Une erreur s'est produite")
          toast.error("Échec du chargement des données. Veuillez réessayer.")
        }
      }
      if (reset) {
        setData([])
      }
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, statusFilter])

  const loadMoreData = useCallback(async () => {
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
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      if (statusFilter && statusFilter !== "all") {
        params.append('status', statusFilter)
      }
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/comptabilite?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const { data: comptabiliteData, pagination } = response.data
      
      setData((prev) => [...prev, ...comptabiliteData])
      setHasMore(pagination.hasMore)
      setCurrentPage(nextPage)
    } catch (error) {
      console.error("Error loading more data:", error)
      toast.error("Erreur lors du chargement des données supplémentaires")
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentPage, hasMore, isLoadingMore, searchTerm, statusFilter])

  // Initial fetch
  useEffect(() => {
    fetchData(true)
  }, [])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          loadMoreData()
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
  }, [hasMore, isLoadingMore, loading, loadMoreData])

  // Debounce search term and filters to avoid too many API calls
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      fetchData(true)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [searchTerm, statusFilter])

  const handleExport = async () => {
    try {
      setExporting(true)
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/comptabilite/export`, {
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
      link.setAttribute('download', `comptabilite-${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Exportation réussie")
    } catch (error) {
      console.error("Error exporting:", error)
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error("Vous n'avez pas la permission. Veuillez contacter votre administrateur.")
      } else {
        toast.error("Erreur lors de l'exportation")
      }
    } finally {
      setExporting(false)
    }
  }

  const getRowStatus = (row: ComptabiliteRow): Status => {
    if (row.totalRestant === 0) return "Terminé"
    if (row.echelons < row.nbMois) return "En retard"
    return "En cours"
  }

  const getStatusBadge = (row: ComptabiliteRow) => {
    const status = getRowStatus(row)
    switch (status) {
      case "En cours":
        return <Badge variant="default">En cours</Badge>
      case "Terminé":
        return (
          <Badge variant="default" className="bg-green-500">
            Terminé
          </Badge>
        )
      case "En retard":
        return <Badge variant="destructive">En retard</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleSessionExpired = () => {
    router.push("/auth/login")
  }

  if (loading && data.length === 0) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Comptabilité</h1>
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client, contrat ou terrain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as Status)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Terminé">Terminé</SelectItem>
                <SelectItem value="En retard">En retard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead className="text-right">Total payé</TableHead>
                <TableHead className="text-right">Total restant</TableHead>
                <TableHead className="text-right">Total terrain</TableHead>
                <TableHead className="text-center">Échéances payées</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucune donnée trouvée
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow key={`${row.contrat}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{row.client}</TableCell>
                    <TableCell>{row.contrat}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.totalPaye)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.totalRestant)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.totalTerrain)}</TableCell>
                    <TableCell className="text-center">{row.echelons}</TableCell>
                    <TableCell>{getStatusBadge(row)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Infinite scroll observer target and loading indicator */}
          <div ref={observerTarget} className="h-10 flex items-center justify-center py-4">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icons.spinner className="h-5 w-5 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showSessionExpired} onOpenChange={setShowSessionExpired}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session expirée</DialogTitle>
          </DialogHeader>
          <p>Votre session a expiré. Veuillez vous reconnecter.</p>
          <div className="flex justify-end">
            <Button onClick={handleSessionExpired}>Se reconnecter</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!error} onOpenChange={() => setError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erreur</DialogTitle>
          </DialogHeader>
          <p>{error}</p>
          <div className="flex justify-end">
            <Button onClick={() => setError(null)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
