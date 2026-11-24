import type { Rect } from './types'

/**
 * Finds the pixels of the old text inside one OCR box (spec section 8, step 4).
 * Only these pixels are removed, so a face, photo or pattern behind/around the letters
 * stays exactly as it is.
 *
 * Method: Otsu threshold on the luminance of the box. The smaller of the two classes is
 * the text (a text line covers less area than its background), which also works for light
 * text on a dark background.
 */

/** Below this difference between the two class means (0–255) there is no clear text. */
export const MIN_CONTRAST = 40

export type TextMask = {
  /** Box size in px; `mask` is w × h, row by row. */
  w: number
  h: number
  /** 1 = text pixel (not dilated). */
  mask: Uint8Array
  /** Bounding box of the letters inside the box (box coordinates), or null if none. */
  ink: Rect | null
  /** Difference between the mean luminance of text and background (0–255). */
  contrast: number
  /** True when the text is darker than its background. */
  textIsDark: boolean
  /** Otsu threshold: luminance ≤ threshold is the dark class. */
  threshold: number
}

/** True when a pixel of luminance `l` belongs to the text class of `tm`. */
export const isTextLum = (tm: Pick<TextMask, 'threshold' | 'textIsDark'>, l: number): boolean =>
  l <= tm.threshold === tm.textIsDark

export const lum =(r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b

/** Otsu threshold of a 256-bin histogram: values ≤ threshold are one class. */
export function otsuThreshold(hist: readonly number[], total: number): number {
  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * (hist[i] ?? 0)
  let sumB = 0
  let wB = 0
  let best = 0
  let bestVar = -1
  for (let t = 0; t < 256; t++) {
    wB += hist[t] ?? 0
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * (hist[t] ?? 0)
    const mB = sumB / wB
    const mF = (sumAll - sumB) / wF
    const between = wB * wF * (mB - mF) ** 2
    if (between > bestVar) {
      bestVar = between
      best = t
    }
  }
  return best
}

/**
 * Rows/columns with only a stray pixel or two are noise (JPEG speckles, a photo edge),
 * not letters; they must not stretch the ink box.
 */
export function inkBox(mask: Uint8Array, w: number, h: number): Rect | null {
  const minRow = Math.max(1, Math.round(w * 0.01))
  let top = -1
  let bottom = -1
  for (let y = 0; y < h; y++) {
    let n = 0
    for (let x = 0; x < w; x++) n += mask[y * w + x] ?? 0
    if (n >= minRow) {
      if (top < 0) top = y
      bottom = y
    }
  }
  if (top < 0) return null
  let left = w
  let right = -1
  for (let y = top; y <= bottom; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }
  if (right < left) return null
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
}

/** Text mask of an RGBA box image (`w` × `h`). */
export function textMask(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): TextMask {
  const n = w * h
  const lums = new Uint8Array(n)
  const hist = new Array<number>(256).fill(0)
  for (let i = 0; i < n; i++) {
    const v = Math.round(lum(rgba[i * 4] ?? 0, rgba[i * 4 + 1] ?? 0, rgba[i * 4 + 2] ?? 0))
    lums[i] = v
    hist[v] = (hist[v] ?? 0) + 1
  }
  const empty: TextMask = { w, h, mask: new Uint8Array(n), ink: null, contrast: 0, textIsDark: true, threshold: 0 }
  if (n === 0) return empty

  const t = otsuThreshold(hist, n)
  let darkN = 0
  let darkSum = 0
  let lightSum = 0
  for (let i = 0; i < n; i++) {
    const v = lums[i] ?? 0
    if (v <= t) {
      darkN++
      darkSum += v
    } else lightSum += v
  }
  const lightN = n - darkN
  if (darkN === 0 || lightN === 0) return empty
  const contrast = lightSum / lightN - darkSum / darkN
  const textIsDark = darkN <= lightN

  const mask = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const dark = (lums[i] ?? 0) <= t
    mask[i] = dark === textIsDark ? 1 : 0
  }
  return { w, h, mask, ink: inkBox(mask, w, h), contrast, textIsDark, threshold: t }
}

/** Dilation radius in px: 2 for small text, 3 for bigger text (covers anti-aliased edges). */
export const dilateRadius = (boxHeight: number): number => (boxHeight < 30 ? 2 : 3)

/** Square dilation by `r` px. The result never leaves the w × h area. */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  // Separable max filter: horizontal pass, then vertical pass.
  const tmp = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(w - 1, x + r)
      for (let xx = x0; xx <= x1; xx++) tmp[y * w + xx] = 1
    }
  }
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!tmp[y * w + x]) continue
      const y0 = Math.max(0, y - r)
      const y1 = Math.min(h - 1, y + r)
      for (let yy = y0; yy <= y1; yy++) out[yy * w + x] = 1
    }
  }
  return out
}

/** True when the box has clearly visible letters (enough contrast, some ink). */
export const hasClearText = (tm: TextMask): boolean => tm.contrast >= MIN_CONTRAST && tm.ink !== null

/**
 * The area to remove inside the box: the dilated text mask, or the whole box when no
 * clear text is found (very low contrast) so the old text never stays behind silently.
 */
export function removalMask(tm: TextMask): Uint8Array {
  if (!hasClearText(tm)) return new Uint8Array(tm.w * tm.h).fill(1)
  return dilate(tm.mask, tm.w, tm.h, dilateRadius(tm.h))
}

const toHex = (n: number): string => Math.round(n).toString(16).padStart(2, '0')

/**
 * Color of the old text: median of the text pixels that differ most from the background
 * (the inner half of the strokes; anti-aliased edges are mixed with the paper color).
 * Returns null when there are no text pixels.
 */
export function maskTextColor(
  rgba: Uint8ClampedArray | Uint8Array,
  tm: Pick<TextMask, 'mask' | 'textIsDark'>
): string | null {
  const px: { l: number; r: number; g: number; b: number }[] = []
  for (let i = 0; i < tm.mask.length; i++) {
    if (!tm.mask[i]) continue
    const r = rgba[i * 4] ?? 0
    const g = rgba[i * 4 + 1] ?? 0
    const b = rgba[i * 4 + 2] ?? 0
    px.push({ l: lum(r, g, b), r, g, b })
  }
  if (px.length === 0) return null
  // Strongest strokes first: darkest for dark text, lightest for light text.
  px.sort((a, b) => (tm.textIsDark ? a.l - b.l : b.l - a.l))
  const core = px.slice(0, Math.max(1, Math.ceil(px.length / 2)))
  const med = (k: 'r' | 'g' | 'b'): number => {
    const v = core.map((p) => p[k]).sort((a, b) => a - b)
    return v[Math.floor(v.length / 2)] ?? 0
  }
  return `#${toHex(med('r'))}${toHex(med('g'))}${toHex(med('b'))}`
}
