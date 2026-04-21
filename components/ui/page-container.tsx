import React from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "full"
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  full: "max-w-full"
}

export const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  className,
  maxWidth = "4xl"
}) => {
  return (
    <div className={cn(
      "w-full mx-auto px-4 sm:px-6 lg:px-8",
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  )
}

export const ResponsiveCard: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  return (
    <div className={cn(
      "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden",
      className
    )}>
      {children}
    </div>
  )
}
