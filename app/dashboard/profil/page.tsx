"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, User, Mail, Shield, Calendar, Clock, Edit2 } from "lucide-react"
import axios from "axios"
import { ErrorDialog } from "@/components/error-dialog"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface UserData {
  _id: string
  nom: string
  prenom: string
  email: string
  role: string
  createdAt?: string
  updatedAt?: string
  lastLogon?: string
}

export default function ProfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: "",
    message: "",
  })

  // Récupérer les données de l'utilisateur actuel
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("authToken")
        
        if (!token) {
          router.push("/auth/login")
          return
        }

        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setUser(response.data)
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            router.push("/auth/login")
          } else {
            setError({
              show: true,
              title: "Erreur",
              message: error.response?.data?.message || "Une erreur est survenue lors du chargement de votre profil",
            })
          }
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [router])

  // Fonction pour formater le rôle en français
  const getRoleLabel = (role: string) => {
    const roleMap: { [key: string]: string } = {
      admin: "Administrateur",
      user: "Utilisateur",
      manager: "Gestionnaire",
      commercial: "Commercial",
      agent: "Agent",
    }
    return roleMap[role?.toLowerCase()] || role
  }

  // Fonction pour obtenir la couleur du badge selon le rôle
  const getRoleBadgeVariant = (role: string) => {
    if (role?.toLowerCase() === "agent") {
      return "default" // orange
    } else if (role?.toLowerCase() === "admin") {
      return "default" // green dark
    }
    return "secondary"
  }

  const getRoleBadgeClasses = (role: string) => {
    if (role?.toLowerCase() === "agent") {
      return "bg-orange-500 hover:bg-orange-600 text-white"
    } else if (role?.toLowerCase() === "admin") {
      return "bg-green-800 hover:bg-green-900 text-white"
    }
    return ""
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement de votre profil...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <ErrorDialog
        isOpen={error.show}
        onClose={() => setError({ show: false, title: "", message: "" })}
        title={error.title}
        message={error.message}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <Button 
                variant="outline" 
                onClick={() => router.push("/dashboard")} 
                className="hover:bg-white/80 backdrop-blur-sm border-slate-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
                <p className="text-slate-600 mt-1">Consultez et gérez vos informations personnelles</p>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Carte principale du profil */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                      {user.prenom?.[0]?.toUpperCase() || ""}{user.nom?.[0]?.toUpperCase() || ""}
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-blue-900">
                        {user.prenom} {user.nom}
                      </CardTitle>
                      <CardDescription className="text-blue-700 mt-1">
                        {user.email}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`${getRoleBadgeClasses(user.role)} text-sm px-3 py-1`}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6">
                {/* Informations personnelles */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    Informations personnelles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nom" className="text-sm font-medium text-slate-700">
                        Nom
                      </Label>
                      <Input
                        id="nom"
                        value={user.nom}
                        disabled
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prenom" className="text-sm font-medium text-slate-700">
                        Prénom
                      </Label>
                      <Input
                        id="prenom"
                        value={user.prenom}
                        disabled
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Informations de contact */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-blue-600" />
                    Informations de contact
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      disabled
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                <Separator />

                {/* Informations du compte */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Informations du compte
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm font-medium text-slate-700">
                        Rôle
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="role"
                          value={getRoleLabel(user.role)}
                          disabled
                          className="bg-slate-50 border-slate-200"
                        />
                        <Badge className={`${getRoleBadgeClasses(user.role)} ml-2`}>
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                    {user.createdAt && (
                      <div className="space-y-2">
                        <Label htmlFor="createdAt" className="text-sm font-medium text-slate-700 flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Date de création
                        </Label>
                        <Input
                          id="createdAt"
                          value={format(new Date(user.createdAt), "PPP", { locale: fr })}
                          disabled
                          className="bg-slate-50 border-slate-200"
                        />
                      </div>
                    )}
                  </div>
                  {user.lastLogon && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="lastLogon" className="text-sm font-medium text-slate-700 flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Dernière connexion
                      </Label>
                      <Input
                        id="lastLogon"
                        value={format(new Date(user.lastLogon), "PPP 'à' HH:mm", { locale: fr })}
                        disabled
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
                <CardDescription>
                  Gérez les paramètres de votre compte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button
                    onClick={() => router.push("/dashboard/settings")}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Modifier mes paramètres
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                  >
                    Retour au tableau de bord
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

