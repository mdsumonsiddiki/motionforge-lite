import { describe, expect, it } from 'vitest'
import {
  addImageLayer,
  applyTextEdit,
  parseEdits,
  removeLayer,
  serializeEdits,
  setLayerRect,
  textForBox
} from './edits'
import type { OcrBox } from './types'

const box: OcrBox = { id: 'b1', rect: { x: 10, y: 20, w: 100, h: 30 }, text: 'Hello', confidence: 90 }
const style = { fontFamily: 'Noto Sans', fontSize: 24, color: '#112233' }

describe('edits', () => {
  it('adds a text layer, and editing the same box again replaces it', () => {
    let layers = applyTextEdit([], box, 'Hi', style, 'L1')
    expect(layers).toHaveLength(1)
    expect(textForBox(layers, box)).toBe('Hi')
    layers = applyTextEdit(layers, box, 'হ্যালো', { ...style, fontFamily: 'Hind Siliguri' }, 'L2')
    expect(layers).toHaveLength(1)
    expect(layers[0]).toMatchObject({ id: 'L1', text: 'হ্যালো', fontFamily: 'Hind Siliguri' })
  })

  it('returns the OCR text for an unedited box', () => {
    expect(textForBox([], box)).toBe('Hello')
  })

  it('adds, moves and removes an image layer', () => {
    let layers = addImageLayer([], { x: 0, y: 0, w: 10, h: 10 }, 'data:image/png;base64,AA', 'I1')
    layers = setLayerRect(layers, 'I1', { x: 5, y: 5, w: 20, h: 20 })
    expect(layers[0]?.rect).toEqual({ x: 5, y: 5, w: 20, h: 20 })
    expect(removeLayer(layers, 'I1')).toEqual([])
  })

  it('round-trips edits.json', () => {
    const layers = addImageLayer(
      applyTextEdit([], box, 'Hi', style, 'L1'),
      { x: 1, y: 2, w: 3, h: 4 },
      'data:image/jpeg;base64,AA',
      'I1'
    )
    const json = serializeEdits([box], layers, true)
    expect(JSON.parse(json).version).toBe(1)
    expect(parseEdits(json)).toEqual({ ocrDone: true, ocr: [box], layers })
    // Saved before OCR finished → OCR must run again on open.
    expect(parseEdits(serializeEdits([], layers, false)).ocrDone).toBe(false)
  })

  it('drops invalid entries and survives broken JSON', () => {
    const json = JSON.stringify({
      version: 1,
      ocr: [box, { id: 'x' }],
      layers: [
        { id: 'a', kind: 'text', boxId: 'b1', rect: box.rect, text: 't', fontFamily: 'f', fontSize: 9, color: 'red' },
        { id: 'b', kind: 'image', rect: box.rect, dataUrl: 'javascript:alert(1)' },
        { id: 'c', kind: 'other', rect: box.rect }
      ]
    })
    expect(parseEdits(json)).toEqual({ ocrDone: false, ocr: [box], layers: [] })
    expect(parseEdits('{oops')).toEqual({ ocrDone: false, ocr: [], layers: [] })
    expect(parseEdits(null)).toEqual({ ocrDone: false, ocr: [], layers: [] })
  })
})
