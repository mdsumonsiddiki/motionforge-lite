import type { OcrBox } from './types'

/** Minimal shape of tesseract.js `blocks` output that we use (one entry per text line). */
export type OcrLine = { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }
export type OcrBlock = { paragraphs: { lines: OcrLine[] }[] }

/** Lines below this confidence (0–100) or without real text are skipped as noise. */
export const MIN_CONFIDENCE = 30

/**
 * Turns tesseract blocks into one OcrBox per text line, in reading order.
 * No auto-correct or guessing (spec section 8): the text is kept as recognised, only trimmed.
 */
export function linesToBoxes(blocks: readonly OcrBlock[] | null | undefined): OcrBox[] {
  const boxes: OcrBox[] = []
  for (const block of blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        const text = line.text.replace(/\s+/g, ' ').trim()
        const { x0, y0, x1, y1 } = line.bbox
        if (!text || line.confidence < MIN_CONFIDENCE || x1 <= x0 || y1 <= y0) continue
        boxes.push({
          id: `b${boxes.length + 1}`,
          rect: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
          text,
          confidence: Math.round(line.confidence)
        })
      }
    }
  }
  return boxes
}
