import { describe, expect, it } from 'vitest'
import { linesToBoxes, type OcrLine } from './ocrBoxes'

const line = (text: string, confidence: number, x0 = 0, y0 = 0, x1 = 10, y1 = 5): OcrLine => ({
  text,
  confidence,
  bbox: { x0, y0, x1, y1 }
})

describe('linesToBoxes', () => {
  it('makes one box per line in reading order', () => {
    const boxes = linesToBoxes([
      { paragraphs: [{ lines: [line('আমার  সোনার\n', 88, 10, 20, 110, 50), line('Bangla', 75)] }] },
      { paragraphs: [{ lines: [line('Total: 500', 91.6, 5, 60, 80, 80)] }] }
    ])
    expect(boxes).toEqual([
      { id: 'b1', rect: { x: 10, y: 20, w: 100, h: 30 }, text: 'আমার সোনার', confidence: 88 },
      { id: 'b2', rect: { x: 0, y: 0, w: 10, h: 5 }, text: 'Bangla', confidence: 75 },
      { id: 'b3', rect: { x: 5, y: 60, w: 75, h: 20 }, text: 'Total: 500', confidence: 92 }
    ])
  })

  it('skips empty, low-confidence and zero-size lines', () => {
    const boxes = linesToBoxes([
      { paragraphs: [{ lines: [line('  ', 90), line('noise', 10), line('flat', 90, 0, 5, 10, 5)] }] }
    ])
    expect(boxes).toEqual([])
  })

  it('handles missing blocks', () => {
    expect(linesToBoxes(null)).toEqual([])
  })
})
