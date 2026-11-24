import { describe, expect, it } from 'vitest'
import { CROP_MARGIN, maskPadding, MIN_MASK_PADDING, planInpaint } from './inpaintPlan'

describe('maskPadding', () => {
  it('is about 15% of the box height', () => {
    expect(maskPadding(40)).toBe(6)
    expect(maskPadding(100)).toBe(15)
    expect(maskPadding(30)).toBe(5) // 4.5 rounds up
  })

  it('never goes below the minimum for small boxes', () => {
    expect(maskPadding(5)).toBe(MIN_MASK_PADDING)
    expect(maskPadding(0)).toBe(MIN_MASK_PADDING)
  })
})

describe('planInpaint', () => {
  it('crops around the padded mask (padding from the box height)', () => {
    const plan = planInpaint({ x: 100, y: 50, w: 200, h: 40 }, 1000, 1000)
    const pad = 6 // 15% of 40
    const m = CROP_MARGIN
    expect(plan).toEqual({
      crop: { x: 100 - pad - m, y: 50 - pad - m, w: 200 + 2 * (pad + m), h: 40 + 2 * (pad + m) },
      mask: { x: m, y: m, w: 200 + 2 * pad, h: 40 + 2 * pad }
    })
  })

  it('covers a matra just above the OCR box', () => {
    // Box 40 px high at y=50; a matra 4 px above the box (y=46) must be inside the mask.
    const plan = planInpaint({ x: 100, y: 50, w: 200, h: 40 }, 1000, 1000)
    const maskTop = (plan?.crop.y ?? 0) + (plan?.mask.y ?? 0)
    expect(maskTop).toBeLessThanOrEqual(46)
  })

  it('clips at the image edges', () => {
    const plan = planInpaint({ x: 0, y: 0, w: 20, h: 10 }, 25, 12)
    expect(plan?.crop).toEqual({ x: 0, y: 0, w: 25, h: 12 })
    expect(plan?.mask).toEqual({ x: 0, y: 0, w: 22, h: 12 })
  })

  it('returns null for a box outside the image', () => {
    expect(planInpaint({ x: 500, y: 500, w: 10, h: 10 }, 100, 100)).toBeNull()
  })
})
