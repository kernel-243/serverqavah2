"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Icons } from "@/components/icons"
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
import { EditClientDialog } from "@/components/edit-client-dialog"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Pencil, Trash2, FileDown, Upload, Search, Filter, Plus, Users, Eye, MoreHorizontal, UserCheck, SlidersHorizontal } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { devLog } from "@/lib/devLogger"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Client {
  _id: string
  code: string
  nom: string
  postnom: string
  prenom: string
  telephone: string
  email: string
  pays: string
  ville: string
  numero: string
  adresse: string | null
  indicatif?: string | null
  statut: string
  contratCount: number
  type?: string
  parrain?: any
  parrainDetails?: any
  commercialAttritre?: {
    _id: string
    nom: string
    prenom: string
  }
  commercialAttritreName?: string
  /** Mot de passe espace client / app initialisé (renvoyé par l’API, sans hash) */
  clientAppPasswordInitialized?: boolean
}

import { CountryCodeFilterSelect } from "@/components/country-code-filter-select"
import { InvalidEmailsWarning, type InvalidEmailEntry } from "@/components/invalid-emails-warning"
import { InvalidPhonesWarning, type InvalidPhoneEntry } from "@/components/invalid-phones-warning"

export default function ClientsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [parrainFilter, setParrainFilter] = useState<"all" | "with" | "without">("all")
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [commercialFilter, setCommercialFilter] = useState<string>("all")
  const [villeFilter, setVilleFilter] = useState<string>("all")
  const [indicatifFilter, setIndicatifFilter] = useState<string>("all")
  /** Espace client (app) : filtre sur mot de passe initialisé */
  const [espaceClientMdpFilter, setEspaceClientMdpFilter] = useState<"all" | "initialized" | "not_initialized">("all")
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false)
  const [isSessionExpiredDialogOpen, setIsSessionExpiredDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResponseMessage, setImportResponseMessage] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [commercials, setCommercials] = useState<{ _id: string; nom: string; prenom: string }[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedCommercial, setSelectedCommercial] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [clientParrainCount, setClientParrainCount] = useState<number>(0)
  const [invalidEmailsCount, setInvalidEmailsCount] = useState(0)
  const [invalidEmailsList, setInvalidEmailsList] = useState<InvalidEmailEntry[]>([])
  const [showInvalidEmailsModal, setShowInvalidEmailsModal] = useState(false)
  const [invalidPhonesCount, setInvalidPhonesCount] = useState(0)
  const [invalidPhonesList, setInvalidPhonesList] = useState<InvalidPhoneEntry[]>([])
  const [showInvalidPhonesModal, setShowInvalidPhonesModal] = useState(false)

  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.data && response.data.role) {
        setCurrentUserRole(response.data.role)
      }
    } catch (error) {
      devLog.error("Error fetching current user:", error)
    }
  }

  const fetchCommercials = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.data && Array.isArray(response.data)) {
        setCommercials(response.data)
      }
    } catch (error) {
      devLog.error("Error fetching commercials:", error)
    }
  }

  const fetchInvalidClientEmails = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken")
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/invalid-emails`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.data?.success && res.data?.emails) {
        setInvalidEmailsCount(res.data.count ?? 0)
        setInvalidEmailsList(res.data.emails ?? [])
      }
    } catch {
      // ignore, non-blocking
    }
  }, [])

  const fetchInvalidClientPhones = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken")
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/invalid-phones`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.data?.success && res.data?.phones) {
        setInvalidPhonesCount(res.data.count ?? 0)
        setInvalidPhonesList(res.data.phones ?? [])
      }
    } catch {
      // ignore, non-blocking
    }
  }, [])

  useEffect(() => {
    fetchClients()
    fetchCurrentUser()
    fetchCommercials()
    fetchInvalidClientEmails()
    fetchInvalidClientPhones()
  }, [fetchInvalidClientEmails, fetchInvalidClientPhones])

  const loadMoreClients = useCallback(async () => {
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
      if (statusFilter && statusFilter !== 'tout' && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (parrainFilter === 'with') {
        params.append('parrainStatus', 'with')
      } else if (parrainFilter === 'without') {
        params.append('parrainStatus', 'without')
      }
      if (commercialFilter && commercialFilter !== 'all') {
        params.append('commercialAttritre', commercialFilter)
      }
      if (villeFilter && villeFilter !== 'all') {
        params.append('ville', villeFilter)
      }
      if (indicatifFilter && indicatifFilter !== 'all') {
        params.append('indicatif', indicatifFilter)
      }
      if (espaceClientMdpFilter && espaceClientMdpFilter !== "all") {
        params.append("espaceClientMdp", espaceClientMdpFilter)
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/clients?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const { clients: clientsData, pagination } = response.data
      
      setClients((prev) => [...prev, ...clientsData])
      setHasMore(pagination.hasMore)
      setCurrentPage(nextPage)
    } catch (error) {
      devLog.error("Error loading more clients:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleSessionExpired()
        return
      }
      toast.error("Erreur lors du chargement des clients supplémentaires")
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentPage, hasMore, isLoadingMore, searchQuery, statusFilter, parrainFilter, commercialFilter, villeFilter, indicatifFilter, espaceClientMdpFilter])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMoreClients()
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
  }, [hasMore, isLoadingMore, isLoading, loadMoreClients])

  const handleSessionExpired = () => {
    setIsSessionExpiredDialogOpen(true)
  }

  const handleRedirectToLogin = () => {
    localStorage.removeItem("authToken")
    router.push("/auth/login")
  }

  const fetchClients = async () => {
    setIsLoading(true)
    setCurrentPage(1)
    setClients([])
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
      if (statusFilter && statusFilter !== 'tout' && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (parrainFilter === 'with') {
        params.append('parrainStatus', 'with')
      } else if (parrainFilter === 'without') {
        params.append('parrainStatus', 'without')
      }
      if (commercialFilter && commercialFilter !== 'all') {
        params.append('commercialAttritre', commercialFilter)
      }
      if (villeFilter && villeFilter !== 'all') {
        params.append('ville', villeFilter)
      }
      if (indicatifFilter && indicatifFilter !== 'all') {
        params.append('indicatif', indicatifFilter)
      }
      if (espaceClientMdpFilter && espaceClientMdpFilter !== "all") {
        params.append("espaceClientMdp", espaceClientMdpFilter)
      }

      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      devLog.log("Clients data fetched successfully:", response.data)
      const { clients: clientsData, pagination } = response.data
      setClients(clientsData)
      setClientParrainCount(response.data.nbClientParrain)
      setHasMore(pagination.hasMore)
      setCurrentPage(1)
    } catch (error) {
      devLog.error("Error fetching clients:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleSessionExpired()
        return
      }
      toast.error("Échec de la récupération des clients. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // Debounce search term and status filter to avoid too many API calls
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      fetchClients()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter, parrainFilter, commercialFilter, villeFilter, indicatifFilter, espaceClientMdpFilter])

  const filteredClients = clients.filter((client) => {
    // Note: Search, status and parrain filters are handled server-side.
    // Ici on filtre uniquement les copropriétaires côté client.
    const isNotCoproprietaire = client.type !== "coproprietaire"
    return isNotCoproprietaire
  })

  const handleAddClient = () => {
    router.push("/dashboard/clients/new-client")
  }

  const handleEditClient = (id: string) => {
    router.push(`/dashboard/clients/edit/${id}`)
  }

  const handleDeleteClient = (id: string) => {
    setClientToDelete(id)
    setIsAlertDialogOpen(true)
  }

  const confirmDeleteClient = async () => {
    if (clientToDelete) {
      const toastId = toast.loading("Suppression du client...")
      try {
        const token = localStorage.getItem("authToken")
        const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/clients/${clientToDelete}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        devLog.log("Client deleted successfully:", response.data)
        setClients(clients.filter((client) => client._id !== clientToDelete))
        toast.success("Client supprimé avec succès.", { id: toastId })
      } catch (error) {
        devLog.error("Error deleting client:", error)
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          handleSessionExpired()
          return
        }
        toast.error("Échec de la suppression du client. Veuillez réessayer.", { id: toastId })
      } finally {
        setIsAlertDialogOpen(false)
        setClientToDelete(null)
      }
    }
  }

  const handleClientUpdated = () => {
    // Reset pagination and fetch fresh data
    setCurrentPage(1)
    setClients([])
    setHasMore(true)
    fetchClients()
  }

  const handleRowClick = (clientId: string) => {
    router.push(`/dashboard/clients/detail/${clientId}`)
  }

  const handleSelectClient = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    )
  }

  const handleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(filteredClients.map((c) => c._id))
    }
  }

  const handleAssignClients = async () => {
    if (selectedClients.length === 0) {
      toast.error("Veuillez sélectionner au moins un client")
      return
    }
    if (!selectedCommercial) {
      toast.error("Veuillez sélectionner un commercial")
      return
    }

    // Check if any selected clients are already assigned
    const alreadyAssignedClients = filteredClients.filter(
      (c) => selectedClients.includes(c._id) && c.commercialAttritre
    )

    if (alreadyAssignedClients.length > 0) {
      toast.error(
        `${alreadyAssignedClients.length} client(s) sont déjà affecté(s) à un commercial. Veuillez les désélectionner.`,
        { duration: 5000 }
      )
      return
    }

    try {
      setIsAssigning(true)
      const token = localStorage.getItem("authToken")
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/clients/assign`,
        {
          clientIds: selectedClients,
          commercialId: selectedCommercial
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      toast.success(`${selectedClients.length} client(s) affecté(s) avec succès`)
      setIsAssignDialogOpen(false)
      setSelectedClients([])
      setSelectedCommercial("")
      fetchClients()
    } catch (error) {
      console.error("Error assigning clients:", error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Erreur lors de l'affectation")
      } else {
        toast.error("Une erreur est survenue")
      }
    } finally {
      setIsAssigning(false)
    }
  }

  const handleExportToExcel = async () => {
    setIsExporting(true)
    const toastId = toast.loading("Exportation des clients...")
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `clients_export_${new Date().toISOString().split("T")[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      toast.success("Liste des clients exportée avec succès.", { id: toastId })
    } catch (error) {
      devLog.error("Error exporting clients:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleSessionExpired()
        return
      }
      toast.error("Échec de l'exportation des clients. Veuillez réessayer.", { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
      setIsImportDialogOpen(true)
    }
  }

  const confirmImportClients = async () => {
    if (!importFile) return

    setIsImporting(true)
    const toastId = toast.loading("Importation des clients...")
    const formData = new FormData()
    formData.append("file", importFile)

    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/clients/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
      devLog.log("Importation des clients:", response.data)

      if (response.status === 200) {
        let message = response.data.clients.length > 0 ? response.data.errors.length > 0 ? `${response.data.clients.length} Client${response.data.clients.length > 1 ? 's' : ''} importés avec succès.` : `${response.data.clients.length} Client${response.data.clients.length > 1 ? 's' : ''} importés avec succès.` : "Aucun client importé"
        if (response.data.errors.length > 0) {
          message += `\nDes erreurs ont été rencontrées: \n${response.data.errors.map((error: any) => error).join("\n")}`
        }
        setImportResponseMessage(message)
        fetchClients()
      } else {
        setImportResponseMessage("Échec de l'importation des clients. Veuillez réessayer.")
      }
    } catch (error) {
      devLog.error("Error importing clients:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleSessionExpired()
        return
      }
      setImportResponseMessage("Échec de l'importation des clients. Veuillez réessayer.")
    } finally {
      setIsImporting(false)
      setIsImportDialogOpen(false)
      toast.dismiss(toastId)
    }
  }

  const activeClientsCount = clients.filter((client) => client.statut === 'active').length
  const totalClientsCount = clients.length
  const hasParrain = (c: Client) =>
    (c.parrain && typeof c.parrain === 'object' && (c.parrain._id || c.parrain.nom)) ||
    (c.parrainDetails && typeof c.parrainDetails === 'object')
  const clientsParrainesCount = filteredClients.filter(hasParrain).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
              Gestion des Clients
            </h1>
            <p className="text-slate-600 dark:text-gray-400 text-lg">
              Gérez vos clients et leurs informations de manière efficace
            </p>
          </div>
          
          {/* Stats Cards */}
          <div className="flex gap-4">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-gray-400">Clients Actifs</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">{activeClientsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-gray-400">Total Clients</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">{totalClientsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <UserCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-gray-400">Clients parrainés</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">{clientParrainCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Invalid emails warning */}
        <InvalidEmailsWarning
          count={invalidEmailsCount}
          emails={invalidEmailsList}
          entityLabel="clients"
          open={showInvalidEmailsModal}
          onOpenChange={setShowInvalidEmailsModal}
        />

        {/* Invalid phones warning */}
        <InvalidPhonesWarning
          count={invalidPhonesCount}
          phones={invalidPhonesList}
          entityLabel="clients"
          open={showInvalidPhonesModal}
          onOpenChange={setShowInvalidPhonesModal}
        />

        {/* Actions Bar */}
        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 dark:border-gray-700 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search and Filters */}
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500" />
                    <Input
                      placeholder="Rechercher un client..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-xl dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  </div>
                  {/* Statut filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-xl dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                        <SelectValue placeholder="Filtrer par statut" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 shadow-xl rounded-xl">
                      <SelectItem value="active" className="py-3 px-4 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer rounded-lg dark:text-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Clients Actifs</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="supprimer" className="py-3 px-4 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer rounded-lg dark:text-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span>Clients Supprimés</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tout" className="py-3 px-4 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer rounded-lg dark:text-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-gray-500" />
                          <span>Tous les Clients</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Toggle all filters */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAllFilters((v) => !v)}
                    className={`shrink-0 h-10 w-10 rounded-xl bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 ${showAllFilters ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-500 text-blue-700 dark:text-blue-400" : "dark:text-gray-400"}`}
                    title={showAllFilters ? "Masquer les filtres" : "Afficher tous les filtres"}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                {/* All filters (Parrain, Commercial, Ville) - visible when icon clicked */}
                {showAllFilters && (
                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 dark:border-gray-700">
                    <Select value={parrainFilter} onValueChange={(v) => setParrainFilter(v as "all" | "with" | "without")}>
                      <SelectTrigger className="w-full sm:w-[220px] bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-xl dark:text-gray-100">
                        <SelectValue placeholder="Parrainage" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 shadow-xl rounded-xl">
                        <SelectItem value="all" className="dark:text-gray-100 dark:hover:bg-gray-700">Tous (parrainés ou non)</SelectItem>
                        <SelectItem value="with" className="dark:text-gray-100 dark:hover:bg-gray-700">Clients parrainés</SelectItem>
                        <SelectItem value="without" className="dark:text-gray-100 dark:hover:bg-gray-700">Clients non parrainés</SelectItem>
                      </SelectContent>
                    </Select>
                    {currentUserRole?.toLowerCase() === "admin" && (
                      <Select value={commercialFilter} onValueChange={setCommercialFilter}>
                        <SelectTrigger className="w-full sm:w-[220px] bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-xl dark:text-gray-100">
                          <SelectValue placeholder="Commercial affecté" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 shadow-xl rounded-xl">
                          <SelectItem value="all" className="dark:text-gray-100 dark:hover:bg-gray-700">Tous les commerciaux</SelectItem>
                          {commercials.map((c) => (
                            <SelectItem key={c._id} value={c._id} className="dark:text-gray-100 dark:hover:bg-gray-700">
                              {c.prenom} {c.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Select value={villeFilter} onValueChange={setVilleFilter}>
                      <SelectTrigger className="w-full sm:w-[200px] bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-xl dark:text-gray-100">
                        <SelectValue placeholder="Ville" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 shadow-xl rounded-xl">
                        <SelectItem value="all" className="dark:text-gray-100 dark:hover:bg-gray-700">Toutes les villes</SelectItem>
                        <SelectItem value="Kinshasa" className="dark:text-gray-100 dark:hover:bg-gray-700">Kinshasa</SelectItem>
                        <SelectItem value="Lubumbashi" className="dark:text-gray-100 dark:hover:bg-gray-700">Lubumbashi</SelectItem>
                        <SelectItem value="Kolwezi" className="dark:text-gray-100 dark:hover:bg-gray-700">Kolwezi</SelectItem>
                        <SelectItem value="Goma" className="dark:text-gray-100 dark:hover:bg-gray-700">Goma</SelectItem>
                        <SelectItem value="Mbuji-Mayi" className="dark:text-gray-100 dark:hover:bg-gray-700">Mbuji-Mayi</SelectItem>
                        <SelectItem value="Bukavu" className="dark:text-gray-100 dark:hover:bg-gray-700">Bukavu</SelectItem>
                        <SelectItem value="Matadi" className="dark:text-gray-100 dark:hover:bg-gray-700">Matadi</SelectItem>
                        <SelectItem value="Likasi" className="dark:text-gray-100 dark:hover:bg-gray-700">Likasi</SelectItem>
                      </SelectContent>
                    </Select>
                    <CountryCodeFilterSelect
                      value={indicatifFilter}
                      onValueChange={setIndicatifFilter}
                      placeholder="Code pays"
                      triggerClassName="w-full sm:w-[200px] bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-xl dark:text-gray-100"
                      contentClassName="bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 shadow-xl rounded-xl max-h-[320px] overflow-y-auto"
                    />
                    <Select
                      value={espaceClientMdpFilter}
                      onValueChange={(v) => setEspaceClientMdpFilter(v as "all" | "initialized" | "not_initialized")}
                    >
                      <SelectTrigger className="w-full sm:w-[280px] bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-xl dark:text-gray-100">
                        <SelectValue placeholder="Espace client (app)" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 shadow-xl rounded-xl">
                        <SelectItem value="all" className="dark:text-gray-100 dark:hover:bg-gray-700">
                          Tous (espace client)
                        </SelectItem>
                        <SelectItem value="initialized" className="dark:text-gray-100 dark:hover:bg-gray-700">
                          App client — mot de passe initialisé
                        </SelectItem>
                        <SelectItem value="not_initialized" className="dark:text-gray-100 dark:hover:bg-gray-700">
                          App client — mot de passe non initialisé
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {currentUserRole?.toLowerCase() === 'admin' && selectedClients.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(true)}
                    className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 hover:border-purple-500 dark:hover:border-purple-400 text-slate-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 rounded-xl transition-all duration-200"
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Affecter ({selectedClients.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleExportToExcel}
                  disabled={isExporting || isLoading || clients.length === 0}
                  className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-400 text-slate-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 rounded-xl transition-all duration-200"
                >
                  {isExporting ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Exporter
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("fileInput")?.click()}
                  className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 hover:border-green-500 dark:hover:border-green-400 text-slate-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 rounded-xl transition-all duration-200"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Importer
                </Button>
                
                <Button 
                  onClick={handleAddClient} 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Client
                </Button>
                
                <input
                  id="fileInput"
                  type="file"
                  accept=".xlsx"
                  style={{ display: "none" }}
                  onChange={handleFileInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Area */}
        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 dark:border-gray-700 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-96">
                <div className="text-center space-y-4">
                  <Icons.spinner className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
                  <p className="text-slate-600 dark:text-gray-400 text-lg">Chargement des clients...</p>
                </div>
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="p-6 bg-slate-100 dark:bg-gray-700 rounded-full mb-6">
                  <Users className="h-16 w-16 text-slate-400 dark:text-gray-500" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-700 dark:text-gray-300 mb-2">Aucun client trouvé</h3>
                <p className="text-slate-500 dark:text-gray-400 text-center max-w-md mb-6">
                  Commencez par ajouter votre premier client pour gérer vos relations commerciales.
                </p>
                <Button 
                  onClick={handleAddClient}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un Client
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-gray-700/50 hover:bg-slate-50/80 dark:hover:bg-gray-700/50 border-0">
                      {currentUserRole?.toLowerCase() === 'admin' && (
                        <TableHead className="font-semibold text-slate-700 dark:text-gray-300 py-4 px-6 w-12">
                          <Checkbox
                            checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead className="font-semibold text-slate-700 dark:text-gray-300 py-4 px-6">Client</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-gray-300 py-4 px-6">Contact</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-gray-300 py-4 px-6">Localisation</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-gray-300 py-4 px-6">Commercial</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-gray-300 py-4 px-6">Contrats</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-gray-300 py-4 px-6">Statut</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-gray-300 py-4 px-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...filteredClients].reverse().map((client) => (
                      <TableRow
                        key={client._id}
                        className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200 border-0 dark:border-gray-700"
                        onClick={() => handleRowClick(client._id)}
                      >
                        {currentUserRole?.toLowerCase() === 'admin' && (
                          <TableCell className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedClients.includes(client._id)}
                              onCheckedChange={() => handleSelectClient(client._id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {client.prenom.charAt(0)}{client.nom.charAt(0)}
                              </div>
                              <div className="flex items-center gap-2">
                                {hasParrain(client) && (
                                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Client parrainé" />
                                )}
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-gray-100">
                                    {client.prenom} {client.nom}
                                  </p>
                                  <p className="text-sm text-slate-500 dark:text-gray-500">#{client.code}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4 px-6">
                          <div className="space-y-1">
                            <p className="text-slate-900 dark:text-gray-100 font-medium">
                              {client.indicatif}{client.telephone}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-gray-500">
                              {client.email || "Aucun email"}
                            </p>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4 px-6">
                          <div className="space-y-1">
                            <p className="text-slate-900 dark:text-gray-100 font-medium">{client.ville}</p>
                            <p className="text-sm text-slate-500 dark:text-gray-500">{client.pays}</p>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4 px-6">
                          {client.commercialAttritre ? (
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {client.commercialAttritre.nom} {client.commercialAttritre.prenom}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-gray-500">Non affecté</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="py-4 px-6">
                          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50">
                            {client.contratCount}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="py-4 px-6">
                          <Badge 
                            variant={client.statut === 'active' ? 'default' : 'destructive'}
                            className={client.statut === 'active' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                            }
                          >
                            {client.statut === 'active' ? 'Actif' : 'Supprimé'}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="py-4 px-6 text-right">
                          {client.statut === 'active' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-gray-700"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 shadow-xl rounded-xl">
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRowClick(client._id)
                                  }}
                                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 dark:text-gray-100 rounded-lg"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir les détails
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditClient(client._id)
                                  }}
                                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 dark:text-gray-100 rounded-lg"
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="dark:bg-gray-700" />
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteClient(client._id)
                                  }}
                                  className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Infinite scroll trigger */}
                {hasMore && (
                  <div ref={observerTarget} className="flex justify-center items-center py-8">
                    {isLoadingMore && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                        <Icons.spinner className="h-5 w-5 animate-spin" />
                        <span>Chargement des clients...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border-0 dark:border-gray-700 shadow-2xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900 dark:text-gray-100">
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-400">
              Cette action est irréversible. Toutes les données associées à ce client seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-xl">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteClient}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isSessionExpiredDialogOpen} onOpenChange={setIsSessionExpiredDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border-0 dark:border-gray-700 shadow-2xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900 dark:text-gray-100">
              Session expirée
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-400">
              Votre session a expiré. Veuillez vous reconnecter pour continuer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={handleRedirectToLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Se reconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border-0 dark:border-gray-700 shadow-2xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900 dark:text-gray-100">
              Confirmer l'importation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-400">
              Êtes-vous sûr de vouloir importer ce fichier ? Cette action ajoutera de nouveaux clients à la liste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setIsImportDialogOpen(false)}
              className="bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-xl"
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmImportClients}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              Confirmer l'importation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {importResponseMessage && (
        <AlertDialog open={!!importResponseMessage} onOpenChange={() => setImportResponseMessage(null)}>
          <AlertDialogContent className="bg-white dark:bg-gray-800 border-0 dark:border-gray-700 shadow-2xl rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-slate-900 dark:text-gray-100">
                Résultat de l'importation
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-gray-400 whitespace-pre-line">
                {importResponseMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction 
                onClick={() => setImportResponseMessage(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <EditClientDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        clientId={selectedClientId ?? ""}
        onClientUpdated={handleClientUpdated}
      />

      {/* Assign Clients Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Affecter des clients à un commercial</DialogTitle>
            <DialogDescription>
              Sélectionnez un commercial pour affecter {selectedClients.length} client(s) sélectionné(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="commercial">Commercial</Label>
              <Select value={selectedCommercial} onValueChange={setSelectedCommercial}>
                <SelectTrigger id="commercial">
                  <SelectValue placeholder="Sélectionnez un commercial" />
                </SelectTrigger>
                <SelectContent>
                  {commercials.map((commercial) => (
                    <SelectItem key={commercial._id} value={commercial._id}>
                      {commercial.nom} {commercial.prenom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedClients.length > 0 && (
              <div className="max-h-60 overflow-y-auto border rounded-md p-3">
                <p className="text-sm font-medium mb-2">Clients sélectionnés :</p>
                <div className="space-y-1">
                  {selectedClients.map((clientId) => {
                    const client = filteredClients.find(c => c._id === clientId)
                    const isAlreadyAssigned = client?.commercialAttritre
                    return client ? (
                      <div 
                        key={clientId} 
                        className={`text-sm ${isAlreadyAssigned ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}`}
                      >
                        • {client.prenom} {client.nom} - {client.code}
                        {isAlreadyAssigned && (
                          <span className="ml-1 text-xs">(déjà affecté)</span>
                        )}
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false)
                setSelectedCommercial("")
              }}
              disabled={isAssigning}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAssignClients}
              disabled={!selectedCommercial || selectedClients.length === 0 || isAssigning}
            >
              {isAssigning ? (
                <>
                  <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
                  Affectation...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Affecter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
