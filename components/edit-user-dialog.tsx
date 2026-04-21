"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import axios from "axios"

const formSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  role: z.enum(["Admin", "Agent"]),
  salaire: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface User {
  _id: string
  nom: string
  email: string
  role: string
  dateCreated: string
  lastLogon: string
  salaire?: number
}

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  onUserUpdated: () => void
}

export function EditUserDialog({ open, onOpenChange, user, onUserUpdated }: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: user.nom,
      email: user.email,
      role: user.role as "Admin" | "Agent",
      salaire: user.salaire !== undefined ? String(user.salaire) : "",
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("authToken")
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/users/${user._id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      toast({
        title: "Succès",
        description: "L'utilisateur a été mis à jour avec succès.",
      })
      onUserUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'utilisateur. Veuillez réessayer.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier l'Utilisateur</DialogTitle>
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
            <Select defaultValue={user.role} {...register("role")}>
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
                  Mise à jour...
                </>
              ) : (
                "Mettre à jour"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

