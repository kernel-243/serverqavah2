"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Cookies from "js-cookie"
import { Icons } from "./icons"
import { cn } from "@/lib/utils"
import {toast} from "react-hot-toast"

export function LogoutButton({ isCollapsed }: { isCollapsed: boolean }) {
  const router = useRouter()

  const handleLogout = async () => {
    const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : ""
    const toastId = toast.loading("Déconnexion en cours...")
    await new Promise(resolve => setTimeout(resolve, 2000))
    localStorage.removeItem("authToken")
    Cookies.remove("authToken", { path: "/" })
    router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`)
    toast.success("Déconnexion réussie", { id: toastId })
  }

  return (
    <div className="p-4 border-t border-white/10">
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start text-white/60 hover:text-white hover:bg-white/10",
        isCollapsed ? "px-2" : "px-4"
      )}
      onClick={handleLogout}
    >
      <div className="flex items-center gap-3">
        <Icons.logout className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span className="text-sm font-medium">Déconnexion</span>}
      </div>
    </Button>
  </div>
    
  )
}

