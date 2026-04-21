"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"

export default function NotFound() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-8"
      >
        <div className="space-y-4">
          <h1 className="text-8xl font-bold text-white-900 dark:text-white-100">404</h1>
          <h2 className="text-3xl font-semibold text-white-700 dark:text-white-300">Page non trouvée</h2>
            <p className="text-white-100  max-w-lg">
            Désolé, nous n&apos;avons pas pu trouver la page que vous recherchez. Elle a peut-être été déplacée ou supprimée.
          </p>
        </div>

        <Link href="/dashboard">
          <Button size="lg" className="gap-2">
            <Icons.arrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </Link>

        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 10, 0],
            transition: { repeat: Infinity, duration: 2 }
          }}
        >
          <Icons.frown className="h-24 w-24 text-gray-400 mx-auto" />
        </motion.div>
      </motion.div>
    </div>
  )
}
