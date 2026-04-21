"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Square, Sparkles, Check, RotateCcw, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "react-hot-toast"

interface VoiceInputButtonProps {
  /** Retourne le texte actuel du champ (pour concaténer avec la transcription) */
  getValue: () => string
  /** Appelé en temps réel pendant l'enregistrement (transcription en cours) */
  onUpdate: (text: string) => void
  /** Appelé quand l'utilisateur accepte la version IA améliorée */
  onApply: (text: string) => void
  disabled?: boolean
  /** Langue de reconnaissance, défaut fr-FR */
  lang?: string
}

/**
 * Bouton microphone 🎤 qui :
 * 1. Enregistre la voix et transcrit en temps réel dans le champ
 * 2. À l'arrêt, envoie automatiquement le texte à /api/rewrite
 * 3. Affiche la suggestion IA dans un popover (Appliquer / Garder original)
 */
export function VoiceInputButton({
  getValue,
  onUpdate,
  onApply,
  disabled = false,
  lang = "fr-FR",
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [usedModel, setUsedModel] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  const recognitionRef = useRef<any>(null)
  // Texte de base (avant enregistrement) + finals confirmés
  const baseTextRef = useRef<string>("")
  const isAISubmitting = useRef(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      if (!SR) setIsSupported(false)
    }
  }, [])

  // ── Amélioration IA automatique après enregistrement ──────────────────────
  const triggerAI = async (text: string) => {
    if (isAISubmitting.current || !text.trim()) return
    isAISubmitting.current = true
    setIsProcessing(true)
    setOpen(true)
    setSuggestion(null)
    setUsedModel(null)

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Erreur lors de l'amélioration.")
      setSuggestion(data.result)
      setUsedModel(data.model)
    } catch (err: any) {
      toast.error(err?.message ?? "Impossible d'améliorer le texte.")
      setOpen(false)
    } finally {
      setIsProcessing(false)
      isAISubmitting.current = false
    }
  }

  // ── Démarrer l'enregistrement ─────────────────────────────────────────────
  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      toast.error("Reconnaissance vocale non supportée. Utilisez Chrome ou Edge.")
      return
    }

    // Sauvegarder le texte existant comme base
    baseTextRef.current = getValue()

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsRecording(true)
      toast.success("🎤 Parlez maintenant...", { duration: 2500 })
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += t
        } else {
          interimTranscript += t
        }
      }

      // Ajouter les résultats finaux à la base
      if (finalTranscript) {
        const sep =
          baseTextRef.current && !baseTextRef.current.endsWith(" ") ? " " : ""
        baseTextRef.current = (baseTextRef.current + sep + finalTranscript).trim()
      }

      // Afficher base + interim dans le champ en temps réel
      const display = interimTranscript
        ? `${baseTextRef.current}${baseTextRef.current ? " " : ""}${interimTranscript}`
        : baseTextRef.current
      onUpdate(display)
    }

    recognition.onerror = (event: any) => {
      // Ignorer les erreurs silencieuses
      if (event.error === "no-speech") return
      if (event.error !== "aborted") {
        toast.error(`Erreur micro : ${event.error}`)
      }
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
      // Déclencher l'IA automatiquement avec le texte transcrit final
      const finalText = baseTextRef.current
      if (finalText.trim()) {
        triggerAI(finalText)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isRecording) {
      stopRecording()
    } else if (!isProcessing) {
      startRecording()
    }
  }

  const handleAccept = () => {
    if (suggestion) {
      onApply(suggestion)
      setSuggestion(null)
      setUsedModel(null)
      setOpen(false)
      toast.success("Texte amélioré appliqué.")
    }
  }

  const handleKeepOriginal = () => {
    // Le texte transcrit est déjà dans le champ via onUpdate
    setSuggestion(null)
    setUsedModel(null)
    setOpen(false)
  }

  const handleCopy = () => {
    if (suggestion) {
      navigator.clipboard.writeText(suggestion)
      toast.success("Copié !")
    }
  }

  // Ne pas afficher si le navigateur ne supporte pas
  if (!isSupported) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={handleClick}
          title={
            isRecording
              ? "Arrêter l'enregistrement"
              : "Dicter par la voix 🎤"
          }
          className={`inline-flex items-center justify-center rounded-full p-0.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            isRecording
              ? "text-red-500 dark:text-red-400"
              : isProcessing
              ? "text-blue-300 dark:text-blue-500"
              : "text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
          }`}
        >
          {isRecording ? (
            <Square className="h-3.5 w-3.5 fill-current animate-pulse" />
          ) : isProcessing ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-3 space-y-3 shadow-lg"
        align="start"
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        {/* État : amélioration IA en cours */}
        {isProcessing && !suggestion && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            Amélioration IA en cours...
          </div>
        )}

        {/* Suggestion prête */}
        {suggestion && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Version améliorée
                {usedModel && (
                  <span className="font-normal text-purple-400 dark:text-purple-500 text-[10px] ml-1">
                    — {usedModel.split(" ")[0]}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                title="Copier"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>

            <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto rounded bg-gray-50 dark:bg-gray-800 p-2">
              {suggestion}
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleAccept}
                className="gap-1 h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Check className="h-3 w-3" />
                Appliquer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleKeepOriginal}
                className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Garder original
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
