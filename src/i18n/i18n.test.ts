import { describe, expect, it } from 'vitest'
import en from './en.json'
import bn from './bn.json'

/** Flattens nested translation objects into dotted keys. */
function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  )
}

describe('i18n resources', () => {
  it('en and bn have exactly the same keys', () => {
    expect(keys(bn).sort()).toEqual(keys(en).sort())
  })
})
