"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useGeolocation } from "@/hooks/useGeolocation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Clock, LogIn, LogOut, Users, CheckCircle2, AlertCircle, Loader2, Plus, Pencil, Trash2, Timer, CheckCheck, XCircle, Navigation, Pause, Play, Building2, Target } from "lucide-react"
import axios from "axios"
import { toast } from "sonner"

interface User {
  _id: string
  nom: string
  email: string
  role: string
}

interface PauseData {
  debut: string
  fin?: string
  duree?: number  // en secondes
}

interface Bureau {
  _id: string
  nom: string
}

interface BureauLight {
  _id: string
  nom: string
  adresse?: { ville?: string }
  coordonnees?: { lat?: number | null; lng?: number | null }
  rayon?: number
}

interface Presence {
  _id: string
  userId: User
  date: string
  heureEntree?: string
  heureSortie?: string
  statut: "present" | "absent" | "retard" | "conge" | "maladie" | "ferie" | "non_defini"
  type: "pointage" | "manuel"
  notes?: string
  commentaire?: string
  pause?: PauseData | null
  bureauPointage?: Bureau | null
}

interface TodayEntry {
  employee: User
  presence: Presence | null
}

function statutBadge(statut: string) {
  const map: Record<string, { label: string; className: string }> = {
    present: { label: "Présent", className: "bg-green-100 text-green-800" },
    retard: { label: "Retard", className: "bg-yellow-100 text-yellow-800" },
    absent: { label: "Absent", className: "bg-red-100 text-red-800" },
    conge: { label: "Congé", className: "bg-blue-100 text-blue-800" },
    maladie: { label: "Maladie", className: "bg-orange-100 text-orange-800" },
    ferie: { label: "Férié", className: "bg-purple-100 text-purple-800" },
    non_defini: { label: "—", className: "bg-gray-100 text-gray-600" },
  }
  const s = map[statut] || map["non_defini"]
  return <Badge className={s.className}>{s.label}</Badge>
}

// Les dates sont stockées en heure locale Kinshasa comme UTC naïf.
// On lit les heures UTC pour ne pas décaler vers la timezone du navigateur.
function formatTime(dt?: string) {
  if (!dt) return "—"
  const d = new Date(dt)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// Retourne le timestamp "heure locale Kinshasa comme UTC" (même convention que le backend)
function nowLocalMs(): number {
  const localStr = new Date().toLocaleString("sv-SE", { timeZone: "Africa/Kinshasa" })
  return new Date(localStr.replace(" ", "T") + "Z").getTime()
}

// Associe une ville à son fuseau horaire IANA (même logique que le backend)
function getTimezoneForVille(ville: string): string {
  const v = (ville || "").toLowerCase().trim()
  if (v.includes("lubumbashi") || v.includes("katanga") || v.includes("kolwezi") || v.includes("likasi")) {
    return "Africa/Lubumbashi" // UTC+2
  }
  return "Africa/Kinshasa" // UTC+1 (défaut)
}

// Retourne les minutes depuis minuit dans le fuseau horaire donné
function getLocalMinutes(timezone: string): number {
  const localStr = new Date().toLocaleString("sv-SE", { timeZone: timezone })
  const d = new Date(localStr.replace(" ", "T") + "Z")
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

// Retourne l'heure locale formatée HH:MM dans le fuseau horaire donné
function formatLocalTime(timezone: string): string {
  const localStr = new Date().toLocaleString("sv-SE", { timeZone: timezone })
  const d = new Date(localStr.replace(" ", "T") + "Z")
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

// Distance Haversine en mètres (même formule que le backend)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function computeElapsed(presence: Presence): number {
  if (!presence.heureEntree) return 0
  const start = new Date(presence.heureEntree).getTime()
  const end = presence.heureSortie ? new Date(presence.heureSortie).getTime() : nowLocalMs()
  let pausedMs = 0
  if (presence.pause?.debut) {
    const ps = new Date(presence.pause.debut).getTime()
    const pe = presence.pause.fin ? new Date(presence.pause.fin).getTime() : nowLocalMs()
    pausedMs = pe - ps
  }
  return Math.max(0, Math.floor((end - start - pausedMs) / 1000))
}

export default function PresencePage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [todayPresence, setTodayPresence] = useState<Presence | null>(null)
  const [todayAll, setTodayAll] = useState<TodayEntry[]>([])
  const [employees, setEmployees] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [pauseLoading, setPauseLoading] = useState(false)
  const [commentaire, setCommentaire] = useState("")
  const geo = useGeolocation()

  // Détection de timezone basée sur le bureau le plus proche
  const [bureauTimezone, setBureauTimezone] = useState<string>("Africa/Kinshasa")
  const [bureauVilleDetecte, setBureauVilleDetecte] = useState<string>("")
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => getLocalMinutes("Africa/Kinshasa"))
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Dialog formulaire
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Presence | null>(null)

  // Dialog erreur
  const [errorDialog, setErrorDialog] = useState<string | null>(null)

  // Dialog performance non remplie
  const [perfCheckDialog, setPerfCheckDialog] = useState(false)
  const [form, setForm] = useState({
    userId: "",
    date: new Date().toISOString().slice(0, 10),
    heureEntree: "",
    heureSortie: "",
    statut: "present",
    notes: "",
  })

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
  const headers = { Authorization: `Bearer ${token}` }
  const api = process.env.NEXT_PUBLIC_API_URL

  // Gestion du minuteur
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (todayPresence?.heureEntree && !todayPresence?.heureSortie) {
      const update = () => setElapsed(computeElapsed(todayPresence))
      update()
      timerRef.current = setInterval(update, 1000)
    } else {
      setElapsed(0)
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [todayPresence])

  // Mise à jour de l'heure locale toutes les 30 secondes
  useEffect(() => {
    const update = () => setCurrentTimeMinutes(getLocalMinutes(bureauTimezone))
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [bureauTimezone])

  // Chargement des bureaux actifs + détection GPS de la timezone au démarrage
  useEffect(() => {
    const detectTimezone = async () => {
      try {
        const res = await axios.get(`${api}/presences/bureaux-actifs`, { headers })
        const bureaux: BureauLight[] = res.data?.data || []
        if (bureaux.length === 0) return

        // Essayer de détecter la position GPS en arrière-plan (non bloquant)
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords
              let nearest: BureauLight | null = null
              let minDist = Infinity
              for (const b of bureaux) {
                if (b.coordonnees?.lat != null && b.coordonnees?.lng != null) {
                  const dist = haversineDistance(latitude, longitude, b.coordonnees.lat, b.coordonnees.lng)
                  if (dist < minDist) { minDist = dist; nearest = b }
                }
              }
              if (nearest) {
                const ville = nearest.adresse?.ville || ""
                const tz = getTimezoneForVille(ville)
                setBureauTimezone(tz)
                setBureauVilleDetecte(ville || nearest.nom)
              }
            },
            () => { /* GPS indisponible — on garde le fuseau par défaut */ },
            { timeout: 6000, enableHighAccuracy: false, maximumAge: 120000 }
          )
        } else if (bureaux.length === 1) {
          // Un seul bureau : on utilise directement sa ville
          const ville = bureaux[0].adresse?.ville || ""
          setBureauTimezone(getTimezoneForVille(ville))
          setBureauVilleDetecte(ville || bureaux[0].nom)
        }
      } catch { /* Silencieux — non bloquant */ }
    }
    detectTimezone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const meRes = await axios.get(`${api}/users/me`, { headers })
      const role = meRes.data.role
      const uid = meRes.data._id
      setUserRole(role)
      setUserId(uid)

      // L'admin ne pointe pas — on ne charge son propre pointage que s'il est agent
      if (role !== "Admin") {
        const todayRes = await axios.get(`${api}/presences/today`, { headers })
        setTodayPresence(todayRes.data.data)
      }

      if (role === "Admin") {
        const [allRes, usersRes] = await Promise.all([
          axios.get(`${api}/presences/today-all`, { headers }),
          axios.get(`${api}/users`, { headers }),
        ])
        setTodayAll(allRes.data.data)
        setEmployees(usersRes.data.filter((u: User) => u._id !== uid))
      }
    } catch {
      toast.error("Erreur lors du chargement des données")
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCheckin = async () => {
    setActionLoading(true)
    try {
      const coords = await geo.getPosition()
      const res = await axios.post(`${api}/presences/checkin`, { latitude: coords.latitude, longitude: coords.longitude, commentaire }, { headers })
      if (res.data?.locationWarning) {
        toast("Vous êtes loin du bureau.", { icon: "⚠️" })
      } else {
        toast.success("Entrée pointée avec succès")
      }
      setCommentaire("")
      fetchData()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      setErrorDialog(err?.response?.data?.message || err?.message || "Erreur lors du pointage")
    } finally {
      setActionLoading(false)
    }
  }

  const doCheckout = async () => {
    setActionLoading(true)
    try {
      const coords = await geo.getPosition()
      const res = await axios.post(`${api}/presences/checkout`, { latitude: coords.latitude, longitude: coords.longitude }, { headers })
      if (res.data?.locationWarning) {
        toast("Vous êtes loin du bureau.", { icon: "⚠️" })
      } else {
        toast.success("Sortie pointée avec succès")
      }
      fetchData()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      setErrorDialog(err?.response?.data?.message || err?.message || "Erreur lors du pointage")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckout = async () => {
    // Vérifier si la performance du jour a été remplie
    try {
      const res = await axios.get(`${api}/performances/today/check`, { headers })
      if (!res.data.filled) {
        setPerfCheckDialog(true)
        return
      }
    } catch {
      // En cas d'erreur sur le check, on procède quand même au pointage
    }
    await doCheckout()
  }

  const handlePause = async () => {
    const endpoint = (todayPresence?.pause?.debut && !todayPresence?.pause?.fin) ? "pause-end" : "pause-start"
    setPauseLoading(true)
    try {
      await axios.post(`${api}/presences/${endpoint}`, {}, { headers })
      fetchData()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err?.response?.data?.message || err?.message || "Erreur")
    } finally {
      setPauseLoading(false)
    }
  }

  const openCreate = () => {
    setEditTarget(null)
    setForm({ userId: "", date: new Date().toISOString().slice(0, 10), heureEntree: "", heureSortie: "", statut: "present", notes: "" })
    setDialogOpen(true)
  }

  const openEdit = (p: Presence) => {
    setEditTarget(p)
    const toTime = (dt?: string) => dt ? new Date(dt).toTimeString().slice(0, 5) : ""
    setForm({
      userId: p.userId?._id || "",
      date: new Date(p.date).toISOString().slice(0, 10),
      heureEntree: toTime(p.heureEntree),
      heureSortie: toTime(p.heureSortie),
      statut: p.statut,
      notes: p.notes || "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setActionLoading(true)
    try {
      // Traiter le temps saisi comme heure locale Kinshasa → stocker comme UTC naïf (T09:00Z = 09h00 Kinshasa)
      const buildDatetime = (date: string, time: string) => time ? new Date(`${date}T${time}:00Z`).toISOString() : undefined
      const payload = {
        userId: form.userId,
        date: form.date,
        heureEntree: buildDatetime(form.date, form.heureEntree),
        heureSortie: buildDatetime(form.date, form.heureSortie),
        statut: form.statut,
        notes: form.notes,
      }
      if (editTarget) {
        await axios.put(`${api}/presences/${editTarget._id}`, payload, { headers })
        toast.success("Présence modifiée")
      } else {
        await axios.post(`${api}/presences`, payload, { headers })
        toast.success("Présence créée")
      }
      setDialogOpen(false)
      fetchData()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      const msg = err?.response?.data?.message || "Une erreur est survenue"
      setErrorDialog(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette présence ?")) return
    try {
      await axios.delete(`${api}/presences/${id}`, { headers })
      toast.success("Présence supprimée")
      fetchData()
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Afficher la date en heure locale Kinshasa (même convention que le backend)
  const nowKinshasa = new Date(new Date().toLocaleString("sv-SE", { timeZone: "Africa/Kinshasa" }).replace(" ", "T") + "Z")
  const today = nowKinshasa.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })

  const checkinDone = !!todayPresence?.heureEntree
  const checkoutDone = !!todayPresence?.heureSortie
  const journeeComplete = checkinDone && checkoutDone
  const p = todayPresence?.pause
  const isPaused = !!(p?.debut && !p?.fin)
  const pauseUsed = !!(p?.debut && p?.fin)
  const pauseDuration = p?.duree ?? 0

  // Calcul de l'avertissement de retard (avant checkin uniquement)
  const SEUIL_DEMI = 9 * 60 + 15  // 09h15
  const SEUIL_JOUR = 9 * 60 + 45  // 09h45
  const retardNiveau: "aucun" | "demi" | "jour" = !checkinDone && currentTimeMinutes >= SEUIL_JOUR
    ? "jour"
    : !checkinDone && currentTimeMinutes >= SEUIL_DEMI
    ? "demi"
    : "aucun"
  const retardHeure = formatLocalTime(bureauTimezone)
  const retardLieu = bureauVilleDetecte ? ` (heure de ${bureauVilleDetecte})` : ""

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Présence</h1>
          <p className="text-muted-foreground capitalize">{today}</p>
        </div>
        {userRole === "Admin" && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter manuellement
          </Button>
        )}
      </div>

      {/* Zone de pointage — uniquement pour les agents */}
      {userRole !== "Admin" && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Mon pointage du jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6 py-4">

            {/* Infos horaires */}
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground mb-1">Entrée</p>
                <p className="text-2xl font-semibold">{formatTime(todayPresence?.heureEntree)}</p>
              </div>
              {(isPaused || pauseUsed) && (
                <div className="text-center">
                  <p className="text-muted-foreground mb-1">Début pause</p>
                  <p className="text-2xl font-semibold text-yellow-600">{formatTime(p?.debut)}</p>
                </div>
              )}
              {pauseUsed && p?.fin && (
                <div className="text-center">
                  <p className="text-muted-foreground mb-1">Fin pause</p>
                  <p className="text-2xl font-semibold text-yellow-600">{formatTime(p.fin)}</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-muted-foreground mb-1">Sortie</p>
                <p className="text-2xl font-semibold">{formatTime(todayPresence?.heureSortie)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground mb-1">Statut</p>
                <div className="mt-1">
                  {todayPresence ? statutBadge(todayPresence.statut) : <Badge className="bg-gray-100 text-gray-600">Non pointé</Badge>}
                </div>
              </div>
            </div>

            {/* Bureau détecté */}
            {checkinDone && todayPresence?.bureauPointage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span>Bureau : <span className="font-medium text-foreground">{todayPresence.bureauPointage.nom}</span></span>
              </div>
            )}

            {/* Avertissement de retard — visible uniquement avant le checkin */}
            {retardNiveau === "jour" && (
              <div className="w-full max-w-md flex items-start gap-3 bg-red-50 border border-red-300 rounded-lg px-4 py-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Pointage très en retard — {retardHeure}{retardLieu}</p>
                  <p className="text-sm text-red-600 mt-0.5">
                    Vu le pointage en retard, ce pointage sera considéré comme une{" "}
                    <strong>journée non payée</strong>.
                  </p>
                </div>
              </div>
            )}
            {retardNiveau === "demi" && (
              <div className="w-full max-w-md flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">Pointage en retard — {retardHeure}{retardLieu}</p>
                  <p className="text-sm text-amber-600 mt-0.5">
                    Vu le pointage en retard, ce pointage sera considéré comme une{" "}
                    <strong>demi-journée non payée</strong>. Au-delà de 09h45, ce sera une journée non payée.
                  </p>
                </div>
              </div>
            )}

            {/* Commentaire — visible seulement avant le checkin */}
            {!checkinDone && (
              <div className="w-full max-w-sm">
                <label className="text-sm text-muted-foreground mb-1 block">Commentaire (optionnel)</label>
                <Textarea
                  value={commentaire}
                  onChange={e => setCommentaire(e.target.value)}
                  placeholder="Ajouter un commentaire pour ce pointage..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            )}

            {/* Durée de pause effectuée */}
            {checkinDone && pauseUsed && !isPaused && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm">
                <Pause className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-700">Temps de pause : <span className="font-semibold">{formatElapsed(pauseDuration)}</span></span>
              </div>
            )}

            {/* Minuteur actif */}
            {checkinDone && !checkoutDone && (
              <div className={`flex items-center gap-2 border rounded-xl px-6 py-3 ${isPaused ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200"}`}>
                <Timer className={`h-5 w-5 ${isPaused ? "text-yellow-500" : "text-blue-500 animate-pulse"}`} />
                <span className={`text-2xl font-mono font-bold ${isPaused ? "text-yellow-700" : "text-blue-700"}`}>{formatElapsed(elapsed)}</span>
                <span className={`text-sm ml-1 ${isPaused ? "text-yellow-600" : "text-blue-500"}`}>{isPaused ? "en pause" : "en cours"}</span>
              </div>
            )}

            {/* Message journée complète */}
            {journeeComplete && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-6 py-3">
                <CheckCheck className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Pointage journalier terminé — bonne journée !</span>
              </div>
            )}

            {/* Boutons centrés */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={handleCheckin}
                disabled={actionLoading || checkinDone}
                className="gap-2 bg-green-600 hover:bg-green-700 px-6 py-5 text-base"
                title={checkinDone ? "Entrée déjà pointée aujourd'hui" : ""}
              >
                {geo.locating ? <Navigation className="h-5 w-5 animate-pulse" /> : actionLoading && !checkinDone ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                {geo.locating ? "Localisation..." : "Pointer Entrée"}
              </Button>

              {/* Bouton Pause — visible seulement si checkin fait et pas encore sorti */}
              {checkinDone && !checkoutDone && (
                <Button
                  onClick={handlePause}
                  disabled={pauseLoading || (pauseUsed && !isPaused)}
                  variant="outline"
                  className={`gap-2 px-6 py-5 text-base ${isPaused ? "border-green-400 text-green-700 hover:bg-green-50" : pauseUsed ? "border-gray-300 text-gray-400 cursor-not-allowed" : "border-yellow-400 text-yellow-700 hover:bg-yellow-50"}`}
                  title={pauseUsed && !isPaused ? "Pause déjà utilisée aujourd'hui" : isPaused ? "Terminer la pause" : "Commencer une pause"}
                >
                  {pauseLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  {isPaused ? "Reprendre" : pauseUsed ? "Pause utilisée" : "Pause"}
                </Button>
              )}

              <Button
                onClick={handleCheckout}
                disabled={actionLoading || !checkinDone || checkoutDone || isPaused}
                variant="outline"
                className="gap-2 border-red-300 text-red-600 hover:bg-red-50 px-6 py-5 text-base"
                title={!checkinDone ? "Veuillez d'abord pointer l'entrée" : isPaused ? "Terminez votre pause avant de pointer la sortie" : checkoutDone ? "Sortie déjà pointée aujourd'hui" : ""}
              >
                {geo.locating ? <Navigation className="h-5 w-5 animate-pulse" /> : actionLoading && checkinDone && !checkoutDone ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                {geo.locating ? "Localisation..." : "Pointer Sortie"}
              </Button>
            </div>

            {/* Message indicatif */}
            {checkinDone && (
              <p className="text-xs text-muted-foreground text-center">
                {checkoutDone
                  ? "Le pointage de la journée a déjà été effectué."
                  : isPaused
                  ? "Pause en cours — reprenez le travail avant de pointer la sortie."
                  : "Entrée enregistrée. N'oubliez pas de pointer votre sortie."}
              </p>
            )}

            {/* Récapitulatif / Historique du jour */}
            {checkinDone && (
              <div className="w-full max-w-md border rounded-xl overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Récapitulatif du jour</p>
                </div>
                <div className="divide-y">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LogIn className="h-4 w-4 text-green-500" />
                      <span>Heure d&apos;entrée</span>
                    </div>
                    <span className="text-sm font-semibold">{formatTime(todayPresence?.heureEntree)}</span>
                  </div>
                  {(isPaused || pauseUsed) && (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Pause className="h-4 w-4 text-yellow-500" />
                        <span>Début de pause</span>
                      </div>
                      <span className="text-sm font-semibold text-yellow-700">{formatTime(p?.debut)}</span>
                    </div>
                  )}
                  {pauseUsed && p?.fin && (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Play className="h-4 w-4 text-yellow-500" />
                        <span>Fin de pause</span>
                      </div>
                      <span className="text-sm font-semibold text-yellow-700">{formatTime(p.fin)}</span>
                    </div>
                  )}
                  {pauseUsed && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-yellow-50/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Timer className="h-4 w-4 text-yellow-500" />
                        <span>Temps de pause</span>
                      </div>
                      <span className="text-sm font-semibold text-yellow-700">{formatElapsed(pauseDuration)}</span>
                    </div>
                  )}
                  {isPaused && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-yellow-50/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Timer className="h-4 w-4 text-yellow-500" />
                        <span>Pause en cours</span>
                      </div>
                      <span className="text-sm font-semibold text-yellow-600 animate-pulse">En cours…</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LogOut className="h-4 w-4 text-red-500" />
                      <span>Heure de sortie</span>
                    </div>
                    <span className="text-sm font-semibold">{formatTime(todayPresence?.heureSortie)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>}

      {/* Vue Admin — tous les employés */}
      {userRole === "Admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Présences du jour — Tous les employés
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Résumé rapide */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Présents", value: todayAll.filter(e => e.presence?.statut === "present").length, icon: CheckCircle2, color: "text-green-500" },
                { label: "Retards", value: todayAll.filter(e => e.presence?.statut === "retard").length, icon: AlertCircle, color: "text-yellow-500" },
                { label: "Absents", value: todayAll.filter(e => !e.presence || e.presence.statut === "absent").length, icon: AlertCircle, color: "text-red-500" },
                { label: "Total", value: todayAll.length, icon: Users, color: "text-blue-500" },
              ].map(stat => (
                <div key={stat.label} className="flex items-center gap-3 bg-muted/40 rounded-lg p-3">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Entrée</TableHead>
                  <TableHead>Pause</TableHead>
                  <TableHead>Durée pause</TableHead>
                  <TableHead>Sortie</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayAll.map(({ employee, presence }) => {
                  const pp = presence?.pause
                  const pOngoing = pp?.debut && !pp?.fin
                  const pDone = pp?.debut && pp?.fin
                  return (
                    <TableRow key={employee._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.nom}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{presence ? statutBadge(presence.statut) : <Badge className="bg-gray-100 text-gray-600">Non pointé</Badge>}</TableCell>
                      <TableCell>{formatTime(presence?.heureEntree)}</TableCell>
                      <TableCell>
                        {pOngoing ? (
                          <div className="text-xs text-yellow-700">
                            <span>{formatTime(pp!.debut)}</span>
                            <Badge className="ml-1 bg-yellow-100 text-yellow-700 text-xs">En cours</Badge>
                          </div>
                        ) : pDone ? (
                          <div className="text-xs text-muted-foreground">
                            <p>{formatTime(pp!.debut)} → {formatTime(pp!.fin)}</p>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {pp?.duree ? (
                          <span className="text-xs font-medium text-yellow-700">{formatElapsed(pp.duree)}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{formatTime(presence?.heureSortie)}</TableCell>
                      <TableCell>
                        {presence ? (
                          <Badge variant="outline" className="text-xs">
                            {presence.type === "pointage" ? "Pointage" : "Manuel"}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {presence ? (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(presence)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(presence._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditTarget(null)
                            setForm(f => ({ ...f, userId: employee._id }))
                            setDialogOpen(true)
                          }}>
                            <Plus className="h-4 w-4 mr-1" /> Ajouter
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog erreur */}
      <Dialog open={!!errorDialog} onOpenChange={() => setErrorDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Erreur
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{errorDialog}</p>
          <DialogFooter>
            <Button onClick={() => setErrorDialog(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog performance non remplie */}
      <Dialog open={perfCheckDialog} onOpenChange={setPerfCheckDialog}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600 text-base">
              <Target className="h-5 w-5 shrink-0" />
              Performance non remplie
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vous n&apos;avez pas encore rempli votre performance du jour. Voulez-vous le faire maintenant avant de pointer votre sortie ?
          </p>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={async () => {
                setPerfCheckDialog(false)
                await doCheckout()
              }}
            >
              Non, ignorer pour l&apos;instant
            </Button>
            <Button
              className="w-full sm:w-auto bg-[#002952] hover:bg-[#003b7a] text-white"
              onClick={() => {
                setPerfCheckDialog(false)
                window.location.href = "/dashboard/rh/performance"
              }}
            >
              <Target className="h-4 w-4 mr-2 shrink-0" />
              Oui, remplir maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog création/édition (Admin uniquement) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Modifier la présence" : "Ajouter une présence"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editTarget && (
              <div>
                <Label>Employé</Label>
                <Select value={form.userId} onValueChange={v => setForm(f => ({ ...f, userId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e._id} value={e._id}>{e.nom} — {e.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Heure d&apos;entrée</Label>
                <Input type="time" value={form.heureEntree} onChange={e => setForm(f => ({ ...f, heureEntree: e.target.value }))} />
              </div>
              <div>
                <Label>Heure de sortie</Label>
                <Input type="time" value={form.heureSortie} onChange={e => setForm(f => ({ ...f, heureSortie: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={v => setForm(f => ({ ...f, statut: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Présent</SelectItem>
                  <SelectItem value="retard">Retard</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="conge">Congé</SelectItem>
                  <SelectItem value="maladie">Maladie</SelectItem>
                  <SelectItem value="ferie">Férié</SelectItem>
                  <SelectItem value="non_defini">Non défini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editTarget ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
