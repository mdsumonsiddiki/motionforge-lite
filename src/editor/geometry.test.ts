import { describe, expect, it } from 'vitest'
import { clampRect, expandRect, fitScale, MIN_LAYER_SIZE, rectFromPoints, resizeRect } from './geometry'

describe('geometry', () => {
  it('clamps a rect into the image', () => {
    expect(clampRect({ x: -5, y: 10.4, w: 50, h: 500 }, 40, 100)).toEqual({ x: 0, y: 10, w: 40, h: 90 })
  })

  it('expands a rect and clamps it', () => {
    // Grows to x=-2..16; the part left of 0 is cut off.
    expect(expandRect({ x: 2, y: 2, w: 10, h: 10 }, 4, 100, 100)).toEqual({ x: 0, y: 0, w: 16, h: 16 })
    expect(expandRect({ x: 10, y: 10, w: 10, h: 10 }, 4, 100, 100)).toEqual({ x: 6, y: 6, w: 18, h: 18 })
  })

  it('builds a rect from a drag in any direction', () => {
    expect(rectFromPoints(30, 40, 10, 15)).toEqual({ x: 10, y: 15, w: 20, h: 25 })
  })

  it('resizes from each corner keeping the opposite corner fixed', () => {
    const r = { x: 10, y: 10, w: 100, h: 50 }
    expect(resizeRect(r, 'se', 20, 10)).toEqual({ x: 10, y: 10, w: 120, h: 60 })
    expect(resizeRect(r, 'nw', 20, 10)).toEqual({ x: 30, y: 20, w: 80, h: 40 })
    expect(resizeRect(r, 'ne', -10, -10)).toEqual({ x: 10, y: 0, w: 90, h: 60 })
    expect(resizeRect(r, 'sw', -10, 5)).toEqual({ x: 0, y: 10, w: 110, h: 55 })
  })

  it('never shrinks below the minimum size', () => {
    const out = resizeRect({ x: 0, y: 0, w: 20, h: 20 }, 'nw', 100, 100)
    expect(out.w).toBe(MIN_LAYER_SIZE)
    expect(out.h).toBe(MIN_LAYER_SIZE)
    expect(out.x + out.w).toBe(20)
  })

  it('computes a fit scale that never enlarges', () => {
    expect(fitScale(2000, 1000, 1000, 1000)).toBe(0.5)
    expect(fitScale(100, 100, 1000, 1000)).toBe(1)
    expect(fitScale(0, 100, 10, 10)).toBe(1)
  })
})
