"use client"

import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, Bell, CheckCircle2, ClipboardCheck, UserCheck, X, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface NotificationObjectif {
  _id: string
  type: "objectif_atteint" | "objectif_assigne" | "validation_requise" | "objectif_valide"
  message: string
  lu: boolean
  createdAt: string
  assignationId?: {
    _id: string
    objectifId?: { titre: string }
  }
}

const TYPE_CONFIG = {
  objectif_atteint: {
    icon: Trophy,
    colorClass: "text-yellow-500",
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    label: "Objectif atteint",
  },
  objectif_assigne: {
    icon: ClipboardCheck,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    label: "Nouvel objectif",
  },
  validation_requise: {
    icon: UserCheck,
    colorClass: "text-orange-500",
    bgClass: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    label: "Validation requise",
  },
  objectif_valide: {
    icon: CheckCircle2,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    label: "Objectif validé",
  },
}

interface ObjectifNotificationsProps {
  userRole: string
}

export function ObjectifNotifications({ userRole }: ObjectifNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationObjectif[]>([])
  const [unread, setUnread] = useState(0)
  const [isExpanded, setIsExpanded] = useState(true)

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${api}/objectifs/notifications`, { headers })
      setNotifications(res.data.data || [])
      setUnread(res.data.unread || 0)
    } catch {
      // Silencieux si pas d'objectifs encore
    }
  }, [])

  const triggerAutoCheck = useCallback(async () => {
    try {
      await axios.post(`${api}/objectifs/check-auto`, {}, { headers })
      await fetchNotifications()
    } catch {
      // Silencieux
    }
  }, [fetchNotifications])

  useEffect(() => {
    triggerAutoCheck()
  }, [triggerAutoCheck])

  const handleMarkRead = async (id: string) => {
    try {
      await axios.put(`${api}/objectifs/notifications/${id}/lue`, {}, { headers })
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, lu: true } : n)))
      setUnread((prev) => Math.max(0, prev - 1))
    } catch {
      // Silencieux
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await axios.put(`${api}/objectifs/notifications/toutes-lues`, {}, { headers })
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })))
      setUnread(0)
    } catch {
      // Silencieux
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.lu)
  const visibleNotifications = isExpanded ? notifications.slice(0, 5) : unreadNotifications.slice(0, 3)

  if (notifications.length === 0) return null

  const objectifsHref = userRole === "Admin" ? "/dashboard/rh/objectifs" : "/dashboard/rh/mes-objectifs"

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#002952] flex items-center justify-center">
            <Bell className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications objectifs
            </span>
            {unread > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0 h-4">
                {unread} nouveau{unread > 1 ? "x" : ""}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Tout marquer lu
            </button>
          )}
          <Link href={objectifsHref}>
            <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
              Voir tout <ExternalLink className="h-3 w-3" />
            </button>
          </Link>
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded"
          >
            {isExpanded ? <X className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="divide-y divide-gray-50 dark:divide-slate-800"
          >
            {visibleNotifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type]
              const Icon = cfg.icon
              const dateStr = new Date(notif.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
              return (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors",
                    !notif.lu && "bg-blue-50/30 dark:bg-blue-900/10"
                  )}
                >
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.bgClass, "border")}>
                    <Icon className={cn("h-4 w-4", cfg.colorClass)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.badgeClass)}>
                        {cfg.label}
                      </span>
                      {!notif.lu && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-snug">
                      {notif.message}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 block">
                      {dateStr}
                    </span>
                  </div>
                  {!notif.lu && (
                    <button
                      onClick={() => handleMarkRead(notif._id)}
                      className="shrink-0 text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 p-1 rounded"
                      title="Marquer comme lu"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              )
            })}
            {notifications.length > 5 && (
              <div className="px-4 py-2 text-center">
                <Link href={objectifsHref} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Voir toutes les notifications ({notifications.length})
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
