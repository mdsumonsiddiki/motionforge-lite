import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultSettings, type Settings } from '../../electron/shared/settings'
import { setSettingsBackend, useSettingsStore } from './settingsStore'
import { useToastStore } from './toastStore'

const saved: Settings = defaultSettings('C:\\obs.exe')

describe('settingsStore', () => {
  let disk: Settings
  let failNextSet: boolean

  beforeEach(() => {
    disk = { ...saved }
    failNextSet = false
    useSettingsStore.setState({ settings: null })
    useToastStore.setState({ toasts: [] })
    setSettingsBackend({
      get: async () => ({ ...disk }),
      set: async (patch) => {
        if (failNextSet) throw new Error('disk full')
        disk = { ...disk, ...patch }
        return { ...disk }
      }
    })
  })
  afterEach(() => setSettingsBackend(null))

  it('loads settings from the backend', async () => {
    await useSettingsStore.getState().load()
    expect(useSettingsStore.getState().settings).toEqual(saved)
  })

  it('applies and persists a change', async () => {
    await useSettingsStore.getState().load()
    await useSettingsStore.getState().update({ theme: 'light', language: 'bn' })
    expect(useSettingsStore.getState().settings).toMatchObject({ theme: 'light', language: 'bn' })
    expect(disk).toMatchObject({ theme: 'light', language: 'bn' })
  })

  it('reverts and shows an error toast when saving fails', async () => {
    await useSettingsStore.getState().load()
    failNextSet = true
    await useSettingsStore.getState().update({ theme: 'light' })
    expect(useSettingsStore.getState().settings?.theme).toBe('dark')
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      kind: 'error',
      messageKey: 'errors.settingsSave'
    })
  })

  it('falls back to defaults and shows an error when loading fails', async () => {
    setSettingsBackend({
      get: async () => {
        throw new Error('ipc down')
      },
      set: async () => saved
    })
    await useSettingsStore.getState().load()
    expect(useSettingsStore.getState().settings).toEqual({
      language: 'en',
      theme: 'dark',
      obsPath: '',
      reduceEffects: false
    })
    expect(useToastStore.getState().toasts[0]?.messageKey).toBe('errors.settingsLoad')
  })

  it('ignores updates before settings are loaded', async () => {
    await useSettingsStore.getState().update({ theme: 'light' })
    expect(disk.theme).toBe('dark')
  })
})
