"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Loader2, ArrowLeft, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Cookies from "js-cookie"
import axios from "axios"
import { toast } from "react-hot-toast"

function VerifyOTPContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast: shadcnToast } = useToast()
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string>("")
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Get userId and email from URL params or localStorage
    const userIdParam = searchParams.get("userId")
    const emailParam = searchParams.get("email")
    
    if (userIdParam) {
      setUserId(userIdParam)
      localStorage.setItem("otpUserId", userIdParam)
    } else {
      const storedUserId = localStorage.getItem("otpUserId")
      if (storedUserId) {
        setUserId(storedUserId)
      } else {
        // No userId found, redirect to login
        router.push("/auth/login")
        return
      }
    }

    if (emailParam) {
      setEmail(emailParam)
      localStorage.setItem("otpEmail", emailParam)
    } else {
      const storedEmail = localStorage.getItem("otpEmail")
      if (storedEmail) {
        setEmail(storedEmail)
      }
    }

    // Start countdown timer
    setCountdown(600) // 10 minutes in seconds
  }, [searchParams, router])

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Only take the last character
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").trim()
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split("")
      setOtp(newOtp)
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerifyOTP = async () => {
    const otpCode = otp.join("")
    
    if (otpCode.length !== 6) {
      toast.error("Veuillez entrer le code complet à 6 chiffres")
      return
    }

    if (!userId) {
      toast.error("Erreur: Identifiant utilisateur manquant")
      router.push("/auth/login")
      return
    }

    setIsLoading(true)
    const toastId = toast.loading("Vérification du code...")

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/users/verify-otp`,
        {
          userId,
          code: otpCode,
        }
      )

      if (response.data.success && response.data.token) {
        const token = response.data.token
        
        // Store token
        localStorage.setItem("authToken", token)
        Cookies.set("authToken", token, {
          expires: 7,
          path: "/",
          secure: process.env.NODE_ENV === "production",
          sameSite: "Lax",
        })

        // Clear OTP data
        localStorage.removeItem("otpUserId")
        localStorage.removeItem("otpEmail")

        toast.success("Vérification réussie ! Redirection...", { id: toastId })
        
        await new Promise((resolve) => setTimeout(resolve, 500))
        window.location.href = "/dashboard"
      } else {
        throw new Error(response.data.message || "Erreur lors de la vérification")
      }
    } catch (error) {
      console.error("OTP verification error:", error)
      let errorMessage = "Code invalide. Veuillez réessayer."

      if (axios.isAxiosError(error)) {
        if (error.response) {
          const data = error.response.data
          errorMessage = data.message || errorMessage
          
          if (error.response.status === 400) {
            if (data.codeExpired) {
              errorMessage = "Le code a expiré. Veuillez demander un nouveau code."
            } else if (data.remainingAttempts !== undefined) {
              errorMessage = data.message || `Il vous reste ${data.remainingAttempts} tentative(s).`
            }
          } else if (error.response.status === 429) {
            errorMessage = "Trop de tentatives échouées. Veuillez demander un nouveau code."
            // Reset OTP inputs
            setOtp(["", "", "", "", "", ""])
            inputRefs.current[0]?.focus()
          }
        }
      }

      toast.error(errorMessage, { id: toastId })
      
      // Reset OTP inputs on error
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!userId) {
      toast.error("Erreur: Identifiant utilisateur manquant")
      return
    }

    setIsResending(true)
    const toastId = toast.loading("Envoi d'un nouveau code...")

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/users/resend-otp`,
        { userId }
      )

      if (response.data.success) {
        toast.success("Un nouveau code a été envoyé à votre adresse email", { id: toastId })
        
        // Reset OTP inputs
        setOtp(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
        
        // Reset countdown
        setCountdown(600)
      } else {
        throw new Error(response.data.message || "Erreur lors de l'envoi")
      }
    } catch (error) {
      console.error("Resend OTP error:", error)
      let errorMessage = "Erreur lors de l'envoi du code. Veuillez réessayer."

      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data?.message || errorMessage
      }

      toast.error(errorMessage, { id: toastId })
    } finally {
      setIsResending(false)
    }
  }

  const handleBackToLogin = () => {
    localStorage.removeItem("otpUserId")
    localStorage.removeItem("otpEmail")
    router.push("/auth/login")
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-gradient-to-b">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md px-4"
      >
        <Card className="bg-[#002952]/90 border-[#0055B3] shadow-2xl backdrop-blur-sm m-4 rounded-xl overflow-hidden">
          <div className="absolute h-1 bg-gradient-to-r from-blue-400 to-cyan-400 top-0 left-0 right-0"></div>
          <CardHeader className="space-y-2 pb-6">
            <div className="flex justify-center mb-2">
              <img 
                src="https://res.cloudinary.com/drkwjnk7l/image/upload/v1774894635/qavah_group_logo_uyep0t.png" 
                alt="Logo" 
                style={{ width: "200px" }} 
                className="w-auto" 
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-white">
              Vérification OTP
            </CardTitle>
            <CardDescription className="text-center text-blue-200">
              {email ? (
                <>Un code de vérification a été envoyé à<br /><strong>{email}</strong></>
              ) : (
                "Entrez le code de vérification à 6 chiffres"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OTP Input */}
            <div className="space-y-4">
              <Label className="text-blue-100 font-medium text-center block">
                Code de vérification
              </Label>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold bg-[#001B38]/70 text-white border-[#003B7A] focus:border-blue-400 rounded-lg transition-all"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Countdown Timer */}
            {countdown > 0 && (
              <div className="text-center text-sm text-blue-200">
                Code valide pendant : <span className="font-bold text-white">{formatTime(countdown)}</span>
              </div>
            )}

            {countdown === 0 && (
              <div className="text-center text-sm text-yellow-400">
                Le code a expiré. Veuillez demander un nouveau code.
              </div>
            )}

            {/* Verify Button */}
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-6 rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all duration-200"
              onClick={handleVerifyOTP}
              disabled={isLoading || otp.join("").length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Vérification en cours...
                </>
              ) : (
                "Vérifier"
              )}
            </Button>

            {/* Resend OTP */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-blue-200 text-center">
                Vous n'avez pas reçu le code ?
              </p>
              <Button
                variant="outline"
                className="text-blue-200 border-blue-400 hover:bg-blue-500/20"
                onClick={handleResendOTP}
                disabled={isResending || countdown > 0}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Renvoyer le code
                  </>
                )}
              </Button>
            </div>

            {/* Back to Login */}
            <Button
              variant="ghost"
              className="w-full text-blue-200 hover:text-white hover:bg-blue-500/20"
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen w-full bg-gradient-to-b">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
        <Card className="bg-[#002952]/90 border-[#0055B3] shadow-2xl backdrop-blur-sm m-4 rounded-xl overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
            <p className="text-center text-blue-200 mt-4">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  )
}

