import { describe, expect, it } from 'vitest'
import { dilate, maskTextColor, MIN_CONTRAST, otsuThreshold, removalMask, textMask } from './textMask'

const W = 30
const H = 12

/** W×H image: background color, with "letters" (two strokes) drawn in text color. */
function lineImage(bg: number[], fg: number[]): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Letters: rows 3..8, columns 5..9 and 15..19
      const letter = y >= 3 && y <= 8 && ((x >= 5 && x <= 9) || (x >= 15 && x <= 19))
      px.set([...(letter ? fg : bg), 255], (y * W + x) * 4)
    }
  }
  return px
}

describe('otsuThreshold', () => {
  it('splits two clear groups', () => {
    const hist = new Array<number>(256).fill(0)
    hist[20] = 30
    hist[230] = 70
    const t = otsuThreshold(hist, 100)
    expect(t).toBeGreaterThanOrEqual(20)
    expect(t).toBeLessThan(230)
  })
})

describe('textMask', () => {
  it('finds exactly the dark letter pixels on white paper', () => {
    const tm = textMask(lineImage([250, 250, 250], [20, 20, 20]), W, H)
    expect(tm.textIsDark).toBe(true)
    expect(tm.contrast).toBeGreaterThan(MIN_CONTRAST)
    expect(tm.mask[4 * W + 6]).toBe(1) // inside a letter
    expect(tm.mask[4 * W + 12]).toBe(0) // between letters
    expect(tm.mask[0]).toBe(0) // paper
    expect(tm.ink).toEqual({ x: 5, y: 3, w: 15, h: 6 })
  })

  it('finds light letters on a dark background', () => {
    const tm = textMask(lineImage([15, 15, 40], [240, 240, 240]), W, H)
    expect(tm.textIsDark).toBe(false)
    expect(tm.mask[4 * W + 6]).toBe(1)
    expect(tm.mask[0]).toBe(0)
  })

  it('gives no ink for an empty box', () => {
    expect(textMask(new Uint8ClampedArray(), 0, 0).ink).toBeNull()
    expect(textMask(lineImage([200, 200, 200], [200, 200, 200]), W, H).ink).toBeNull()
  })
})

describe('dilate', () => {
  it('grows the mask by r px and never leaves the area', () => {
    const m = new Uint8Array(5 * 5)
    m[0] = 1 // corner pixel
    const d = dilate(m, 5, 5, 2)
    expect(d.length).toBe(25)
    expect(d[2 * 5 + 2]).toBe(1)
    expect(d[3 * 5 + 3]).toBe(0)
  })
})

describe('removalMask', () => {
  it('is the dilated letters, not the whole box', () => {
    const tm = textMask(lineImage([250, 250, 250], [20, 20, 20]), W, H)
    const rm = removalMask(tm)
    expect(rm[4 * W + 6]).toBe(1) // letter
    expect(rm[4 * W + 11]).toBe(1) // 2 px next to a letter (anti-aliased edge)
    expect(rm[4 * W + 12]).toBe(0) // gap between the letters is kept
    expect(rm[0]).toBe(0) // far corner kept
  })

  it('falls back to the whole box when there is no clear text', () => {
    const tm = textMask(lineImage([120, 120, 120], [130, 130, 130]), W, H)
    expect(removalMask(tm).every((v) => v === 1)).toBe(true)
  })
})

describe('maskTextColor', () => {
  it('uses the text pixels, not the paper', () => {
    const px = lineImage([250, 250, 250], [10, 20, 120])
    expect(maskTextColor(px, textMask(px, W, H))).toBe('#0a1478')
  })

  it('works for light text', () => {
    const px = lineImage([10, 10, 10], [250, 200, 0])
    expect(maskTextColor(px, textMask(px, W, H))).toBe('#fac800')
  })
})
