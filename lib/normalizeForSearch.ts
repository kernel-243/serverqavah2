/**
 * Normalise une chaîne pour la recherche : supprime les accents, met en minuscule.
 * Ex : "angélique" → "angelique", "ÉLODIE" → "elodie"
 */
export function normalizeForSearch(str: string): string {
  if (!str || typeof str !== 'string') return ''
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Vérifie si un texte contient le terme de recherche (insensible aux accents et à la casse).
 */
export function matchesSearch(text: string, query: string): boolean {
  if (!query) return true
  return normalizeForSearch(text).includes(normalizeForSearch(query))
}
