"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EditProspectDialog } from "@/components/edit-prospect-dialog"
import { ProspectStatusDialog } from "@/components/prospect-status-dialog"
import { UserPlus, Edit, Search, Calendar, Filter, Download, Upload, Users, TrendingUp, Clock, UserCheck, AlertTriangle, SlidersHorizontal, Trash2 } from "lucide-react"
import { ErrorDialog } from "@/components/error-dialog"
import { Icons } from "@/components/icons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import axios from "axios"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import type { Prospect } from "@/types/client"
import { toast } from "react-hot-toast"
import { CountryCodeFilterSelect } from "@/components/country-code-filter-select"
import { InvalidEmailsWarning, type InvalidEmailEntry } from "@/components/invalid-emails-warning"
import { InvalidPhonesWarning, type InvalidPhoneEntry } from "@/components/invalid-phones-warning"

// Villes prédéfinies (même liste que dans les formulaires de création/modification)
const PREDEFINED_CITIES = ["KINSHASA", "KOLWEZI", "MUANDA", "MOANDA", "LUBUMBASHI"]

const getStatusColor = (status: string) => {
  switch (status) {
    case "prospect":
      return "warning"
    case "client":
      return "success"
    case "annuler":
      return "destructive"
    default:
      return "default"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "prospect":
      return <Clock className="h-4 w-4" />
    case "client":
      return <TrendingUp className="h-4 w-4" />
    case "annuler":
      return <Icons.x className="h-4 w-4" />
    default:
      return <Users className="h-4 w-4" />
  }
}

export default function ProspectPage() {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [filteredProspects, setFilteredProspects] = useState<Prospect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: "",
    message: "",
  })
  const [showSessionError, setShowSessionError] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("prospect")
  const [commercialFilter, setCommercialFilter] = useState("all")
  const [villeFilter, setVilleFilter] = useState("all")
  const [affectationFilter, setAffectationFilter] = useState("all")
  const [parrainFilter, setParrainFilter] = useState<"all" | "with" | "without">("all")
  const [indicatifFilter, setIndicatifFilter] = useState<string>("all")
  const [categorieFilter, setCategorieFilter] = useState<string>("all")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [commercials, setCommercials] = useState<{ _id: string; nom: string; prenom: string }[]>([])
  const [selectedProspects, setSelectedProspects] = useState<string[]>([])
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedCommercial, setSelectedCommercial] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [prospectToDelete, setProspectToDelete] = useState<Prospect | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)
  
  // Statistics state
  const [stats, setStats] = useState({
    total: 0,
    byStatus: {
      prospect: 0,
      client: 0,
      annuler: 0
    }
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [prospectsParrainesCount, setProspectsParrainesCount] = useState<number>(0)
  const [invalidEmailsCount, setInvalidEmailsCount] = useState(0)
  const [invalidEmailsList, setInvalidEmailsList] = useState<InvalidEmailEntry[]>([])
  const [showInvalidEmailsModal, setShowInvalidEmailsModal] = useState(false)
  const [invalidPhonesCount, setInvalidPhonesCount] = useState(0)
  const [invalidPhonesList, setInvalidPhonesList] = useState<InvalidPhoneEntry[]>([])
  const [showInvalidPhonesModal, setShowInvalidPhonesModal] = useState(false)

  const handleSessionExpired = () => {
    localStorage.removeItem("authToken")
    Cookies.remove("authToken")
    setShowSessionError(false)
    router.push("/auth/login")
  }

  // Fetch current user role and commercials list
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("authToken")
        const [userResponse, commercialsResponse] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/new-data`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ])
        
        if (userResponse.data) {
          setCurrentUserRole(userResponse.data.role || "")
        }
        
        if (commercialsResponse.data && commercialsResponse.data.users) {
          setCommercials(commercialsResponse.data.users)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }
    
    fetchUserData()
  }, [])

  const fetchProspectStats = useCallback(async () => {
    try {
      setIsLoadingStats(true)
      const token = localStorage.getItem("authToken")
      
      const [statsResponse, parrainesResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects?parrainStatus=with&page=1&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      
      if (statsResponse.data.success && statsResponse.data.data) {
        setStats(statsResponse.data.data)
      }
    
      if (statsResponse.data.data.byStatus.prospectParraine != null) {
        setProspectsParrainesCount(Number(statsResponse.data.data.byStatus.prospectParraine))
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setShowSessionError(true)
        } else {
          console.error("Error fetching prospect stats:", error)
        }
      }
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  const fetchProspects = useCallback(async () => {
    try {
      setIsLoading(true)
      setCurrentPage(1)
      setProspects([])
      setHasMore(true)
      
      const token = localStorage.getItem("authToken")
      
      // Build query parameters
      const params = new URLSearchParams({
        page: '1',
        limit: '20'
      })
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (dateFilter) {
        params.append('date', dateFilter)
      }
      if (commercialFilter && commercialFilter !== 'all') {
        params.append('commercialAttritre', commercialFilter)
      }
      if (villeFilter && villeFilter !== 'all' && villeFilter !== 'autres') {
        params.append('villeSouhaitee', villeFilter)
      }
      if (affectationFilter && affectationFilter !== 'all') {
        params.append('affectation', affectationFilter)
      }
      if (parrainFilter === 'with') {
        params.append('parrainStatus', 'with')
      } else if (parrainFilter === 'without') {
        params.append('parrainStatus', 'without')
      }
      if (indicatifFilter && indicatifFilter !== 'all') {
        params.append('indicatif', indicatifFilter)
      }
      if (categorieFilter && categorieFilter !== 'all') {
        params.append('categorie', categorieFilter)
      }

      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const { prospects: prospectsData, pagination } = response.data
      setProspects(prospectsData)
      setFilteredProspects(prospectsData)
      setHasMore(pagination.hasMore)
     
      setCurrentPage(1)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setShowSessionError(true)
        } else {
          setError({
            show: true,
            title: "Erreur",
            message: error.response?.data?.message || "Une erreur est survenue lors du chargement des prospects",
          })
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, statusFilter, dateFilter, commercialFilter, villeFilter, parrainFilter, affectationFilter, indicatifFilter, categorieFilter])

  const loadMoreProspects = useCallback(async () => {
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
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (dateFilter) {
        params.append('date', dateFilter)
      }
      if (commercialFilter && commercialFilter !== 'all') {
        params.append('commercialAttritre', commercialFilter)
      }
      if (villeFilter && villeFilter !== 'all' && villeFilter !== 'autres') {
        params.append('villeSouhaitee', villeFilter)
      }
      if (affectationFilter && affectationFilter !== 'all') {
        params.append('affectation', affectationFilter)
      }
      if (parrainFilter === 'with') {
        params.append('parrainStatus', 'with')
      } else if (parrainFilter === 'without') {
        params.append('parrainStatus', 'without')
      }
      if (indicatifFilter && indicatifFilter !== 'all') {
        params.append('indicatif', indicatifFilter)
      }
      if (categorieFilter && categorieFilter !== 'all') {
        params.append('categorie', categorieFilter)
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/prospects?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const { prospects: prospectsData, pagination } = response.data
      
      setProspects((prev) => [...prev, ...prospectsData])
      setHasMore(pagination.hasMore)
      setCurrentPage(nextPage)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setShowSessionError(true)
          return
        }
        setError({
          show: true,
          title: "Erreur",
          message: "Erreur lors du chargement des prospects supplémentaires",
        })
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentPage, hasMore, isLoadingMore, searchTerm, statusFilter, dateFilter, commercialFilter, villeFilter, parrainFilter, affectationFilter, indicatifFilter, categorieFilter])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMoreProspects()
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
  }, [hasMore, isLoadingMore, isLoading, loadMoreProspects])

  const fetchInvalidProspectEmails = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken")
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/invalid-emails`, {
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

  const fetchInvalidProspectPhones = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken")
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/invalid-phones`, {
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

  // Initial fetch on mount
  useEffect(() => {
    fetchProspectStats()
    fetchProspects()
    fetchInvalidProspectEmails()
    fetchInvalidProspectPhones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Refresh stats when filters change (debounced)
  useEffect(() => {
    if (isInitialMount.current) {
      return
    }

    const timeoutId = setTimeout(() => {
      fetchProspectStats()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, statusFilter, dateFilter, commercialFilter, villeFilter, affectationFilter, fetchProspectStats])

  // Debounce search term and filters to avoid too many API calls
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      fetchProspects()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [searchTerm, statusFilter, dateFilter, commercialFilter, villeFilter, affectationFilter, categorieFilter, fetchProspects])

  // Update filtered prospects whenever prospects change (from server-side filtering)
  useEffect(() => {
    let filtered = prospects
    
    // Si le filtre "autres" est sélectionné, filtrer côté client pour ne garder que les villes non prédéfinies
    if (villeFilter === 'autres') {
      filtered = prospects.filter((prospect) => {
        const ville = prospect.villeSouhaitee || ""
        return ville && !PREDEFINED_CITIES.includes(ville.toUpperCase())
      })
    }
    
    // Filtre par affectation (affecté/non affecté)
    if (affectationFilter === 'affecte') {
      filtered = filtered.filter((prospect) => prospect.commercialAttritre)
    } else if (affectationFilter === 'non-affecte') {
      filtered = filtered.filter((prospect) => !prospect.commercialAttritre)
    }
    
    setFilteredProspects(filtered)
  }, [prospects, villeFilter, affectationFilter])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
  }

  const handleCommercialFilterChange = (value: string) => {
    setCommercialFilter(value)
  }

  const handleSelectProspect = (prospectId: string) => {
    setSelectedProspects(prev => 
      prev.includes(prospectId) 
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    )
  }

  const handleSelectAll = () => {
    if (selectedProspects.length === filteredProspects.length) {
      setSelectedProspects([])
    } else {
      setSelectedProspects(filteredProspects.map(p => p._id))
    }
  }

  const handleAssignProspects = async () => {
    if (selectedProspects.length === 0) {
      toast.error("Veuillez sélectionner au moins un prospect")
      return
    }
    if (!selectedCommercial) {
      toast.error("Veuillez sélectionner un commercial")
      return
    }

    // Check if any selected prospects are already assigned
    const alreadyAssignedProspects = filteredProspects.filter(
      p => selectedProspects.includes(p._id) && p.commercialAttritre
    )

    if (alreadyAssignedProspects.length > 0) {
      toast.error(
        `${alreadyAssignedProspects.length} prospect(s) sont déjà affecté(s) à un commercial. Veuillez les désélectionner.`,
        { duration: 5000 }
      )
      return
    }

    try {
      setIsAssigning(true)
      const token = localStorage.getItem("authToken")
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/prospects/assign`,
        {
          prospectIds: selectedProspects,
          commercialId: selectedCommercial
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      toast.success(`${selectedProspects.length} prospect(s) affecté(s) avec succès`)
      setIsAssignDialogOpen(false)
      setSelectedProspects([])
      setSelectedCommercial("")
      fetchProspects()
    } catch (error) {
      console.error("Error assigning prospects:", error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Erreur lors de l'affectation")
      } else {
        toast.error("Une erreur est survenue")
      }
    } finally {
      setIsAssigning(false)
    }
  }

  const handleStatusClick = (prospect: Prospect) => {
    if (prospect.status === "client") return
    setSelectedProspect(prospect)
    setIsStatusDialogOpen(true)
  }

  const handleEditClick = (prospect: Prospect) => {
    router.push(`/dashboard/prospect/edit-prospect/${prospect._id}`)
  }

  const handleProspectClick = (prospect: Prospect) => {
    router.push(`/dashboard/prospect/${prospect._id}`)
  }

  const handleStatusDialogClose = (open: boolean) => {
    setIsStatusDialogOpen(open)
    if (!open) {
      setTimeout(() => {
        setSelectedProspect(null)
      }, 300)
    }
  }

  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open)
    if (!open) {
      setTimeout(() => {
        setSelectedProspect(null)
      }, 300)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, prospect: Prospect) => {
    e.stopPropagation()
    if (prospect.status === "client") return
    setProspectToDelete(prospect)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!prospectToDelete) return
    setIsDeleting(true)
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/prospects/${prospectToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Prospect supprimé avec succès.")
      refreshProspectsAndStats()
      setIsDeleteDialogOpen(false)
      setProspectToDelete(null)
    } catch (err) {
      console.error("Error deleting prospect:", err)
      toast.error(axios.isAxiosError(err) && err.response?.data?.message ? err.response.data.message : "Impossible de supprimer le prospect.")
    } finally {
      setIsDeleting(false)
    }
  }

  const isAdmin = currentUserRole?.toLowerCase() === "admin"

  // Refresh both prospects and stats
  const refreshProspectsAndStats = useCallback(() => {
    fetchProspectStats()
    fetchProspects()
  }, [fetchProspectStats, fetchProspects])

  const navigateToNewProspect = () => {
    router.push("/dashboard/prospect/new-prospect")
  }

  const handleImportButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportClick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validExtensions = ['.xlsx', '.xls']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validExtensions.includes(fileExtension)) {
      setError({
        show: true,
        title: "Erreur d'importation",
        message: "Veuillez sélectionner un fichier Excel (.xlsx ou .xls)",
      })
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setIsImporting(true)
    const toastId = toast.loading("Importation du fichier en cours...")
    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        toast.error("Token d'authentification manquant. Veuillez vous reconnecter.", { id: toastId })
        setError({
          show: true,
          title: "Erreur d'authentification",
          message: "Token d'authentification manquant. Veuillez vous reconnecter.",
        })
        setIsImporting(false)
        return
      }

      const formData = new FormData()
      formData.append("file", file)

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/prospects/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.status === 200 || response.status === 201) {
        toast.success("Importation réussie ! "+response.data.message, { id: toastId })
        setShowSuccessDialog(true)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        // Refresh prospects list and stats
        fetchProspectStats()
        fetchProspects()
      }
    } catch (error) {
      console.error("Erreur lors de l'importation:", error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast.error("Session expirée. Veuillez vous reconnecter.", { id: toastId })
          setShowSessionError(true)
        } else {
          const errorMessage = error.response?.data?.message || error.response?.data?.error || "Une erreur est survenue lors de l'importation du fichier."
          toast.error(errorMessage, { id: toastId })
          setError({
            show: true,
            title: "Erreur d'importation",
            message: errorMessage,
          })
        }
      } else {
        toast.error("Une erreur est survenue lors de l'importation du fichier.", { id: toastId })
        setError({
          show: true,
          title: "Erreur d'importation",
          message: "Une erreur est survenue lors de l'importation du fichier.",
        })
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleExportClick = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = "prospects.xlsx"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Erreur lors de l'exportation:", error)
      setError({
        show: true,
        title: "Erreur d'exportation",
        message: "Une erreur est survenue lors de l'exportation des prospects.",
      })
    }
  }

  // Use statistics from API (total without pagination)
  const totalProspects = stats.total
  const clientsCount = stats.byStatus.client
  const prospectsCount = stats.byStatus.prospect
  const cancelledCount = stats.byStatus.annuler
  const hasParrainProspect = (p: Prospect) =>
    (p.parrain && typeof p.parrain === 'object' && (p.parrain._id || p.parrain.nom)) ||
    (p.parrainDetails && typeof p.parrainDetails === 'object')

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Icons.spinner className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Chargement des prospects...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ErrorDialog
        isOpen={showSessionError}
        onClose={handleSessionExpired}
        title="Session expirée"
        message="Votre session a expiré, veuillez vous reconnecter."
      />

      <ErrorDialog
        isOpen={error.show}
        onClose={() => setError({ show: false, title: "", message: "" })}
        title={error.title}
        message={error.message}
      />

      <ErrorDialog
        isOpen={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title="Succès"
        message="L'opération a été réalisée avec succès."
      />

      <div className="container mx-auto py-8 px-4 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Gestion des Prospects</h1>
              <p className="text-muted-foreground mt-2">
                Gérez vos prospects et suivez leur progression vers le statut de client
              </p>
            </div>
            <div className="flex space-x-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportClick}
                className="hidden"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              />
              <Button 
                onClick={handleImportButtonClick} 
                variant="outline" 
                size="sm"
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Importation...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer
                  </>
                )}
              </Button>
              <Button onClick={handleExportClick} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
              <Button onClick={navigateToNewProspect} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                <UserPlus className="mr-2 h-4 w-4" />
                Nouveau prospect
              </Button>
            </div>
          </div>
        </div>

        {/* Invalid emails warning */}
        <InvalidEmailsWarning
          count={invalidEmailsCount}
          emails={invalidEmailsList}
          entityLabel="prospects"
          open={showInvalidEmailsModal}
          onOpenChange={setShowInvalidEmailsModal}
        />

        {/* Invalid phones warning */}
        <InvalidPhonesWarning
          count={invalidPhonesCount}
          phones={invalidPhonesList}
          entityLabel="prospects"
          open={showInvalidPhonesModal}
          onOpenChange={setShowInvalidPhonesModal}
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Prospects</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {isLoadingStats ? (
                  <Icons.spinner className="h-6 w-6 animate-spin inline-block" />
                ) : (
                  totalProspects
                )}
              </div>
              <p className="text-xs text-blue-600 mt-1">Tous les prospects</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Clients</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {isLoadingStats ? (
                  <Icons.spinner className="h-6 w-6 animate-spin inline-block" />
                ) : (
                  clientsCount
                )}
              </div>
              <p className="text-xs text-green-600 mt-1">Prospects convertis</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">En cours</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">
                {isLoadingStats ? (
                  <Icons.spinner className="h-6 w-6 animate-spin inline-block" />
                ) : (
                  prospectsCount
                )}
              </div>
              <p className="text-xs text-yellow-600 mt-1">Prospects actifs</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Parrainés</CardTitle>
              <UserCheck className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-900">
                {isLoadingStats ? (
                  <Icons.spinner className="h-6 w-6 animate-spin inline-block" />
                ) : (
                  prospectsParrainesCount
                )}
              </div>
              <p className="text-xs text-amber-600 mt-1">Avec parrain </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Annulés</CardTitle>
              <Icons.x className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">
                {isLoadingStats ? (
                  <Icons.spinner className="h-6 w-6 animate-spin inline-block" />
                ) : (
                  cancelledCount
                )}
              </div>
              <p className="text-xs text-red-600 mt-1">Prospects annulés</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Recherche et filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filtres de base : recherche, date, statut + bouton tous les filtres */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, email, ville..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>
                <div className="relative w-full sm:w-auto">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={handleDateFilterChange}
                    className="pl-10 min-w-[160px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="annuler">Annulé</SelectItem>
                    <SelectItem value="client">Converti en client</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAdvancedFilters((v) => !v)}
                  className={`shrink-0 h-10 w-10 ${showAdvancedFilters ? "bg-primary/10 border-primary text-primary" : ""}`}
                  title={showAdvancedFilters ? "Masquer les filtres" : "Afficher tous les filtres"}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Tous les filtres : ville, affectation, parrainage, commercial */}
              {showAdvancedFilters && (
                <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
                  <Select value={villeFilter} onValueChange={setVilleFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Ville souhaitée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les villes</SelectItem>
                      {PREDEFINED_CITIES.map((ville) => (
                        <SelectItem key={ville} value={ville}>
                          {ville}
                        </SelectItem>
                      ))}
                      <SelectItem value="autres">Autres</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={affectationFilter} onValueChange={setAffectationFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Affectation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les prospects</SelectItem>
                      <SelectItem value="affecte">Affectés</SelectItem>
                      <SelectItem value="non-affecte">Non affectés</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={parrainFilter} onValueChange={(v) => setParrainFilter(v as "all" | "with" | "without")}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Parrainage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous (parrainés ou non)</SelectItem>
                      <SelectItem value="with">Prospects parrainés</SelectItem>
                      <SelectItem value="without">Prospects non parrainés</SelectItem>
                    </SelectContent>
                  </Select>
                  {currentUserRole?.toLowerCase() === "admin" && (
                    <Select value={commercialFilter} onValueChange={handleCommercialFilterChange}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Commercial" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les commerciaux</SelectItem>
                        {commercials.map((commercial) => (
                          <SelectItem key={commercial._id} value={commercial._id}>
                            {commercial.nom} {commercial.prenom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <CountryCodeFilterSelect
                    value={indicatifFilter}
                    onValueChange={setIndicatifFilter}
                    placeholder="Code pays"
                    triggerClassName="w-full sm:w-[200px]"
                    contentClassName="max-h-[320px] overflow-y-auto"
                  />
                  <Select value={categorieFilter} onValueChange={setCategorieFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="1000 jeunes">1000 jeunes</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table Section */}
        <Card>
          <CardHeader className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Liste des Prospects</CardTitle>
                <CardDescription>
                  {filteredProspects.length} prospect{filteredProspects.length !== 1 ? 's' : ''} trouvé{filteredProspects.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              {currentUserRole?.toLowerCase() === 'admin' && (
                <Button
                  onClick={() => setIsAssignDialogOpen(true)}
                  disabled={selectedProspects.length === 0}
                  className="flex items-center gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Affecter ({selectedProspects.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-20 border-b">
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    {currentUserRole?.toLowerCase() === 'admin' && (
                      <TableHead className="w-12 bg-muted/50">
                        <Checkbox
                          checked={selectedProspects.length === filteredProspects.length && filteredProspects.length > 0}
                          onCheckedChange={handleSelectAll}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableHead>
                    )}
                    <TableHead className="font-semibold bg-muted/50">Ville Souhaitée</TableHead>
                    <TableHead className="font-semibold bg-muted/50">Nom</TableHead>
                    <TableHead className="font-semibold bg-muted/50">Téléphone</TableHead>
                    <TableHead className="font-semibold bg-muted/50">Commercial affecté</TableHead>
                    <TableHead className="font-semibold bg-muted/50">Commentaire</TableHead>
                    <TableHead className="font-semibold bg-muted/50">Date d'ajout</TableHead>
                    <TableHead className="font-semibold bg-muted/50">Statut</TableHead>
                    <TableHead className="font-semibold bg-muted/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProspects.length > 0 ? (
                    filteredProspects.map((prospect) => (
                      <TableRow
                        key={prospect._id}
                        onClick={() => handleProspectClick(prospect)}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors${prospect.categorie === "1000 jeunes" ? " bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40" : ""}`}
                      >
                        {currentUserRole?.toLowerCase() === 'admin' && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedProspects.includes(prospect._id)}
                              onCheckedChange={() => handleSelectProspect(prospect._id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          {prospect.villeSouhaitee || "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="font-semibold flex items-center gap-2 flex-wrap">
                              {hasParrainProspect(prospect) && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Prospect parrainé" />
                              )}
                              {prospect.nom} {prospect.postnom} {prospect.prenom}
                              {prospect.categorie === "1000 jeunes" && (
                                <Badge className="text-xs bg-purple-600 text-white hover:bg-purple-700 shrink-0">1000 jeunes</Badge>
                              )}
                            </span>
                            <span className="text-sm text-muted-foreground">{prospect.profession || "Non spécifié"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{prospect.indicatif + prospect.telephone}</span>
                            {prospect.telephone2 && (
                              <span className="text-sm text-muted-foreground">{prospect.email}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {prospect.commercialAttritre ? (
                            <span className="font-medium text-blue-600">{prospect.commercialAttritre.nom} {prospect.commercialAttritre.prenom}</span>
                          ) : (
                            <span className="text-muted-foreground">Non affecté</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={prospect.commentaire}>
                            {prospect.commentaire || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{new Date(prospect.createdAt).toLocaleDateString("fr-FR")}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(prospect.updatedAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {prospect.status === "client" ? (
                            <Badge
                              variant={getStatusColor(prospect.status) as "destructive" | "default" | "secondary" | "outline" | null | undefined}
                              className="flex items-center gap-1 cursor-default opacity-90"
                            >
                              {getStatusIcon(prospect.status)}
                              {prospect.status}
                            </Badge>
                          ) : (
                            <Badge
                              variant={getStatusColor(prospect.status) as "destructive" | "default" | "secondary" | "outline" | null | undefined}
                              className="flex items-center gap-1 cursor-pointer hover:opacity-80"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusClick(prospect)
                              }}
                              title="Cliquez pour modifier le statut"
                            >
                              {getStatusIcon(prospect.status)}
                              {prospect.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {prospect.status !== "client" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditClick(prospect)
                                }}
                                title="Modifier le prospect"
                                className="hover:bg-muted"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteClick(e, prospect)}
                                disabled={prospect.status === "client"}
                                title={prospect.status === "client" ? "Impossible de supprimer un prospect converti en client" : "Supprimer le prospect"}
                                className="hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 disabled:pointer-events-none"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center space-y-4">
                          <Users className="h-12 w-12 text-muted-foreground" />
                          <div>
                            <p className="text-lg font-medium">Aucun prospect trouvé</p>
                            <p className="text-muted-foreground">Essayez de modifier vos filtres de recherche</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Infinite scroll trigger */}
              {hasMore && (
                <div ref={observerTarget} className="flex justify-center items-center py-8">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icons.spinner className="h-5 w-5 animate-spin" />
                      <span>Chargement des prospects...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedProspect && isStatusDialogOpen && (
          <ProspectStatusDialog
            open={isStatusDialogOpen}
            onOpenChange={handleStatusDialogClose}
            currentStatus={selectedProspect.status}
            prospectId={selectedProspect._id}
            onSuccess={refreshProspectsAndStats}
          />
        )}

        {selectedProspect && isEditDialogOpen && (
          <EditProspectDialog
            open={isEditDialogOpen}
            onOpenChange={handleEditDialogClose}
            prospect={selectedProspect}
            onSuccess={refreshProspectsAndStats}
          />
        )}

        {/* Delete prospect confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le prospect</AlertDialogTitle>
              <AlertDialogDescription>
                {prospectToDelete ? (
                  <>
                    Êtes-vous sûr de vouloir supprimer le prospect <strong>{prospectToDelete.nom} {prospectToDelete.prenom}</strong> ? Cette action est irréversible.
                  </>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  "Supprimer"
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Assign Prospects Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Affecter des prospects à un commercial</DialogTitle>
              <DialogDescription>
                Vous allez affecter {selectedProspects.length} prospect{selectedProspects.length > 1 ? 's' : ''} à un commercial.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Sélectionner un commercial <span className="text-red-500">*</span>
                </label>
                <Select value={selectedCommercial} onValueChange={setSelectedCommercial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un commercial" />
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
              
              {/* Warning for already assigned prospects */}
              {(() => {
                const alreadyAssignedProspects = filteredProspects.filter(
                  p => selectedProspects.includes(p._id) && p.commercialAttritre
                )
                if (alreadyAssignedProspects.length > 0) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-800 mb-2">
                            {alreadyAssignedProspects.length} prospect{alreadyAssignedProspects.length > 1 ? 's' : ''} déjà affecté{alreadyAssignedProspects.length > 1 ? 's' : ''}
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {alreadyAssignedProspects.map((prospect) => (
                              <div key={prospect._id} className="text-xs text-yellow-700">
                                • {prospect.nom} {prospect.prenom}
                                {prospect.commercialAttritre?.nom ? (
                                  <span className="ml-1">(affecté à {prospect.commercialAttritre.nom} {prospect.commercialAttritre.prenom})</span>
                                ) : (
                                  <span className="ml-1">(non affecté)</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-yellow-700 mt-2">
                            Veuillez désélectionner ces prospects avant de continuer.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              })()}
              
              {selectedProspects.length > 0 && (
                <div className="max-h-60 overflow-y-auto border rounded-md p-3">
                  <p className="text-sm font-medium mb-2">Prospects sélectionnés :</p>
                  <div className="space-y-1">
                    {selectedProspects.map((prospectId) => {
                      const prospect = filteredProspects.find(p => p._id === prospectId)
                      const isAlreadyAssigned = prospect?.commercialAttritre
                      return prospect ? (
                        <div 
                          key={prospectId} 
                          className={`text-sm ${isAlreadyAssigned ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}`}
                        >
                          • {prospect.nom} {prospect.prenom} - {prospect.villeSouhaitee || "Ville non spécifiée"}
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
                onClick={handleAssignProspects}
                disabled={!selectedCommercial || selectedProspects.length === 0 || isAssigning || (() => {
                  const alreadyAssigned = filteredProspects.filter(
                    p => selectedProspects.includes(p._id) && p.commercialAttritre
                  )
                  return alreadyAssigned.length > 0
                })()}
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
    </>
  )
}
