/**
 * Document Editor data model (spec section 8).
 * All coordinates are in ORIGINAL image pixels; the preview scales them for display.
 */

export type Rect = { x: number; y: number; w: number; h: number }

/** A text line found by OCR. Shown as an outline on the preview. */
export type OcrBox = { id: string; rect: Rect; text: string; confidence: number }

/** Replaces the text of one OCR box: old text is inpainted away, new text is drawn. */
export type TextLayer = {
  id: string
  kind: 'text'
  boxId: string
  rect: Rect
  text: string
  fontFamily: string
  /** px, matched from the height of the old letters (falls back to the box height) */
  fontSize: number
  /** #rrggbb, matched from the old text pixels */
  color: string
  /**
   * Left origin on the alphabetic baseline of the old letters (image px). One-line text
   * is drawn here so it sits where the old text was. Missing → centred in the box.
   */
  anchor?: { x: number; y: number }
}

/** A user image placed over a selected rectangle; can be moved and resized. */
export type ImageLayer = {
  id: string
  kind: 'image'
  rect: Rect
  /** The image itself as a data: URL (kept inside edits.json). */
  dataUrl: string
}

export type Layer = TextLayer | ImageLayer

/** Content of edits.json. `original.*` is never changed; everything lives here as layers. */
export type EditsFile = {
  version: 1
  /** OCR finished before saving; if false, OCR runs again on open. */
  ocrDone: boolean
  ocr: OcrBox[]
  layers: Layer[]
}

/** Bundled fonts (spec section 8, all OFL). System fonts are added at runtime. */
export const BUNDLED_FONTS: readonly string[] = [
  'Noto Sans Bengali',
  'Noto Serif Bengali',
  'Hind Siliguri',
  'Noto Sans',
  'Noto Serif'
]

/** Max documents open at the same time (spec section 8: 3 slots). */
export const MAX_SLOTS = 3
