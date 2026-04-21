"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import axios from "axios"
import { toast } from "@/components/ui/use-toast"

const formSchema = z
  .object({
    password: z.string().min(8, {
      message: "Le mot de passe doit contenir au moins 8 caractères",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetToken = searchParams.get("token")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!resetToken) {
      setError("Token de réinitialisation manquant")
      return
    }

    setIsLoading(true)
    setError("")
console.log("password: ", data.password)
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users/reset-password`, {
        resetToken,
        newPassword: data.password,
      })
      console.log("Response: ", response)

      if (response.status === 200) {
        toast({
          title: "Succès",
          description: "Votre mot de passe a été mis à jour avec succès",
        })
        router.push("/auth/login")
      }
    } catch (error) {
      console.log("Error: ", error)

      if (axios.isAxiosError(error) && error.response) {
        const { status, data } = error.response as {
          status: number
          data?: { message?: string; errors?: { msg?: string }[] }
        }

        // Si erreur 400 avec tableau d'erreurs de validation, on affiche chaque message
        if (status === 400 && Array.isArray(data?.errors) && data.errors.length > 0) {
          const messages = data.errors
            .map((e) => e.msg)
            .filter(Boolean)
            .join("\n")

          setError(messages || data?.message || "Erreur de validation du mot de passe")
          return
        }

        const errorMessage =
          data?.message || "Une erreur s'est produite lors de la réinitialisation du mot de passe"
        setError(errorMessage)
      } else {
        setError("Une erreur inattendue s'est produite")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Réinitialiser le mot de passe</CardTitle>
        <CardDescription>Entrez votre nouveau mot de passe</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <Icons.eye className={`h-4 w-4 ${showPassword ? "opacity-40" : ""}`} />
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="grid gap-2 mt-4">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmPassword")}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? "Masquer la confirmation du mot de passe" : "Afficher la confirmation du mot de passe"}
              >
                <Icons.eye className={`h-4 w-4 ${showConfirmPassword ? "opacity-40" : ""}`} />
              </button>
            </div>
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <Button className="w-full mt-6" type="submit" disabled={isLoading}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Réinitialiser le mot de passe
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/auth/login" className="text-sm text-muted-foreground hover:underline">
          Retour à la connexion
        </Link>
      </CardFooter>
    </Card>
  )
}

