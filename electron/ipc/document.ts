import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { IPC } from '../shared/ipc'
import {
  baseName,
  detectImageType,
  MAX_IMAGE_BYTES,
  safeFileName,
  type ExportRequest,
  type ImageType,
  type LoadedDocument,
  type PickedImage,
  type SaveDocumentRequest
} from '../shared/document'
import { isValidId, type DocumentMeta } from '../shared/storage'
import { Storage } from '../services/storage'

/** Max size of edits.json (it can hold replaced images as data URLs). */
const MAX_EDITS_BYTES = 50 * 1024 * 1024

function windowOf(event: Electron.IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined
}

function asBytes(value: unknown, max: number): Uint8Array {
  if (!(value instanceof Uint8Array) || value.length === 0 || value.length > max) {
    throw new Error('Invalid data')
  }
  return value
}

function asImage(value: unknown): { type: ImageType; data: Uint8Array } {
  const v = value as { type?: unknown; data?: unknown } | null
  const data = asBytes(v?.data, MAX_IMAGE_BYTES)
  const type = detectImageType(data)
  if (!type || type !== v?.type) throw new Error('Invalid image')
  return { type, data }
}

/** Registers Document Editor IPC: pick image, load, save, export. */
export function registerDocumentIpc(): void {
  const storage = new Storage(app.getPath('userData'))

  // Lets the user pick one JPG/PNG. Main reads and checks it (magic bytes + size).
  ipcMain.handle(IPC.docPickImage, async (event, title: unknown): Promise<PickedImage | null> => {
    const options: Electron.OpenDialogOptions = {
      title: typeof title === 'string' ? title.slice(0, 200) : undefined,
      properties: ['openFile'],
      filters: [{ name: 'JPG / PNG', extensions: ['jpg', 'jpeg', 'png'] }]
    }
    const win = windowOf(event)
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    const file = result.canceled ? undefined : result.filePaths[0]
    if (!file) return null
    if ((await stat(file)).size > MAX_IMAGE_BYTES) throw new Error('IMAGE_TOO_LARGE')
    const data = new Uint8Array(await readFile(file))
    const type = detectImageType(data)
    if (!type) throw new Error('NOT_AN_IMAGE')
    return { name: baseName(file), type, data }
  })

  ipcMain.handle(IPC.docLoad, (_event, id: unknown): LoadedDocument => {
    if (!isValidId(id)) throw new Error('Invalid id')
    const meta = storage.getMeta<DocumentMeta>('documents', id)
    if (!meta) throw new Error('Document not found')
    for (const type of ['png', 'jpg'] as const) {
      const data = storage.readFile('documents', id, `original.${type}`)
      if (data) {
        const edits = storage.readFile('documents', id, 'edits.json')
        return {
          meta,
          original: { type, data: new Uint8Array(data) },
          edits: edits ? edits.toString('utf8') : null
        }
      }
    }
    throw new Error('Original image missing')
  })

  // Save = edits.json + edited.png (+ original for a new document). original.* never changes.
  ipcMain.handle(IPC.docSave, (_event, req: SaveDocumentRequest): DocumentMeta => {
    if (req.id !== undefined && !isValidId(req.id)) throw new Error('Invalid id')
    if (typeof req.edits !== 'string' || req.edits.length > MAX_EDITS_BYTES) {
      throw new Error('Invalid edits')
    }
    JSON.parse(req.edits) // must be valid JSON
    const files: Record<string, Buffer> = {
      'edits.json': Buffer.from(req.edits, 'utf8'),
      'edited.png': Buffer.from(asBytes(req.editedPng, MAX_IMAGE_BYTES * 4))
    }
    if (req.id === undefined) {
      const original = asImage(req.original)
      files[`original.${original.type}`] = Buffer.from(original.data)
    }
    return storage.saveDocument({ id: req.id, name: req.name, files })
  })

  // Export JPG / PNG to a place the user chooses. Returns the path, or null if cancelled.
  ipcMain.handle(IPC.docExport, async (event, req: ExportRequest): Promise<string | null> => {
    if (req.format !== 'png' && req.format !== 'jpg') throw new Error('Invalid format')
    const data = asBytes(req.data, MAX_IMAGE_BYTES * 4)
    const name = `${safeFileName(String(req.suggestedName ?? ''))}.${req.format}`
    const options: Electron.SaveDialogOptions = {
      defaultPath: name,
      filters: [{ name: req.format.toUpperCase(), extensions: [req.format] }]
    }
    const win = windowOf(event)
    const result = win
      ? await dialog.showSaveDialog(win, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, data)
    return result.filePath
  })
}
