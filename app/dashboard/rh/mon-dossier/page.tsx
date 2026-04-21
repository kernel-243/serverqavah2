"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  User,
  FileText,
  Calendar,
  Loader2,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BookOpen,
  Briefcase,
  Phone,
  MapPin,
  CreditCard,
  Umbrella,
  ExternalLink,
  AlignLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────
interface DossierData {
  _id: string
  userId: { _id: string; nom: string; email: string; role: string }
  informationsPersonnelles: {
    prenom: string; dateNaissance?: string; lieuNaissance: string
    nationalite: string; genre: string; telephone: string; adresse: string
    numeroCNI: string; photo: string; etatCivil: string; nombreEnfants: number
  }
  informationsProfessionnelles: {
    poste: string; departement: string; matricule: string; dateEmbauche?: string
    typeContrat: string; dateFinContrat?: string; bureau: string
    superviseur?: { nom: string; email: string }; statut: string
  }
  informationsSalariales: {
    salaireBase: number; devise: string; modePaiement: string; banque: string; numeroBancaire: string
  }
  contactUrgence: { nom: string; relation: string; telephone: string; adresse: string }
  conges: { soldeAnnuel: number; soldePris: number; reportN1: number }
  competences: string[]
  formations: Array<{
    _id: string; titre: string; organisme: string; dateDebut?: string; dateFin?: string
    certificat: string; description: string
  }>
}

interface DocumentData {
  _id: string; type: string; titre: string; description: string
  dateDocument?: string; ajoutePar?: { nom: string }; createdAt: string
  cloudinaryPublicId?: string; cloudinaryOriginalName?: string
  cloudinaryBytes?: number; cloudinarySecureUrl?: string
}

interface CongeData {
  _id: string; type: string; dateDebut: string; dateFin: string; nombreJours: number
  motif: string; statut: string; commentaireAdmin?: string; traitePar?: { nom: string }
  createdAt: string
}

// ── Config ────────────────────────────────────────────────────

const TYPE_CONGE_LABELS: Record<string, string> = {
  annuel: "Congé annuel", maladie: "Maladie", maternite: "Maternité",
  paternite: "Paternité", exceptionnel: "Exceptionnel", sans_solde: "Sans solde", autre: "Autre"
}

const STATUT_CONGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  en_attente: { label: "En attente", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> },
  approuve: { label: "Approuvé", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  refuse: { label: "Refusé", cls: "bg-red-100 text-red-600 border-red-200", icon: <XCircle className="h-3 w-3" /> },
  annule: { label: "Annulé", cls: "bg-gray-100 text-gray-500 border-gray-200", icon: <XCircle className="h-3 w-3" /> },
}

const DOC_TYPE_LABELS: Record<string, string> = {
  contrat: "Contrat", cv: "CV", cni: "CNI", passeport: "Passeport",
  diplome: "Diplôme", certificat: "Certificat", attestation: "Attestation", autre: "Autre"
}

function fmt(d?: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

function fmtShort(d?: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function InfoRow({ label, value, icon }: { label: string; value?: string | number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 dark:border-slate-800 last:border-0">
      {icon && <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
          {value || <span className="text-gray-300 dark:text-gray-600 font-normal">Non renseigné</span>}
        </p>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────

export default function MonDossierPage() {
  const [dossier, setDossier] = useState<DossierData | null>(null)
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [conges, setConges] = useState<CongeData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog congé
  const [congeDialogOpen, setCongeDialogOpen] = useState(false)
  const [formType, setFormType] = useState("annuel")
  const [formDateDebut, setFormDateDebut] = useState("")
  const [formDateFin, setFormDateFin] = useState("")
  const [formMotif, setFormMotif] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(`${api}/dossiers/mon-dossier`, { headers })
      setDossier(res.data.data)
      setDocuments(res.data.documents || [])
      setConges(res.data.conges || [])
    } catch {
      toast.error("Impossible de charger votre dossier")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [])

  function calcNombreJours(debut: string, fin: string): number {
    if (!debut || !fin) return 0
    const d1 = new Date(debut), d2 = new Date(fin)
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  }

  async function handleDemandeConge() {
    if (!formType || !formDateDebut || !formDateFin) {
      toast.error("Type, date début et date fin sont requis")
      return
    }
    if (new Date(formDateFin) < new Date(formDateDebut)) {
      toast.error("La date de fin doit être après la date de début")
      return
    }
    const nombreJours = calcNombreJours(formDateDebut, formDateFin)
    setIsSubmitting(true)
    try {
      await axios.post(
        `${api}/dossiers/conges/demander`,
        { type: formType, dateDebut: formDateDebut, dateFin: formDateFin, nombreJours, motif: formMotif },
        { headers }
      )
      toast.success("Demande de congé envoyée")
      setCongeDialogOpen(false)
      setFormType("annuel"); setFormDateDebut(""); setFormDateFin(""); setFormMotif("")
      fetchAll()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Erreur lors de la demande")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSecureUrl(docId: string, download: boolean) {
    try {
      const res = await axios.get(
        `${api}/dossiers/mon-dossier/documents/${docId}/secure-url${download ? "?download=1" : ""}`,
        { headers }
      )
      const url = res.data.url
      if (!url) { toast.error("URL indisponible"); return }
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      toast.error("Impossible de générer le lien sécurisé")
    }
  }

  async function handleAnnulerConge(congeId: string) {
    if (!confirm("Annuler cette demande de congé ?")) return
    try {
      await axios.put(`${api}/dossiers/conges/${congeId}/annuler`, {}, { headers })
      toast.success("Demande annulée")
      fetchAll()
    } catch {
      toast.error("Erreur lors de l'annulation")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#002952]" />
      </div>
    )
  }

  if (!dossier) return null

  const ip = dossier.informationsPersonnelles
  const ipro = dossier.informationsProfessionnelles
  const isal = dossier.informationsSalariales
  const icu = dossier.contactUrgence
  const soldeDisponible = (dossier.conges.soldeAnnuel + dossier.conges.reportN1) - dossier.conges.soldePris

  const nomComplet = [ip.prenom, dossier.userId.nom].filter(Boolean).join(" ")

  return (
    <div className="p-6 space-y-6">
      {/* Header identité */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#002952] to-[#0056b3] flex items-center justify-center text-2xl font-bold text-white shadow">
          {(ip.prenom?.[0] || dossier.userId.nom?.[0] || "?").toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{nomComplet || dossier.userId.nom}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{ipro.poste || "Poste non défini"}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {ipro.departement && (
              <Badge variant="outline" className="text-xs">{ipro.departement}</Badge>
            )}
            {ipro.typeContrat && (
              <Badge variant="outline" className="text-xs">{ipro.typeContrat}</Badge>
            )}
            <Badge className={cn("text-xs", ipro.statut === "actif" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600")}>
              {ipro.statut || "actif"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Solde congés — bandeau */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Umbrella className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Solde de congés annuels</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {dossier.conges.soldePris} jour(s) pris · {dossier.conges.reportN1 > 0 ? `+ ${dossier.conges.reportN1} j. reportés` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{soldeDisponible}</p>
            <p className="text-xs text-blue-500">disponible</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{dossier.conges.soldeAnnuel}</p>
            <p className="text-xs text-gray-400">total / an</p>
          </div>
          <Button
            size="sm"
            onClick={() => setCongeDialogOpen(true)}
            className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Demander un congé
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profil">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="profil" className="gap-2"><User className="h-4 w-4" />Profil</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" />Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="conges" className="gap-2"><Calendar className="h-4 w-4" />Congés ({conges.length})</TabsTrigger>
          <TabsTrigger value="competences" className="gap-2"><Award className="h-4 w-4" />Compétences</TabsTrigger>
        </TabsList>

        {/* ── Profil ── */}
        <TabsContent value="profil" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Infos personnelles */}
            <Card className="border border-gray-200 dark:border-slate-700">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-[#002952]" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <InfoRow label="Prénom" value={ip.prenom} />
                <InfoRow label="Nom" value={dossier.userId.nom} />
                <InfoRow label="Date de naissance" value={fmt(ip.dateNaissance)} />
                <InfoRow label="Lieu de naissance" value={ip.lieuNaissance} />
                <InfoRow label="Nationalité" value={ip.nationalite} />
                <InfoRow label="Genre" value={ip.genre === "M" ? "Masculin" : ip.genre === "F" ? "Féminin" : ip.genre} />
                <InfoRow label="État civil" value={ip.etatCivil} />
                <InfoRow label="N° CNI" value={ip.numeroCNI} />
                <InfoRow label="Téléphone" value={ip.telephone} icon={<Phone className="h-3.5 w-3.5" />} />
                <InfoRow label="Adresse" value={ip.adresse} icon={<MapPin className="h-3.5 w-3.5" />} />
              </CardContent>
            </Card>

            {/* Infos professionnelles */}
            <Card className="border border-gray-200 dark:border-slate-700">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#002952]" />
                  Informations professionnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <InfoRow label="Poste" value={ipro.poste} />
                <InfoRow label="Département" value={ipro.departement} />
                <InfoRow label="Matricule" value={ipro.matricule} />
                <InfoRow label="Date d'embauche" value={fmt(ipro.dateEmbauche)} />
                <InfoRow label="Type de contrat" value={ipro.typeContrat} />
                {ipro.dateFinContrat && <InfoRow label="Fin de contrat" value={fmt(ipro.dateFinContrat)} />}
                <InfoRow label="Bureau" value={ipro.bureau} />
                <InfoRow label="Superviseur" value={ipro.superviseur ? `${ipro.superviseur.nom}` : undefined} />
                <InfoRow label="Email" value={dossier.userId.email} />
              </CardContent>
            </Card>

            {/* Contact urgence */}
            <Card className="border border-gray-200 dark:border-slate-700">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#002952]" />
                  Contact d&apos;urgence
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <InfoRow label="Nom" value={icu.nom} />
                <InfoRow label="Relation" value={icu.relation} />
                <InfoRow label="Téléphone" value={icu.telephone} />
                <InfoRow label="Adresse" value={icu.adresse} />
              </CardContent>
            </Card>

            {/* Infos salariales partielles (sans montant) */}
            <Card className="border border-gray-200 dark:border-slate-700">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#002952]" />
                  Informations bancaires
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <InfoRow label="Mode de paiement" value={isal.modePaiement} />
                <InfoRow label="Banque" value={isal.banque} />
                <InfoRow label="N° compte" value={isal.numeroBancaire} />
                <InfoRow label="Devise" value={isal.devise} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents" className="mt-4">
          {documents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun document dans votre dossier</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <div key={doc._id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{doc.titre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs px-1.5">{DOC_TYPE_LABELS[doc.type] || doc.type}</Badge>
                      <span className="text-xs text-gray-400">{fmtShort(doc.createdAt)}</span>
                    </div>
                    {doc.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{doc.description}</p>}
                    {doc.cloudinaryPublicId && (
                      <div className="flex items-center gap-3 mt-1">
                        <button onClick={() => handleSecureUrl(doc._id, false)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          Voir <ExternalLink className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleSecureUrl(doc._id, true)} className="text-xs text-blue-600 hover:underline">
                          Télécharger
                        </button>
                        {doc.cloudinaryBytes && <span className="text-xs text-gray-400">{(doc.cloudinaryBytes / 1024).toFixed(0)} Ko</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Congés ── */}
        <TabsContent value="conges" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Historique de vos demandes de congé</p>
            <Button size="sm" onClick={() => setCongeDialogOpen(true)} className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle demande
            </Button>
          </div>
          {conges.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune demande de congé</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conges.map((c) => {
                const cfg = STATUT_CONGE[c.statut]
                return (
                  <div key={c._id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", cfg.cls, "border")}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {TYPE_CONGE_LABELS[c.type]} — {c.nombreJours} jour(s)
                        </p>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1", cfg.cls)}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtShort(c.dateDebut)} → {fmtShort(c.dateFin)}
                      </p>
                      {c.motif && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Motif : {c.motif}</p>}
                      {c.commentaireAdmin && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">
                          Admin : {c.commentaireAdmin}
                        </p>
                      )}
                    </div>
                    {c.statut === "en_attente" && (
                      <button
                        onClick={() => handleAnnulerConge(c._id)}
                        className="text-xs text-red-500 hover:underline shrink-0"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Compétences & Formations ── */}
        <TabsContent value="competences" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Compétences */}
            <Card className="border border-gray-200 dark:border-slate-700">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#002952]" />
                  Compétences
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {dossier.competences.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucune compétence renseignée</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dossier.competences.map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Formations */}
            <Card className="border border-gray-200 dark:border-slate-700">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#002952]" />
                  Formations
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {dossier.formations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucune formation enregistrée</p>
                ) : (
                  <div className="space-y-3">
                    {dossier.formations.map((f) => (
                      <div key={f._id} className="border-l-2 border-[#002952] pl-3 py-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{f.titre}</p>
                        <p className="text-xs text-gray-400">{f.organisme}</p>
                        {(f.dateDebut || f.dateFin) && (
                          <p className="text-xs text-gray-400">{fmtShort(f.dateDebut)} → {fmtShort(f.dateFin)}</p>
                        )}
                        {f.certificat && (
                          <a href={f.certificat} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                            Voir le certificat
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog Demande de congé ── */}
      <Dialog open={congeDialogOpen} onOpenChange={setCongeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#002952]" />
              Demande de congé
            </DialogTitle>
            <DialogDescription>
              Solde disponible : <strong>{soldeDisponible}</strong> jour(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type de congé <span className="text-red-500">*</span></Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONGE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date début <span className="text-red-500">*</span></Label>
                <Input type="date" value={formDateDebut} onChange={(e) => setFormDateDebut(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Date fin <span className="text-red-500">*</span></Label>
                <Input type="date" value={formDateFin} onChange={(e) => setFormDateFin(e.target.value)} />
              </div>
            </div>
            {formDateDebut && formDateFin && new Date(formDateFin) >= new Date(formDateDebut) && (
              <p className="text-sm text-blue-600 font-medium">
                Durée : {calcNombreJours(formDateDebut, formDateFin)} jour(s)
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Motif</Label>
              <Textarea
                placeholder="Raison de la demande (optionnel)"
                value={formMotif}
                onChange={(e) => setFormMotif(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCongeDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleDemandeConge} disabled={isSubmitting} className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlignLeft className="h-4 w-4" />}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
