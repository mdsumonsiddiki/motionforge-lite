import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from './shared/ipc'
import type { Settings } from './shared/settings'
import type { BackupResult, DocumentMeta, ItemKind, ItemSummary } from './shared/storage'
import type {
  ExportRequest,
  LoadedDocument,
  PickedImage,
  SaveDocumentRequest
} from './shared/document'

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

  storage: {
    /** Name list (newest first) for the Dashboard. */
    list: (kind: ItemKind): Promise<ItemSummary[]> => ipcRenderer.invoke(IPC.storageList, kind),
    /** Deletes an item. Call only after the user confirmed. */
    delete: (kind: ItemKind, id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC.storageDelete, kind, id)
  },

  backup: {
    /** Asks for a folder and writes the backup zip there. */
    create: (dialogTitle: string): Promise<BackupResult> =>
      ipcRenderer.invoke(IPC.backupCreate, dialogTitle),
    /** Asks for a zip and restores it. Call only after the user confirmed. */
    restore: (dialogTitle: string): Promise<BackupResult> =>
      ipcRenderer.invoke(IPC.backupRestore, dialogTitle)
  },

  document: {
    /** File picker for one JPG/PNG; main checks the file. null if cancelled. */
    pickImage: (dialogTitle: string): Promise<PickedImage | null> =>
      ipcRenderer.invoke(IPC.docPickImage, dialogTitle),
    load: (id: string): Promise<LoadedDocument> => ipcRenderer.invoke(IPC.docLoad, id),
    save: (req: SaveDocumentRequest): Promise<DocumentMeta> => ipcRenderer.invoke(IPC.docSave, req),
    /** Save dialog + write. Returns the written path, or null if cancelled. */
    export: (req: ExportRequest): Promise<string | null> => ipcRenderer.invoke(IPC.docExport, req)
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
