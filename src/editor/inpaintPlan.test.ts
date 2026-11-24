import { describe, expect, it } from 'vitest'
import { buildPatch, CROP_MARGIN, cropColor, cropMask, planRemoval, type Pixels } from './inpaintPlan'

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
  plan.remove[(y - plan.box.y) * plan.box.w + (x - plan.box.x)] === 1

describe('planRemoval', () => {
  it('removes the letters only — not the rest of the box', () => {
    const plan = planRemoval(image(() => [250, 250, 250]), BOX)!
    expect(removes(plan, 27, 17)).toBe(true) // letter
    expect(removes(plan, 35, 17)).toBe(false) // gap between letters
    expect(removes(plan, 21, 11)).toBe(false) // box corner
    expect(plan.remove.length).toBe(BOX.w * BOX.h) // mask is box-sized: nothing outside the box
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

  it('crops a margin around the box for inpainting context', () => {
    const plan = planRemoval(image(() => [250, 250, 250]), BOX)!
    expect(plan.crop).toEqual({
      x: BOX.x - CROP_MARGIN,
      y: BOX.y - CROP_MARGIN + 2, // clamped at the top edge (10 - 12 < 0)
      w: BOX.w + 2 * CROP_MARGIN,
      h: BOX.h + 2 * CROP_MARGIN - 2
    })
  })

  it('returns null for a box outside the image', () => {
    expect(planRemoval(image(() => [255, 255, 255]), { x: 500, y: 500, w: 10, h: 10 })).toBeNull()
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
    const alpha = (x: number, y: number) => px[((y - plan.box.y) * plan.box.w + (x - plan.box.x)) * 4 + 3]
    expect(alpha(27, 17)).toBe(255)
    expect(alpha(35, 17)).toBe(0)
    expect(alpha(21, 11)).toBe(0)
  })

  it('reads the worker result at box coordinates', () => {
    const crop = new Uint8ClampedArray(plan.crop.w * plan.crop.h * 4)
    const i = ((BOX.y - plan.crop.y) * plan.crop.w + (BOX.x - plan.crop.x)) * 4
    crop.set([9, 8, 7, 255], i)
    expect(cropColor(plan, crop)(0, 0)).toEqual([9, 8, 7])
  })
})
