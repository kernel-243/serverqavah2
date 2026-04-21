"use client"

import { useState, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sparkles, RotateCcw, Check, Copy } from "lucide-react"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

interface ProfessionalInputProps {
  /** Valeur initiale du textarea */
  value: string
  /** Appelé quand la valeur change (saisie manuelle ou après acceptation) */
  onChange: (value: string) => void
  /** Label affiché au-dessus */
  label?: string
  /** Placeholder du textarea */
  placeholder?: string
  /** Nombre de lignes du textarea */
  rows?: number
  /** Classes CSS supplémentaires pour le conteneur */
  className?: string
  /** Désactiver le composant */
  disabled?: boolean
}

export function ProfessionalInput({
  value,
  onChange,
  label,
  placeholder = "Saisissez votre texte ici...",
  rows = 4,
  className,
  disabled = false,
}: ProfessionalInputProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [usedModel, setUsedModel] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSubmitting = useRef(false)

  const handleRewrite = async () => {
    // Protection anti-double-clic
    if (isSubmitting.current || isLoading) return
    const trimmed = value.trim()
    if (!trimmed) {
      toast.error("Saisissez un texte avant d'améliorer.")
      return
    }

    isSubmitting.current = true
    setIsLoading(true)
    setError(null)
    setSuggestion(null)
    setUsedModel(null)

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error ?? "Erreur lors de la réécriture.")
      }

      setSuggestion(data.result)
      setUsedModel(data.model)
    } catch (err: any) {
      const msg = err?.message ?? "Une erreur est survenue."
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
      isSubmitting.current = false
    }
  }

  const handleAccept = () => {
    if (suggestion) {
      onChange(suggestion)
      setSuggestion(null)
      setUsedModel(null)
      toast.success("Texte amélioré appliqué.")
    }
  }

  const handleDiscard = () => {
    setSuggestion(null)
    setUsedModel(null)
    setError(null)
  }

  const handleCopySuggestion = () => {
    if (suggestion) {
      navigator.clipboard.writeText(suggestion)
      toast.success("Copié dans le presse-papiers.")
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
        </Label>
      )}

      {/* Zone de saisie originale */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || isLoading}
          className="resize-none pr-2 dark:bg-gray-800 dark:border-gray-600"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {value.trim().length} / 4000 caractères
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRewrite}
            disabled={disabled || isLoading || !value.trim()}
            className="gap-1.5 text-sm border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
          >
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                Amélioration...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Améliorer le texte ✨
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Suggestion IA */}
      {suggestion && (
        <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Suggestion IA
              {usedModel && (
                <span className="font-normal text-purple-500 dark:text-purple-400">
                  — via {usedModel}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={handleCopySuggestion}
              className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 transition-colors"
              title="Copier la suggestion"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
            {suggestion}
          </p>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              Utiliser ce texte
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDiscard}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Ignorer
            </Button>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && !suggestion && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}
