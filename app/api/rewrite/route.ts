import { NextRequest, NextResponse } from "next/server"

const SYSTEM_PROMPT =
  "Tu es un assistant professionnel. Reformule le texte suivant pour le rendre plus professionnel, formel et fluide. Réponds uniquement avec le texte modifié, sans introduction ni conclusion."

const TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ])
}

// ─── Niveau 1 : Groq (openai/gpt-oss-20b) ────────────────────────────────────
async function tryGroq(text: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY non configurée")

  const res = await withTimeout(
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.5,
        max_tokens: 1024,
      }),
    }),
    TIMEOUT_MS
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const result = data?.choices?.[0]?.message?.content?.trim()
  if (!result) throw new Error("Groq: réponse vide")
  return result
}

// ─── Niveau 2 : Google Gemini (gemini-3-flash-preview) ───────────────────────
async function tryGemini(text: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurée")

  const res = await withTimeout(
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              parts: [{ text }],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1024,
          },
        }),
      }
    ),
    TIMEOUT_MS
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!result) throw new Error("Gemini: réponse vide")
  return result
}

// ─── Niveau 3 : OpenAI (gpt-3.5-turbo) ──────────────────────────────────────
async function tryOpenAI(text: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY non configurée")

  const res = await withTimeout(
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.5,
        max_tokens: 1024,
      }),
    }),
    TIMEOUT_MS
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const result = data?.choices?.[0]?.message?.content?.trim()
  if (!result) throw new Error("OpenAI: réponse vide")
  return result
}

// ─── Handler principal ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text = (body?.text ?? "").trim()

    if (!text) {
      return NextResponse.json(
        { error: "Le texte est requis." },
        { status: 400 }
      )
    }

    if (text.length > 4000) {
      return NextResponse.json(
        { error: "Le texte est trop long (4000 caractères max)." },
        { status: 400 }
      )
    }

    const levels = [
      { name: "Groq (openai/gpt-oss-20b)", fn: () => tryGroq(text) },
      { name: "Gemini (gemini-3-flash-preview)", fn: () => tryGemini(text) },
      { name: "OpenAI (gpt-3.5-turbo)", fn: () => tryOpenAI(text) },
    ]

    const errors: string[] = []

    for (const level of levels) {
      try {
        const result = await level.fn()
        console.log(`[rewrite] ✅ Réponse fournie par : ${level.name}`)
        return NextResponse.json({ result, model: level.name })
      } catch (err: any) {
        console.warn(`[rewrite] ⚠️ ${level.name} échoué : ${err.message}`)
        errors.push(`${level.name}: ${err.message}`)
      }
    }

    console.error("[rewrite] ❌ Tous les modèles ont échoué.", errors)
    return NextResponse.json(
      {
        error: "Impossible de réécrire le texte pour le moment. Réessayez dans quelques instants.",
        details: errors,
      },
      { status: 503 }
    )
  } catch (err: any) {
    console.error("[rewrite] Erreur serveur :", err)
    return NextResponse.json(
      { error: "Erreur serveur inattendue." },
      { status: 500 }
    )
  }
}
