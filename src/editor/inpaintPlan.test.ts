import { describe, expect, it } from 'vitest'
import { buildPatch, CROP_MARGIN, cropColor, cropMask, findText, matraReach, planRemoval, type Pixels } from './inpaintPlan'

const W = 80
const H = 40
const BOX = { x: 20, y: 10, w: 40, h: 16 }

/**
 * W×H image. Inside BOX: dark letters at rows 14..21, columns 25..29 and 40..44.
 * `bg(x, y)` gives every other pixel (paper, a photo, ...).
 */
function image(bg: (x: number, y: number) => number[]): Pixels {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const letter = y >= 14 && y <= 21 && ((x >= 25 && x <= 29) || (x >= 40 && x <= 44))
      data.set([...(letter ? [10, 10, 10] : bg(x, y)), 255], (y * W + x) * 4)
    }
  }
  return { data, width: W, height: H }
}

/** Box pixel (x, y in image coordinates) is marked for removal. */
const removes = (plan: NonNullable<ReturnType<typeof planRemoval>>, x: number, y: number): boolean =>
  plan.remove[(y - plan.area.y) * plan.area.w + (x - plan.area.x)] === 1

describe('planRemoval', () => {
  it('removes the letters only — not the rest of the box', () => {
    const plan = planRemoval(image(() => [250, 250, 250]), BOX)!
    expect(removes(plan, 27, 17)).toBe(true) // letter
    expect(removes(plan, 35, 17)).toBe(false) // gap between letters
    expect(removes(plan, 21, 11)).toBe(false) // box corner
    expect(plan.area).toEqual({ x: BOX.x, y: BOX.y - 4, w: BOX.w, h: BOX.h + 4 }) // box + matra strip
    expect(removes(plan, 27, 8)).toBe(false) // no matra here: the strip above is kept
  })

  it('keeps a picture (e.g. a face) next to the letters inside the box', () => {
    // Light "skin" area with a soft gradient on the right part of the box.
    const plan = planRemoval(
      image((x) => (x >= 48 ? [230 - (x - 48), 190, 160] : [245, 245, 245])),
      BOX
    )!
    for (let y = BOX.y; y < BOX.y + BOX.h; y++) {
      for (let x = 50; x < BOX.x + BOX.w; x++) expect(removes(plan, x, y)).toBe(false)
    }
  })

  it('uses a solid fill on a plain page', () => {
    expect(planRemoval(image(() => [250, 248, 240]), BOX)?.solid).toEqual([250, 248, 240])
  })

  it('needs inpainting on a patterned background', () => {
    const stripes = image((x) => (x % 4 < 2 ? [255, 255, 255] : [140, 170, 230]))
    expect(planRemoval(stripes, BOX)?.solid).toBeNull()
  })

  it('crops a margin around the area for inpainting context', () => {
    const plan = planRemoval(image(() => [250, 250, 250]), BOX)!
    expect(plan.crop).toEqual({
      x: BOX.x - CROP_MARGIN,
      y: 0, // clamped at the top edge (area y 6 - 12 < 0)
      w: BOX.w + 2 * CROP_MARGIN,
      h: 6 + BOX.h + 4 + CROP_MARGIN
    })
  })

  it('returns null for a box outside the image', () => {
    expect(planRemoval(image(() => [255, 255, 255]), { x: 500, y: 500, w: 10, h: 10 })).toBeNull()
  })
})

describe('Bangla matra above the OCR box', () => {
  // Box rows 10..21. Letters touch the box top (rows 10..19); a matra (rows 8..9) joins them
  // just ABOVE the box. A dark dot at (45, 8) is above the box too but not connected.
  const box = { x: 10, y: 10, w: 40, h: 12 }
  function matraImage(withMatra: boolean): Pixels {
    const data = new Uint8ClampedArray(W * H * 4)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const letter = y >= 10 && y <= 19 && ((x >= 15 && x <= 19) || (x >= 30 && x <= 34))
        const matra = withMatra && (y === 8 || y === 9) && x >= 14 && x <= 36
        const dot = y === 8 && x === 45
        data.set([...(letter || matra || dot ? [15, 15, 15] : [250, 250, 250]), 255], (y * W + x) * 4)
      }
    }
    return { data, width: W, height: H }
  }

  it('removes a matra connected to the letters, even above the box', () => {
    const plan = planRemoval(matraImage(true), box)!
    expect(removes(plan, 25, 8)).toBe(true) // matra between the letters
    expect(removes(plan, 14, 9)).toBe(true)
  })

  it('keeps unconnected marks above the box and everything beyond the reach', () => {
    const plan = planRemoval(matraImage(true), box)!
    expect(removes(plan, 45, 8)).toBe(false)
    expect(plan.area.y).toBe(box.y - matraReach(box.h)) // rows above this never change
  })

  it('does not grow into the strip when there is no matra', () => {
    const plan = planRemoval(matraImage(false), box)!
    expect(removes(plan, 17, 9)).toBe(false)
    expect(removes(plan, 17, 10)).toBe(true)
  })

  it('counts the matra in the glyph height (ink box)', () => {
    const region = findText(matraImage(true), box)!
    expect(region.ink).toEqual({ x: 4, y: 1, w: 23, h: 12 }) // rows 8..19, x 14..36
  })
})

describe('cropMask / buildPatch', () => {
  const plan = planRemoval(image(() => [250, 250, 250]), BOX)!

  it('places the removal mask at the box position inside the crop', () => {
    const m = cropMask(plan)
    const at = (x: number, y: number) => m[(y - plan.crop.y) * plan.crop.w + (x - plan.crop.x)]
    expect(at(27, 17)).toBe(255)
    expect(at(35, 17)).toBe(0)
    expect(at(5, 5)).toBe(0) // crop margin, outside the box
  })

  it('is transparent everywhere except the removed pixels', () => {
    const px = buildPatch(plan, () => [1, 2, 3])
    const alpha = (x: number, y: number) => px[((y - plan.area.y) * plan.area.w + (x - plan.area.x)) * 4 + 3]
    expect(alpha(27, 17)).toBe(255)
    expect(alpha(35, 17)).toBe(0)
    expect(alpha(21, 11)).toBe(0)
  })

  it('reads the worker result at area coordinates', () => {
    const crop = new Uint8ClampedArray(plan.crop.w * plan.crop.h * 4)
    const i = ((plan.area.y - plan.crop.y) * plan.crop.w + (plan.area.x - plan.crop.x)) * 4
    crop.set([9, 8, 7, 255], i)
    expect(cropColor(plan, crop)(0, 0)).toEqual([9, 8, 7])
  })
})
