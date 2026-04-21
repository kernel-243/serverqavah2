"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/icons"

interface TerrainExpirationWarningProps {
  endDate: string | Date
  className?: string
}

export function TerrainExpirationWarning({ endDate, className = "" }: TerrainExpirationWarningProps) {
  const endDateObj = new Date(endDate)
  const today = new Date()
  const timeDiff = endDateObj.getTime() - today.getTime()
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

  // Only show warning if end date is less than 3 days away
  if (daysDiff >= 3) {
    return null
  }

  const getWarningConfig = () => {
    if (daysDiff <= 0) {
      return {
        variant: "destructive" as const,
        icon: <Icons.alertTriangle className="h-4 w-4" />,
        message: "⚠️ La réservation a expiré !",
        bgColor: "bg-red-50 border-red-200",
        textColor: "text-red-800"
      }
    } else if (daysDiff === 1) {
      return {
        variant: "destructive" as const,
        icon: <Icons.alertTriangle className="h-4 w-4" />,
        message: "⚠️ La réservation expire demain !",
        bgColor: "bg-red-50 border-red-200",
        textColor: "text-red-800"
      }
    } else {
      return {
        variant: "default" as const,
        icon: <Icons.clock className="h-4 w-4" />,
        message: `⚠️ La réservation expire dans ${daysDiff} jours`,
        bgColor: "bg-amber-50 border-amber-200",
        textColor: "text-amber-800"
      }
    }
  }

  const config = getWarningConfig()

  return (
    <Alert className={`${config.bgColor} border ${className}`}>
      <div className="flex items-center gap-2">
        {config.icon}
        <AlertDescription className={`font-medium ${config.textColor}`}>
          {config.message}  
        </AlertDescription>
      </div>
    </Alert>
  )
}
