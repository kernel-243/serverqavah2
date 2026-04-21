"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { motion, AnimatePresence } from "framer-motion"

interface ContratSearchProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  statusFilter: "all" | "en_cours" | "termine" | "en_attente" | "résilié" | "révoqué"
  setStatusFilter: (filter: "all" | "en_cours" | "termine" | "en_attente" | "résilié" | "révoqué") => void
  sortBy: "date" | "client" | "terrain" | "balance"
  setSortBy: (sort: "date" | "client" | "terrain" | "balance") => void
  viewMode: "grid" | "list"
  setViewMode: (mode: "grid" | "list") => void
  stats: {
    total: number
    enCours: number
    termines: number
    enAttente: number
    révoqués: number
  }
  periodFilter: "all" | "today" | "week" | "month" | "quarter" | "year"
  setPeriodFilter: (filter: "all" | "today" | "week" | "month" | "quarter" | "year") => void
  amountFilter: "all" | "low" | "medium" | "high"
  setAmountFilter: (filter: "all" | "low" | "medium" | "high") => void
  progressionFilter: "all" | "low" | "medium" | "high"
  setProgressionFilter: (filter: "all" | "low" | "medium" | "high") => void
  cadastralFilter: "all" | "non_disponible" | "en_attente" | "en_cours" | "disponible" | "remis" | "annule"
  setCadastralFilter: (filter: "all" | "non_disponible" | "en_attente" | "en_cours" | "disponible" | "remis" | "annule") => void
}

export function ContratSearch({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  stats,
  periodFilter,
  setPeriodFilter,
  amountFilter,
  setAmountFilter,
  progressionFilter,
  setProgressionFilter,
  cadastralFilter,
  setCadastralFilter
}: ContratSearchProps) {
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_cours":
        return "bg-blue-500/10 text-blue-700 border-blue-200"
      case "vendu":
        return "bg-green-500/10 text-green-700 border-green-200"
      case "en_attente":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200"
      case "résilié":
        return "bg-red-500/10 text-red-700 border-red-200"
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "en_cours":
        return "En cours"
      case "vendu":
        return "Vendu"
      case "en_attente":
        return "En attente"
      case "résilié":
        return "Résilié"
      default:
        return status
    }
  }

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Icons.search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-500 h-4 w-4" />
              <Input
                placeholder="Rechercher des contrats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: "all" | "en_cours" | "termine" | "en_attente" | "résilié" | "révoqué") => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px] bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="révoqué">Révoqué</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: "date" | "client" | "terrain" | "balance") => setSortBy(value)}>
              <SelectTrigger className="w-[160px] bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="terrain">Terrain</SelectItem>
                <SelectItem value="balance">Solde</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
              className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100 hover:bg-white"
            >
              <Icons.filter className="h-4 w-4 mr-2" />
              Avancé
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("all")
                setSortBy("date")
                setPeriodFilter("all")
                setAmountFilter("all")
                setProgressionFilter("all")
                setCadastralFilter("all")
              }}
              className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100 hover:bg-white"
            >
              <Icons.x className="h-4 w-4 mr-2" />
              Effacer
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100 hover:bg-white"
            >
              <Icons.grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100 hover:bg-white"
            >
              <Icons.list className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge 
            variant={statusFilter === "all" ? "default" : "outline"}
            className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            onClick={() => setStatusFilter("all")}
          >
            Tous ({stats.total})
          </Badge>
          <Badge 
            variant={statusFilter === "en_cours" ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${getStatusColor("en_cours")}`}
            onClick={() => setStatusFilter("en_cours")}
          >
            En cours ({stats.enCours})
          </Badge>
          <Badge 
            variant={statusFilter === "termine" ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${getStatusColor("termine")}`}
            onClick={() => setStatusFilter("termine")}
          >
            Terminé ({stats.termines})
          </Badge>
          <Badge 
            variant={statusFilter === "en_attente" ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${getStatusColor("en_attente")}`}
            onClick={() => setStatusFilter("en_attente")}
          >
            En attente ({stats.enAttente})
          </Badge>
          <Badge 
            variant={statusFilter === "révoqué" ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${getStatusColor("révoqué")}`}
            onClick={() => setStatusFilter("révoqué")}
          >
            Révoqué ({stats.révoqués})
          </Badge>
        </div>

        {/* Advanced Search */}
        <AnimatePresence>
          {isAdvancedSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 pt-4 border-t border-slate-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Période</label>
                  <Select value={periodFilter} onValueChange={(value: "all" | "today" | "week" | "month" | "quarter" | "year") => setPeriodFilter(value)}>
                    <SelectTrigger className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100">
                      <SelectValue placeholder="Sélectionner une période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les périodes</SelectItem>
                      <SelectItem value="today">Aujourd'hui</SelectItem>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="quarter">Ce trimestre</SelectItem>
                      <SelectItem value="year">Cette année</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Montant</label>
                  <Select value={amountFilter} onValueChange={(value: "all" | "low" | "medium" | "high") => setAmountFilter(value)}>
                    <SelectTrigger className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100">
                      <SelectValue placeholder="Filtrer par montant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les montants</SelectItem>
                      <SelectItem value="low">Moins de $10,000</SelectItem>
                      <SelectItem value="medium">$10,000 - $50,000</SelectItem>
                      <SelectItem value="high">Plus de $50,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Progression</label>
                  <Select value={progressionFilter} onValueChange={(value: "all" | "low" | "medium" | "high") => setProgressionFilter(value)}>
                    <SelectTrigger className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100">
                      <SelectValue placeholder="Filtrer par progression" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les progressions</SelectItem>
                      <SelectItem value="low">Moins de 25%</SelectItem>
                      <SelectItem value="medium">25% - 75%</SelectItem>
                      <SelectItem value="high">Plus de 75%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Contrat cadastral</label>
                  <Select value={cadastralFilter} onValueChange={(value: "all" | "non_disponible" | "en_attente" | "en_cours" | "disponible" | "remis" | "annule") => setCadastralFilter(value)}>
                    <SelectTrigger className="bg-white/50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-600 dark:text-gray-100">
                      <SelectValue placeholder="Statut cadastral" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="non_disponible">Non disponible</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="remis">Remis</SelectItem>
                      <SelectItem value="annule">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
} 