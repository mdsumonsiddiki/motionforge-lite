import type { OcrBox } from './types'

/** Minimal shape of tesseract.js `blocks` output that we use (one entry per text line). */
export type OcrLine = { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }
export type OcrBlock = { paragraphs: { lines: OcrLine[] }[] }

/** Lines below this confidence (0–100) are noise and are not shown at all. */
export const MIN_CONFIDENCE = 30
/**
 * Lines below this confidence are shown in yellow as "uncertain" (user decision 2026-11-24):
 * the user can still edit them, but knows the recognised text may be wrong.
 */
export const CERTAIN_CONFIDENCE = 60
/**
 * A line taller than this share of the image height is not a text line (tesseract
 * sometimes returns one giant box over a photo or a handwritten area).
 */
export const MAX_LINE_HEIGHT_SHARE = 0.25
/** Below this share of letters/digits (non-space characters), the text looks like noise. */
export const MIN_LETTER_SHARE = 0.5

const LETTER_OR_DIGIT = /[\p{L}\p{N}\p{M}]/u

/** Share of letters, digits and combining marks among the non-space characters. */
export function letterShare(text: string): number {
  const chars = [...text.replace(/\s+/g, '')]
  if (chars.length === 0) return 0
  return chars.filter((c) => LETTER_OR_DIGIT.test(c)).length / chars.length
}

/** True when a box should be shown as "uncertain" (yellow). */
export function isUncertain(box: Pick<OcrBox, 'text' | 'confidence'>): boolean {
  return box.confidence < CERTAIN_CONFIDENCE || letterShare(box.text) < MIN_LETTER_SHARE
}

/**
 * True when most lines are uncertain: typical for handwriting or a blurry photo.
 * The UI then warns that the results may not be good.
 */
export function looksUnreliable(boxes: readonly Pick<OcrBox, 'text' | 'confidence'>[]): boolean {
  if (boxes.length === 0) return false
  return boxes.filter(isUncertain).length / boxes.length >= 0.5
}

/**
 * Turns tesseract blocks into one OcrBox per text line, in reading order.
 * No auto-correct or guessing (spec section 8): the text is kept as recognised, only trimmed.
 * Skipped: empty text, confidence < MIN_CONFIDENCE, zero-size, huge or outside the image
 * (not a text line) and text without any letter or digit (e.g. "/|-:").
 */
export function linesToBoxes(
  blocks: readonly OcrBlock[] | null | undefined,
  imgW: number,
  imgH: number
): OcrBox[] {
  const boxes: OcrBox[] = []
  for (const block of blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        const text = line.text.replace(/\s+/g, ' ').trim()
        const { x0, y0, x1, y1 } = line.bbox
        const w = x1 - x0
        const h = y1 - y0
        if (!text || line.confidence < MIN_CONFIDENCE || w <= 0 || h <= 0) continue
        // Too tall for a line, or reaching outside the image (1 px rounding slack).
        if (h > imgH * MAX_LINE_HEIGHT_SHARE || x1 > imgW + 1 || y1 > imgH + 1) continue
        if (letterShare(text) === 0) continue
        boxes.push({
          id: `b${boxes.length + 1}`,
          rect: { x: x0, y: y0, w, h },
          text,
          confidence: Math.round(line.confidence)
        })
      }
    }
  }
  return boxes
}
