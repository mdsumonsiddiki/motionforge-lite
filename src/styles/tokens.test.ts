import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Contrast checks for the theme tokens (docs/UI_REDESIGN.md section 6):
 * text ≥ 4.5:1, borders / focus ring ≥ 3:1, in both themes.
 */

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')

type Rgba = [number, number, number, number]

/** Custom properties declared in the first rule whose selector contains `selector`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start))
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1] as string] = (m[2] as string).trim()
  return out
}

/** Last plain colour in a value (#hex or rgba(); gradients end with their base colour). */
function color(value: string): Rgba {
  const all = [...value.matchAll(/#[0-9a-f]{6}|rgba?\([^)]+\)/gi)].map((m) => m[0])
  const v = all[all.length - 1] ?? '#000000'
  if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)).concat(1) as Rgba
  const [r = 0, g = 0, b = 0, a = 1] = v.replace(/rgba?\(|\)/g, '').split(',').map(Number)
  return [r, g, b, a]
}

/** Flattens a semi-transparent colour over an opaque one. */
const over = ([r, g, b, a]: Rgba, [br, bg, bb]: Rgba): Rgba => [
  r * a + br * (1 - a),
  g * a + bg * (1 - a),
  b * a + bb * (1 - a),
  1
]

function luminance([r, g, b]: Rgba): number {
  const lin = (c: number): number => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

const FOCUS: Rgba = [0x8b, 0x5c, 0xf6, 1]

describe('fixed colours', () => {
  const t = tokens(':root {')
  it('white toast text is ≥ 4.5:1 on both toast backgrounds', () => {
    for (const k of ['toast-ok', 'toast-error']) {
      expect(contrast([255, 255, 255, 1], color(t[k] ?? '')), k).toBeGreaterThanOrEqual(4.5)
    }
  })
})

for (const theme of ['dark', 'light'] as const) {
  describe(`${theme} theme tokens`, () => {
    const t = tokens(`[data-theme='${theme}']`)
    const page = color(t['page'] ?? '')
    const solid = color(t['panel-solid'] ?? '')
    // Surfaces a text can sit on (semi-transparent ones flattened over the page / panel).
    const surfaces = {
      panelSolid: solid,
      sideSolid: color(t['side-solid'] ?? ''),
      side: over(color(t['side'] ?? ''), page),
      right: over(color(t['right'] ?? ''), page),
      panel: over(color(t['panel'] ?? ''), page),
      inset: over(color(t['inset'] ?? ''), solid)
    }

    it('defines every token of section 2', () => {
      for (const k of ['page', 'shell', 'text', 'muted', 'accent', 'on-accent', 'input-border', 'feature', 'ring', 'badge']) {
        expect(t[k], k).toBeTruthy()
      }
    })

    it('text and muted text are ≥ 4.5:1 on every surface', () => {
      for (const [name, bg] of Object.entries(surfaces)) {
        expect(contrast(color(t['text'] ?? ''), bg), `text on ${name}`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(color(t['muted'] ?? ''), bg), `muted on ${name}`).toBeGreaterThanOrEqual(4.5)
        // Warning / error text in the panels (uncertain OCR, Delete, OCR failed).
        expect(contrast(color(t['warn'] ?? ''), bg), `warn on ${name}`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(color(t['danger-text'] ?? ''), bg), `danger-text on ${name}`).toBeGreaterThanOrEqual(4.5)
      }
    })

    it('accent text and on-accent text are ≥ 4.5:1', () => {
      expect(contrast(color(t['accent-text'] ?? ''), surfaces.panelSolid)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(color(t['on-accent'] ?? ''), color(t['accent'] ?? ''))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(color(t['nav-fg-on'] ?? ''), over(color(t['nav-bg-on'] ?? ''), solid))).toBeGreaterThanOrEqual(4.5)
    })

    it('input borders and the focus ring are ≥ 3:1', () => {
      for (const bg of [surfaces.inset, surfaces.panelSolid]) {
        expect(contrast(color(t['input-border'] ?? ''), bg)).toBeGreaterThanOrEqual(3)
        expect(contrast(FOCUS, bg)).toBeGreaterThanOrEqual(3)
      }
    })
  })
}
