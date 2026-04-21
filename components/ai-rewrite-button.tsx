"use client"

import { useState, useRef } from "react"
import { Sparkles, Check, RotateCcw, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "react-hot-toast"

interface AIRewriteButtonProps {
  /** Retourne le texte actuel à réécrire */
  getValue: () => string
  /** Appelé avec le texte amélioré quand l'utilisateur accepte */
  onApply: (text: string) => void
  disabled?: boolean
}

/**
 * Petit bouton icône ✨ qui appelle /api/rewrite et affiche la suggestion dans un popover.
 * Conçu pour être placé à côté d'un Label sans modifier la structure du formulaire existant.
 */
export function AIRewriteButton({ getValue, onApply, disabled = false }: AIRewriteButtonProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [usedModel, setUsedModel] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const isSubmitting = useRef(false)

  const handleRewrite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isSubmitting.current || isLoading) return

    const text = getValue().trim()
    if (!text) {
      toast.error("Saisissez un texte avant d'améliorer.")
      return
    }

    isSubmitting.current = true
    setIsLoading(true)
    setSuggestion(null)
    setUsedModel(null)
    setOpen(true)

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Erreur lors de la réécriture.")
      setSuggestion(data.result)
      setUsedModel(data.model)
    } catch (err: any) {
      toast.error(err?.message ?? "Une erreur est survenue.")
      setOpen(false)
    } finally {
      setIsLoading(false)
      isSubmitting.current = false
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

  const handleDiscard = () => {
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || isLoading}
          onClick={handleRewrite}
          title="Améliorer avec l'IA ✨"
          className="inline-flex items-center justify-center rounded-full p-0.5 text-purple-400 hover:text-purple-600 dark:text-purple-500 dark:hover:text-purple-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          {isLoading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
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
        {isLoading && !suggestion && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            Amélioration en cours...
          </div>
        )}

        {suggestion && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Suggestion IA
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
                onClick={handleDiscard}
                className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Ignorer
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
