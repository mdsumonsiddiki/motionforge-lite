import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Form fields use the theme's --input-border and the #8b5cf6 focus ring in both themes
 * (WCAG 1.4.11). The colour contrast itself is checked in styles/tokens.test.ts.
 */
describe('form field styles', () => {
  const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8')

  /** Body of the first rule whose selector ends with `selector`. */
  function rule(selector: string): string {
    const i = css.indexOf(`${selector} {`)
    expect(i, selector).toBeGreaterThan(-1)
    return css.slice(i, css.indexOf('}', i))
  }

  it('input / textarea / select borders use the theme token', () => {
    expect(rule('select')).toContain('border-color: var(--input-border)')
  })

  it('the focus ring is 2px #8b5cf6 with a 3px offset', () => {
    const r = rule('select:focus-visible')
    expect(r).toContain('outline: 2px solid #8b5cf6')
    expect(r).toContain('outline-offset: 3px')
  })
})
