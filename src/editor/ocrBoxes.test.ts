import { describe, expect, it } from 'vitest'
import { isUncertain, letterShare, linesToBoxes, looksUnreliable, type OcrLine } from './ocrBoxes'

const line = (text: string, confidence: number, x0 = 0, y0 = 0, x1 = 10, y1 = 5): OcrLine => ({
  text,
  confidence,
  bbox: { x0, y0, x1, y1 }
})
const IMG_W = 1000
const IMG_H = 1000

describe('linesToBoxes', () => {
  it('makes one box per line in reading order', () => {
    const boxes = linesToBoxes(
      [
        { paragraphs: [{ lines: [line('আমার  সোনার\n', 88, 10, 20, 110, 50), line('Bangla', 75)] }] },
        { paragraphs: [{ lines: [line('Total: 500', 91.6, 5, 60, 80, 80)] }] }
      ],
      IMG_W,
      IMG_H
    )
    expect(boxes).toEqual([
      { id: 'b1', rect: { x: 10, y: 20, w: 100, h: 30 }, text: 'আমার সোনার', confidence: 88 },
      { id: 'b2', rect: { x: 0, y: 0, w: 10, h: 5 }, text: 'Bangla', confidence: 75 },
      { id: 'b3', rect: { x: 5, y: 60, w: 75, h: 20 }, text: 'Total: 500', confidence: 92 }
    ])
  })

  it('skips empty, very low-confidence and zero-size lines', () => {
    const boxes = linesToBoxes(
      [{ paragraphs: [{ lines: [line('  ', 90), line('noise', 10), line('flat', 90, 0, 5, 10, 5)] }] }],
      IMG_W,
      IMG_H
    )
    expect(boxes).toEqual([])
  })

  it('skips huge or out-of-image boxes that cannot be one text line', () => {
    const tall = line('Hello', 90, 0, 0, 200, 400) // 40% of the image height
    const fullWidth = line('Hello', 90, 0, 0, 1000, 240) // a wide line, 24% high: kept
    const giant = line('Hello', 90, 0, 0, 1000, 320) // 32% high
    const outside = line('Hello', 90, 900, 0, 1200, 40) // runs past the right edge
    const boxes = linesToBoxes(
      [{ paragraphs: [{ lines: [tall, fullWidth, giant, outside] }] }],
      IMG_W,
      IMG_H
    )
    expect(boxes.map((b) => b.rect.h)).toEqual([240])
  })

  it('skips text without any letter or digit', () => {
    expect(linesToBoxes([{ paragraphs: [{ lines: [line('/|-:', 90)] }] }], IMG_W, IMG_H)).toEqual([])
  })

  it('handles missing blocks', () => {
    expect(linesToBoxes(null, IMG_W, IMG_H)).toEqual([])
  })
})

describe('uncertain lines', () => {
  it('counts letters, digits and Bangla vowel signs', () => {
    expect(letterShare('আমার সোনার')).toBe(1)
    expect(letterShare('/|-E|:')).toBeCloseTo(1 / 6)
    expect(letterShare('')).toBe(0)
  })

  it('marks low confidence or mostly-symbol text as uncertain', () => {
    expect(isUncertain({ text: 'Hello', confidence: 59 })).toBe(true)
    expect(isUncertain({ text: '/|-E|:', confidence: 90 })).toBe(true)
    expect(isUncertain({ text: 'Hello', confidence: 60 })).toBe(false)
  })

  it('warns when at least half of the lines are uncertain (handwriting / unclear photo)', () => {
    const good = { text: 'Hello', confidence: 90 }
    const bad = { text: '/|-E|:', confidence: 45 }
    expect(looksUnreliable([good, bad])).toBe(true)
    expect(looksUnreliable([good, good, bad])).toBe(false)
    expect(looksUnreliable([])).toBe(false)
  })
})
