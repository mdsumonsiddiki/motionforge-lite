import type { EditsFile, ImageLayer, Layer, OcrBox, Rect, TextLayer } from './types'

/**
 * Pure edit operations on the layer list, plus edits.json (de)serialisation.
 * Layers are applied in order on top of the untouched original image.
 */

let counter = 0
/** Short unique id for layers. */
export function newLayerId(): string {
  counter += 1
  return `l${Date.now().toString(36)}${counter.toString(36)}`
}

export type TextStyle = {
  fontFamily: string
  fontSize: number
  color: string
  anchor?: { x: number; y: number }
}

/**
 * Sets the new text for an OCR box. Editing the same box again replaces its earlier layer
 * (in the same position in the list), so one box never gets two text layers.
 */
export function applyTextEdit(
  layers: readonly Layer[],
  box: OcrBox,
  text: string,
  style: TextStyle,
  id: string = newLayerId()
): Layer[] {
  const existing = layers.find((l): l is TextLayer => l.kind === 'text' && l.boxId === box.id)
  const layer: TextLayer = {
    id: existing?.id ?? id,
    kind: 'text',
    boxId: box.id,
    rect: box.rect,
    text,
    ...style
  }
  return existing ? layers.map((l) => (l === existing ? layer : l)) : [...layers, layer]
}

export function addImageLayer(
  layers: readonly Layer[],
  rect: Rect,
  dataUrl: string,
  id: string = newLayerId()
): Layer[] {
  const layer: ImageLayer = { id, kind: 'image', rect, dataUrl }
  return [...layers, layer]
}

/** Moves / resizes an image layer. */
export function setLayerRect(layers: readonly Layer[], id: string, rect: Rect): Layer[] {
  return layers.map((l) => (l.id === id ? { ...l, rect } : l))
}

export function removeLayer(layers: readonly Layer[], id: string): Layer[] {
  return layers.filter((l) => l.id !== id)
}

/** The current text of a box: its edited text if any, else the OCR text. */
export function textForBox(layers: readonly Layer[], box: OcrBox): string {
  const layer = layers.find((l) => l.kind === 'text' && l.boxId === box.id) as TextLayer | undefined
  return layer?.text ?? box.text
}

/**
 * @param ocrDone false if OCR had not finished (or failed) when saving;
 *   OCR then runs again when the document is opened.
 */
export function serializeEdits(
  ocr: readonly OcrBox[],
  layers: readonly Layer[],
  ocrDone: boolean
): string {
  const file: EditsFile = { version: 1, ocrDone, ocr: [...ocr], layers: [...layers] }
  return JSON.stringify(file)
}

// ---- parsing (edits.json comes from disk / a restored backup, so it is validated) ----

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

function isRect(v: unknown): v is Rect {
  const r = v as Rect | null
  return !!r && isNum(r.x) && isNum(r.y) && isNum(r.w) && isNum(r.h) && r.w >= 0 && r.h >= 0
}

function isOcrBox(v: unknown): v is OcrBox {
  const b = v as OcrBox | null
  return !!b && isStr(b.id) && isRect(b.rect) && isStr(b.text) && isNum(b.confidence)
}

function isLayer(v: unknown): v is Layer {
  const l = v as Layer | null
  if (!l || !isStr(l.id) || !isRect(l.rect)) return false
  if (l.kind === 'text') {
    return (
      isStr(l.boxId) &&
      isStr(l.text) &&
      isStr(l.fontFamily) &&
      isNum(l.fontSize) &&
      isStr(l.color) &&
      /^#[0-9a-f]{6}$/i.test(l.color) &&
      (l.anchor === undefined || (!!l.anchor && isNum(l.anchor.x) && isNum(l.anchor.y)))
    )
  }
  return l.kind === 'image' && isStr(l.dataUrl) && /^data:image\/(png|jpeg);base64,/.test(l.dataUrl)
}

export type ParsedEdits = { ocrDone: boolean; ocr: OcrBox[]; layers: Layer[] }

/**
 * Parses edits.json. Invalid entries are dropped; missing or unreadable JSON gives empty
 * edits with ocrDone = false (so OCR runs).
 */
export function parseEdits(json: string | null): ParsedEdits {
  const empty: ParsedEdits = { ocrDone: false, ocr: [], layers: [] }
  if (!json) return empty
  try {
    const raw = JSON.parse(json) as Partial<EditsFile>
    return {
      ocrDone: raw.ocrDone === true,
      ocr: Array.isArray(raw.ocr) ? raw.ocr.filter(isOcrBox) : [],
      layers: Array.isArray(raw.layers) ? raw.layers.filter(isLayer) : []
    }
  } catch {
    return empty
  }
}
