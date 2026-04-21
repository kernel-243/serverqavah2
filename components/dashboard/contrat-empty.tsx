"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { motion } from "framer-motion"

interface ContratEmptyProps {
  searchQuery: string
  statusFilter: string
  onAddContrat: () => void
}

export function ContratEmpty({ searchQuery, statusFilter, onAddContrat }: ContratEmptyProps) {
  const hasFilters = searchQuery || statusFilter !== "all"
  
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  }

  const iconVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: 0.2,
        duration: 0.5
      }
    }
  }

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: 0.3,
        duration: 0.5
      }
    }
  }

  const buttonVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: 0.4,
        duration: 0.5
      }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-16 px-6">
          <motion.div variants={iconVariants}>
            {hasFilters ? (
              <div className="relative">
                <Icons.search className="h-20 w-20 text-slate-300 mb-4" />
                <Icons.frown className="h-8 w-8 text-slate-400 absolute -bottom-2 -right-2" />
              </div>
            ) : (
              <div className="relative">
                <Icons.fileText className="h-20 w-20 text-slate-300 mb-4" />
                <Icons.plus className="h-8 w-8 text-blue-500 absolute -bottom-2 -right-2" />
              </div>
            )}
          </motion.div>

          <motion.div variants={textVariants} className="text-center space-y-2 mb-6">
            <h3 className="text-xl font-semibold text-slate-900">
              {hasFilters ? "Aucun contrat trouvé" : "Aucun contrat enregistré"}
            </h3>
            <p className="text-slate-600 max-w-md">
              {hasFilters 
                ? "Aucun contrat ne correspond à vos critères de recherche. Essayez de modifier vos filtres ou votre recherche."
                : "Commencez par ajouter votre premier contrat pour gérer vos transactions immobilières."
              }
            </p>
          </motion.div>

          {!hasFilters && (
            <motion.div variants={buttonVariants}>
              <Button 
                onClick={onAddContrat} 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Icons.plus className="mr-2 h-5 w-5" />
                Ajouter un contrat
              </Button>
            </motion.div>
          )}

          {hasFilters && (
            <motion.div variants={buttonVariants} className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="border-slate-200 hover:bg-slate-50"
              >
                <Icons.refresh className="mr-2 h-4 w-4" />
                Réinitialiser les filtres
              </Button>
              <Button 
                onClick={onAddContrat}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Icons.plus className="mr-2 h-4 w-4" />
                Nouveau contrat
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
} 