/**
 * Local profile helpers (UI_REDESIGN.md 4.3). Pure, unit-tested.
 */

/** Name shown in the sidebar / greeting: the saved name, or the translated default. */
export function displayName(saved: string, fallback: string): string {
  return saved.trim() || fallback
}

/** Up to 2 initials from the name (first letter of the first two words), upper-case. */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
  return Array.from(letters).slice(0, 2).join('').toUpperCase()
}

/** Longest side of the stored profile photo in pixels (small: it lives in settings.json). */
export const PHOTO_SIZE = 128

/** Size to draw the picked photo at: fits in PHOTO_SIZE, keeps the aspect ratio, never upscales. */
export function photoTargetSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, PHOTO_SIZE / Math.max(width, height, 1))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}
