"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Icons } from "@/components/icons"
import axios from "axios"
import { toast } from "sonner"
import { devLog } from "@/lib/devLogger"
import { Textarea } from "@/components/ui/textarea"

interface NewConstructionContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContractCreated: () => void
}

export function NewConstructionContractDialog({
  open,
  onOpenChange,
  onContractCreated,
}: NewConstructionContractDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [formData, setFormData] = useState({
    clientId: "",
    projectId: "",
    typeContrat: "forfaitaire",
    montantTotal: 0,
    acompte: 0,
    echelons: 1,
    dateContrat: "",
    dateDebut: "",
    dateFin: "",
    description: "",
    termes: "",
  })

  useEffect(() => {
    if (open) {
      fetchClientsAndProjects()
    }
  }, [open])

  const fetchClientsAndProjects = async () => {
    setIsLoadingData(true)
    try {
      const token = localStorage.getItem("authToken")
      
      // Fetch clients
      try {
        const clientsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/construction/clients?limit=1000&statut=active`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        setClients(clientsResponse.data.clients || [])
      } catch (error) {
        devLog.error("Error fetching clients:", error)
        setClients([])
      }

      // Fetch projects
      try {
        const projectsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/construction/projects?limit=1000&statut_record=active`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        setProjects(projectsResponse.data.projects || [])
      } catch (error) {
        devLog.error("Error fetching projects:", error)
        setProjects([])
      }
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/construction/contrats`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      devLog.log("Contract created:", response.data)
      toast.success("Contrat créé avec succès")
      onContractCreated()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        clientId: "",
        projectId: "",
        typeContrat: "forfaitaire",
        montantTotal: 0,
        acompte: 0,
        echelons: 1,
        dateContrat: "",
        dateDebut: "",
        dateFin: "",
        description: "",
        termes: "",
      })
    } catch (error) {
      devLog.error("Error creating contract:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem("authToken")
        window.location.href = "/auth/login"
        return
      }
      toast.error("Erreur lors de la création du contrat")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center space-y-2">
              <Icons.spinner className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
              <p className="text-sm text-muted-foreground">Chargement des données...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau Contrat de Construction</DialogTitle>
          <DialogDescription>
            Créer un nouveau contrat de construction
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client and Project */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Client et Projet</h3>
            
            <div className="space-y-2">
              <Label htmlFor="clientId">Client *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length > 0 ? (
                    clients.map((client) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.prenom} {client.nom} - {client.code}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Aucun client disponible
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Projet *</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length > 0 ? (
                    projects.map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.nom} - {project.code}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Aucun projet disponible
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contract Type and Financial */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Informations du Contrat</h3>
            
            <div className="space-y-2">
              <Label htmlFor="typeContrat">Type de Contrat *</Label>
              <Select
                value={formData.typeContrat}
                onValueChange={(value: any) => setFormData({ ...formData, typeContrat: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forfaitaire">Forfaitaire</SelectItem>
                  <SelectItem value="regie">Régie</SelectItem>
                  <SelectItem value="mixte">Mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="montantTotal">Montant Total ($) *</Label>
                <Input
                  id="montantTotal"
                  type="number"
                  value={formData.montantTotal || ""}
                  onChange={(e) => setFormData({ ...formData, montantTotal: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="acompte">Acompte ($) *</Label>
                <Input
                  id="acompte"
                  type="number"
                  value={formData.acompte || ""}
                  onChange={(e) => setFormData({ ...formData, acompte: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="echelons">Nombre d'Échelons *</Label>
              <Input
                id="echelons"
                type="number"
                min="1"
                value={formData.echelons}
                onChange={(e) => setFormData({ ...formData, echelons: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Dates</h3>
            
            <div className="space-y-2">
              <Label htmlFor="dateContrat">Date du Contrat *</Label>
              <Input
                id="dateContrat"
                type="date"
                value={formData.dateContrat}
                onChange={(e) => setFormData({ ...formData, dateContrat: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateDebut">Date de Début *</Label>
                <Input
                  id="dateDebut"
                  type="date"
                  value={formData.dateDebut}
                  onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateFin">Date de Fin *</Label>
                <Input
                  id="dateFin"
                  type="date"
                  value={formData.dateFin}
                  onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Informations Additionnelles</h3>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termes">Termes et Conditions</Label>
              <Textarea
                id="termes"
                value={formData.termes}
                onChange={(e) => setFormData({ ...formData, termes: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-orange-500 hover:bg-orange-600">
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Créer le Contrat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
