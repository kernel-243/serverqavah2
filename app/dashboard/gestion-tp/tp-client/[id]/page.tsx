"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  ArrowLeft, Loader2, ScrollText, User, MapPin, FileText, Calendar, Percent,
  Save, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw, Upload, Eye,
  Download, Pencil, Trash2, Plus, File, FileImage, X, Stamp, Globe,
  FileCheck, FolderOpen, Mic, MicOff, Sparkles,
} from "lucide-react"
import { useRouter, useParams } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TpDocument {
  _id: string
  titre: string
  fichier?: string | null
  originalName?: string | null
  mimeType?: string | null
  type: "jeton_attribution" | "demande_terre" | "contrat_location" | "procuration" | "autre"
  statut:
    | "non_debute"
    | "dossier_depose"
    | "dossier_disponible_frais_non_regle"
    | "dossier_disponible_frais_regle"
    | "rejete"
    | "en_attente"
    | "recu"
    | "valide"
  dateCreer: string
  dateMiseAJour?: string
  dateDepot?: string | null
  dateRetrait?: string | null
  creerPar?: { nom: string; prenom?: string; email?: string } | null
}

interface CiteInfo {
  nom?: string
  ville?: string
  province?: string
  commune?: string
}

interface TpClientDetail {
  tpClient: {
    _id: string
    contratId: {
      _id: string
      code: string
      total: number
      statut: string
      dateDebut: string
      dateFin: string
    }
    clientId: {
      _id: string
      nom: string
      postnom?: string
      prenom?: string
      sexe?: string
      email?: string
      indicatif?: string
      telephone?: string
      code?: string
      nationalite?: string
    }
    terrainId: {
      _id: string
      code: string
      numero?: string
      statut?: string
      cite?: CiteInfo | null
    }
    statut: "en_attente" | "en_cours_demande" | "demande_validee" | "retire" | "reporte" | "annule"
    pourcentagePaiement: number
    dateCreation: string
    dateDelivrance?: string
    notes?: string
    documents: TpDocument[]
    createdAt: string
    updatedAt: string
  }
  percentPaid: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_PRESETS = [
  { value: "contrat_location",  label: "Contrat de location",  type: "contrat_location" as const },
  { value: "procuration",       label: "Procuration",         type: "procuration" as const },
  { value: "autre",             label: "Autre…",              type: "autre" as const },
]

const statutIcons: Record<string, React.ElementType> = {
  en_attente:      AlertCircle,
  en_cours_demande: Clock,
  demande_validee:  CheckCircle2,
  retire:           CheckCircle2,
  reporte:          AlertCircle,
  annule:           XCircle,
}

const statutColors: Record<string, string> = {
  en_attente:      "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  en_cours_demande:"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  demande_validee: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  retire:          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  reporte:         "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  annule:          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const docStatutColors: Record<string, string> = {
  non_debute:                         "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  dossier_depose:                     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  dossier_disponible_frais_non_regle: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  dossier_disponible_frais_regle:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejete:                             "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  en_attente:                         "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  recu:                               "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  valide:                             "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

const docStatutLabels: Record<string, string> = {
  non_debute:                         "Non débuté",
  dossier_depose:                     "Dossier déposé",
  dossier_disponible_frais_non_regle: "Dossier disponible - frais non réglés",
  dossier_disponible_frais_regle:     "Dossier disponible - frais réglés",
  rejete:                             "Rejeté",
  en_attente:                         "Non débuté",
  recu:                               "Dossier déposé",
  valide:                             "Dossier disponible - frais réglés",
}

const statutLabels: Record<string, string> = {
  en_attente:      "En attente",
  en_cours_demande:"En cours de demande",
  demande_validee: "Demande validée",
  retire:          "Retiré",
  reporte:         "Reporté",
  annule:          "Annulé",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clientFullName(c: TpClientDetail["tpClient"]["clientId"]) {
  return [c.nom, c.postnom, c.prenom].filter(Boolean).join(" ")
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtDateLong(d?: string | null) {
  if (!d) return ""
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

function toInputDate(d?: string | null) {
  if (!d) return ""
  try { return new Date(d).toISOString().slice(0, 10) } catch { return "" }
}

function normalizeDocStatus(statut?: string | null): string {
  switch (statut) {
    case "en_attente":
      return "non_debute"
    case "recu":
      return "dossier_depose"
    case "valide":
      return "dossier_disponible_frais_regle"
    default:
      return statut || "non_debute"
  }
}

function getDenominationFromSexe(sexe?: string | null): string {
  const normalized = (sexe || "").toUpperCase().trim()
  if (normalized === "M") return "Monsieur"
  if (normalized === "F") return "Madame"
  return "Monsieur/Madame"
}

function getDocStatusNotification({
  statut,
  fullName,
  sexe,
  contractCode,
  dateDepot,
}: {
  statut: string
  fullName: string
  sexe?: string
  contractCode: string
  dateDepot?: string
}): { subject: string; text: string; html: string } {
  const denomination = getDenominationFromSexe(sexe)
  const safeName = fullName || "Client"
  const greetingName = `${denomination} ${safeName}`.trim()
  const safeCode = contractCode || "N/A"
  const safeDateDepot = dateDepot || "—"
  const portalUrl = "https://client.qavahgroup.com/"
  const downloadButton = `
    <div style="margin:20px 0;">
      <a href="${portalUrl}" style="display:inline-block;background:#896137;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-family:Arial,Helvetica,sans-serif;">
        Accéder à mon espace client
      </a>
    </div>
  `

  if (statut === "dossier_depose") {
    return {
      subject: `Confirmation de dépôt de votre dossier TP - Contrat ${safeCode}`,
      text: `Bonjour ${greetingName},

Nous espérons que vous vous portez bien.

Nous avons le plaisir de vous confirmer que la demande relative à l'obtention de votre titre de propriété a été officiellement déposée auprès des services compétents des titres immobiliers en date du ${safeDateDepot}.

A compter de cette date, le délai de traitement est généralement compris entre 60 et 90 jours. Celui-ci demeure toutefois indicatif et peut évoluer, à la hausse comme à la baisse, en fonction des délais administratifs propres au cadastre et aux titres immobiliers.

Nous tenons à vous rassurer quant au suivi rigoureux de votre dossier. Dans l'éventualité où une évolution nécessiterait votre attention ou une action de votre part, nous ne manquerons pas de revenir vers vous dans les meilleurs délais.

A défaut de retour de notre part dans un délai d'environ trois mois, nous vous invitons à considérer que votre dossier suit son cours normal.

Nous restons pleinement disponibles pour toute information complémentaire et vous remercions pour votre confiance.

Nous vous souhaitons une excellente journée.

Bien cordialement,
L'équipe Qavah Group`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.65;color:#1f2937;">
          <p>Bonjour ${greetingName},</p>
          <p>Nous espérons que vous vous portez bien.</p>
          <p>Nous avons le plaisir de vous confirmer que la demande relative à l'obtention de votre titre de propriété a été officiellement déposée auprès des services compétents des titres immobiliers en date du <strong>${safeDateDepot}</strong>.</p>
          <p>A compter de cette date, le délai de traitement est généralement compris entre <strong>60 et 90 jours</strong>. Celui-ci demeure toutefois indicatif et peut évoluer, à la hausse comme à la baisse, en fonction des délais administratifs propres au cadastre et aux titres immobiliers.</p>
          <p>Nous tenons à vous rassurer quant au suivi rigoureux de votre dossier. Dans l'éventualité où une évolution nécessiterait votre attention ou une action de votre part, nous ne manquerons pas de revenir vers vous dans les meilleurs délais.</p>
          <p>A défaut de retour de notre part dans un délai d'environ trois mois, nous vous invitons à considérer que votre dossier suit son cours normal.</p>
          <p>Nous restons pleinement disponibles pour toute information complémentaire et vous remercions pour votre confiance.</p>
          <p>Nous vous souhaitons une excellente journée.</p>
          <p>Bien cordialement,<br/>L'équipe Qavah Group</p>
        </div>
      `,
    }
  }

  if (statut === "dossier_disponible_frais_regle") {
    return {
      subject: `Votre titre de propriété est disponible - Contrat ${safeCode}`,
      text: `Bonjour ${greetingName},

Nous espérons que ce message vous trouve en pleine forme.

Nous avons une excellente nouvelle ! 🎉
Votre titre de propriété est désormais disponible pour votre contrat n° ${safeCode}.

TÉLÉCHARGEMENT EN LIGNE
Vous pouvez dès maintenant consulter et télécharger votre document depuis votre espace client :
${portalUrl}
Code personnel : ${safeCode}

RÉCUPÉRATION DE L'ORIGINAL
En plus de la version numérique, vous devez également récupérer l'original physique de votre titre de propriété.

1. Retrait en bureau
Passez directement dans nos locaux à votre convenance. Merci de nous contacter au préalable pour planifier votre visite :
0981 444 440

2. Envoi par courrier
Nous pouvons vous faire parvenir votre document par la poste. Pour cela, merci de nous communiquer votre adresse postale complète et exacte (numéro, rue, quartier, ville, pays) - toute erreur pouvant entraîner un problème de livraison.

3. Envoi d'un mandataire
Si vous ne pouvez pas vous déplacer, vous pouvez mandater une personne de confiance pour retirer le document à votre place. Dans ce cas, merci de nous communiquer à l'avance ses nom et prénom complets.
Cette personne devra obligatoirement se présenter avec :
- Une procuration signée de votre main
- Sa pièce d'identité valide

Merci de nous indiquer l'option qui vous convient en nous écrivant ou en nous appelant au 0981 444 440.

Nous vous remercions pour la confiance que vous accordez à Qavah Group et restons à votre entière disposition.

Bien cordialement,
L'équipe Qavah Group`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.65;color:#1f2937;">
          <p>Bonjour ${greetingName},</p>
          <p>Nous espérons que ce message vous trouve en pleine forme.</p>
          <p>Nous avons une excellente nouvelle ! 🎉</p>
          <p>Votre titre de propriété est désormais disponible pour votre contrat n° <strong>${safeCode}</strong>.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;" />
          <p><strong>📲 TÉLÉCHARGEMENT EN LIGNE</strong></p>
          <p>Vous pouvez dès maintenant consulter et télécharger votre document depuis votre espace client :</p>
          ${downloadButton}
          <p><strong>🔑 Code personnel :</strong> ${safeCode}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;" />
          <p><strong>📄 RÉCUPÉRATION DE L'ORIGINAL</strong></p>
          <p>En plus de la version numérique, vous devez également récupérer l'original physique de votre titre de propriété.</p>
          <ol style="padding-left:20px;">
            <li>
              <strong>🏢 Retrait en bureau</strong><br/>
              Passez directement dans nos locaux à votre convenance. Merci de nous contacter au préalable pour planifier votre visite : <strong>0981 444 440</strong>
            </li>
            <li style="margin-top:10px;">
              <strong>📬 Envoi par courrier</strong><br/>
              Nous pouvons vous faire parvenir votre document par la poste. Pour cela, merci de nous communiquer votre adresse postale complète et exacte (numéro, rue, quartier, ville, pays) - toute erreur pouvant entraîner un problème de livraison.
            </li>
            <li style="margin-top:10px;">
              <strong>👤 Envoi d'un mandataire</strong><br/>
              Si vous ne pouvez pas vous déplacer, vous pouvez mandater une personne de confiance pour retirer le document à votre place. Dans ce cas, merci de nous communiquer à l'avance ses nom et prénom complets.<br/>
              Cette personne devra obligatoirement se présenter avec :
              <ul style="margin:8px 0 0 18px; padding:0;">
                <li>Une procuration signée de votre main</li>
                <li>Sa pièce d'identité valide</li>
              </ul>
            </li>
          </ol>
          <p>Merci de nous indiquer l'option qui vous convient en nous écrivant ou en nous appelant au <strong>0981 444 440</strong>.</p>
          <p>Nous vous remercions pour la confiance que vous accordez à Qavah Group et restons à votre entière disposition.</p>
          <p>Bien cordialement,<br/>L'équipe Qavah Group</p>
        </div>
      `,
    }
  }

  if (statut === "dossier_disponible_frais_non_regle") {
    return {
      subject: `Votre titre de propriété est disponible (frais à régulariser) - Contrat ${safeCode}`,
      text: `Bonjour ${greetingName},

Nous espérons que ce message vous trouve en pleine forme.

Nous avons une excellente nouvelle ! 🎉
Votre titre de propriété est désormais disponible pour votre contrat n° ${safeCode}.

TÉLÉCHARGEMENT EN LIGNE
Vous pouvez dès maintenant consulter et télécharger votre document depuis votre espace client :
${portalUrl}
Code personnel : ${safeCode}

RÉCUPÉRATION DE L'ORIGINAL
En plus de la version numérique, vous devez également récupérer l'original physique de votre titre de propriété.

Condition préalable à toute remise du document :
Le retrait de l'original est conditionné au solde intégral des frais cadastraux liés à votre dossier. Nous vous invitons à vous rapprocher de nous pour connaître le montant exact et les modalités de règlement avant de planifier votre retrait.

Trois modalités de récupération sont disponibles :

1. Retrait en bureau
Passez directement dans nos locaux à votre convenance, une fois les frais cadastraux soldés. Merci de nous contacter au préalable pour planifier votre visite :
0981 444 440

2. Envoi par courrier
Nous pouvons vous faire parvenir votre document par la poste, dès règlement des frais cadastraux. Pour cela, merci de nous communiquer votre adresse postale complète et exacte (numéro, rue, quartier, ville, pays) - toute erreur pouvant entraîner un problème de livraison.

3. Envoi d'un mandataire
Si vous ne pouvez pas vous déplacer, vous pouvez mandater une personne de confiance pour retirer le document à votre place, une fois les frais réglés. Dans ce cas, merci de nous communiquer à l'avance ses nom et prénom complets.
Cette personne devra obligatoirement se présenter avec :
- Une procuration signée de votre main
- Sa pièce d'identité valide

Merci de nous indiquer l'option qui vous convient en nous écrivant ou en nous appelant au 0981 444 440 - nous traiterons votre demande dans les plus brefs délais.

Nous vous remercions pour la confiance que vous accordez à Qavah Group et restons à votre entière disposition.

Bien cordialement,
L'équipe Qavah Group
0981 444 440`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.65;color:#1f2937;">
          <p>Bonjour ${greetingName},</p>
          <p>Nous espérons que ce message vous trouve en pleine forme.</p>
          <p>Nous avons une excellente nouvelle ! 🎉</p>
          <p>Votre titre de propriété est désormais disponible pour votre contrat n° <strong>${safeCode}</strong>.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;" />
          <p><strong>📲 TÉLÉCHARGEMENT EN LIGNE</strong></p>
          <p>Vous pouvez dès maintenant consulter et télécharger votre document depuis votre espace client :</p>
          ${downloadButton}
          <p><strong>🔑 Code personnel :</strong> ${safeCode}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;" />
          <p><strong>📄 RÉCUPÉRATION DE L'ORIGINAL</strong></p>
          <p>En plus de la version numérique, vous devez également récupérer l'original physique de votre titre de propriété.</p>
          <p><strong>⚠️ Condition préalable à toute remise du document</strong><br/>Le retrait de l'original est conditionné au solde intégral des frais cadastraux liés à votre dossier. Nous vous invitons à vous rapprocher de nous pour connaître le montant exact et les modalités de règlement avant de planifier votre retrait.</p>
          <ol style="padding-left:20px;">
            <li>
              <strong>🏢 Retrait en bureau</strong><br/>
              Passez directement dans nos locaux à votre convenance, une fois les frais cadastraux soldés. Merci de nous contacter au préalable pour planifier votre visite : <strong>0981 444 440</strong>
            </li>
            <li style="margin-top:10px;">
              <strong>📬 Envoi par courrier</strong><br/>
              Nous pouvons vous faire parvenir votre document par la poste, dès règlement des frais cadastraux. Pour cela, merci de nous communiquer votre adresse postale complète et exacte (numéro, rue, quartier, ville, pays) - toute erreur pouvant entraîner un problème de livraison.
            </li>
            <li style="margin-top:10px;">
              <strong>👤 Envoi d'un mandataire</strong><br/>
              Si vous ne pouvez pas vous déplacer, vous pouvez mandater une personne de confiance pour retirer le document à votre place, une fois les frais réglés. Dans ce cas, merci de nous communiquer à l'avance ses nom et prénom complets.<br/>
              Cette personne devra obligatoirement se présenter avec :
              <ul style="margin:8px 0 0 18px; padding:0;">
                <li>Une procuration signée de votre main</li>
                <li>Sa pièce d'identité valide</li>
              </ul>
            </li>
          </ol>
          <p>Merci de nous indiquer l'option qui vous convient en nous écrivant ou en nous appelant au <strong>0981 444 440</strong> - nous traiterons votre demande dans les plus brefs délais.</p>
          <p>Nous vous remercions pour la confiance que vous accordez à Qavah Group et restons à votre entière disposition.</p>
          <p>Bien cordialement,<br/>L'équipe Qavah Group<br/>📞 0981 444 440</p>
        </div>
      `,
    }
  }

  if (statut === "rejete") {
    return {
      subject: `Mise à jour de votre dossier TP - Contrat ${safeCode}`,
      text: `Bonjour ${greetingName},

Nous vous informons qu'une irrégularité a été constatée dans votre dossier, ce qui a entraîné un rejet administratif temporaire.

Notre équipe vous contactera rapidement pour vous indiquer les pièces ou actions nécessaires afin de relancer le traitement dans les meilleures conditions.

Pour toute précision, vous pouvez nous joindre au 0981 444 440.

Bien cordialement,
L'équipe Qavah Group`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.65;color:#1f2937;">
          <p>Bonjour ${greetingName},</p>
          <p>Nous vous informons qu'une irrégularité a été constatée dans votre dossier, ce qui a entraîné un rejet administratif temporaire.</p>
          <p>Notre équipe vous contactera rapidement pour vous indiquer les pièces ou actions nécessaires afin de relancer le traitement dans les meilleures conditions.</p>
          <p>Pour toute précision, vous pouvez nous joindre au <strong>0981 444 440</strong>.</p>
          <p>Bien cordialement,<br/>L'équipe Qavah Group</p>
        </div>
      `,
    }
  }

  return {
    subject: `Mise à jour de votre dossier TP - Contrat ${safeCode}`,
    text: `Bonjour ${greetingName},

Nous vous confirmons la prise en charge de votre document pour le contrat n° ${safeCode}.

Votre dossier est actuellement au statut : ${docStatutLabels[statut] || "Non débuté"}.

Nous restons à votre disposition pour toute information complémentaire.

Bien cordialement,
L'équipe Qavah Group`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.65;color:#1f2937;">
        <p>Bonjour ${greetingName},</p>
        <p>Nous vous confirmons la prise en charge de votre document pour le contrat n° <strong>${safeCode}</strong>.</p>
        <p>Votre dossier est actuellement au statut : <strong>${docStatutLabels[statut] || "Non débuté"}</strong>.</p>
        <p>Nous restons à votre disposition pour toute information complémentaire.</p>
        <p>Bien cordialement,<br/>L'équipe Qavah Group</p>
      </div>
    `,
  }
}

function fmtAmount(n?: number) {
  if (!n) return "—"
  return n.toLocaleString("fr-FR") + " USD"
}

function isKinshasa(cite?: CiteInfo | null): boolean {
  if (!cite) return false
  const text = `${cite.ville || ""} ${cite.province || ""} ${cite.nom || ""}`.toLowerCase()
  return text.includes("kinshasa") || text.includes("kin")
}

function isForeignClient(indicatif?: string, nationalite?: string): boolean {
  if (nationalite) {
    const n = nationalite.toLowerCase()
    if (n === "congolaise" || n === "drc" || n === "rdc" || n === "congolais") return false
    return true
  }
  if (!indicatif) return false
  const clean = indicatif.replace(/[\s+]/g, "")
  return !clean.startsWith("243")
}

function generateConfirmWord(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return File
  if (mimeType.startsWith("image/")) return FileImage
  if (mimeType === "application/pdf") return FileText
  return File
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">{value}</span>
    </div>
  )
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({
  open, onClose, doc, tpId,
}: { open: boolean; onClose: () => void; doc: TpDocument | null; tpId: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !doc?.fichier) { setBlobUrl(null); return }
    let url: string | null = null
    setLoading(true)
    setBlobUrl(null)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tp-clients/${tpId}/documents/${doc._id}/preview`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    })
      .then(r => { if (!r.ok) throw new Error(); return r.blob() })
      .then(blob => { url = URL.createObjectURL(blob); setBlobUrl(url) })
      .catch(() => toast.error("Impossible de charger la prévisualisation"))
      .finally(() => setLoading(false))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [open, doc, tpId])

  if (!doc) return null
  const isImage = doc.mimeType?.startsWith("image/")
  const isPdf = doc.mimeType === "application/pdf"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0 dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader className="px-5 py-4 border-b dark:border-gray-700 shrink-0">
          <DialogTitle className="text-base dark:text-gray-100 pr-8 truncate">{doc.titre}</DialogTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{doc.originalName || "—"}</p>
        </DialogHeader>
        <div className="flex-1 overflow-hidden relative bg-gray-100 dark:bg-gray-800">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#896137]" />
            </div>
          )}
          {!loading && blobUrl && isImage && (
            <img src={blobUrl} alt={doc.titre} className="w-full h-full object-contain" />
          )}
          {!loading && blobUrl && isPdf && (
            <iframe src={blobUrl} className="w-full h-full border-0" title={doc.titre} />
          )}
          {!loading && blobUrl && !isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <File className="h-12 w-12" />
              <p className="text-sm">Prévisualisation non disponible pour ce type de fichier</p>
            </div>
          )}
          {!loading && !doc.fichier && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <FolderOpen className="h-12 w-12" />
              <p className="text-sm">Aucun fichier uploadé</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Doc Dialog ───────────────────────────────────────────────────────────────

interface DocFormState {
  titre: string
  statut: string
  file: File | null
  files: File[]
  dateDepot: string
  dateRetrait: string
  notifyClient: boolean
}

function DocDialog({
  open, onClose, onSave, saving, initialType, editDoc, lockType,
}: {
  open: boolean
  onClose: () => void
  onSave: (form: DocFormState) => void
  saving: boolean
  initialType?: string
  editDoc?: TpDocument | null
  lockType?: boolean
}) {
  const [preset, setPreset] = useState("contrat_location")
  const [customTitle, setCustomTitle] = useState("")
  const [statut, setStatut] = useState("non_debute")
  const [files, setFiles] = useState<File[]>([])
  const [dateDepot, setDateDepot] = useState("")
  const [dateRetrait, setDateRetrait] = useState("")
  const [notifyClient, setNotifyClient] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const isEditMode = !!editDoc

  useEffect(() => {
    if (!open) return
    if (editDoc) {
      setPreset(editDoc.type || "autre")
      setCustomTitle(editDoc.type === "autre" ? editDoc.titre : "")
      setStatut(normalizeDocStatus(editDoc.statut || "non_debute"))
      setDateDepot(toInputDate(editDoc.dateDepot))
      setDateRetrait(toInputDate(editDoc.dateRetrait))
    } else {
      setPreset(initialType || "contrat_location")
      setCustomTitle("")
      setStatut("non_debute")
      setDateDepot("")
      setDateRetrait("")
    }
    setFiles([])
    setNotifyClient(false)
  }, [open, editDoc, initialType])

  const isAutre = preset === "autre"
  const resolvedTitle = isAutre
    ? customTitle.trim()
    : DOC_PRESETS.find(p => p.value === preset)?.label || ""

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || [])
    if (isEditMode) {
      setFiles(picked.slice(0, 1))
    } else {
      setFiles(prev => {
        const existing = prev.map(f => f.name)
        const newOnes = picked.filter(f => !existing.includes(f.name))
        return [...prev, ...newOnes]
      })
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!resolvedTitle && (isEditMode || files.length <= 1)) {
      toast.error(isAutre ? "Saisissez un titre" : "Sélectionnez un type")
      return
    }
    onSave({
      titre: resolvedTitle,
      statut,
      file: files[0] || null,
      files,
      dateDepot,
      dateRetrait,
      notifyClient,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100">
            {editDoc ? "Modifier le document" : "Ajouter des documents"}
          </DialogTitle>
          {!editDoc && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Vous pouvez sélectionner un ou plusieurs fichiers à la fois.
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Type / Titre — en mode ajout multi, s'applique à tous les fichiers */}
          <div className="space-y-2">
            <Label className="text-sm dark:text-gray-300">
              Type de document <span className="text-red-500">*</span>
              {!editDoc && files.length > 1 && (
                <span className="ml-2 text-xs text-gray-400 font-normal">(appliqué à tous les fichiers)</span>
              )}
            </Label>
            <Select value={preset} onValueChange={setPreset} disabled={lockType}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_PRESETS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAutre && (
              <Input
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder={files.length > 1 ? "Titre commun (ou laissez vide pour utiliser le nom de fichier)" : "Titre du document…"}
                className="mt-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                autoFocus
              />
            )}
          </div>

          {/* Statut */}
          <div className="space-y-2">
            <Label className="text-sm dark:text-gray-300">Statut</Label>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non_debute">Non débuté</SelectItem>
                <SelectItem value="dossier_depose">Dossier déposé</SelectItem>
                <SelectItem value="dossier_disponible_frais_non_regle">Dossier disponible - frais non réglés</SelectItem>
                <SelectItem value="dossier_disponible_frais_regle">Dossier disponible - frais réglés</SelectItem>
                <SelectItem value="rejete">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs dark:text-gray-300">Date de dépôt</Label>
              <input
                type="date"
                value={dateDepot}
                onChange={e => setDateDepot(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs dark:text-gray-300">Date de retrait</Label>
              <input
                type="date"
                value={dateRetrait}
                onChange={e => setDateRetrait(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Files */}
          <div className="space-y-2">
            <Label className="text-sm dark:text-gray-300">
              {editDoc ? (
                <>Fichier <span className="text-gray-400 font-normal text-xs">(laisser vide pour conserver l&apos;existant)</span></>
              ) : (
                <>Fichiers <span className="text-red-500">*</span></>
              )}
            </Label>

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:border-[#896137]/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {files.length === 0 ? (
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <Upload className="h-5 w-5" />
                  <span className="text-xs font-medium">
                    {editDoc ? "Cliquer pour remplacer le fichier" : "Cliquer pour sélectionner"}
                  </span>
                  <span className="text-xs">
                    {editDoc ? "PDF, image, Word… (max 20 Mo)" : "Un ou plusieurs fichiers — PDF, image, Word… (max 20 Mo chacun)"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center text-[#896137]">
                  <Plus className="h-4 w-4" />
                  <span className="text-xs font-medium">Ajouter d&apos;autres fichiers</span>
                </div>
              )}
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {files.map((f, i) => (
                  <div key={i} className="flex min-w-0 items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <FileCheck className="h-4 w-4 text-[#896137] shrink-0" />
                    <span
                      className="min-w-0 flex-1 truncate text-xs text-gray-700 dark:text-gray-200"
                      title={f.name}
                    >
                      {f.name}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeFile(i) }}
                      className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="*/*"
              multiple={!isEditMode}
              onChange={handleFileChange}
            />
          </div>

          {/* Notify client */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
            <input
              id="notifyClientCheck"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-[#896137] focus:ring-[#896137] accent-[#896137] cursor-pointer"
              checked={notifyClient}
              onChange={e => setNotifyClient(e.target.checked)}
            />
            <label htmlFor="notifyClientCheck" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              Notifier le client par email
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-gray-300">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-[#896137] hover:bg-[#7a5530] text-white gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {editDoc
              ? "Enregistrer"
              : files.length > 1
                ? `Ajouter ${files.length} documents`
                : "Ajouter"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteDocDialog({
  open, onClose, onConfirm, deleting, docTitre,
}: { open: boolean; onClose: () => void; onConfirm: () => void; deleting: boolean; docTitre: string }) {
  const [confirmWord] = useState(generateConfirmWord)
  const [input, setInput] = useState("")
  useEffect(() => { if (open) setInput("") }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Supprimer le document
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Cette action est irréversible. Le fichier sera définitivement supprimé.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Document : <span className="font-semibold">{docTitre}</span>
          </p>
          <div className="space-y-2">
            <Label className="text-sm dark:text-gray-300">
              Tapez{" "}
              <span className="font-mono font-bold text-red-600 dark:text-red-400 select-all bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                {confirmWord}
              </span>{" "}
              pour confirmer
            </Label>
            <Input value={input} onChange={e => setInput(e.target.value)}
              placeholder="Saisissez le mot…"
              className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-gray-300">Annuler</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={input !== confirmWord || deleting} className="gap-2">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocumentCard({ doc, tpId, onPreview, onEdit, onDelete, onDownload }: {
  doc: TpDocument; tpId: string
  onPreview: (d: TpDocument) => void; onEdit: (d: TpDocument) => void
  onDelete: (d: TpDocument) => void; onDownload: (d: TpDocument) => void
}) {
  const FileIcon = getFileIcon(doc.mimeType)
  const normalizedStatut = normalizeDocStatus(doc.statut)
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#896137]/30 transition-colors">
      <div className="h-9 w-9 rounded-lg bg-[#896137]/10 flex items-center justify-center shrink-0">
        <FileIcon className="h-4 w-4 text-[#896137]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.titre}</p>
          <Badge className={`text-xs px-1.5 py-0 ${docStatutColors[normalizedStatut] || docStatutColors.non_debute}`}>
            {docStatutLabels[normalizedStatut] || docStatutLabels.non_debute}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {doc.originalName && (
            <span className="text-xs text-gray-400 truncate max-w-[160px]">{doc.originalName}</span>
          )}
          {!doc.fichier && (
            <span className="text-xs text-orange-500 dark:text-orange-400">Aucun fichier</span>
          )}
          {doc.dateDepot && (
            <span className="text-xs text-gray-400">Dépôt : {fmtDate(doc.dateDepot)}</span>
          )}
          {doc.dateRetrait && (
            <span className="text-xs text-gray-400">Retrait : {fmtDate(doc.dateRetrait)}</span>
          )}
          {!doc.dateDepot && !doc.dateRetrait && (
            <span className="text-xs text-gray-400">{fmtDate(doc.dateCreer)}</span>
          )}
          {doc.creerPar && (
            <span className="text-xs text-gray-400">
              par {doc.creerPar.nom}{doc.creerPar.prenom ? ` ${doc.creerPar.prenom}` : ""}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {doc.fichier && (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-[#896137]"
              title="Prévisualiser" onClick={() => onPreview(doc)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600"
              title="Télécharger" onClick={() => onDownload(doc)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-amber-600"
          title="Modifier" onClick={() => onEdit(doc)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600"
          title="Supprimer" onClick={() => onDelete(doc)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Document Section ─────────────────────────────────────────────────────────

function DocumentSection({
  title, icon: Icon, description, docType, docs, tpId,
  onPreview, onEdit, onDelete, onDownload, onAdd,
  allowMultiple = false, lockTypeInDialog = false,
}: {
  title: string; icon: React.ElementType; description?: string
  docType: string; docs: TpDocument[]; tpId: string
  onPreview: (d: TpDocument) => void; onEdit: (d: TpDocument) => void
  onDelete: (d: TpDocument) => void; onDownload: (d: TpDocument) => void
  onAdd: (type: string, lockType: boolean) => void
  allowMultiple?: boolean; lockTypeInDialog?: boolean
}) {
  const sectionDocs = docs.filter((d) => {
    if (docType === "contrat_location") {
      // Backward compatibility: old records split across two former types.
      return d.type === "contrat_location" || d.type === "jeton_attribution" || d.type === "demande_terre"
    }
    return d.type === docType
  })
  const canAdd = allowMultiple || sectionDocs.length === 0
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 text-[#896137] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
        </div>
        {canAdd && (
          <Button variant="outline" size="sm"
            className="h-7 px-2 text-xs gap-1 shrink-0 border-[#896137]/30 text-[#896137] hover:bg-[#896137]/5"
            onClick={() => onAdd(docType, lockTypeInDialog)}>
            <Plus className="h-3 w-3" />
            {sectionDocs.length === 0 ? "Ajouter" : "Ajouter un autre"}
          </Button>
        )}
      </div>
      {sectionDocs.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-xs">
          <Upload className="h-3.5 w-3.5" /> Aucun document — cliquez sur Ajouter
        </div>
      ) : (
        <div className="space-y-2">
          {sectionDocs.map(doc => (
            <DocumentCard key={doc._id} doc={doc} tpId={tpId}
              onPreview={onPreview} onEdit={onEdit} onDelete={onDelete} onDownload={onDownload} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TpClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [data, setData] = useState<TpClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statut, setStatut] = useState("")
  const [dateDelivrance, setDateDelivrance] = useState("")
  const [notes, setNotes] = useState("")

  // AI + Voice
  const [generatingAI, setGeneratingAI] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<unknown>(null)

  // Document dialogs
  const [previewDoc, setPreviewDoc] = useState<TpDocument | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [docDialogOpen, setDocDialogOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<TpDocument | null>(null)
  const [pendingDocType, setPendingDocType] = useState("autre")
  const [lockDocType, setLockDocType] = useState(false)
  const [savingDoc, setSavingDoc] = useState(false)
  const [deleteDocOpen, setDeleteDocOpen] = useState(false)
  const [deletingDoc, setDeletingDoc] = useState<TpDocument | null>(null)
  const [deletingDocBusy, setDeletingDocBusy] = useState(false)

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
  })

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/tp-clients/${id}`, authHeaders()
      )
      setData(res)
      setStatut(res.tpClient.statut)
      setDateDelivrance(toInputDate(res.tpClient.dateDelivrance))
      setNotes(res.tpClient.notes || "")
    } catch {
      toast.error("Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  // ── AI notes ────────────────────────────────────────────────────────────────
  const handleGenerateAI = async () => {
    setGeneratingAI(true)
    try {
      const { data: res } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/tp-clients/${id}/generate-notes`,
        {}, authHeaders()
      )
      setNotes(res.notes || "")
      toast.success("Note générée par l'IA")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Erreur lors de la génération IA")
    } finally {
      setGeneratingAI(false)
    }
  }

  // ── Voice ────────────────────────────────────────────────────────────────────
  const toggleVoice = () => {
    if (isListening) {
      (recognitionRef.current as { stop: () => void } | null)?.stop()
      setIsListening(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error("Reconnaissance vocale non supportée sur ce navigateur"); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = new SR() as any
    r.lang = "fr-FR"
    r.continuous = true
    r.interimResults = false
    r.onresult = (e: { results: { length: number; [k: number]: { [k: number]: { transcript: string } } } }) => {
      const t = e.results[e.results.length - 1][0].transcript
      setNotes(prev => prev + (prev && !prev.endsWith(" ") ? " " : "") + t)
    }
    r.onend = () => setIsListening(false)
    r.onerror = () => { toast.error("Erreur microphone"); setIsListening(false) }
    r.start()
    recognitionRef.current = r
    setIsListening(true)
  }

  // ── Save dossier ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/tp-clients/${id}/statut`,
        { statut, dateDelivrance: dateDelivrance || undefined, notes },
        authHeaders()
      )
      toast.success("Titre de propriété mis à jour")
      await fetchDetail()
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  // ── Document actions ────────────────────────────────────────────────────────
  const openAddDoc = (type: string, lock: boolean) => {
    setEditingDoc(null)
    setPendingDocType(type)
    setLockDocType(lock)
    setDocDialogOpen(true)
  }

  const openEditDoc = (doc: TpDocument) => {
    setEditingDoc(doc)
    setPendingDocType(doc.type)
    setLockDocType(false)
    setDocDialogOpen(true)
  }

  const handleDocSave = async (form: DocFormState) => {
    const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB
    const oversized = [...form.files, ...(form.file ? [form.file] : [])].find(f => f.size > MAX_FILE_SIZE)
    if (oversized) {
      toast.error(`Le fichier "${oversized.name}" dépasse la taille maximale autorisée (20 Mo).`)
      return
    }

    setSavingDoc(true)
    try {
      const normalizedStatut = normalizeDocStatus(form.statut)
      const token = localStorage.getItem("authToken")

      // ── Bulk add (multiple files, add mode only) ──────────────────────────
      if (!editingDoc && form.files.length > 1) {
        const fd = new FormData()
        fd.append("type", pendingDocType)
        fd.append("statut", normalizedStatut)
        if (form.dateDepot) fd.append("dateDepot", form.dateDepot)
        if (form.dateRetrait) fd.append("dateRetrait", form.dateRetrait)
        // titre commun optionnel (utilisé si preset != "autre" ou titre saisi)
        const commonTitre = form.titre
        // titres par fichier : titre commun si défini, sinon nom de fichier sans extension
        const titres = form.files.map((f, i) =>
          commonTitre || f.name.replace(/\.[^/.]+$/, "") || `Document ${i + 1}`
        )
        fd.append("titres", JSON.stringify(titres))
        form.files.forEach(f => fd.append("fichiers", f))

        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/tp-clients/${id}/documents/bulk`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }
        )
        toast.success(`${form.files.length} documents ajoutés`)
        setDocDialogOpen(false)
        await fetchDetail()
        return
      }

      // ── Single add / edit ─────────────────────────────────────────────────
      const fd = new FormData()
      fd.append("titre", form.titre)
      fd.append("statut", normalizedStatut)
      if (!editingDoc) fd.append("type", pendingDocType)
      if (form.file) fd.append("fichier", form.file)
      if (form.dateDepot) fd.append("dateDepot", form.dateDepot)
      if (form.dateRetrait) fd.append("dateRetrait", form.dateRetrait)

      if (form.notifyClient && data?.tpClient?.clientId?.email) {
        const fullName = clientFullName(data.tpClient.clientId)
        const contractCode = data.tpClient.contratId?.code || ""
        const depotDateText = fmtDateLong(form.dateDepot) || fmtDateLong(editingDoc?.dateDepot) || fmtDateLong(new Date().toISOString())
        const notification = getDocStatusNotification({
          statut: normalizedStatut,
          fullName,
          sexe: data.tpClient.clientId?.sexe,
          contractCode,
          dateDepot: depotDateText,
        })

        fd.append("notifyClient", "true")
        fd.append("notificationEmail", data.tpClient.clientId.email)
        fd.append("notificationSubject", notification.subject)
        fd.append("notificationMessage", notification.text)
        fd.append("notificationText", notification.text)
        fd.append("notificationHtml", notification.html)
        fd.append("notificationStatus", normalizedStatut)
      }

      const url = editingDoc
        ? `${process.env.NEXT_PUBLIC_API_URL}/tp-clients/${id}/documents/${editingDoc._id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/tp-clients/${id}/documents`

      const res = await fetch(url, {
        method: editingDoc ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })

      if (res.status === 413) {
        toast.error("Le fichier est trop volumineux pour le serveur (max 20 Mo).")
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body?.error || "Erreur lors de l'enregistrement du document")
        return
      }

      toast.success(editingDoc ? "Document mis à jour" : "Document ajouté")
      if (form.notifyClient && data?.tpClient?.clientId?.email) {
        toast.success("Notification envoyée au client")
      }
      setDocDialogOpen(false)
      await fetchDetail()
    } catch {
      toast.error("Erreur lors de l'enregistrement du document")
    } finally {
      setSavingDoc(false)
    }
  }

  const handleDeleteDoc = async () => {
    if (!deletingDoc) return
    setDeletingDocBusy(true)
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/tp-clients/${id}/documents/${deletingDoc._id}`,
        authHeaders()
      )
      toast.success("Document supprimé")
      setDeleteDocOpen(false)
      setDeletingDoc(null)
      await fetchDetail()
    } catch {
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeletingDocBusy(false)
    }
  }

  const handleDownloadDoc = async (doc: TpDocument) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tp-clients/${id}/documents/${doc._id}/download`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } }
      )
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = doc.originalName || doc.fichier || "document"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Erreur lors du téléchargement")
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#896137]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-500">Titre de propriété introuvable</p>
        <Button variant="outline" onClick={() => router.back()}>Retour</Button>
      </div>
    )
  }

  const { tpClient, percentPaid } = data
  const StatutIcon = statutIcons[tpClient.statut]
  const docs = tpClient.documents || []
  const showKinshasaDocs = isKinshasa(tpClient.terrainId?.cite)
  const showProcuration = isForeignClient(tpClient.clientId?.indicatif, tpClient.clientId?.nationalite)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-[#896137]/10 flex items-center justify-center shrink-0">
            <ScrollText className="h-5 w-5 text-[#896137]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {clientFullName(tpClient.clientId)}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge className={`text-xs px-2 py-0 ${statutColors[tpClient.statut]}`}>
                <StatutIcon className="h-3 w-3 mr-1 inline-block" />
                {statutLabels[tpClient.statut]}
              </Badge>
              <span className="text-xs text-gray-400">Créé le {fmtDate(tpClient.dateCreation)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <User className="h-4 w-4 text-[#896137]" /> Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Nom complet" value={clientFullName(tpClient.clientId)} />
            <InfoRow label="Code" value={tpClient.clientId?.code || "—"} />
            <InfoRow label="Email" value={tpClient.clientId?.email || "—"} />
            <InfoRow label="Téléphone" value={
              tpClient.clientId?.telephone
                ? `${tpClient.clientId.indicatif || ""}${tpClient.clientId.telephone}`
                : "—"
            } />
            {tpClient.clientId?.nationalite && (
              <InfoRow label="Nationalité" value={tpClient.clientId.nationalite} />
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <MapPin className="h-4 w-4 text-[#896137]" /> Terrain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Code" value={tpClient.terrainId?.code || "—"} />
            <InfoRow label="Numéro" value={tpClient.terrainId?.numero || "—"} />
            <InfoRow label="Cité" value={tpClient.terrainId?.cite?.nom || "—"} />
            <InfoRow label="Ville" value={tpClient.terrainId?.cite?.ville || "—"} />
            {tpClient.terrainId?.cite?.province && (
              <InfoRow label="Province" value={tpClient.terrainId.cite.province} />
            )}
            {tpClient.terrainId?.cite?.commune && (
              <InfoRow label="Commune" value={tpClient.terrainId.cite.commune} />
            )}
            <InfoRow label="Statut terrain" value={tpClient.terrainId?.statut || "—"} />
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FileText className="h-4 w-4 text-[#896137]" /> Contrat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Code" value={tpClient.contratId?.code || "—"} />
            <InfoRow label="Montant total" value={fmtAmount(tpClient.contratId?.total)} />
            <InfoRow label="Date début" value={fmtDate(tpClient.contratId?.dateDebut)} />
            <InfoRow label="Date fin" value={fmtDate(tpClient.contratId?.dateFin)} />
            <InfoRow label="Statut" value={tpClient.contratId?.statut || "—"} />
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Percent className="h-4 w-4 text-[#896137]" /> Paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-bold text-[#896137]">{percentPaid}%</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">payé</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div className="h-3 rounded-full bg-[#896137] transition-all"
                style={{ width: `${Math.min(percentPaid, 100)}%` }} />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Délivrance : {tpClient.dateDelivrance ? fmtDate(tpClient.dateDelivrance) : "Non encore délivré"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <FolderOpen className="h-4 w-4 text-[#896137]" /> Documents du dossier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {showKinshasaDocs && (
            <>
              <DocumentSection
                title="Contrat de location"
                icon={Stamp}
                description="Document de contrat de location du terrain (Kinshasa)"
                docType="contrat_location"
                docs={docs} tpId={id}
                onPreview={d => { setPreviewDoc(d); setPreviewOpen(true) }}
                onEdit={openEditDoc}
                onDelete={d => { setDeletingDoc(d); setDeleteDocOpen(true) }}
                onDownload={handleDownloadDoc}
                onAdd={openAddDoc}
                lockTypeInDialog
              />
              <div className="border-t dark:border-gray-700" />
            </>
          )}

          {showProcuration && (
            <>
              <DocumentSection
                title="Document de procuration"
                icon={Globe}
                description="Procuration légalisée pour client étranger"
                docType="procuration"
                docs={docs} tpId={id}
                onPreview={d => { setPreviewDoc(d); setPreviewOpen(true) }}
                onEdit={openEditDoc}
                onDelete={d => { setDeletingDoc(d); setDeleteDocOpen(true) }}
                onDownload={handleDownloadDoc}
                onAdd={openAddDoc}
                lockTypeInDialog
              />
              <div className="border-t dark:border-gray-700" />
            </>
          )}

          <DocumentSection
            title="Documents supplémentaires"
            icon={Plus}
            description="Tout document complémentaire au dossier"
            docType="autre"
            docs={docs} tpId={id}
            onPreview={d => { setPreviewDoc(d); setPreviewOpen(true) }}
            onEdit={openEditDoc}
            onDelete={d => { setDeletingDoc(d); setDeleteDocOpen(true) }}
            onDownload={handleDownloadDoc}
            onAdd={openAddDoc}
            allowMultiple
          />
        </CardContent>
      </Card>

      {/* Update dossier */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <RefreshCw className="h-4 w-4 text-[#896137]" /> Mettre à jour le dossier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300">Statut</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="en_cours_demande">En cours de demande</SelectItem>
                  <SelectItem value="demande_validee">Demande validée</SelectItem>
                  <SelectItem value="retire">Retiré</SelectItem>
                  <SelectItem value="reporte">Reporté</SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300">Date de délivrance</Label>
              <input
                type="date"
                value={dateDelivrance}
                onChange={e => setDateDelivrance(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Notes avec IA + Micro */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-gray-700 dark:text-gray-300">Notes</Label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateAI}
                  disabled={generatingAI}
                  className="h-7 px-2 gap-1.5 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
                  title="Générer une note avec l'IA"
                >
                  {generatingAI
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />
                  }
                  IA
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleVoice}
                  className={`h-7 px-2 gap-1.5 text-xs transition-colors ${
                    isListening
                      ? "text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                  title={isListening ? "Arrêter l'enregistrement" : "Saisie vocale"}
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {isListening ? "Arrêter" : "Micro"}
                </Button>
              </div>
            </div>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Observations, informations complémentaires… ou utilisez l'IA / le micro."
              className={`dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 transition-shadow ${
                isListening ? "ring-2 ring-red-400 dark:ring-red-600" : ""
              }`}
            />
            {isListening && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping inline-block" />
                Enregistrement en cours… parlez clairement en français.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}
              className="gap-2 bg-[#896137] hover:bg-[#7a5530] text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <PreviewModal
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewDoc(null) }}
        doc={previewDoc} tpId={id}
      />

      <DocDialog
        open={docDialogOpen}
        onClose={() => { setDocDialogOpen(false); setEditingDoc(null) }}
        onSave={handleDocSave}
        saving={savingDoc}
        initialType={pendingDocType}
        editDoc={editingDoc}
        lockType={lockDocType}
      />

      {deletingDoc && (
        <DeleteDocDialog
          open={deleteDocOpen}
          onClose={() => { setDeleteDocOpen(false); setDeletingDoc(null) }}
          onConfirm={handleDeleteDoc}
          deleting={deletingDocBusy}
          docTitre={deletingDoc.titre}
        />
      )}
    </div>
  )
}
