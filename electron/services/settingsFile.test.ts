import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadSettings, saveSettings } from './settingsFile'

describe('settingsFile', () => {
  let dir: string
  let file: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mf-settings-'))
    file = join(dir, 'nested', 'settings.json')
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('returns defaults when the file is missing', () => {
    expect(loadSettings(file, 'C:\\obs.exe')).toEqual({
      language: 'en',
      theme: 'dark',
      obsPath: 'C:\\obs.exe'
    })
  })

  it('round-trips saved settings (survives a restart)', () => {
    saveSettings(file, { language: 'bn', theme: 'light', obsPath: 'D:\\obs.exe' })
    expect(existsSync(`${file}.tmp`)).toBe(false)
    expect(loadSettings(file, 'C:\\obs.exe')).toEqual({
      language: 'bn',
      theme: 'light',
      obsPath: 'D:\\obs.exe'
    })
  })

  it('falls back to defaults on a corrupt file', () => {
    saveSettings(file, { language: 'bn', theme: 'light', obsPath: 'x' })
    writeFileSync(file, '{ not json', 'utf8')
    expect(loadSettings(file, 'C:\\obs.exe').language).toBe('en')
  })

  it('ignores invalid fields in the file', () => {
    saveSettings(file, { language: 'bn', theme: 'light', obsPath: 'x' })
    writeFileSync(file, JSON.stringify({ language: 'de', theme: 'light' }), 'utf8')
    expect(loadSettings(file, 'C:\\obs.exe')).toEqual({
      language: 'en',
      theme: 'light',
      obsPath: 'C:\\obs.exe'
    })
  })
})
