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
import { ConstructionContract } from "@/types/construction"

interface EditConstructionContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contratId: string
  onContractUpdated: () => void
}

export function EditConstructionContractDialog({
  open,
  onOpenChange,
  contratId,
  onContractUpdated,
}: EditConstructionContractDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [formData, setFormData] = useState<Partial<ConstructionContract>>({})

  useEffect(() => {
    if (open && contratId) {
      fetchContractData()
    }
  }, [open, contratId])

  const fetchContractData = async () => {
    setIsFetching(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/construction/contrats/${contratId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const contract = response.data.contrat
      // Convert date objects to strings for input fields
      setFormData({
        ...contract,
        dateContrat: contract.dateContrat ? new Date(contract.dateContrat).toISOString().split('T')[0] : '',
        dateDebut: contract.dateDebut ? new Date(contract.dateDebut).toISOString().split('T')[0] : '',
        dateFin: contract.dateFin ? new Date(contract.dateFin).toISOString().split('T')[0] : '',
      })
    } catch (error) {
      devLog.error("Error fetching contract:", error)
      toast.error("Erreur lors du chargement du contrat")
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/construction/contrats/${contratId}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      devLog.log("Contract updated:", response.data)
      toast.success("Contrat modifié avec succès")
      onContractUpdated()
      onOpenChange(false)
    } catch (error) {
      devLog.error("Error updating contract:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem("authToken")
        window.location.href = "/auth/login"
        return
      }
      toast.error("Erreur lors de la modification du contrat")
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex justify-center items-center py-8">
            <Icons.spinner className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le Contrat</DialogTitle>
          <DialogDescription>
            Modifier les informations du contrat de construction
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="statut">Statut du Contrat *</Label>
              <Select
                value={formData.statut}
                onValueChange={(value: any) => setFormData({ ...formData, statut: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_attente">En Attente</SelectItem>
                  <SelectItem value="en_cours">En Cours</SelectItem>
                  <SelectItem value="termine">Terminé</SelectItem>
                  <SelectItem value="resilie">Résilié</SelectItem>
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
                value={formData.echelons || ""}
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
                value={formData.dateContrat || ""}
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
                  value={formData.dateDebut || ""}
                  onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateFin">Date de Fin *</Label>
                <Input
                  id="dateFin"
                  type="date"
                  value={formData.dateFin || ""}
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
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termes">Termes et Conditions</Label>
              <Textarea
                id="termes"
                value={formData.termes || ""}
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
              Modifier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
