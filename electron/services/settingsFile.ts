import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { defaultSettings, mergeSettings, type Settings } from '../shared/settings'

/**
 * Reads `settings.json`. A missing or corrupt file falls back to defaults,
 * so the app always starts.
 * @param file absolute path to settings.json (in userData)
 * @param defaultObsPath OBS path used when the file has none
 */
export function loadSettings(file: string, defaultObsPath: string): Settings {
  const base = defaultSettings(defaultObsPath)
  try {
    return mergeSettings(base, JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    return base
  }
}

/**
 * Writes `settings.json` atomically (write a temp file, then rename),
 * so a crash mid-write never leaves a half-written file.
 */
export function saveSettings(file: string, settings: Settings): void {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf8')
  renameSync(tmp, file)
}
