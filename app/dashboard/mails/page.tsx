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
import { useRouter } from "next/navigation"
import axios from "axios"
import { 
  Mail, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  RefreshCw, 
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  BarChart3
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select"
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
import { motion } from "framer-motion"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface MailItem {
  _id: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  from: string
  subject: string
  status: "sent" | "failed" | "pending" | "rejected"
  accepted?: string[]
  rejected?: string[]
  context?: string
  relatedEntity?: string
  relatedEntityId?: any
  sentBy?: {
    _id: string
    nom: string
    prenom: string
    email: string
  }
  sentAt: string
  attempts: number
  totalRecipients: number
  error?: string
}

interface MailStats {
  sent: number
  failed: number
  pending: number
  rejected: number
}

export default function MailsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("tous")
  const [contextFilter, setContextFilter] = useState<string>("tous")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [senderFilter, setSenderFilter] = useState<string>("tous")
  const [senders, setSenders] = useState<{ _id: string; nom: string; prenom: string; email: string }[]>([])
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false)
  const [isSessionExpiredDialogOpen, setIsSessionExpiredDialogOpen] = useState(false)
  const [mailToDelete, setMailToDelete] = useState<string | null>(null)
  const [mails, setMails] = useState<MailItem[]>([])
  const [stats, setStats] = useState<MailStats>({ sent: 0, failed: 0, pending: 0, rejected: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    fetchMails()
    fetchSenders()
  }, [])

  const fetchSenders = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/mails/senders?module=mail`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      const sendersData = response.data.data || response.data.senders || []
      setSenders(sendersData)
    } catch (error) {
      console.error("Error fetching senders:", error)
      // Silently fail - not critical
    }
  }

  const loadMoreMails = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const token = localStorage.getItem("authToken")
      const nextPage = currentPage + 1
      
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: '20'
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (statusFilter && statusFilter !== 'tous') {
        params.append('status', statusFilter)
      }
      if (contextFilter && contextFilter !== 'tous') {
        params.append('context', contextFilter)
      }
      if (dateFilter) {
        params.append('date', dateFilter)
      }
      if (senderFilter && senderFilter !== 'tous') {
        params.append('senderId', senderFilter)
      }
      params.append('module', 'mail')
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/mails?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const { mails: mailsData, pagination } = response.data.data || response.data
      
      setMails((prev) => [...prev, ...mailsData])
      setHasMore(pagination.hasMore || nextPage < pagination.pages)
      setCurrentPage(nextPage)
    } catch (error) {
      devLog.error("Error loading more mails:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleSessionExpired()
        return
      }
      toast.error("Erreur lors du chargement des emails supplémentaires")
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentPage, hasMore, isLoadingMore, searchQuery, statusFilter, contextFilter, dateFilter, senderFilter])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMoreMails()
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
  }, [hasMore, isLoadingMore, isLoading, loadMoreMails])

  const handleSessionExpired = () => {
    setIsSessionExpiredDialogOpen(true)
  }

  const handleRedirectToLogin = () => {
    localStorage.removeItem("authToken")
    router.push("/auth/login")
  }

  const fetchMails = async () => {
    setIsLoading(true)
    setCurrentPage(1)
    setMails([])
    setHasMore(true)
    
    try {
      const token = localStorage.getItem("authToken")
      
      const params = new URLSearchParams({
        page: '1',
        limit: '20'
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (statusFilter && statusFilter !== 'tous') {
        params.append('status', statusFilter)
      }
      if (contextFilter && contextFilter !== 'tous') {
        params.append('context', contextFilter)
      }
      if (dateFilter) {
        params.append('date', dateFilter)
      }
      if (senderFilter && senderFilter !== 'tous') {
        params.append('senderId', senderFilter)
      }
      params.append('module', 'mail')
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/mails?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      devLog.log("Mails data fetched successfully:", response.data)
      const data = response.data.data || response.data
      const mailsData = data.mails || []
      const pagination = data.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
      const statsData = data.stats || { sent: 0, failed: 0, pending: 0, rejected: 0 }
      
      setMails(mailsData)
      setStats(statsData)
      setTotal(pagination.total || 0)
      setTotalPages(pagination.pages || 1)
      setHasMore(pagination.hasMore || pagination.page < pagination.pages)
      setCurrentPage(1)
    } catch (error) {
      devLog.error("Error fetching mails:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleSessionExpired()
        return
      }
      toast.error("Échec de la récupération des emails. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      fetchMails()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter, contextFilter, dateFilter, senderFilter])

  const handleDeleteMail = (id: string) => {
    setMailToDelete(id)
    setIsAlertDialogOpen(true)
  }

  const confirmDeleteMail = async () => {
    if (mailToDelete) {
      const toastId = toast.loading("Suppression de l'email...")
      try {
        const token = localStorage.getItem("authToken")
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_URL}/mails/${mailToDelete}?module=mail`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        setMails(mails.filter((mail) => mail._id !== mailToDelete))
        toast.success("Email supprimé avec succès.", { id: toastId })
      } catch (error) {
        devLog.error("Error deleting mail:", error)
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          handleSessionExpired()
          return
        }
        toast.error("Échec de la suppression de l'email. Veuillez réessayer.", { id: toastId })
      } finally {
        setIsAlertDialogOpen(false)
        setMailToDelete(null)
      }
    }
  }

  const handleRetryMail = async (id: string) => {
    setIsRetrying(id)
    const toastId = toast.loading("Nouvelle tentative d'envoi...")
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/mails/${id}/retry?module=mail`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      
      if (response.data.success) {
        toast.success("Email réexpédié avec succès.", { id: toastId })
        fetchMails() // Refresh the list
      } else {
        toast.error(response.data.message || "Échec de la réexpédition.", { id: toastId })
      }
    } catch (error) {
      devLog.error("Error retrying mail:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleSessionExpired()
        return
      }
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : "Échec de la réexpédition de l'email. Veuillez réessayer."
      toast.error(errorMessage, { id: toastId })
    } finally {
      setIsRetrying(null)
    }
  }

  const handleRowClick = (mailId: string) => {
    router.push(`/dashboard/mails/${mailId}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Envoyé
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Échoué
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Rejeté
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getContextBadge = (context?: string) => {
    if (!context) return null
    return (
      <Badge variant="outline" className="text-xs">
        {context}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Mail className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Gestion des Emails</h1>
              <p className="text-muted-foreground">
                Historique et traçabilité de tous les emails envoyés
              </p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="flex gap-4">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Envoyés</p>
                    <p className="text-2xl font-bold">{stats.sent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Échoués</p>
                    <p className="text-2xl font-bold">{stats.failed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">En attente</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Statut" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les statuts</SelectItem>
                    <SelectItem value="sent">Envoyés</SelectItem>
                    <SelectItem value="failed">Échoués</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="rejected">Rejetés</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={contextFilter} onValueChange={setContextFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Contexte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les contextes</SelectItem>
                    <SelectItem value="anniversaire">Anniversaire</SelectItem>
                    <SelectItem value="facture">Facture</SelectItem>
                    <SelectItem value="rapport">Rapport</SelectItem>
                    <SelectItem value="sic-invitation">Invitation SIC</SelectItem>
                    <SelectItem value="sondage">Sondage</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    placeholder="Date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-10 w-full sm:w-[180px]"
                  />
                </div>

                <Select value={senderFilter} onValueChange={setSenderFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Expéditeur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les expéditeurs</SelectItem>
                    {senders.map((sender) => (
                      <SelectItem key={sender._id} value={sender._id}>
                        {sender.prenom} {sender.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-96">
                <div className="text-center space-y-4">
                  <Icons.spinner className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
                  <p className="text-muted-foreground">Chargement des emails...</p>
                </div>
              </div>
            ) : Array.isArray(mails) && mails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="p-6 bg-muted rounded-full mb-6">
                  <Mail className="h-16 w-16 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Aucun email trouvé</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Aucun email ne correspond à vos critères de recherche.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">Destinataire(s)</TableHead>
                      <TableHead className="font-semibold">Sujet</TableHead>
                      <TableHead className="font-semibold">Contexte</TableHead>
                      <TableHead className="font-semibold">Statut</TableHead>
                      <TableHead className="font-semibold">Date d'envoi</TableHead>
                      <TableHead className="font-semibold">Expéditeur</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(mails) && mails.map((mail) => (
                      <TableRow
                        key={mail._id}
                        className="cursor-pointer"
                        onClick={() => handleRowClick(mail._id)}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-sm">
                              {mail.to && mail.to.length > 0 ? mail.to[0] : 'N/A'}
                            </p>
                            {mail.to && mail.to.length > 1 && (
                              <p className="text-xs text-muted-foreground">
                                +{mail.to.length - 1} autre{mail.to.length > 2 ? 's' : ''}
                              </p>
                            )}
                            {mail.totalRecipients && (
                              <p className="text-xs text-muted-foreground">
                                {mail.totalRecipients} destinataire{mail.totalRecipients > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="max-w-md">
                            <p className="font-medium truncate">{mail.subject || 'Sans sujet'}</p>
                            {mail.error && (
                              <p className="text-xs text-red-600 truncate mt-1" title={mail.error}>
                                {mail.error}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {getContextBadge(mail.context || 'Autre')}
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(mail.status)}
                        </TableCell>
                        
                        <TableCell>
                          {mail.sentAt ? (
                            <div className="space-y-1">
                              <p className="text-sm">
                                {format(new Date(mail.sentAt), "dd MMM yyyy", { locale: fr })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(mail.sentAt), "HH:mm", { locale: fr })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {mail.sentBy ? (
                            <div>
                              <p className="text-sm font-medium">
                                {mail.sentBy.prenom} {mail.sentBy.nom}
                              </p>
                              <p className="text-xs text-muted-foreground">{mail.sentBy.email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Système</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRowClick(mail._id)
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Voir les détails
                              </DropdownMenuItem>
                              {mail.status === 'failed' && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRetryMail(mail._id)
                                  }}
                                  disabled={isRetrying === mail._id}
                                >
                                  {isRetrying === mail._id ? (
                                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                  )}
                                  Réessayer
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteMail(mail._id)
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Infinite scroll trigger */}
                {hasMore && (
                  <div ref={observerTarget} className="flex justify-center items-center py-8">
                    {isLoadingMore && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icons.spinner className="h-5 w-5 animate-spin" />
                        <span>Chargement...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'email sera définitivement supprimé de l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMail} className="bg-red-600 hover:bg-red-700">
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isSessionExpiredDialogOpen} onOpenChange={setIsSessionExpiredDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session expirée</AlertDialogTitle>
            <AlertDialogDescription>
              Votre session a expiré. Veuillez vous reconnecter pour continuer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleRedirectToLogin}>
              Se reconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
