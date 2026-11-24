import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from './shared/ipc'
import type { Settings } from './shared/settings'

/**
 * Safe IPC bridge exposed to the renderer as `window.api`.
 * Only narrow, typed functions are exposed; ipcRenderer itself never is.
 */
const api = {
  platform: process.platform,

  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke(IPC.settingsGet),
    /** Saves a partial change; main validates it and returns the full saved settings. */
    set: (patch: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke(IPC.settingsSet, patch)
  },

  obs: {
    /** Returns the detected obs64.exe path, or null. */
    detect: (): Promise<string | null> => ipcRenderer.invoke(IPC.obsDetect),
    /** Opens a file picker; returns the chosen path or null if cancelled. */
    browse: (dialogTitle: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC.obsBrowse, dialogTitle)
  },

  app: {
    /** Subscribe to close requests. Returns an unsubscribe function. */
    onCloseRequested: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on(IPC.appCloseRequested, listener)
      return () => ipcRenderer.removeListener(IPC.appCloseRequested, listener)
    },
    confirmClose: (): void => ipcRenderer.send(IPC.appConfirmClose)
  }
} as const

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
