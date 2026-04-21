"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import axios from "axios"
import { toast } from "@/components/ui/use-toast"
import { ErrorDialog } from "@/components/error-dialog"
import { ArrowLeft, User, Mail, Shield, Calendar, Clock, TrendingUp, Target, Award, Zap, Activity, Users } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"
import { CommercialProspectChart, StatusPieChart } from "@/components/dashboard/commercial-prospect-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserData {
  _id: string
  nom: string
  email: string
  role: string
  dateCreated: string
  lastLogon?: string
  status: string
  permissions?: any
  clientsAttributedCount?: number
  salaire?: number
}

interface CommercialDashboardData {
  commercial: {
    id: string
    nom: string
    prenom: string
    email: string
  }
  overview: {
    totalProspects: number
    clientsAttributedCount?: number
    prospectsThisMonth: number
    prospectsLast30Days: number
    prospectsLast7Days: number
    convertedProspects: number
    conversionRate: number
  }
  byStatus: {
    prospect: number
    client: number
    annuler: number
  }
  performance: {
    contracts: number
    contractsTotalValue: number
    totalRevenue: number
    averageRevenuePerClient: number
  }
  trends: {
    monthly: Array<{
      month: number
      year: number
      count: number
      label: string
    }>
  }
  recentActivity: {
    prospects: Array<{
      _id: string
      nom: string
      prenom: string
      status: string
      createdAt: string
      telephone: string
      email: string
    }>
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  
  const [userData, setUserData] = useState<UserData | null>(null)
  const [commercialData, setCommercialData] = useState<CommercialDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSessionError, setShowSessionError] = useState(false)
  const [activityDateDebut, setActivityDateDebut] = useState<string>("")
  const [activityDateFin, setActivityDateFin] = useState<string>("")

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("authToken")
        
        if (!token) {
          setShowSessionError(true)
          setIsLoading(false)
          return
        }

        // Fetch user details
        const userResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (userResponse.data && userResponse.data.success && userResponse.data.data) {
          setUserData(userResponse.data.data)
          
          // If user is an Agent, fetch commercial dashboard data
          if (userResponse.data.data.role?.toLowerCase() === "agent") {
            try {
              const params = new URLSearchParams()
              if (activityDateDebut) params.append("dateDebut", activityDateDebut)
              if (activityDateFin) params.append("dateFin", activityDateFin)
              const commercialResponse = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/dashboard/commercial/${userId}${params.toString() ? `?${params.toString()}` : ""}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              )

              if (commercialResponse.data && commercialResponse.data.success && commercialResponse.data.data) {
                setCommercialData(commercialResponse.data.data)
              }
            } catch (commercialError) {
              console.error("Error fetching commercial dashboard:", commercialError)
              // Don't show error for commercial dashboard, just log it
            }
          }
        } else {
          setUserData(null)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          setShowSessionError(true)
        } else {
          toast({
            title: "Erreur",
            description: "Impossible de charger les données de l'utilisateur",
            variant: "destructive",
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchUserData()
    }
  }, [userId, activityDateDebut, activityDateFin])

  const handleSessionExpired = () => {
    localStorage.removeItem("authToken")
    router.push("/auth/login")
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Utilisateur non trouvé</p>
          <Button onClick={() => router.push("/dashboard/settings")} className="mt-4">
            Retour aux paramètres
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <ErrorDialog
        isOpen={showSessionError}
        onClose={handleSessionExpired}
        title="Session expirée"
        message="Votre session a expiré. Veuillez vous reconnecter."
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Détails de l'utilisateur</h1>
            <p className="text-muted-foreground">Informations et statistiques de l'utilisateur</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          {userData.role?.toLowerCase() === "agent" && (
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          {/* User Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Informations personnelles</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nom</p>
                  <p className="text-lg font-semibold">{userData.nom}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-lg font-semibold flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{userData.email}</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rôle</p>
                  <Badge
                    variant={userData.role === "Admin" ? "default" : "secondary"}
                    className={
                      userData.role === "Admin"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {userData.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Statut</p>
                  <Badge
                    variant="outline"
                    className={
                      userData.status === "active"
                        ? "border-green-200 text-green-700 bg-green-50"
                        : userData.status === "desactivated"
                        ? "border-orange-200 text-orange-700 bg-orange-50"
                        : "border-red-200 text-red-700 bg-red-50"
                    }
                  >
                    {userData.status === "active"
                      ? "Actif"
                      : userData.status === "desactivated"
                      ? "Inactif"
                      : "Supprimé"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date de création</p>
                  <p className="text-lg font-semibold flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(userData.dateCreated).toLocaleDateString()}</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dernière connexion</p>
                  <p className="text-lg font-semibold flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {userData.lastLogon
                        ? new Date(userData.lastLogon).toLocaleDateString()
                        : "Jamais connecté"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clients (commercial attitré)</p>
                  <p className="text-lg font-semibold flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>{userData.clientsAttributedCount ?? 0}</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Salaire</p>
                  <p className="text-lg font-semibold">
                    {userData.salaire !== undefined && userData.salaire !== null
                      ? `${userData.salaire.toLocaleString()} $`
                      : "Non défini"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {userData.role?.toLowerCase() === "agent" && (
          <TabsContent value="dashboard" className="space-y-6">
            {commercialData ? (
              <>
                {/* Overview Cards */}
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
                >
                  <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer"
                  >
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-white">Total Prospects</CardTitle>
                        <Icons.users className="h-5 w-5 text-white" />
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                          className="text-3xl font-bold text-white mb-1"
                        >
                          {commercialData.overview.totalProspects}
                        </motion.div>
                        <p className="text-xs text-blue-100">
                          Prospects convertis: {commercialData.overview.convertedProspects}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer"
                  >
                    <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-white">Clients (attitré)</CardTitle>
                        <Users className="h-5 w-5 text-white" />
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.22, type: "spring" }}
                          className="text-3xl font-bold text-white mb-1"
                        >
                          {commercialData.overview.clientsAttributedCount ?? 0}
                        </motion.div>
                        <p className="text-xs text-cyan-100">
                          Dont il est commercial attitré
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer"
                  >
                    <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-white">Taux de Conversion</CardTitle>
                        <Target className="h-5 w-5 text-white" />
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: "spring" }}
                          className="text-3xl font-bold text-white mb-1"
                        >
                          {commercialData.overview.convertedProspects}
                        </motion.div>
                        <p className="text-xs text-green-100">
                          Taux de conversion: {commercialData.overview.conversionRate.toFixed(2)}%
                        </p>
                        <div className="mt-2">
                          <Progress
                            value={commercialData.overview.conversionRate}
                            className="h-1 bg-green-400/30"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer"
                  >
                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-white">Contrats</CardTitle>
                        <Icons.fileText className="h-5 w-5 text-white" />
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4, type: "spring" }}
                          className="text-3xl font-bold text-white mb-1"
                        >
                          {commercialData.performance.contracts}
                        </motion.div>
                        <p className="text-xs text-purple-100">
                          Valeur: ${commercialData.performance.contractsTotalValue.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer"
                  >
                    <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-white">Revenu Total</CardTitle>
                        <Icons.dollarSign className="h-5 w-5 text-white" />
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5, type: "spring" }}
                          className="text-3xl font-bold text-white mb-1"
                        >
                          ${commercialData.performance.totalRevenue.toLocaleString()}
                        </motion.div>
                        <p className="text-xs text-orange-100">
                          Moyenne: ${commercialData.performance.averageRevenuePerClient.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>

                {/* Charts Section */}
                <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2">
                  <motion.div variants={itemVariants}>
                    <Card className="shadow-lg border-0">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-600" />
                          Tendances des Prospects
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        {commercialData.trends.monthly.length > 0 ? (
                          <CommercialProspectChart trends={commercialData.trends.monthly} />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">Aucune donnée disponible</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="shadow-lg border-0">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-purple-600" />
                          Répartition par Statut
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        <StatusPieChart
                          data={[
                            {
                              name: "Prospects",
                              value: commercialData.byStatus.prospect,
                              color: "#eab308",
                            },
                            {
                              name: "Clients",
                              value: commercialData.byStatus.client,
                              color: "#10b981",
                            },
                            {
                              name: "Annulés",
                              value: commercialData.byStatus.annuler,
                              color: "#ef4444",
                            },
                          ]}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>

                {/* Performance Metrics */}
                <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-3">
                  <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}>
                    <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          Prospects ce mois
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {commercialData.overview.prospectsThisMonth}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span>Activité mensuelle</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}>
                    <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Activity className="h-4 w-4 text-blue-500" />
                          Prospects (30 jours)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-green-600 mb-2">
                          {commercialData.overview.prospectsLast30Days}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span>Dernier mois</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}>
                    <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Target className="h-4 w-4 text-purple-500" />
                          Prospects (7 jours)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-purple-600 mb-2">
                          {commercialData.overview.prospectsLast7Days}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span>Cette semaine</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>

                {/* Recent Activity */}
                <motion.div variants={itemVariants}>
                  <Card className="shadow-lg border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-orange-600" />
                        Activité récente
                      </CardTitle>
                      <CardDescription>Prospects ajoutés (optionnel: filtrer par période)</CardDescription>
                      <div className="flex flex-wrap items-end gap-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="activity-date-debut">Date début</Label>
                          <Input
                            id="activity-date-debut"
                            type="date"
                            value={activityDateDebut}
                            onChange={(e) => setActivityDateDebut(e.target.value)}
                            className="w-full max-w-[180px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="activity-date-fin">Date fin</Label>
                          <Input
                            id="activity-date-fin"
                            type="date"
                            value={activityDateFin}
                            onChange={(e) => setActivityDateFin(e.target.value)}
                            className="w-full max-w-[180px]"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActivityDateDebut("")
                            setActivityDateFin("")
                          }}
                        >
                          Réinitialiser
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Téléphone</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commercialData.recentActivity.prospects.length > 0 ? (
                            commercialData.recentActivity.prospects.map((prospect) => (
                              <TableRow key={prospect._id}>
                                <TableCell className="font-medium">
                                  {prospect.prenom} {prospect.nom}
                                </TableCell>
                                <TableCell>{prospect.email || "-"}</TableCell>
                                <TableCell>{prospect.telephone || "-"}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      prospect.status === "client"
                                        ? "default"
                                        : prospect.status === "annuler"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {prospect.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date(prospect.createdAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                Aucune activité récente
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Chargement des données du dashboard...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

