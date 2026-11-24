/**
 * Document Editor types shared by main, preload and renderer (spec section 8).
 * Pure module: no Node / Electron imports.
 */
import type { DocumentMeta } from './storage'

/** Input is image only (JPG/PNG). */
export type ImageType = 'jpg' | 'png'

/** Max size of an image the user opens. Keeps memory use reasonable. */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024

/** An image file read by main after the user picked it. */
export type PickedImage = { name: string; type: ImageType; data: Uint8Array }

/** A saved document loaded for editing. `edits` is the raw edits.json text (null if none). */
export type LoadedDocument = {
  meta: DocumentMeta
  original: { type: ImageType; data: Uint8Array }
  edits: string | null
}

export type SaveDocumentRequest = {
  /** Omit for a new document. */
  id?: string
  name: string
  /** Only for a new document: the untouched original file. */
  original?: { type: ImageType; data: Uint8Array }
  /** edits.json content (OCR boxes + edit layers). */
  edits: string
  /** Rendered result (edited.png). */
  editedPng: Uint8Array
}

export type ExportFormat = 'png' | 'jpg'

export type ExportRequest = { format: ExportFormat; suggestedName: string; data: Uint8Array }

/** Detects JPG / PNG from the file's magic bytes (the extension alone is not trusted). */
export function detectImageType(data: Uint8Array): ImageType | null {
  if (data.length >= 8) {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    if (png.every((b, i) => data[i] === b)) return 'png'
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpg'
  return null
}

/** File name without folder and extension, used as the default document name. */
export function baseName(filePath: string): string {
  const file = filePath.split(/[\\/]/).pop() ?? ''
  const dot = file.lastIndexOf('.')
  return dot > 0 ? file.slice(0, dot) : file
}

/** Makes a name safe to use as a file name on Windows. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*]/g, '_').replace(/[. ]+$/, '')
  return cleaned.trim().slice(0, 100) || 'document'
}
