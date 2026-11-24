import { beforeEach, describe, expect, it } from 'vitest'
import { isDirty, useDocumentStore, type NewSlotInput } from './documentStore'
import type { Layer } from '../editor/types'

const input = (over: Partial<NewSlotInput> = {}): NewSlotInput => ({
  docId: null,
  name: 'Doc',
  original: { type: 'png', data: new Uint8Array([1]) },
  width: 100,
  height: 50,
  ocr: null,
  layers: [],
  ...over
})

const imageLayer: Layer = {
  id: 'i1',
  kind: 'image',
  rect: { x: 0, y: 0, w: 10, h: 10 },
  dataUrl: 'data:image/png;base64,AA'
}

const store = () => useDocumentStore.getState()
const slot = (key: string) => store().slots.find((s) => s.key === key)!

describe('documentStore', () => {
  beforeEach(() => useDocumentStore.setState({ slots: [], activeKey: null }))

  it('opens at most 3 slots', () => {
    expect(store().openSlot(input()).status).toBe('opened')
    expect(store().openSlot(input()).status).toBe('opened')
    expect(store().openSlot(input()).status).toBe('opened')
    expect(store().openSlot(input())).toEqual({ status: 'full' })
    expect(store().slots).toHaveLength(3)
  })

  it('re-opening a saved document switches to its slot', () => {
    const a = store().openSlot(input({ docId: 'd1', ocr: [] }))
    store().openSlot(input())
    const again = store().openSlot(input({ docId: 'd1', ocr: [] }))
    expect(again).toEqual({ status: 'existing', key: a.status === 'opened' ? a.key : '' })
    expect(store().activeKey).toBe(again.status === 'existing' ? again.key : null)
    expect(store().slots).toHaveLength(2)
  })

  it('a new image runs OCR; a saved one reuses stored OCR boxes', () => {
    const n = store().openSlot(input())
    const s = store().openSlot(input({ docId: 'd1', ocr: [] }))
    if (n.status !== 'opened' || s.status !== 'opened') throw new Error('expected opened')
    expect(slot(n.key).ocrStatus).toBe('running')
    expect(slot(s.key).ocrStatus).toBe('done')
  })

  it('tracks unsaved changes, undo/redo and save', () => {
    const r = store().openSlot(input({ docId: 'd1', ocr: [] }))
    if (r.status !== 'opened') throw new Error('expected opened')
    expect(isDirty(slot(r.key))).toBe(false)

    store().commitLayers(r.key, [imageLayer])
    expect(isDirty(slot(r.key))).toBe(true)
    store().undo(r.key)
    expect(slot(r.key).history.present).toEqual([])
    expect(isDirty(slot(r.key))).toBe(false)
    store().redo(r.key)
    expect(slot(r.key).history.present).toEqual([imageLayer])

    store().markSaved(r.key, { id: 'd1', name: 'Doc', createdAt: 'a', updatedAt: 'b' })
    expect(isDirty(slot(r.key))).toBe(false)
    store().update(r.key, { name: 'Renamed' })
    expect(isDirty(slot(r.key))).toBe(true)
  })

  it('a never-saved document counts as unsaved', () => {
    const r = store().openSlot(input())
    if (r.status !== 'opened') throw new Error('expected opened')
    expect(isDirty(slot(r.key))).toBe(true)
  })

  it('closing the active slot activates a neighbour', () => {
    const a = store().openSlot(input())
    const b = store().openSlot(input())
    if (a.status !== 'opened' || b.status !== 'opened') throw new Error('expected opened')
    store().closeSlot(b.key)
    expect(store().activeKey).toBe(a.key)
    store().closeSlot(a.key)
    expect(store().activeKey).toBeNull()
  })
})
