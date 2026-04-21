"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Icons } from "@/components/icons"
import { EditTerrainDialog } from "@/components/edit-terrain-dialog"
import { NewContratDialog } from "@/components/new-contrat-dialog"
import axios from "axios"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { TerrainExpirationWarning } from "@/components/terrain-expiration-warning"
import { toast } from "react-hot-toast"
import { Client, Prospect } from "@/types/client"
import { matchesSearch } from "@/lib/normalizeForSearch"

interface Terrain {
  _id: string
  numero: string
  dimension: string
  superficie: string
  disponible: boolean
  pays: string
  province: string
  ville: string
  cite: Cite
  commune: string
  quartier?: string
  avenue?: string
  prix: number
  description?: string
  statut: "Disponible" | "Réservé" | "Vendu" | "Annulé" | "Cédé" | "En cours"
  addBy: {
    nom: string
    postnom: string
    prenom: string
    email: string
  }
  reservation:{
    dateReservation: Date
    dateDebut: Date
    dateFin: Date
    client: Client
    prospect: Prospect
  }
}

interface Cite {
  _id: string
  nom: string
  pays: string
  province: string
  ville: string
  commune: string
  quartier: string
  numero: string
  reference: string
}

export default function TerrainDetailPage() {
  const [terrain, setTerrain] = useState<Terrain | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCancelReservationDialogOpen, setIsCancelReservationDialogOpen] = useState(false)
  const [notifyOnCancel, setNotifyOnCancel] = useState(false)
  const [cites, setCites] = useState<Cite[]>([])
  const { id } = useParams()
  const [selectedType, setSelectedType] = useState("")
  const [clientSearch, setClientSearch] = useState("")
  const [prospectSearch, setProspectSearch] = useState("")
  const [reserveData, setReserveData] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    selectedClientOrProspect: "",
    comment: "",
    notify: false
  })
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [isNewContratDialogOpen, setIsNewContratDialogOpen] = useState(false)
  const [allClients, setAllClients] = useState<Client[]>([])
  const [allTerrains, setAllTerrains] = useState<any[]>([])
  const [isReserving, setIsReserving] = useState(false)
  const [isUpdatingReservation, setIsUpdatingReservation] = useState(false)
  const [isEditReservationDialogOpen, setIsEditReservationDialogOpen] = useState(false)
  const [editReservationData, setEditReservationData] = useState({
    startDate: "",
    endDate: "",
    selectedType: "",
    selectedClientOrProspect: "",
    comment: "",
    notify: false
  })
  const [editClientSearch, setEditClientSearch] = useState("")
  const [editProspectSearch, setEditProspectSearch] = useState("")
 
  const router = useRouter()

  const fetchTerrainDetails = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/terrains/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setTerrain(response.data.terrain)
      setCites(response.data.cites)
      setClient(response.data.clientInfo)
      // console.log(response.data)
    } catch (error) {
      console.error("Error fetching terrain details:", error)
      toast.error("Impossible de récupérer les détails du terrain. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClientsAndTerrains = async () => {
    try {
      const token = localStorage.getItem("authToken")
      
      // Fetch clients
      const clientsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setAllClients(clientsResponse.data || [])
      setClients(clientsResponse.data || [])
      // console.log(clientsResponse.data)
      // Fetch prospects
      const prospectsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prospects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setProspects(prospectsResponse.data || [])
      
      // Fetch terrains
      const terrainsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/terrains`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setAllTerrains(terrainsResponse.data.terrains || [])
    } catch (error) {
      console.error("Error fetching clients and terrains:", error)
    }
  }

  useEffect(() => {
    if (id) {
      fetchTerrainDetails()
      fetchClientsAndTerrains()
    }
  }, [id])

  const handleEdit = () => {
    setIsEditDialogOpen(true)
  }

  const handleDelete = () => {
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/terrains/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      toast.success("Le terrain a été supprimé avec succès.")
      router.push(`/dashboard/terrain`)
    } catch (error) {
      console.error("Error deleting terrain:", error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          setErrorMessage(error.response.data.message || "Une erreur s'est produite lors de la suppression du terrain.")
        } else if (error.response?.status === 401) {
          setErrorMessage("Vous n'êtes pas autorisé à supprimer ce terrain.")
        } else if (error.response?.status === 404) {
          setErrorMessage("Le terrain n'a pas été trouvé.")
        } else {
          setErrorMessage("Une erreur s'est produite lors de la suppression du terrain.")
        }
        setIsErrorDialogOpen(true)
      } else {
        toast.error("Une erreur inattendue s'est produite. Veuillez réessayer.")
      }
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  const handleCancelReservation = () => {
    setIsCancelReservationDialogOpen(true)
  }

  const confirmCancelReservation = async () => {
    try {
      const token = localStorage.getItem("authToken")
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/terrains/cancel-reservation`, { 
        id,
        notify: notifyOnCancel 
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      toast.success("La réservation a été annulée avec succès.")
      fetchTerrainDetails()
    } catch (error) {
      console.error("Error cancelling reservation:", error)
      toast.error("Une erreur s'est produite lors de l'annulation de la réservation. Veuillez réessayer.")
    } finally {
      setIsCancelReservationDialogOpen(false)
      setNotifyOnCancel(false)
    }
  }

  const handleTerrainUpdated = () => {
    fetchTerrainDetails()
    setIsEditDialogOpen(false)
  }

  const handleConfirmReservation = () => {
    setIsNewContratDialogOpen(true)
  }

  const handleContratAdded = () => {
    fetchTerrainDetails()
    setIsNewContratDialogOpen(false)
  }

  const handleEditReservation = () => {
    if (terrain?.reservation) {
      const reservation = terrain.reservation
      const isClient = !!reservation.client
      const selectedPerson = reservation.client || reservation.prospect
      
      setEditReservationData({
        startDate: new Date(reservation.dateDebut).toISOString().split("T")[0],
        endDate: new Date(reservation.dateFin).toISOString().split("T")[0],
        selectedType: isClient ? "client" : "prospect",
        selectedClientOrProspect: selectedPerson?._id || "",
        comment: "",
        notify: false
      })
      
      // Pré-remplir la recherche avec le nom de la personne sélectionnée
      if (selectedPerson) {
        const searchTerm = `${selectedPerson.nom} ${selectedPerson.prenom}`.trim()
        if (isClient) {
          setEditClientSearch(searchTerm)
          setEditProspectSearch("")
        } else {
          setEditProspectSearch(searchTerm)
          setEditClientSearch("")
        }
      } else {
        setEditClientSearch("")
        setEditProspectSearch("")
      }
      
      setIsEditReservationDialogOpen(true)
    }
  }

  const handleUpdateReservation = async () => {
    const { startDate, endDate, selectedType, selectedClientOrProspect, notify } = editReservationData
    if (!startDate || !endDate || !selectedType || !selectedClientOrProspect) {
      toast.error("Veuillez remplir tous les champs requis pour modifier la réservation.")
      return
    }

    setIsUpdatingReservation(true)
    try {
      const token = localStorage.getItem("authToken")
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/terrains/edit-reservation`, {
        terrainId: terrain?._id,
        startDate,
        endDate,
        type: selectedType,
        clientOrProspectId: selectedClientOrProspect,
        comment: editReservationData.comment,
        notify
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      toast.success("La réservation a été modifiée avec succès.")
      setIsEditReservationDialogOpen(false)
      fetchTerrainDetails()
    } catch (error) {
      console.error("Error updating reservation:", error)
      toast.error("Impossible de modifier la réservation. Veuillez réessayer.")
    } finally {
      setIsUpdatingReservation(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'Disponible': 
        return { 
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
          icon: <Icons.checkCircle className="h-4 w-4" />
        }
      case 'Réservé': 
        return { 
          color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
          icon: <Icons.clock className="h-4 w-4" />
        }
      case 'En cours': 
        return { 
          color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
          icon: <Icons.spinner className="h-4 w-4" />
        }
      case 'Vendu': 
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
          icon: <Icons.check className="h-4 w-4" />
        }
      case 'Annulé': 
        return { 
          color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
          icon: <Icons.circleX className="h-4 w-4" />
        }
      case 'Cédé': 
        return { 
          color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
          icon: <Icons.heart className="h-4 w-4" />
        }
      default: 
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
          icon: <Icons.settings className="h-4 w-4" />
        }
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh] bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground dark:text-gray-400">Chargement des détails du terrain...</p>
        </div>
      </div>
    )
  }

  if (!terrain) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[80vh] gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-yellow-100 dark:bg-amber-900/50 rounded-full">
            <Icons.frown className="h-12 w-12 text-yellow-600 dark:text-amber-400" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Terrain non trouvé</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Le terrain que vous recherchez n'existe pas ou a été supprimé.</p>
            <Button variant="outline" onClick={() => router.push('/dashboard/terrain')} className="flex items-center gap-2">
              <Icons.arrowLeft className="h-4 w-4" />
              Retour à la liste
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(terrain.statut)

  const handleReserve = async () => {
    const { startDate, endDate, selectedClientOrProspect, notify } = reserveData
    if (!startDate || !endDate || !selectedType || !selectedClientOrProspect) {
      toast.error("Veuillez remplir tous les champs requis pour la réservation.")
      return
    }

    setIsReserving(true)
    try {
      const token = localStorage.getItem("authToken")
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/terrains/reserve`, {
        terrainId: terrain._id,
        startDate,
        endDate,
        type: selectedType,
        clientOrProspectId: selectedClientOrProspect,
        comment: reserveData.comment,
        notify
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      toast.success("Le terrain a été réservé avec succès.")
      setIsReserveDialogOpen(false)
      fetchTerrainDetails()
    } catch (error) {
      console.error("Error reserving terrain:", error)
      toast.error("Impossible de réserver le terrain. Veuillez réessayer.")
    } finally {
      setIsReserving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-gray-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/dashboard/terrain')} 
                className="flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800/80 transition-colors"
              >
                <Icons.arrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Retour</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Terrain {terrain.numero}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Détails et informations complètes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={`flex items-center gap-2 px-3 py-1 ${statusConfig.color}`}
              >
                {statusConfig.icon}
                {terrain.statut}
              </Badge>
              
              <div className="hidden sm:flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleEdit} 
                  className="flex items-center gap-2" 
                  disabled={terrain.statut !== 'Disponible' && terrain.statut !== 'Vendu' && terrain.statut !== 'Annulé'}
                >
                  <Icons.edit className="h-4 w-4" />
                  Modifier
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete} 
                  className="flex items-center gap-2" 
                  disabled={terrain.statut !== 'Disponible'}
                >
                  <Icons.trash className="h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Warning for reserved terrains with endDate < 3 days */}
        {terrain.statut === 'Réservé' && terrain.reservation && (
          <div className="mb-6">
            <TerrainExpirationWarning endDate={terrain.reservation.dateFin} />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white dark:border-blue-900/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 dark:text-blue-200 text-sm font-medium">Prix du terrain</p>
                    <p className="text-3xl font-bold">${terrain.prix.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-white/20 dark:bg-white/10 rounded-full">
                    <Icons.dollarSign className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Characteristics Card */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-800/80 dark:border-slate-700/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-gray-100">
                  <Icons.barChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Caractéristiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <Icons.barChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Dimension</p>
                      <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">{terrain.dimension || "-"} m</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                      <Icons.grid className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Superficie</p>
                      <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">{terrain.superficie || "-"} m²</p>
                    </div>
                  </div>
                  
                  {terrain.addBy && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg md:col-span-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                        <Icons.user className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Créé par</p>
                        <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">{terrain.addBy.nom} {terrain.addBy.postnom} {terrain.addBy.prenom}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-800/80 dark:border-slate-700/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-gray-100">
                  <Icons.mapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Localisation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <Icons.home className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Cité</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{terrain.cite.nom}</p>
                    </div>
                  </div>
                  
                  {terrain.cite.pays && terrain.cite.province && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <Icons.map className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Pays / Province</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{terrain.cite.pays}, {terrain.cite.province}</p>
                      </div>
                    </div>
                  )}
                  
                  {terrain.ville && terrain.commune && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <Icons.home className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Ville / Commune</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{terrain.cite.ville}, {terrain.cite.commune}</p>
                      </div>
                    </div>
                  )}
                  
                  {terrain.quartier && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <Icons.map className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Quartier</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{terrain.cite.quartier}</p>
                      </div>
                    </div>
                  )}
                  
                  {terrain.cite.reference && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <Icons.map className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Avenue</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{terrain.cite.reference}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description Card */}
            {terrain.description && (
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-800/80 dark:border-slate-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-gray-100">
                    <Icons.fileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{terrain.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reservation Status */}
            {terrain.statut === 'Réservé' && (
              <Card className="border-0 shadow-lg bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl text-amber-800 dark:text-amber-200">
                    <Icons.clock className="h-5 w-5" />
                    Réservation Active
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {terrain.reservation ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/60 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Date de réservation</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(terrain.reservation.dateReservation).toLocaleDateString('fr-FR', { timeZone: 'Africa/Kinshasa' })}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/60 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Début</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(terrain.reservation.dateDebut).toLocaleDateString('fr-FR', { timeZone: 'Africa/Kinshasa' })}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/60 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Fin</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(terrain.reservation.dateFin).toLocaleDateString('fr-FR', { timeZone: 'Africa/Kinshasa' })}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/60 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {terrain.reservation.client ? "Client" : "Prospect"}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {terrain.reservation.client 
                            ? `${terrain.reservation.client.nom} ${terrain.reservation.client.prenom}`
                            : `${terrain.reservation.prospect.nom} ${terrain.reservation.prospect.prenom}`
                          }
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-600 dark:text-gray-400 mb-4">Aucune réservation active</p>
                      <Button variant="outline" onClick={() => setIsReserveDialogOpen(true)}>
                        Créer une réservation
                      </Button>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      onClick={handleEditReservation}
                      className="w-full"
                    >
                      <Icons.edit className="h-4 w-4 mr-2" />
                      Prolonger la réservation
                    </Button>
                    
                    <Button 
                      variant="default" 
                      onClick={handleConfirmReservation}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Icons.fileText className="h-4 w-4 mr-2" />
                      Confirmer la réservation
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      onClick={handleCancelReservation}
                      className="w-full"
                    >
                      <Icons.x className="h-4 w-4 mr-2" />
                      Annuler la réservation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Information */}
            {client && (
              <Card className="border-0 shadow-lg bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl text-blue-800 dark:text-blue-200">
                    <Icons.user className="h-5 w-5" />
                    Informations Client
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/60 rounded-lg">
                    <Icons.user className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Nom complet</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{client.nom} {client.prenom}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/60 rounded-lg">
                    <Icons.mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{client.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/60 rounded-lg">
                    <Icons.phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Téléphone</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{client.indicatif} {client.telephone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/60 rounded-lg">
                    <Icons.mapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Adresse</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{client.adresse}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-800/80 dark:border-slate-700/50">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    onClick={handleEdit} 
                    className="w-full justify-start" 
                    disabled={terrain.statut !== 'Disponible'}
                  >
                    <Icons.edit className="h-4 w-4 mr-2" />
                    Modifier le terrain
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete} 
                    className="w-full justify-start" 
                    disabled={terrain.statut !== 'Disponible'}
                  >
                    <Icons.trash className="h-4 w-4 mr-2" />
                    Supprimer le terrain
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        {terrain && (
          <EditTerrainDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            terrain={terrain}
            onTerrainUpdated={handleTerrainUpdated}
            cites={cites}
          />
        )}

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-red-600 dark:text-red-400">
                <Icons.frown className="h-5 w-5" />
                Confirmer la suppression
              </DialogTitle>
              <DialogDescription className="mt-4 text-gray-600 dark:text-gray-400 dark:text-gray-500">
                Êtes-vous sûr de vouloir supprimer ce terrain ? Cette action est irréversible et ne peut pas être annulée.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                <Icons.trash className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCancelReservationDialogOpen} onOpenChange={setIsCancelReservationDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-amber-600 dark:text-amber-400">
                <Icons.frown className="h-5 w-5" />
                Confirmer l'annulation
              </DialogTitle>
              <DialogDescription className="mt-4 text-gray-600 dark:text-gray-400 dark:text-gray-500">
                Êtes-vous sûr de vouloir annuler cette réservation ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center mt-4 p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
                checked={notifyOnCancel}
                onChange={(e) => setNotifyOnCancel(e.target.checked)}
              />
              <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Notifier le client par email</label>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsCancelReservationDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmCancelReservation}>
                <Icons.x className="h-4 w-4 mr-2" />
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-red-600 dark:text-red-400">
                <Icons.frown className="h-5 w-5" />
                Erreur
              </DialogTitle>
              <DialogDescription className="mt-4 text-gray-600 dark:text-gray-400 dark:text-gray-500">{errorMessage}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Dialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl text-gray-900 dark:text-gray-100">
                <Icons.clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                Réserver le terrain
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mt-2">
                Remplissez les informations pour effectuer la réservation.
              </DialogDescription>
            </DialogHeader>

            <form className="mt-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date début</label>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 transition" 
                    value={reserveData.startDate}
                    onChange={(e) => setReserveData({ ...reserveData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date fin</label>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 transition" 
                    value={reserveData.endDate}
                    onChange={(e) => setReserveData({ ...reserveData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type de contact</label>
                <select
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">Sélectionner</option>
                  <option value="client">Client</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>

              {selectedType === "client" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rechercher un client</label>
                  <input
                    type="text"
                    placeholder="Nom du client..."
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-500 transition mb-2 placeholder:dark:text-gray-500"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                  <select 
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-500 transition"
                    onChange={(e) => setReserveData({ ...reserveData, selectedClientOrProspect: e.target.value })}
                  >
                    <option value="">Sélectionner un client</option>
                    {clients
                      .filter(client =>
                        !clientSearch || matchesSearch(client.nom, clientSearch) || matchesSearch(client.prenom, clientSearch)
                      )
                      .map(client => (
                        <option key={client._id} value={client._id}>{client.nom} {client.prenom}</option>
                      ))}
                  </select>
                </div>
              )}

              {selectedType === "prospect" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rechercher un prospect</label>
                  <input
                    type="text"
                    placeholder="Nom du prospect..."
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-500 transition mb-2 placeholder:dark:text-gray-500"
                    value={prospectSearch}
                    onChange={(e) => setProspectSearch(e.target.value)}
                  />
                  <select 
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-500 transition"
                    onChange={(e) => setReserveData({ ...reserveData, selectedClientOrProspect: e.target.value })}
                  >
                    <option value="">Sélectionner un prospect</option>
                    {prospects
                      .filter(prospect =>
                        !prospectSearch || matchesSearch(prospect.nom, prospectSearch) || matchesSearch(prospect.prenom, prospectSearch)
                      )
                      .map(prospect => (
                        <option key={prospect._id} value={prospect._id}>{prospect.nom} {prospect.prenom}</option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Commentaire</label>
                <textarea
                  placeholder="Ajoutez un commentaire..."
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-500 transition placeholder:dark:text-gray-500"
                  rows={3}
                  value={reserveData.comment}
                  onChange={(e) => setReserveData({ ...reserveData, comment: e.target.value })}
                />
              </div>

              <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
                  checked={reserveData.notify}
                  onChange={(e) => setReserveData({ ...reserveData, notify: e.target.checked })}
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Notifier le client/prospect</label>
              </div>
            </form>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsReserveDialogOpen(false)} disabled={isReserving}>
                Annuler
              </Button>
              <Button onClick={handleReserve} disabled={isReserving} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700">
                {isReserving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Icons.clock className="h-4 w-4 mr-2" />
                )}
                {isReserving ? "Réservation en cours…" : "Réserver"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditReservationDialogOpen} onOpenChange={setIsEditReservationDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl text-gray-900 dark:text-gray-100">
                <Icons.edit className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                Éditer la réservation
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mt-2">
                Modifiez les informations de la réservation existante.
              </DialogDescription>
            </DialogHeader>

            <form className="mt-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date début</label>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 transition" 
                    value={editReservationData.startDate}
                    onChange={(e) => setEditReservationData({ ...editReservationData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date fin</label>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 transition" 
                    value={editReservationData.endDate}
                    onChange={(e) => setEditReservationData({ ...editReservationData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type de contact</label>
                <select
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                  value={editReservationData.selectedType}
                  onChange={(e) => setEditReservationData({ ...editReservationData, selectedType: e.target.value, selectedClientOrProspect: "" })}
                >
                  <option value="">Sélectionner</option>
                  <option value="client">Client</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>

              {editReservationData.selectedType === "client" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rechercher un client</label>
                  <input
                    type="text"
                    placeholder="Nom du client..."
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-500 transition mb-2 placeholder:dark:text-gray-500"
                    value={editClientSearch}
                    onChange={(e) => setEditClientSearch(e.target.value)}
                  />
                  <select 
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-500 transition"
                    value={editReservationData.selectedClientOrProspect}
                    onChange={(e) => setEditReservationData({ ...editReservationData, selectedClientOrProspect: e.target.value })}
                  >
                    <option value="">Sélectionner un client</option>
                    {clients
                      .filter(client =>
                        !editClientSearch || matchesSearch(client.nom, editClientSearch) || matchesSearch(client.prenom, editClientSearch)
                      )
                      .map(client => (
                        <option key={client._id} value={client._id}>{client.nom} {client.prenom}</option>
                      ))}
                  </select>
                </div>
              )}

              {editReservationData.selectedType === "prospect" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rechercher un prospect</label>
                  <input
                    type="text"
                    placeholder="Nom du prospect..."
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-500 transition mb-2 placeholder:dark:text-gray-500"
                    value={editProspectSearch}
                    onChange={(e) => setEditProspectSearch(e.target.value)}
                  />
                  <select 
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-500 transition"
                    value={editReservationData.selectedClientOrProspect}
                    onChange={(e) => setEditReservationData({ ...editReservationData, selectedClientOrProspect: e.target.value })}
                  >
                    <option value="">Sélectionner un prospect</option>
                    {prospects
                      .filter(prospect =>
                        !editProspectSearch || matchesSearch(prospect.nom, editProspectSearch) || matchesSearch(prospect.prenom, editProspectSearch)
                      )
                      .map(prospect => (
                        <option key={prospect._id} value={prospect._id}>{prospect.nom} {prospect.prenom}</option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Commentaire</label>
                <textarea
                  placeholder="Ajoutez un commentaire..."
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-500 transition placeholder:dark:text-gray-500"
                  rows={3}
                  value={editReservationData.comment}
                  onChange={(e) => setEditReservationData({ ...editReservationData, comment: e.target.value })}
                />
              </div>

              <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
                  checked={editReservationData.notify}
                  onChange={(e) => setEditReservationData({ ...editReservationData, notify: e.target.checked })}
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Notifier le client/prospect </label>
              </div>
            </form>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsEditReservationDialogOpen(false)} disabled={isUpdatingReservation}>
                Annuler
              </Button>
              <Button onClick={handleUpdateReservation} disabled={isUpdatingReservation} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700">
                {isUpdatingReservation ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Icons.edit className="h-4 w-4 mr-2" />
                )}
                {isUpdatingReservation ? "Enregistrement en cours…" : "Modifier"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {terrain && (
          <NewContratDialog
            open={isNewContratDialogOpen}
            onOpenChange={setIsNewContratDialogOpen}
            onContratAdded={handleContratAdded}
            clients={allClients}
            terrains={allTerrains}
            cites={cites}
            defaultValues={{
              clientId: terrain.reservation?.client?._id || terrain.reservation?.prospect?._id || "",
              citeId: terrain.cite._id,
              terrainId: terrain._id,
              dateDebut: terrain.reservation?.dateDebut ? new Date(terrain.reservation.dateDebut).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
            }}
            isConfirmingReservation={true}
            reservationInfo={{
              clientName: terrain.reservation?.client 
                ? `${terrain.reservation.client.nom} ${terrain.reservation.client.prenom} ${terrain.reservation.client.postnom}`
                : terrain.reservation?.prospect
                ? `${terrain.reservation.prospect.nom} ${terrain.reservation.prospect.prenom} ${terrain.reservation.prospect.postnom}`
                : "",
              citeName: terrain.cite.nom,
              terrainNumber: terrain.numero
            }}
          />
        )}
      </div>
    </div>
  )
}
