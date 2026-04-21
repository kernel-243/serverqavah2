"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icons } from "@/components/icons"
import { GlobalSearch } from "@/components/global-search"
import { useEffect, useState, useRef } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import { Timer } from "lucide-react"
import Link from "next/link"

interface User {
  nom: string
  prenom: string
  email: string
  role: string
}

interface Presence {
  heureEntree?: string
  heureSortie?: string
  pauses?: Array<{ debut: string; fin?: string }>
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function TopNav() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [presence, setPresence] = useState<Presence | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Récupérer les données de l'utilisateur actuel
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("authToken")
        if (!token) {
          setLoading(false)
          return
        }

        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setUser(response.data)
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [])

  // Récupérer le pointage du jour
  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const token = localStorage.getItem("authToken")
        if (!token) return
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/presences/today`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setPresence(res.data.data)
      } catch {
        // silencieux
      }
    }

    fetchPresence()
    // Re-check toutes les 30 secondes pour capter un nouveau pointage
    const interval = setInterval(fetchPresence, 30000)
    return () => clearInterval(interval)
  }, [])

  // Minuteur local mis à jour chaque seconde (déduit les pauses)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (presence?.heureEntree && !presence?.heureSortie) {
      const update = () => {
        const start = new Date(presence.heureEntree!).getTime()
        let pausedMs = 0
        for (const p of (presence.pauses || [])) {
          pausedMs += (p.fin ? new Date(p.fin).getTime() : Date.now()) - new Date(p.debut).getTime()
        }
        setElapsed(Math.max(0, Math.floor((Date.now() - start - pausedMs) / 1000)))
      }
      update()
      timerRef.current = setInterval(update, 1000)
    } else {
      setElapsed(0)
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [presence])

  const showTimer = !!presence?.heureEntree && !presence?.heureSortie

  // Fonction pour formater le rôle en français
  const getRoleLabel = (role: string) => {
    const roleMap: { [key: string]: string } = {
      admin: "Administrateur",
      user: "Utilisateur",
      manager: "Gestionnaire",
      commercial: "Commercial",
      agent: "Agent",
    }
    return roleMap[role] || role
  }

  // Fonction pour obtenir les classes CSS selon le rôle
  const getRoleBadgeClasses = (role: string) => {
    const baseClasses = "hidden md:flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white"
    
    if (role.toLowerCase() === "agent") {
      return `${baseClasses} bg-orange-500 hover:bg-orange-600`
    } else if (role.toLowerCase() === "admin") {
      return `${baseClasses} bg-green-800 hover:bg-green-900`
    }
    
    // Par défaut, utiliser le style muted
    return "hidden md:flex items-center px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-sm font-medium"
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10 items-center">
          <GlobalSearch />
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            {/* Chrono de pointage */}
            {showTimer && (
              <Link href="/dashboard/rh/presence">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-300/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer">
                  <Timer className="h-4 w-4 animate-pulse" />
                  <span className="font-mono text-sm font-semibold">{formatElapsed(elapsed)}</span>
                </div>
              </Link>
            )}

            {/* Affichage du rôle de l'utilisateur */}
            {!loading && user && (
              <div className={getRoleBadgeClasses(user.role)}>

                <span className="font-semibold">{getRoleLabel(user.role)}</span>
              </div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 px-0">
                  {theme === "light" ? (
                    <Icons.sun className="h-5 w-5" />
                  ) : (
                    <Icons.moon className="h-5 w-5" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Icons.sun className="mr-2 h-4 w-4" />
                  <span>Thème clair</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Icons.moon className="mr-2 h-4 w-4" />
                  <span>Thème sombre</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Icons.settings className="mr-2 h-4 w-4" />
                  <span>Système</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 px-3">
                  <Icons.user className="h-5 w-5" />
                  {!loading && user && (
                    <span className="hidden md:inline text-sm">
                      {user.prenom} {user.nom}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user && (
                  <>
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.prenom} {user.nom}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground mt-1">
                          <span className="font-semibold">Rôle:</span> {getRoleLabel(user.role)}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => router.push("/dashboard/profil")}>
                  <Icons.admin className="mr-2 h-4 w-4" />
                  <span>Mon profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                  <Icons.settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    localStorage.removeItem("authToken")
                    router.push("/auth/login")
                  }}
                >
                  <Icons.logout className="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  )
}

