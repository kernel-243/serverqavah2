"use client"

import { useState } from "react"
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
import { ErrorDialog } from "./error-dialog"

const formSchema = z.object({
  numero: z.string().min(1, "Numéro est requis"),
  dimension: z.string(),
  superficie: z.string(),
  cite: z.string().min(1, "Cite est requise"),
  statut: z.enum(["Disponible", "Réservé", "Vendu", "Annulé", "Cédé", "En cours"]).default("Disponible"),
  prix: z.string(),
  description: z.string().optional(),
})

interface Cite {
  _id: string
  nom: string
  code: string
  description?: string
  addBy?: {
    nom: string
  }
  createdAt?: string
  ville?: string
  frais_cadastraux?: number
}

type FormData = z.infer<typeof formSchema>

interface NewTerrainDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTerrainAdded: () => void
  cites: Cite[]
}

export function NewTerrainDialog({ open, onOpenChange, onTerrainAdded, cites }: NewTerrainDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fraisCadastrauxInclus, setFraisCadastrauxInclus] = useState(true)
  const { toast } = useToast()
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
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
      statut: "Disponible",
    },
  })

  const selectedCiteId = watch("cite")
  const selectedCite = cites.find(c => c._id === selectedCiteId)
  const fraisCadastraux = selectedCite?.frais_cadastraux ?? 0

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/terrains`, {
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
        description: "Le terrain a été ajouté avec succès.",
      })
      onOpenChange(false)
      onTerrainAdded()
      reset()
      setFraisCadastrauxInclus(true)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        setErrorDialogOpen(true)
        setErrorMessage(error.response.data.message || "Les données soumises sont invalides. Veuillez vérifier les champs.")
      } else if (axios.isAxiosError(error) && error.response?.status === 403) {
        setErrorDialogOpen(true)
        setErrorMessage("Vous n'avez pas la permission d'effectuer cette action, veuillez contacter votre administrateur")
      } else {
        setErrorDialogOpen(true)
        setErrorMessage("Impossible d'ajouter le terrain. Veuillez réessayer.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau terrain</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              {[
                { id: "numero", label: "Numéro*", placeholder: "", type: "text", required: true },
                { id: "dimension", label: "Dimension", placeholder: "ex: 20/20", type: "text", required: false },
                { id: "superficie", label: "Superficie", placeholder: "ex: 400", type: "number", required: false, unit: "m²" },
                { id: "prix", label: "Prix", placeholder: "", type: "text", required: false, unit: "$" }
              ].map(({ id, label, placeholder, type, required, unit }) => (
                <div key={id} className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={id} className="text-right">
                    {label}
                  </Label>
                  <div className="col-span-3 relative">
                    <Input id={id as keyof FormData} type={type} placeholder={placeholder} {...register(id as keyof FormData)} className={unit ? "pr-8" : ""} />
                    {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unit}</span>}
                  </div>
                  {errors[id as keyof FormData] && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors[id as keyof FormData]?.message}</p>}
                </div>
              ))}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cite" className="text-right">
                  Cité*
                </Label>
                <Controller
                  name="cite"
                  control={control}
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
                      id="frais_cadastraux_inclus"
                      checked={fraisCadastrauxInclus}
                      onCheckedChange={(checked) => setFraisCadastrauxInclus(!!checked)}
                    />
                    <Label htmlFor="frais_cadastraux_inclus" className="cursor-pointer font-normal">
                      Frais cadastraux inclus
                    </Label>
                  </div>
                  {!fraisCadastrauxInclus && (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Frais cadastraux de la cité :</span>
                      <span className="font-semibold">{fraisCadastraux.toLocaleString("fr-FR")} $</span>
                      {!selectedCiteId && (
                        <span className="text-xs text-muted-foreground italic">(sélectionnez une cité)</span>
                      )}
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
                  defaultValue="Disponible"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Sélectionner le statut" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Disponible", "Réservé", "Vendu", "Annulé", "Cédé", "En cours"].map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.statut && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.statut.message}</p>}
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
                    Ajout en cours...
                  </>
                ) : (
                  "Ajouter le terrain"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ErrorDialog
        isOpen={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        title="Erreur"
        message={errorMessage}
      />
    </>
  )
}
