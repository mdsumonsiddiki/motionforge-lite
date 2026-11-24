/**
 * Automatic text style matching (spec section 8, step 4):
 *  - size from the OCR box height
 *  - color from the dark pixels inside the box (the old text strokes)
 * The font itself is chosen by the user.
 */

/** OCR line boxes include ascenders/descenders; the font size is a bit smaller than the box. */
const BOX_TO_FONT = 0.8
const MIN_FONT_PX = 6

export function estimateFontSize(boxHeight: number): number {
  return Math.max(MIN_FONT_PX, Math.round(boxHeight * BOX_TO_FONT))
}

/** Share of the darkest pixels treated as "text" when averaging the color. */
const DARK_SHARE = 0.2

const toHex = (n: number): string => Math.round(n).toString(16).padStart(2, '0')

/**
 * Average color of the darkest ~20% of pixels in an RGBA buffer (fully transparent pixels ignored).
 * Returns #000000 for an empty buffer.
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
