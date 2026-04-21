"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { useRouter } from "next/navigation"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter()

  useEffect(() => {
    // Log error to console for debugging
    console.error("Application error:", error)
  }, [error])

  const handleGoHome = () => {
    router.push("/dashboard")
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-0 shadow-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-4">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 10, 0],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2,
                ease: "easeInOut"
              }}
              className="flex justify-center"
            >
              <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Icons.alertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Une erreur s'est produite
            </CardTitle>
            <CardDescription className="text-base text-slate-600 dark:text-slate-400">
              Désolé, une erreur inattendue s'est produite dans l'application.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === "development" && error.message && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                  Détails de l'erreur (mode développement) :
                </p>
                <p className="text-xs font-mono text-red-700 dark:text-red-400 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-600 dark:text-red-500 mt-2">
                    ID d'erreur: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Que pouvez-vous faire ?</strong>
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1 list-disc list-inside">
                <li>Essayez de rafraîchir la page</li>
                <li>Retournez à la page d'accueil</li>
                <li>Si le problème persiste, contactez le support</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={reset}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Icons.refresh className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
            <Button
              onClick={handleReload}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Icons.refresh className="mr-2 h-4 w-4" />
              Actualiser la page
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Icons.home className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

