import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'node:path'
import { IPC } from '../shared/ipc'
import { mergeSettings, type Settings } from '../shared/settings'
import { loadSettings, saveSettings } from '../services/settingsFile'
import { DEFAULT_OBS_PATH, detectObsPath } from '../services/obs'

/** settings.json lives in userData (spec section 5). */
function settingsFilePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

/** Cached in memory after the first read; disk is written only when the user changes something. */
let current: Settings | null = null

function getSettings(): Settings {
  if (!current) current = loadSettings(settingsFilePath(), detectObsPath() ?? DEFAULT_OBS_PATH)
  return current
}

/** Registers settings + OBS-path IPC handlers. Call once after `app.whenReady()`. */
export function registerSettingsIpc(): void {
  ipcMain.handle(IPC.settingsGet, () => getSettings())

  // The patch comes from the renderer, so it is validated before it is stored.
  ipcMain.handle(IPC.settingsSet, (_event, patch: unknown) => {
    const next = mergeSettings(getSettings(), patch)
    saveSettings(settingsFilePath(), next)
    current = next
    return next
  })

  ipcMain.handle(IPC.obsDetect, () => detectObsPath())

  // Lets the user pick obs64.exe manually. Returns null when cancelled.
  ipcMain.handle(IPC.obsBrowse, async (event, title: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: typeof title === 'string' ? title.slice(0, 200) : undefined,
      properties: ['openFile'],
      filters: [{ name: 'obs64.exe', extensions: ['exe'] }]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
}
