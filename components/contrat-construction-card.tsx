"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export interface ContratConstruction {
  _id: string
  code: string
  statut: "en_cours" | "termine" | "en_attente" | "résilié"
  clientId: {
    _id: string
    nom: string
    prenom: string
    email?: string
  }
  typeConstruction: string
  superficie: number
  montantTotal: number
  acompte: number
  dateContrat: string
  dateDebutTravaux: string
  dureeTravaux: number
  architecte: string
  contratTerrainId?: {
    _id: string
    code: string
  } | null
}

interface ContratConstructionCardProps {
  contrat: ContratConstruction
  viewMode?: "grid" | "list"
}

function getStatusColor(status: string) {
  switch (status) {
    case "en_cours":    return "bg-orange-500 text-white"
    case "termine":     return "bg-blue-500 text-white"
    case "en_attente":  return "bg-yellow-500 text-white"
    case "résilié":     return "bg-red-500 text-white"
    default:            return "bg-gray-500 text-white"
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "en_cours":    return "En cours"
    case "termine":     return "Terminé"
    case "en_attente":  return "En attente"
    case "résilié":     return "Résilié"
    default:            return status
  }
}

export function ContratConstructionCard({ contrat, viewMode = "grid" }: ContratConstructionCardProps) {
  const router = useRouter()
  const clientInitials = `${contrat.clientId.prenom.charAt(0)}${contrat.clientId.nom.charAt(0)}`

  const handleDetail = () => router.push(`/dashboard/construction/contrat/${contrat.code}`)

  if (viewMode === "list") {
    return (
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12 bg-gradient-to-br from-orange-500 to-amber-600">
                  <AvatarFallback className="text-dark font-semibold">{clientInitials}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h3
                      className="text-lg font-semibold text-slate-900 dark:text-gray-100 cursor-pointer hover:text-orange-600 transition-colors"
                      onClick={handleDetail}
                    >
                      {contrat.code}
                    </h3>
                    <Badge className={getStatusColor(contrat.statut)}>{getStatusText(contrat.statut)}</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-gray-400">
                    <Icons.users className="inline h-4 w-4 mr-1" />
                    {contrat.clientId.prenom} {contrat.clientId.nom}
                  </p>
                  <p className="text-slate-500 dark:text-gray-500 text-sm">
                    <Icons.building className="inline h-4 w-4 mr-1" />
                    {contrat.typeConstruction} — {contrat.superficie} m²
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-500">Montant total</p>
                  <p className="text-lg font-semibold">${contrat.montantTotal.toLocaleString()}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-500">Durée</p>
                  <p className="text-sm font-medium">{contrat.dureeTravaux} mois</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-500">Début travaux</p>
                  <p className="text-sm font-medium">{new Date(contrat.dateDebutTravaux).toLocaleDateString()}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icons.moreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleDetail} className="flex items-center gap-2">
                      <Icons.eye className="h-4 w-4" />
                      Voir les détails
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 bg-gradient-to-br from-orange-500 to-amber-600">
              <AvatarFallback className="text-dark font-semibold text-sm">{clientInitials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle
                className="text-lg font-semibold text-slate-900 dark:text-gray-100 cursor-pointer hover:text-orange-600 transition-colors"
                onClick={handleDetail}
              >
                {contrat.code}
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-gray-500">
                {contrat.clientId.prenom} {contrat.clientId.nom}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Icons.moreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDetail} className="flex items-center gap-2">
                <Icons.eye className="h-4 w-4" />
                Voir les détails
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge className={getStatusColor(contrat.statut)}>{getStatusText(contrat.statut)}</Badge>
            <div className="text-right">
              <p className="text-xs text-slate-500">Type</p>
              <p className="text-sm font-medium">{contrat.typeConstruction}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-gray-400">Superficie</span>
              <span className="font-semibold">{contrat.superficie} m²</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-gray-400">Montant total</span>
              <span className="font-semibold">${contrat.montantTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-gray-400">Acompte</span>
              <span className="font-semibold text-green-600">${contrat.acompte.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-slate-100 dark:border-gray-700">
            <div>
              <p className="text-slate-500">Début travaux</p>
              <p className="font-medium">{new Date(contrat.dateDebutTravaux).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-slate-500">Durée estimée</p>
              <p className="font-medium">{contrat.dureeTravaux} mois</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
