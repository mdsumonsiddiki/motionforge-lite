import { describe, expect, it } from 'vitest'
import { defaultSettings, mergeSettings, pickValidSettings } from './settings'

describe('settings validation', () => {
  const base = defaultSettings('C:\\obs\\obs64.exe')

  it('defaults to English and dark theme', () => {
    expect(base).toEqual({
      language: 'en',
      theme: 'dark',
      obsPath: 'C:\\obs\\obs64.exe',
      reduceEffects: false
    })
  })

  it('keeps valid fields', () => {
    expect(pickValidSettings({ language: 'bn', theme: 'light', obsPath: ' D:\\x.exe ' })).toEqual({
      language: 'bn',
      theme: 'light',
      obsPath: 'D:\\x.exe'
    })
  })

  it('drops unknown keys and invalid values', () => {
    expect(
      pickValidSettings({ language: 'fr', theme: 1, obsPath: 5, apiKey: 'x', reduceEffects: 'yes' })
    ).toEqual({})
    expect(pickValidSettings({ obsPath: 'a'.repeat(2000) })).toEqual({})
  })

  it('keeps Reduce effects (boolean only)', () => {
    expect(pickValidSettings({ reduceEffects: true })).toEqual({ reduceEffects: true })
  })

  it('handles non-object input', () => {
    expect(pickValidSettings(null)).toEqual({})
    expect(pickValidSettings('bn')).toEqual({})
    expect(pickValidSettings(['bn'])).toEqual({})
  })

  it('merges a partial patch over the base', () => {
    expect(mergeSettings(base, { theme: 'light', language: 'xx' })).toEqual({
      ...base,
      theme: 'light'
    })
  })
})
