"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { CountryIndicativeSelect } from "@/components/country-indicative-select"
import { ErrorDialog } from "@/components/error-dialog"
import { AIRewriteButton } from "@/components/ai-rewrite-button"
import { VoiceInputButton } from "@/components/voice-input-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Controller } from "react-hook-form"
import axios from "axios"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import type { NewProspectData } from "@/types/client"
import {
  RadioGroup,
  RadioGroupItem,
} from "@radix-ui/react-radio-group"

function calcAge(date: Date): number {
  const today = new Date()
  return today.getFullYear() - date.getFullYear() -
    (today < new Date(today.getFullYear(), date.getMonth(), date.getDate()) ? 1 : 0)
}

interface User {
  _id: string
  nom: string
  prenom: string
}

const formSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  postnom: z.string().optional().nullable(),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  sexe: z.enum(["M", "F"]).default("M"),
  indicatif: z.string(),
  telephone: z.string().min(8, "Le numéro de téléphone doit contenir au moins 8 chiffres"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  commentaire: z.string().optional(),
  commercialAttritre: z.string().optional(),
  categorie: z.enum(["Normal", "1000 jeunes", "Autre"]).default("Normal"),
  dateNaissance: z.date().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.categorie === "1000 jeunes") {
    if (!data.dateNaissance) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateNaissance"], message: "La date de naissance est requise pour la catégorie 1000 jeunes" })
      return
    }
    const age = calcAge(data.dateNaissance)
    if (age < 18) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateNaissance"], message: "Le prospect doit avoir au moins 18 ans pour la catégorie 1000 jeunes" })
    if (age > 28) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateNaissance"], message: "Le prospect doit avoir au maximum 28 ans pour la catégorie 1000 jeunes" })
  }
})

interface NewProspectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewProspectDialog({ open, onOpenChange, onSuccess }: NewProspectDialogProps) {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showSessionError, setShowSessionError] = useState(false)
  const [error, setError] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: "",
    message: "",
  })
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const token = localStorage.getItem("authToken")
    setLoadingUsers(true)
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/prospects/new-data`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data?.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false))
  }, [open])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: "",
      postnom: "",
      prenom: "",
      sexe: "M",
      telephone: "",
      email: "",
      commentaire: "",
      indicatif: "+243",
      commercialAttritre: "",
      categorie: "Normal",
      dateNaissance: null,
    },
  })

  const handleSessionExpired = () => {
    localStorage.removeItem("authToken")
    Cookies.remove("authToken")
    setShowSessionError(false)
    router.push("/auth/login")
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)
      const token = localStorage.getItem("authToken")
      const prospectData: NewProspectData = {
        ...values,
        postnom: values.postnom || undefined,
        commercialAttritre: values.commercialAttritre || undefined,
      }

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/prospects`, prospectData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      toast({
        title: "Succès",
        description: "Le prospect a été ajouté avec succès",
      })

      form.reset()
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
            message: error.response?.data?.message || "Une erreur est survenue lors de l'ajout du prospect",
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
        <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Nouveau prospect</DialogTitle>
            <DialogDescription>Ajoutez un nouveau prospect à votre liste.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input id="nom" {...form.register("nom")} placeholder="Entrez le nom" />
              {form.formState.errors.nom && <p className="text-sm text-red-500">{form.formState.errors.nom.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="postnom">Postnom</Label>
              <Input id="postnom" {...form.register("postnom")} placeholder="Entrez le postnom" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input id="prenom" {...form.register("prenom")} placeholder="Entrez le prénom" />
              {form.formState.errors.prenom && (
                <p className="text-sm text-red-500">{form.formState.errors.prenom.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Téléphone *</Label>
              <div className="flex gap-2 items-end">
                <div className="space-y-1 flex-shrink-0 w-[120px]">
                  <Label className="text-xs text-muted-foreground">Indicatif</Label>
                  <CountryIndicativeSelect
                    value={form.watch("indicatif")}
                    onValueChange={(value) => form.setValue("indicatif", value)}
                  />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <Label htmlFor="telephone" className="text-xs text-muted-foreground">Numéro</Label>
                  <Input
                    id="telephone"
                    {...form.register("telephone")}
                    placeholder="812 345 678"
                    className="w-full"
                  />
                </div>
              </div>
              {form.formState.errors.telephone && (
                <p className="text-sm text-red-500">{form.formState.errors.telephone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="commercialAttritre">Commercial attitré</Label>
              <Select
                value={form.watch("commercialAttritre")}
                onValueChange={(value) => form.setValue("commercialAttritre", value)}
                disabled={loadingUsers}
              >
                <SelectTrigger id="commercialAttritre">
                  <SelectValue placeholder={loadingUsers ? "Chargement..." : "Sélectionnez un commercial"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.nom} {user.prenom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} placeholder="Entrez l'email" />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="commentaire">Commentaire</Label>
                <AIRewriteButton
                  getValue={() => form.getValues("commentaire") ?? ""}
                  onApply={(text) => form.setValue("commentaire", text, { shouldDirty: true })}
                />
                <VoiceInputButton
                  getValue={() => form.getValues("commentaire") ?? ""}
                  onUpdate={(text) => form.setValue("commentaire", text, { shouldDirty: true })}
                  onApply={(text) => form.setValue("commentaire", text, { shouldDirty: true })}
                />
              </div>
              <Textarea id="commentaire" {...form.register("commentaire")} placeholder="Ajoutez un commentaire" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie</Label>
              <Select
                value={form.watch("categorie")}
                onValueChange={(value) => form.setValue("categorie", value as "Normal" | "1000 jeunes" | "Autre")}
              >
                <SelectTrigger id="categorie">
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="1000 jeunes">1000 jeunes</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.watch("categorie") === "1000 jeunes" && (
              <div className="space-y-2">
                <Label>
                  Date de naissance <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-muted-foreground font-normal">(18 à 28 ans)</span>
                </Label>
                <Controller
                  name="dateNaissance"
                  control={form.control}
                  render={({ field }) => {
                    const today = new Date()
                    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
                    const minDate = new Date(today.getFullYear() - 28, today.getMonth(), today.getDate())
                    const age = field.value ? calcAge(field.value) : null
                    const ageInvalid = age !== null && (age < 18 || age > 28)
                    return (
                      <div className="space-y-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", ageInvalid && "border-red-400")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "dd MMMM yyyy", { locale: fr }) : "Sélectionnez la date de naissance"}
                              {age !== null && !ageInvalid && <span className="ml-auto text-xs text-green-600 font-medium">{age} ans</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} defaultMonth={maxDate} fromDate={minDate} toDate={maxDate} initialFocus locale={fr} />
                          </PopoverContent>
                        </Popover>
                        {ageInvalid && (
                          <p className="text-xs text-red-500">
                            {age! < 18 ? `Âge insuffisant (${age} ans) — minimum 18 ans requis.` : `Âge dépassé (${age} ans) — maximum 28 ans.`}
                          </p>
                        )}
                        {form.formState.errors.dateNaissance && (
                          <p className="text-xs text-red-500">{form.formState.errors.dateNaissance.message as string}</p>
                        )}
                      </div>
                    )
                  }}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Ajout en cours..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
