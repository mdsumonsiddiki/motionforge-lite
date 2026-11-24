import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/** WCAG 2.x relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

// Dark backgrounds the fields sit on: neutral-900 (app) and neutral-950 (preview area).
const DARK_BACKGROUNDS = ['#171717', '#0a0a0a']

describe('dark mode form fields (WCAG 1.4.11, ≥ 3:1)', () => {
  const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8')

  /** The colors declared in the first rule whose selector contains `selector`. */
  function colorsOf(selector: string): string[] {
    const rule = css.split('}').find((r) => r.includes(selector) && r.includes('{'))
    const body = rule?.slice(rule.indexOf('{')) ?? ''
    return body.match(/#[0-9a-f]{6}/gi) ?? []
  }

  it('input / textarea / select borders are clearly visible', () => {
    const colors = colorsOf('.dark select {')
    expect(colors.length).toBeGreaterThan(0)
    for (const c of colors) for (const bg of DARK_BACKGROUNDS) expect(contrast(c, bg)).toBeGreaterThan(3)
  })

  it('the focus ring is clearly visible', () => {
    const colors = colorsOf('.dark select:focus-visible')
    expect(colors.length).toBeGreaterThan(0)
    for (const c of colors) for (const bg of DARK_BACKGROUNDS) expect(contrast(c, bg)).toBeGreaterThan(3)
  })

  it('the old low-contrast border (neutral-700) would fail', () => {
    expect(contrast('#404040', '#171717')).toBeLessThan(3)
  })
})
