import { create } from 'zustand'
import { defaultSettings, type Settings } from '../../electron/shared/settings'
import { notify } from './toastStore'

/** Where settings are loaded from / saved to. In the app this is `window.api.settings` (IPC). */
export type SettingsBackend = {
  get: () => Promise<Settings>
  set: (patch: Partial<Settings>) => Promise<Settings>
}

let backendOverride: SettingsBackend | null = null

/** Test hook: replace the IPC backend with a fake. */
export function setSettingsBackend(backend: SettingsBackend | null): void {
  backendOverride = backend
}

function backend(): SettingsBackend {
  return backendOverride ?? window.api.settings
}

type SettingsState = {
  /** null until the first load from main finishes. */
  settings: Settings | null
  load: () => Promise<void>
  /** Applies the change at once (theme/language switch instantly), then persists it. */
  update: (patch: Partial<Settings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,

  load: async () => {
    try {
      set({ settings: await backend().get() })
    } catch {
      // Keep the app usable: fall back to defaults (OBS path left empty for the user to set).
      set({ settings: defaultSettings('') })
      notify.error('errors.settingsLoad')
    }
  },

  update: async (patch) => {
    const previous = get().settings
    if (!previous) return
    set({ settings: { ...previous, ...patch } })
    try {
      // Main returns the validated, saved settings: use them as the source of truth.
      set({ settings: await backend().set(patch) })
    } catch {
      set({ settings: previous })
      notify.error('errors.settingsSave')
    }
  }
}))
