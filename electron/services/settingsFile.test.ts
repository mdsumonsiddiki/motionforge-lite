import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadSettings, saveSettings } from './settingsFile'
import { defaultSettings, type Settings } from '../shared/settings'

describe('settingsFile', () => {
  let dir: string
  let file: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mf-settings-'))
    file = join(dir, 'nested', 'settings.json')
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('returns defaults when the file is missing', () => {
    expect(loadSettings(file, 'C:\\obs.exe')).toEqual(defaultSettings('C:\\obs.exe'))
  })

  it('round-trips saved settings (survives a restart)', () => {
    const saved: Settings = {
      language: 'bn',
      theme: 'light',
      obsPath: 'D:\\obs.exe',
      reduceEffects: true,
      sidebarCollapsed: true
    }
    saveSettings(file, saved)
    expect(existsSync(`${file}.tmp`)).toBe(false)
    expect(loadSettings(file, 'C:\\obs.exe')).toEqual(saved)
  })

  it('falls back to defaults on a corrupt file', () => {
    saveSettings(file, { ...defaultSettings('x'), language: 'bn', theme: 'light' })
    writeFileSync(file, '{ not json', 'utf8')
    expect(loadSettings(file, 'C:\\obs.exe').language).toBe('en')
  })

  it('ignores invalid fields in the file', () => {
    saveSettings(file, { ...defaultSettings('x'), language: 'bn', theme: 'light' })
    writeFileSync(file, JSON.stringify({ language: 'de', theme: 'light' }), 'utf8')
    expect(loadSettings(file, 'C:\\obs.exe')).toEqual({
      ...defaultSettings('C:\\obs.exe'),
      theme: 'light'
    })
  })
})
