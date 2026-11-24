import { describe, expect, it } from 'vitest'
import { solidPixels, uniformRingColor } from './solidFill'

const W = 40
const H = 30
const MASK = { x: 10, y: 10, w: 20, h: 10 }

/** Image filled by `color(x, y)`, with black "text" inside the mask. */
function image(color: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inMask = x >= MASK.x && x < MASK.x + MASK.w && y >= MASK.y && y < MASK.y + MASK.h
      const [r, g, b] = inMask && (x + y) % 2 === 0 ? [0, 0, 0] : color(x, y)
      px.set([r, g, b, 255], (y * W + x) * 4)
    }
  }
  return px
}

describe('uniformRingColor', () => {
  it('finds the page color around text on a plain background', () => {
    expect(uniformRingColor(image(() => [250, 248, 240]), W, H, MASK)).toEqual([250, 248, 240])
  })

  it('ignores the old text inside the mask and a little noise around it', () => {
    // Slight paper noise (±10) is still one color.
    const noisy = image((x, y) => [245 + ((x * 7 + y * 3) % 11) - 5, 245, 245])
    expect(uniformRingColor(noisy, W, H, MASK)).not.toBeNull()
  })

  it('returns null for a patterned background (then TELEA is used)', () => {
    const stripes = image((x) => (x % 4 < 2 ? [255, 255, 255] : [40, 90, 200]))
    expect(uniformRingColor(stripes, W, H, MASK)).toBeNull()
  })

  it('returns null for a gradient that changes a lot around the box', () => {
    const gradient = image((x) => [x * 6, x * 6, x * 6])
    expect(uniformRingColor(gradient, W, H, MASK)).toBeNull()
  })

  it('returns null when the mask covers the whole image (nothing to sample)', () => {
    expect(uniformRingColor(image(() => [255, 255, 255]), W, H, { x: 0, y: 0, w: W, h: H })).toBeNull()
  })
})

describe('solidPixels', () => {
  it('fills an opaque buffer with one color', () => {
    const px = solidPixels(2, 1, [1, 2, 3])
    expect([...px]).toEqual([1, 2, 3, 255, 1, 2, 3, 255])
  })
})
