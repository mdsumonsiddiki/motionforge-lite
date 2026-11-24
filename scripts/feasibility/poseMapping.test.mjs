import { describe, expect, it } from 'vitest'
import { NEUTRAL, stateKey, stateToParams } from './poseMapping.mjs'

const withState = (patch) => ({
  head: { ...NEUTRAL.head, ...patch.head },
  eyes: { ...NEUTRAL.eyes, ...patch.eyes },
  mouth: patch.mouth ?? NEUTRAL.mouth
})

describe('poseMapping', () => {
  it('maps the neutral state to all-zero motion', () => {
    const p = stateToParams(NEUTRAL)
    expect([p.rotate_yaw, p.rotate_pitch, p.blink, p.pupil_x, p.aaa, p.smile]).toEqual([
      0, 0, 0, 0, 0, 0
    ])
  })

  it('clamps yaw to the model limit (spec allows 25, model 20)', () => {
    expect(stateToParams(withState({ head: { yaw: 25 } })).rotate_yaw).toBe(20)
    expect(stateToParams(withState({ head: { yaw: -40 } })).rotate_yaw).toBe(-20)
  })

  it('clamps pitch to the spec limit of 15', () => {
    expect(stateToParams(withState({ head: { pitch: 30 } })).rotate_pitch).toBe(15)
  })

  it('never sends roll (roll is local)', () => {
    expect(stateToParams(withState({ head: { roll: 10 } })).rotate_roll).toBe(0)
  })

  it('maps eyes closed, gaze and mouth states', () => {
    const p = stateToParams(withState({ eyes: { direction: 'left', open: false }, mouth: 'smile' }))
    expect(p.blink).toBeLessThan(0)
    expect(p.pupil_x).toBeLessThan(0)
    expect(p.smile).toBe(1)
    expect(stateToParams(withState({ mouth: 'open' })).aaa).toBeGreaterThan(0)
  })

  it('builds a stable key that ignores roll', () => {
    const a = stateKey(withState({ head: { yaw: 5, roll: 0 } }))
    const b = stateKey(withState({ head: { yaw: 5, roll: 12 } }))
    expect(a).toBe(b)
    expect(a).toBe('y5_p0_ecenter-o_mneutral')
  })
})
