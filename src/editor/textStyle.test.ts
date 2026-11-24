import { describe, expect, it } from 'vitest'
import { estimateFontSize, estimateTextColor, matchPlacement, MEASURE_SIZE } from './textStyle'

/** n pixels of one RGBA color. */
function pixels(n: number, [r, g, b, a = 255]: number[]): number[] {
  return Array.from({ length: n }, () => [r, g, b, a]).flat()
}

describe('textStyle fallbacks', () => {
  it('derives font size from the box height', () => {
    expect(estimateFontSize(40)).toBe(32)
    expect(estimateFontSize(2)).toBe(6)
  })

  it('picks the dark text color, not the paper color', () => {
    const data = Uint8ClampedArray.from([...pixels(80, [250, 250, 250]), ...pixels(20, [10, 20, 120])])
    expect(estimateTextColor(data)).toBe('#0a1478')
  })

  it('ignores transparent pixels and handles empty input', () => {
    const data = Uint8ClampedArray.from([...pixels(10, [0, 0, 0, 0]), ...pixels(5, [200, 0, 0])])
    expect(estimateTextColor(data)).toBe('#c80000')
    expect(estimateTextColor(new Uint8ClampedArray())).toBe('#000000')
  })
})

describe('matchPlacement', () => {
  // Fake font: at MEASURE_SIZE the text's ink is 70 px above and 20 px below the baseline,
  // and starts 5 px right of the origin (actualBoundingBoxLeft = -5).
  const measure = () => ({ ascent: 70, descent: 20, left: -5 })
  const box = { x: 100, y: 200, w: 300, h: 60 }

  it('sizes the font from the letter height, not the box height', () => {
    // Letters are 27 px tall inside a 60 px box → 27 / 90 × 100 = 30 px font.
    const placed = matchPlacement(box, { x: 10, y: 15, w: 200, h: 27 }, 'old', measure)
    expect(placed?.fontSize).toBe(30)
    expect(placed!.fontSize).toBeLessThan(estimateFontSize(box.h))
  })

  it('puts the baseline and left edge where the old letters were', () => {
    const placed = matchPlacement(box, { x: 10, y: 15, w: 200, h: 27 }, 'old', measure)
    const s = 30 / MEASURE_SIZE
    // Ink top (200 + 15) + ascent (70 × 0.3 = 21) → baseline 236.
    expect(placed?.anchor.y).toBeCloseTo(200 + 15 + 70 * s, 1)
    // Ink starts 5 × 0.3 px right of the origin → origin = 110 - 1.5.
    expect(placed?.anchor.x).toBeCloseTo(110 - 5 * s, 1)
  })

  it('never makes the font bigger than 1.5 × the box height', () => {
    const tiny = () => ({ ascent: 1, descent: 0, left: 0 })
    expect(matchPlacement(box, { x: 0, y: 0, w: 10, h: 50 }, 'x', tiny)?.fontSize).toBe(90)
  })

  it('returns null when the reference text has no ink', () => {
    expect(matchPlacement(box, { x: 0, y: 0, w: 10, h: 20 }, ' ', () => ({ ascent: 0, descent: 0, left: 0 }))).toBeNull()
  })
})
