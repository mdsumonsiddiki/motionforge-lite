import type { Rect } from './types'

/**
 * Plain-background check for text removal (spec section 8, step 4).
 * If the pixels right around the mask are (almost) one color — e.g. a white page — the
 * mask is simply filled with that color: clean, exact and fast. Only a patterned or
 * textured background goes to OpenCV TELEA inpainting.
 */

/** Width of the ring around the mask that is sampled, in px. */
export const RING_WIDTH = 4
/** Max difference per channel from the median color for a pixel to count as "same color". */
export const COLOR_TOLERANCE = 24
/** Share of ring pixels that must match the median color. */
export const UNIFORM_SHARE = 0.9
/** Fewer ring pixels than this → not enough evidence, use inpainting. */
const MIN_RING_PIXELS = 8

export type Rgb = [number, number, number]

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/**
 * The single background color around `mask` inside an RGBA image (`width` × `height`),
 * or null when the surroundings are not one color.
 */
export function uniformRingColor(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  mask: Rect
): Rgb | null {
  const r: number[] = []
  const g: number[] = []
  const b: number[] = []
  const x0 = Math.max(0, mask.x - RING_WIDTH)
  const y0 = Math.max(0, mask.y - RING_WIDTH)
  const x1 = Math.min(width, mask.x + mask.w + RING_WIDTH)
  const y1 = Math.min(height, mask.y + mask.h + RING_WIDTH)
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const inMask = x >= mask.x && x < mask.x + mask.w && y >= mask.y && y < mask.y + mask.h
      if (inMask) continue
      const i = (y * width + x) * 4
      r.push(rgba[i] ?? 0)
      g.push(rgba[i + 1] ?? 0)
      b.push(rgba[i + 2] ?? 0)
    }
  }
  if (r.length < MIN_RING_PIXELS) return null

  const color: Rgb = [median(r), median(g), median(b)]
  let matching = 0
  for (let i = 0; i < r.length; i++) {
    const d = Math.max(
      Math.abs((r[i] ?? 0) - color[0]),
      Math.abs((g[i] ?? 0) - color[1]),
      Math.abs((b[i] ?? 0) - color[2])
    )
    if (d <= COLOR_TOLERANCE) matching++
  }
  return matching / r.length >= UNIFORM_SHARE ? color : null
}

/** An opaque RGBA buffer of `w` × `h` pixels in one color. */
export function solidPixels(w: number, h: number, [r, g, b]: Rgb): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < out.length; i += 4) {
    out[i] = r
    out[i + 1] = g
    out[i + 2] = b
    out[i + 3] = 255
  }
  return out
}
