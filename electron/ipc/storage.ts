import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron'
import { join } from 'node:path'
import { IPC } from '../shared/ipc'
import { isItemKind, isValidId, type BackupResult } from '../shared/storage'
import { Storage } from '../services/storage'
import { backupFileName, createBackup, restoreBackup } from '../services/backup'
import { invalidateSettingsCache } from './settings'

function dialogTitle(title: unknown): string | undefined {
  return typeof title === 'string' ? title.slice(0, 200) : undefined
}

async function showOpenDialog(
  event: Electron.IpcMainInvokeEvent,
  options: OpenDialogOptions
): Promise<string | null> {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  return result.canceled ? null : (result.filePaths[0] ?? null)
}

/** Registers storage (list/delete) and backup/restore IPC. Call once after `app.whenReady()`. */
export function registerStorageIpc(): void {
  const userData = app.getPath('userData')
  const storage = new Storage(userData)

  // Inputs come from the renderer, so kind and id are validated before touching the disk.
  ipcMain.handle(IPC.storageList, (_event, kind: unknown) => {
    if (!isItemKind(kind)) throw new Error('Invalid kind')
    return storage.list(kind)
  })

  // The renderer shows the Delete confirmation before calling this.
  ipcMain.handle(IPC.storageDelete, (_event, kind: unknown, id: unknown) => {
    if (!isItemKind(kind) || !isValidId(id)) throw new Error('Invalid item')
    return storage.delete(kind, id)
  })

  // Backup: the user picks a folder; the zip gets a timestamped name.
  ipcMain.handle(IPC.backupCreate, async (event, title: unknown): Promise<BackupResult> => {
    const folder = await showOpenDialog(event, {
      title: dialogTitle(title),
      properties: ['openDirectory', 'createDirectory']
    })
    if (!folder) return { status: 'cancelled' }
    const file = join(folder, backupFileName(new Date()))
    await createBackup(userData, file)
    return { status: 'done', file }
  })

  // Restore: the renderer asks for confirmation first, then the user picks the zip.
  ipcMain.handle(IPC.backupRestore, async (event, title: unknown): Promise<BackupResult> => {
    const file = await showOpenDialog(event, {
      title: dialogTitle(title),
      properties: ['openFile'],
      filters: [{ name: 'Backup', extensions: ['zip'] }]
    })
    if (!file) return { status: 'cancelled' }
    await restoreBackup(file, userData)
    invalidateSettingsCache()
    return { status: 'done', file }
  })
}
