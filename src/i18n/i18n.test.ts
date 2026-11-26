import { describe, expect, it } from 'vitest'
import en from './en.json'
import bn from './bn.json'

/** Flattens nested translation objects into dotted keys. */
function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  )
}

/** Value of a dotted key. */
function get(obj: object, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj)
}

/**
 * bn values that may stay without Bengali letters: proper names (app and page names from
 * the spec), formats ("16:9 (1280×720)") and product names (OBS Studio, "OBS · LIVE").
 */
const ENGLISH_OK = new Set([
  'app.name',
  'nav.human',
  'nav.document',
  'nav.output',
  'obs.live',
  'home.live',
  'settings.languageEn',
  'output.landscape',
  'output.portrait',
  'output.obs'
])

describe('i18n resources', () => {
  it('en and bn have exactly the same keys', () => {
    expect(keys(bn).sort()).toEqual(keys(en).sort())
  })

  it('every bn string is translated (has Bengali letters) unless it is a name', () => {
    const untranslated = keys(bn).filter(
      (k) => !ENGLISH_OK.has(k) && !/[ঀ-৿]/.test(String(get(bn, k)))
    )
    expect(untranslated).toEqual([])
  })

  it('no string is empty', () => {
    for (const k of keys(en)) expect(String(get(en, k)).trim()).not.toBe('')
    for (const k of keys(bn)) expect(String(get(bn, k)).trim()).not.toBe('')
  })
})
