import { describe, expect, it } from 'vitest'
import { continueTarget, gettingStarted } from './homeModel'

const slots = [{ key: 'a' }, { key: 'b' }]
const saved = [
  { id: 'n', name: 'Newest' },
  { id: 'o', name: 'Older' }
]

describe('continueTarget', () => {
  it('uses the active slot', () => {
    expect(continueTarget(slots, 'b', saved)).toEqual({ kind: 'open', slot: slots[1], slotNumber: 2 })
  })

  it('falls back to the first open slot', () => {
    expect(continueTarget(slots, null, saved)).toEqual({ kind: 'open', slot: slots[0], slotNumber: 1 })
    expect(continueTarget(slots, 'gone', [])).toMatchObject({ kind: 'open', slotNumber: 1 })
  })

  it('uses the newest saved document when nothing is open', () => {
    expect(continueTarget([], null, saved)).toEqual({ kind: 'saved', item: saved[0] })
  })

  it('asks for the first document when there is none', () => {
    expect(continueTarget([], null, [])).toEqual({ kind: 'none' })
  })
})

describe('gettingStarted', () => {
  it('counts the finished steps', () => {
    expect(gettingStarted(0, 0, false)).toEqual({ steps: [false, false, false], done: 0, percent: 0 })
    expect(gettingStarted(2, 0, false)).toEqual({ steps: [true, false, false], done: 1, percent: 33 })
    expect(gettingStarted(1, 1, true).percent).toBe(100)
  })
})
