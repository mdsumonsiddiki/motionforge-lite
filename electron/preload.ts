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
import type { Orientation, OutputState } from './shared/output'

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

  obsControl: {
    /** Starts OBS from the saved OBS path. */
    launch: (): Promise<'launched' | 'empty' | 'notObs' | 'missing' | 'failed'> =>
      ipcRenderer.invoke(IPC.obsLaunch),
    /** Asks OBS to close normally (never force-killed). */
    close: (): Promise<'closing' | 'notRunning' | 'failed'> => ipcRenderer.invoke(IPC.obsClose),
    /** True while obs64.exe is running (navbar OBS pill). */
    isRunning: (): Promise<boolean> => ipcRenderer.invoke(IPC.obsStatus)
  },

  output: {
    // ---- used by the main window ----
    open: (orientation: Orientation): Promise<boolean> =>
      ipcRenderer.invoke(IPC.outputOpen, orientation),
    close: (): Promise<void> => ipcRenderer.invoke(IPC.outputClose),
    isOpen: (): Promise<boolean> => ipcRenderer.invoke(IPC.outputIsOpen),
    setOrientation: (orientation: Orientation): Promise<void> =>
      ipcRenderer.invoke(IPC.outputOrientation, orientation),
    sendState: (state: OutputState): void => ipcRenderer.send(IPC.outputState, state),
    /** Output window opened / closed. Returns an unsubscribe function. */
    onStatus: (callback: (open: boolean) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, open: boolean): void => callback(open)
      ipcRenderer.on(IPC.outputStatus, listener)
      return () => ipcRenderer.removeListener(IPC.outputStatus, listener)
    },
    // ---- used by the output window ----
    getState: (): Promise<OutputState | null> => ipcRenderer.invoke(IPC.outputGetState),
    onState: (callback: (state: OutputState) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, state: OutputState): void => callback(state)
      ipcRenderer.on(IPC.outputState, listener)
      return () => ipcRenderer.removeListener(IPC.outputState, listener)
    }
  },

  app: {
    /** Subscribe to close requests. Returns an unsubscribe function. */
    onCloseRequested: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on(IPC.appCloseRequested, listener)
      return () => ipcRenderer.removeListener(IPC.appCloseRequested, listener)
    },
    /** Close / quit the app for real (after the user confirmed). */
    confirmClose: (): void => ipcRenderer.send(IPC.appConfirmClose),
    /** Restart the app (after the user confirmed). */
    restart: (): void => ipcRenderer.send(IPC.appRestart)
  }
} as const

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
