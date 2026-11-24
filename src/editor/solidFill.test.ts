import { describe, expect, it } from 'vitest'
import { MIN_SAMPLE_PIXELS, uniformColor } from './solidFill'

/** RGBA buffer of n pixels from color(i). */
function pixels(n: number, color: (i: number) => number[]): Uint8ClampedArray {
  const px = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) px.set([...color(i), 255], i * 4)
  return px
}
const all = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('uniformColor', () => {
  it('finds the page color of a plain background', () => {
    expect(uniformColor(pixels(50, () => [250, 248, 240]), all(50))).toEqual([250, 248, 240])
  })

  it('accepts a little paper noise', () => {
    const noisy = pixels(50, (i) => [245 + ((i * 7) % 11) - 5, 245, 245])
    expect(uniformColor(noisy, all(50))).not.toBeNull()
  })

  it('only looks at the given sample pixels', () => {
    // Pixels 0..9 are black text (not sampled), the rest is white.
    const px = pixels(50, (i) => (i < 10 ? [0, 0, 0] : [255, 255, 255]))
    expect(uniformColor(px, all(50).slice(10))).toEqual([255, 255, 255])
  })

  it('returns null for a pattern or a strong gradient', () => {
    expect(uniformColor(pixels(50, (i) => (i % 4 < 2 ? [255, 255, 255] : [40, 90, 200])), all(50))).toBeNull()
    expect(uniformColor(pixels(50, (i) => [i * 5, i * 5, i * 5]), all(50))).toBeNull()
  })

  it('returns null when there are too few samples', () => {
    expect(uniformColor(pixels(50, () => [255, 255, 255]), all(MIN_SAMPLE_PIXELS - 1))).toBeNull()
  })
})
