"use client"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import axios from "axios"
import { ErrorDialog } from "@/components/error-dialog"

const formSchema = z.object({
  numero: z.string().min(1, "Numéro est requis"),
  dimension: z.string(),
  superficie: z.string(),
  cite: z.string().min(1, "Cite est requise"),
  statut: z.enum(["Disponible", "Réservé", "Vendu", "Annulé", "Cédé", "En cours"]),
  prix: z.string().min(1, "Prix est requis"),
  description: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface Cite {
  _id: string
  nom: string
  frais_cadastraux?: number
}

interface EditTerrainDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  terrain: {
    _id: string
    numero: string
    dimension: string
    superficie: string
    disponible: boolean
    cite: {
      _id: string
      nom: string
    }
    prix: number
    description?: string
    statut: "Disponible" | "Réservé" | "Vendu" | "Annulé" | "Cédé" | "En cours"
    frais_cadastraux_inclus?: boolean
  }
  onTerrainUpdated: () => void
  cites: Cite[]
}

export function EditTerrainDialog({ open, onOpenChange, terrain, onTerrainUpdated, cites }: EditTerrainDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fraisCadastrauxInclus, setFraisCadastrauxInclus] = useState(terrain.frais_cadastraux_inclus !== false)
  const { toast } = useToast()
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero: terrain.numero,
      dimension: terrain.dimension,
      superficie: terrain.superficie,
      cite: terrain.cite._id,
      statut: terrain.statut,
      prix: terrain.prix ? terrain.prix.toString() : "0",
      description: terrain.description || "",
    },
  })

  const selectedCiteId = watch("cite")
  const selectedCite = cites.find(c => c._id === selectedCiteId)
  const fraisCadastraux = selectedCite?.frais_cadastraux ?? 0

  useEffect(() => {
    if (open) {
      reset({
        numero: terrain.numero,
        dimension: terrain.dimension,
        superficie: terrain.superficie,
        cite: terrain.cite._id,
        statut: terrain.statut,
        prix: terrain.prix ? terrain.prix.toString() : "0",
        description: terrain.description || "",
      })
      setFraisCadastrauxInclus(terrain.frais_cadastraux_inclus !== false)
    }
  }, [open, terrain, reset])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("authToken")
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/terrains/${terrain._id}`, {
        ...data,
        frais_cadastraux_inclus: fraisCadastrauxInclus,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      toast({
        title: "Succès",
        description: "Le terrain a été mis à jour avec succès.",
      })
      onOpenChange(false)
      onTerrainUpdated()
    } catch (error) {
      console.error("Error updating terrain:", error)
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        setErrorMessage(error.response.data.message || "Une erreur s'est produite lors de la mise à jour du terrain.")
        setIsErrorDialogOpen(true)
      } else if (axios.isAxiosError(error) && error.response?.status === 403) {
        setErrorMessage("Vous n'avez pas la permission d'effectuer cette action, veuillez contacter votre administrateur")
        setIsErrorDialogOpen(true)
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le terrain. Veuillez réessayer.",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le terrain</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="numero" className="text-right">
                Numéro*
              </Label>
              <Input id="numero" className="col-span-3" {...register("numero")} />
              {errors.numero && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.numero.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dimension" className="text-right">
                Dimension*
              </Label>
              <div className="col-span-3">
                <Input id="dimension" {...register("dimension")} placeholder="ex: 20/20" />
                <p className="text-sm text-muted-foreground mt-1">Format: largeur/longueur</p>
              </div>
              {errors.dimension && (
                <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.dimension.message}</p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="superficie" className="text-right">
                Superficie*
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="superficie"
                  type="number"
                  {...register("superficie")}
                  className="pr-8"
                  placeholder="ex: 400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">m²</span>
              </div>
              {errors.superficie && (
                <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.superficie.message}</p>
              )}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cite" className="text-right">
                Cité*
              </Label>
              <Controller
                name="cite"
                control={control}
                defaultValue={terrain.cite._id}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner une cité" />
                    </SelectTrigger>
                    <SelectContent>
                      {cites.map((cite) => (
                        <SelectItem key={cite._id} value={cite._id}>
                          {cite.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cite && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.cite.message}</p>}
            </div>

            {/* Frais cadastraux */}
            <div className="grid grid-cols-4 items-start gap-4">
              <div className="col-start-2 col-span-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="frais_cadastraux_inclus_edit"
                    checked={fraisCadastrauxInclus}
                    onCheckedChange={(checked) => setFraisCadastrauxInclus(!!checked)}
                  />
                  <Label htmlFor="frais_cadastraux_inclus_edit" className="cursor-pointer font-normal">
                    Frais cadastraux inclus
                  </Label>
                </div>
                {!fraisCadastrauxInclus && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Frais cadastraux de la cité :</span>
                    <span className="font-semibold">{fraisCadastraux.toLocaleString("fr-FR")} $</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="statut" className="text-right">
                Statut*
              </Label>
              <Controller
                name="statut"
                control={control}
                defaultValue={terrain.statut}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner le statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="Réservé">Réservé</SelectItem>
                      <SelectItem value="Vendu">Vendu</SelectItem>
                      <SelectItem value="Annulé">Annulé</SelectItem>
                      <SelectItem value="Cédé">Cédé</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.statut && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.statut.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="prix" className="text-right">
                Prix*
              </Label>
              <Input id="prix" className="col-span-3" {...register("prix")} />
              {errors.prix && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.prix.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea id="description" className="col-span-3" {...register("description")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour en cours...
                </>
              ) : (
                "Mettre à jour le terrain"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <ErrorDialog
        isOpen={isErrorDialogOpen}
        onClose={() => setIsErrorDialogOpen(false)}
        title="Erreur de mise à jour"
        message={errorMessage}
      />
    </Dialog>
  )
}
