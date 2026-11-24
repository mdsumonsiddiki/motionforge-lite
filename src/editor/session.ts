import type {
  ExportFormat,
  ImageType,
  LoadedDocument,
  PickedImage
} from '../../electron/shared/document'
import { useDocumentStore, type OpenResult, type Slot } from '../store/documentStore'
import { recognize } from '../workers/ocrClient'
import { inpaintBox } from '../workers/inpaintClient'
import { parseEdits, serializeEdits } from './edits'
import { readJpegOrientation } from './exif'
import { reportInpaintFailure } from './inpaintFailure'
import { cropPixels } from './inpaintPlan'
import { fontCss, patchKey, renderDocument, type RenderAssets } from './render'
import { maskTextColor, textMask } from './textMask'
import { estimateFontSize, estimateTextColor, matchPlacement, MEASURE_SIZE } from './textStyle'
import { clampRect } from './geometry'
import type { TextStyle } from './edits'
import { MAX_SLOTS, type Layer, type OcrBox } from './types'

/**
 * Glue between the document store, the workers (OCR, inpaint) and the canvas.
 * Holds the decoded images and inpaint patches for each slot (not reactive; the store's
 * `renderTick` is bumped when they change).
 */

type Runtime = RenderAssets & {
  pixels: ImageData
  /** Inpaint jobs in progress, keyed by OCR box id. */
  pendingPatches: Map<string, Promise<void>>
  /** Image layers being decoded, keyed by layer id. */
  pendingImages: Map<string, Promise<void>>
}
const runtimes = new Map<string, Runtime>()

const store = () => useDocumentStore.getState()
const getSlot = (key: string): Slot | undefined => store().slots.find((s) => s.key === key)

const MIME: Record<ImageType, string> = { png: 'image/png', jpg: 'image/jpeg' }

function blobOf(data: Uint8Array, type: ImageType): Blob {
  return new Blob([data as Uint8Array<ArrayBuffer>], { type: MIME[type] })
}

/**
 * Decodes the original image once and keeps its pixels for inpainting.
 * EXIF orientation is applied, so preview, inpaint, export and OCR all use the upright image.
 */
async function decode(original: { type: ImageType; data: Uint8Array }): Promise<Runtime> {
  const bitmap = await createImageBitmap(blobOf(original.data, original.type), {
    imageOrientation: 'from-image'
  })
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not available')
  ctx.drawImage(bitmap, 0, 0)
  return {
    original: bitmap,
    pixels: ctx.getImageData(0, 0, bitmap.width, bitmap.height),
    patches: new Map(),
    failedPatches: new Set(),
    images: new Map(),
    pendingPatches: new Map(),
    pendingImages: new Map()
  }
}

type OpenInput = {
  docId: string | null
  name: string
  original: { type: ImageType; data: Uint8Array }
}

async function openWith(input: OpenInput, edits: string | null): Promise<OpenResult> {
  // Checked before decoding, so a full / already-open case costs nothing.
  if (input.docId) {
    const existing = store().slots.find((s) => s.docId === input.docId)
    if (existing) {
      store().setActive(existing.key)
      return { status: 'existing', key: existing.key }
    }
  }
  if (store().slots.length >= MAX_SLOTS) return { status: 'full' }

  const runtime = await decode(input.original)
  const parsed = parseEdits(edits)
  const result = store().openSlot({
    docId: input.docId,
    name: input.name,
    original: input.original,
    width: runtime.original.width,
    height: runtime.original.height,
    // A saved document reuses its stored OCR boxes; a new image (or a document saved
    // before OCR finished) is recognised now.
    ocr: parsed.ocrDone ? parsed.ocr : null,
    layers: parsed.layers
  })
  if (result.status !== 'opened') {
    runtime.original.close()
    return result
  }
  runtimes.set(result.key, runtime)
  if (!parsed.ocrDone) void runOcr(result.key)
  syncAssets(result.key)
  return result
}

/** Opens a new image picked by the user in a free slot. */
export function openImage(picked: PickedImage): Promise<OpenResult> {
  return openWith({ docId: null, name: picked.name, original: { type: picked.type, data: picked.data } }, null)
}

/** Opens a saved document (original + edits.json) in a free slot. */
export function openSaved(doc: LoadedDocument): Promise<OpenResult> {
  return openWith({ docId: doc.meta.id, name: doc.meta.name, original: doc.original }, doc.edits)
}

export function closeSlot(key: string): void {
  runtimes.get(key)?.original.close()
  runtimes.delete(key)
  store().closeSlot(key)
}

/**
 * The image given to OCR, in the same (upright) coordinates as the preview.
 * A rotated phone JPEG is re-encoded from the decoded, already-rotated pixels, because
 * tesseract.js does not reliably apply EXIF orientation itself (see exif.ts).
 */
async function ocrSource(slot: Slot, rt: Runtime | undefined): Promise<Blob> {
  const { type, data } = slot.original
  if (type !== 'jpg' || !rt || readJpegOrientation(data) === 1) return blobOf(data, type)
  const canvas = new OffscreenCanvas(rt.pixels.width, rt.pixels.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not available')
  ctx.putImageData(rt.pixels, 0, 0)
  return canvas.convertToBlob({ type: 'image/png' })
}

/** Runs OCR in the worker and stores the line boxes, with progress (spec section 8, step 1). */
export async function runOcr(key: string): Promise<void> {
  const slot = getSlot(key)
  if (!slot) return
  store().update(key, { ocrStatus: 'running', ocrProgress: 0 })
  try {
    const source = await ocrSource(slot, runtimes.get(key))
    const boxes = await recognize(source, { width: slot.width, height: slot.height }, (p) => {
      if (getSlot(key)) store().update(key, { ocrProgress: p })
    })
    if (getSlot(key)) store().update(key, { ocr: boxes, ocrStatus: 'done', ocrProgress: 1 })
  } catch {
    if (getSlot(key)) store().update(key, { ocrStatus: 'error' })
  }
}

/**
 * Makes sure every layer has what it needs to be drawn:
 * an inpaint patch for each text layer and a decoded image for each image layer.
 * Missing ones are produced in the background; the slot re-renders as they arrive.
 */
export function syncAssets(key: string): void {
  const slot = getSlot(key)
  const rt = runtimes.get(key)
  if (!slot || !rt) return

  for (const layer of slot.history.present) {
    if (layer.kind === 'text') {
      const id = patchKey(layer)
      if (rt.patches.has(id) || rt.failedPatches.has(id) || rt.pendingPatches.has(id)) continue
      const job = inpaintBox(rt.pixels, layer.rect)
        .then(async (patch) => {
          if (!patch) {
            rt.failedPatches.add(id)
            return
          }
          // A bitmap keeps the transparency, so drawImage changes only the letter pixels.
          rt.patches.set(id, { x: patch.x, y: patch.y, image: await createImageBitmap(patch.image) })
        })
        .catch(() => {
          rt.failedPatches.add(id) // the new text is then drawn without removing the old one
          reportInpaintFailure() // ...and the user is told, instead of failing silently
        })
        .finally(() => {
          rt.pendingPatches.delete(id)
          if (getSlot(key)) store().bumpRender(key)
        })
      rt.pendingPatches.set(id, job)
    } else if (!rt.images.has(layer.id)) {
      const img = new Image()
      rt.images.set(layer.id, img)
      const job = new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
      }).then(() => {
        rt.pendingImages.delete(layer.id)
        if (getSlot(key)) store().bumpRender(key)
      })
      rt.pendingImages.set(layer.id, job)
      img.src = layer.dataUrl
    }
  }
}

/** Resolves when every layer of the slot is ready to draw (used before Save / Export). */
async function whenReady(key: string): Promise<void> {
  syncAssets(key)
  const rt = runtimes.get(key)
  if (!rt) return
  await Promise.all([...rt.pendingPatches.values(), ...rt.pendingImages.values()])
}

/** True while old text is still being removed for some layer of this slot. */
export function isInpainting(key: string): boolean {
  return (runtimes.get(key)?.pendingPatches.size ?? 0) > 0
}

/** Canvas used only to measure text ink (never drawn). */
let measureCtx: OffscreenCanvasRenderingContext2D | null = null

/**
 * Style for the new text of a box, matched to the old letters (spec section 8, step 4):
 * size and position from the text mask's ink box, color from the text pixels.
 * Falls back to the box height / darkest pixels when no clear letters are found.
 */
export async function matchStyle(key: string, box: OcrBox, fontFamily: string): Promise<TextStyle> {
  const rt = runtimes.get(key)
  const fallback: TextStyle = { fontFamily, fontSize: estimateFontSize(box.rect.h), color: '#000000' }
  if (!rt) return fallback
  const rect = clampRect(box.rect, rt.pixels.width, rt.pixels.height)
  if (rect.w === 0 || rect.h === 0) return fallback
  const px = cropPixels(rt.pixels, rect)
  const tm = textMask(px, rect.w, rect.h)
  const color = maskTextColor(px, tm) ?? estimateTextColor(px)
  if (!tm.ink) return { ...fallback, color }

  // Measure the old (OCR) text in the chosen font, once the font is loaded.
  await document.fonts.load(fontCss(MEASURE_SIZE, fontFamily), box.text).catch(() => [])
  measureCtx ??= new OffscreenCanvas(1, 1).getContext('2d')
  const ctx = measureCtx
  if (!ctx) return { ...fallback, color }
  const placed = matchPlacement(rect, tm.ink, box.text, (text) => {
    ctx.font = fontCss(MEASURE_SIZE, fontFamily)
    ctx.textBaseline = 'alphabetic'
    const m = ctx.measureText(text)
    return { ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent, left: m.actualBoundingBoxLeft }
  })
  if (!placed) return { ...fallback, color }
  return { fontFamily, color, fontSize: placed.fontSize, anchor: placed.anchor }
}

/** Waits until the fonts used by text layers are loaded, so canvas text uses the right font. */
async function loadFonts(layers: readonly Layer[]): Promise<void> {
  await Promise.all(
    layers
      .filter((l) => l.kind === 'text')
      .map((l) => document.fonts.load(fontCss(l.fontSize, l.fontFamily), l.text).catch(() => []))
  )
}

/**
 * Draws the slot into a canvas at full image resolution.
 * @param layers optional override (e.g. live positions while an image is being dragged)
 */
export async function drawSlot(
  key: string,
  canvas: HTMLCanvasElement | OffscreenCanvas,
  layers?: readonly Layer[]
): Promise<void> {
  const slot = getSlot(key)
  const rt = runtimes.get(key)
  if (!slot || !rt) return
  const toDraw = layers ?? slot.history.present
  await loadFonts(toDraw)
  if (canvas.width !== slot.width) canvas.width = slot.width
  if (canvas.height !== slot.height) canvas.height = slot.height
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null
  if (ctx) renderDocument(ctx, toDraw, rt)
}

/** Renders the final image (JPG/PNG bytes). */
async function renderBytes(key: string, format: ExportFormat): Promise<Uint8Array> {
  const slot = getSlot(key)
  if (!slot) throw new Error('No slot')
  await whenReady(key) // never write a file with edits still missing
  const canvas = new OffscreenCanvas(slot.width, slot.height)
  await drawSlot(key, canvas)
  const blob = await canvas.convertToBlob({ type: MIME[format], quality: 0.92 })
  return new Uint8Array(await blob.arrayBuffer())
}

/** The current result as PNG bytes (used by Webcam Output). */
export function renderSlotPng(key: string): Promise<Uint8Array> {
  return renderBytes(key, 'png')
}

/** Saves edits.json + edited.png (and the original, for a new document). */
export async function saveSlot(key: string): Promise<void> {
  const slot = getSlot(key)
  if (!slot) return
  const editedPng = await renderBytes(key, 'png')
  const meta = await window.api.document.save({
    id: slot.docId ?? undefined,
    name: slot.name,
    original: slot.docId ? undefined : slot.original,
    edits: serializeEdits(slot.ocr, slot.history.present, slot.ocrStatus === 'done'),
    editedPng
  })
  store().markSaved(key, meta)
}

/** Exports the current result as JPG or PNG to a file the user chooses. */
export async function exportSlot(key: string, format: ExportFormat): Promise<string | null> {
  const slot = getSlot(key)
  if (!slot) return null
  const data = await renderBytes(key, format)
  return window.api.document.export({ format, suggestedName: slot.name, data })
}
