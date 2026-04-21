"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { ErrorDialog } from "@/components/error-dialog"
import axios from "axios"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"

interface ProspectStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  currentStatus: string
  prospectId: string
}

const statusOptions = [
  { value: "prospect", label: "Prospect" },
  { value: "client", label: "Client" },
  { value: "annuler", label: "Annulé" },
]

export function ProspectStatusDialog({
  open,
  onOpenChange,
  onSuccess,
  currentStatus,
  prospectId,
}: ProspectStatusDialogProps) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [showSessionError, setShowSessionError] = useState(false)
  const [error, setError] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: "",
    message: "",
  })
  const router = useRouter()

  const handleSessionExpired = () => {
    localStorage.removeItem("authToken")
    Cookies.remove("authToken")
    setShowSessionError(false)
    router.push("/auth/login")
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("authToken")
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/prospects/${prospectId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      toast({
        title: "Succès",
        description: "Le statut a été mis à jour avec succès",
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setShowSessionError(true)
        } else {
          setError({
            show: true,
            title: "Erreur",
            message: error.response?.data?.message || "Une erreur est survenue lors de la mise à jour du statut",
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ErrorDialog
        isOpen={showSessionError}
        onClose={handleSessionExpired}
        title="Session expirée"
        message="Votre session a expiré, veuillez vous reconnecter."
      />

      <ErrorDialog
        isOpen={error.show}
        onClose={() => setError({ show: false, title: "", message: "" })}
        title={error.title}
        message={error.message}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le statut</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <RadioGroup value={status} onValueChange={setStatus} className="gap-6">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

