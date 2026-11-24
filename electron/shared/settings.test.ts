import { describe, expect, it } from 'vitest'
import { defaultSettings, mergeSettings, pickValidSettings } from './settings'

describe('settings validation', () => {
  const base = defaultSettings('C:\\obs\\obs64.exe')

  it('defaults to English and dark theme', () => {
    expect(base).toEqual({
      language: 'en',
      theme: 'dark',
      obsPath: 'C:\\obs\\obs64.exe',
      reduceEffects: false,
      sidebarCollapsed: false,
      profileName: '',
      profilePhoto: ''
    })
  })

  it('keeps the profile name, max 24 characters, no control characters', () => {
    expect(pickValidSettings({ profileName: 'Sumon' })).toEqual({ profileName: 'Sumon' })
    expect(pickValidSettings({ profileName: 'a'.repeat(30) }).profileName).toHaveLength(24)
    expect(pickValidSettings({ profileName: 'A\nB\u0000' })).toEqual({ profileName: 'AB' })
    // Bangla: counted by code points, never cut in the middle of one.
    const bn = 'সুমন'.repeat(10)
    expect(Array.from(pickValidSettings({ profileName: bn }).profileName ?? '')).toHaveLength(24)
    expect(pickValidSettings({ profileName: 5 })).toEqual({})
  })

  it('keeps only a small PNG / JPEG data URL as the profile photo', () => {
    const ok = 'data:image/png;base64,iVBORw0KGgo='
    expect(pickValidSettings({ profilePhoto: ok })).toEqual({ profilePhoto: ok })
    expect(pickValidSettings({ profilePhoto: '' })).toEqual({ profilePhoto: '' })
    expect(pickValidSettings({ profilePhoto: 'file:///C:/x.png' })).toEqual({})
    expect(pickValidSettings({ profilePhoto: 'data:image/svg+xml;base64,PHN2Zz4=' })).toEqual({})
    expect(pickValidSettings({ profilePhoto: 'data:image/png;base64,' + 'A'.repeat(400_000) })).toEqual({})
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
      pickValidSettings({
        language: 'fr',
        theme: 1,
        obsPath: 5,
        apiKey: 'x',
        reduceEffects: 'yes',
        sidebarCollapsed: 1
      })
    ).toEqual({})
    expect(pickValidSettings({ obsPath: 'a'.repeat(2000) })).toEqual({})
  })

  it('keeps Reduce effects (boolean only)', () => {
    expect(pickValidSettings({ reduceEffects: true })).toEqual({ reduceEffects: true })
  })

  it('keeps the sidebar collapsed state (boolean only)', () => {
    expect(pickValidSettings({ sidebarCollapsed: true })).toEqual({ sidebarCollapsed: true })
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
