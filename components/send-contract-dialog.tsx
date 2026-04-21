"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import axios, { AxiosError } from "axios"


interface SendContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contratCode: string
  clientNom: string
  clientPrenom: string
  clientId: string
}

export function SendContractDialog({
  open,
  onOpenChange,
  contratCode,
  clientNom,
  clientPrenom,
  clientId,
}: SendContractDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [message, setMessage] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [includeContract, setIncludeContract] = useState(false)
  const [includeSchedule, setIncludeSchedule] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [selectedCCUsers, setSelectedCCUsers] = useState<string[]>([])
  const [manualCCEmails, setManualCCEmails] = useState<string>("")
  const [commercials, setCommercials] = useState<Array<{ _id: string; nom: string; prenom: string; email?: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  // Fetch users/commercials for CC selection
  useEffect(() => {
    if (open) {
      const fetchUsers = async () => {
        try {
          const token = localStorage.getItem("authToken")
          const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users?module=clients`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (response.data && Array.isArray(response.data)) {
            setCommercials(response.data)
          }
        } catch (error) {
          console.error("Error fetching users:", error)
        }
      }
      fetchUsers()
    }
  }, [open])

  useEffect(() => {
    setMounted(open)
    if (!open) {
      const cleanup = () => {
        setIncludeContract(false)
        setIncludeSchedule(false)
        setIsSubmitting(false)
        setAttachments([])
        setMessageSubject("")
        setMounted(false)
      }
      // Wait for dialog animation to complete
      const timer = setTimeout(cleanup, 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setAttachments(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir envoyer ce message ?")) return

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("authToken")
      const formData = new FormData()
      
      formData.append("message", message.trim())
      formData.append("subject", messageSubject.trim() || "Nouveau message")
      attachments.forEach((file) => formData.append("files", file))
      
      // Add CC users
      if (selectedCCUsers.length > 0) {
        formData.append("ccUsers", JSON.stringify(selectedCCUsers))
      }
      
      // Add manual CC emails
      if (manualCCEmails.trim()) {
        formData.append("ccEmails", manualCCEmails.trim())
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}/send-message`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      )

      if (response.status === 200) {
        toast({
          title: "Succès",
          description: "Le message a été envoyé au client.",
        })
        setAttachments([])
        setMessage("")
        setMessageSubject("")
        setSelectedCCUsers([])
        setManualCCEmails("")
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Error sending contract:", error)
      const errorCode = error instanceof AxiosError && error.response ? error.response.status : "Une erreur est survenue. Veuillez réessayer."
      toast({
        title: "Erreur",
        description: "Une erreur de code " + errorCode + " est survenue. Veuillez réessayer.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Envoyer un message au client</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 items-start gap-4">
            <Label htmlFor="message-subject-contract" className="text-left">
              Objet
            </Label>
            <Input
              id="message-subject-contract"
              type="text"
              placeholder="Nouveau message"
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-4">
            <Label htmlFor="message" className="text-left">
              Message à envoyer au client
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full"
              rows={10}
            />
            <p className="text-sm text-muted-foreground">
              Vous pouvez utiliser {'{'}{'{'}denomination{'}'}{'}'} {'{'}{'{'}nom{'}'}{'}'} {'{'}{'{'}postnom{'}'}{'}'} {'{'}{'{'}prenom{'}'}{'}'} pour être remplacé automatiquement
            </p>
          </div>
          <div className="space-y-4">
          
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icons.upload className="mr-2 h-4 w-4" />
                Ajouter des fichiers
              </Button>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      <span className="truncate dark:text-gray-100">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <Icons.close className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* CC Section */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium">Mettre en copie (CC)</Label>
              
              {/* User selection */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Sélectionner des utilisateurs</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !selectedCCUsers.includes(value)) {
                      setSelectedCCUsers([...selectedCCUsers, value])
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un commercial/utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {commercials
                      .filter((c) => !selectedCCUsers.includes(c._id))
                      .map((commercial) => (
                        <SelectItem key={commercial._id} value={commercial._id}>
                          {commercial.prenom} {commercial.nom}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedCCUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCCUsers.map((userId) => {
                      const user = commercials.find((c) => c._id === userId)
                      return (
                        <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                          {user ? `${user.prenom} ${user.nom}` : userId}
                          <button
                            type="button"
                            onClick={() => setSelectedCCUsers(selectedCCUsers.filter((id) => id !== userId))}
                            className="ml-1 hover:text-destructive"
                          >
                            <Icons.x className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
              
              {/* Manual email input */}
              <div className="space-y-2">
                <Label htmlFor="cc-emails-contract" className="text-xs text-muted-foreground">
                  Ou saisir des adresses email (séparées par des virgules)
                </Label>
                <Input
                  id="cc-emails-contract"
                  type="text"
                  placeholder="email1@example.com, email2@example.com"
                  value={manualCCEmails}
                  onChange={(e) => setManualCCEmails(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSendMessage} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              "Envoyer le message"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
