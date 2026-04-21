"use client"

import { useState } from "react"
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
import { NewConstructionProspectData } from "@/types/construction"
import { CountryIndicativeSelect } from "@/components/country-indicative-select"

interface NewConstructionProspectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProspectCreated: () => void
}

export function NewConstructionProspectDialog({
  open,
  onOpenChange,
  onProspectCreated,
}: NewConstructionProspectDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<NewConstructionProspectData>({
    nom: "",
    postnom: "",
    prenom: "",
    sexe: undefined,
    indicatif: "+243",
    telephone: "",
    email: "",
    typeProjet: "",
    budgetEstime: undefined,
    commentaire: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/construction/prospects`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      devLog.log("Prospect created:", response.data)
      toast.success("Prospect créé avec succès")
      onProspectCreated()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        nom: "",
        postnom: "",
        prenom: "",
        sexe: undefined,
        indicatif: "+243",
        telephone: "",
        email: "",
        typeProjet: "",
        budgetEstime: undefined,
        commentaire: "",
      })
    } catch (error) {
      devLog.error("Error creating prospect:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem("authToken")
        window.location.href = "/auth/login"
        return
      }
      toast.error("Erreur lors de la création du prospect")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau Prospect de Construction</DialogTitle>
          <DialogDescription>
            Ajouter un nouveau prospect au système de construction
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Informations Personnelles</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postnom">Postnom</Label>
                <Input
                  id="postnom"
                  value={formData.postnom}
                  onChange={(e) => setFormData({ ...formData, postnom: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sexe">Sexe</Label>
                <Select
                  value={formData.sexe}
                  onValueChange={(value: any) => setFormData({ ...formData, sexe: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                    <SelectItem value="Monsieur/Madame">Monsieur/Madame</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contact</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="indicatif">Indicatif *</Label>
                <CountryIndicativeSelect
                  value={formData.indicatif}
                  onValueChange={(value) => setFormData({ ...formData, indicatif: value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone *</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Project Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Informations sur le Projet</h3>
            
            <div className="space-y-2">
              <Label htmlFor="typeProjet">Type de Projet</Label>
              <Select
                value={formData.typeProjet}
                onValueChange={(value) => setFormData({ ...formData, typeProjet: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residentiel">Résidentiel</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="renovation">Rénovation</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetEstime">Budget Estimé ($)</Label>
              <Input
                id="budgetEstime"
                type="number"
                value={formData.budgetEstime || ""}
                onChange={(e) => setFormData({ ...formData, budgetEstime: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commentaire">Commentaire / Notes</Label>
              <Textarea
                id="commentaire"
                value={formData.commentaire}
                onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                rows={4}
                placeholder="Détails sur le projet, exigences spécifiques, etc."
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
              Créer le Prospect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
