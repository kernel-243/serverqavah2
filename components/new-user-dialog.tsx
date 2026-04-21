"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Icons } from "@/components/icons"
import axios from "axios"

const formSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  role: z.enum(["Admin", "Agent"]),
  salaire: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface NewUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserAdded: () => void
}

export function NewUserDialog({ open, onOpenChange, onUserAdded }: NewUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "Agent",
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setErrorMessage("")
    try {
      const token = localStorage.getItem("authToken")
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/create`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      reset()
      onOpenChange(false)
      setSuccessDialogOpen(true)
    } catch (err) {
      console.error("Error creating user:", err)
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "Impossible de créer l'utilisateur. Veuillez réessayer."
      setErrorMessage(message)
      setErrorDialogOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuccessClose = () => {
    setSuccessDialogOpen(false)
    onUserAdded()
  }

  const handleSuccessOpenChange = (open: boolean) => {
    setSuccessDialogOpen(open)
    if (!open) onUserAdded()
  }

  const handleErrorClose = () => {
    setErrorDialogOpen(false)
    setErrorMessage("")
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nouvel Utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-red-500">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select defaultValue="Agent" {...register("role")}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Agent">Agent</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
          </div>
         
          <div className="space-y-2">
            <Label htmlFor="salaire">Salaire</Label>
            <Input id="salaire" type="number" min="0" placeholder="Ex: 500" {...register("salaire")} />
            {errors.salaire && <p className="text-sm text-red-500">{errors.salaire.message}</p>}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer l'utilisateur"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Success dialog */}
    <AlertDialog open={successDialogOpen} onOpenChange={handleSuccessOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Icons.checkCircle className="h-5 w-5" />
            Succès
          </AlertDialogTitle>
          <AlertDialogDescription>
            L'utilisateur a été créé avec succès. Un mail d'initialisation de mot de passe lui a été envoyé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleSuccessClose}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Error dialog */}
    <AlertDialog open={errorDialogOpen} onOpenChange={(open) => !open && handleErrorClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Icons.alertTriangle className="h-5 w-5" />
            Erreur
          </AlertDialogTitle>
          <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleErrorClose}>Fermer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  )
}

