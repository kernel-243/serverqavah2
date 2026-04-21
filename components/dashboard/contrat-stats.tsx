"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

interface ContratStatsProps {
  stats: {
    total: number
    enCours: number
    termines: number
    enAttente: number
    révoqués: number
    totalValue: number
    remainingValue: number
  },
  contratCount: {
    totalContracts: number,
    totalContratEnCours: number,
    totalContratTermine: number,
    totalContratEnAttente: number ,
    totalContratRevoque: number,
    totalFactureContrat: number,
    totalSommeContrat: number,
    totalSoldeRestant: number
  }
}


export function ContratStats({ stats, contratCount }: ContratStatsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  const getCompletionRate = () => {
    if (stats.total === 0) return 0
    return Math.round(((stats.total - stats.remainingValue) / stats.total) * 100)
  }

  const getAverageContractValue = () => {
    if (stats.total === 0) return 0
    return Math.round(stats.totalValue / stats.total)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      <motion.div variants={itemVariants}>
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-gray-400">Total Contrats</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Icons.fileText className="h-4 w-4 text-blue-600" />
            </div>  
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-gray-100">{contratCount.totalContracts}</div>
            <p className="text-xs text-slate-500 dark:text-gray-500">Contrats enregistrés</p>
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${(contratCount.totalContracts / Math.max(contratCount.totalContracts, 1)) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-gray-400">En Cours</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <Icons.activity className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-gray-100">{contratCount.totalContratEnCours}</div>
            <p className="text-xs text-slate-500 dark:text-gray-500">Contrats actifs</p>
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${(contratCount.totalContratEnCours / Math.max(contratCount.totalContracts, 1)) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-gray-400">Valeur Totale</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
              <Icons.dollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-gray-100">
              ${contratCount.totalSommeContrat.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-500">Valeur des contrats</p>
            <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-orange-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${(contratCount.totalSoldeRestant / Math.max(contratCount.totalSommeContrat, 1)) * 100}%` }}
                />
              </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-gray-400">Solde Restant</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
              <Icons.clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-gray-100">
              ${contratCount.totalSoldeRestant.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-500">À récupérer</p>
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-orange-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${(contratCount.totalSoldeRestant / Math.max(contratCount.totalSommeContrat, 1)) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
} 