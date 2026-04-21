"use client"

import type React from "react"
import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CountryIndicativeSelect } from "@/components/country-indicative-select"
import { Icons } from "@/components/icons"
import { motion, AnimatePresence } from "framer-motion"
import { ProgressBar } from "@/components/progress-bar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import axios from "axios"
import {toast } from "react-hot-toast"
const formSchema = z.object({
  indicatif: z.string().min(1, "L'indicatif est requis"),
  telephone: z.string().min(1, "Le numéro de téléphone est requis"),
  codeContrat: z.string().min(1, "Le code du contrat est requis"),
})

type FormData = z.infer<typeof formSchema>

interface ContractDetailsProps {
  data: {
    contrat: any
    client: any
    paymentDetails: any
  }
}

const getStatusColor = (status: string) => {
  const colors = {
    en_cours: "bg-emerald-500",
    en_attente: "bg-amber-500", 
    termine: "bg-sky-500",
    révoqué: "bg-red-500",
    default: "bg-slate-500"
  }
  return colors[status.toLowerCase() as keyof typeof colors] || colors.default
}

const getStatusText = (status: string) => {
  const statusMap = {
    en_cours: "En cours",
    en_attente: "En attente",
    termine: "Terminé",
    révoqué: "Résilié"
  }
  return statusMap[status.toLowerCase() as keyof typeof statusMap] || status
}

const ContractDetails: React.FC<ContractDetailsProps> = ({ data }) => {
  const { contrat, client, paymentDetails } = data

  const startDate = new Date(contrat.dateDebut)
  const endDate = new Date(contrat.dateFin)
  const currentDate = new Date()

  const totalMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
  const monthsPassed = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-8">
        <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
        <TabsTrigger value="client">Client</TabsTrigger>
        <TabsTrigger value="payments">Paiements</TabsTrigger>
        <TabsTrigger value="history">Historique</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Contrat {contrat.code}
                </CardTitle>
                <Badge className={`${getStatusColor(contrat.statut)} text-white`}>
                  {getStatusText(contrat.statut)}
                </Badge>
              </div>
              <CardDescription>Informations générales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Début</p>
                  <p className="text-lg font-semibold">{new Date(contrat.dateDebut).toLocaleDateString("fr-FR", {day: "numeric", month: "numeric", year: "numeric", timeZone: "Africa/Kinshasa" })}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Fin</p>
                  <p className="text-lg font-semibold">{new Date(contrat.dateFin).toLocaleDateString("fr-FR", {day: "numeric", month: "numeric", year: "numeric", timeZone: "Africa/Kinshasa" })}</p>
                </div>
              </div>
              
              <div className="p-4 bg-background/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Montant total</p>
                <p className="text-3xl font-bold text-primary">${contrat.total.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-background/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Progression</p>
                  <span className="text-sm font-medium">
                    {monthsPassed}/{totalMonths} mois
                  </span>
                </div>
                <ProgressBar total={totalMonths} paid={monthsPassed} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">État des Paiements</CardTitle>
              <CardDescription>Résumé financier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Payé</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${paymentDetails.totalPaid.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Restant</p>
                  <p className="text-2xl font-bold text-amber-600">
                    ${paymentDetails.remainingAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-background/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Progression des paiements</p>
                  <span className="text-sm font-medium">
                    {Math.round((paymentDetails.totalPaid / paymentDetails.totalAmount) * 100)}%
                  </span>
                </div>
                <ProgressBar total={paymentDetails.totalAmount} paid={paymentDetails.totalPaid} />
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="client">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Profil Client</CardTitle>
            <CardDescription>Informations personnelles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="text-lg font-semibold">
                    {client.prenom} {client.nom} {client.postnom ? client.postnom : ""}
                  </p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Code client</p>
                  <p className="text-lg font-semibold">{client.code}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-lg font-semibold">{client.email || "Non spécifié"}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="text-lg font-semibold">
                    {client.indicatif}{client.telephone}
                  </p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="text-lg font-semibold">{client.adresse || "Non spécifiée"} {client.quartier ? `- ${client.quartier}` : ""} {client.avenue ? `- ${client.avenue}` : ""} {client.cite ? `- ${client.cite}` : ""} {client.ville ? `- ${client.ville}` : ""} {client.province ? `- ${client.province}` : ""} {client.pays ? `- ${client.pays}` : ""}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payments">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Aperçu Financier</CardTitle>
            <CardDescription>Résumé des paiements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-background/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Total</p>
                <p className="text-3xl font-bold">
                  ${paymentDetails.totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-6 bg-background/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Payé</p>
                <p className="text-3xl font-bold text-emerald-600">
                  ${paymentDetails.totalPaid.toLocaleString()}
                </p>
              </div>
              <div className="p-6 bg-background/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Restant</p>
                <p className="text-3xl font-bold text-amber-600">
                  ${paymentDetails.remainingAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card className="bg-card/50 backdrop-blur-sm shadow-lg">
          <CardHeader className="border-b border-gray-200 pb-4">
            <CardTitle className="text-2xl font-bold text-center">Historique des Transactions</CardTitle>
            <CardDescription className="text-center text-muted-foreground">Liste chronologique des paiements</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {paymentDetails.factures.map((facture: any, index: number) => (
                  <div
                    key={facture._id}
                    className="p-4 bg-background/50 rounded-lg hover:bg-accent/50 transition-transform transform hover:scale-105"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg text-primary">
                          ${facture.somme.toLocaleString()} {facture.devise}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(facture.date).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize bg-secondary text-dark">
                        {facture.methode}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function ClientOverviewPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [contractData, setContractData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      indicatif: "+243",
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    const toastId = toast.loading("Recherche en cours...")
    setError(null)
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/contrats/code/${data.codeContrat}?indicatif=${data.indicatif.replace("+", "")}&telephone=${data.telephone}`
      const response = await axios.get(url)
      setContractData(response.data)
      toast.success("Les informations du contrat ont été récupérées avec succès.", { id: toastId })
    } catch (error) {
      console.error("Erreur lors de la récupération des informations du contrat:", error)

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          toast.error("Aucun contrat trouvé avec ces informations. Veuillez vérifier et réessayer.", { id: toastId })
          setError("Aucun contrat trouvé avec ces informations. Veuillez vérifier et réessayer.")
        } else if (error.response?.status === 401) {
          toast.error("Session expirée. Veuillez vous reconnecter.", { id: toastId })
          setError("Session expirée. Veuillez vous reconnecter.")
        } else if (error.response?.status === 403) {
          toast.error("Vous n'avez pas les permissions nécessaires pour accéder à ces informations.", { id: toastId })
          setError("Vous n'avez pas les permissions nécessaires pour accéder à ces informations.")
        } else {
          toast.error("Une erreur est survenue lors de la récupération des informations. Veuillez réessayer.", { id: toastId })
          setError("Une erreur est survenue lors de la récupération des informations. Veuillez réessayer.")
        }
      } else {
        toast.error("Une erreur inattendue s'est produite. Veuillez réessayer plus tard.", { id: toastId })
        setError("Une erreur inattendue s'est produite. Veuillez réessayer plus tard.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <Card className="border-t-4 border-t-primary bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Aperçu du Contrat
            </CardTitle>
            <CardDescription>
              Consultez les détails de votre contrat en entrant vos informations ci-dessous
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {!contractData ? (
                <motion.form
                  key="search-form"
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-6 max-w-md mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="space-y-2">
                    <Label className="text-base">Numéro de téléphone</Label>
                    <div className="flex space-x-2">
                      <div className="w-2/3">
                        <Controller
                          name="indicatif"
                          control={control}
                          render={({ field }) => (
                            <CountryIndicativeSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              defaultValue="+243"
                            />
                          )}
                        />
                        {errors.indicatif && <p className="text-sm text-red-500 mt-1">{errors.indicatif.message}</p>}
                      </div>
                      <div className="w-2/3">
                        <Input
                          {...register("telephone")}
                          placeholder="Votre numéro"
                          className={errors.telephone ? "border-red-500" : ""}
                        />
                        {errors.telephone && <p className="text-sm text-red-500 mt-1">{errors.telephone.message}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codeContrat" className="text-base">
                      Code du contrat
                    </Label>
                    <Input
                      id="codeContrat"
                      {...register("codeContrat")}
                      className={errors.codeContrat ? "border-red-500" : ""}
                      placeholder="Entrez le code du contrat"
                    />
                    {errors.codeContrat && <p className="text-sm text-red-500">{errors.codeContrat.message}</p>}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive"
                    >
                      <p className="text-sm font-medium">{error}</p>
                    </motion.div>
                  )}

                  <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Recherche en cours...
                      </>
                    ) : (
                      "Rechercher le contrat"
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.div
                  key="contract-details"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ContractDetails data={contractData} />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
