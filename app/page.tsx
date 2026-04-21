"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const authToken = localStorage.getItem("authToken")
    if (authToken) {
      router.push("/dashboard")
    } else {
      router.push("/auth/login")
    }
  }, [router])

  return null // This component doesn't render anything
}

