"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import type { Client } from "@/types/client"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "react-hot-toast"
import { Icons } from "@/components/icons"
import { matchesSearch } from "@/lib/normalizeForSearch"

const formSchema = z.object({
  dateContrat: z.string().min(1, "Date du contrat est requise"),
  numeroContrat: z.string().optional(),
  clientId: z.string().min(1, "Client est requis"),
  contratTerrainId: z.string().optional(),
  superficie: z.string().min(1, "Superficie est requise"),
  typeConstruction: z.string().min(1, "Type de construction est requis"),
  montantTotal: z.string().min(1, "Montant total est requis"),
  acompte: z.string().min(1, "Acompte est requis"),
  dateDebutTravaux: z.string().min(1, "Date de début des travaux est requise"),
  dureeTravaux: z.string().min(1, "Durée estimée est requise"),
  architecte: z.string().min(1, "Architecte / maître d'œuvre est requis"),
  description: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface ContratTerrain {
  _id: string
  code: string
  clientId: { nom: string; prenom: string }
  terrainId?: { numero: string }
}

interface NewContratConstructionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContratAdded: () => void
  clients?: Client[]
  contratsTerrains?: ContratTerrain[]
}

const TYPES_CONSTRUCTION = [
  "Villa",
  "Immeuble",
  "Commercial",
  "Bureau",
  "Entrepôt",
  "École",
  "Hôpital",
  "Autre",
]

export function NewContratConstructionDialog({
  open,
  onOpenChange,
  onContratAdded,
  clients = [],
  contratsTerrains = [],
}: NewContratConstructionDialogProps) {
  const [showSummary, setShowSummary] = useState(false)
  const [isContractValidated, setIsContractValidated] = useState(false)
  const [sendClientNotificationMail, setSendClientNotificationMail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Client[] | null>(null)
  const [isSearchingClients, setIsSearchingClients] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSessionExpiredDialogOpen, setIsSessionExpiredDialogOpen] = useState(false)
  const [generatedCode, setGeneratedCode] = useState("")

  const router = useRouter()

  const handleSessionExpired = () => setIsSessionExpiredDialogOpen(true)

  const handleRedirectToLogin = () => {
    localStorage.removeItem("authToken")
    router.push("/auth/login")
  }

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dateContrat: new Date().toISOString().split("T")[0],
      numeroContrat: "",
      clientId: "",
      contratTerrainId: "",
      superficie: "",
      typeConstruction: "",
      montantTotal: "",
      acompte: "",
      dateDebutTravaux: new Date().toISOString().split("T")[0],
      dureeTravaux: "",
      architecte: "",
      description: "",
    },
  })

  // Auto-generate contract number when dialog opens
  useEffect(() => {
    if (open) {
      const year = new Date().getFullYear()
      const rand = Math.floor(Math.random() * 9000) + 1000
      const code = `CC-${year}-${rand}`
      setGeneratedCode(code)
      setValue("numeroContrat", code)
      // Reset search state when dialog opens
      setClientSearch("")
      setSearchResults(null)
      setIsSearchingClients(false)
    }
  }, [open, setValue])

  // Recherche de client côté backend (sur toute la base)
  useEffect(() => {
    if (!open) return

    const query = clientSearch.trim()

    // Si recherche vide ou très courte, revenir à la liste initiale
    if (query.length < 2) {
      setSearchResults(null)
      setIsSearchingClients(false)
      return
    }

    let cancelled = false
    setIsSearchingClients(true)

    const timeoutId = setTimeout(async () => {
      try {
        const token = localStorage.getItem("authToken")
        if (!token) {
          setIsSearchingClients(false)
          return
        }

        const params = new URLSearchParams({
          page: "1",
          limit: "20",
          search: query,
        })

        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/clients?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (cancelled) return

        const data = res.data
        const list: Client[] = Array.isArray(data?.clients)
          ? data.clients
          : Array.isArray(data)
          ? data
          : []

        setSearchResults(list)
      } catch (error) {
        if (cancelled) return
        // En cas d'erreur, on ne bloque pas le formulaire, on retombe sur la liste initiale
        setSearchResults(null)
      } finally {
        if (!cancelled) setIsSearchingClients(false)
      }
    }, 400) // debounce

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [clientSearch, open])

  const onSubmit = async (data: FormData) => {
    if (!showSummary) {
      setShowSummary(true)
      return
    }

    if (!isContractValidated) {
      toast.error("Veuillez confirmer les informations du contrat avant de continuer.")
      return
    }

    setIsSubmitting(true)
    let toastId: string | undefined
    try {
      toastId = toast.loading("Enregistrement du contrat construction...")
      const token = localStorage.getItem("authToken")

      const payload = {
        dateContrat: data.dateContrat,
        code: data.numeroContrat || generatedCode,
        clientId: data.clientId,
        contratTerrainId: data.contratTerrainId || null,
        superficie: parseFloat(data.superficie),
        typeConstruction: data.typeConstruction,
        montantTotal: parseFloat(data.montantTotal),
        acompte: parseFloat(data.acompte),
        dateDebutTravaux: data.dateDebutTravaux,
        dureeTravaux: parseInt(data.dureeTravaux),
        architecte: data.architecte,
        description: data.description || "",
        sendClientNotificationMail,
      }

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/contrats-construction`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      toast.success("Le contrat construction a été enregistré avec succès.", { id: toastId })
      onOpenChange(false)
      if (onContratAdded) onContratAdded()
      resetForm()
    } catch (error) {
      toast.dismiss(toastId || "")
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          setErrorMessage("Vous n'avez pas la permission, veuillez contacter votre administrateur.")
          setErrorDialogOpen(true)
        } else if (error.response?.status === 401) {
          handleSessionExpired()
        } else {
          toast.error("Impossible d'enregistrer le contrat. Veuillez réessayer.")
        }
      } else {
        toast.error("Impossible d'enregistrer le contrat. Veuillez réessayer.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowSummary(false)
    setIsContractValidated(false)
    setSendClientNotificationMail(false)
  }

  const resetForm = () => {
    setShowSummary(false)
    setIsContractValidated(false)
    setSendClientNotificationMail(false)
    reset({
      dateContrat: new Date().toISOString().split("T")[0],
      numeroContrat: "",
      clientId: "",
      contratTerrainId: "",
      superficie: "",
      typeConstruction: "",
      montantTotal: "",
      acompte: "",
      dateDebutTravaux: new Date().toISOString().split("T")[0],
      dureeTravaux: "",
      architecte: "",
      description: "",
    })
  }

  const handleCloseDialog = () => {
    resetForm()
    onOpenChange(false)
  }

  const selectedClient = clients.find((c) => c._id === watch("clientId"))
  const selectedContratTerrain = contratsTerrains.find((ct) => ct._id === watch("contratTerrainId"))

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-4">
              Contrat Construction {showSummary ? "— Résumé" : "— Nouveau"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {!showSummary ? (
              <Card className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Date du contrat */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Date du contrat*
                      </Label>
                      <div className="col-span-3">
                        <Input type="date" {...register("dateContrat")} className="w-full border-gray-300 dark:border-gray-600 rounded-md" />
                        {errors.dateContrat && <p className="text-red-500 text-sm mt-1">{errors.dateContrat.message}</p>}
                      </div>
                    </div>

                    {/* Numéro de contrat */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        N° de contrat
                      </Label>
                      <div className="col-span-3">
                        <Input
                          type="text"
                          {...register("numeroContrat")}
                          placeholder={generatedCode}
                          className="w-full border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        <p className="text-xs text-gray-500 mt-1">Laissez vide pour utiliser le numéro auto-généré : {generatedCode}</p>
                      </div>
                    </div>

                    {/* Client */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Client*
                      </Label>
                      <div className="col-span-3">
                        <Input
                          type="text"
                          placeholder="Rechercher un client"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="mb-2 border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        <Controller
                          name="clientId"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className={`${errors.clientId ? "border-red-500" : "border-gray-300 dark:border-gray-600"} w-full rounded-md`}>
                                <SelectValue placeholder="Sélectionner un client" />
                              </SelectTrigger>
                              <SelectContent>
                                {(searchResults ?? clients)
                                  .filter(
                                    (c) =>
                                      c.statut === "active" &&
                                      matchesSearch(
                                        `${c.nom ?? ""} ${c.postnom ?? ""} ${c.prenom ?? ""} ${c.email ?? ""} ${c.indicatif ?? ""}${c.telephone ?? ""}`,
                                        clientSearch
                                      )
                                  )
                                  .map((client) => (
                                    <SelectItem key={client._id} value={client._id}>
                                      {client.nom} {client.postnom ? `${client.postnom} ` : ""}{client.prenom} — {client.email || "Sans email"} — {client.indicatif}{client.telephone}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId.message}</p>}
                      </div>
                    </div>

                    {/* Lien vers contrat terrain (facultatif) */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Contrat Terrain
                      </Label>
                      <div className="col-span-3">
                        <Controller
                          name="contratTerrainId"
                          control={control}
                          render={({ field }) => (
                            <Select
                              onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                              value={field.value || "none"}
                            >
                              <SelectTrigger className="border-gray-300 dark:border-gray-600 w-full rounded-md">
                                <SelectValue placeholder="Lier à un contrat terrain (facultatif)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Aucun —</SelectItem>
                                {contratsTerrains.map((ct) => (
                                  <SelectItem key={ct._id} value={ct._id}>
                                    {ct.code} — {ct.clientId.nom} {ct.clientId.prenom}
                                    {ct.terrainId ? ` (Terrain N°${ct.terrainId.numero})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <p className="text-xs text-gray-500 mt-1">Facultatif</p>
                      </div>
                    </div>

                    {/* Superficie */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Superficie (m²)*
                      </Label>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="ex: 250"
                          {...register("superficie")}
                          className="w-full border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        {errors.superficie && <p className="text-red-500 text-sm mt-1">{errors.superficie.message}</p>}
                      </div>
                    </div>

                    {/* Type de construction */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Type de construction*
                      </Label>
                      <div className="col-span-3">
                        <Controller
                          name="typeConstruction"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className={`${errors.typeConstruction ? "border-red-500" : "border-gray-300 dark:border-gray-600"} w-full rounded-md`}>
                                <SelectValue placeholder="Sélectionner le type" />
                              </SelectTrigger>
                              <SelectContent>
                                {TYPES_CONSTRUCTION.map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.typeConstruction && <p className="text-red-500 text-sm mt-1">{errors.typeConstruction.message}</p>}
                      </div>
                    </div>

                    {/* Montant total */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Montant total*
                      </Label>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="ex: 150000"
                          {...register("montantTotal")}
                          className="w-full border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        {errors.montantTotal && <p className="text-red-500 text-sm mt-1">{errors.montantTotal.message}</p>}
                      </div>
                    </div>

                    {/* Acompte */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Acompte*
                      </Label>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="ex: 30000"
                          {...register("acompte")}
                          className="w-full border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        {errors.acompte && <p className="text-red-500 text-sm mt-1">{errors.acompte.message}</p>}
                      </div>
                    </div>

                    {/* Date de début des travaux */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Début des travaux*
                      </Label>
                      <div className="col-span-3">
                        <Input
                          type="date"
                          {...register("dateDebutTravaux")}
                          className="w-full border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        {errors.dateDebutTravaux && <p className="text-red-500 text-sm mt-1">{errors.dateDebutTravaux.message}</p>}
                      </div>
                    </div>

                    {/* Durée estimée (mois) */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Durée estimée (mois)*
                      </Label>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          min="1"
                          placeholder="ex: 18"
                          {...register("dureeTravaux")}
                          className="w-full border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        {errors.dureeTravaux && <p className="text-red-500 text-sm mt-1">{errors.dureeTravaux.message}</p>}
                      </div>
                    </div>

                    {/* Architecte */}
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Architecte / Maître d'œuvre*
                      </Label>
                      <div className="col-span-3">
                        <Input
                          type="text"
                          placeholder="Nom de l'architecte ou maître d'œuvre"
                          {...register("architecte")}
                          className="w-full border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        {errors.architecte && <p className="text-red-500 text-sm mt-1">{errors.architecte.message}</p>}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="grid grid-cols-4 items-start gap-6">
                      <Label className="text-right font-medium text-gray-700 dark:text-gray-300 mt-2">
                        Description / Notes
                      </Label>
                      <div className="col-span-3">
                        <Textarea
                          placeholder="Notes supplémentaires, détails du projet..."
                          {...register("description")}
                          rows={3}
                          className="w-full border-gray-300 dark:border-gray-600 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* ─── RÉSUMÉ ─── */
              <Card className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="text-center text-lg font-semibold">Résumé du contrat construction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date du contrat</p>
                      <p className="font-medium">{watch("dateContrat")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">N° de contrat</p>
                      <p className="font-medium">{watch("numeroContrat") || generatedCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-medium">
                        {selectedClient ? `${selectedClient.nom} ${selectedClient.prenom}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contrat terrain lié</p>
                      <p className="font-medium">
                        {selectedContratTerrain ? selectedContratTerrain.code : "Aucun"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Superficie à construire</p>
                      <p className="font-medium">{watch("superficie")} m²</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type de construction</p>
                      <p className="font-medium">{watch("typeConstruction")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Montant total</p>
                      <p className="font-medium">${Number(watch("montantTotal")).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Acompte</p>
                      <p className="font-medium">${Number(watch("acompte")).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Début des travaux</p>
                      <p className="font-medium">{watch("dateDebutTravaux")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Durée estimée</p>
                      <p className="font-medium">{watch("dureeTravaux")} mois</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Architecte / Maître d'œuvre</p>
                      <p className="font-medium">{watch("architecte")}</p>
                    </div>
                    {watch("description") && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Description / Notes</p>
                        <p className="font-medium">{watch("description")}</p>
                      </div>
                    )}
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="contract-validation"
                        checked={isContractValidated}
                        onCheckedChange={(checked) => setIsContractValidated(checked as boolean)}
                      />
                      <label htmlFor="contract-validation" className="text-sm">
                        Je confirme les informations du contrat
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mail-notification"
                        checked={sendClientNotificationMail}
                        onCheckedChange={(checked) => setSendClientNotificationMail(checked as boolean)}
                      />
                      <label htmlFor="mail-notification" className="text-sm">
                        Notifier le client par email (récapitulatif du contrat)
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between pt-4">
              {showSummary ? (
                <>
                  <Button type="button" variant="outline" onClick={handleBack} className="rounded-md">
                    Retour
                  </Button>
                  <Button type="submit" disabled={!isContractValidated || isSubmitting} className="rounded-md">
                    {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmer et enregistrer
                  </Button>
                </>
              ) : (
                <Button type="submit" className="ml-auto rounded-md">
                  Suivant
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="bg-white border-0 shadow-2xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-red-600">Erreur de permission</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialogOpen(false)} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
              Fermer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session Expired Dialog */}
      <AlertDialog open={isSessionExpiredDialogOpen} onOpenChange={setIsSessionExpiredDialogOpen}>
        <AlertDialogContent className="bg-white border-0 shadow-2xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900">Session expirée</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Votre session a expiré. Veuillez vous reconnecter pour continuer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleRedirectToLogin} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              Se reconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
