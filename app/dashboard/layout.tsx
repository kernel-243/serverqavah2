"use client"

import { useState, type ReactNode } from "react"
import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/top-nav"
import { ThemeProvider } from "@/components/theme-provider"
import { useInactivityLogout } from "@/hooks/use-inactivity-logout"

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Déconnexion automatique après 5 minutes d'inactivité
  useInactivityLogout()

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="flex h-screen bg-background">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
            <div className="container mx-auto px-6 py-8">{children}</div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}

