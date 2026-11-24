import { describe, expect, it } from 'vitest'
import {
  fitFontSize,
  fontCss,
  LINE_HEIGHT,
  lineCenters,
  MIN_FIT_FONT_PX,
  patchKey,
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
  const ORIGINAL = { width: 600, height: 100 } as ImageBitmap
  const PATCH_IMG = { patch: true } as unknown as CanvasImageSource

  /** Minimal 2D context that records the drawing calls in order. */
  function fakeCtx(calls: string[]) {
    const ctx = {
      font: '',
      fillStyle: '',
      textBaseline: '',
      clearRect: () => calls.push('clear'),
      // Patches must be drawn with drawImage (alpha-blended), never putImageData.
      drawImage: (img: unknown, x: number, y: number) =>
        calls.push(img === PATCH_IMG ? `patch@${x},${y}` : 'image'),
      putImageData: () => calls.push('putImageData'),
      fillText: (text: string, x: number, y: number) =>
        calls.push(`text:${text}@${x},${y}:${ctx.textBaseline}`),
      measureText: (text: string) => ({ width: text.length }),
      save: () => undefined,
      restore: () => undefined
    }
    return ctx as unknown as CanvasRenderingContext2D
  }
  const text = (id: string, y: number, value: string, anchor?: { x: number; y: number }): Layer => ({
    id,
    kind: 'text',
    boxId: `box-${id}`,
    rect: { x: 0, y, w: 500, h: 20 },
    text: value,
    fontFamily: 'Noto Sans',
    fontSize: 16,
    color: '#000000',
    ...(anchor ? { anchor } : {})
  })
  const patch = (y: number) => ({ x: 0, y, image: PATCH_IMG })
  const keyOf = (l: Layer) => patchKey(l as Extract<Layer, { kind: 'text' }>)

  it('draws every removal patch (with drawImage) before any new text', () => {
    const calls: string[] = []
    const a = text('a', 10, 'A')
    const b = text('b', 30, 'B')
    const assets: RenderAssets = {
      original: ORIGINAL,
      patches: new Map([
        [keyOf(a), patch(10)],
        [keyOf(b), patch(30)]
      ]),
      failedPatches: new Set(),
      images: new Map()
    }
    renderDocument(fakeCtx(calls), [a, b], assets)
    expect(calls).toEqual([
      'clear',
      'image',
      'patch@0,10',
      'patch@0,30',
      'text:A@0,20:middle',
      'text:B@0,40:middle'
    ])
  })

  it('draws one-line text with an anchor on the old baseline', () => {
    const calls: string[] = []
    const a = text('a', 10, 'A', { x: 3.5, y: 26 })
    const assets: RenderAssets = {
      original: ORIGINAL,
      patches: new Map([[keyOf(a), patch(10)]]),
      failedPatches: new Set(),
      images: new Map()
    }
    renderDocument(fakeCtx(calls), [a], assets)
    expect(calls).toContain('text:A@3.5,26:alphabetic')
  })

  it('waits for a pending patch, but draws text whose removal failed', () => {
    const calls: string[] = []
    const b = text('b', 30, 'B')
    const assets: RenderAssets = {
      original: ORIGINAL,
      patches: new Map(),
      failedPatches: new Set([keyOf(b)]),
      images: new Map()
    }
    renderDocument(fakeCtx(calls), [text('a', 10, 'A'), b], assets)
    expect(calls).toEqual(['clear', 'image', 'text:B@0,40:middle'])
  })

  it('does not reuse a patch after the box was adjusted', () => {
    const before = text('a', 10, 'A')
    const after = { ...before, rect: { ...before.rect, h: 24 } } as Layer
    expect(keyOf(before)).not.toBe(keyOf(after))
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
