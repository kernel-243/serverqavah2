"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Home, FileText, Settings, Users, Map, Receipt, Menu, UserPlus, Calculator, LogOut, Bell, ClipboardList, Building2, ChevronDown, Check, Mail, HardHat, Clock, History, BarChart3, Banknote, ShoppingCart, Target, Video, ScrollText } from "lucide-react"
import type React from "react"
import { useRouter } from "next/navigation"
import { LogoutButton } from "./logout-button"
import { useState, useEffect } from "react"
import axios from "axios"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type MenuGroupKey =
  | "main"
  | "clients"
  | "terrain"
  | "construction"
  | "acquisitions"
  | "gestion-tp"
  | "finance"
  | "rh"
  | "system"

export const Icons = {
  home: Home,
  users: Users,
  fileText: FileText,
  receipt: Receipt,
  settings: Settings,
  map: Map,
  menu: Menu,
  userPlus: UserPlus,
  calculator: Calculator,
  logout: LogOut,
  bell: Bell,
  clipboardList: ClipboardList,
  building: Building2,
  chevronDown: ChevronDown,
  check: Check,
  mail: Mail,
  hardHat: HardHat,
  clock: Clock,
  history: History,
  barChart: BarChart3,
  banknote: Banknote,
  shoppingCart: ShoppingCart,
  target: Target,
  video: Video,
  scrollText: ScrollText,
}

// App configuration (Qavah Construction masqué du menu)
const getApps = (_constructionEnabled?: boolean) => {
  return [
    {
      id: "qavahland",
      name: "QavahLand",
      icon: "Q",
      color: "blue",
      description: "Gestion immobilière",
    },
  ]
}

// Interface pour les permissions utilisateur
interface UserPermissions {
  dashboard: { read: boolean; write: boolean }
  contrats: { read: boolean; write: boolean }
  clients: { read: boolean; write: boolean }
  prospects: { read: boolean; write: boolean }
  terrains: { read: boolean; write: boolean }
  paiements: { read: boolean; write: boolean }
  comptabilites: { read: boolean; write: boolean }
  sondages: { read: boolean; write: boolean }
  parametres: { read: boolean; write: boolean }
  mail: { read: boolean; write: boolean }
  contratsConstruction: { read: boolean; write: boolean }
  presences: { read: boolean; write: boolean }
  paiementsEmployes: { read: boolean; write: boolean }
  acquisitions: { read: boolean; write: boolean }
  statistiquesRH: { read: boolean; write: boolean }
  facturesPro: { read: boolean; write: boolean }
  tpClient: { read: boolean; write: boolean }
}

// QavahLand menu items
const qavahlandNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Icons.home,
    group: "main",
    permissionKey: "dashboard" as keyof UserPermissions,
  },
  {
    title: "Contrats",
    href: "/dashboard/contrat",
    icon: Icons.receipt,
    group: "terrain",
    permissionKey: "contrats" as keyof UserPermissions,
  },
  {
    title: "Clients",
    href: "/dashboard/clients",
    icon: Icons.users,
    group: "clients",
    permissionKey: "clients" as keyof UserPermissions,
  },
  {
    title: "Prospects",
    href: "/dashboard/prospect",
    icon: Icons.userPlus,
    group: "clients",
    permissionKey: "prospects" as keyof UserPermissions,
  },
  {
    title: "Terrains",
    href: "/dashboard/terrain",
    icon: Icons.map,
    group: "terrain",
    permissionKey: "terrains" as keyof UserPermissions,
  },
  {
    title: "Acquisitions",
    href: "/dashboard/acquisitions",
    icon: Icons.shoppingCart,
    group: "acquisitions",
    permissionKey: "acquisitions" as keyof UserPermissions,
  },
  {
    title: "TP Client",
    href: "/dashboard/gestion-tp/tp-client",
    icon: Icons.scrollText,
    group: "gestion-tp",
    permissionKey: "tpClient" as keyof UserPermissions,
  },
  {
    title: "TP Qavah",
    href: "/dashboard/gestion-tp/tp-qavah",
    icon: Icons.building,
    group: "gestion-tp",
    permissionKey: "tpClient" as keyof UserPermissions,
  },
  {
    title: "Contrat Construction",
    href: "/dashboard/construction/contrat",
    icon: Icons.hardHat,
    group: "construction",
    permissionKey: "contratsConstruction" as keyof UserPermissions,
  },
  {
    title: "Paiement",
    href: "/dashboard/facture",
    icon: Icons.fileText,
    group: "finance",
    permissionKey: "paiements" as keyof UserPermissions,
  },
  {
    title: "Factures",
    href: "/dashboard/factures-pro",
    icon: Icons.receipt,
    group: "finance",
    permissionKey: "facturesPro" as keyof UserPermissions,
  },
  {
    title: "Comptabilités",
    href: "/dashboard/comptabilite",
    icon: Icons.calculator,
    group: "finance",
    permissionKey: "comptabilites" as keyof UserPermissions,
  },
  {
    title: "Rappels",
    href: "/dashboard/rappels",
    icon: Icons.bell,
    group: "finance",
    permissionKey: "paiements" as keyof UserPermissions,
  },
  {
    title: "Diffusion",
    href: "/dashboard/sondages",
    icon: Icons.clipboardList,
    group: "system",
    permissionKey: "sondages" as keyof UserPermissions,
  },
  {
    title: "Mails",
    href: "/dashboard/mails",
    icon: Icons.mail,
    group: "system",
    permissionKey: "mail" as keyof UserPermissions,
  },
  {
    title: "Paramètres",
    href: "/dashboard/settings",
    icon: Icons.settings,
    group: "system",
    permissionKey: "parametres" as keyof UserPermissions,
    adminOnly: true,
  },
  // ── RH (visible uniquement en mode développement) ──
  {
    title: "Présence",
    href: "/dashboard/rh/presence",
    icon: Icons.clock,
    group: "rh",
    permissionKey: "presences" as keyof UserPermissions,
    devOnly: false,
    skipPermissionCheck: true,
  },
  {
    title: "Historique",
    href: "/dashboard/rh/historique",
    icon: Icons.history,
    group: "rh",
    permissionKey: "presences" as keyof UserPermissions,
    devOnly: false,
    skipPermissionCheck: true,
  },
  {
    title: "Statistiques",
    href: "/dashboard/rh/statistiques",
    icon: Icons.barChart,
    group: "rh",
    permissionKey: "statistiquesRH" as keyof UserPermissions,
    devOnly: false,
  },
  {
    title: "Paiement Employé",
    href: "/dashboard/rh/paiement",
    icon: Icons.banknote,
    group: "rh",
    permissionKey: "paiementsEmployes" as keyof UserPermissions,
    devOnly: false,
    skipPermissionCheck: true,
  },
  {
    title: "Performance",
    href: "/dashboard/rh/performance",
    icon: Icons.target,
    group: "rh",
    permissionKey: "presences" as keyof UserPermissions,
    devOnly: false,
    skipPermissionCheck: true,
  },
  {
    title: "Réunions",
    href: "/dashboard/rh/reunion",
    icon: Icons.video,
    group: "rh",
    permissionKey: "presences" as keyof UserPermissions,
    devOnly: false,
    skipPermissionCheck: true,
  },
  {
    title: "Objectifs",
    href: "/dashboard/rh/objectifs",
    icon: Icons.target,
    group: "rh",
    permissionKey: "presences" as keyof UserPermissions,
    devOnly: false,
    adminOnly: true,
  },
  {
    title: "Mes objectifs",
    href: "/dashboard/rh/mes-objectifs",
    icon: Icons.target,
    group: "rh",
    permissionKey: "presences" as keyof UserPermissions,
    devOnly: false,
    skipPermissionCheck: true,
    agentOnly: true,
  },
  {
    title: "Mon dossier",
    href: "/dashboard/rh/mon-dossier",
    icon: Icons.fileText,
    group: "rh",
    permissionKey: "presences" as keyof UserPermissions,
    devOnly: false,
    skipPermissionCheck: true,
    agentOnly: true,
  },
  {
    title: "Dossiers RH",
    href: "/dashboard/rh/dossiers",
    icon: Icons.users,
    group: "rh",
    permissionKey: "presences" as keyof UserPermissions,
    devOnly: false,
    adminOnly: true,
  },
]

// Qavah Construction menu items
const constructionNavItems = [
  {
    title: "Dashboard",
    href: "/construction/dashboard",
    icon: Icons.home,
    group: "main",
    permissionKey: "dashboard" as keyof UserPermissions,
  },
  {
    title: "Contrats",
    href: "/construction/contrats",
    icon: Icons.receipt,
    group: "terrain",
    permissionKey: "contrats" as keyof UserPermissions,
  },
  {
    title: "Clients",
    href: "/construction/clients",
    icon: Icons.users,
    group: "clients",
    permissionKey: "clients" as keyof UserPermissions,
  },
  {
    title: "Prospects",
    href: "/construction/prospects",
    icon: Icons.userPlus,
    group: "clients",
    permissionKey: "prospects" as keyof UserPermissions,
  },
  {
    title: "Paiements",
    href: "/construction/paiements",
    icon: Icons.fileText,
    group: "finance",
    permissionKey: "paiements" as keyof UserPermissions,
  },
  {
    title: "Comptabilités",
    href: "/construction/comptabilites",
    icon: Icons.calculator,
    group: "finance",
    permissionKey: "comptabilites" as keyof UserPermissions,
  },
  {
    title: "Rappels",
    href: "/construction/rappels",
    icon: Icons.bell,
    group: "finance",
    permissionKey: "paiements" as keyof UserPermissions,
  },
  {
    title: "Paramètres",
    href: "/construction/parametres",
    icon: Icons.settings,
    group: "system",
    permissionKey: "parametres" as keyof UserPermissions,
    adminOnly: true,
  },
]

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ className, isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [constructionEnabled, setConstructionEnabled] = useState(true) // Default to enabled
  const [contratConstructionEnabled, setContratConstructionEnabled] = useState(true) // Default to enabled
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    clients: true,
    terrain: true,
    construction: true,
    acquisitions: true,
    "gestion-tp": true,
    finance: true,
    rh: true,
    system: true,
  })
  const [selectedApp, setSelectedApp] = useState(() => {
    // Detect which app based on current path
    if (typeof window !== "undefined") {
      const path = window.location.pathname
      return path.startsWith("/construction") ? "construction" : "qavahland"
    }
    return "qavahland"
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("authToken")
        if (token) {
          const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          setUserRole(response.data.role)
          setUserPermissions(response.data.permissions || null)
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error)
      }
    }

    const fetchSystemConfig = async () => {
      try {
        const token = localStorage.getItem("authToken")
        if (token) {
          const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/system/config?module=parametres`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (response.data && response.data.success) {
            setConstructionEnabled(response.data.data.constructionEnabled !== false)
            setContratConstructionEnabled(response.data.data.contratConstructionEnabled !== false)
          }
        }
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status !== 403) {
          console.error("Failed to fetch system config:", error)
        }
        // 403 = agent sans permission, on garde les valeurs par défaut
        setConstructionEnabled(true)
        setContratConstructionEnabled(true)
      }
    }

    fetchUserData()
    fetchSystemConfig()
  }, [])

  // Get the appropriate nav items based on selected app
  const sidebarNavItems = selectedApp === "construction" ? constructionNavItems : qavahlandNavItems

  // Filter menu items based on user permissions and role
  const filteredNavItems = sidebarNavItems.filter(item => {
    // Masquer les items dev-only en production
    if ((item as { devOnly?: boolean }).devOnly && process.env.NODE_ENV === 'production') {
      return false
    }

    // Vérifier les restrictions basées sur le rôle
    if (item.adminOnly && userRole !== "Admin") {
      return false
    }

    // Masquer les items réservés aux agents pour les admins
    if ((item as { agentOnly?: boolean }).agentOnly && userRole === "Admin") {
      return false
    }

    // Masquer le groupe construction si désactivé par l'admin
    if (item.group === "construction" && !contratConstructionEnabled) {
      return false
    }

    // L'Admin voit tous les modules (même logique que le backend)
    if (userRole === "Admin") {
      return true
    }

    // Les items sans vérification de permission sont accessibles à tous les utilisateurs authentifiés
    if ((item as { skipPermissionCheck?: boolean }).skipPermissionCheck) {
      return true
    }

    // Si l'utilisateur n'a pas de permissions définies, afficher seulement le dashboard
    if (!userPermissions) {
      return item.permissionKey === "dashboard"
    }

    // Vérifier si l'utilisateur a la permission de lecture pour ce module
    const modulePermission = userPermissions[item.permissionKey]
    return modulePermission && modulePermission.read
  })

  // Group menu items
  const groupedItems = filteredNavItems.reduce(
    (acc, item) => {
      if (!acc[item.group]) {
        acc[item.group] = []
      }
      acc[item.group].push(item)
      return acc
    },
    {} as Record<string, typeof filteredNavItems>,
  )

  const mainItem = groupedItems.main?.[0]
  const sectionOrder: MenuGroupKey[] = ["clients", "terrain", "construction", "acquisitions", "gestion-tp", "finance", "rh", "system"]
  const sectionLabels: Record<MenuGroupKey, string> = {
    main: "Principal",
    clients: "Gestion des clients",
    terrain: "Gestion terrain",
    construction: "Gestion de construction",
    acquisitions: "Gestion Acquisitions",
    "gestion-tp": "Gestion de TP",
    finance: "Gestion de finance",
    rh: "Ressources Humaines",
    system: "Système",
  }

  const toggleGroup = (group: MenuGroupKey) => {
    if (group === "main") return
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const handleLogout = () => {
    localStorage.removeItem("authToken")
    router.replace("/auth/login")
  }

  const apps = getApps(constructionEnabled)
  const currentApp = apps.find((app) => app.id === selectedApp) || apps[0]

  // If construction is disabled and user is on construction, redirect to qavahland
  useEffect(() => {
    if (!constructionEnabled && selectedApp === "construction") {
      setSelectedApp("qavahland")
      router.push("/dashboard")
    }
  }, [constructionEnabled, selectedApp, router])

  const handleAppSwitch = (appId: string) => {
    setSelectedApp(appId)
    // Navigate to the appropriate dashboard
    if (appId === "construction") {
      router.push("/construction/dashboard")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-gradient-to-b from-[#001b38] to-[#002952] text-white transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
        className,
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-6 w-6 rounded-lg flex items-center justify-center",
              currentApp.color === "blue" ? "bg-blue-500/20" : "bg-orange-500/20"
            )}>
              <span className={cn(
                "font-semibold",
                currentApp.color === "blue" ? "text-blue-500" : "text-orange-500"
              )}>
                {currentApp.icon}
              </span>
            </div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              {currentApp.name}
            </h2>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-white hover:bg-white/10 hover:text-white"
        >
          <Icons.menu className="h-5 w-5" />
        </Button>
      </div>

      {/* App Switcher - Only show if there are multiple apps */}
      {apps.length > 1 && (
        <div className="px-2 py-3 border-b border-white/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between text-white hover:bg-white/10 hover:text-white h-auto",
                  isCollapsed ? "px-2" : "px-3"
                )}
              >
                {isCollapsed ? (
                  <div className="flex items-center justify-center w-full">
                    <Icons.building className="h-5 w-5" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        currentApp.color === "blue" ? "bg-blue-500/20" : "bg-orange-500/20"
                      )}>
                        <span className={cn(
                          "text-sm font-bold",
                          currentApp.color === "blue" ? "text-blue-500" : "text-orange-500"
                        )}>
                          {currentApp.icon}
                        </span>
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">{currentApp.name}</span>
                        <span className="text-xs text-white/40">{currentApp.description}</span>
                      </div>
                    </div>
                    <Icons.chevronDown className="h-4 w-4 text-white/40" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align={isCollapsed ? "start" : "center"} 
              className="w-56 bg-[#002952] border-white/10 text-white"
              sideOffset={5}
            >
              {apps.map((app) => (
                <DropdownMenuItem
                  key={app.id}
                  onClick={() => handleAppSwitch(app.id)}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      app.color === "blue" ? "bg-blue-500/20" : "bg-orange-500/20"
                    )}>
                      <span className={cn(
                        "text-sm font-bold",
                        app.color === "blue" ? "text-blue-500" : "text-orange-500"
                      )}>
                        {app.icon}
                      </span>
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-medium">{app.name}</span>
                      <span className="text-xs text-white/40">{app.description}</span>
                    </div>
                    {selectedApp === app.id && (
                      <Icons.check className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-4 px-2">
          {mainItem && (
            <div className="space-y-2">
              {!isCollapsed && (
                <h3 className="px-4 text-xs font-medium uppercase tracking-wider text-white/40 mb-1">
                  Principal
                </h3>
              )}
              <Button
                asChild
                variant="ghost"
                className={cn(
                  "w-full justify-start text-white/60 hover:text-white hover:bg-white/10 transition-colors",
                  "relative h-11 mb-1",
                  pathname === mainItem.href && [
                    "text-white bg-gradient-to-r from-blue-500/20 to-transparent",
                    "hover:from-blue-500/30 hover:to-transparent",
                    "after:absolute after:left-0 after:top-2 after:bottom-2 after:w-0.5 after:bg-blue-500",
                  ],
                  isCollapsed ? "px-2" : "px-4",
                )}
              >
                <Link href={mainItem.href} className="flex items-center w-full">
                  <div
                    className={cn("flex items-center gap-3 min-w-[24px]", pathname === mainItem.href && "text-blue-500")}
                  >
                    <mainItem.icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{mainItem.title}</span>}
                  </div>
                </Link>
              </Button>
            </div>
          )}

          {sectionOrder.map((group) => {
            const items = groupedItems[group] || []
            if (items.length === 0) return null
            const isExpanded = expandedGroups[group] ?? true
            return (
              <div key={group} className="space-y-1">
                {!isCollapsed && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => toggleGroup(group)}
                    className="w-full h-9 px-4 justify-between text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <span className="text-xs font-medium uppercase tracking-wider">{sectionLabels[group]}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded ? "rotate-180" : "rotate-0")} />
                  </Button>
                )}
                {(isCollapsed || isExpanded) &&
                  items.map((item) => (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-white/60 hover:text-white hover:bg-white/10 transition-colors",
                        "relative h-11 mb-1",
                        pathname === item.href && [
                          "text-white bg-gradient-to-r from-blue-500/20 to-transparent",
                          "hover:from-blue-500/30 hover:to-transparent",
                          "after:absolute after:left-0 after:top-2 after:bottom-2 after:w-0.5 after:bg-blue-500",
                        ],
                        isCollapsed ? "px-2" : "px-6",
                      )}
                    >
                      <Link href={item.href} className="flex items-center w-full">
                        <div className={cn("flex items-center gap-3 min-w-[24px]", pathname === item.href && "text-blue-500")}>
                          <item.icon className="h-5 w-5 shrink-0" />
                          {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                        </div>
                      </Link>
                    </Button>
                  ))}
              </div>
            )
          })}
        </nav>
      </ScrollArea>
      <LogoutButton isCollapsed={isCollapsed} />
    </div>
  )
}
