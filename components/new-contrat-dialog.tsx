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
import { useToast } from "@/components/ui/use-toast"
import type { Client } from "@/types/client"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "react-hot-toast"
import { Icons } from "@/components/icons"
import { normalizeForSearch } from "@/lib/normalizeForSearch"

const FREQUENCES = [
  { value: "1", label: "Mensuel (chaque mois)" },
  { value: "2", label: "Bi-mensuel (chaque 2 mois)" },
  { value: "3", label: "Trimestriel (chaque 3 mois)" },
  { value: "4", label: "Quadrimestriel (chaque 4 mois)" },
  { value: "6", label: "Semestriel (chaque 6 mois)" },
  { value: "12", label: "Annuel (chaque 12 mois)" },
]

const formSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  citeId: z.string().min(1, "Cite is required"),
  terrainId: z.string().min(1, "Terrain is required"),
  echelons: z.string().min(1, "Nombre d'échelons est requis"),
  frequencePaiement: z.string().min(1, "Fréquence est requise"),
  acompte: z.string().min(1, "Acompte est requis"),
  dateDebut: z.string().min(1, "Date de début is required"),
  datePaiement: z.string().min(1, "Date de paiement is required"),
  devise: z.string().min(1, "Devise is required"),
  methode: z.string().min(1, "Méthode is required"),
})

type FormData = z.infer<typeof formSchema>


interface Terrain {
  _id: string
  code: string
  numero: string
  cite: Cite
  dimension: string
  pays: string
  province: string
  ville: string
  commune: string
  quartier: string
  avenue: string
  disponnible: boolean
  prix: number
  statut: string
}

interface Cite {
  _id: string
  nom: string
  commune: string
  province: string
}
interface NewContratDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContratAdded: () => void
  clients?: Client[]
  terrains?: Terrain[]
  cites?: Cite[]
  defaultValues?: {
    clientId?: string
    citeId?: string
    terrainId?: string
    dateDebut?: string
  }
  isConfirmingReservation?: boolean
  reservationInfo?: {
    clientName?: string
    citeName?: string
    terrainNumber?: string
  }
}

export function NewContratDialog({
  open,
  onOpenChange,
  onContratAdded,
  clients = [],
  terrains = [],
  cites = [],
  defaultValues = {},
  isConfirmingReservation = false,
  reservationInfo = {},
}: NewContratDialogProps) {
  const [showSummary, setShowSummary] = useState(false)
  const [isContractValidated, setIsContractValidated] = useState(false)
  const [totalAPayer, setTotalAPayer] = useState(0)
  const [sendClientNotification, setSendClientNotification] = useState(false)
  const [sendClientNotificationMail, setSendClientNotificationMail] = useState(false)
  const [sendToClient, setSendToClient] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const [terrainSearch, setTerrainSearch] = useState("")
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSessionExpiredDialogOpen, setIsSessionExpiredDialogOpen] = useState(false)
  const [isPreviewingPlan, setIsPreviewingPlan] = useState(false)

  const router = useRouter()

  const handleSessionExpired = () => {
    setIsSessionExpiredDialogOpen(true)
  }

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
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: defaultValues.clientId || "",
      citeId: defaultValues.citeId || "",
      terrainId: defaultValues.terrainId || "",
      dateDebut: defaultValues.dateDebut || new Date().toISOString().split("T")[0],
      datePaiement: new Date().toISOString().split("T")[0],
      frequencePaiement: "1",
      devise: "USD",
      methode: "Cash",
    },
  })
 

  const watchTerrainId = watch("terrainId")
  const watchEchelons = watch("echelons")
  const watchCiteId = watch("citeId")

  useEffect(() => {
    if (watchTerrainId && watchEchelons) {
      const selectedTerrain = terrains.find((terrain) => terrain._id === watchTerrainId)
      if (selectedTerrain) {
        setTotalAPayer(selectedTerrain.prix)
      }
    }
  }, [watchTerrainId, watchEchelons, terrains])

  useEffect(() => {
    if (open && defaultValues && isConfirmingReservation) {
      // Only set values if they're different from current values to avoid loops
      const currentClientId = watch("clientId")
      const currentCiteId = watch("citeId") 
      const currentTerrainId = watch("terrainId")
      const currentDateDebut = watch("dateDebut")
      
      if (defaultValues.clientId && currentClientId !== defaultValues.clientId) {
        setValue("clientId", defaultValues.clientId)
      }
      if (defaultValues.citeId && currentCiteId !== defaultValues.citeId) {
        setValue("citeId", defaultValues.citeId)
      }
      if (defaultValues.terrainId && currentTerrainId !== defaultValues.terrainId) {
        setValue("terrainId", defaultValues.terrainId)
      }
      if (defaultValues.dateDebut && currentDateDebut !== defaultValues.dateDebut) {
        setValue("dateDebut", defaultValues.dateDebut)
      }
    }
  }, [open, defaultValues, isConfirmingReservation])

  useEffect(() => {
    // console.log("showSummary changed to:", showSummary)
  }, [showSummary])
 

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    let toastId = undefined
    try {
      if (showSummary) {

        if (!isContractValidated) {
         toast.error("Veuillez valider le contrat avant de confirmer.");
          return
        }
        if (parseFloat(data.acompte) > parseFloat(totalAPayer.toString())) {
          toast.error("L'acompte ne peut pas être supérieur au prix du terrain.");
          return;
        }
        if (parseFloat(data.acompte) === parseFloat(totalAPayer.toString()) && Number.parseInt(data.echelons) > 0) {
          toast.error("Le nombre d'echelons doit être à 0 si l'acompte vaut la totalité du prix du terrain.");
          return;
        }
        if (parseFloat(data.acompte) < parseFloat(totalAPayer.toString()) && Number.parseInt(data.echelons) < 1) {
          toast.error("Le nombre d'echelons doit être supérieur à 0 si l'acompte est inférieur au prix du terrain.");
          return;
        }

        const freq = Number.parseInt(data.frequencePaiement) || 1
        const dateFin = new Date(data.dateDebut)
        dateFin.setMonth(dateFin.getMonth() + Number.parseInt(data.echelons) * freq)
        toastId = toast.loading("Enregistrement du contrat...");
        const contractData = {
          clientId: data.clientId,
          citeId: data.citeId,
          terrainId: data.terrainId,
          echelons: Number.parseInt(data.echelons),
          frequencePaiement: freq,
          acompte: Number.parseFloat(data.acompte),
          total: totalAPayer,
          dateContrat: new Date().toISOString().split("T")[0],
          dateDebut: data.dateDebut,
          dateFin: dateFin.toISOString().split("T")[0],
          datePaiement: data.datePaiement,
          devise: data.devise,
          methode: data.methode,
          sendClientNotification: sendClientNotification,
          sendClientNotificationMail: sendClientNotificationMail,
          sendToClient: sendToClient,
        }
        
        const token = localStorage.getItem("authToken")
        // console.log("data to submit ",contractData)
        
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/contrats`, contractData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        // console.log("response ",response)
          toast.success("Le contrat a été enregistré avec succès.", { id: toastId });
        onOpenChange(false)
        if (onContratAdded) {
          onContratAdded()
        }
        // refresh form
        resetForm()
        setShowSummary(false)
      } else {
        setShowSummary(true)
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du contrat:", error)
      toast.dismiss(toastId || "")
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          setErrorMessage("Vous n'avez pas la permission, veuillez contacter votre administrateur.")
          setErrorDialogOpen(true)
        } else if (error.response?.status === 401) {
          handleSessionExpired()
          return
        } else {
          toast.error("Impossible d'enregistrer le contrat. Veuillez réessayer.");
        }
      } else {
        toast.error("Impossible d'enregistrer le contrat. Veuillez réessayer.");
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowSummary(false)
    setIsContractValidated(false)
    setSendClientNotification(false)
    setSendClientNotificationMail(false)
    setSendToClient(false)
  }

  const resetForm = () => {
    setShowSummary(false)
    setIsContractValidated(false)
    setSendClientNotification(false)
    setValue("clientId", defaultValues.clientId || "")
    setValue("citeId", defaultValues.citeId || "")
    setValue("terrainId", defaultValues.terrainId || "")
    setValue("echelons", "")
    setValue("frequencePaiement", "1")
    setValue("acompte", "")
    setValue("dateDebut", defaultValues.dateDebut || new Date().toISOString().split("T")[0])
    setValue("datePaiement", new Date().toISOString().split("T")[0])
    setValue("devise", "USD")
    setValue("methode", "Cash")
    setSendToClient(false)
  }

  const handleCloseDialog = () => {
    resetForm()
    onOpenChange(false)
  }

  const handlePreviewPlan = async () => {
    const formData = watch()
    
    // Validate required fields
    if (!formData.clientId || !formData.terrainId || !formData.echelons || !formData.acompte || !formData.dateDebut) {
      toast.error("Veuillez remplir tous les champs requis pour prévisualiser le plan")
      return
    }

    setIsPreviewingPlan(true)
    try {
      const token = localStorage.getItem("authToken")
      
      // Get selected terrain to get the price
      const selectedTerrain = terrains.find((t) => t._id === formData.terrainId)
      if (!selectedTerrain) {
        toast.error("Terrain non trouvé")
        return
      }

      // Prepare preview data
      const previewData = {
        clientId: formData.clientId,
        terrainId: formData.terrainId,
        total: totalAPayer || selectedTerrain.prix,
        acompte: parseFloat(formData.acompte),
        echelons: parseInt(formData.echelons),
        frequencePaiement: parseInt(formData.frequencePaiement) || 1,
        dateDebut: formData.dateDebut,
        datePaiement: formData.datePaiement || null,
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/contrats/preview/plan`,
        previewData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      )

      // Create blob and open in new tab
      const blob = new Blob([response.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const newWindow = window.open(url, "_blank")
      
      if (!newWindow) {
        toast.error("Veuillez autoriser les pop-ups pour voir la prévisualisation")
      } else {
        toast.success("Prévisualisation du plan générée")
      }
      
      // Clean up URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100)
    } catch (error: any) {
      console.error("Error previewing plan:", error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          toast.error("Vous n'avez pas la permission de prévisualiser")
        } else if (error.response?.status === 400) {
          toast.error(error.response.data.message || "Erreur lors de la prévisualisation")
        } else {
          toast.error("Erreur lors de la prévisualisation")
        }
      } else {
        toast.error("Erreur lors de la prévisualisation")
      }
    } finally {
      setIsPreviewingPlan(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">Ajouter un nouveau contrat {showSummary ? " - Résumé" : " - Nouveau"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {!showSummary ? (
            <Card className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <CardContent className="pt-6">
                {isConfirmingReservation && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-lg font-semibold text-blue-800 mb-3">Informations de la réservation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Client:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {reservationInfo.clientName || 
                            `${clients.find((c) => c._id === watch("clientId"))?.nom || ""} 
                            ${clients.find((c) => c._id === watch("clientId"))?.prenom || ""}`.trim()
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Cité:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {reservationInfo.citeName || cites.find((c) => c._id === watch("citeId"))?.nom}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Terrain:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          N° {reservationInfo.terrainNumber || terrains.find((t) => t._id === watch("terrainId"))?.numero}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  {!isConfirmingReservation && (
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label htmlFor="clientId" className="text-right font-medium text-gray-700 dark:text-gray-300">
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
                                {(() => {
                                  if (open) {
                                    //  ("Rendering clients dropdown - Total clients:", clients.length)
                                  }
                                  const searchNorm = normalizeForSearch(clientSearch)
                                  const filtered = clients
                                    .filter(
                                      (client) => {
                                        const statusMatch = client.statut === "active"
                                        const fullName = `${client.nom ?? ""} ${client.prenom ?? ""}`.trim()
                                        const searchMatch = !searchNorm || normalizeForSearch(fullName).includes(searchNorm)
                                        return statusMatch && searchMatch
                                      }
                                    )
                                  if (open) {
                                    // console.log("Filtered clients:", filtered.length)
                                  }
                                  return filtered.map((client) => (
                                    <SelectItem key={client._id} value={client._id}>
                                      <div className="flex justify-between items-center w-full">
                                        <span className="font-medium">
                                          {client.nom}, {client.prenom}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))
                                })()}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId.message}</p>}
                      </div>
                    </div>
                  )}

                  {!isConfirmingReservation && (
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label htmlFor="citeId" className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Cite*
                      </Label>
                      <div className="col-span-3">
                        <Controller
                          name="citeId"
                          control={control}
                          render={({ field }) => (
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                setValue("terrainId", ""); // Reset terrainId when cite changes
                              }}
                              value={field.value}
                            >
                              <SelectTrigger className={`${errors.citeId ? "border-red-500" : "border-gray-300 dark:border-gray-600"} w-full rounded-md`}>
                                <SelectValue placeholder="Sélectionner une cite" />
                              </SelectTrigger>
                              <SelectContent>
                                {(() => {
                                  if (open) {
                                    // console.log("Rendering cites dropdown - Total cites:", cites.length)
                                  }
                                  return cites.map((cite) => (
                                    <SelectItem key={cite._id} value={cite._id}>
                                      <div className="flex justify-between items-center w-full">
                                        <span className="font-medium">{cite.nom}</span>
                                      </div>
                                    </SelectItem>
                                  ))
                                })()}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.citeId && <p className="text-red-500 text-sm mt-1">{errors.citeId.message}</p>}
                      </div>
                    </div>
                  )}

                  {!isConfirmingReservation && (
                    <div className="grid grid-cols-4 items-center gap-6">
                      <Label htmlFor="terrainId" className="text-right font-medium text-gray-700 dark:text-gray-300">
                        Terrains*
                      </Label>
                      <div className="col-span-3">
                        <Input
                          type="text"
                          placeholder="Rechercher un terrain"
                          value={terrainSearch}
                          onChange={(e) => setTerrainSearch(e.target.value)}
                          className="mb-2 border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        <Controller
                          name="terrainId"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className={`${errors.terrainId ? "border-red-500" : "border-gray-300 dark:border-gray-600"} w-full rounded-md`}>
                                <SelectValue placeholder="Sélectionner un terrain" />
                              </SelectTrigger>
                              <SelectContent>
                                {(() => {
                                  if (open) {
                                    // console.log("Rendering terrains dropdown - Total terrains:", terrains.length)
                                    // console.log("Current watchCiteId:", watchCiteId)
                                    // console.log("Current terrainSearch:", terrainSearch)
                                  }
                                  const filtered = terrains
                                    .filter(
                                      (terrain) => {
                                        const statusMatch = terrain.statut.toLowerCase() === "disponible"
                                        const citeMatch = !watchCiteId || terrain.cite._id === watchCiteId
                                        const searchMatch = `${terrain.numero}`.toLowerCase().includes(terrainSearch.toLowerCase())
                                        if (open) {
                                          // console.log(`Terrain ${terrain.numero}: status=${terrain.statut}, statusMatch=${statusMatch}, citeMatch=${citeMatch}, searchMatch=${searchMatch}`)
                                        }
                                        return statusMatch && citeMatch && searchMatch
                                      }
                                    )
                                  if (open) {
                                    // console.log("Filtered terrains:", filtered.length)
                                  }
                                  return filtered.map((terrain) => (
                                    <SelectItem key={terrain._id} value={terrain._id}>
                                      <div className="flex justify-between items-center w-full">
                                        <span className="font-medium">Terrain {terrain.numero}</span>
                                        <span className="text-muted-foreground">
                                          &nbsp; - ${terrain.prix ? terrain.prix.toLocaleString() : "*"}{" "}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))
                                })()}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.terrainId && <p className="text-red-500 text-sm mt-1">{errors.terrainId.message}</p>}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 items-center gap-6">
                    <Label htmlFor="echelons" className="text-right font-medium text-gray-700 dark:text-gray-300">
                      Nombre d'échelons*
                    </Label>
                    <div className="col-span-3">
                      <Input id="echelons" type="number" {...register("echelons")} className="w-full border-gray-300 dark:border-gray-600 rounded-md" />
                      {errors.echelons && <p className="text-red-500 text-sm mt-1">{errors.echelons.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-6">
                    <Label htmlFor="frequencePaiement" className="text-right font-medium text-gray-700 dark:text-gray-300">
                      Fréquence*
                    </Label>
                    <div className="col-span-3">
                      <Controller
                        name="frequencePaiement"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className={`${errors.frequencePaiement ? "border-red-500" : "border-gray-300 dark:border-gray-600"} w-full rounded-md`}>
                              <SelectValue placeholder="Sélectionner la fréquence" />
                            </SelectTrigger>
                            <SelectContent>
                              {FREQUENCES.map((f) => (
                                <SelectItem key={f.value} value={f.value}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.frequencePaiement && <p className="text-red-500 text-sm mt-1">{errors.frequencePaiement.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-6">
                    <Label htmlFor="dateDebut" className="text-right font-medium text-gray-700 dark:text-gray-300">
                      Date de début*
                    </Label>
                    <div className="col-span-3">
                      <Input id="dateDebut" type="date" {...register("dateDebut")} className="w-full border-gray-300 dark:border-gray-600 rounded-md" />
                      {errors.dateDebut && <p className="text-red-500 text-sm mt-1">{errors.dateDebut.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-6">
                    <Label htmlFor="acompte" className="text-right font-medium text-gray-700 dark:text-gray-300">
                      Acompte*
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="acompte" 
                        type="number" 
                        {...register("acompte")} 
                        className="w-full border-gray-300 dark:border-gray-600 rounded-md w-70" 
                        placeholder="Montant"
                      />
                      <Controller
                        name="devise"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Devise" />
                            </SelectTrigger>
                            <SelectContent>
                              {["USD", "CDF", "EUR", "YEN"].map((currency) => (
                                <SelectItem key={currency} value={currency}>
                                  {currency}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Controller
                        name="methode"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Méthode" />
                            </SelectTrigger>
                            <SelectContent>
                              {["Cash", "Virement", "Autre"].map((method) => (
                                <SelectItem key={method} value={method}>
                                  {method}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.acompte && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.acompte.message}
                        </p>
                      )}
                    </div>
                  </div>
                
                  

                  <div className="grid grid-cols-4 items-center gap-6">
                    <Label htmlFor="datePaiement" className="text-right font-medium text-gray-700 dark:text-gray-300">
                      Date de paiement*
                    </Label>
                    <div className="col-span-3">
                      <Input id="datePaiement" type="date" {...register("datePaiement")} className="w-full border-gray-300 dark:border-gray-600 rounded-md" />
                      {errors.datePaiement && <p className="text-red-500 text-sm mt-1">{errors.datePaiement.message}</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-center text-lg font-semibold">Résumé du contrat</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewPlan}
                    disabled={
                      isPreviewingPlan ||
                      !watch("clientId") ||
                      !watch("terrainId") ||
                      !watch("echelons") ||
                      !watch("acompte") ||
                      !watch("dateDebut")
                    }
                    className="flex items-center gap-2"
                  >
                    {isPreviewingPlan ? (
                      <>
                        <Icons.spinner className="h-4 w-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Icons.eye className="h-4 w-4" />
                        Prévisualiser le plan
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">
                      {clients.find((c) => c._id === watch("clientId"))?.nom}{" "}
                      {clients.find((c) => c._id === watch("clientId"))?.prenom}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cite</p>
                    <p className="font-medium">{cites.find((c) => c._id === watch("citeId"))?.nom}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Terrain</p>
                    <p className="font-medium">N° {terrains.find((t) => t._id === watch("terrainId"))?.numero}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <p className="font-medium">{watch("dateDebut")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de paiement</p>
                    <p className="font-medium">{watch("datePaiement")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre d'échelons</p>
                    <p className="font-medium">{watch("echelons")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fréquence</p>
                    <p className="font-medium">{FREQUENCES.find((f) => f.value === watch("frequencePaiement"))?.label || "Mensuel"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Acompte</p>
                    <p className="font-medium">${Number.parseFloat(watch("acompte")).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total à payer</p>
                    <p className="font-medium">${totalAPayer.toLocaleString()}</p>
                  </div>
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
                      Je valide le contrat et confirme la rédaction du plan d'echelonnement
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="whatsapp-notification"
                      checked={sendClientNotification}
                      onCheckedChange={(checked) => setSendClientNotification(checked as boolean)}
                    />
                    <label htmlFor="whatsapp-notification" className="text-sm">
                      Notifier le client via WhatsApp
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mail-notification"
                      checked={sendClientNotificationMail}
                      onCheckedChange={(checked) => setSendClientNotificationMail(checked as boolean)}
                    />
                    <label htmlFor="mail-notification" className="text-sm">
                      Notifier le client via mail
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="payment-notification"
                      checked={sendToClient}
                      onCheckedChange={(checked) => setSendToClient(checked as boolean)}
                    />
                    <label htmlFor="payment-notification" className="text-sm">
                      Envoyer la facture de l'acompte
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between pt-4">
            {showSummary ? (
              <>
                <Button type="button" variant="outline" onClick={(e) => handleBack(e)} className="rounded-md">
                  Retour
                </Button>
                <Button type="submit" disabled={!isContractValidated || isSubmitting} className="rounded-md">
                  Confirmer
                </Button>
              </>
            ) : (
              <Button type="submit" className="ml-auto rounded-md" disabled={isSubmitting}>
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
          <AlertDialogTitle className="text-xl font-semibold text-red-600">
            Erreur de permission
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-600">
            {errorMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={() => setErrorDialogOpen(false)}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
          >
            Fermer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Session Expired Dialog */}
    <AlertDialog open={isSessionExpiredDialogOpen} onOpenChange={setIsSessionExpiredDialogOpen}>
      <AlertDialogContent className="bg-white border-0 shadow-2xl rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-slate-900">
            Session expirée
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-600">
            Votre session a expiré. Veuillez vous reconnecter pour continuer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={handleRedirectToLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            Se reconnecter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
