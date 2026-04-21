"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useGeolocation } from "@/hooks/useGeolocation"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { NewUserDialog } from "@/components/new-user-dialog"
import { EditUserDialog } from "@/components/edit-user-dialog"
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
import { authRequest } from "@/lib/authRequest"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, MoreHorizontal, Settings, Users, Building2, User, Shield, Mail, Key, UserX, Edit3, Calendar, Info, Clock, AlertCircle, Lock, Server, BarChart3, Download, FileText, Eye, Activity, TrendingUp, Target, DollarSign, Award, Trophy, ArrowUpRight, Zap, RefreshCw, ChevronRight, Filter, MapPin, Plus, Loader2, Newspaper, Image, ToggleLeft, ToggleRight, ExternalLink } from "lucide-react"
import axios from "axios"
import { ErrorDialog } from "@/components/error-dialog"
import { toast } from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@radix-ui/react-label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** Liste des villes pour les cités (paramètres) et filtre terrains (dashboard). */
const VILLES_OPTIONS = ["Kinshasa", "Kolwezi", "Muanda", "Autre"]

interface User {
  _id: string
  nom: string
  email: string
  role: string
  dateCreated: string
  lastLogon: string
  status: string
  salaire?: number
  permissions?: {
    dashboard: { read: boolean; write: boolean }
    contrats: { read: boolean; write: boolean }
    clients: { read: boolean; write: boolean }
    prospects: { read: boolean; write: boolean }
    terrains: { read: boolean; write: boolean }
    paiements: { read: boolean; write: boolean }
    comptabilites: { read: boolean; write: boolean }
    parametres: { read: boolean; write: boolean }
    mail: { read: boolean; write: boolean }
    acquisitions: { read: boolean; write: boolean }
  }
}

interface Cite {
  _id: string
  code: string
  nom: string
  description: string
  addBy: {
    nom: string
  }
  createdAt: string
  pays: string
  province: string
  ville: string
  commune: string
  quartier: string
  numero: string
  reference: string
  frais_cadastraux?: number
  lat?: number
  lng?: number
}

interface Bureau {
  _id: string
  nom: string
  adresse: {
    numero: string
    avenue: string
    quartier: string
    commune: string
    ville: string
    pays: string
  }
  coordonnees: {
    lat: number | null
    lng: number | null
  }
  rayon: number
  ipsAutorisees: string[]
  actif: boolean
  commentaire: string
  createdAt: string
}

interface Sondage {
  _id: string
  status: 'active' | 'inactive' | 'deleted'
  code: string
  title: string
  message: string
  stats?: {
    totalSent: number
    totalDelivered: number
    totalOpened: number
    totalResponded: number
  }
  createdAt: string
  updatedAt: string
}

interface NewsCarousel {
  _id: string
  imageUrl: string
  titre?: string
  lien?: string
  ordre: number
  actif: boolean
  createdAt: string
}

interface NewsArticle {
  _id: string
  titre: string
  shortDesc?: string
  longDesc?: string
  cover?: string
  author?: string
  status: 'published' | 'draft'
  createdAt: string
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const router = useRouter()
  const [showSessionError, setShowSessionError] = useState(false)
  const [showPermissionError, setShowPermissionError]=useState(false)

  // Cites state
  const [cites, setCites] = useState<Cite[]>([])
  const [isCiteDialogOpen, setIsCiteDialogOpen] = useState(false)
  const [isEditCiteDialogOpen, setIsEditCiteDialogOpen] = useState(false)
  const [isDeleteCiteDialogOpen, setIsDeleteCiteDialogOpen] = useState(false)
  const [selectedCite, setSelectedCite] = useState<Cite | null>(null)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [userToUpdatePassword, setUserToUpdatePassword] = useState<User | null>(null)
  const [passwordData, setPasswordData] = useState({ password: "", confirmPassword: "" })
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false)
  const [userToUpdateAccess, setUserToUpdateAccess] = useState<User | null>(null)
  const [isAccessConfirmDialogOpen, setIsAccessConfirmDialogOpen] = useState(false)

  // Sondages state
  const [sondages, setSondages] = useState<Sondage[]>([])
  const [isSondageDialogOpen, setIsSondageDialogOpen] = useState(false)
  const [isEditSondageDialogOpen, setIsEditSondageDialogOpen] = useState(false)
  const [isDeleteSondageDialogOpen, setIsDeleteSondageDialogOpen] = useState(false)
  const [selectedSondage, setSelectedSondage] = useState<Sondage | null>(null)
  const [sondageData, setSondageData] = useState({ code: "", title: "", message: "" })
  const [isViewSondageDialogOpen, setIsViewSondageDialogOpen] = useState(false)
  const [selectedSondageForView, setSelectedSondageForView] = useState<Sondage | null>(null)

  const [shouldThrowError, setShouldThrowError] = useState(false)
  const [accessData, setAccessData] = useState({
    dashboard: { read: true, write: false },
    contrats: { read: false, write: false },
    clients: { read: false, write: false },
    prospects: { read: false, write: false },
    terrains: { read: false, write: false },
    paiements: { read: false, write: false },
    comptabilites: { read: false, write: false },
    parametres: { read: false, write: false },
    contratsConstruction: { read: false, write: false },
    acquisitions: { read: false, write: false }
  })

  // Custom report dialog state
  const [isCustomReportDialogOpen, setIsCustomReportDialogOpen] = useState(false)
  const [reportStartDate, setReportStartDate] = useState("")
  const [reportEndDate, setReportEndDate] = useState("")

  // System configuration state
  const [systemConfig, setSystemConfig] = useState({
    reportFrequency: {
      daily: false,
      weekly: false,
      monthly: false,
      yearly: false
    },
    otpEnabled: false,
    constructionEnabled: true,
    contratConstructionEnabled: true
  })
  const [isLoadingSystemConfig, setIsLoadingSystemConfig] = useState(false)
  const [isSendingReport, setIsSendingReport] = useState(false)
  const [userStatistics, setUserStatistics] = useState<any>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [statsStartDate, setStatsStartDate] = useState("")
  const [statsEndDate, setStatsEndDate] = useState("")
  const [statsPreset, setStatsPreset] = useState<string>("")
  const [selectedUserStat, setSelectedUserStat] = useState<any>(null)
  const [isUserStatDetailDialogOpen, setIsUserStatDetailDialogOpen] = useState(false)
  const [statsViewMode, setStatsViewMode] = useState<"cards" | "table">("cards")
  const [isUserClientsDialogOpen, setIsUserClientsDialogOpen] = useState(false)
  const [userClientsList, setUserClientsList] = useState<any[]>([])
  const [isLoadingUserClients, setIsLoadingUserClients] = useState(false)
  const [isUserProspectsDialogOpen, setIsUserProspectsDialogOpen] = useState(false)
  const [userProspectsList, setUserProspectsList] = useState<any[]>([])
  const [isLoadingUserProspects, setIsLoadingUserProspects] = useState(false)
  const [newCite, setNewCite] = useState({
    code: "",
    nom: "",
    description: "",
    pays: "RDC",
    province: "Kinshasa",
    ville: "Kinshasa",
    commune: "",
    quartier: "",
    numero: "",
    reference: "",
    frais_cadastraux: 0,
    lat: "",
    lng: ""
  })

  // Bureaux state
  const [bureaux, setBureaux] = useState<Bureau[]>([])
  const [isLoadingBureaux, setIsLoadingBureaux] = useState(false)
  const [isBureauDialogOpen, setIsBureauDialogOpen] = useState(false)
  const [isSavingBureau, setIsSavingBureau] = useState(false)
  const [bureauSuccessOpen, setBureauSuccessOpen] = useState(false)
  const [bureauErrorOpen, setBureauErrorOpen] = useState(false)
  const [bureauErrorMessage, setBureauErrorMessage] = useState("")
  const [newBureau, setNewBureau] = useState({
    nom: "",
    adresse: { numero: "", avenue: "", quartier: "", commune: "", ville: "", pays: "RDC" },
    coordonnees: { lat: "", lng: "" },
    rayon: 500,
    ipsAutorisees: [] as string[],
    commentaire: ""
  })
  const [newBureauIpInput, setNewBureauIpInput] = useState("")
  const [isFetchingIp, setIsFetchingIp] = useState(false)
  const [selectedBureau, setSelectedBureau] = useState<Bureau | null>(null)
  const [isEditBureauDialogOpen, setIsEditBureauDialogOpen] = useState(false)
  const [isUpdatingBureau, setIsUpdatingBureau] = useState(false)
  const [isDeleteBureauDialogOpen, setIsDeleteBureauDialogOpen] = useState(false)
  const [isDeletingBureau, setIsDeletingBureau] = useState(false)
  const bureauGeo = useGeolocation()

  // Cadastral Document Types state
  const [cadastralDocumentTypes, setCadastralDocumentTypes] = useState<any[]>([])
  const [isLoadingCadastralTypes, setIsLoadingCadastralTypes] = useState(false)
  const [isCadastralTypeDialogOpen, setIsCadastralTypeDialogOpen] = useState(false)
  const [isEditCadastralTypeDialogOpen, setIsEditCadastralTypeDialogOpen] = useState(false)
  const [isDeleteCadastralTypeDialogOpen, setIsDeleteCadastralTypeDialogOpen] = useState(false)
  const [selectedCadastralType, setSelectedCadastralType] = useState<any>(null)
  const [newCadastralType, setNewCadastralType] = useState({
    titre: "",
    description: "",
    prix: ""
  })

  // Mobile News state
  const [carouselItems, setCarouselItems] = useState<NewsCarousel[]>([])
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([])
  const [isLoadingNews, setIsLoadingNews] = useState(false)
  const [isCarouselDialogOpen, setIsCarouselDialogOpen] = useState(false)
  const [isEditCarouselDialogOpen, setIsEditCarouselDialogOpen] = useState(false)
  const [isDeleteCarouselDialogOpen, setIsDeleteCarouselDialogOpen] = useState(false)
  const [selectedCarousel, setSelectedCarousel] = useState<NewsCarousel | null>(null)
  const [carouselForm, setCarouselForm] = useState({ imageUrl: "", titre: "", lien: "", ordre: 0, actif: true })
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false)
  const [isEditArticleDialogOpen, setIsEditArticleDialogOpen] = useState(false)
  const [isDeleteArticleDialogOpen, setIsDeleteArticleDialogOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)
  const [articleForm, setArticleForm] = useState({ titre: "", shortDesc: "", longDesc: "", cover: "", author: "", status: "draft" as "published" | "draft" })
  const [isSavingNews, setIsSavingNews] = useState(false)

  const handleSessionExpired = () => {
    localStorage.removeItem("authToken")
    setShowSessionError(false)
    router.push("/auth/login")
  }

  // Fonction de test pour déclencher une erreur
  const handleTestError = () => {
    // Provoquer une erreur intentionnelle pour tester la page d'erreur
    setShouldThrowError(true)
  }

  // Si shouldThrowError est true, provoquer une erreur lors du rendu
  if (shouldThrowError) {
    throw new Error("Erreur de test - Ceci est une erreur intentionnelle pour tester la page d'erreur personnalisée")
  }

  const fetchUser = useCallback(async () => {
    setIsLoading(true)
    const token = localStorage.getItem("authToken")
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  
    setUser(response.data)
  }, [toast, router])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("authToken")
      const params=`${process.env.NEXT_PUBLIC_API_URL}/users?module=parametres`
      console.log(params)
      const response = await axios.get(params, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setUsers(response.data)
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } if(axios.isAxiosError(error) && error.response?.status === 403){
        setShowPermissionError(true)
      }else {
        console.error("Error fetching users data:", error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [toast, router])

  const fetchCites = async () => {
    // const toastId = toast.loading("Récupération des cités...")
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/cites`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setCites(response.data)
    } catch (error) {
      console.error("Error fetching cites data:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } if(axios.isAxiosError(error) && error.response?.status === 403){
        setShowPermissionError(true)
      } else {
        toast.error("Impossible de récupérer les cités")
      }
    }
  }

  const fetchBureaux = async () => {
    setIsLoadingBureaux(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bureaux`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setBureaux(response.data.data || [])
    } catch (error) {
      console.error("Error fetching bureaux:", error)
    } finally {
      setIsLoadingBureaux(false)
    }
  }

  const capturePositionForBureau = async (target: 'new' | 'edit') => {
    try {
      const coords = await bureauGeo.getPosition()
      if (target === 'new') {
        setNewBureau(b => ({
          ...b,
          coordonnees: { lat: String(coords.latitude), lng: String(coords.longitude) },
        }))
      } else if (selectedBureau) {
        setSelectedBureau(b =>
          b ? { ...b, coordonnees: { lat: coords.latitude, lng: coords.longitude } } : b
        )
      }
      toast.success(`Position récupérée (précision ±${Math.round(coords.accuracy)} m)`)
    } catch (err: unknown) {
      toast.error((err as Error).message || "Impossible d'obtenir la position.")
    }
  }

  const handleToggleBureau = async (bureau: Bureau) => {
    try {
      const token = localStorage.getItem("authToken")
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/bureaux/${bureau._id}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } })
      fetchBureaux()
    } catch {
      toast.error("Erreur lors du changement de statut")
    }
  }

  // Récupère l'IP publique du réseau courant via un service externe (ipify.org)
  // On ne passe PAS par notre propre backend car en local il retournerait 127.0.0.1
  const fetchMonIp = async (target: 'new' | 'edit') => {
    setIsFetchingIp(true)
    try {
      const res = await axios.get("https://api.ipify.org?format=json")
      const ip: string = res.data.ip
      if (target === 'new') {
        setNewBureau(b => ({
          ...b,
          ipsAutorisees: b.ipsAutorisees.includes(ip) ? b.ipsAutorisees : [...b.ipsAutorisees, ip]
        }))
      } else if (selectedBureau) {
        setSelectedBureau(b => b
          ? { ...b, ipsAutorisees: (b.ipsAutorisees || []).includes(ip) ? b.ipsAutorisees : [...(b.ipsAutorisees || []), ip] }
          : b
        )
      }
      toast.success(`IP récupérée : ${ip}`)
    } catch {
      toast.error("Impossible de récupérer l'IP.")
    } finally {
      setIsFetchingIp(false)
    }
  }

  const handleCreateBureau = async () => {
    setIsSavingBureau(true)
    try {
      const token = localStorage.getItem("authToken")
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bureaux`,
        {
          ...newBureau,
          rayon: newBureau.rayon || 500,
          ipsAutorisees: newBureau.ipsAutorisees,
          coordonnees: {
            lat: newBureau.coordonnees.lat !== "" ? Number(newBureau.coordonnees.lat) : null,
            lng: newBureau.coordonnees.lng !== "" ? Number(newBureau.coordonnees.lng) : null,
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setIsBureauDialogOpen(false)
      setNewBureau({ nom: "", adresse: { numero: "", avenue: "", quartier: "", commune: "", ville: "", pays: "RDC" }, coordonnees: { lat: "", lng: "" }, rayon: 500, ipsAutorisees: [], commentaire: "" })
      setNewBureauIpInput("")
      fetchBureaux()
      setBureauSuccessOpen(true)
    } catch (error) {
      const msg = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : "Impossible de créer le bureau."
      setBureauErrorMessage(msg)
      setBureauErrorOpen(true)
    } finally {
      setIsSavingBureau(false)
    }
  }

  const handleUpdateBureau = async () => {
    if (!selectedBureau) return
    setIsUpdatingBureau(true)
    try {
      const token = localStorage.getItem("authToken")
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/bureaux/${selectedBureau._id}`,
        {
          ...selectedBureau,
          rayon: selectedBureau.rayon || 500,
          ipsAutorisees: selectedBureau.ipsAutorisees || [],
          coordonnees: {
            lat: selectedBureau.coordonnees.lat !== null ? Number(selectedBureau.coordonnees.lat) : null,
            lng: selectedBureau.coordonnees.lng !== null ? Number(selectedBureau.coordonnees.lng) : null,
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setIsEditBureauDialogOpen(false)
      fetchBureaux()
      setBureauSuccessOpen(true)
    } catch (error) {
      const msg = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : "Impossible de mettre à jour le bureau."
      setBureauErrorMessage(msg)
      setBureauErrorOpen(true)
    } finally {
      setIsUpdatingBureau(false)
    }
  }

  const handleDeleteBureau = async () => {
    if (!selectedBureau) return
    setIsDeletingBureau(true)
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/bureaux/${selectedBureau._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setIsDeleteBureauDialogOpen(false)
      fetchBureaux()
    } catch (error) {
      const msg = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : "Impossible de supprimer le bureau."
      setBureauErrorMessage(msg)
      setBureauErrorOpen(true)
    } finally {
      setIsDeletingBureau(false)
    }
  }

  const fetchSondages = async () => {
    try {
       
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sondages/texts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      // console.log(response.data)

      setSondages(response.data.data)
    } catch (error) {
      console.error("Error fetching sondages data:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error("Impossible de récupérer les sondages")
      }
    }
  }

  const fetchSystemConfig = async () => {
    try {
      setIsLoadingSystemConfig(true)
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/system/config?module=parametres`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.data && response.data.success) {
        setSystemConfig(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching system config:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        // If config doesn't exist, use defaults
        console.log("Using default system configuration")
      }
    } finally {
      setIsLoadingSystemConfig(false)
    }
  }

  const saveSystemConfig = async () => {
    try {
      setIsLoadingSystemConfig(true)
      const token = localStorage.getItem("authToken")
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/system/config?module=parametres`,
        systemConfig,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      
      if (response.data && response.data.success) {
        toast.success("Configuration système enregistrée avec succès")
        setSystemConfig(response.data.data)
      }
    } catch (error) {
      console.error("Error saving system config:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error("Impossible d'enregistrer la configuration système")
      }
    } finally {
      setIsLoadingSystemConfig(false)
    }
  }

  const handleReportFrequencyChange = (frequency: 'daily' | 'weekly' | 'monthly' | 'yearly', checked: boolean) => {
    setSystemConfig(prev => ({
      ...prev,
      reportFrequency: {
        ...prev.reportFrequency,
        [frequency]: checked
      }
    }))
  }

  const handleOtpToggle = (enabled: boolean) => {
    setSystemConfig(prev => ({
      ...prev,
      otpEnabled: enabled
    }))
  }

  const handleConstructionToggle = (enabled: boolean) => {
    setSystemConfig(prev => ({
      ...prev,
      constructionEnabled: enabled
    }))
  }

  const handleContratConstructionToggle = (enabled: boolean) => {
    setSystemConfig(prev => ({
      ...prev,
      contratConstructionEnabled: enabled
    }))
  }

  const sendReportNow = async (startDate?: string, endDate?: string) => {
    try {
      setIsSendingReport(true)
      const token = localStorage.getItem("authToken")
      
      // Construire les paramètres de requête
      const params = new URLSearchParams()
      params.append('module', 'parametres')
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/system/config/send-report?${params.toString()}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob', // Important: pour recevoir le fichier
        }
      )
      
      // Récupérer le nom du fichier depuis les headers
      const contentDisposition = response.headers['content-disposition']
      const dateRange = startDate && endDate 
        ? `${startDate}_${endDate}` 
        : new Date().toISOString().split('T')[0]
      let fileName = `rapport_personnalise_${dateRange}.xlsx`
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/)
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1]
        }
      }
      
      // Créer un blob et déclencher le téléchargement
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success("Rapport généré et téléchargé avec succès")
      setIsCustomReportDialogOpen(false)
      setReportStartDate("")
      setReportEndDate("")
    } catch (error) {
      console.error("Error sending report:", error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setShowSessionError(true)
        } else if (error.response?.status === 500) {
          // Si c'est une erreur serveur, essayer de lire le message d'erreur JSON
          try {
            const errorText = await error.response.data.text()
            const errorJson = JSON.parse(errorText)
            toast.error(errorJson.message || "Erreur lors de la génération du rapport")
          } catch {
            toast.error("Erreur lors de la génération du rapport")
          }
        } else {
          toast.error("Impossible de générer le rapport")
        }
      } else {
        toast.error("Impossible de générer le rapport")
      }
    } finally {
      setIsSendingReport(false)
    }
  }

  const handleCustomReportSubmit = () => {
    if (!reportStartDate || !reportEndDate) {
      toast.error("Veuillez sélectionner une date de début et une date de fin")
      return
    }
    
    if (new Date(reportStartDate) > new Date(reportEndDate)) {
      toast.error("La date de début doit être antérieure à la date de fin")
      return
    }
    
    sendReportNow(reportStartDate, reportEndDate)
  }

  const fetchUserStatistics = async () => {
    try {
      setIsLoadingStats(true)
      const token = localStorage.getItem("authToken")
      const params = new URLSearchParams()
      if (statsStartDate) params.append('startDate', statsStartDate)
      if (statsEndDate) params.append('endDate', statsEndDate)
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/system/user-statistics?module=parametres&${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      
      if (response.data.success) {
        setUserStatistics(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching user statistics:", error)
      toast.error("Erreur lors du chargement des statistiques")
    } finally {
      setIsLoadingStats(false)
    }
  }

  const applyStatsPreset = (preset: string) => {
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().split("T")[0]
    setStatsPreset(preset)
    if (preset === "today") {
      setStatsStartDate(fmt(today))
      setStatsEndDate(fmt(today))
    } else if (preset === "week") {
      const first = new Date(today)
      first.setDate(today.getDate() - today.getDay() + 1)
      setStatsStartDate(fmt(first))
      setStatsEndDate(fmt(today))
    } else if (preset === "month") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      setStatsStartDate(fmt(first))
      setStatsEndDate(fmt(today))
    } else if (preset === "year") {
      const first = new Date(today.getFullYear(), 0, 1)
      setStatsStartDate(fmt(first))
      setStatsEndDate(fmt(today))
    } else if (preset === "last30") {
      const start = new Date(today)
      start.setDate(today.getDate() - 30)
      setStatsStartDate(fmt(start))
      setStatsEndDate(fmt(today))
    }
  }

  const fetchUserProspects = async (userId: string) => {
    setIsLoadingUserProspects(true)
    setUserProspectsList([])
    setIsUserProspectsDialogOpen(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/prospects?commercialAttritre=${userId}&limit=1000&module=parametres`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const prospectsData = response.data.prospects || response.data || []
      setUserProspectsList(Array.isArray(prospectsData) ? prospectsData : [])
    } catch (error) {
      toast.error("Erreur lors du chargement des prospects")
    } finally {
      setIsLoadingUserProspects(false)
    }
  }

  const fetchUserClients = async (userId: string) => {
    setIsLoadingUserClients(true)
    setUserClientsList([])
    setIsUserClientsDialogOpen(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/clients?addBy=${userId}&limit=1000&module=parametres`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const { clients: clientsData } = response.data
      setUserClientsList(clientsData || [])
    } catch (error) {
      toast.error("Erreur lors du chargement des clients")
    } finally {
      setIsLoadingUserClients(false)
    }
  }

  const downloadUserStatisticsReport = async () => {
    try {
      setIsSendingReport(true)
      const token = localStorage.getItem("authToken")
      const params = new URLSearchParams()
      if (statsStartDate) params.append('startDate', statsStartDate)
      if (statsEndDate) params.append('endDate', statsEndDate)
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/system/user-statistics/report?module=parametres&${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      )
      
      const contentDisposition = response.headers['content-disposition']
      let fileName = `rapport_statistiques_utilisateurs_${new Date().toISOString().split('T')[0]}.xlsx`
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/)
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1]
        }
      }
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success("Rapport téléchargé avec succès")
    } catch (error) {
      console.error("Error downloading report:", error)
      toast.error("Erreur lors du téléchargement du rapport")
    } finally {
      setIsSendingReport(false)
    }
  }

  const fetchCadastralDocumentTypes = async () => {
    try {
      setIsLoadingCadastralTypes(true)
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/cadastral-document-types?isActive=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.data && response.data.success) {
        setCadastralDocumentTypes(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching cadastral document types:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error("Erreur lors de la récupération des types de documents cadastraux")
      }
    } finally {
      setIsLoadingCadastralTypes(false)
    }
  }

  const handleCreateCadastralType = async () => {
    if (!newCadastralType.titre || !newCadastralType.prix) {
      toast.error("Veuillez remplir le titre et le prix")
      return
    }

    const toastId = toast.loading("Création du type de document...")
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/cadastral-document-types`,
        {
          titre: newCadastralType.titre,
          description: newCadastralType.description,
          prix: parseFloat(newCadastralType.prix)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (response.data && response.data.success) {
        toast.success("Type de document créé avec succès", { id: toastId })
        fetchCadastralDocumentTypes()
        setIsCadastralTypeDialogOpen(false)
        setNewCadastralType({ titre: "", description: "", prix: "" })
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error(error.response?.data?.message || "Erreur lors de la création du type de document", { id: toastId })
      }
    }
  }

  const handleEditCadastralType = (type: any) => {
    setSelectedCadastralType(type)
    setNewCadastralType({
      titre: type.titre,
      description: type.description || "",
      prix: type.prix.toString()
    })
    setIsEditCadastralTypeDialogOpen(true)
  }

  const handleUpdateCadastralType = async () => {
    if (!selectedCadastralType || !newCadastralType.titre || !newCadastralType.prix) {
      toast.error("Veuillez remplir le titre et le prix")
      return
    }

    const toastId = toast.loading("Mise à jour du type de document...")
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/cadastral-document-types/${selectedCadastralType._id}`,
        {
          titre: newCadastralType.titre,
          description: newCadastralType.description,
          prix: parseFloat(newCadastralType.prix)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (response.data && response.data.success) {
        toast.success("Type de document mis à jour avec succès", { id: toastId })
        fetchCadastralDocumentTypes()
        setIsEditCadastralTypeDialogOpen(false)
        setSelectedCadastralType(null)
        setNewCadastralType({ titre: "", description: "", prix: "" })
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error(error.response?.data?.message || "Erreur lors de la mise à jour du type de document", { id: toastId })
      }
    }
  }

  const handleDeleteCadastralType = (type: any) => {
    setSelectedCadastralType(type)
    setIsDeleteCadastralTypeDialogOpen(true)
  }

  const confirmDeleteCadastralType = async () => {
    if (!selectedCadastralType) return

    const toastId = toast.loading("Suppression du type de document...")
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/cadastral-document-types/${selectedCadastralType._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (response.data && response.data.success) {
        toast.success("Type de document supprimé avec succès", { id: toastId })
        fetchCadastralDocumentTypes()
        setIsDeleteCadastralTypeDialogOpen(false)
        setSelectedCadastralType(null)
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error("Erreur lors de la suppression du type de document", { id: toastId })
      }
    }
  }


  const fetchMobileNews = async () => {
    try {
      setIsLoadingNews(true)
      const token = localStorage.getItem("authToken")
      const [carouselRes, articlesRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/news/carousel`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/news`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      setCarouselItems(carouselRes.data?.carousel ?? [])
      setNewsArticles(articlesRes.data?.news ?? [])
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) setShowSessionError(true)
      else toast.error("Erreur lors de la récupération des news")
    } finally {
      setIsLoadingNews(false)
    }
  }

  const handleSaveCarousel = async (isEdit: boolean) => {
    if (!carouselForm.imageUrl) { toast.error("L'URL de l'image est obligatoire"); return }
    setIsSavingNews(true)
    const toastId = toast.loading(isEdit ? "Mise à jour..." : "Création...")
    try {
      const token = localStorage.getItem("authToken")
      if (isEdit && selectedCarousel) {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/news/carousel/${selectedCarousel._id}`, carouselForm, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/news/carousel`, carouselForm, { headers: { Authorization: `Bearer ${token}` } })
      }
      toast.success(isEdit ? "Carrousel mis à jour" : "Carrousel créé", { id: toastId })
      fetchMobileNews()
      setIsCarouselDialogOpen(false)
      setIsEditCarouselDialogOpen(false)
      setCarouselForm({ imageUrl: "", titre: "", lien: "", ordre: 0, actif: true })
    } catch { toast.error("Erreur lors de la sauvegarde", { id: toastId }) }
    finally { setIsSavingNews(false) }
  }

  const handleDeleteCarousel = async () => {
    if (!selectedCarousel) return
    const toastId = toast.loading("Suppression...")
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/news/carousel/${selectedCarousel._id}`, { headers: { Authorization: `Bearer ${token}` } })
      toast.success("Supprimé", { id: toastId })
      fetchMobileNews()
      setIsDeleteCarouselDialogOpen(false)
    } catch { toast.error("Erreur lors de la suppression", { id: toastId }) }
  }

  const handleSaveArticle = async (isEdit: boolean) => {
    if (!articleForm.titre) { toast.error("Le titre est obligatoire"); return }
    setIsSavingNews(true)
    const toastId = toast.loading(isEdit ? "Mise à jour..." : "Création...")
    try {
      const token = localStorage.getItem("authToken")
      if (isEdit && selectedArticle) {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/news/${selectedArticle._id}`, articleForm, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/news`, articleForm, { headers: { Authorization: `Bearer ${token}` } })
      }
      toast.success(isEdit ? "Article mis à jour" : "Article créé", { id: toastId })
      fetchMobileNews()
      setIsArticleDialogOpen(false)
      setIsEditArticleDialogOpen(false)
      setArticleForm({ titre: "", shortDesc: "", longDesc: "", cover: "", author: "", status: "draft" })
    } catch { toast.error("Erreur lors de la sauvegarde", { id: toastId }) }
    finally { setIsSavingNews(false) }
  }

  const handleDeleteArticle = async () => {
    if (!selectedArticle) return
    const toastId = toast.loading("Suppression...")
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/news/${selectedArticle._id}`, { headers: { Authorization: `Bearer ${token}` } })
      toast.success("Supprimé", { id: toastId })
      fetchMobileNews()
      setIsDeleteArticleDialogOpen(false)
    } catch { toast.error("Erreur lors de la suppression", { id: toastId }) }
  }

  useEffect(() => {
    fetchUsers()
    fetchUser()
    fetchCites()
    fetchBureaux()
    fetchSondages()
    fetchSystemConfig()
    fetchCadastralDocumentTypes()
    fetchMobileNews()
  }, [fetchUsers, fetchUser])

  const handleUserAdded = () => {
    fetchUsers()
    setIsDialogOpen(false)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsEditDialogOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const handleCreateCite = async () => {
    const toastId = toast.loading("Création de la cité...")
    try {
      const token = localStorage.getItem("authToken")
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/cites`,
        newCite,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      toast.success("Cité créée avec succès", { id: toastId })
      fetchCites()
      setIsCiteDialogOpen(false)
      setNewCite({
        code: "",
        nom: "",
        description: "",
        pays: "RDC",
        province: "Kinshasa",
        ville: "Kinshasa",
        commune: "",
        quartier: "",
        numero: "",
        reference: "",
        frais_cadastraux: 0,
        lat: "",
        lng: ""
      })
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error("Impossible de créer la cité :"+error.response?.data.message, { id: toastId })
      }
    }
  }

  const handleUpdateCite = async () => {
    if (!selectedCite) return
    const toastId = toast.loading("Mise à jour de la cité...")
    try {
      const token = localStorage.getItem("authToken")
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/cites/${selectedCite._id}`,
        selectedCite,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      toast.success("Cité mise à jour avec succès", { id: toastId })
      fetchCites()
      setIsEditCiteDialogOpen(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error("Impossible de mettre à jour la cité", { id: toastId })
      }
    }
  }

  const handleDeleteCite = async () => {
    if (!selectedCite) return
    const toastId = toast.loading("Suppression de la cité...")
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/cites/${selectedCite._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      toast.success("Cité supprimée avec succès", { id: toastId })
      fetchCites()
      setIsDeleteCiteDialogOpen(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error("Impossible de supprimer la cité", { id: toastId })
      }
    }
  }

  const confirmDelete = async () => {
    if (!selectedUser) return
    const toastId = toast.loading("Suppression de l'utilisateur...")
    try {
     axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/${selectedUser._id}/status`, {
      status: "deleted",
     }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
     })

      toast.success("L'utilisateur a été supprimé avec succès.", { id: toastId })
      fetchUsers()
    } catch (error: any) {
      console.error("Error deleting user:", error)
      if (error.message === "Unauthorized") {
        router.push("/auth/login")
      } else {
        toast.error("Impossible de supprimer l'utilisateur.", { id: toastId })
      }
    } finally {
      setIsDeleteDialogOpen(false)
      setSelectedUser(null)
    }
  }

  const handleResetToken = async (userId: string) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/reset-token`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.status === 200) {
        toast.success("Lien de réinitialisation envoyé avec succès")
      } else {
        toast.error("Erreur lors de l'envoi du lien de réinitialisation")
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi du lien de réinitialisation")
    }
  }

  const handleDeactivateUser = (user: User) => {
    setUserToDeactivate(user)
    setIsDeactivateDialogOpen(true)
  }

  const confirmDeactivate = async () => {
    if (!userToDeactivate) return
    
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/${userToDeactivate._id}/status`, {
        status: userToDeactivate.status === "active" ? "desactivated" : "active",
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.status === 200) {
        toast.success("Compte désactivé avec succès")
        fetchUsers() // Refresh the users list
      } else {
        toast.error("Erreur lors de la désactivation du compte")
      }
    } catch (error) {
      toast.error("Erreur lors de la désactivation du compte")
    } finally {
      setIsDeactivateDialogOpen(false)
      setUserToDeactivate(null)
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/role?module=parametres`, {
        role: newRole,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.status === 200) {
        toast.success("Rôle mis à jour avec succès")
        fetchUsers() // Refresh the users list
      } else {
        toast.error("Erreur lors de la mise à jour du rôle")
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du rôle")
    }
  }

  const handleUpdatePassword = (user: User) => {
    setUserToUpdatePassword(user)
    setPasswordData({ password: "", confirmPassword: "" })
    setIsPasswordDialogOpen(true)
  }

  const handleUpdateAccess = (user: User) => {
    setUserToUpdateAccess(user)
    const defaults = {
      dashboard: { read: true, write: false },
      contrats: { read: false, write: false },
      clients: { read: false, write: false },
      prospects: { read: false, write: false },
      terrains: { read: false, write: false },
      paiements: { read: false, write: false },
      comptabilites: { read: false, write: false },
      parametres: { read: false, write: false },
      contratsConstruction: { read: false, write: false },
      acquisitions: { read: false, write: false }
    }
    setAccessData({ ...defaults, ...(user.permissions || {}) })
    setIsAccessDialogOpen(true)
  }

  const confirmPasswordUpdate = async () => {
    if (!userToUpdatePassword) return
    
    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }
    
    if (passwordData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères")
      return
    }
    
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/${userToUpdatePassword._id}/password?module=parametres`, {
        password: passwordData.password,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.status === 200) {
        toast.success("Mot de passe mis à jour avec succès")
        setIsPasswordDialogOpen(false)
        setUserToUpdatePassword(null)
        setPasswordData({ password: "", confirmPassword: "" })
      } else {
        toast.error("Erreur lors de la mise à jour du mot de passe")
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du mot de passe")
    }
  }

  const handleAccessPermissionChange = (module: string, permission: 'read' | 'write', value: boolean) => {
    setAccessData(prev => ({
      ...prev,
      [module]: {
        ...prev[module as keyof typeof prev],
        [permission]: value
      }
    }))
  }

  const confirmAccessUpdate = async () => {
    if (!userToUpdateAccess) return
    
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/${userToUpdateAccess._id}/permissions?module=parametres`, {
        permissions: accessData,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.status === 200) {
        toast.success("Accès mis à jour avec succès")
        setIsAccessConfirmDialogOpen(false)
        setIsAccessDialogOpen(false)
        setUserToUpdateAccess(null)
        fetchUsers() // Refresh the users list
      } else {
        toast.error("Erreur lors de la mise à jour des accès")
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour des accès")
    }
  }

  // Sondage handlers
  const handleCreateSondage = async () => {
    if ( !sondageData.title || !sondageData.message) {
      toast.error("Veuillez remplir tous les champs")
      return
    }

    const toastId = toast.loading("Création de la diffusion...")
    try {
      const token = localStorage.getItem("authToken")
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/sondages/texts`,
        sondageData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
      toast.success("Diffusion créée avec succès", { id: toastId })
      fetchSondages()
      setIsSondageDialogOpen(false)
      setSondageData({ code: "", title: "", message: "" })
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error("Impossible de créer la diffusion: " + (error.response?.data?.message || "Erreur inconnue"), { id: toastId })
      }
    }
  }

  const handleEditSondage = (sondage: Sondage) => {
    setSelectedSondage(sondage)
    setSondageData({ code: sondage.code, title: sondage.title, message: sondage.message || "" })
    setIsEditSondageDialogOpen(true)
  }

  const handleUpdateSondage = async () => {
    if (!selectedSondage) return
    if (!sondageData.code || !sondageData.title || !sondageData.message) {
      toast.error("Veuillez remplir tous les champs")
      return
    }

    const toastId = toast.loading("Mise à jour de la diffusion...")
    try {
      const token = localStorage.getItem("authToken")
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/sondages/texts/${selectedSondage._id}`,
        sondageData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
      toast.success("Diffusion mise à jour avec succès", { id: toastId })
      fetchSondages()
      setIsEditSondageDialogOpen(false)
      setSelectedSondage(null)
      setSondageData({ code: "", title: "", message: "" })
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error("Impossible de mettre à jour la diffusion: " + (error.response?.data?.message || "Erreur inconnue"), { id: toastId })
      }
    }
  }

  const handleDeleteSondage = (sondage: Sondage) => {
    setSelectedSondage(sondage)
    setIsDeleteSondageDialogOpen(true)
  }

  const confirmDeleteSondage = async () => {
    if (!selectedSondage) return

    const toastId = toast.loading("Suppression de la diffusion...")
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/sondages/texts/${selectedSondage._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      toast.success("Diffusion supprimée avec succès", { id: toastId })
      fetchSondages()
      setIsDeleteSondageDialogOpen(false)
      setSelectedSondage(null)
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setShowSessionError(true)
      } else {
        toast.error("Impossible de supprimer la diffusion: " + (error.response?.data?.message || "Erreur inconnue"), { id: toastId })
      }
    }
  }


  const handleViewSondage = (sondage: Sondage) => {
    setSelectedSondageForView(sondage)
    setIsViewSondageDialogOpen(true)
  }

  return (
    <>
      <ErrorDialog
        isOpen={showSessionError}
        onClose={handleSessionExpired}
        title="Session expirée"
        message="Session expirée, veuillez vous reconnecter."
      />

<ErrorDialog
        isOpen={showPermissionError}
         onClose={() => setShowPermissionError(false)}
        title="Permission refusée"
        message="Vous ne disposez pas de permission pour acceder à ce module"
      />
      
      {/* Header Section */}
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                Paramètres
              </h1>
              <p className="text-muted-foreground">Gérez les paramètres de votre système</p>
            </div>
          </div>
          <Button
            onClick={handleTestError}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Tester la page d'erreur
          </Button>
        </div>

        <Separator className="my-6" />

        <Tabs defaultValue="users" className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex w-full min-w-max bg-gray-50/50 dark:bg-slate-800/50 p-1 rounded-xl h-auto">
              <TabsTrigger value="users" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm whitespace-nowrap px-4 py-2">
                <Users className="h-4 w-4" />
                <span>Utilisateurs</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm whitespace-nowrap px-4 py-2">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger value="cites" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm whitespace-nowrap px-4 py-2">
                <Building2 className="h-4 w-4" />
                <span>Cités</span>
              </TabsTrigger>
              <TabsTrigger value="diffusions" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm whitespace-nowrap px-4 py-2">
                <Mail className="h-4 w-4" />
                <span>Diffusions</span>
              </TabsTrigger>
              <TabsTrigger value="cadastral-docs" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm whitespace-nowrap px-4 py-2">
                <FileText className="h-4 w-4" />
                <span>Documents Cadastraux</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm whitespace-nowrap px-4 py-2">
                <Server className="h-4 w-4" />
                <span>Système</span>
              </TabsTrigger>
              <TabsTrigger value="statistics" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm whitespace-nowrap px-4 py-2">
                <BarChart3 className="h-4 w-4" />
                <span>Statistiques</span>
              </TabsTrigger>
              <TabsTrigger value="bureaux" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm whitespace-nowrap px-4 py-2">
                <MapPin className="h-4 w-4" />
                <span>Bureaux</span>
              </TabsTrigger>
              <TabsTrigger value="mobile-news" className="flex items-center space-x-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm whitespace-nowrap px-4 py-2">
                <Newspaper className="h-4 w-4" />
                <span>News Mobile</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="space-y-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-900/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-semibold flex items-center space-x-2">
                      <Shield className="h-6 w-6 text-blue-600" />
                      <span>Gestion des Utilisateurs</span>
                    </CardTitle>
                    <CardDescription className="text-base">
                      Gérez les utilisateurs qui ont accès au système
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Icons.plus className="mr-2 h-4 w-4" />
                    Nouveau Utilisateur
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="flex flex-col items-center space-y-4">
                      <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-muted-foreground">Chargement des utilisateurs...</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
                    <Table>
                      <TableHeader className="bg-gray-50/50 dark:bg-slate-800/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Nom</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Email</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Rôle</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Date d'enregistrement</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Dernière connexion</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Statut</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((userItem) => (
                          <TableRow 
                            key={userItem._id} 
                            className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/dashboard/settings/users/${userItem._id}`)}
                          >
                            <TableCell className="font-medium">{userItem.nom}</TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">{userItem.email}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={userItem.role === "Admin" ? "default" : "secondary"}
                                className={cn(
                                  userItem.role === "Admin" 
                                    ? "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                    : "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                                )}
                              >
                                {userItem.role === "Admin" ? "Admin" : "Agent"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {new Date(userItem.dateCreated).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {userItem.lastLogon ? new Date(userItem.lastLogon).toLocaleDateString() : "Jamais connecté"}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className={cn(
                                  userItem.status === "active" 
                                    ? "border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-400 dark:bg-green-900/20"
                                    : userItem.status === "desactivated"
                                    ? "border-orange-200 text-orange-700 bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:bg-orange-900/20"
                                    : "border-red-200 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20"
                                )}
                              >
                                {userItem.status === "active" ? "Actif" : userItem.status === "desactivated" ? "Inactif" : "Supprimé"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              {userItem.status !== "deleted" && user?._id !== userItem._id && user?.role === "Admin" && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-slate-700">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Ouvrir le menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => handleEditUser(userItem)}>
                                      <Edit3 className="mr-2 h-4 w-4" />
                                      Modifier cet utilisateur
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleResetToken(userItem._id)}>
                                      <Mail className="mr-2 h-4 w-4" />
                                      Renvoyer le lien de réinitialisation
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeactivateUser(userItem)}>
                                      <UserX className="mr-2 h-4 w-4" />
                                      {userItem.status === "active" ? "Désactiver ce compte" : "Activer ce compte"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateUserRole(userItem._id, userItem.role === "Admin" ? "Agent" : "Admin")}>
                                      <Edit3 className="mr-2 h-4 w-4" />
                                      Changer en {userItem.role === "Admin" ? "Agent" : "Admin"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdatePassword(userItem)}>
                                      <Key className="mr-2 h-4 w-4" />
                                      Mettre à jour le mot de passe
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateAccess(userItem)}>
                                      <Lock className="mr-2 h-4 w-4" />
                                      Mettre à jour les accès
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteUser(userItem)} className="text-destructive focus:text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Supprimer l'utilisateur
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-900/50">
              <CardHeader className="pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-semibold flex items-center space-x-2">
                    <User className="h-6 w-6 text-blue-600" />
                    <span>Mon Profile</span>
                  </CardTitle>
                  <CardDescription className="text-base">
                    Gérez vos informations personnelles et vos préférences
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {user && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom complet</Label>
                          <div className="relative">
                            <Input 
                              id="name" 
                              value={user.nom} 
                              disabled 
                              className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 font-medium"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <User className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Adresse email</Label>
                          <div className="relative">
                            <Input 
                              id="email" 
                              type="email" 
                              value={user.email} 
                              disabled 
                              className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <Mail className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="role" className="text-sm font-medium text-gray-700 dark:text-gray-300">Rôle dans le système</Label>
                          <div className="relative">
                            <Input 
                              id="role" 
                              value={user.role} 
                              disabled 
                              className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <Shield className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="created" className="text-sm font-medium text-gray-700 dark:text-gray-300">Date d'enregistrement</Label>
                          <div className="relative">
                            <Input 
                              id="created" 
                              value={new Date(user.dateCreated).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })} 
                              disabled 
                              className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <Clock className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastLogin" className="text-sm font-medium text-gray-700 dark:text-gray-300">Dernière connexion</Label>
                          <div className="relative">
                            <Input 
                              id="lastLogin" 
                              value={user.lastLogon ? new Date(user.lastLogon).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : "Jamais connecté"} 
                              disabled 
                              className="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <Clock className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Statut du compte</Label>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline"
                              className="border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-400 dark:bg-green-900/20 px-3 py-1"
                            >
                              Actif
                            </Badge>
                            <span className="text-sm text-gray-500">Compte en bon état</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900 dark:text-blue-300">Informations importantes</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Pour modifier vos informations personnelles, veuillez contacter votre administrateur système.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cites" className="space-y-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-900/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-semibold flex items-center space-x-2">
                      <Building2 className="h-6 w-6 text-blue-600" />
                      <span>Gestion des Cités</span>
                    </CardTitle>
                    <CardDescription className="text-base">
                      Gérez les cités disponibles dans le système
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setIsCiteDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Icons.plus className="mr-2 h-4 w-4" />
                    Nouvelle Cité
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
                  <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-slate-800/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Code</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Nom</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Description</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Adresse</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Ajouté par</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Date d'ajout</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cites.map((cite) => (
                        <TableRow key={cite._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <TableCell className="font-medium">
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                              {cite.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{cite.nom}</TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {cite.description || "Aucune description"}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400 max-w-xs">
                            <div className="text-sm">
                              {[cite.pays, cite.province, cite.ville, cite.commune, cite.quartier, cite.numero, cite.reference]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">{cite.addBy.nom || "Aucun utilisateur"}</TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {new Date(cite.createdAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCite(cite)
                                setIsEditCiteDialogOpen(true)
                              }}
                              className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCite(cite)
                                setIsDeleteCiteDialogOpen(true)
                              }}
                              className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {cites.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center space-y-4">
                              <Building2 className="h-12 w-12 text-gray-300" />
                              <div className="text-center">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Aucune cité disponible</h3>
                                <p className="text-gray-500 mt-1">Commencez par créer votre première cité</p>
                              </div>
                              <Button 
                                onClick={() => setIsCiteDialogOpen(true)}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                              >
                                <Icons.plus className="mr-2 h-4 w-4" />
                                Créer une cité
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diffusions" className="space-y-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-900/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-blue-900 to-purple-900 bg-clip-text text-transparent">
                        Diffusions
                      </CardTitle>
                      <CardDescription className="text-base">
                        Gérer les textes des diffusions à envoyer aux clients
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => router.push('/dashboard/sondages/new-sondage')}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <Icons.send className="mr-2 h-4 w-4" />
                      Envoyer les diffusions
                    </Button>
                    <Button
                      onClick={() => {
                        setSondageData({ code: "", title: "", message: "" })
                        setIsSondageDialogOpen(true)
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <Icons.plus className="mr-2 h-4 w-4" />
                      Nouvelle diffusion
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-gray-200 dark:border-slate-700">
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">#</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Titre</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sondages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <div className="flex flex-col items-center space-y-3 text-gray-500">
                            <Mail className="h-12 w-12 text-gray-300" />
                            <p className="text-lg font-medium">Aucune diffusion</p>
                            <p className="text-sm">Commencez par créer une nouvelle diffusion</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sondages.map((sondage, index) => (
                        <TableRow 
                          key={sondage._id} 
                          className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                          onClick={() => handleViewSondage(sondage)}
                        >
                          <TableCell className="font-medium text-gray-700 dark:text-gray-300">{sondage.code}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{sondage.title}</div>
                              <div className="text-sm text-gray-500 line-clamp-2">{sondage.message}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditSondage(sondage)
                                }}
                                className="border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteSondage(sondage)
                                }}
                                className="border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cadastral-docs" className="space-y-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-900/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-semibold flex items-center space-x-2">
                      <FileText className="h-6 w-6 text-blue-600" />
                      <span>Types de Documents Cadastraux</span>
                    </CardTitle>
                    <CardDescription className="text-base">
                      Gérez les types de documents cadastraux et leurs prix
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setNewCadastralType({ titre: "", description: "", prix: "" })
                      setIsCadastralTypeDialogOpen(true)
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Icons.plus className="mr-2 h-4 w-4" />
                    Type de document
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
                  <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-slate-800/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Titre</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Description</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Prix (USD)</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Ajouté par</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Date d'ajout</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingCadastralTypes ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex items-center justify-center">
                              <Icons.spinner className="h-6 w-6 animate-spin text-blue-600" />
                              <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : cadastralDocumentTypes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex flex-col items-center space-y-4">
                              <FileText className="h-12 w-12 text-gray-300" />
                              <div className="text-center">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Aucun type de document disponible</h3>
                                <p className="text-gray-500 mt-1">Commencez par créer votre premier type de document cadastral</p>
                              </div>
                              <Button 
                                onClick={() => {
                                  setNewCadastralType({ titre: "", description: "", prix: "" })
                                  setIsCadastralTypeDialogOpen(true)
                                }}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                              >
                                <Icons.plus className="mr-2 h-4 w-4" />
                                Créer un type
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        cadastralDocumentTypes.map((type) => (
                          <TableRow key={type._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <TableCell className="font-medium">{type.titre}</TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
                              {type.description || "Aucune description"}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              ${type.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {type.addBy ? `${type.addBy.prenom || ''} ${type.addBy.nom || ''}`.trim() || "Système" : "Système"}
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {new Date(type.createdAt).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditCadastralType(type)}
                                className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCadastralType(type)}
                                className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-900/50">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <Server className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-blue-900 to-purple-900 bg-clip-text text-transparent">
                      Configuration Système
                    </CardTitle>
                    <CardDescription className="text-base">
                      Gérez les paramètres système et les rapports automatiques
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Report Configuration */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Rapports Automatiques</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Sélectionnez la fréquence d'envoi des rapports. Les rapports incluent les données des clients, prospects, paiements et contrats dans un fichier Excel.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <Checkbox
                          id="report-daily"
                          checked={systemConfig.reportFrequency.daily}
                          onCheckedChange={(checked) => handleReportFrequencyChange('daily', checked as boolean)}
                        />
                        <Label htmlFor="report-daily" className="flex-1 cursor-pointer">
                          <div className="font-medium">Journalièrement</div>
                          <div className="text-sm text-gray-500">Rapport envoyé chaque jour à 23h59</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <Checkbox
                          id="report-weekly"
                          checked={systemConfig.reportFrequency.weekly}
                          onCheckedChange={(checked) => handleReportFrequencyChange('weekly', checked as boolean)}
                        />
                        <Label htmlFor="report-weekly" className="flex-1 cursor-pointer">
                          <div className="font-medium">Par semaine</div>
                          <div className="text-sm text-gray-500">Rapport envoyé à la fin de chaque semaine</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <Checkbox
                          id="report-monthly"
                          checked={systemConfig.reportFrequency.monthly}
                          onCheckedChange={(checked) => handleReportFrequencyChange('monthly', checked as boolean)}
                        />
                        <Label htmlFor="report-monthly" className="flex-1 cursor-pointer">
                          <div className="font-medium">Par mois</div>
                          <div className="text-sm text-gray-500">Rapport envoyé à la fin de chaque mois</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <Checkbox
                          id="report-yearly"
                          checked={systemConfig.reportFrequency.yearly}
                          onCheckedChange={(checked) => handleReportFrequencyChange('yearly', checked as boolean)}
                        />
                        <Label htmlFor="report-yearly" className="flex-1 cursor-pointer">
                          <div className="font-medium">Par année</div>
                          <div className="text-sm text-gray-500">Rapport envoyé à la fin de chaque année</div>
                        </Label>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => setIsCustomReportDialogOpen(true)}
                        disabled={isSendingReport}
                        variant="outline"
                        className="w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700"
                      >
                        <Icons.send className="mr-2 h-4 w-4" />
                        Envoyer un rapport personnalisé
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* OTP Configuration */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Connexion par OTP</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Activez la connexion par code OTP (One-Time Password) pour une sécurité renforcée.
                    </p>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Activer la connexion par OTP</div>
                        <div className="text-sm text-gray-500">Les utilisateurs devront utiliser un code OTP pour se connecter</div>
                      </div>
                      <Switch
                        checked={systemConfig.otpEnabled}
                        onCheckedChange={handleOtpToggle}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Construction Module Configuration */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Module Construction</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Activez ou désactivez le module Qavah Construction. Si désactivé, l'option sera masquée dans le menu.
                    </p>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Activer Contrat Construction (QavahLand)</div>
                        <div className="text-sm text-gray-500">
                          {systemConfig.contratConstructionEnabled
                            ? "La section Contrat Construction est visible dans le menu QavahLand"
                            : "La section Contrat Construction sera masquée du menu QavahLand"}
                        </div>
                      </div>
                      <Switch
                        checked={systemConfig.contratConstructionEnabled}
                        onCheckedChange={handleContratConstructionToggle}
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={saveSystemConfig}
                    disabled={isLoadingSystemConfig}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    {isLoadingSystemConfig ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Icons.check className="mr-2 h-4 w-4" />
                        Enregistrer les configurations
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-5">
            {/* Header + Controls */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Performance des Commerciaux</h2>
                    <p className="text-sm text-muted-foreground">Activité et résultats par période</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={statsViewMode === "cards" ? "default" : "outline"}
                    onClick={() => setStatsViewMode("cards")}
                    className="h-8 px-3"
                  >
                    <Award className="h-3.5 w-3.5 mr-1.5" />
                    Cartes
                  </Button>
                  <Button
                    size="sm"
                    variant={statsViewMode === "table" ? "default" : "outline"}
                    onClick={() => setStatsViewMode("table")}
                    className="h-8 px-3"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Tableau
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <Card className="border border-gray-200 dark:border-slate-700 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  {/* Period presets */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs text-muted-foreground self-center mr-1 flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Période :
                    </span>
                    {[
                      { key: "today", label: "Aujourd'hui" },
                      { key: "week", label: "Cette semaine" },
                      { key: "month", label: "Ce mois" },
                      { key: "year", label: "Cette année" },
                      { key: "last30", label: "30 derniers jours" },
                    ].map((p) => (
                      <button
                        key={p.key}
                        onClick={() => applyStatsPreset(p.key)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border transition-all font-medium",
                          statsPreset === p.key
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                    {statsPreset && (
                      <button
                        onClick={() => { setStatsPreset(""); setStatsStartDate(""); setStatsEndDate("") }}
                        className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-all font-medium"
                      >
                        ✕ Effacer
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[140px]">
                      <Label className="text-xs text-muted-foreground mb-1 block">Date de début</Label>
                      <Input
                        type="date"
                        value={statsStartDate}
                        onChange={(e) => { setStatsStartDate(e.target.value); setStatsPreset("custom") }}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <Label className="text-xs text-muted-foreground mb-1 block">Date de fin</Label>
                      <Input
                        type="date"
                        value={statsEndDate}
                        onChange={(e) => { setStatsEndDate(e.target.value); setStatsPreset("custom") }}
                        className="h-9 text-sm"
                      />
                    </div>
                    <Button
                      onClick={fetchUserStatistics}
                      disabled={isLoadingStats}
                      className="h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                    >
                      {isLoadingStats ? (
                        <><Icons.spinner className="h-4 w-4 animate-spin mr-2" />Chargement...</>
                      ) : (
                        <><RefreshCw className="h-4 w-4 mr-2" />Actualiser</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadUserStatisticsReport}
                      disabled={isSendingReport || !userStatistics}
                      className="h-9"
                    >
                      {isSendingReport ? (
                        <><Icons.spinner className="h-4 w-4 animate-spin mr-2" />Export...</>
                      ) : (
                        <><Download className="h-4 w-4 mr-2" />Excel</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content */}
            {isLoadingStats ? (
              <div className="flex flex-col justify-center items-center py-20 gap-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Icons.spinner className="h-6 w-6 animate-spin text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground">Chargement des statistiques...</p>
              </div>
            ) : userStatistics ? (
              <div className="space-y-5">
                {/* KPI Summary Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    {
                      label: "Prospects",
                      value: userStatistics.totals.prospects,
                      icon: Target,
                      color: "from-violet-500 to-purple-600",
                      bg: "bg-violet-50 dark:bg-violet-900/20",
                      text: "text-violet-600"
                    },
                    {
                      label: "Clients",
                      value: userStatistics.totals.clients,
                      icon: Users,
                      color: "from-blue-500 to-cyan-600",
                      bg: "bg-blue-50 dark:bg-blue-900/20",
                      text: "text-blue-600"
                    },
                    {
                      label: "Montant",
                      value: `$${(userStatistics.totals.terrainTotalValue || 0).toLocaleString()}`,
                      icon: Zap,
                      color: "from-green-500 to-emerald-600",
                      bg: "bg-green-50 dark:bg-green-900/20",
                      text: "text-green-600"
                    },
                    {
                      label: "Contrats",
                      value: userStatistics.totals.contracts,
                      icon: FileText,
                      color: "from-orange-500 to-amber-600",
                      bg: "bg-orange-50 dark:bg-orange-900/20",
                      text: "text-orange-600"
                    },
                    {
                      label: "Revenus (USD)",
                      value: `$${(userStatistics.totals.totalRevenue || 0).toLocaleString()}`,
                      icon: DollarSign,
                      color: "from-pink-500 to-rose-600",
                      bg: "bg-pink-50 dark:bg-pink-900/20",
                      text: "text-pink-600"
                    }
                  ].map((kpi) => (
                    <Card key={kpi.label} className="border-0 shadow-sm overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", kpi.bg)}>
                            <kpi.icon className={cn("h-4 w-4", kpi.text)} />
                          </div>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Date range info */}
                {(statsStartDate || statsEndDate) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg px-3 py-2">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>
                      Période : {statsStartDate ? new Date(statsStartDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "..."}
                      {" → "}
                      {statsEndDate ? new Date(statsEndDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "..."}
                    </span>
                    <span className="ml-auto font-medium text-blue-600">{userStatistics.users.length} commerciaux</span>
                  </div>
                )}

                {/* Cards View */}
                {statsViewMode === "cards" && (
                  <div className="space-y-3">
                    {/* Top 3 Podium */}
                    {userStatistics.users.filter((u: any) => u.stats.totalActions > 0).length >= 3 && (
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
                        <CardHeader className="pb-2 pt-4">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            Top Performers
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <div className="grid grid-cols-3 gap-3">
                            {userStatistics.users.filter((u: any) => u.stats.totalActions > 0).slice(0, 3).map((u: any, idx: number) => {
                              const medals = ["🥇", "🥈", "🥉"]
                              const bgColors = [
                                "from-amber-100 to-yellow-100 border-amber-200 dark:from-amber-900/30 dark:to-yellow-900/30",
                                "from-slate-100 to-gray-100 border-gray-200 dark:from-slate-800 dark:to-gray-800",
                                "from-orange-100 to-amber-100 border-orange-200 dark:from-orange-900/30 dark:to-amber-900/30"
                              ]
                              return (
                                <div key={u.userId} className={cn("rounded-xl border p-3 text-center bg-gradient-to-br", bgColors[idx])}>
                                  <div className="text-2xl mb-1">{medals[idx]}</div>
                                  <div className="font-semibold text-sm">{u.nom}</div>
                                  <div className="text-xs text-muted-foreground">{u.prenom}</div>
                                  <div className="mt-2 text-lg font-bold text-blue-600">{u.stats.totalActions}</div>
                                  <div className="text-xs text-muted-foreground">actions</div>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Per-commercial cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {userStatistics.users.map((userStat: any, idx: number) => {
                        const maxActions = Math.max(...userStatistics.users.map((u: any) => u.stats.totalActions), 1)
                        const progressPct = Math.round((userStat.stats.totalActions / maxActions) * 100)
                        const accentColors = [
                          "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
                          "bg-pink-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500"
                        ]
                        const accentColor = accentColors[idx % accentColors.length]
                        return (
                          <Card
                            key={userStat.userId}
                            className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => { setSelectedUserStat(userStat); setIsUserStatDetailDialogOpen(true) }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm", accentColor)}>
                                    {userStat.nom?.charAt(0)}{userStat.prenom?.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm">{userStat.nom} {userStat.prenom}</div>
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant="outline" className="text-xs py-0 h-4">{userStat.role || "–"}</Badge>
                                      {idx === 0 && userStat.stats.totalActions > 0 && (
                                        <span className="text-xs text-amber-600 font-medium">🏆 #1</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold">{userStat.stats.totalActions}</div>
                                  <div className="text-xs text-muted-foreground">actions</div>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mb-3">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>Activité relative</span>
                                  <span>{progressPct}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full transition-all", accentColor)}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>

                              {/* Stats grid */}
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: "Prospects", value: userStat.stats.prospects, color: "text-violet-600" },
                                  { label: "Clients", value: userStat.stats.clients, color: "text-blue-600" },
                                  { label: "Montant", value: `$${(userStat.stats.terrainTotalValue || 0).toLocaleString()}`, color: "text-green-600" },
                                  { label: "Contrats", value: userStat.stats.contracts, color: "text-orange-600" },
                                ].map((s) => (
                                  <div key={s.label} className="text-center bg-gray-50 dark:bg-slate-800/50 rounded-lg py-1.5">
                                    <div className={cn("text-base font-bold", s.color)}>{s.value}</div>
                                    <div className="text-xs text-muted-foreground leading-tight">{s.label}</div>
                                  </div>
                                ))}
                              </div>

                              {/* Revenue + Conversion */}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-1 text-xs">
                                  <DollarSign className="h-3 w-3 text-pink-500" />
                                  <span className="font-semibold text-pink-600">${(userStat.stats.totalRevenue || 0).toLocaleString()}</span>
                                  <span className="text-muted-foreground">revenus</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                                  <span className="font-semibold text-emerald-600">{userStat.stats.conversionRate || 0}%</span>
                                  <span className="text-muted-foreground">conversion</span>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>

                    {userStatistics.users.every((u: any) => u.stats.totalActions === 0) && (
                      <div className="text-center py-10 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Aucune activité sur cette période</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Table View */}
                {statsViewMode === "table" && (
                  <Card className="border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/80 dark:bg-slate-800/80">
                            <TableHead className="font-semibold">#</TableHead>
                            <TableHead className="font-semibold">Commercial</TableHead>
                            <TableHead className="font-semibold">Rôle</TableHead>
                            <TableHead className="text-right font-semibold">Prospects</TableHead>
                            <TableHead className="text-right font-semibold">Clients</TableHead>
                            <TableHead className="text-right font-semibold">Montant</TableHead>
                            <TableHead className="text-right font-semibold">Contrats</TableHead>
                            <TableHead className="text-right font-semibold">Revenus</TableHead>
                            <TableHead className="text-right font-semibold">Conversion</TableHead>
                            <TableHead className="text-right font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userStatistics.users.map((userStat: any, idx: number) => (
                            <TableRow
                              key={userStat.userId}
                              className="cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
                              onClick={() => { setSelectedUserStat(userStat); setIsUserStatDetailDialogOpen(true) }}
                            >
                              <TableCell className="text-muted-foreground font-medium w-10">
                                {idx === 0 && userStat.stats.totalActions > 0 ? "🏆" : idx + 1}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{userStat.nom} {userStat.prenom}</div>
                                <div className="text-xs text-muted-foreground">{userStat.email || "–"}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{userStat.role || "–"}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium text-violet-600">{userStat.stats.prospects}</TableCell>
                              <TableCell className="text-right font-medium text-blue-600">{userStat.stats.clients}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">${(userStat.stats.terrainTotalValue || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-medium text-orange-600">{userStat.stats.contracts}</TableCell>
                              <TableCell className="text-right font-medium text-pink-600">${(userStat.stats.totalRevenue || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right">
                                <span className={cn(
                                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                                  (userStat.stats.conversionRate || 0) >= 50
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : (userStat.stats.conversionRate || 0) >= 20
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400"
                                )}>
                                  {userStat.stats.conversionRate || 0}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-bold">{userStat.stats.totalActions}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-700 dark:text-gray-300">Aucune donnée chargée</p>
                  <p className="text-sm text-muted-foreground mt-1">Choisissez une période et cliquez sur Actualiser</p>
                </div>
                <Button
                  onClick={() => { applyStatsPreset("month"); setTimeout(fetchUserStatistics, 100) }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Charger ce mois
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Bureaux Tab */}
          <TabsContent value="bureaux" className="space-y-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-900/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold">Bureaux</CardTitle>
                    <CardDescription>Liste des bureaux de Qavah</CardDescription>
                  </div>
                  <Button
                    onClick={() => setIsBureauDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un bureau
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingBureaux ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : bureaux.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <MapPin className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Aucun bureau enregistré</p>
                      <p className="text-sm text-muted-foreground mt-1">Commencez par ajouter votre premier bureau.</p>
                    </div>
                    <Button
                      onClick={() => setIsBureauDialogOpen(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un bureau
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bureaux.map((bureau) => (
                      <div key={bureau._id} className={cn("border rounded-xl p-4 space-y-2 bg-white dark:bg-slate-800 shadow-sm transition-opacity", bureau.actif ? "border-gray-200 dark:border-slate-700" : "border-gray-200 dark:border-slate-700 opacity-60")}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{bureau.nom}</h3>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Switch checked={bureau.actif} onCheckedChange={() => handleToggleBureau(bureau)} className="scale-75" />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedBureau(bureau); setIsEditBureauDialogOpen(true) }}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { setSelectedBureau(bureau); setIsDeleteBureauDialogOpen(true) }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[bureau.adresse.numero, bureau.adresse.avenue, bureau.adresse.quartier, bureau.adresse.commune, bureau.adresse.ville, bureau.adresse.pays].filter(Boolean).join(", ") || "—"}
                        </p>
                        {(bureau.coordonnees.lat || bureau.coordonnees.lng) && (
                          <p className="text-xs font-mono text-blue-600 dark:text-blue-400">
                            {bureau.coordonnees.lat?.toFixed(5)}, {bureau.coordonnees.lng?.toFixed(5)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{bureau.rayon ?? 500} m GPS</Badge>
                          {(bureau.ipsAutorisees?.length ?? 0) > 0 && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                              {bureau.ipsAutorisees.length} IP
                            </Badge>
                          )}
                          <Badge className={cn("text-xs", bureau.actif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                            {bureau.actif ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                        {(bureau.ipsAutorisees?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {bureau.ipsAutorisees.map(ip => (
                              <span key={ip} className="text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">{ip}</span>
                            ))}
                          </div>
                        )}
                        {bureau.commentaire && (
                          <p className="text-xs text-muted-foreground italic">{bureau.commentaire}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Mobile News Tab ────────────────────────────────────────── */}
          <TabsContent value="mobile-news" className="space-y-6">
            {/* Carousel Section */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-900/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-semibold flex items-center space-x-2">
                      <Image className="h-5 w-5 text-purple-600" />
                      <span>Carrousel mobile</span>
                    </CardTitle>
                    <CardDescription>Images affichées en haut de la page News dans l&apos;app mobile</CardDescription>
                  </div>
                  <Button
                    onClick={() => { setCarouselForm({ imageUrl: "", titre: "", lien: "", ordre: carouselItems.length, actif: true }); setIsCarouselDialogOpen(true) }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />Ajouter une slide
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingNews ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
                ) : carouselItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Aucune slide de carrousel</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {carouselItems.map((item) => (
                      <div key={item._id} className="relative rounded-xl overflow-hidden border bg-card shadow-sm group">
                        <div className="h-32 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.titre ?? "slide"} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <Image className="h-10 w-10 text-purple-300" />
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.titre ?? <span className="text-muted-foreground italic">Sans titre</span>}</p>
                              {item.lien && <a href={item.lien} target="_blank" rel="noreferrer" className="text-xs text-blue-500 flex items-center gap-1 truncate"><ExternalLink className="h-3 w-3" />{item.lien}</a>}
                            </div>
                            <Badge variant={item.actif ? "default" : "secondary"} className="ml-2 text-xs shrink-0">{item.actif ? "Actif" : "Inactif"}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Ordre: {item.ordre}</p>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => { setSelectedCarousel(item); setCarouselForm({ imageUrl: item.imageUrl, titre: item.titre ?? "", lien: item.lien ?? "", ordre: item.ordre, actif: item.actif }); setIsEditCarouselDialogOpen(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => { setSelectedCarousel(item); setIsDeleteCarouselDialogOpen(true) }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Articles Section */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-900/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-semibold flex items-center space-x-2">
                      <Newspaper className="h-5 w-5 text-blue-600" />
                      <span>Articles / Actualités</span>
                    </CardTitle>
                    <CardDescription>Actualités affichées dans la section &quot;Dernières actualités&quot; de l&apos;app mobile</CardDescription>
                  </div>
                  <Button
                    onClick={() => { setArticleForm({ titre: "", shortDesc: "", longDesc: "", cover: "", author: "", status: "draft" }); setIsArticleDialogOpen(true) }}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />Nouvel article
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingNews ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
                ) : newsArticles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Aucun article pour le moment</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Auteur</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newsArticles.map((article) => (
                        <TableRow key={article._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {article.cover ? (
                                <img src={article.cover} alt="" className="h-10 w-14 rounded object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              ) : (
                                <div className="h-10 w-14 rounded bg-muted flex items-center justify-center shrink-0">
                                  <Newspaper className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{article.titre}</p>
                                {article.shortDesc && <p className="text-xs text-muted-foreground line-clamp-1">{article.shortDesc}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{article.author ?? <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            <Badge variant={article.status === "published" ? "default" : "secondary"}>
                              {article.status === "published" ? "Publié" : "Brouillon"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(article.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { setSelectedArticle(article); setArticleForm({ titre: article.titre, shortDesc: article.shortDesc ?? "", longDesc: article.longDesc ?? "", cover: article.cover ?? "", author: article.author ?? "", status: article.status }); setIsEditArticleDialogOpen(true) }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => { setSelectedArticle(article); setIsDeleteArticleDialogOpen(true) }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Mobile News Dialogs ────────────────────────────────────── */}

        {/* Add Carousel Dialog */}
        <Dialog open={isCarouselDialogOpen} onOpenChange={setIsCarouselDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter une slide</DialogTitle>
              <DialogDescription>Nouvelle image pour le carrousel mobile</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label htmlFor="c-imageUrl">URL de l&apos;image *</Label><Input id="c-imageUrl" placeholder="https://..." value={carouselForm.imageUrl} onChange={e => setCarouselForm(p => ({ ...p, imageUrl: e.target.value }))} /></div>
              <div><Label htmlFor="c-titre">Titre (optionnel)</Label><Input id="c-titre" placeholder="Titre de la slide" value={carouselForm.titre} onChange={e => setCarouselForm(p => ({ ...p, titre: e.target.value }))} /></div>
              <div><Label htmlFor="c-lien">Lien (optionnel)</Label><Input id="c-lien" placeholder="https://..." value={carouselForm.lien} onChange={e => setCarouselForm(p => ({ ...p, lien: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="c-ordre">Ordre</Label><Input id="c-ordre" type="number" value={carouselForm.ordre} onChange={e => setCarouselForm(p => ({ ...p, ordre: parseInt(e.target.value) || 0 }))} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={carouselForm.actif} onCheckedChange={v => setCarouselForm(p => ({ ...p, actif: v }))} /><Label>Actif</Label></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCarouselDialogOpen(false)}>Annuler</Button>
              <Button onClick={() => handleSaveCarousel(false)} disabled={isSavingNews}>{isSavingNews ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Carousel Dialog */}
        <Dialog open={isEditCarouselDialogOpen} onOpenChange={setIsEditCarouselDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier la slide</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>URL de l&apos;image *</Label><Input placeholder="https://..." value={carouselForm.imageUrl} onChange={e => setCarouselForm(p => ({ ...p, imageUrl: e.target.value }))} /></div>
              <div><Label>Titre</Label><Input placeholder="Titre de la slide" value={carouselForm.titre} onChange={e => setCarouselForm(p => ({ ...p, titre: e.target.value }))} /></div>
              <div><Label>Lien</Label><Input placeholder="https://..." value={carouselForm.lien} onChange={e => setCarouselForm(p => ({ ...p, lien: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Ordre</Label><Input type="number" value={carouselForm.ordre} onChange={e => setCarouselForm(p => ({ ...p, ordre: parseInt(e.target.value) || 0 }))} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={carouselForm.actif} onCheckedChange={v => setCarouselForm(p => ({ ...p, actif: v }))} /><Label>Actif</Label></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditCarouselDialogOpen(false)}>Annuler</Button>
              <Button onClick={() => handleSaveCarousel(true)} disabled={isSavingNews}>{isSavingNews ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Carousel Confirm */}
        <AlertDialog open={isDeleteCarouselDialogOpen} onOpenChange={setIsDeleteCarouselDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la slide ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCarousel} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Article Dialog */}
        <Dialog open={isArticleDialogOpen} onOpenChange={setIsArticleDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvel article</DialogTitle>
              <DialogDescription>Créer un nouvel article pour les actualités mobiles</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Titre *</Label><Input placeholder="Titre de l'article" value={articleForm.titre} onChange={e => setArticleForm(p => ({ ...p, titre: e.target.value }))} /></div>
              <div><Label>Auteur</Label><Input placeholder="Nom de l'auteur" value={articleForm.author} onChange={e => setArticleForm(p => ({ ...p, author: e.target.value }))} /></div>
              <div><Label>Image de couverture (URL)</Label><Input placeholder="https://..." value={articleForm.cover} onChange={e => setArticleForm(p => ({ ...p, cover: e.target.value }))} /></div>
              <div><Label>Courte description</Label><Textarea placeholder="Résumé en quelques lignes..." value={articleForm.shortDesc} onChange={e => setArticleForm(p => ({ ...p, shortDesc: e.target.value }))} rows={2} /></div>
              <div><Label>Contenu complet</Label><Textarea placeholder="Contenu détaillé de l'article..." value={articleForm.longDesc} onChange={e => setArticleForm(p => ({ ...p, longDesc: e.target.value }))} rows={6} /></div>
              <div>
                <Label>Statut</Label>
                <Select value={articleForm.status} onValueChange={(v) => setArticleForm(p => ({ ...p, status: v as "published" | "draft" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsArticleDialogOpen(false)}>Annuler</Button>
              <Button onClick={() => handleSaveArticle(false)} disabled={isSavingNews}>{isSavingNews ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Article Dialog */}
        <Dialog open={isEditArticleDialogOpen} onOpenChange={setIsEditArticleDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier l&apos;article</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Titre *</Label><Input placeholder="Titre de l'article" value={articleForm.titre} onChange={e => setArticleForm(p => ({ ...p, titre: e.target.value }))} /></div>
              <div><Label>Auteur</Label><Input placeholder="Nom de l'auteur" value={articleForm.author} onChange={e => setArticleForm(p => ({ ...p, author: e.target.value }))} /></div>
              <div><Label>Image de couverture (URL)</Label><Input placeholder="https://..." value={articleForm.cover} onChange={e => setArticleForm(p => ({ ...p, cover: e.target.value }))} /></div>
              <div><Label>Courte description</Label><Textarea placeholder="Résumé..." value={articleForm.shortDesc} onChange={e => setArticleForm(p => ({ ...p, shortDesc: e.target.value }))} rows={2} /></div>
              <div><Label>Contenu complet</Label><Textarea placeholder="Contenu détaillé..." value={articleForm.longDesc} onChange={e => setArticleForm(p => ({ ...p, longDesc: e.target.value }))} rows={6} /></div>
              <div>
                <Label>Statut</Label>
                <Select value={articleForm.status} onValueChange={(v) => setArticleForm(p => ({ ...p, status: v as "published" | "draft" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditArticleDialogOpen(false)}>Annuler</Button>
              <Button onClick={() => handleSaveArticle(true)} disabled={isSavingNews}>{isSavingNews ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Article Confirm */}
        <AlertDialog open={isDeleteArticleDialogOpen} onOpenChange={setIsDeleteArticleDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l&apos;article ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteArticle} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <NewUserDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onUserAdded={handleUserAdded} />

        {selectedUser && (
          <EditUserDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            user={selectedUser}
            onUserUpdated={fetchUsers}
          />
        )}

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera définitivement le compte utilisateur et toutes les
                données associées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Cite Dialog */}
        <Dialog open={isCiteDialogOpen} onOpenChange={setIsCiteDialogOpen}>
          <DialogContent className="max-h-[85vh] flex flex-col border-0 shadow-2xl p-0 gap-0">
            <DialogHeader className="pb-4 px-6 pt-6 shrink-0">
              <DialogTitle className="text-2xl font-semibold flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                <span>Nouvelle Cité</span>
              </DialogTitle>
              <DialogDescription className="text-base">
                Créer une nouvelle cité dans le système
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 px-6 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={newCite.code}
                    onChange={(e) => setNewCite({ ...newCite, code: e.target.value })}
                    className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Ex: CIT001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nom <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nom"
                    value={newCite.nom}
                    onChange={(e) => setNewCite({ ...newCite, nom: e.target.value })}
                    className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Nom de la cité"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
                <Input
                  id="description"
                  value={newCite.description}
                  onChange={(e) => setNewCite({ ...newCite, description: e.target.value })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Description de la cité"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pays" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pays</Label>
                  <Input
                    id="pays"
                    value={newCite.pays}
                    onChange={(e) => setNewCite({ ...newCite, pays: e.target.value })}
                    className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province" className="text-sm font-medium text-gray-700 dark:text-gray-300">Province</Label>
                  <Input
                    id="province"
                    value={newCite.province}
                    onChange={(e) => setNewCite({ ...newCite, province: e.target.value })}
                    className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville" className="text-sm font-medium text-gray-700 dark:text-gray-300">Ville</Label>
                  <Select
                    value={newCite.ville}
                    onValueChange={(value) => setNewCite({ ...newCite, ville: value })}
                  >
                    <SelectTrigger id="ville" className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Sélectionner une ville" />
                    </SelectTrigger>
                    <SelectContent>
                      {VILLES_OPTIONS.map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commune" className="text-sm font-medium text-gray-700 dark:text-gray-300">Commune</Label>
                  <Input
                    id="commune"
                    value={newCite.commune}
                    onChange={(e) => setNewCite({ ...newCite, commune: e.target.value })}
                    className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quartier" className="text-sm font-medium text-gray-700 dark:text-gray-300">Quartier</Label>
                  <Input
                    id="quartier"
                    value={newCite.quartier}
                    onChange={(e) => setNewCite({ ...newCite, quartier: e.target.value })}
                    className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero" className="text-sm font-medium text-gray-700 dark:text-gray-300">Numéro</Label>
                  <Input
                    id="numero"
                    value={newCite.numero}
                    onChange={(e) => setNewCite({ ...newCite, numero: e.target.value })}
                    className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reference" className="text-sm font-medium text-gray-700 dark:text-gray-300">Référence</Label>
                <Input
                  id="reference"
                  value={newCite.reference}
                  onChange={(e) => setNewCite({ ...newCite, reference: e.target.value })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Référence ou point de repère"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frais_cadastraux" className="text-sm font-medium text-gray-700 dark:text-gray-300">Frais cadastraux ($)</Label>
                <Input
                  id="frais_cadastraux"
                  type="number"
                  min="0"
                  value={newCite.frais_cadastraux}
                  onChange={(e) => setNewCite({ ...newCite, frais_cadastraux: Number(e.target.value) || 0 })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

            </div>
            <DialogFooter className="pt-4 px-6 pb-6 shrink-0 border-t">
              <Button
                variant="outline"
                onClick={() => setIsCiteDialogOpen(false)}
                className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleCreateCite}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Créer la cité
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Cite Dialog */}
        <Dialog open={isEditCiteDialogOpen} onOpenChange={setIsEditCiteDialogOpen}>
          <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0">
            <DialogHeader className="shrink-0 px-6 pt-6">
              <DialogTitle>Modifier la Cité</DialogTitle>
              <DialogDescription>Modifier les informations de la cité.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 px-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Code</Label>
                <Input
                  id="edit-code"
                  value={selectedCite?.code || ""}
                  onChange={(e) => setSelectedCite(selectedCite ? { ...selectedCite, code: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom</Label>
                <Input
                  id="edit-nom"
                  value={selectedCite?.nom || ""}
                  onChange={(e) => setSelectedCite(selectedCite ? { ...selectedCite, nom: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={selectedCite?.description || ""}
                  onChange={(e) => setSelectedCite(selectedCite ? { ...selectedCite, description: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pays">Pays</Label>
                <Input
                  id="edit-pays"
                  value={selectedCite?.pays || ""}
                  onChange={(e) => setSelectedCite(selectedCite ? { ...selectedCite, pays: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-province">Province</Label>
                <Input
                  id="edit-province"
                  value={selectedCite?.province || ""}
                  onChange={(e) => setSelectedCite(selectedCite ? { ...selectedCite, province: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ville">Ville</Label>
                <Select
                  value={selectedCite?.ville || ""}
                  onValueChange={(value) => setSelectedCite(selectedCite ? { ...selectedCite, ville: value } : null)}
                >
                  <SelectTrigger id="edit-ville">
                    <SelectValue placeholder="Sélectionner une ville" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...VILLES_OPTIONS, ...(selectedCite?.ville && !VILLES_OPTIONS.includes(selectedCite.ville) ? [selectedCite.ville] : [])].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-commune">Commune</Label>
                <Input
                  id="edit-commune"
                  value={selectedCite?.commune || ""}
                  onChange={(e) => setSelectedCite(selectedCite ? { ...selectedCite, commune: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quartier">Quartier</Label>
                <Input
                  id="edit-quartier"
                  value={selectedCite?.quartier || ""}
                  onChange={(e) => setSelectedCite(selectedCite ? { ...selectedCite, quartier: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-numero">Numéro</Label>
                <Input
                  id="edit-numero"
                  value={selectedCite?.numero || ""}
                  onChange={(e) => setSelectedCite(selectedCite ? { ...selectedCite, numero: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reference">Référence</Label>
                <Input
                  id="edit-reference"
                  value={selectedCite?.reference || ""}
                  onChange={(e) => setSelectedCite(selectedCite ? { ...selectedCite, reference: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-frais_cadastraux">Frais cadastraux ($)</Label>
                <Input
                  id="edit-frais_cadastraux"
                  type="number"
                  min="0"
                  value={selectedCite?.frais_cadastraux ?? 0}
                  onChange={(e) => setSelectedCite(selectedCite ? { ...selectedCite, frais_cadastraux: Number(e.target.value) || 0 } : null)}
                />
              </div>
            </div>
            <DialogFooter className="shrink-0 px-6 pb-6 border-t">
              <Button variant="outline" onClick={() => setIsEditCiteDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateCite}>Mettre à jour</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Cite Dialog */}
        <AlertDialog open={isDeleteCiteDialogOpen} onOpenChange={setIsDeleteCiteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera définitivement la cité et toutes les données associées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCite} className="bg-red-500 hover:bg-red-600">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point de {userToDeactivate?.status === "active" ? "désactiver" : "activer"} le compte de {userToDeactivate?.nom}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeactivate} className="bg-red-500 hover:bg-red-600">
                {userToDeactivate?.status === "active" ? "Désactiver" : "Activer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="border-0 shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl font-semibold flex items-center space-x-2">
                <Key className="h-6 w-6 text-blue-600" />
                <span>Mettre à jour le mot de passe</span>
              </DialogTitle>
              <DialogDescription className="text-base">
                Entrez le nouveau mot de passe pour {userToUpdatePassword?.nom}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={passwordData.password}
                  onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Entrez le nouveau mot de passe"
                />
                <p className="text-xs text-gray-500">Le mot de passe doit contenir au moins 6 caractères</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Confirmez le nouveau mot de passe"
                />
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-300">Attention</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      Cette action modifiera définitivement le mot de passe de l'utilisateur. Assurez-vous que le nouvel utilisateur reçoit ses nouvelles informations de connexion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsPasswordDialogOpen(false)}
                className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Annuler
              </Button>
              <Button 
                onClick={confirmPasswordUpdate}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Mettre à jour le mot de passe
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Access Management Dialog */}
        <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
          <DialogContent className="border-0 shadow-2xl max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl font-semibold flex items-center space-x-2">
                <Lock className="h-6 w-6 text-blue-600" />
                <span>Mettre à jour les accès</span>
              </DialogTitle>
              <DialogDescription className="text-base">
                Gérez les permissions d'accès pour {userToUpdateAccess?.nom}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 gap-6">
                {Object.entries(accessData).map(([module, permissions]) => (
                  <div key={module} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {module === 'parametres' ? 'Paramètres' :
                         module === 'comptabilites' ? 'Comptabilités' :
                         module === 'mail' ? 'Mail' :
                         module === 'contratsConstruction' ? 'Contrat Construction' :
                         module === 'acquisitions' ? 'Acquisitions' :
                         module}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`${module}-read`}
                          checked={permissions.read}
                          onChange={(e) => handleAccessPermissionChange(module, 'read', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor={`${module}-read`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Lecture
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`${module}-write`}
                          checked={permissions.write}
                          onChange={(e) => handleAccessPermissionChange(module, 'write', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor={`${module}-write`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Écriture
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-300">Informations</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Les permissions de lecture permettent à l'utilisateur de consulter les données. 
                      Les permissions d'écriture permettent de créer, modifier et supprimer des données.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAccessDialogOpen(false)}
                className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Annuler
              </Button>
              <Button 
                onClick={() => setIsAccessConfirmDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Mettre à jour les accès
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Access Confirmation Dialog */}
        <AlertDialog open={isAccessConfirmDialogOpen} onOpenChange={setIsAccessConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la mise à jour des accès</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir modifier les permissions d'accès pour {userToUpdateAccess?.nom} ? 
                Cette action prendra effet immédiatement.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmAccessUpdate}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Sondage Dialog */}
        <Dialog open={isSondageDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsSondageDialogOpen(false)
          }
        }}>
          <DialogContent className="border-0 shadow-2xl max-w-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl font-semibold flex items-center space-x-2">
                <Mail className="h-6 w-6 text-blue-600" />
                <span>Créer un text de diffusion</span>
              </DialogTitle>
              <DialogDescription className="text-base">
                Créez un nouveau texte de diffusion à envoyer aux clients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
               
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">Titre</Label>
                <Input
                  id="title"
                  value={sondageData.title}
                  onChange={(e) => setSondageData({ ...sondageData, title: e.target.value })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Entrez le titre du texte de diffusion"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</Label>
                <Textarea
                  id="message"
                  value={sondageData.message}
                  onChange={(e) => setSondageData({ ...sondageData, message: e.target.value })}
                  placeholder="Entrez le message du texte de diffusion"
                  className="min-h-[200px] border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsSondageDialogOpen(false)}
                className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleCreateSondage}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Créer le texte de diffusion
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Sondage Dialog */}
        <Dialog open={isEditSondageDialogOpen} onOpenChange={setIsEditSondageDialogOpen}>
          <DialogContent className="border-0 shadow-2xl max-w-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl font-semibold flex items-center space-x-2">
                <Edit3 className="h-6 w-6 text-blue-600" />
                <span>Modifier le texte de diffusion</span>
              </DialogTitle>
              <DialogDescription className="text-base">
                Modifiez le texte de diffusion
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-titre" className="text-sm font-medium text-gray-700 dark:text-gray-300">Titre</Label>
                <Input
                  id="edit-titre"
                  value={sondageData.title}
                  onChange={(e) => setSondageData({ ...sondageData, title: e.target.value })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Entrez le titre du texte de diffusion"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-message" className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</Label>
                <Textarea
                  id="edit-message"
                  value={sondageData.message}
                  onChange={(e) => setSondageData({ ...sondageData, message: e.target.value })}
                  placeholder="Entrez le message du texte de diffusion"
                  className="min-h-[200px] border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditSondageDialogOpen(false)
                  setSondageData({ code: "", title: "", message: "" })
                }}
                className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleUpdateSondage}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Mettre à jour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Sondage Dialog */}
        <AlertDialog open={isDeleteSondageDialogOpen} onOpenChange={setIsDeleteSondageDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera définitivement le texte de diffusion "{selectedSondage?.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteSondage}
                className="bg-red-500 hover:bg-red-600"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Cadastral Document Type Dialog */}
        <Dialog open={isCadastralTypeDialogOpen} onOpenChange={setIsCadastralTypeDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto border-0 shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl font-semibold flex items-center space-x-2">
                <FileText className="h-6 w-6 text-blue-600" />
                <span>Nouveau Type de Document Cadastral</span>
              </DialogTitle>
              <DialogDescription className="text-base">
                Créez un nouveau type de document cadastral avec son prix
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="cadastral-titre" className="text-sm font-medium text-gray-700 dark:text-gray-300">Titre *</Label>
                <Input
                  id="cadastral-titre"
                  value={newCadastralType.titre}
                  onChange={(e) => setNewCadastralType({ ...newCadastralType, titre: e.target.value })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ex: Certificat d'enregistrement"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cadastral-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
                <Textarea
                  id="cadastral-description"
                  value={newCadastralType.description}
                  onChange={(e) => setNewCadastralType({ ...newCadastralType, description: e.target.value })}
                  className="min-h-[100px] border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Description du type de document"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cadastral-prix" className="text-sm font-medium text-gray-700 dark:text-gray-300">Prix (USD) *</Label>
                <Input
                  id="cadastral-prix"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCadastralType.prix}
                  onChange={(e) => setNewCadastralType({ ...newCadastralType, prix: e.target.value })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCadastralTypeDialogOpen(false)
                  setNewCadastralType({ titre: "", description: "", prix: "" })
                }}
                className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleCreateCadastralType}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Créer le type
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Cadastral Document Type Dialog */}
        <Dialog open={isEditCadastralTypeDialogOpen} onOpenChange={setIsEditCadastralTypeDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto border-0 shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl font-semibold flex items-center space-x-2">
                <Edit3 className="h-6 w-6 text-blue-600" />
                <span>Modifier le Type de Document Cadastral</span>
              </DialogTitle>
              <DialogDescription className="text-base">
                Modifiez les informations du type de document cadastral
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cadastral-titre" className="text-sm font-medium text-gray-700 dark:text-gray-300">Titre *</Label>
                <Input
                  id="edit-cadastral-titre"
                  value={newCadastralType.titre}
                  onChange={(e) => setNewCadastralType({ ...newCadastralType, titre: e.target.value })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ex: Certificat d'enregistrement"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cadastral-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
                <Textarea
                  id="edit-cadastral-description"
                  value={newCadastralType.description}
                  onChange={(e) => setNewCadastralType({ ...newCadastralType, description: e.target.value })}
                  className="min-h-[100px] border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Description du type de document"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cadastral-prix" className="text-sm font-medium text-gray-700 dark:text-gray-300">Prix (USD) *</Label>
                <Input
                  id="edit-cadastral-prix"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCadastralType.prix}
                  onChange={(e) => setNewCadastralType({ ...newCadastralType, prix: e.target.value })}
                  className="border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditCadastralTypeDialogOpen(false)
                  setSelectedCadastralType(null)
                  setNewCadastralType({ titre: "", description: "", prix: "" })
                }}
                className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleUpdateCadastralType}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Mettre à jour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Cadastral Document Type Dialog */}
        <AlertDialog open={isDeleteCadastralTypeDialogOpen} onOpenChange={setIsDeleteCadastralTypeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera définitivement le type de document "{selectedCadastralType?.titre}".
                Les documents existants de ce type ne seront pas affectés, mais vous ne pourrez plus créer de nouveaux types avec ce nom.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteCadastralType}
                className="bg-red-500 hover:bg-red-600"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Sondage Dialog */}
        <Dialog open={isViewSondageDialogOpen} onOpenChange={setIsViewSondageDialogOpen}>
          <DialogContent className="border-0 shadow-2xl max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl font-semibold flex items-center space-x-2">
                <Mail className="h-6 w-6 text-blue-600" />
                <span>Détails du texte de diffusion</span>
              </DialogTitle>
              <DialogDescription className="text-base">
                Informations complètes sur le texte de diffusion sélectionné
              </DialogDescription>
            </DialogHeader>
            
            {selectedSondageForView && (
              <div className="space-y-6 py-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Code du texte de diffusion</Label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{selectedSondageForView.code}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Titre</Label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <span className="text-gray-900 dark:text-gray-100">{selectedSondageForView.title}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date de création</Label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <span className="text-gray-900 dark:text-gray-100">
                          {new Date(selectedSondageForView.createdAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dernière modification</Label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <span className="text-gray-900 dark:text-gray-100">
                          {new Date(selectedSondageForView.updatedAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Statut</Label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <Badge 
                          className={
                            selectedSondageForView.status=='active'
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }
                        >
                          {selectedSondageForView.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Content */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message de diffusion</Label>
                  <div className="mt-1 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 min-h-[120px]">
                    <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 leading-relaxed">
                      {selectedSondageForView.message}
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">Statistiques d'utilisation</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedSondageForView.stats?.totalSent || 0}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-400">Envoyés</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedSondageForView.stats?.totalDelivered || 0}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-400">Livrés</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedSondageForView.stats?.totalOpened || 0}
                      </div>
                      <div className="text-sm text-purple-700 dark:text-purple-400">Ouverts</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="text-2xl font-bold text-orange-600">
                        {selectedSondageForView.stats?.totalResponded || 0}
                      </div>
                      <div className="text-sm text-orange-700 dark:text-orange-400">Réponses</div>
                    </div>
                  </div>
                </div>

                {/* Response Rate */}
                {(selectedSondageForView.stats?.totalSent || 0) > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">Taux de réponse</Label>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Taux d'ouverture</span>
                        <span className="font-medium">
                          {Math.round(((selectedSondageForView.stats?.totalOpened || 0) / (selectedSondageForView.stats?.totalSent || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.round(((selectedSondageForView.stats?.totalOpened || 0) / (selectedSondageForView.stats?.totalSent || 1)) * 100)}%` 
                          }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-sm mt-3">
                        <span>Taux de réponse</span>
                        <span className="font-medium">
                          {Math.round(((selectedSondageForView.stats?.totalResponded || 0) / (selectedSondageForView.stats?.totalSent || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.round(((selectedSondageForView.stats?.totalResponded || 0) / (selectedSondageForView.stats?.totalSent || 1)) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsViewSondageDialogOpen(false)}
                className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Fermer
              </Button>
              {selectedSondageForView && (
                <Button 
                  onClick={() => {
                    setIsViewSondageDialogOpen(false)
                    handleEditSondage(selectedSondageForView)
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Statistics Detail Dialog */}
        <Dialog open={isUserStatDetailDialogOpen} onOpenChange={setIsUserStatDetailDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Détails des statistiques - {selectedUserStat?.nom} {selectedUserStat?.prenom}
              </DialogTitle>
              <DialogDescription>
                Statistiques détaillées de l'utilisateur pour la période sélectionnée
              </DialogDescription>
            </DialogHeader>
            {selectedUserStat && (
              <div className="space-y-6 py-4">
                {/* User Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informations utilisateur</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Nom complet</Label>
                        <p className="font-medium">{selectedUserStat.nom} {selectedUserStat.prenom}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Email</Label>
                        <p className="font-medium">{selectedUserStat.email || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Rôle</Label>
                        <div className="mt-1">
                          <Badge variant="outline">{selectedUserStat.role || "-"}</Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">ID Utilisateur</Label>
                        <p className="font-medium text-xs text-gray-500">{selectedUserStat.userId}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Prospects", value: selectedUserStat.stats.prospects, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20", clickable: true },
                    { label: "Clients", value: selectedUserStat.stats.clients, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", clickable: true },
                    { label: "Montant terrains", value: `$${(selectedUserStat.stats.terrainTotalValue || 0).toLocaleString()}`, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20", clickable: false },
                    { label: "Contrats", value: selectedUserStat.stats.contracts, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", clickable: false },
                    { label: "Revenus (USD)", value: `$${(selectedUserStat.stats.totalRevenue || 0).toLocaleString()}`, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-900/20", clickable: false },
                    { label: "Taux conversion", value: `${selectedUserStat.stats.conversionRate || 0}%`, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", clickable: false },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={cn("rounded-xl p-3", s.bg, s.clickable && "cursor-pointer hover:opacity-80 transition-opacity ring-1 ring-transparent hover:ring-blue-300")}
                      onClick={() => {
                        if (!s.clickable) return
                        if (s.label === "Clients") fetchUserClients(selectedUserStat.userId)
                        else if (s.label === "Prospects") fetchUserProspects(selectedUserStat.userId)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
                        {s.clickable && <ChevronRight className="h-4 w-4 text-blue-400" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                      {s.clickable && <p className="text-xs text-blue-400 mt-1">Cliquer pour voir la liste</p>}
                    </div>
                  ))}
                </div>

                {/* Total Actions */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm text-muted-foreground">Total des actions</Label>
                        <div className="text-4xl font-bold text-blue-600 mt-1">
                          {selectedUserStat.stats.totalActions}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Prospects + Clients + Paiements + Contrats
                        </p>
                      </div>
                      <Activity className="h-12 w-12 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                {/* Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Répartition des actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Prospects</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${selectedUserStat.stats.totalActions > 0 
                                  ? (selectedUserStat.stats.prospects / selectedUserStat.stats.totalActions) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold w-12 text-right">
                            {selectedUserStat.stats.totalActions > 0 
                              ? Math.round((selectedUserStat.stats.prospects / selectedUserStat.stats.totalActions) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Clients</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${selectedUserStat.stats.totalActions > 0 
                                  ? (selectedUserStat.stats.clients / selectedUserStat.stats.totalActions) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold w-12 text-right">
                            {selectedUserStat.stats.totalActions > 0 
                              ? Math.round((selectedUserStat.stats.clients / selectedUserStat.stats.totalActions) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Paiements</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${selectedUserStat.stats.totalActions > 0 
                                  ? (selectedUserStat.stats.payments / selectedUserStat.stats.totalActions) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold w-12 text-right">
                            {selectedUserStat.stats.totalActions > 0 
                              ? Math.round((selectedUserStat.stats.payments / selectedUserStat.stats.totalActions) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Contrats</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div 
                              className="bg-orange-600 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${selectedUserStat.stats.totalActions > 0 
                                  ? (selectedUserStat.stats.contracts / selectedUserStat.stats.totalActions) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold w-12 text-right">
                            {selectedUserStat.stats.totalActions > 0 
                              ? Math.round((selectedUserStat.stats.contracts / selectedUserStat.stats.totalActions) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Date Range Info */}
                {(statsStartDate || statsEndDate) && (
                  <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                    Période: {statsStartDate ? new Date(statsStartDate).toLocaleDateString('fr-FR') : 'Début'} - {statsEndDate ? new Date(statsEndDate).toLocaleDateString('fr-FR') : 'Fin'}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsUserStatDetailDialogOpen(false)}
              >
                Fermer
              </Button>
              <Button
                onClick={() => {
                  if (selectedUserStat?.userId) {
                    router.push(`/dashboard/settings/users/${selectedUserStat.userId}`)
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Eye className="mr-2 h-4 w-4" />
                Voir le profil complet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Clients List Dialog */}
        <Dialog open={isUserClientsDialogOpen} onOpenChange={setIsUserClientsDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Clients de {selectedUserStat?.nom} {selectedUserStat?.prenom}
              </DialogTitle>
              <DialogDescription>
                Liste des clients assignés à ce commercial
              </DialogDescription>
            </DialogHeader>
            {isLoadingUserClients ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-5 py-2">
                {/* Avec contrat */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      {userClientsList.filter(c => c.contratCount > 0).length} avec contrat
                    </Badge>
                  </div>
                  {userClientsList.filter(c => c.contratCount > 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">Aucun client avec contrat</p>
                  ) : (
                    <div className="space-y-2">
                      {userClientsList.filter(c => c.contratCount > 0).map((client: any) => (
                        <div
                          key={client._id}
                          className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 px-4 py-3 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                          onClick={() => router.push(`/dashboard/clients/detail/${client._id}`)}
                        >
                          <div>
                            <p className="font-medium text-sm">{client.prenom} {client.nom}</p>
                            <p className="text-xs text-muted-foreground">{client.telephone} {client.ville ? `· ${client.ville}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 text-white text-xs">
                              {client.contratCount} contrat{client.contratCount > 1 ? "s" : ""}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Sans contrat */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-gray-600 border-gray-300">
                      {userClientsList.filter(c => c.contratCount === 0).length} sans contrat
                    </Badge>
                  </div>
                  {userClientsList.filter(c => c.contratCount === 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">Aucun client sans contrat</p>
                  ) : (
                    <div className="space-y-2">
                      {userClientsList.filter(c => c.contratCount === 0).map((client: any) => (
                        <div
                          key={client._id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 dark:bg-slate-800/50 dark:border-slate-700 px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                          onClick={() => router.push(`/dashboard/clients/detail/${client._id}`)}
                        >
                          <div>
                            <p className="font-medium text-sm">{client.prenom} {client.nom}</p>
                            <p className="text-xs text-muted-foreground">{client.telephone} {client.ville ? `· ${client.ville}` : ""}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {userClientsList.length === 0 && !isLoadingUserClients && (
                  <p className="text-center text-muted-foreground py-8">Aucun client assigné à ce commercial</p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUserClientsDialogOpen(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Prospects List Dialog */}
        <Dialog open={isUserProspectsDialogOpen} onOpenChange={setIsUserProspectsDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-600" />
                Prospects de {selectedUserStat?.nom} {selectedUserStat?.prenom}
              </DialogTitle>
              <DialogDescription>
                Liste des prospects assignés à ce commercial
              </DialogDescription>
            </DialogHeader>
            {isLoadingUserProspects ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              </div>
            ) : (
              <div className="space-y-5 py-2">
                {/* Prospects actifs */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                      {userProspectsList.filter(p => p.status === "prospect").length} prospect{userProspectsList.filter(p => p.status === "prospect").length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  {userProspectsList.filter(p => p.status === "prospect").length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">Aucun prospect actif</p>
                  ) : (
                    <div className="space-y-2">
                      {userProspectsList.filter(p => p.status === "prospect").map((prospect: any) => (
                        <div
                          key={prospect._id}
                          className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 dark:bg-violet-900/10 dark:border-violet-800 px-4 py-3 cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/20 transition-colors"
                          onClick={() => router.push(`/dashboard/prospect/${prospect._id}`)}
                        >
                          <div>
                            <p className="font-medium text-sm">{prospect.prenom} {prospect.nom}</p>
                            <p className="text-xs text-muted-foreground">{prospect.telephone} {prospect.villeSouhaitee ? `· ${prospect.villeSouhaitee}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-violet-600 border-violet-300 text-xs">Prospect</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Convertis en clients */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      {userProspectsList.filter(p => p.status === "client").length} converti{userProspectsList.filter(p => p.status === "client").length > 1 ? "s" : ""} en client
                    </Badge>
                  </div>
                  {userProspectsList.filter(p => p.status === "client").length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">Aucun prospect converti en client</p>
                  ) : (
                    <div className="space-y-2">
                      {userProspectsList.filter(p => p.status === "client").map((prospect: any) => (
                        <div
                          key={prospect._id}
                          className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 px-4 py-3 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                          onClick={() => router.push(`/dashboard/prospect/${prospect._id}`)}
                        >
                          <div>
                            <p className="font-medium text-sm">{prospect.prenom} {prospect.nom}</p>
                            <p className="text-xs text-muted-foreground">{prospect.telephone} {prospect.villeSouhaitee ? `· ${prospect.villeSouhaitee}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 text-white text-xs">Client</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {userProspectsList.filter(p => p.status === "annuler").length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          {userProspectsList.filter(p => p.status === "annuler").length} annulé{userProspectsList.filter(p => p.status === "annuler").length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {userProspectsList.filter(p => p.status === "annuler").map((prospect: any) => (
                          <div
                            key={prospect._id}
                            className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-3 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                            onClick={() => router.push(`/dashboard/prospect/${prospect._id}`)}
                          >
                            <div>
                              <p className="font-medium text-sm">{prospect.prenom} {prospect.nom}</p>
                              <p className="text-xs text-muted-foreground">{prospect.telephone} {prospect.villeSouhaitee ? `· ${prospect.villeSouhaitee}` : ""}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-red-600 border-red-300 text-xs">Annulé</Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {userProspectsList.length === 0 && !isLoadingUserProspects && (
                  <p className="text-center text-muted-foreground py-8">Aucun prospect assigné à ce commercial</p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUserProspectsDialogOpen(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Report Dialog */}
        <Dialog open={isCustomReportDialogOpen} onOpenChange={setIsCustomReportDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Rapport personnalisé
              </DialogTitle>
              <DialogDescription>
                Sélectionnez une plage de dates pour générer un rapport personnalisé
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="report-start-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date de début <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="report-start-date"
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full"
                  max={reportEndDate || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-end-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date de fin <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="report-end-date"
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full"
                  min={reportStartDate || undefined}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCustomReportDialogOpen(false)
                  setReportStartDate("")
                  setReportEndDate("")
                }}
                disabled={isSendingReport}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCustomReportSubmit}
                disabled={isSendingReport || !reportStartDate || !reportEndDate}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSendingReport ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Générer le rapport
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Bureau Dialog */}
        <Dialog open={isEditBureauDialogOpen} onOpenChange={setIsEditBureauDialogOpen}>
          <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0 sm:max-w-lg">
            <DialogHeader className="shrink-0 px-6 pt-6">
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" />
                Modifier le Bureau
              </DialogTitle>
              <DialogDescription>Modifiez les informations du bureau.</DialogDescription>
            </DialogHeader>
            {selectedBureau && (
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nom <span className="text-red-500">*</span></Label>
                  <Input
                    value={selectedBureau.nom}
                    onChange={(e) => setSelectedBureau({ ...selectedBureau, nom: e.target.value })}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Adresse</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Numéro</Label>
                      <Input value={selectedBureau.adresse.numero} onChange={(e) => setSelectedBureau({ ...selectedBureau, adresse: { ...selectedBureau.adresse, numero: e.target.value } })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Avenue</Label>
                      <Input value={selectedBureau.adresse.avenue} onChange={(e) => setSelectedBureau({ ...selectedBureau, adresse: { ...selectedBureau.adresse, avenue: e.target.value } })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Quartier</Label>
                      <Input value={selectedBureau.adresse.quartier} onChange={(e) => setSelectedBureau({ ...selectedBureau, adresse: { ...selectedBureau.adresse, quartier: e.target.value } })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Commune</Label>
                      <Input value={selectedBureau.adresse.commune} onChange={(e) => setSelectedBureau({ ...selectedBureau, adresse: { ...selectedBureau.adresse, commune: e.target.value } })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Ville</Label>
                      <Input value={selectedBureau.adresse.ville} onChange={(e) => setSelectedBureau({ ...selectedBureau, adresse: { ...selectedBureau.adresse, ville: e.target.value } })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pays</Label>
                      <Input value={selectedBureau.adresse.pays} onChange={(e) => setSelectedBureau({ ...selectedBureau, adresse: { ...selectedBureau.adresse, pays: e.target.value } })} />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Coordonnées GPS</p>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => capturePositionForBureau('edit')} disabled={bureauGeo.locating}>
                      {bureauGeo.locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                      Ma position
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Latitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={selectedBureau.coordonnees.lat ?? ""}
                        onChange={(e) => setSelectedBureau({ ...selectedBureau, coordonnees: { ...selectedBureau.coordonnees, lat: e.target.value !== "" ? Number(e.target.value) : null } })}
                        placeholder="Ex: -4.3276"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Longitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={selectedBureau.coordonnees.lng ?? ""}
                        onChange={(e) => setSelectedBureau({ ...selectedBureau, coordonnees: { ...selectedBureau.coordonnees, lng: e.target.value !== "" ? Number(e.target.value) : null } })}
                        placeholder="Ex: 15.3136"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Rayon GPS (mètres)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={10000}
                    value={selectedBureau.rayon ?? 500}
                    onChange={(e) => setSelectedBureau({ ...selectedBureau, rayon: parseInt(e.target.value) || 500 })}
                  />
                  <p className="text-xs text-muted-foreground">Tolérance GPS. Sur desktop/WiFi, mettez 2000–5000 m.</p>
                </div>

                {/* Adresses IP autorisées */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">IPs autorisées <span className="text-xs text-muted-foreground font-normal">(réseau du bureau)</span></Label>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fetchMonIp('edit')} disabled={isFetchingIp}>
                      {isFetchingIp ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                      Mon IP actuelle
                    </Button>
                  </div>
                  {(selectedBureau.ipsAutorisees?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(selectedBureau.ipsAutorisees || []).map(ip => (
                        <span key={ip} className="inline-flex items-center gap-1 text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
                          {ip}
                          <button type="button" onClick={() => setSelectedBureau(b => b ? { ...b, ipsAutorisees: (b.ipsAutorisees || []).filter(i => i !== ip) } : b)} className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: 41.243.12.5"
                      id="edit-ip-input"
                      className="text-sm font-mono"
                      onKeyDown={e => {
                        const val = (e.target as HTMLInputElement).value.trim()
                        if (e.key === 'Enter' && val && selectedBureau) {
                          setSelectedBureau(b => b ? { ...b, ipsAutorisees: (b.ipsAutorisees || []).includes(val) ? b.ipsAutorisees : [...(b.ipsAutorisees || []), val] } : b);
                          (e.target as HTMLInputElement).value = ""
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const input = document.getElementById('edit-ip-input') as HTMLInputElement
                      const val = input?.value.trim()
                      if (val && selectedBureau) {
                        setSelectedBureau(b => b ? { ...b, ipsAutorisees: (b.ipsAutorisees || []).includes(val) ? b.ipsAutorisees : [...(b.ipsAutorisees || []), val] } : b)
                        input.value = ""
                      }
                    }}>Ajouter</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Cliquez &quot;Mon IP actuelle&quot; depuis le réseau du bureau pour l&apos;enregistrer.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Commentaire</Label>
                  <Input
                    value={selectedBureau.commentaire}
                    onChange={(e) => setSelectedBureau({ ...selectedBureau, commentaire: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="shrink-0 px-6 pb-6 border-t pt-4">
              <Button variant="outline" onClick={() => setIsEditBureauDialogOpen(false)} disabled={isUpdatingBureau}>
                Annuler
              </Button>
              <Button
                onClick={handleUpdateBureau}
                disabled={isUpdatingBureau || !selectedBureau?.nom?.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {isUpdatingBureau ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mise à jour...</>
                ) : "Mettre à jour"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Bureau Dialog */}
        <AlertDialog open={isDeleteBureauDialogOpen} onOpenChange={setIsDeleteBureauDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce bureau ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le bureau <strong>{selectedBureau?.nom}</strong> sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingBureau}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBureau}
                disabled={isDeletingBureau}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeletingBureau ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Suppression...</> : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Bureau Dialog */}
        <Dialog
          open={isBureauDialogOpen}
          onOpenChange={(open) => {
            setIsBureauDialogOpen(open)
            // Auto-capture dès l'ouverture — l'utilisateur peut modifier ensuite
            if (open) capturePositionForBureau('new')
          }}
        >
          <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0 sm:max-w-lg">
            <DialogHeader className="shrink-0 px-6 pt-6">
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Nouveau Bureau
              </DialogTitle>
              <DialogDescription>
                Les coordonnées GPS ont été récupérées automatiquement — vous pouvez les modifier.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
              <div className="space-y-2">
                <Label htmlFor="bureau-nom" className="text-sm font-medium">Nom <span className="text-red-500">*</span></Label>
                <Input
                  id="bureau-nom"
                  value={newBureau.nom}
                  onChange={(e) => setNewBureau({ ...newBureau, nom: e.target.value })}
                  placeholder="Ex: Bureau Central Kinshasa"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Adresse</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="bureau-numero" className="text-xs text-muted-foreground">Numéro</Label>
                    <Input
                      id="bureau-numero"
                      value={newBureau.adresse.numero}
                      onChange={(e) => setNewBureau({ ...newBureau, adresse: { ...newBureau.adresse, numero: e.target.value } })}
                      placeholder="12"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bureau-avenue" className="text-xs text-muted-foreground">Avenue</Label>
                    <Input
                      id="bureau-avenue"
                      value={newBureau.adresse.avenue}
                      onChange={(e) => setNewBureau({ ...newBureau, adresse: { ...newBureau.adresse, avenue: e.target.value } })}
                      placeholder="Ex: Avenue du Commerce"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bureau-quartier" className="text-xs text-muted-foreground">Quartier</Label>
                    <Input
                      id="bureau-quartier"
                      value={newBureau.adresse.quartier}
                      onChange={(e) => setNewBureau({ ...newBureau, adresse: { ...newBureau.adresse, quartier: e.target.value } })}
                      placeholder="Quartier"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bureau-commune" className="text-xs text-muted-foreground">Commune</Label>
                    <Input
                      id="bureau-commune"
                      value={newBureau.adresse.commune}
                      onChange={(e) => setNewBureau({ ...newBureau, adresse: { ...newBureau.adresse, commune: e.target.value } })}
                      placeholder="Commune"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bureau-ville" className="text-xs text-muted-foreground">Ville</Label>
                    <Input
                      id="bureau-ville"
                      value={newBureau.adresse.ville}
                      onChange={(e) => setNewBureau({ ...newBureau, adresse: { ...newBureau.adresse, ville: e.target.value } })}
                      placeholder="Kinshasa"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bureau-pays" className="text-xs text-muted-foreground">Pays</Label>
                    <Input
                      id="bureau-pays"
                      value={newBureau.adresse.pays}
                      onChange={(e) => setNewBureau({ ...newBureau, adresse: { ...newBureau.adresse, pays: e.target.value } })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Coordonnées GPS *</p>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => capturePositionForBureau('new')} disabled={bureauGeo.locating}>
                    {bureauGeo.locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                    Ma position
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="bureau-lat" className="text-xs text-muted-foreground">Latitude</Label>
                    <Input
                      id="bureau-lat"
                      type="number"
                      step="any"
                      value={newBureau.coordonnees.lat}
                      onChange={(e) => setNewBureau({ ...newBureau, coordonnees: { ...newBureau.coordonnees, lat: e.target.value } })}
                      placeholder="Ex: -4.3276"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bureau-lng" className="text-xs text-muted-foreground">Longitude</Label>
                    <Input
                      id="bureau-lng"
                      type="number"
                      step="any"
                      value={newBureau.coordonnees.lng}
                      onChange={(e) => setNewBureau({ ...newBureau, coordonnees: { ...newBureau.coordonnees, lng: e.target.value } })}
                      placeholder="Ex: 15.3136"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bureau-rayon" className="text-sm font-medium">Rayon GPS (mètres)</Label>
                <Input
                  id="bureau-rayon"
                  type="number"
                  min={10}
                  max={10000}
                  value={newBureau.rayon}
                  onChange={(e) => setNewBureau({ ...newBureau, rayon: parseInt(e.target.value) || 500 })}
                />
                <p className="text-xs text-muted-foreground">Tolérance GPS. Sur desktop/WiFi, mettez 2000–5000 m.</p>
              </div>

              {/* Adresses IP autorisées */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">IPs autorisées <span className="text-xs text-muted-foreground font-normal">(réseau du bureau)</span></Label>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fetchMonIp('new')} disabled={isFetchingIp}>
                    {isFetchingIp ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                    Mon IP actuelle
                  </Button>
                </div>
                {newBureau.ipsAutorisees.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {newBureau.ipsAutorisees.map(ip => (
                      <span key={ip} className="inline-flex items-center gap-1 text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
                        {ip}
                        <button type="button" onClick={() => setNewBureau(b => ({ ...b, ipsAutorisees: b.ipsAutorisees.filter(i => i !== ip) }))} className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: 41.243.12.5"
                    value={newBureauIpInput}
                    onChange={e => setNewBureauIpInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newBureauIpInput.trim()) {
                        setNewBureau(b => ({ ...b, ipsAutorisees: b.ipsAutorisees.includes(newBureauIpInput.trim()) ? b.ipsAutorisees : [...b.ipsAutorisees, newBureauIpInput.trim()] }))
                        setNewBureauIpInput("")
                      }
                    }}
                    className="text-sm font-mono"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (newBureauIpInput.trim()) {
                      setNewBureau(b => ({ ...b, ipsAutorisees: b.ipsAutorisees.includes(newBureauIpInput.trim()) ? b.ipsAutorisees : [...b.ipsAutorisees, newBureauIpInput.trim()] }))
                      setNewBureauIpInput("")
                    }
                  }}>Ajouter</Button>
                </div>
                <p className="text-xs text-muted-foreground">L&apos;employé peut pointer si son IP correspond. Cliquez &quot;Mon IP actuelle&quot; depuis le réseau du bureau.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bureau-commentaire" className="text-sm font-medium">Commentaire</Label>
                <Input
                  id="bureau-commentaire"
                  value={newBureau.commentaire}
                  onChange={(e) => setNewBureau({ ...newBureau, commentaire: e.target.value })}
                  placeholder="Informations complémentaires..."
                />
              </div>
            </div>
            <DialogFooter className="shrink-0 px-6 pb-6 border-t pt-4">
              <Button variant="outline" onClick={() => setIsBureauDialogOpen(false)} disabled={isSavingBureau}>
                Annuler
              </Button>
              <Button
                onClick={handleCreateBureau}
                disabled={isSavingBureau || !newBureau.nom.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {isSavingBureau ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bureau Success Dialog */}
        <AlertDialog open={bureauSuccessOpen} onOpenChange={setBureauSuccessOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-green-600">
                <Icons.checkCircle className="h-5 w-5" />
                Bureau créé
              </AlertDialogTitle>
              <AlertDialogDescription>Le bureau a été enregistré avec succès.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setBureauSuccessOpen(false)}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bureau Error Dialog */}
        <AlertDialog open={bureauErrorOpen} onOpenChange={setBureauErrorOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Erreur
              </AlertDialogTitle>
              <AlertDialogDescription>{bureauErrorMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setBureauErrorOpen(false)}>Fermer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  )
}
