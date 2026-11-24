/**
 * Plain-background check for text removal (spec section 8, step 4).
 * If the background pixels next to the letters are (almost) one color — e.g. a white page —
 * the letter pixels are simply filled with that color: clean, exact and fast. A patterned
 * or textured background (a photo, a face) goes to OpenCV TELEA inpainting instead.
 */

/** Max difference per channel from the median color for a pixel to count as "same color". */
export const COLOR_TOLERANCE = 24
/** Share of background pixels that must match the median color. */
export const UNIFORM_SHARE = 0.9
/** Fewer background pixels than this → not enough evidence, use inpainting. */
export const MIN_SAMPLE_PIXELS = 8

export type Rgb = [number, number, number]

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/**
 * The single color of the sampled background pixels, or null when they are not one color.
 * @param rgba RGBA image
 * @param indices pixel indices (not byte offsets) of the background samples
 */
export function uniformColor(rgba: Uint8ClampedArray | Uint8Array, indices: readonly number[]): Rgb | null {
  if (indices.length < MIN_SAMPLE_PIXELS) return null
  const r = indices.map((i) => rgba[i * 4] ?? 0)
  const g = indices.map((i) => rgba[i * 4 + 1] ?? 0)
  const b = indices.map((i) => rgba[i * 4 + 2] ?? 0)
  const color: Rgb = [median(r), median(g), median(b)]
  let matching = 0
  for (let k = 0; k < indices.length; k++) {
    const d = Math.max(
      Math.abs((r[k] ?? 0) - color[0]),
      Math.abs((g[k] ?? 0) - color[1]),
      Math.abs((b[k] ?? 0) - color[2])
    )
    if (d <= COLOR_TOLERANCE) matching++
  }
  return matching / indices.length >= UNIFORM_SHARE ? color : null
}
