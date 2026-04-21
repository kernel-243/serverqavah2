"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Target,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  Trophy,
  XCircle,
  Send,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────
type Frequence = "journalier" | "mensuel" | "bimestriel" | "trimestriel" | "annuel" | "personnalise"
type TypeValidation = "automatique" | "manuel"
type StatutAssignation =
  | "non_demarre"
  | "en_cours"
  | "atteint"
  | "non_atteint"
  | "en_attente_validation"
  | "valide"

interface Objectif {
  _id: string
  titre: string
  description?: string
  frequence: Frequence
  typeValidation: TypeValidation
  regle?: { indicateur?: string; seuil?: number; devise?: string }
  categorie?: string
  priorite: string
}

interface Assignation {
  _id: string
  objectifId: Objectif
  dateDebut: string
  dateFin: string
  statut: StatutAssignation
  progression: number
  commentaireAgent?: string
  preuveUrl?: string
  dateAtteint?: string
  validePar?: { nom: string; prenom?: string }
  dateValidation?: string
  createdAt: string
}

// ── Config ────────────────────────────────────────────────────

const STATUT_CONFIG: Record<
  StatutAssignation,
  { label: string; badgeClass: string; icon: React.ReactNode; cardBorder: string }
> = {
  non_demarre: {
    label: "Non démarré",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <Circle className="h-3.5 w-3.5" />,
    cardBorder: "border-gray-200 dark:border-slate-700",
  },
  en_cours: {
    label: "En cours",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Clock className="h-3.5 w-3.5" />,
    cardBorder: "border-blue-200 dark:border-blue-800",
  },
  atteint: {
    label: "Atteint",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <Trophy className="h-3.5 w-3.5" />,
    cardBorder: "border-emerald-300 dark:border-emerald-700",
  },
  non_atteint: {
    label: "Non atteint",
    badgeClass: "bg-red-100 text-red-600 border-red-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
    cardBorder: "border-red-200 dark:border-red-800",
  },
  en_attente_validation: {
    label: "En attente",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
    cardBorder: "border-amber-200 dark:border-amber-800",
  },
  valide: {
    label: "Validé",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    cardBorder: "border-purple-200 dark:border-purple-800",
  },
}

const FREQUENCE_LABELS: Record<Frequence, string> = {
  journalier: "Journalier",
  mensuel: "Mensuel",
  bimestriel: "Bimestriel",
  trimestriel: "Trimestriel",
  annuel: "Annuel",
  personnalise: "Personnalisé",
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function isPeriodActive(dateDebut: string, dateFin: string) {
  const now = new Date()
  return new Date(dateDebut) <= now && now <= new Date(dateFin)
}

function getUnitLabel(indicateur?: string, devise?: string): string {
  switch (indicateur) {
    case "total_paiements": return devise || "USD"
    case "nombre_clients": return "clients"
    case "nombre_prospects": return "prospects"
    case "nombre_contrats": return "contrats"
    case "nombre_terrains_acquis": return "terrains acquis"
    case "nombre_terrains_vendus": return "terrains vendus"
    case "nombre_presences": return "jours"
    default: return ""
  }
}

// ── Component ─────────────────────────────────────────────────

export default function MesObjectifsPage() {
  const [assignations, setAssignations] = useState<Assignation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState("all")

  // Dialog détail/mise à jour
  const [selected, setSelected] = useState<Assignation | null>(null)
  const [formStatut, setFormStatut] = useState<StatutAssignation>("en_cours")
  const [formCommentaire, setFormCommentaire] = useState("")
  const [formPreuve, setFormPreuve] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSoumettant, setIsSoumettant] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  const fetchMesObjectifs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterStatut !== "all") params.statut = filterStatut
      const res = await axios.get(`${api}/objectifs/mes-objectifs`, { headers, params })
      setAssignations(res.data.data || [])
    } catch {
      toast.error("Impossible de charger vos objectifs")
    } finally {
      setIsLoading(false)
    }
  }, [filterStatut])

  // Déclencher aussi la vérification auto au chargement
  const triggerAutoCheck = useCallback(async () => {
    try {
      await axios.post(`${api}/objectifs/check-auto`, {}, { headers })
    } catch {
      // Silencieux
    }
  }, [])

  useEffect(() => {
    triggerAutoCheck()
    fetchMesObjectifs()
  }, [filterStatut])

  function openDetail(a: Assignation) {
    setSelected(a)
    setFormStatut(a.statut === "non_demarre" ? "en_cours" : a.statut as StatutAssignation)
    setFormCommentaire(a.commentaireAgent || "")
    setFormPreuve(a.preuveUrl || "")
  }

  async function handleSaveProgression() {
    if (!selected) return
    setIsSaving(true)
    try {
      await axios.put(
        `${api}/objectifs/mes-objectifs/${selected._id}`,
        { statut: formStatut, commentaireAgent: formCommentaire, preuveUrl: formPreuve },
        { headers }
      )
      toast.success("Progression mise à jour")
      setSelected(null)
      fetchMesObjectifs()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Erreur lors de la mise à jour")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSoumettre() {
    if (!selected) return
    setIsSoumettant(true)
    try {
      await axios.post(
        `${api}/objectifs/mes-objectifs/${selected._id}/soumettre`,
        { commentaireAgent: formCommentaire, preuveUrl: formPreuve },
        { headers }
      )
      toast.success("Objectif soumis pour validation")
      setSelected(null)
      fetchMesObjectifs()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Erreur lors de la soumission")
    } finally {
      setIsSoumettant(false)
    }
  }

  const filteredAssignations = assignations

  // Stats rapides
  const stats = {
    total: assignations.length,
    atteint: assignations.filter((a) => a.statut === "atteint" || a.statut === "valide").length,
    enCours: assignations.filter((a) => a.statut === "en_cours").length,
    enAttente: assignations.filter((a) => a.statut === "en_attente_validation").length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#002952]" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#002952] flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes objectifs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Suivez et déclarez vos objectifs</p>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, cls: "bg-gray-50 dark:bg-slate-800 border-gray-200" },
          { label: "Atteints", value: stats.atteint, cls: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200" },
          { label: "En cours", value: stats.enCours, cls: "bg-blue-50 dark:bg-blue-900/20 border-blue-200" },
          { label: "En attente", value: stats.enAttente, cls: "bg-amber-50 dark:bg-amber-900/20 border-amber-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-3 text-center ${s.cls}`}>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-3">
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.entries(STATUT_CONFIG) as [StatutAssignation, typeof STATUT_CONFIG[StatutAssignation]][]).map(
              ([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      {filteredAssignations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun objectif assigné pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignations.map((a) => {
            const cfg = STATUT_CONFIG[a.statut]
            const seuil = a.objectifId?.regle?.seuil
            const pct = seuil && seuil > 0 ? Math.min(100, Math.round((a.progression / seuil) * 100)) : null
            const active = isPeriodActive(a.dateDebut, a.dateFin)
            const isManuel = a.objectifId?.typeValidation === "manuel"
            const canEdit =
              isManuel &&
              !["atteint", "valide", "en_attente_validation", "non_atteint"].includes(a.statut)

            return (
              <Card
                key={a._id}
                className={cn(
                  "border transition-all hover:shadow-md cursor-pointer",
                  cfg.cardBorder,
                  a.statut === "atteint" && "shadow-emerald-100 dark:shadow-emerald-900/20"
                )}
                onClick={() => openDetail(a)}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {a.statut === "atteint" && (
                        <div className="flex items-center gap-1 mb-1">
                          <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                          <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Objectif atteint !</span>
                        </div>
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{a.objectifId?.titre}</h3>
                      {a.objectifId?.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">
                          {a.objectifId.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {/* Tags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
                        cfg.badgeClass
                      )}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                      {a.objectifId?.frequence ? FREQUENCE_LABELS[a.objectifId.frequence] : ""}
                    </span>
                    {active && (
                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full">
                        En période
                      </span>
                    )}
                  </div>

                  {/* Période */}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {fmt(a.dateDebut)} → {fmt(a.dateFin)}
                  </p>

                  {/* Barre de progression (auto uniquement) */}
                  {pct !== null && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          {a.progression.toLocaleString("fr-FR")} / {seuil?.toLocaleString("fr-FR")}{" "}
                          {getUnitLabel(a.objectifId?.regle?.indicateur, a.objectifId?.regle?.devise)}
                        </span>
                        <span className={cn("font-semibold", pct >= 100 ? "text-emerald-600" : "text-blue-600")}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct >= 100 ? "bg-emerald-500" : "bg-blue-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action rapide si manuel et éditable */}
                  {canEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openDetail(a) }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Mettre à jour ma progression
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Dialog Détail / Mise à jour ── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#002952]" />
                  {selected.objectifId?.titre}
                </DialogTitle>
                <DialogDescription>
                  {selected.objectifId?.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Infos */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Période</p>
                    <p className="text-gray-700 dark:text-gray-300">{fmt(selected.dateDebut)} → {fmt(selected.dateFin)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Type</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selected.objectifId?.typeValidation === "automatique" ? "Automatique" : "Manuel"}
                    </p>
                  </div>
                  {selected.objectifId?.regle?.seuil && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Seuil cible</p>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">
                        {selected.objectifId.regle.seuil.toLocaleString("fr-FR")}{" "}
                        {getUnitLabel(selected.objectifId.regle.indicateur, selected.objectifId.regle.devise)}
                      </p>
                    </div>
                  )}
                  {selected.objectifId?.categorie && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Catégorie</p>
                      <p className="text-gray-700 dark:text-gray-300">{selected.objectifId.categorie}</p>
                    </div>
                  )}
                </div>

                {/* Statut actuel */}
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
                      STATUT_CONFIG[selected.statut].badgeClass
                    )}
                  >
                    {STATUT_CONFIG[selected.statut].icon}
                    {STATUT_CONFIG[selected.statut].label}
                  </span>
                  {selected.dateAtteint && (
                    <span className="text-xs text-gray-400">Atteint le {fmt(selected.dateAtteint)}</span>
                  )}
                </div>

                {/* Progression auto */}
                {selected.objectifId?.regle?.seuil && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        Progression : {selected.progression.toLocaleString("fr-FR")} /{" "}
                        {selected.objectifId.regle.seuil.toLocaleString("fr-FR")}{" "}
                        {getUnitLabel(selected.objectifId.regle.indicateur, selected.objectifId.regle.devise)}
                      </span>
                      <span className="font-semibold text-blue-600">
                        {Math.min(100, Math.round((selected.progression / selected.objectifId.regle.seuil) * 100))}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          selected.progression >= selected.objectifId.regle.seuil ? "bg-emerald-500" : "bg-blue-500"
                        )}
                        style={{
                          width: `${Math.min(100, Math.round((selected.progression / selected.objectifId.regle.seuil) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Formulaire mise à jour (manuel seulement) */}
                {selected.objectifId?.typeValidation === "manuel" &&
                  !["atteint", "valide", "en_attente_validation"].includes(selected.statut) && (
                    <>
                      <hr className="border-gray-100 dark:border-slate-800" />
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Mettre à jour ma progression
                      </p>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Statut</Label>
                        <Select value={formStatut} onValueChange={(v) => setFormStatut(v as StatutAssignation)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en_cours">En cours</SelectItem>
                            <SelectItem value="atteint">Terminé (atteint)</SelectItem>
                            <SelectItem value="non_atteint">Non atteint</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Commentaire</Label>
                        <Textarea
                          placeholder="Décrivez votre avancement..."
                          value={formCommentaire}
                          onChange={(e) => setFormCommentaire(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Lien pièce justificative (optionnel)</Label>
                        <Input
                          placeholder="https://..."
                          value={formPreuve}
                          onChange={(e) => setFormPreuve(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                {/* Affichage commentaire existant si en attente ou validé */}
                {["en_attente_validation", "valide"].includes(selected.statut) && selected.commentaireAgent && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Mon commentaire soumis</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 rounded p-2">
                      {selected.commentaireAgent}
                    </p>
                  </div>
                )}

                {selected.statut === "valide" && selected.validePar && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Validé par {selected.validePar.nom} {selected.validePar.prenom || ""}
                    {selected.dateValidation && ` le ${fmt(selected.dateValidation)}`}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Fermer</Button>
                {selected.objectifId?.typeValidation === "manuel" &&
                  !["atteint", "valide", "en_attente_validation"].includes(selected.statut) && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleSaveProgression}
                        disabled={isSaving}
                        className="gap-2"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Enregistrer
                      </Button>
                      <Button
                        onClick={handleSoumettre}
                        disabled={isSoumettant}
                        className="bg-[#002952] hover:bg-[#003b7a] text-white gap-2"
                      >
                        {isSoumettant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Soumettre pour validation
                      </Button>
                    </>
                  )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
