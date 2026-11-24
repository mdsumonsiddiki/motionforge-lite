import { BUNDLED_FONTS } from './types'

/**
 * Font list for the Document Editor dropdown (spec section 8):
 * bundled OFL fonts first, then fonts installed on Windows.
 * Installed fonts come from the Local Font Access API; if it is unavailable,
 * only the bundled fonts are offered.
 */

type LocalFont = { family: string }
type FontQuery = () => Promise<LocalFont[]>

/** Merges bundled + system families: no duplicates, system ones sorted. */
export function mergeFontLists(bundled: readonly string[], system: readonly string[]): string[] {
  const seen = new Set(bundled.map((f) => f.toLowerCase()))
  const extra = [...new Set(system)]
    .filter((f) => f.trim() && !seen.has(f.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
  return [...bundled, ...extra]
}

let cached: Promise<string[]> | null = null

export function loadFontList(): Promise<string[]> {
  if (!cached) {
    cached = (async () => {
      const query = (window as unknown as { queryLocalFonts?: FontQuery }).queryLocalFonts
      if (!query) return [...BUNDLED_FONTS]
      try {
        const fonts = await query()
        return mergeFontLists(BUNDLED_FONTS, fonts.map((f) => f.family))
      } catch {
        return [...BUNDLED_FONTS]
      }
    })()
  }
  return cached
}
