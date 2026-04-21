"use client"

import { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Loader2, Mail, MessageSquare, Users, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface RecipientStatus {
  recipientId: string
  recipientType: 'client' | 'prospect' | 'other'
  recipientInfo: {
    nom: string
    prenom: string
    email?: string
    telephone?: string
  }
  status: 'pending' | 'sent' | 'failed'
  emailStatus?: 'pending' | 'sent' | 'failed'
  whatsappStatus?: 'pending' | 'sent' | 'failed'
  emailError?: string
  whatsappError?: string
  sentAt?: string
}

interface SondageProgressModalProps {
  isOpen: boolean
  onClose: () => void
  recipients: RecipientStatus[]
  onStatusUpdate: (updates: RecipientStatus[]) => void
}

export default function SondageProgressModal({ 
  isOpen, 
  onClose, 
  recipients: initialRecipients,
  onStatusUpdate 
}: SondageProgressModalProps) {
  // Use props directly instead of local state to stay in sync
  const recipients = initialRecipients
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    // Calculate completion status based on current recipients
    const allComplete = recipients.every(r => {
      // Check if both email and whatsapp are done (sent or failed) or not applicable
      const emailDone = !r.emailStatus || r.emailStatus === 'sent' || r.emailStatus === 'failed'
      const whatsappDone = !r.whatsappStatus || r.whatsappStatus === 'sent' || r.whatsappStatus === 'failed'
      return emailDone && whatsappDone
    })
    setIsComplete(allComplete)
  }, [isOpen, recipients])

  const stats = {
    total: recipients.length,
    sent: recipients.filter(r => r.status === 'sent').length,
    failed: recipients.filter(r => r.status === 'failed').length,
    pending: recipients.filter(r => r.status === 'pending').length,
    emailSent: recipients.filter(r => r.emailStatus === 'sent').length,
    emailFailed: recipients.filter(r => r.emailStatus === 'failed').length,
    whatsappSent: recipients.filter(r => r.whatsappStatus === 'sent').length,
    whatsappFailed: recipients.filter(r => r.whatsappStatus === 'failed').length,
  }

  const progressPercent = stats.total > 0 
    ? Math.round(((stats.sent + stats.failed) / stats.total) * 100)
    : 0

  const getStatusBadge = (status?: 'pending' | 'sent' | 'failed') => {
    if (!status || status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        En attente
      </Badge>
    }
    if (status === 'sent') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Envoyé
      </Badge>
    }
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      <XCircle className="h-3 w-3 mr-1" />
      Échec
    </Badge>
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}>
      <DialogContent 
        className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0" 
        onPointerDownOutside={(e) => {
          if (!isComplete) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          if (!isComplete) {
            e.preventDefault()
          } else {
            onClose()
          }
        }}
      >
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl flex items-center gap-2">
            {isComplete ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            )}
            Suivi d'envoi du sondage
          </DialogTitle>
          <DialogDescription>
            {isComplete ? "Envoi terminé" : "Envoi en cours..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 px-6 overflow-y-auto flex-1 min-h-0">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progression globale</span>
              <span className="font-semibold text-gray-900">
                {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {stats.sent + stats.failed} / {stats.total} destinataires traités
              </span>
              <span>{stats.pending} en attente</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Réussis</p>
                  <p className="text-2xl font-bold text-green-900">{stats.sent}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Échecs</p>
                  <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Email/WhatsApp</p>
                  <p className="text-lg font-bold text-purple-900">
                    {stats.emailSent + stats.whatsappSent} / {stats.emailFailed + stats.whatsappFailed}
                  </p>
                  <p className="text-xs text-purple-600">✓ / ✗</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Mail className="h-4 w-4 text-purple-600 opacity-50" />
                  <MessageSquare className="h-4 w-4 text-purple-600 opacity-50" />
                </div>
              </div>
            </div>
          </div>

          {/* Recipients List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Liste des destinataires</h3>
            <div className="border rounded-md overflow-auto" style={{ maxHeight: 'calc(90vh - 500px)', minHeight: '200px' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Statut global</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {recipients.map((recipient, index) => (
                      <motion.tr
                        key={recipient.recipientId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b"
                      >
                        <TableCell className="font-medium">
                          {recipient.recipientInfo.prenom} {recipient.recipientInfo.nom}
                          <span className="text-xs text-gray-500 ml-2">
                            ({recipient.recipientType === 'client' ? 'Client' : recipient.recipientType === 'prospect' ? 'Prospect' : 'Autre'})
                          </span>
                        </TableCell>
                        <TableCell>
                          {recipient.recipientInfo.email ? (
                            <div className="space-y-1">
                              {getStatusBadge(recipient.emailStatus)}
                              {recipient.emailError && (
                                <p className="text-xs text-red-600">{recipient.emailError}</p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500">
                              N/A
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {recipient.recipientInfo.telephone ? (
                            <div className="space-y-1">
                              {getStatusBadge(recipient.whatsappStatus)}
                              {recipient.whatsappError && (
                                <p className="text-xs text-red-600">{recipient.whatsappError}</p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500">
                              N/A
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(recipient.status)}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 px-6 pb-6 border-t flex-shrink-0">
          {isComplete ? (
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Fermer
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={onClose}
            >
              Masquer (continuer en arrière-plan)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

