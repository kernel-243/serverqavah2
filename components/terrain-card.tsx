"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Icons } from "@/components/icons"
import { EditTerrainDialog } from "@/components/edit-terrain-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TerrainExpirationWarning } from "@/components/terrain-expiration-warning"
import axios from "axios"
import { toast } from "react-hot-toast"
import { matchesSearch } from "@/lib/normalizeForSearch"

interface Cite {
  _id: string
  nom: string
}

interface Client {
  _id: string
  code?: string
  nom: string
  prenom: string
}

interface Prospect {
  _id: string
  numeroPC?: string
  nom: string
  prenom: string
}

interface TerrainCardProps {
  terrain: {
    _id: string
    numero: string
    dimension: string
    superficie: string
    disponible: boolean
    pays: string
    province: string
    ville: string
    cite: {
      _id: string
      nom: string
      ville: string
      commune: string
    }
    commune: string
    quartier?: string
    avenue?: string
    prix: number
    description?: string
    statut: "Disponible" | "Réservé" | "Vendu" | "Annulé" | "Cédé" | "En cours"
    reservation?: {
      dateReservation: Date
      dateDebut: Date
      dateFin: Date
      client?: Client
      prospect?: Prospect
    }
  }
  cites: Cite[]
  clients: Client[]
  prospects: Prospect[]
  onTerrainUpdated: () => void
}

export function TerrainCard({ terrain, onTerrainUpdated, cites, clients, prospects }: TerrainCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
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
  const router = useRouter()

  const handleEdit = () => {
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
   
      const token = localStorage.getItem("authToken")
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/terrains/${terrain._id}`, terrain, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      toast.success("Le terrain a été mis à jour avec succès.")
      onTerrainUpdated()
    } catch (error) {
      console.error("Error updating terrain:", error)
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setErrorMessage("Vous n'avez pas la permission d'effectuer cette action, veuillez contacter votre administrateur")
        setIsErrorDialogOpen(true)
      } else {
        toast.error("Impossible de mettre à jour le terrain. Veuillez réessayer.")
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleViewMore = () => {
    router.push(`/dashboard/terrain/${terrain._id}`)
  }

  const handleDelete = () => {
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/terrains/${terrain._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      toast.success("Le terrain a été supprimé avec succès.")
      onTerrainUpdated()
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

  const handleReserve = async () => {
    const { startDate, endDate, selectedClientOrProspect, notify } = reserveData
    if (!startDate || !endDate || !selectedType || !selectedClientOrProspect) {
      toast.error("Veuillez remplir tous les champs requis pour la réservation.")
      return
    }

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
      onTerrainUpdated()
      setIsReserveDialogOpen(false)
    } catch (error) {
      console.error("Error reserving terrain:", error)
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setErrorMessage("Vous n'avez pas la permission d'effectuer cette action, veuillez contacter votre administrateur")
        setIsErrorDialogOpen(true)
      } else {
        toast.error("Impossible de réserver le terrain. Veuillez réessayer.")
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Disponible': return 'bg-green-500'
      case 'Réservé': return 'bg-yellow-500'
      case 'En cours': return 'bg-orange-500'
      case 'Vendu': 
      case 'vendu': return 'bg-blue-500'
      case 'Annulé': return 'bg-red-500'
      case 'Cédé': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch(status) {
      case 'Disponible': return 'border-t-green-500'
      case 'Réservé': return 'border-t-yellow-500'
      case 'En cours': return 'border-t-orange-500'
      case 'Vendu': 
      case 'vendu': return 'border-t-blue-500'
      case 'Annulé': return 'border-t-red-500'
      case 'Cédé': return 'border-t-purple-500'
      default: return 'border-t-gray-500'
    }
  }

  return (
    <>
    <Card className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-t-4 ${getStatusBorderColor(terrain.statut)} relative`} >
      {terrain.statut === 'Réservé' && (
        <div className="absolute top-0 left-0 bg-yellow-500 text-white text-xs font-bold px-2 py-1">
          Réservé
        </div>
      )}
      {terrain.statut === 'En cours' && (
        <div className="absolute top-0 left-0 bg-orange-500 text-white text-xs font-bold px-2 py-1">
          En cours
        </div>
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" onClick={handleViewMore}>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          {terrain.numero} 
          <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(terrain.statut)}`} 
                title={terrain.statut.charAt(0).toUpperCase() + terrain.statut.slice(1)} />
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100" onClick={(e) => e.stopPropagation()}>
              <span className="sr-only">Open menu</span>
              <Icons.moreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleViewMore()
              }}
              className="flex items-center gap-2"
            >
              <Icons.eye className="h-4 w-4" />
              Voir +
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleEdit()
              }}
              className="flex items-center gap-2"
              disabled={terrain.statut !== 'Disponible'}
            >
              <Icons.edit className="h-4 w-4" />
              Editer
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              className="flex items-center gap-2 text-red-600"
              disabled={terrain.statut !== 'Disponible'}
            >
              <Icons.trash className="h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Icons.home className="h-4 w-4" />
          Cité {terrain.cite.nom}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Icons.map className="h-4 w-4" />
          {terrain.cite.ville}/{terrain.cite.commune}
        </div>
        <div className="text-xl font-bold text-primary mt-4">
          ${terrain.prix && terrain.prix > 0 ? terrain.prix.toLocaleString() : "0"}
        </div>
        {terrain.description && (
          <div className="text-sm text-gray-600 mt-2 line-clamp-2">
            {terrain.description}
          </div>
        )}
        <div className="flex gap-2 text-xs text-gray-500 mt-2">
          <span className="px-2 py-1 bg-gray-100 rounded-full">{terrain.dimension || "-"}</span>
          <span className="px-2 py-1 bg-gray-100 rounded-full">{terrain.superficie || "-"}</span>
          {terrain.statut === 'Disponible' && (
            <button 
              className="px-2 py-1 bg-blue-100 text-blue-600 rounded shadow-sm hover:shadow-md"
              onClick={() => setIsReserveDialogOpen(true)}
            >
              Réservé
            </button>
          )}
        </div>
      </CardContent>
      
      {/* Warning for reserved terrains with endDate < 3 days */}
      {terrain.statut === 'Réservé' && terrain.reservation && (
        <div className="px-6 pb-4">
          <p>
          </p>
          <TerrainExpirationWarning endDate={terrain.reservation.dateFin} />
        </div>
      )}
      
      <EditTerrainDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        terrain={terrain}
        cites={cites}
        onTerrainUpdated={onTerrainUpdated}
      />
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Confirmer la suppression</DialogTitle>
            <DialogDescription className="mt-4">
              Êtes-vous sûr de vouloir supprimer ce terrain ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen}>
        <DialogContent className="max-w-lg rounded-lg shadow-lg p-6 bg-white dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-gray-800 dark:text-white">📅 Réserver le terrain</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Remplissez les informations pour effectuer la réservation.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date début</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 transition"
                  value={reserveData.startDate}
                  onChange={(e) => setReserveData({ ...reserveData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date fin</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 transition"
                  value={reserveData.endDate}
                  onChange={(e) => setReserveData({ ...reserveData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Choisir</label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 transition"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom du Client</label>
                <input
                  type="text"
                  placeholder="🔍 Rechercher un client..."
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-500 transition"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
                <select
                  className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-500 transition"
                  onChange={(e) => setReserveData({ ...reserveData, selectedClientOrProspect: e.target.value })}
                >
                  <option value="">Sélectionner un client</option>
                  {clients
                    .filter(client => !clientSearch || matchesSearch(client.nom, clientSearch) || matchesSearch(client.prenom, clientSearch) || matchesSearch(client.code || '', clientSearch))
                    .map(client => (
                      <option key={client._id} value={client._id}>{client.code ? `[${client.code}] ` : ''}{client.nom} {client.prenom}</option>
                    ))}
                </select>
              </div>
            )}

            {selectedType === "prospect" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom du Prospect</label>
                <input
                  type="text"
                  placeholder="🔍 Rechercher un prospect..."
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-500 transition"
                  value={prospectSearch}
                  onChange={(e) => setProspectSearch(e.target.value)}
                />
                <select
                  className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-500 transition"
                  onChange={(e) => setReserveData({ ...reserveData, selectedClientOrProspect: e.target.value })}
                >
                  <option value="">Sélectionner un prospect</option>
                  {prospects
                    .filter(prospect => !prospectSearch || matchesSearch(prospect.nom, prospectSearch) || matchesSearch(prospect.prenom, prospectSearch) || matchesSearch(prospect.numeroPC || '', prospectSearch))
                    .map(prospect => (
                      <option key={prospect._id} value={prospect._id}>{prospect.numeroPC ? `[${prospect.numeroPC}] ` : ''}{prospect.nom} {prospect.prenom}</option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Commentaire</label>
              <textarea
                placeholder="Ajoutez un commentaire..."
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 shadow-sm focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-500 transition"
                value={reserveData.comment}
                onChange={(e) => setReserveData({ ...reserveData, comment: e.target.value })}
              />
            </div>

            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                checked={reserveData.notify}
                onChange={(e) => setReserveData({ ...reserveData, notify: e.target.checked })}
              />
              <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Notifier le client/prospect</label>
            </div>
          </form>

          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsReserveDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="default" onClick={handleReserve}>
              Réserver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
    <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600">Erreur</DialogTitle>
          <DialogDescription className="mt-4">{errorMessage}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
    </>
  )
}
