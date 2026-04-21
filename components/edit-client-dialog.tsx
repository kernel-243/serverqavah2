"use client"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import { authRequest } from "@/lib/authRequest"
import axios from "axios"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  nom: z.string().min(1, "Nom is required"),
  prenom: z.string().min(1, "Prénom is required"),
  sexe: z.enum(["M", "F"], { required_error: "Sexe is required" }),
  dateNaissance: z.string().optional(),
  adresse: z.string().optional(),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  indicatif: z.string().min(1, "Indicatif is required"),
  telephone: z.string().min(1, "Téléphone is required"),
  salarie: z.boolean().default(false),
  typeEmploi: z.string().optional(),
  revenuMensuel: z.string().optional(),
  commercialAttritre: z.string().optional().nullable(),
})

type FormData = z.infer<typeof formSchema>

interface EditClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  onClientUpdated: () => void
}

export function EditClientDialog({ open, onOpenChange, clientId, onClientUpdated }: EditClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<Array<{ _id: string; nom: string; prenom: string }>>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("authToken")
        if (!token) return
        
        const [usersResponse, currentUserResponse] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ])
        
        if (usersResponse.data && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data)
        }
        
        if (currentUserResponse.data) {
          if (currentUserResponse.data.role) {
            setCurrentUserRole(currentUserResponse.data.role)
          }
          if (currentUserResponse.data._id) {
            setCurrentUserId(currentUserResponse.data._id)
          }
        }
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }
    
    if (open) {
      fetchUsers()
    }
  }, [open])

  useEffect(() => {
    if (open && clientId) {
      const fetchClientData = async () => {
        try {
          const response = await authRequest(`${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}`)
          if (response.ok) {
            const clientData = await response.json()
            Object.keys(clientData).forEach((key) => {
              if (key in formSchema.shape) {
                setValue(key as keyof FormData, clientData[key])
              }
            })
            // Handle commercialAttritre if it's an object
            if (clientData.commercialAttritre && typeof clientData.commercialAttritre === 'object') {
              setValue('commercialAttritre', clientData.commercialAttritre._id || null)
            } else if (!clientData.commercialAttritre && currentUserRole.toLowerCase() === "agent" && currentUserId) {
              // If agent and no commercial assigned, set to current user
              setValue('commercialAttritre', currentUserId)
            }
          } else {
            throw new Error("Failed to fetch client data")
          }
        } catch (error) {
          console.error("Error fetching client data:", error)
          toast({
            title: "Error",
            description: "Failed to fetch client data. Please try again.",
            variant: "destructive",
          })
        }
      }
      fetchClientData()
    }
  }, [open, clientId, setValue, toast, currentUserRole, currentUserId])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      toast({
        title: "Success",
        description: "Client has been successfully updated.",
      })
      onOpenChange(false)
      onClientUpdated()
    } catch (error) {
      console.error("Error updating client:", error)
      toast({
        title: "Error",
        description: "Failed to update client. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              {/* Commercial attitré */}
              <div className="space-y-2">
                <Label htmlFor="commercialAttritre">Commercial attitré</Label>
                <Controller
                  name="commercialAttritre"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => field.onChange(value || null)}
                      disabled={currentUserRole.toLowerCase() === "agent"}
                    >
                      <SelectTrigger id="commercialAttritre">
                        <SelectValue placeholder="Sélectionnez un commercial attitré (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.nom} {user.prenom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Client"
                )}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

