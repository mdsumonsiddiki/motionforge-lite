import { describe, expect, it } from 'vitest'
import { canRedo, canUndo, createHistory, HISTORY_LIMIT, pushHistory, redo, undo } from './history'

describe('history', () => {
  it('undoes and redoes', () => {
    let h = createHistory('a')
    h = pushHistory(h, 'b')
    h = pushHistory(h, 'c')
    h = undo(h)
    expect(h.present).toBe('b')
    h = undo(h)
    expect(h.present).toBe('a')
    expect(canUndo(h)).toBe(false)
    h = redo(h)
    expect(h.present).toBe('b')
    expect(canRedo(h)).toBe(true)
  })

  it('a new change clears redo', () => {
    let h = pushHistory(createHistory(1), 2)
    h = undo(h)
    h = pushHistory(h, 3)
    expect(h.present).toBe(3)
    expect(canRedo(h)).toBe(false)
    expect(undo(h).present).toBe(1)
  })

  it('undo/redo at the ends do nothing', () => {
    const h = createHistory('x')
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })

  it('ignores pushing the same state', () => {
    const h = createHistory('x')
    expect(pushHistory(h, 'x')).toBe(h)
  })

  it('caps the number of steps', () => {
    let h = createHistory(0)
    for (let i = 1; i <= HISTORY_LIMIT + 20; i++) h = pushHistory(h, i)
    expect(h.past).toHaveLength(HISTORY_LIMIT)
    expect(h.past[0]).toBe(20)
  })
})
