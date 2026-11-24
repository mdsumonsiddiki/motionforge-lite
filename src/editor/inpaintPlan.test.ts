import { describe, expect, it } from 'vitest'
import { CROP_MARGIN, MASK_PADDING, planInpaint } from './inpaintPlan'

describe('planInpaint', () => {
  it('crops around the padded mask', () => {
    const plan = planInpaint({ x: 100, y: 50, w: 200, h: 30 }, 1000, 1000)
    const pad = MASK_PADDING
    const m = CROP_MARGIN
    expect(plan).toEqual({
      crop: { x: 100 - pad - m, y: 50 - pad - m, w: 200 + 2 * (pad + m), h: 30 + 2 * (pad + m) },
      mask: { x: m, y: m, w: 200 + 2 * pad, h: 30 + 2 * pad }
    })
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
