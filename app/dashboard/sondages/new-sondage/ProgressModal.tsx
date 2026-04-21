"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, TrendingUp, Users, Mail, MessageSquare } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import axios from "axios"

interface ProgressData {
  id: string
  code: string
  title: string
  status: string
  totalCount: number
  progressCount: number
  successCount: number
  failureCount: number
  percentComplete: number
  startedAt: string
  completedAt?: string
  errorMessage?: string
  isComplete: boolean
}

interface ProgressModalProps {
  isOpen: boolean
  onClose: () => void
  bulkId: string | null
  initialTotalRecipients: number
}

export default function ProgressModal({ isOpen, onClose, bulkId, initialTotalRecipients }: ProgressModalProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [isPolling, setIsPolling] = useState(true)

  useEffect(() => {
    if (!bulkId || !isOpen) return

    // Fetch progress immediately
    fetchProgress()

    // Poll every 2 seconds
    const interval = setInterval(() => {
      if (isPolling) {
        fetchProgress()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [bulkId, isOpen, isPolling])

  const fetchProgress = async () => {
    if (!bulkId) return

    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/sondages/bulk/${bulkId}/progress`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const data = response.data.data
      setProgress(data)

      // Stop polling if complete
      if (data.isComplete) {
        setIsPolling(false)
      }
    } catch (error) {
      console.error("Error fetching progress:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "failed":
        return "text-red-600"
      case "processing":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "En attente..."
      case "processing":
        return "Envoi en cours..."
      case "completed":
        return "Terminé !"
      case "failed":
        return "Échec"
      default:
        return status
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {progress?.isComplete ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            )}
            Envoi du sondage en cours
          </DialogTitle>
          <DialogDescription>
            {progress ? (
              <span className={getStatusColor(progress.status)}>
                {getStatusText(progress.status)}
              </span>
            ) : (
              "Initialisation..."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Progression globale</span>
              <span className="font-semibold text-gray-900 dark:text-gray-300">
                {progress?.percentComplete || 0}%
              </span>
            </div>
            <Progress value={progress?.percentComplete || 0} className="h-3" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {progress?.progressCount || 0} / {progress?.totalCount || initialTotalRecipients}
              </span>
              <span>destinataires traités</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {progress?.totalCount || initialTotalRecipients}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Réussis</p>
                  <p className="text-2xl font-bold text-green-900">
                    {progress?.successCount || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Échecs</p>
                  <p className="text-2xl font-bold text-red-900">
                    {progress?.failureCount || 0}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600 opacity-50" />
              </div>
            </motion.div>
          </div>

          {/* Estimated Time */}
          {progress && !progress.isComplete && progress.progressCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                <span>Temps estimé restant: </span>
                <span className="font-semibold text-gray-900">
                  {calculateRemainingTime(
                    progress.progressCount,
                    progress.totalCount,
                    new Date(progress.startedAt)
                  )}
                </span>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          <AnimatePresence>
            {progress?.errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4"
              >
                <p className="text-sm text-red-800">
                  <strong>Erreur:</strong> {progress.errorMessage}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completion Message */}
          <AnimatePresence>
            {progress?.isComplete && progress.status === "completed" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">
                      Envoi terminé avec succès !
                    </p>
                    <p className="text-sm text-green-700">
                      {progress.successCount} message(s) envoyé(s) sur {progress.totalCount}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {progress?.isComplete ? (
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Fermer
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setIsPolling(false)
                onClose()
              }}
              disabled={!progress}
            >
              Masquer (continuer en arrière-plan)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to calculate remaining time
function calculateRemainingTime(current: number, total: number, startTime: Date): string {
  if (current === 0) return "Calcul en cours..."

  const elapsed = Date.now() - new Date(startTime).getTime()
  const rate = current / elapsed // items per ms
  const remaining = total - current
  const estimatedMs = remaining / rate

  const minutes = Math.ceil(estimatedMs / 60000)

  if (minutes < 1) return "Moins d'une minute"
  if (minutes === 1) return "Environ 1 minute"
  return `Environ ${minutes} minute${minutes > 1 ? "s" : ""}`
}

