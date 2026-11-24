import { describe, expect, it } from 'vitest'
import {
  fitFontSize,
  fontCss,
  LINE_HEIGHT,
  lineCenters,
  MIN_FIT_FONT_PX,
  renderDocument,
  type RenderAssets
} from './render'
import type { Layer } from './types'

describe('render helpers', () => {
  it('builds a quoted CSS font', () => {
    expect(fontCss(24, 'Noto Sans Bengali')).toBe('24px "Noto Sans Bengali"')
    expect(fontCss(10, 'Bad"Name')).toBe('10px "BadName"')
  })

  it('centres one line in the box and stacks more lines around the centre', () => {
    expect(lineCenters(100, 40, 20, 1)).toEqual([120])
    const step = 20 * LINE_HEIGHT
    expect(lineCenters(100, 40, 20, 2)).toEqual([120 - step / 2, 120 + step / 2])
  })
})

describe('renderDocument', () => {
  /** Minimal 2D context that records the drawing calls in order. */
  function fakeCtx(calls: string[]) {
    return {
      font: '',
      fillStyle: '',
      textBaseline: '',
      clearRect: () => calls.push('clear'),
      drawImage: () => calls.push('image'),
      putImageData: (_img: unknown, x: number, y: number) => calls.push(`patch@${x},${y}`),
      fillText: (text: string) => calls.push(`text:${text}`),
      measureText: (text: string) => ({ width: text.length }),
      save: () => undefined,
      restore: () => undefined
    } as unknown as CanvasRenderingContext2D
  }
  const text = (id: string, y: number, value: string): Layer => ({
    id,
    kind: 'text',
    boxId: `box-${id}`,
    rect: { x: 0, y, w: 500, h: 20 },
    text: value,
    fontFamily: 'Noto Sans',
    fontSize: 16,
    color: '#000000'
  })
  const patch = (y: number) => ({ x: 0, y, image: {} as ImageData })

  it('draws every removal patch before any new text', () => {
    // Line B's padded patch overlaps line A; it must not cover A's new text.
    const calls: string[] = []
    const assets: RenderAssets = {
      original: { width: 600, height: 100 } as ImageBitmap,
      patches: new Map([
        ['box-a', patch(7)],
        ['box-b', patch(27)]
      ]),
      failedPatches: new Set(),
      images: new Map()
    }
    renderDocument(fakeCtx(calls), [text('a', 10, 'A'), text('b', 30, 'B')], assets)
    expect(calls).toEqual(['clear', 'image', 'patch@0,7', 'patch@0,27', 'text:A', 'text:B'])
  })

  it('waits for a pending patch, but draws text whose removal failed', () => {
    const calls: string[] = []
    const assets: RenderAssets = {
      original: { width: 600, height: 100 } as ImageBitmap,
      patches: new Map(),
      failedPatches: new Set(['box-b']),
      images: new Map()
    }
    renderDocument(fakeCtx(calls), [text('a', 10, 'A'), text('b', 30, 'B')], assets)
    expect(calls).toEqual(['clear', 'image', 'text:B'])
  })
})

describe('fitFontSize', () => {
  // Fake font: every character is half the font size wide.
  const measure = (line: string, size: number): number => line.length * size * 0.5

  it('keeps the size when the text fits', () => {
    expect(fitFontSize(['short'], 20, { w: 200, h: 25 }, measure)).toBe(20)
  })

  it('shrinks a long line to the box width', () => {
    // 40 chars at 20px = 400px wide; box is 200px → 10px.
    const size = fitFontSize(['x'.repeat(40)], 20, { w: 200, h: 25 }, measure)
    expect(size).toBe(10)
    expect(measure('x'.repeat(40), size)).toBeLessThanOrEqual(200)
  })

  it('uses the widest line', () => {
    const size = fitFontSize(['abc', 'x'.repeat(40)], 20, { w: 200, h: 100 }, measure)
    expect(size).toBe(10)
  })

  it('shrinks several lines to the box height', () => {
    // 3 lines need 3 × size × 1.2 ≤ 36 → size ≤ 10.
    expect(fitFontSize(['a', 'b', 'c'], 20, { w: 500, h: 36 }, measure)).toBe(10)
  })

  it('never grows and never goes below the minimum', () => {
    expect(fitFontSize(['a'], 12, { w: 1000, h: 1000 }, measure)).toBe(12)
    expect(fitFontSize(['x'.repeat(1000)], 20, { w: 50, h: 25 }, measure)).toBe(MIN_FIT_FONT_PX)
  })
})
