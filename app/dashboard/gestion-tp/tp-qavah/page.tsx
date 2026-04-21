"use client"

import { Building2 } from "lucide-react"

export default function TpQavahPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-400 dark:text-gray-500">
      <div className="h-16 w-16 rounded-2xl bg-[#896137]/10 flex items-center justify-center">
        <Building2 className="h-8 w-8 text-[#896137]" />
      </div>
      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">PT Qavah</p>
      <p className="text-sm text-center max-w-xs">
        La gestion des titres de propriété de l&apos;entreprise Qavah sera disponible prochainement.
      </p>
    </div>
  )
}
