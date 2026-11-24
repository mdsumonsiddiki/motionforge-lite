import type { Rect } from './types'

/**
 * Automatic text style matching (spec section 8, step 4).
 * User decision (2026-11-24): size and position come from the real letters (the text
 * mask's ink box), not from the OCR box height; the color from the text pixels.
 * The font itself is chosen by the user.
 */

/** Fallback when no letters were found: OCR line boxes include spacing, so 0.8 × height. */
const BOX_TO_FONT = 0.8
const MIN_FONT_PX = 6

export function estimateFontSize(boxHeight: number): number {
  return Math.max(MIN_FONT_PX, Math.round(boxHeight * BOX_TO_FONT))
}

/** Share of the darkest pixels treated as "text" when averaging the color (fallback). */
const DARK_SHARE = 0.2

const toHex = (n: number): string => Math.round(n).toString(16).padStart(2, '0')

/**
 * Fallback color: average of the darkest ~20% of pixels in an RGBA buffer
 * (fully transparent pixels ignored). Returns #000000 for an empty buffer.
 */
export function estimateTextColor(rgba: Uint8ClampedArray | Uint8Array): string {
  const pixels: { lum: number; r: number; g: number; b: number }[] = []
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if ((rgba[i + 3] ?? 0) === 0) continue
    const r = rgba[i] ?? 0
    const g = rgba[i + 1] ?? 0
    const b = rgba[i + 2] ?? 0
    pixels.push({ lum: 0.299 * r + 0.587 * g + 0.114 * b, r, g, b })
  }
  if (pixels.length === 0) return '#000000'
  pixels.sort((a, b) => a.lum - b.lum)
  const dark = pixels.slice(0, Math.max(1, Math.round(pixels.length * DARK_SHARE)))
  const sum = dark.reduce((s, p) => ({ r: s.r + p.r, g: s.g + p.g, b: s.b + p.b }), {
    r: 0,
    g: 0,
    b: 0
  })
  return `#${toHex(sum.r / dark.length)}${toHex(sum.g / dark.length)}${toHex(sum.b / dark.length)}`
}

/** Ink extents of a text at some font size (canvas TextMetrics actualBoundingBox*). */
export type InkMetrics = { ascent: number; descent: number; left: number }

/** Font size + where to draw (alphabetic baseline, left origin), in image pixels. */
export type MatchedPlacement = { fontSize: number; anchor: { x: number; y: number } }

/** Size at which the reference text is measured; metrics scale linearly with size. */
export const MEASURE_SIZE = 100

/**
 * Matches the new text to the old letters.
 * The old (OCR) text is measured in the chosen font; its ink height must equal the height
 * of the old letters in the image, which gives the font size. The baseline and left
 * origin then put the new ink where the old ink was.
 * @param box the OCR box (image coordinates)
 * @param ink the old letters' ink box, relative to `box`
 * @param measure ink metrics of `text` at MEASURE_SIZE in the chosen font
 * Returns null when the reference text has no measurable ink (caller falls back).
 */
export function matchPlacement(
  box: Rect,
  ink: Rect,
  referenceText: string,
  measure: (text: string) => InkMetrics
): MatchedPlacement | null {
  const m = measure(referenceText)
  const inkH = m.ascent + m.descent
  if (!(inkH > 0) || ink.h <= 0) return null
  const scale = ink.h / inkH
  // Never larger than 1.5 × the box height (a wrong OCR text must not blow it up).
  const fontSize = Math.max(MIN_FONT_PX, Math.min(MEASURE_SIZE * scale, box.h * 1.5))
  const s = fontSize / MEASURE_SIZE
  return {
    fontSize: Math.round(fontSize * 10) / 10,
    anchor: {
      x: Math.round((box.x + ink.x + m.left * s) * 10) / 10,
      y: Math.round((box.y + ink.y + m.ascent * s) * 10) / 10
    }
  }
}
