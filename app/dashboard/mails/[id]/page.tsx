"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Icons } from "@/components/icons"
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  User,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Paperclip,
  Eye,
  EyeOff
} from "lucide-react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { devLog } from "@/lib/devLogger"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface MailDetail {
  _id: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  from: string
  replyTo?: string
  subject: string
  text?: string
  html?: string
  messageId?: string
  status: "sent" | "failed" | "pending" | "rejected"
  accepted?: string[]
  rejected?: string[]
  pending?: string[]
  error?: string
  errorDetails?: any
  responseCode?: string
  attachments?: Array<{
    filename: string
    path: string
    contentType: string
    size: number
  }>
  templatePath?: string
  templateVariables?: any
  context?: string
  relatedEntity?: string
  relatedEntityId?: any
  sentBy?: {
    _id: string
    nom: string
    prenom: string
    email: string
  }
  sentAt: string
  attempts: number
  notes?: string
  createdAt: string
  updatedAt: string
  totalRecipients: number
}

export default function MailDetailPage() {
  const router = useRouter()
  const params = useParams()
  const mailId = params.id as string

  const [mail, setMail] = useState<MailDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [showHtml, setShowHtml] = useState(false)

  useEffect(() => {
    if (mailId) {
      fetchMailDetails()
    }
  }, [mailId])

  const fetchMailDetails = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/mails/${mailId}?module=mail`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      devLog.log("Mail details fetched:", response.data)
      setMail(response.data.data || response.data)
    } catch (error) {
      devLog.error("Error fetching mail details:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem("authToken")
        router.push("/auth/login")
        return
      }
      toast.error("Erreur lors du chargement des détails de l'email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async () => {
    setIsRetrying(true)
    const toastId = toast.loading("Nouvelle tentative d'envoi...")
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/mails/${mailId}/retry`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      if (response.data.success) {
        toast.success("Email réexpédié avec succès.", { id: toastId })
        fetchMailDetails() // Refresh details
      } else {
        toast.error(response.data.message || "Échec de la réexpédition.", { id: toastId })
      }
    } catch (error) {
      devLog.error("Error retrying mail:", error)
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : "Échec de la réexpédition de l'email. Veuillez réessayer."
      toast.error(errorMessage, { id: toastId })
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDelete = async () => {
    const toastId = toast.loading("Suppression de l'email...")
    try {
      const token = localStorage.getItem("authToken")
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/mails/${mailId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      toast.success("Email supprimé avec succès.", { id: toastId })
      router.push("/dashboard/mails")
    } catch (error) {
      devLog.error("Error deleting mail:", error)
      toast.error("Échec de la suppression de l'email. Veuillez réessayer.", { id: toastId })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <Icons.spinner className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-muted-foreground">Chargement des détails...</p>
        </div>
      </div>
    )
  }

  if (!mail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Mail className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Email introuvable</h2>
        <p className="text-muted-foreground mb-6">L'email demandé n'existe pas.</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Envoyé
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Échoué
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Rejeté
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden" style={{ 
      contain: 'layout',
      isolation: 'isolate'
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {mail.subject || 'Sans sujet'}
              </h1>
              <p className="text-muted-foreground">
                {mail.sentAt ? format(new Date(mail.sentAt), "dd MMMM yyyy à HH:mm", { locale: fr }) : 'Date inconnue'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {mail.status === 'failed' && (
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying}
                variant="outline"
              >
                {isRetrying ? (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Réessayer
              </Button>
            )}
            <Button 
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Informations de l'Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Statut</p>
                {getStatusBadge(mail.status)}
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-1">De</p>
                <p className="font-medium">{mail.from}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">À</p>
                <div className="space-y-1">
                  {mail.to && mail.to.map((email, index) => (
                    <p key={index} className="font-medium">{email}</p>
                  ))}
                </div>
              </div>

              {mail.cc && mail.cc.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">CC</p>
                  <div className="space-y-1">
                    {mail.cc.map((email, index) => (
                      <p key={index} className="font-medium">{email}</p>
                    ))}
                  </div>
                </div>
              )}

              {mail.bcc && mail.bcc.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">BCC</p>
                  <div className="space-y-1">
                    {mail.bcc.map((email, index) => (
                      <p key={index} className="font-medium">{email}</p>
                    ))}
                  </div>
                </div>
              )}

              {mail.replyTo && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Répondre à</p>
                  <p className="font-medium">{mail.replyTo}</p>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-1">Destinataires totaux</p>
                <p className="font-semibold text-lg">{mail.totalRecipients || mail.to?.length || 0}</p>
              </div>

              {mail.attempts > 1 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tentatives</p>
                  <p className="font-medium">{mail.attempts}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status & Metadata */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Métadonnées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mail.sentAt && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date d'envoi</p>
                  <p className="font-medium">
                    {format(new Date(mail.sentAt), "dd MMMM yyyy à HH:mm:ss", { locale: fr })}
                  </p>
                </div>
              )}

              {mail.messageId && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Message ID</p>
                  <p className="font-mono text-xs break-all">{mail.messageId}</p>
                </div>
              )}

              {mail.responseCode && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Code de réponse</p>
                  <p className="font-medium">{mail.responseCode}</p>
                </div>
              )}

              {mail.context && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Contexte</p>
                  <Badge variant="outline">{mail.context}</Badge>
                </div>
              )}

              {mail.sentBy && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Expédié par</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{mail.sentBy.prenom} {mail.sentBy.nom}</p>
                        <p className="text-sm text-muted-foreground">{mail.sentBy.email}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {mail.relatedEntity && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Entité liée</p>
                  <p className="font-medium">{mail.relatedEntity}</p>
                  {mail.relatedEntityId && typeof mail.relatedEntityId === 'object' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {mail.relatedEntityId.nom || mail.relatedEntityId.prenom || mail.relatedEntityId._id}
                    </p>
                  )}
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Créé le</p>
                  <p className="font-medium">
                    {mail.createdAt ? format(new Date(mail.createdAt), "dd/MM/yyyy", { locale: fr }) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Modifié le</p>
                  <p className="font-medium">
                    {mail.updatedAt ? format(new Date(mail.updatedAt), "dd/MM/yyyy", { locale: fr }) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Delivery Status */}
        {(mail.accepted || mail.rejected || mail.pending) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Statut de livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mail.accepted && mail.accepted.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Acceptés ({mail.accepted.length})
                    </p>
                    <div className="space-y-1">
                      {mail.accepted.map((email, index) => (
                        <p key={index} className="text-sm font-medium text-green-700">{email}</p>
                      ))}
                    </div>
                  </div>
                )}

                {mail.rejected && mail.rejected.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Rejetés ({mail.rejected.length})
                    </p>
                    <div className="space-y-1">
                      {mail.rejected.map((email, index) => (
                        <p key={index} className="text-sm font-medium text-red-700">{email}</p>
                      ))}
                    </div>
                  </div>
                )}

                {mail.pending && mail.pending.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      En attente ({mail.pending.length})
                    </p>
                    <div className="space-y-1">
                      {mail.pending.map((email, index) => (
                        <p key={index} className="text-sm font-medium text-yellow-700">{email}</p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error Information */}
        {mail.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Erreur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-red-700 mb-2">{mail.error}</p>
                {mail.errorDetails && (
                  <pre className="text-xs bg-red-50 p-3 rounded-md overflow-auto">
                    {JSON.stringify(mail.errorDetails, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Email Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="overflow-hidden w-full" style={{ 
          maxWidth: '100%',
          contain: 'layout style'
        }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contenu de l'Email
              </CardTitle>
              {mail.html && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHtml(!showHtml)}
                >
                  {showHtml ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Masquer HTML
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Afficher HTML
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {mail.html && showHtml ? (
              <div 
                className="border rounded-lg bg-gray-50 w-full" 
                style={{ 
                  minWidth: 0,
                  maxWidth: '100%',
                  width: '100%',
                  overflow: 'hidden',
                  position: 'relative',
                  isolation: 'isolate'
                }}
              >
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                          * {
                            box-sizing: border-box !important;
                            max-width: 100% !important;
                          }
                          html, body {
                            margin: 0 !important;
                            padding: 16px !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            overflow-x: hidden !important;
                            font-family: system-ui, -apple-system, sans-serif !important;
                            word-wrap: break-word !important;
                            overflow-wrap: break-word !important;
                          }
                          img {
                            max-width: 100% !important;
                            width: auto !important;
                            height: auto !important;
                            display: block !important;
                          }
                          table {
                            max-width: 100% !important;
                            width: 100% !important;
                            table-layout: auto !important;
                            border-collapse: collapse !important;
                            display: block !important;
                            overflow-x: auto !important;
                          }
                          div, p, span, a, h1, h2, h3, h4, h5, h6, section, article, header, footer, main {
                            max-width: 100% !important;
                            word-wrap: break-word !important;
                            overflow-wrap: break-word !important;
                            overflow-x: hidden !important;
                          }
                        </style>
                      </head>
                      <body>
                        ${mail.html || ''}
                      </body>
                    </html>
                  `}
                  className="w-full border-0"
                  style={{
                    width: '100%',
                    minWidth: 0,
                    maxWidth: '100%',
                    minHeight: '400px',
                    maxHeight: '600px',
                    overflow: 'auto',
                    display: 'block',
                    border: 'none',
                    resize: 'none'
                  }}
                  sandbox="allow-same-origin"
                  title="Email HTML Content"
                  scrolling="auto"
                />
              </div>
            ) : mail.text ? (
              <div className="border rounded-lg p-4 bg-gray-50 overflow-x-auto max-w-full">
                <pre className="whitespace-pre-wrap text-sm font-sans break-words" style={{ overflowWrap: 'anywhere' }}>{mail.text}</pre>
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun contenu disponible</p>
            )}

            {mail.templatePath && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Template utilisé</p>
                <p className="font-mono text-xs">{mail.templatePath}</p>
              </div>
            )}

            {mail.templateVariables && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Variables du template</p>
                <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
                  {JSON.stringify(mail.templateVariables, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Attachments */}
      {mail.attachments && mail.attachments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Pièces jointes ({mail.attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mail.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{attachment.filename}</p>
                        <p className="text-sm text-muted-foreground">
                          {attachment.contentType} • {(attachment.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Notes */}
      {mail.notes && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{mail.notes}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'email sera définitivement supprimé de l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
