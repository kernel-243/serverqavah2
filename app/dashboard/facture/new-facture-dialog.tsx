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
import { Icons } from "@/components/icons"
import { Checkbox } from "@/components/ui/checkbox"
import { ErrorDialog } from "@/components/error-dialog"
import axios from "axios"
import { toast } from "react-hot-toast"
import { matchesSearch } from "@/lib/normalizeForSearch"

const formSchema = z.object({
  contratId: z.string().min(1, "Le contrat est obligatoire"),
  contratType: z.enum(["mensualite", "cadastral_payment"]).default("mensualite"),
  documentCadastralId: z.string().optional(),
  somme: z.string().min(1, "La somme est obligatoire"),
  devise: z.string().min(1, "La devise est obligatoire"),
  methode: z.string().min(1, "La méthode est obligatoire"),
  date: z.string().min(1, "La date est obligatoire"),
  status: z.literal("paid").default("paid"),
  applyReduction: z.boolean().default(false),
  reductionType: z.enum(["pourcentage", "montant"]).optional(),
  reductionValue: z.string().optional(),
  reductionMotif: z.string().optional(),
}).refine((data) => {
  // If reduction is applied, all reduction fields must be filled
  if (data.applyReduction) {
    return data.reductionType && data.reductionValue && data.reductionMotif;
  }
  return true;
}, {
  message: "Veuillez remplir tous les champs de réduction",
  path: ["reductionValue"],
})

type FormData = z.infer<typeof formSchema>

interface Contrat {
  _id: string
  code: string
  clientId: {
    _id: string
    nom: string
    prenom: string
  }
  total: number
  remainingTotal: number
  statut: string
  documentCadastraux?: {
    _id: string
    typeDocument: string
    code: string
    description: string
    dateUpload: string
    uploadedBy: string
  }[]
}

interface NewFactureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFactureAdded: () => void
}

export function NewFactureDialog({ open, onOpenChange, onFactureAdded }: NewFactureDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [sendToClient, setSendToClient] = useState(false)
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedContrat, setSelectedContrat] = useState<Contrat | null>(null)
  const [contratType, setContratType] = useState<"mensualite" | "cadastral_payment">("mensualite")
  const [showErrorDialog, setShowDialogError] = useState(false)
  const [errorDialogMessage, setErrorDialogMessage] = useState("")
  const [applyReduction, setApplyReduction] = useState(false)
  const [reductionType, setReductionType] = useState<"pourcentage" | "montant">("pourcentage")
  const [applyBonus, setApplyBonus] = useState(false)
  const [parrainSearch, setParrainSearch] = useState("")
  const [parrainResults, setParrainResults] = useState<any[]>([])
  const [selectedParrain, setSelectedParrain] = useState<any | null>(null)
  const [isSearchingParrain, setIsSearchingParrain] = useState(false)
  const [showParrainDropdown, setShowParrainDropdown] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [showPaymentSummary, setShowPaymentSummary] = useState(false)
  const [pendingFactureData, setPendingFactureData] = useState<any>(null)
  const [cadastralDocumentTypes, setCadastralDocumentTypes] = useState<any[]>([])
  const [isLoadingCadastralTypes, setIsLoadingCadastralTypes] = useState(false)
  const [selectedCadastralType, setSelectedCadastralType] = useState<string>("")
  const [contractCadastralDocuments, setContractCadastralDocuments] = useState<any[]>([])
  const [isLoadingContractDocuments, setIsLoadingContractDocuments] = useState(false)
  const [selectedCadastralTypeInfo, setSelectedCadastralTypeInfo] = useState<any>(null)

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
    defaultValues: {
      contratType: "mensualite",
      devise: "USD",
      methode: "cash",
      date: new Date().toISOString().split("T")[0],
      status: "paid" as const,
      applyReduction: false,
      reductionType: "pourcentage",
    },
  })

  useEffect(() => {
    const fetchContrats = async () => {
      try {
        const token = localStorage.getItem("authToken")
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats?statut=en_cours`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setContrats(response.data)
      } catch (error) {
        console.error("Error fetching contrats:", error)
        toast.error("Erreur lors de la récupération des contrats. Veuillez réessayer.")
      }
    }

    const fetchCadastralDocumentTypes = async () => {
      try {
        setIsLoadingCadastralTypes(true)
        const token = localStorage.getItem("authToken")
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/cadastral-document-types?isActive=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.data && response.data.success) {
          setCadastralDocumentTypes(response.data.data)
        }
      } catch (error) {
        console.error("Error fetching cadastral document types:", error)
        toast.error("Erreur lors de la récupération des types de documents cadastraux")
      } finally {
        setIsLoadingCadastralTypes(false)
      }
    }

    fetchContrats()
    fetchCadastralDocumentTypes()
  }, [toast])

  const filteredContrats = contrats.filter((contrat) =>
    matchesSearch(contrat.code, searchTerm) ||
    matchesSearch(contrat.clientId.nom, searchTerm) ||
    matchesSearch(contrat.clientId.prenom, searchTerm)
  )

  const fetchContratDetails = async (contratId: string) => {
    try {
      setIsLoadingContractDocuments(true)
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/contrats/${contratId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setSelectedContrat(response.data)
      
      // Fetch detailed cadastral documents with payment info
      if (response.data && response.data.documentCadastraux && response.data.documentCadastraux.length > 0) {
        const documentsWithDetails = await Promise.all(
          response.data.documentCadastraux.map(async (docId: string) => {
            try {
              const docResponse = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/contrats/document-cadastral/${docId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              )
              if (docResponse.data && docResponse.data.success) {
                return docResponse.data.data
              }
              return null
            } catch (error) {
              console.error(`Error fetching document ${docId}:`, error)
              return null
            }
          })
        )
        setContractCadastralDocuments(documentsWithDetails.filter(doc => doc !== null))
      } else {
        setContractCadastralDocuments([])
      }
      
      // Reset selected type info when contract changes
      setSelectedCadastralTypeInfo(null)
    } catch (error) {
      console.error("Error fetching contrat details:", error)
      toast.error("Erreur lors de la récupération des détails du contrat.")
    } finally {
      setIsLoadingContractDocuments(false)
    }
  }

  // Calculate payment info for selected cadastral type
  useEffect(() => {
    if (selectedCadastralType && selectedContrat) {
      // Find the type info
      const typeInfo = cadastralDocumentTypes.find(t => t._id === selectedCadastralType)
      
      if (!typeInfo) {
        setSelectedCadastralTypeInfo(null)
        setValue("somme", "")
        return
      }

      // Find all documents of the selected type (if any exist)
      const documentsOfType = contractCadastralDocuments.filter((doc: any) => {
        const docTypeId = doc.typeDocumentId?._id || doc.typeDocumentId
        return docTypeId === selectedCadastralType
      })

      if (documentsOfType.length > 0) {
        // Calculate total price, total paid, and remaining from existing documents
        // Use 'prix' not 'price' to match the backend schema
        const totalPrice = documentsOfType.reduce((sum: number, doc: any) => {
          // Use prix from document, or fallback to typeDocumentId.prix if available
          const docPrice = doc.prix || doc.price || (doc.typeDocumentId?.prix || doc.typeDocumentId?.price || 0)
          console.log('Document price calculation:', { docId: doc._id, prix: doc.prix, price: doc.price, typeDocumentIdPrix: doc.typeDocumentId?.prix, calculatedPrice: docPrice })
          return sum + docPrice
        }, 0)
        
        // Use 'montantPaye' from the document which is updated by the backend after each payment
        // Ensure we're using the correct field name and converting to number
        const totalPaid = documentsOfType.reduce((sum: number, doc: any) => {
          const paid = typeof doc.montantPaye === 'number' ? doc.montantPaye : parseFloat(doc.montantPaye || 0)
          console.log('Document paid calculation:', { docId: doc._id, montantPaye: doc.montantPaye, calculatedPaid: paid })
          return sum + (isNaN(paid) ? 0 : paid)
        }, 0)
        
        console.log('Payment summary:', { totalPrice, totalPaid, documentsOfType })
        
        const totalRemaining = totalPrice - totalPaid
        const isComplete = totalRemaining <= 0

        setSelectedCadastralTypeInfo({
          type: typeInfo,
          documents: documentsOfType,
          totalPrice,
          totalPaid,
          totalRemaining,
          isComplete
        })

        // Set default payment amount to remaining if not fully paid
        if (!isComplete && totalRemaining > 0) {
          setValue("somme", totalRemaining.toFixed(2))
        } else {
          setValue("somme", "0")
        }
      } else {
        // No documents uploaded yet - use the type price as the total
        const totalPrice = typeInfo.prix || 0
        const totalPaid = 0
        const totalRemaining = totalPrice
        const isComplete = false

        setSelectedCadastralTypeInfo({
          type: typeInfo,
          documents: [],
          totalPrice,
          totalPaid,
          totalRemaining,
          isComplete
        })

        // Set default payment amount to the type price
        if (totalRemaining > 0) {
          setValue("somme", totalRemaining.toFixed(2))
        } else {
          setValue("somme", "")
        }
      }
    } else {
      setSelectedCadastralTypeInfo(null)
      setValue("somme", "")
    }
  }, [selectedCadastralType, contractCadastralDocuments, cadastralDocumentTypes, selectedContrat, setValue])

  const searchParrain = async (query: string) => {
    if (query.length < 2) {
      setParrainResults([])
      setShowParrainDropdown(false)
      return
    }
    setIsSearchingParrain(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/factures/search-parrain?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      // Exclude the current payment client
      const payingClientId = selectedContrat?.clientId?._id
      const results = (response.data || []).filter((r: any) => r._id !== payingClientId)
      setParrainResults(results)
      setShowParrainDropdown(results.length > 0)
    } catch {
      setParrainResults([])
    } finally {
      setIsSearchingParrain(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    console.log("onSubmit called with data:", data)
    console.log("Form errors:", errors)
    
    setIsSubmitting(true)
    const toastId = toast.loading("Création de la facture...");
    
    try {
      // Validate required fields
      if (!data.contratId) {
        toast.error("Veuillez sélectionner un contrat.", { id: toastId });
        setIsSubmitting(false)
        return
      }

      if (!data.somme || Number.parseFloat(data.somme) <= 0) {
        toast.error("Veuillez saisir un montant valide.", { id: toastId });
        setIsSubmitting(false)
        return
      }

      if (!data.devise) {
        toast.error("Veuillez sélectionner une devise.", { id: toastId });
        setIsSubmitting(false)
        return
      }

      if (!data.methode) {
        toast.error("Veuillez sélectionner une méthode de paiement.", { id: toastId });
        setIsSubmitting(false)
        return
      }

      if (!data.date) {
        toast.error("Veuillez sélectionner une date.", { id: toastId });
        setIsSubmitting(false)
        return
      }

      const selectedContrat = contrats.find((contrat) => contrat._id === data.contratId)
      if (!selectedContrat) {
        toast.error("Le contrat sélectionné n'existe pas.", { id: toastId });
        setIsSubmitting(false)
        return
      }

      // Validate cadastral payment specific conditions
      if (data.contratType === "cadastral_payment") {
        if (!selectedCadastralType) {
          toast.error("Veuillez sélectionner un type de document cadastral.", { id: toastId });
          setIsSubmitting(false)
          return
        }
        if (!selectedCadastralTypeInfo) {
          toast.error("Erreur lors de la récupération des informations du type de document.", { id: toastId });
          setIsSubmitting(false)
          return
        }
        if (selectedCadastralTypeInfo.isComplete) {
          toast.error("Le paiement pour ce type de document est déjà complet.", { id: toastId });
          setIsSubmitting(false)
          return
        }
        const paymentAmount = Number.parseFloat(data.somme);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
          toast.error("Veuillez saisir un montant valide.", { id: toastId });
          setIsSubmitting(false)
          return
        }
        if (paymentAmount > selectedCadastralTypeInfo.totalRemaining) {
          toast.error(`Le montant du paiement (${paymentAmount.toFixed(2)}) dépasse le solde restant (${selectedCadastralTypeInfo.totalRemaining.toFixed(2)}).`, { id: toastId });
          setIsSubmitting(false)
          return
        }
      }

      const factureData: any = {
        clientId: selectedContrat.clientId._id,
        contratId: data.contratId,
        contratType: data.contratType,
        documentCadastralId: selectedCadastralTypeInfo?.documents?.[0]?._id || null, // Use first document if exists, otherwise null (will be created)
        cadastralDocumentTypeId: selectedCadastralType, // Pass the type ID for creating document if needed
        somme: Number.parseFloat(data.somme),
        devise: data.devise,
        methode: data.methode,
        date: data.date,
        status: data.status,
        sendToClient: sendToClient,
      }

      // Add reduction data if reduction is applied (disabled when bonus is applied)
      if (!applyBonus && data.applyReduction && data.reductionValue && data.reductionMotif) {
        factureData.reduction = {
          pourcentage: data.reductionType === "pourcentage" ? Number.parseFloat(data.reductionValue) : 0,
          montant: data.reductionType === "montant" ? Number.parseFloat(data.reductionValue) : 0,
          motif: data.reductionMotif,
        }
      }

      // Add bonus parrainage data if bonus is applied
      if (applyBonus && selectedParrain) {
        factureData.applyBonus = true
        factureData.bonusFilleul = selectedParrain._id
        factureData.parrainType = selectedParrain.type
      }

      const token = localStorage.getItem("authToken")
      if (!token) {
        toast.error("Vous n'êtes pas authentifié. Veuillez vous reconnecter.", { id: toastId });
        setIsSubmitting(false)
        return
      }

      toast.dismiss(toastId)
      setPendingFactureData({ ...factureData, _token: token, _contrat: selectedContrat })
      setShowPaymentSummary(true)
    } catch (error) {
      console.error("Error preparing paiement:", error)
      toast.dismiss()
      toast.error("Erreur lors de la préparation du paiement.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!pendingFactureData) return
    const { _token, _contrat, ...factureData } = pendingFactureData
    setIsSubmitting(true)
    const toastId = toast.loading("Création de la facture...")
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/factures`, factureData, {
        headers: {
          Authorization: `Bearer ${_token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.status === 200 || response.status === 201) {
        toast.success("La facture a été créée avec succès", { id: toastId });
        setShowPaymentSummary(false)
        setPendingFactureData(null)
        onOpenChange(false)
        reset()
        setSelectedContrat(null)
        setSelectedCadastralType("")
        setSelectedCadastralTypeInfo(null)
        setContractCadastralDocuments([])
        setContratType("mensualite")
        setApplyReduction(false)
        setReductionType("pourcentage")
        setApplyBonus(false)
        setSelectedParrain(null)
        setParrainSearch("")
        setParrainResults([])
        onFactureAdded()
      } else {
        toast.error("Erreur lors de la création de la facture. Veuillez réessayer.", { id: toastId });
      }
    } catch (error) {
      console.error("Error saving paiement:", error)
      if (axios.isAxiosError(error)) {
        const response = error.response
        const status = response?.status

        if (status === 401) {
          toast.error("Votre session a expiré. Veuillez vous reconnecter.", { id: toastId });
        } else if (status === 403) {
          setShowDialogError(true)
          setErrorDialogMessage("Vous n'avez pas la permission. Veuillez contacter votre administrateur!.")
          toast.error("Vous n'avez pas la permission. Veuillez contacter votre administrateur.", { id: toastId });
        } else if (status === 400) {
          const errorMessage = response?.data?.message || response?.data?.error || "Une erreur s'est produite lors de la création du paiement."
          setShowDialogError(true)
          setErrorDialogMessage(errorMessage)
          toast.error(errorMessage, { id: toastId });
        } else if (status === 404) {
          toast.error("La ressource demandée n'a pas été trouvée.", { id: toastId });
        } else if (typeof status === "number" && status >= 500) {
          toast.error("Erreur serveur. Veuillez réessayer plus tard.", { id: toastId });
        } else {
          const errorMessage = error.response?.data?.message || error.response?.data?.error || "Erreur lors de la création du paiement. Veuillez réessayer."
          setShowDialogError(true)
          setErrorDialogMessage(errorMessage)
          toast.error(errorMessage, { id: toastId });
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : "Erreur lors de la création du paiement. Veuillez réessayer."
        setShowDialogError(true)
        setErrorDialogMessage(errorMessage)
        toast.error(errorMessage, { id: toastId });
      }
    } finally {
      setIsSubmitting(false)
      toast.dismiss(toastId)
    }
  }

  const handleErrorDialogClose = () => {
    setIsErrorDialogOpen(false)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedContrat(null)
      setSelectedCadastralType("")
      setSelectedCadastralTypeInfo(null)
      setContractCadastralDocuments([])
      setContratType("mensualite")
      setApplyReduction(false)
      setReductionType("pourcentage")
      setApplyBonus(false)
      setSelectedParrain(null)
      setParrainSearch("")
      setParrainResults([])
      reset()
    }
    onOpenChange(open)
  }

  const handlePreview = async () => {
    const formData = watch()
    
    // Validate required fields
    if (!formData.contratId || !formData.somme) {
      toast.error("Veuillez remplir le contrat et le montant pour prévisualiser")
      return
    }

    setIsPreviewing(true)
    try {
      const token = localStorage.getItem("authToken")
      
      // Prepare preview data
      const previewData: any = {
        contratId: formData.contratId,
        somme: formData.somme,
        devise: formData.devise || "USD",
        date: formData.date || new Date().toISOString().split("T")[0],
        contratType: formData.contratType || "mensualite",
        documentCadastralId: formData.documentCadastralId || null,
      }

      // Add reduction if applied
      if (applyReduction && formData.reductionValue && formData.reductionMotif) {
        previewData.reduction = {
          pourcentage: reductionType === "pourcentage" ? parseFloat(formData.reductionValue) : 0,
          montant: reductionType === "montant" ? parseFloat(formData.reductionValue) : 0,
          motif: formData.reductionMotif,
        }
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/factures/preview`,
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
        toast.success("Prévisualisation générée")
      }
      
      // Clean up URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100)
    } catch (error: any) {
      console.error("Error previewing facture:", error)
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
      setIsPreviewing(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader className="flex-shrink-0 pb-4 border-b dark:border-gray-700">
            <DialogTitle className="text-2xl font-semibold dark:text-white">Nouveau paiement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit, (errors) => {
            console.log("Form validation errors:", errors)
            // Show toast for each validation error
            Object.keys(errors).forEach((key) => {
              const error = errors[key as keyof typeof errors]
              if (error?.message) {
                toast.error(error.message)
              }
            })
            if (Object.keys(errors).length === 0) {
              toast.error("Veuillez remplir tous les champs requis")
            }
          })} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-6 py-6 overflow-y-auto flex-1">
              {/* Search and Contract Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Rechercher un contrat
                  </Label>
                  <Input
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par code de contrat, nom ou prénom du client..."
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contratId" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Contrat *
                  </Label>
                  <Controller
                    name="contratId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(value) => {
                        field.onChange(value)
                        fetchContratDetails(value)
                      }} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner un contrat" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredContrats.map((contrat) => (
                            <SelectItem key={contrat._id} value={contrat._id}>
                              {contrat.code} - {contrat.clientId.prenom} {contrat.clientId.nom} (Reste: $
                              {contrat.remainingTotal.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.contratId && (
                    <p className="text-sm text-red-500">{errors.contratId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contratType" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Type de paiement *
                  </Label>
                  <Controller
                    name="contratType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(value) => {
                        field.onChange(value)
                        setContratType(value as "mensualite" | "cadastral_payment")
                        setSelectedCadastralType("")
                        setSelectedCadastralTypeInfo(null)
                        setValue("somme", "")
                      }} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner le type de paiement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mensualite">Mensualité</SelectItem>
                          <SelectItem value="cadastral_payment">Paiement Cadastral</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.contratType && (
                    <p className="text-sm text-red-500">{errors.contratType.message}</p>
                  )}
                </div>
              </div>

              {/* Cadastral Payment Section */}
              {contratType === "cadastral_payment" && (
                <div className="space-y-4 border-t pt-4 dark:border-gray-700">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                      <Icons.file className="h-4 w-4" />
                      Paiement Document Cadastral
                    </h3>
                    <div className="space-y-4">
                      {/* Type de document cadastral */}
                      <div className="space-y-2">
                        <Label htmlFor="cadastralType" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          Type de Document Cadastral *
                        </Label>
                        {isLoadingCadastralTypes ? (
                          <div className="flex items-center justify-center py-4">
                            <Icons.spinner className="h-5 w-5 animate-spin text-blue-600" />
                            <span className="ml-2 text-sm text-gray-600">Chargement des types...</span>
                          </div>
                        ) : (
                          <Select 
                            value={selectedCadastralType}
                            onValueChange={(value) => {
                              setSelectedCadastralType(value)
                              setValue("somme", "")
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sélectionner un type de document cadastral" />
                            </SelectTrigger>
                            <SelectContent>
                              {cadastralDocumentTypes.length > 0 ? (
                                cadastralDocumentTypes.map((type) => (
                                  <SelectItem key={type._id} value={type._id}>
                                    {type.titre} - ${type.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1.5 text-sm text-gray-500">
                                  Aucun type de document cadastral disponible
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        {!selectedContrat && (
                          <p className="text-xs text-gray-500 mt-1">
                            Veuillez d'abord sélectionner un contrat
                          </p>
                        )}
                      </div>

                      {/* Détails de paiement pour le type sélectionné */}
                      {selectedCadastralType && selectedCadastralTypeInfo && selectedContrat && (
                        <div className="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b dark:border-gray-600">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Détails de Paiement</span>
                            {selectedCadastralTypeInfo.isComplete && (
                              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full font-medium">
                                ✓ Paiement complet
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Type de document:</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {selectedCadastralTypeInfo.type?.titre || "N/A"}
                              </span>
                            </div>
                            {selectedCadastralTypeInfo.documents.length > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Nombre de documents:</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {selectedCadastralTypeInfo.documents.length}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Prix total:</span>
                              <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                                ${selectedCadastralTypeInfo.totalPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Montant déjà payé:</span>
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                ${selectedCadastralTypeInfo.totalPaid.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t dark:border-gray-600">
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Reste à payer:</span>
                              <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                ${selectedCadastralTypeInfo.totalRemaining.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          {selectedCadastralTypeInfo.isComplete && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                              <p className="text-xs text-red-800 dark:text-red-300 font-medium">
                                ⚠️ Le paiement pour ce type de document est déjà complet. Vous ne pouvez plus effectuer de paiement.
                              </p>
                            </div>
                          )}
                          {selectedCadastralTypeInfo.documents.length === 0 && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                                ℹ️ Aucun document n'a encore été uploadé pour ce type. Le document pourra être uploadé après le paiement complet.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedCadastralType && !selectedContrat && (
                        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                          <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            ⚠️ Veuillez d'abord sélectionner un contrat pour voir les détails de paiement
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Payment Details Section */}
              <div className="space-y-4 border-t pt-4 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Détails du paiement</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="somme" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Montant *
                    </Label>
                    <Input 
                      id="somme" 
                      {...register("somme", {
                        validate: (value) => {
                          if (contratType === "cadastral_payment" && selectedCadastralTypeInfo) {
                            const paymentAmount = Number.parseFloat(value || "0");
                            if (paymentAmount > selectedCadastralTypeInfo.totalRemaining) {
                              return `Le montant ne peut pas dépasser le reste à payer (${selectedCadastralTypeInfo.totalRemaining.toFixed(2)})`;
                            }
                          }
                          return true;
                        }
                      })}
                      disabled={selectedCadastralTypeInfo?.isComplete}
                      className="w-full"
                    />
                    {errors.somme && <p className="text-sm text-red-500">{errors.somme.message}</p>}
                    {contratType === "cadastral_payment" && selectedCadastralTypeInfo && !selectedCadastralTypeInfo.isComplete && (
                      <p className="text-xs text-gray-500">
                        Maximum: ${selectedCadastralTypeInfo.totalRemaining.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="devise" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Devise *
                    </Label>
                    <Controller
                      name="devise"
                      control={control}
                      defaultValue="USD"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner une devise" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="CDF">CDF</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.devise && (
                      <p className="text-sm text-red-500">{errors.devise.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="methode" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Méthode de paiement *
                    </Label>
                    <Controller
                      name="methode"
                      control={control}
                      defaultValue="cash"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner une méthode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank">Banque</SelectItem>
                            <SelectItem value="mobile">Mobile Money</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.methode && (
                      <p className="text-sm text-red-500">{errors.methode.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Date de paiement *
                    </Label>
                    <Input id="date" type="date" className="w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" {...register("date")} />
                    {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
                  </div>
                </div>
              </div>
              
              {/* Bonus / Réduction Section */}
              {contratType === "mensualite" && (
                <div className="space-y-4 border-t pt-4 dark:border-gray-700">
                  {/* Bonus parrainage */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="applyBonus"
                      checked={applyBonus}
                      onCheckedChange={(checked) => {
                        const val = checked as boolean
                        setApplyBonus(val)
                        if (val) {
                          // disable reduction
                          setApplyReduction(false)
                          setValue("applyReduction", false)
                          setValue("reductionType", "pourcentage")
                          setValue("reductionValue", "")
                          setValue("reductionMotif", "")
                          setReductionType("pourcentage")
                        } else {
                          setSelectedParrain(null)
                          setParrainSearch("")
                          setParrainResults([])
                        }
                      }}
                    />
                    <label htmlFor="applyBonus" className="text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">
                      Bonus de parrainage
                    </label>
                  </div>

                  {/* Parrain search */}
                  {applyBonus && (
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Rechercher le filleul (client ou prospect)</p>
                      <div className="relative">
                        <Input
                          value={parrainSearch}
                          onChange={(e) => {
                            setParrainSearch(e.target.value)
                            searchParrain(e.target.value)
                          }}
                          placeholder="Nom, prénom ou email du filleul..."
                          className="w-full"
                        />
                        {isSearchingParrain && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Icons.spinner className="h-4 w-4 animate-spin text-gray-400" />
                          </div>
                        )}
                        {showParrainDropdown && parrainResults.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {parrainResults.map((r: any) => (
                              <button
                                key={r._id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 dark:hover:bg-amber-900 border-b last:border-0 dark:border-gray-700"
                                onClick={() => {
                                  setSelectedParrain(r)
                                  setParrainSearch(`${r.prenom || ''} ${r.nom || ''}`.trim())
                                  setShowParrainDropdown(false)
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {r.prenom} {r.nom}
                                  </span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.type === 'prospect' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}>
                                    {r.type === 'prospect' ? 'Prospect' : 'Client'}
                                  </span>
                                </div>
                                {r.code && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.code}</div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedParrain && (
                        <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded p-2 border dark:border-gray-600">
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {selectedParrain.prenom} {selectedParrain.nom}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${selectedParrain.type === 'prospect' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}>
                                {selectedParrain.type === 'prospect' ? 'Prospect' : 'Client'}
                              </span>
                              {selectedParrain.code && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">{selectedParrain.code}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-red-500 hover:text-red-700 ml-2"
                            onClick={() => { setSelectedParrain(null); setParrainSearch(""); }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Controller
                      name="applyReduction"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="applyReduction"
                          checked={field.value || false}
                          disabled={applyBonus}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            setApplyReduction(checked as boolean)
                            // Reset reduction fields when unchecked
                            if (!checked) {
                              setValue("reductionType", "pourcentage")
                              setValue("reductionValue", "")
                              setValue("reductionMotif", "")
                              setReductionType("pourcentage")
                            }
                          }}
                        />
                      )}
                    />
                    <label
                      htmlFor="applyReduction"
                      className={`text-sm font-semibold cursor-pointer ${applyBonus ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-200"}`}
                    >
                      Appliquer une réduction
                    </label>
                  </div>

                  {applyReduction && (
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-4">
                      {selectedContrat && (
                        <div className="pb-2 border-b dark:border-gray-600">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Reste à payer: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedContrat.remainingTotal.toLocaleString()} {watch("devise") || "USD"}</span>
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reductionType" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            Type de réduction
                          </Label>
                          <Controller
                            name="reductionType"
                            control={control}
                            defaultValue="pourcentage"
                            render={({ field }) => (
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value)
                                  setReductionType(value as "pourcentage" | "montant")
                                }}
                                value={field.value}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Sélectionner le type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pourcentage">Pourcentage (%)</SelectItem>
                                  <SelectItem value="montant">Montant</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.reductionType && (
                            <p className="text-sm text-red-500">{errors.reductionType.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reductionValue" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {reductionType === "pourcentage" ? "Pourcentage" : "Montant"}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="reductionValue"
                              type="number"
                              step={reductionType === "pourcentage" ? "0.01" : "1"}
                              min="0"
                              max={reductionType === "pourcentage" ? "100" : undefined}
                              placeholder={reductionType === "pourcentage" ? "Ex: 10" : "Ex: 500"}
                              {...register("reductionValue", {
                                required: applyReduction ? `${reductionType === "pourcentage" ? "Le pourcentage" : "Le montant"} est obligatoire` : false,
                                validate: (value) => {
                                  if (!applyReduction) return true
                                  const numValue = Number.parseFloat(value || "0")
                                  if (reductionType === "pourcentage" && (numValue < 0 || numValue > 100)) {
                                    return "Le pourcentage doit être entre 0 et 100"
                                  }
                                  if (reductionType === "montant" && numValue < 0) {
                                    return "Le montant doit être positif"
                                  }
                                  return true
                                },
                              })}
                              className="flex-1"
                            />
                            {reductionType === "pourcentage" && <span className="text-sm text-gray-500">%</span>}
                          </div>
                          {errors.reductionValue && (
                            <p className="text-sm text-red-500">{errors.reductionValue.message}</p>
                          )}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="reductionMotif" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            Motif
                          </Label>
                          <Controller
                            name="reductionMotif"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Sélectionner un motif" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Paiement cash du terrain">Paiement cash du terrain</SelectItem>
                                  <SelectItem value="Paiement anticipé">Paiement anticipé</SelectItem>
                                  <SelectItem value="Promotion spéciale">Promotion spéciale</SelectItem>
                                  <SelectItem value="Remise commerciale">Remise commerciale</SelectItem>
                                  <SelectItem value="Fidélité client">Fidélité client</SelectItem>
                                  <SelectItem value="Paiement groupé">Paiement groupé</SelectItem>
                                  <SelectItem value="Autre">Autre</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.reductionMotif && (
                            <p className="text-sm text-red-500">{errors.reductionMotif.message}</p>
                          )}
                        </div>
                      </div>
                      {/* Affichage du calcul de la réduction */}
                      {selectedContrat && (() => {
                        const reductionValue = Number.parseFloat(watch("reductionValue") || "0")
                        const remainingTotal = selectedContrat.remainingTotal || 0
                        let newRemainingTotal = remainingTotal
                        let reductionAmount = 0
                        
                        if (remainingTotal > 0 && reductionValue > 0) {
                          if (reductionType === "pourcentage") {
                            reductionAmount = remainingTotal * (reductionValue / 100)
                            newRemainingTotal = remainingTotal - reductionAmount
                          } else {
                            reductionAmount = reductionValue
                            newRemainingTotal = Math.max(0, remainingTotal - reductionAmount)
                          }
                        }
                        
                        return remainingTotal > 0 && reductionValue > 0 ? (
                          <div className="mt-4 pt-4 border-t dark:border-gray-600 space-y-2 bg-white dark:bg-gray-700 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Réduction appliquée: <span className="font-semibold text-red-600 dark:text-red-400">-{reductionAmount.toFixed(2)} {watch("devise") || "USD"}</span>
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Reste à payer initial: <span className="font-medium">{remainingTotal.toFixed(2)} {watch("devise") || "USD"}</span>
                            </p>
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                              Nouveau reste à payer: <span className="font-bold">{newRemainingTotal.toFixed(2)} {watch("devise") || "USD"}</span>
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              💡 Montant à payer pour solder: <span className="font-bold">{newRemainingTotal.toFixed(2)} {watch("devise") || "USD"}</span>
                            </p>
                          </div>
                        ) : remainingTotal > 0 ? (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              Saisissez {reductionType === "pourcentage" ? "le pourcentage" : "le montant"} de réduction pour voir le calcul
                            </p>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 pt-4 border-t dark:border-gray-700 flex-shrink-0">
              <Checkbox id="sendToClient" checked={sendToClient} onCheckedChange={(checked) => setSendToClient(checked as boolean)} />
              <label
                htmlFor="sendToClient"
                className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                Envoyer le reçu de paiement au client
              </label>
            </div>
            <DialogFooter className="flex-shrink-0 gap-2 pt-4 border-t dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={
                  isPreviewing ||
                  !watch("contratId") ||
                  !watch("somme") ||
                  (contratType === "cadastral_payment" && !selectedCadastralType) ||
                  (contratType === "cadastral_payment" && (!selectedContrat || contractCadastralDocuments.filter((doc: any) => {
                    const docTypeId = doc.typeDocumentId?._id || doc.typeDocumentId
                    return docTypeId === selectedCadastralType
                  }).length === 0)) ||
                  (contratType === "cadastral_payment" && selectedCadastralTypeInfo?.isComplete)
                }
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-200"
              >
                {isPreviewing ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Icons.eye className="mr-2 h-4 w-4" />
                    Prévisualiser
                  </>
                )}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
           
              >
                {isSubmitting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  "Soumettre la facture"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ErrorDialog
        isOpen={isErrorDialogOpen}
        onClose={handleErrorDialogClose}
        title="Erreur de création"
        message={errorMessage}
      />
      {showErrorDialog && (
        <ErrorDialog
          isOpen={showErrorDialog}
          onClose={() => setShowDialogError(false)}
          title="Erreur de création"
          message={errorDialogMessage}
        />
      )}
      {showPaymentSummary && pendingFactureData && (
        <Dialog open={showPaymentSummary} onOpenChange={(o) => { if (!o && !isSubmitting) { setShowPaymentSummary(false); setPendingFactureData(null) } }}>
          <DialogContent className="sm:max-w-[500px] dark:bg-gray-900 dark:border-gray-700">
            <DialogHeader className="pb-4 border-b dark:border-gray-700">
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Résumé du paiement
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Contrat</span>
                  <span className="font-medium dark:text-gray-200">{pendingFactureData._contrat?.code ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Client</span>
                  <span className="font-medium dark:text-gray-200">
                    {pendingFactureData._contrat?.clientId
                      ? `${pendingFactureData._contrat.clientId.nom} ${pendingFactureData._contrat.clientId.prenom}`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Type</span>
                  <span className="font-medium dark:text-gray-200">
                    {pendingFactureData.contratType === "mensualite" ? "Mensualité" : "Paiement cadastral"}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t dark:border-gray-600 pt-2 mt-2">
                  <span className="text-gray-500 dark:text-gray-400">Montant</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {pendingFactureData.somme?.toLocaleString()} {pendingFactureData.devise}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Méthode</span>
                  <span className="font-medium dark:text-gray-200 capitalize">{pendingFactureData.methode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Date</span>
                  <span className="font-medium dark:text-gray-200">
                    {pendingFactureData.date ? new Date(pendingFactureData.date).toLocaleDateString("fr-FR") : "—"}
                  </span>
                </div>
              </div>
              {pendingFactureData.reduction && (pendingFactureData.reduction.pourcentage > 0 || pendingFactureData.reduction.montant > 0) && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300">Réduction appliquée</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">Valeur</span>
                    <span className="font-medium text-green-700 dark:text-green-300">
                      {pendingFactureData.reduction.pourcentage > 0
                        ? `${pendingFactureData.reduction.pourcentage}%`
                        : `${pendingFactureData.reduction.montant} ${pendingFactureData.devise}`}
                    </span>
                  </div>
                  {pendingFactureData.reduction.motif && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 dark:text-green-400">Motif</span>
                      <span className="font-medium text-green-700 dark:text-green-300">{pendingFactureData.reduction.motif}</span>
                    </div>
                  )}
                </div>
              )}
              {pendingFactureData.applyBonus && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Bonus de parrainage</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600 dark:text-amber-400">Filleul (parrain)</span>
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      {selectedParrain ? `${selectedParrain.nom} ${selectedParrain.prenom}` : "—"}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 border-t dark:border-gray-700 pt-4">
              <Button
                variant="outline"
                onClick={() => { setShowPaymentSummary(false); setPendingFactureData(null) }}
                disabled={isSubmitting}
                className="dark:border-gray-600 dark:text-gray-200"
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  "Confirmer le paiement"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
