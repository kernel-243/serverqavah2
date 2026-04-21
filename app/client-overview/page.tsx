"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageContainer, ResponsiveCard } from "@/components/ui/page-container"
import axios from "axios"
import {toast } from "react-hot-toast"
import Image from "next/image"
import { devLog } from "@/lib/devLogger"
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
  const [downloadingDocuments, setDownloadingDocuments] = useState<Set<string>>(new Set())

  const startDate = new Date(contrat.dateDebut)
  const endDate = new Date(contrat.dateFin)
  const currentDate = new Date()

  const totalMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
  const monthsPassed = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))

  const handleDownloadDocument = async (facture: any, index: number, mensuel=true) => {
    const documentId = `${facture._id}_${index}`
    setDownloadingDocuments(prev => new Set(prev).add(documentId))
    
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/factures/download-client/${facture.code}?mensuel=${mensuel}`, {
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      // 1️⃣ récupérer le Content-Disposition
const contentDisposition = response.headers['content-disposition'];


let fileName = 'fichier';
if (contentDisposition) {
  const match = contentDisposition.match(/filename="(.+)"/);
  if (match && match.length > 1) {
    fileName = match[1]; // ex: facture_123.pdf
  }
}

const extension = fileName.split('.').pop(); // 'pdf'

// console.log(fileName , extension);
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success("Document téléchargé avec succès")
    } catch (error) {
      devLog.error("Erreur lors du téléchargement du document:", error)
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 405) {
          toast.error("Document non disponible pour l'instant, veuillez contacter l'administration de Qavah land pour plus de détail")
        } else if (error.response?.status === 404) {
          toast.error("Document introuvable")
        } else if (error.response?.status === 403) {
          toast.error("Vous n'avez pas les permissions pour télécharger ce document")
        } else {
          toast.error("Erreur lors du téléchargement du document")
        }
      } else {
        toast.error("Erreur lors du téléchargement du document")
      }
    } finally {
      setDownloadingDocuments(prev => {
        const newSet = new Set(prev)
        newSet.delete(documentId)
        return newSet
      })
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Contract Header - Mobile Optimized */}
      <div className="text-center mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
            <Icons.fileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Contrat {contrat.code}
            </h2>
            <Badge className={`${getStatusColor(contrat.statut)} text-white mt-1 text-xs px-2 py-1`}>
              {getStatusText(contrat.statut)}
            </Badge>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 px-4">
          Détails complets de votre contrat immobilier
        </p>
      </div>

      {/* Mobile-First Responsive Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="mb-3 sm:mb-4">
          <ResponsiveCard className="p-1">
            <div className="w-full overflow-x-auto overflow-y-hidden">
              <TabsList className="h-auto p-0 bg-transparent flex space-x-1 min-w-max w-max">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
                >
                  <Icons.barChart className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Vue d'ensemble</span>
                  <span className="xs:hidden">Vue</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="client" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
                >
                  <Icons.user className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Client</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="payments" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
                >
                  <Icons.dollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Paiements</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
                >
                  <Icons.activity className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Historique</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="documents" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0"
                >
                  <Icons.fileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Documents</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </ResponsiveCard>
        </div>

      <TabsContent value="overview">
        <div className="space-y-4">
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icons.fileText className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">Informations du Contrat</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Icons.clock className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Début</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {new Date(contrat.dateDebut).toLocaleDateString("fr-FR", {day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Kinshasa" })}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Icons.clock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Fin</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {new Date(contrat.dateFin).toLocaleDateString("fr-FR", {day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Kinshasa" })}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Icons.dollarSign className="w-4 h-4 text-slate-600" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Montant total</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">${contrat.total.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icons.activity className="w-3 h-3 text-amber-600" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Progression</p>
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {monthsPassed}/{totalMonths} mois
                  </span>
                </div>
                <ProgressBar total={totalMonths} paid={monthsPassed} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <Icons.dollarSign className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">État des Paiements</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Icons.checkCircle className="w-3 h-3 text-emerald-600" />
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Payé</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">
                    ${paymentDetails.totalPaid.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Icons.clock className="w-3 h-3 text-amber-600" />
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Restant</p>
                  </div>
                  <p className="text-sm font-bold text-amber-600">
                    ${paymentDetails.remainingAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Icons.barChart className="w-3 h-3 text-blue-600" />
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Progression</p>
                  </div>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
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
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Icons.user className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Profil Client</CardTitle>
                <CardDescription>Informations personnelles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icons.user className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Nom complet</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {client.prenom} {client.nom} {client.postnom ? client.postnom : ""}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icons.key className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Code client</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{client.code}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icons.mail className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Email</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{client.email || "Non spécifié"}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icons.phone className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Téléphone</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {client.indicatif}{client.telephone}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-700 dark:to-gray-600 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icons.mapPin className="w-4 h-4 text-slate-600" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresse</p>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                    {client.adresse || "Non spécifiée"} {client.quartier ? `- ${client.quartier}` : ""} {client.avenue ? `- ${client.avenue}` : ""} {client.cite ? `- ${client.cite}` : ""} {client.ville ? `- ${client.ville}` : ""} {client.province ? `- ${client.province}` : ""} {client.pays ? `- ${client.pays}` : ""}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payments">
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <Icons.dollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Aperçu Financier</CardTitle>
                  <CardDescription>Résumé des paiements</CardDescription>
                </div>
              </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-700 dark:to-gray-600 rounded-lg text-center border border-slate-200 dark:border-slate-600">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-slate-500 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Icons.dollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Montant total</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white break-words">
                  ${paymentDetails.totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-4 sm:p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg text-center border border-emerald-100 dark:border-emerald-800">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Icons.checkCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">Montant payé</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-600 break-words">
                  ${paymentDetails.totalPaid.toLocaleString()}
                </p>
              </div>
              <div className="p-4 sm:p-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg text-center border border-amber-100 dark:border-amber-800 sm:col-span-2 lg:col-span-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Icons.clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">Montant restant</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-600 break-words">
                  ${paymentDetails.remainingAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Icons.activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Historique des Transactions</CardTitle>
                  <CardDescription>Liste chronologique des paiements</CardDescription>
                </div>
              </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {paymentDetails.factures.map((facture: any, index: number) => (
                  <motion.div
                    key={facture._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-700 dark:to-gray-600 rounded-lg border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                          <Icons.checkCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-lg text-slate-900 dark:text-white">
                            ${facture.somme.toLocaleString()} {facture.devise}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {new Date(facture.date).toLocaleDateString("fr-FR", { 
                              day: "numeric", 
                              month: "long", 
                              year: "numeric",
                              timeZone: "Africa/Kinshasa"
                            })}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Type: {facture.type ?? "N/A"} {facture.type === "cadastral" && facture.motif && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Motif: {facture.motif.typeDocument}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white capitalize">
                        {facture.methode}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="documents">
        <ResponsiveCard>
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icons.fileText className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                  Documents
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Factures et documents cadastraux
                </p>
              </div>
            </div>
          </div>
          
          {/* Sub-tabs for Documents */}
          <Tabs defaultValue="factures" className="w-full">
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 border-b border-slate-200 dark:border-slate-700">
              <div className="w-full overflow-x-auto overflow-y-hidden">
                <TabsList className="h-auto p-0 bg-slate-100 dark:bg-slate-700 flex space-x-1 min-w-max w-max rounded-lg">
                  <TabsTrigger 
                    value="factures" 
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                  >
                    <Icons.dollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Factures</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cadastraux" 
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                  >
                    <Icons.fileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Documents Cadastraux</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Factures Tab */}
            <TabsContent value="factures">
              <div className="p-3 sm:p-4">
                {paymentDetails.factures && paymentDetails.factures.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {paymentDetails.factures.map((facture: any, index: number) => {
                      const documentId = `facture_${facture._id}_${index}`
                      const isDownloading = downloadingDocuments.has(documentId)
                      
                      return (
                        <div 
                          key={facture._id} 
                          className="group p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs sm:text-sm font-bold">{index + 1}</span>
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-xs px-2 py-0.5 font-medium">
                                    Facture
                                  </Badge>
                                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                    ${facture.somme?.toLocaleString() || "0"} {facture.devise || "USD"}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Icons.key className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Code: {facture.code || "N/A"}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-1.5">
                                  <Icons.clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(facture.date).toLocaleDateString("fr-FR", { 
                                      day: "numeric", 
                                      month: "short", 
                                      year: "numeric",
                                      timeZone: "Africa/Kinshasa"
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadDocument(facture, index, true)}
                              disabled={isDownloading}
                              className="hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-900/20 transition-colors text-xs px-2 sm:px-3 py-1.5 sm:py-2 flex-shrink-0 min-w-[80px] sm:min-w-[100px]"
                            >
                              {isDownloading ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Icons.spinner className="h-3 w-3 animate-spin" />
                                  <span className="hidden sm:inline">Téléchargement...</span>
                                  <span className="sm:hidden">...</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Icons.download className="h-3 w-3" />
                                  <span className="hidden xs:inline">Télécharger</span>
                                  <span className="xs:hidden"></span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Icons.dollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2">
                      Aucune facture trouvée
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 px-4">
                      Aucune facture n'est disponible pour ce contrat.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Documents Cadastraux Tab */}
            <TabsContent value="cadastraux">
              <div className="p-3 sm:p-4">
                {paymentDetails.documentCadastraux && paymentDetails.documentCadastraux.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {paymentDetails.documentCadastraux.map((document: any, index: number) => {
                      const documentId = `cadastral_${document.code}_${index}`
                      const isDownloading = downloadingDocuments.has(documentId)
                      
                      return (
                        <div 
                          key={document.code || index} 
                          className="group p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs sm:text-sm font-bold">{index + 1}</span>
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-0 text-xs px-2 py-0.5 font-medium">
                                    {document.typeDocument?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Document Cadastral"}
                                  </Badge>
                                </div>
                                
                                {document.description && (
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Icons.fileText className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      {document.description}
                                    </p>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Icons.key className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Code: {document.code || "N/A"}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-1.5">
                                  <Icons.clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(document.dateUpload).toLocaleDateString("fr-FR", { 
                                      day: "numeric", 
                                      month: "short", 
                                      year: "numeric",
                                      timeZone: "Africa/Kinshasa"
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadDocument(document, index, false)}
                              disabled={isDownloading}
                              className="hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 dark:hover:bg-purple-900/20 transition-colors text-xs px-2 sm:px-3 py-1.5 sm:py-2 flex-shrink-0 min-w-[80px] sm:min-w-[100px]"
                            >
                              {isDownloading ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Icons.spinner className="h-3 w-3 animate-spin" />
                                  <span className="hidden sm:inline">Téléchargement...</span>
                                  <span className="sm:hidden">...</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Icons.download className="h-3 w-3" />
                                  <span className="hidden xs:inline">Télécharger</span>
                                  <span className="xs:hidden"></span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Icons.fileText className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2">
                      Aucun document cadastral trouvé
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 px-4">
                      Aucun document cadastral n'est disponible pour ce contrat.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </ResponsiveCard>
      </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ClientOverviewPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [contractData, setContractData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Redirect to client portal
  useEffect(() => {
    window.location.href = "https://client.qavahgroup.com"
  }, [])

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
      devLog.log("Contract data retrieved:", response.data)
      toast.success("Les informations du contrat ont été récupérées avec succès.", { id: toastId })
    } catch (error) {
      devLog.error("Erreur lors de la récupération des informations du contrat:", error)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <section className="py-4 sm:py-6">
        <PageContainer maxWidth="4xl">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Logo */}
              <div className="mb-4 sm:mb-6">
                <Image 
                  src="https://franciscity.com/assets/img/logo/logo_qavahland_black.png" 
                  alt="Qavah Land Logo" 
                  width={350} 
                  height={320} 
                  className="mx-auto w-50 h-50 sm:w-24 sm:h-24 md:w-58 md:h-58 object-contain" 
                  priority
                />
              </div>
              
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3">
                Consultez votre{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  contrat
                </span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-3 sm:mb-4 max-w-2xl mx-auto px-2">
                Accédez facilement aux détails de votre contrat immobilier, suivez vos paiements et consultez l'historique de vos transactions.
              </p>
            </motion.div>
          </div>
        </PageContainer>
      </section>

      {/* Main Content */}
      <main className="pb-4 sm:pb-6">
        <PageContainer maxWidth="4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ResponsiveCard>
              <div className="p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  {!contractData ? (
                    <motion.div
                      key="search-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="max-w-md mx-auto"
                    >
                      <div className="text-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Icons.search className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                          Rechercher votre contrat
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Entrez vos informations pour accéder aux détails de votre contrat
                        </p>
                      </div>

                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
                            Numéro de téléphone
                          </Label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="w-full sm:w-32">
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
                              {errors.indicatif && <p className="text-xs sm:text-sm text-red-500 mt-1">{errors.indicatif.message}</p>}
                            </div>
                            <div className="flex-1">
                              <Input
                                {...register("telephone")}
                                placeholder="Votre numéro de téléphone"
                                className={`h-10 sm:h-11 ${errors.telephone ? "border-red-500" : ""}`}
                              />
                              {errors.telephone && <p className="text-xs sm:text-sm text-red-500 mt-1">{errors.telephone.message}</p>}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="codeContrat" className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
                            Code du contrat
                          </Label>
                          <Input
                            id="codeContrat"
                            {...register("codeContrat")}
                            className={`h-10 sm:h-11 ${errors.codeContrat ? "border-red-500" : ""}`}
                            placeholder="Entrez le code de votre contrat"
                          />
                          {errors.codeContrat && <p className="text-xs sm:text-sm text-red-500">{errors.codeContrat.message}</p>}
                        </div>

                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                          >
                            <div className="flex items-center">
                              <Icons.alertTriangle className="w-5 h-5 text-red-500 mr-3" />
                              <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                            </div>
                          </motion.div>
                        )}

                        <Button 
                          type="submit" 
                          className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Icons.spinner className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                              <span className="hidden sm:inline">Recherche en cours...</span>
                              <span className="sm:hidden">Recherche...</span>
                            </>
                          ) : (
                            <>
                              <Icons.search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                              <span className="hidden sm:inline">Rechercher le contrat</span>
                              <span className="sm:hidden">Rechercher</span>
                            </>
                          )}
                        </Button>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="contract-details"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="mb-6">
                        <Button 
                          variant="outline" 
                          onClick={() => setContractData(null)}
                          className="mb-4"
                        >
                          <Icons.arrowLeft className="w-4 h-4 mr-2" />
                          Nouvelle recherche
                        </Button>
                      </div>
                      <ContractDetails data={contractData} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ResponsiveCard>
          </motion.div>
        </PageContainer>
      </main>

      <footer className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-700/50 mt-4 sm:mt-6">
        <PageContainer maxWidth="4xl">
          <div className="py-3 sm:py-4 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              &copy; 2025 Qavah. Tous droits réservés.
            </p>
          </div>
        </PageContainer>
      </footer>
    </div>
  )
}
