"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"

const INACTIVITY_MS = 5 * 60 * 1000 // 5 minutes

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const

/**
 * Déconnecte l'utilisateur après une période d'inactivité (défaut: 5 minutes).
 * Écoute les événements souris, clavier, scroll et touch pour réinitialiser le timer.
 * À utiliser dans le layout dashboard (côté client).
 */
export function useInactivityLogout(inactivityMs: number = INACTIVITY_MS) {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logout = useCallback(() => {
    if (typeof window === "undefined") return
    const currentPath = window.location.pathname + window.location.search
    localStorage.removeItem("authToken")
    Cookies.remove("authToken")
    router.push(`/auth/login?inactivity=1&redirect=${encodeURIComponent(currentPath)}`)
  }, [router])

  const resetTimer = useCallback(() => {
    if (typeof window === "undefined") return
    if (!localStorage.getItem("authToken")) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      logout()
    }, inactivityMs)
  }, [inactivityMs, logout])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!localStorage.getItem("authToken")) return

    resetTimer()

    const handleActivity = () => resetTimer()

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity)
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [resetTimer])
}
