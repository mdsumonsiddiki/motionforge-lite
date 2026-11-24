/**
 * Settings shape shared by the main process, preload and renderer.
 * Pure module: no Electron or Node imports, so it can be used everywhere and unit-tested.
 *
 * Spec section 11: Language, Theme, OBS Path (Phase 2). API Key, Backup and Restore
 * are added in later phases. UI redesign (docs/UI_REDESIGN.md): Reduce effects.
 */

export type Language = 'en' | 'bn'
export type Theme = 'dark' | 'light'

export type Settings = {
  language: Language
  theme: Theme
  obsPath: string
  /** Turns off glass blur, hover lift and pulsing (UI_REDESIGN.md section 3). Default off. */
  reduceEffects: boolean
  /** Sidebar collapsed to icons only (UI_REDESIGN.md section 4.1). Default expanded. */
  sidebarCollapsed: boolean
  /** Local profile display name (UI_REDESIGN.md 4.3), max 24 characters. '' = default name. */
  profileName: string
  /** Local profile photo as a small data URL (PNG / JPEG), '' = initials. */
  profilePhoto: string
}

/** Max length of the profile display name (UI_REDESIGN.md 4.3). */
export const PROFILE_NAME_MAX = 24
/** Max length of the stored photo data URL (a ~128px downscaled image fits easily). */
export const PROFILE_PHOTO_MAX = 300_000
const PHOTO_DATA_URL = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/

export const LANGUAGES: readonly Language[] = ['en', 'bn']
export const THEMES: readonly Theme[] = ['dark', 'light']

/** Default language is English (spec section 3). */
export function defaultSettings(obsPath: string): Settings {
  return {
    language: 'en',
    theme: 'dark',
    obsPath,
    reduceEffects: false,
    sidebarCollapsed: false,
    profileName: '',
    profilePhoto: ''
  }
}

/** Max length for a stored path; anything longer is treated as invalid. */
const MAX_PATH_LENGTH = 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Picks only valid, known fields from `patch` (e.g. data coming over IPC or from disk).
 * Unknown keys and wrong types are dropped silently.
 */
export function pickValidSettings(patch: unknown): Partial<Settings> {
  if (!isRecord(patch)) return {}
  const out: Partial<Settings> = {}
  if (LANGUAGES.includes(patch.language as Language)) out.language = patch.language as Language
  if (THEMES.includes(patch.theme as Theme)) out.theme = patch.theme as Theme
  if (typeof patch.obsPath === 'string' && patch.obsPath.length <= MAX_PATH_LENGTH) {
    out.obsPath = patch.obsPath.trim()
  }
  if (typeof patch.reduceEffects === 'boolean') out.reduceEffects = patch.reduceEffects
  if (typeof patch.sidebarCollapsed === 'boolean') out.sidebarCollapsed = patch.sidebarCollapsed
  if (typeof patch.profileName === 'string') {
    // Strip control characters; keep at most 24 characters (code points, so Bangla is safe).
    // eslint-disable-next-line no-control-regex
    const clean = patch.profileName.replace(/[\u0000-\u001f\u007f]/g, '')
    out.profileName = Array.from(clean).slice(0, PROFILE_NAME_MAX).join('')
  }
  if (
    typeof patch.profilePhoto === 'string' &&
    patch.profilePhoto.length <= PROFILE_PHOTO_MAX &&
    (patch.profilePhoto === '' || PHOTO_DATA_URL.test(patch.profilePhoto))
  ) {
    out.profilePhoto = patch.profilePhoto
  }
  return out
}

/** Returns a complete, valid Settings object: `base` overwritten by the valid parts of `patch`. */
export function mergeSettings(base: Settings, patch: unknown): Settings {
  return { ...base, ...pickValidSettings(patch) }
}
