import { describe, expect, it } from 'vitest'
import { estimateFontSize, estimateTextColor } from './textStyle'

/** n pixels of one RGBA color. */
function pixels(n: number, [r, g, b, a = 255]: number[]): number[] {
  return Array.from({ length: n }, () => [r, g, b, a]).flat()
}

describe('textStyle', () => {
  it('derives font size from the box height', () => {
    expect(estimateFontSize(40)).toBe(32)
    expect(estimateFontSize(2)).toBe(6)
  })

  it('picks the dark text color, not the paper color', () => {
    // 80% white paper, 20% dark-blue ink.
    const data = Uint8ClampedArray.from([...pixels(80, [250, 250, 250]), ...pixels(20, [10, 20, 120])])
    expect(estimateTextColor(data)).toBe('#0a1478')
  })

  it('ignores transparent pixels and handles empty input', () => {
    const data = Uint8ClampedArray.from([...pixels(10, [0, 0, 0, 0]), ...pixels(5, [200, 0, 0])])
    expect(estimateTextColor(data)).toBe('#c80000')
    expect(estimateTextColor(new Uint8ClampedArray())).toBe('#000000')
  })
})
