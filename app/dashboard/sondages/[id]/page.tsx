"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Icons } from "@/components/icons"
import { motion } from "framer-motion"
import { toast } from "react-hot-toast"
import axios from "axios"
import { SondageDetail, Feedback } from "@/types/sondage"

export default function SondageDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [sondageDetail, setSondageDetail] = useState<SondageDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && id) {
      fetchSondageDetail()
    }
  }, [isMounted, id])

  const fetchSondageDetail = async () => {
    if (!isMounted) return
    
    setIsLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null
      if (!token) {
        toast.error("Token d'authentification manquant")
        return
      }
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sondages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (response.data.success) {
        setSondageDetail(response.data.data)
      } else {
        toast.error("Erreur lors du chargement du sondage")
      }
    } catch (error) {
      console.error("Error fetching sondage detail:", error)
      toast.error("Erreur lors du chargement du sondage")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>
      case "inactive":
        return <Badge className="bg-yellow-100 text-yellow-800">Inactif</Badge>
      case "deleted":
        return <Badge className="bg-red-100 text-red-800">Supprimé</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const formatResponses = (responses: any) => {
    if (typeof responses === 'object' && responses !== null) {
      return JSON.stringify(responses, null, 2)
    }
    return String(responses)
  }

  if (!isMounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!sondageDetail) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Sondage non trouvé</p>
        <Button onClick={() => router.push('/dashboard/sondages')} className="mt-4">
          Retour aux sondages
        </Button>
      </div>
    )
  }

  const { sondage, feedbacks } = sondageDetail

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/sondages')}
            className="flex items-center gap-2"
          >
            <Icons.arrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{sondage.title}</h1>
            <p className="text-gray-600">Détails du sondage et retours collectés</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(sondage.status)}
        </div>
      </div>

      {/* Sondage Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du Sondage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Code</label>
              <p className="font-mono text-sm">{sondage.code}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Statut</label>
              <div className="mt-1">
                {getStatusBadge(sondage.status)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Créé par</label>
              <p>{sondage.createdBy.nom} {sondage.createdBy.prenom}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date de création</label>
              <p>{new Date(sondage.dateCreated).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <label className="text-sm font-medium text-gray-500">Message</label>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <p className="whitespace-pre-wrap">{sondage.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedbacks */}
      <Card>
        <CardHeader>
          <CardTitle>Retours Collectés ({feedbacks.length})</CardTitle>
          <CardDescription>
            Liste de tous les retours reçus pour ce sondage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbacks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Client/Prospect</TableHead>
                  <TableHead>Réponses</TableHead>
                  <TableHead>Commentaire</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Créé par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbacks.map((feedback, index) => (
                  <motion.tr
                    key={feedback._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      {feedback.clientId ? (
                        <div>
                          <p className="font-medium">{feedback.clientId.nom} {feedback.clientId.prenom}</p>
                          <p className="text-sm text-gray-500">Client - {feedback.clientId.code}</p>
                        </div>
                      ) : feedback.prospectId ? (
                        <div>
                          <p className="font-medium">{feedback.prospectId.nom} {feedback.prospectId.prenom}</p>
                          <p className="text-sm text-gray-500">Prospect - {feedback.prospectId.code}</p>
                        </div>
                      ) : (
                        <span className="text-gray-500">Anonyme</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20">
                          {formatResponses(feedback.responses)}
                        </pre>
                      </div>
                    </TableCell>
                    <TableCell>
                      {feedback.commentaire ? (
                        <p className="max-w-xs text-sm">{feedback.commentaire}</p>
                      ) : (
                        <span className="text-gray-400">Aucun commentaire</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(feedback.date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{feedback.createdBy.nom} {feedback.createdBy.prenom}</p>
                        <p className="text-xs text-gray-500">{feedback.createdBy.email}</p>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Icons.clipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun retour collecté pour ce sondage</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icons.clipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total des retours</p>
                <p className="text-2xl font-bold">{feedbacks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Icons.users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Clients</p>
                <p className="text-2xl font-bold">
                  {feedbacks.filter(f => f.clientId).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Icons.userPlus className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Prospects</p>
                <p className="text-2xl font-bold">
                  {feedbacks.filter(f => f.prospectId).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
