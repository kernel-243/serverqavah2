"use client"

import { useState, useEffect, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader, Info, Mail, Lock, ArrowRight } from "lucide-react"
import { AuthResultDialog } from "@/components/auth-result-dialog"
import Cookies from "js-cookie"
import axios from "axios"
import { toast } from "react-hot-toast"

const formSchema = z.object({
  email: z.string().email({ message: "Adresse e-mail invalide" }),
  password: z.string().min(5, { message: "Le mot de passe doit contenir au moins 5 caractères" }),
})

function InactivityMessage() {
  const searchParams = useSearchParams()
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    if (searchParams.get("inactivity") === "1") {
      setShowMessage(true)
      const url = new URL(window.location.href)
      url.searchParams.delete("inactivity")
      window.history.replaceState({}, "", url.pathname + url.search)
    }
  }, [searchParams])

  if (!showMessage) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-xl border flex gap-3 items-start"
      style={{ borderColor: "rgba(56,189,248,0.25)", background: "rgba(56,189,248,0.07)" }}
    >
      <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#38BDF8" }} />
      <div>
        <p className="text-sm font-medium" style={{ color: "#E0F2FE" }}>Session interrompue</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(186,230,253,0.6)" }}>
          Votre session a été fermée après 5 minutes d&apos;inactivité.
        </p>
      </div>
    </motion.div>
  )
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
}


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogContent, setDialogContent] = useState({ title: "", message: "" })
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    const toastId = toast.loading("Connexion en cours...")
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/login`, {
        email: data.email,
        password: data.password,
      })

      if (response.status === 200) {
        if (response.data.requiresOTP === true) {
          localStorage.setItem("otpUserId", response.data.userId)
          localStorage.setItem("otpEmail", response.data.email || data.email)
          toast.success("Code de vérification envoyé à votre email", { id: toastId })
          await new Promise((resolve) => setTimeout(resolve, 500))
          router.push(`/auth/verify-otp?userId=${response.data.userId}&email=${encodeURIComponent(response.data.email || data.email)}`)
          return
        }

        if (response.data.token) {
          const token = response.data.token
          localStorage.setItem("authToken", token)
          Cookies.set("authToken", token, {
            expires: 7,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
          })
          toast.success("Connexion réussie. Redirection...", { id: toastId })
          await new Promise((resolve) => setTimeout(resolve, 500))
          const params = new URLSearchParams(window.location.search)
          const redirectTo = params.get("redirect") || "/dashboard"
          window.location.href = redirectTo
          return
        }
      } else if (response.status === 405) {
        toast.error("Votre compte est désactivé, veuillez contacter l'administrateur", { id: toastId })
        throw new Error("Votre compte est désactivé")
      } else if (response.status === 406) {
        toast.error("Votre compte n'est plus disponible, veuillez contacter l'administrateur", { id: toastId })
        throw new Error("Votre compte n'est plus disponible")
      } else {
        toast.error("Échec de la connexion - Aucun token reçu", { id: toastId })
        throw new Error("Échec de la connexion - Aucun token reçu")
      }
    } catch (error) {
      console.error("Login error:", error)
      let errorMessage = "Une erreur inattendue s'est produite"

      if (axios.isAxiosError(error)) {
        if (error.response) {
          switch (error.response.status) {
            case 401:
              toast.error("Identifiants invalides", { id: toastId })
              errorMessage = "Identifiants invalides"
              break
            case 404:
              toast.error("Utilisateur non trouvé", { id: toastId })
              errorMessage = "Utilisateur non trouvé"
              break
            case 429:
              toast.error("Trop de tentatives, veuillez réessayer plus tard", { id: toastId })
              errorMessage = "Trop de tentatives, veuillez réessayer plus tard"
              break
            default:
              toast.error("Erreur lors de la connexion", { id: toastId })
              errorMessage = error.response.data?.message || "Erreur lors de la connexion"
          }
        } else if (error.request) {
          toast.error("Impossible de contacter le serveur", { id: toastId })
          errorMessage = "Impossible de contacter le serveur"
        }
      }

      setDialogContent({ title: "Erreur de connexion", message: errorMessage })
      setDialogOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        .auth-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 13px 16px 13px 44px;
          color: #fff;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.25); }
        .auth-input:focus {
          border-color: rgba(56,189,248,0.6);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.08);
        }
        .auth-input:focus + .input-icon,
        .auth-input:focus ~ .input-icon { color: #38BDF8; }
        .auth-input.has-error { border-color: rgba(248,113,113,0.5); }
        .auth-input.has-error:focus { box-shadow: 0 0 0 3px rgba(248,113,113,0.08); }

        .submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          background: linear-gradient(135deg, #0055B3 0%, #0077CC 50%, #38BDF8 100%);
          box-shadow: 0 4px 24px rgba(0,85,179,0.35);
          position: relative;
          overflow: hidden;
        }
        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%);
        }
        .submit-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(0,85,179,0.45);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0px); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
        }
      `}</style>

      <div className="fixed inset-0 flex overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Background ── */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, #020C1B 0%, #041628 55%, #061A32 100%)" }} />
        <div className="orb" style={{ width: 600, height: 600, top: "-15%", left: "10%", background: "rgba(0,85,179,0.12)" }} />
        <div className="orb" style={{ width: 400, height: 400, bottom: "5%", right: "15%", background: "rgba(56,189,248,0.07)" }} />

        {/* ── Centered form panel ── */}
        <div className="relative flex flex-1 items-center justify-center p-6">

          {/* Subtle center glow */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(56,189,248,0.05) 0%, transparent 60%)" }} />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full"
            style={{ maxWidth: 420 }}
          >
            {/* Logo above card */}
            <motion.div
              custom={0} variants={fadeUp} initial="initial" animate="animate"
              style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}
            >
              <img
                src="https://res.cloudinary.com/drkwjnk7l/image/upload/v1774894635/qavah_group_logo_uyep0t.png"
                alt="Qavah Group"
                style={{ height: 64, width: "auto" }}
              />
            </motion.div>

            {/* Card */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "36px 36px 32px",
              backdropFilter: "blur(20px)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>

              {/* Header accent bar */}
              <div style={{ height: 2, background: "linear-gradient(90deg, #0055B3, #38BDF8, transparent)", borderRadius: 1, marginBottom: 28 }} />

              <motion.div custom={1} variants={fadeUp} initial="initial" animate="animate">
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: "#fff", marginBottom: 6 }}>
                  Connexion
                </h2>
                <p style={{ fontSize: 13, color: "rgba(148,197,224,0.6)", marginBottom: 28, fontWeight: 300 }}>
                  Entrez vos identifiants pour accéder à votre espace
                </p>
              </motion.div>

              <Suspense fallback={null}>
                <InactivityMessage />
              </Suspense>

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Email */}
                <motion.div custom={2} variants={fadeUp} initial="initial" animate="animate">
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", color: "rgba(186,230,253,0.7)", marginBottom: 8 }}>
                    ADRESSE E-MAIL
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail className="input-icon" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(148,197,224,0.4)", transition: "color 0.2s", pointerEvents: "none" }} />
                    <input
                      id="email"
                      type="email"
                      placeholder="nom@entreprise.com"
                      {...register("email")}
                      className={`auth-input${errors.email ? " has-error" : ""}`}
                    />
                  </div>
                  {errors.email && (
                    <p style={{ fontSize: 12, color: "#F87171", marginTop: 6 }}>{errors.email.message}</p>
                  )}
                </motion.div>

                {/* Password */}
                <motion.div custom={3} variants={fadeUp} initial="initial" animate="animate">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", color: "rgba(186,230,253,0.7)" }}>
                      MOT DE PASSE
                    </label>
                    <a
                      href="/auth/forgot-password"
                      style={{ fontSize: 12, color: "#38BDF8", textDecoration: "none", fontWeight: 400, opacity: 0.8, transition: "opacity 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}
                    >
                      Mot de passe oublié ?
                    </a>
                  </div>
                  <div style={{ position: "relative" }}>
                    <Lock className="input-icon" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(148,197,224,0.4)", pointerEvents: "none" }} />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("password")}
                      className={`auth-input${errors.password ? " has-error" : ""}`}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(148,197,224,0.4)", display: "flex", alignItems: "center", transition: "color 0.2s", padding: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#38BDF8")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(148,197,224,0.4)")}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p style={{ fontSize: 12, color: "#F87171", marginTop: 6 }}>{errors.password.message}</p>
                  )}
                </motion.div>

                {/* Submit */}
                <motion.div custom={4} variants={fadeUp} initial="initial" animate="animate" style={{ paddingTop: 4 }}>
                  <button type="submit" disabled={isLoading} className="submit-btn">
                    {isLoading ? (
                      <>
                        <Loader style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        Se connecter
                        <ArrowRight style={{ width: 15, height: 15 }} />
                      </>
                    )}
                  </button>
                </motion.div>

              </form>

              {/* Footer */}
              <motion.div custom={5} variants={fadeUp} initial="initial" animate="animate">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28 }}>
                  <div className="divider-line" />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", whiteSpace: "nowrap" }}>accès sécurisé</span>
                  <div className="divider-line" />
                </div>
              </motion.div>

            </div>
          </motion.div>
        </div>

      </div>

      <AuthResultDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogContent.title}
        message={dialogContent.message}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
