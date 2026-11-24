import { clampRect, expandRect } from './geometry'
import { uniformColor, type Rgb } from './solidFill'
import { removalMask, textMask } from './textMask'
import type { Rect } from './types'

/**
 * Plans the removal of the old text of one box (spec section 8, step 4).
 *
 * Rule (user decision 2026-11-24): only the letter pixels are removed — the dilated text
 * mask inside the box. Every pixel outside that mask, and every pixel outside the box,
 * stays exactly as in the original.
 */

/** Extra context around the box that TELEA inpainting may READ from (never written). */
export const CROP_MARGIN = 12
/** Width of the ring outside the box that is sampled for the plain-background check. */
export const RING_WIDTH = 4

/** Plain RGBA image (ImageData-compatible, also usable in tests). */
export type Pixels = { data: Uint8ClampedArray | Uint8Array; width: number; height: number }

export type RemovalPlan = {
  /** The box, clamped to the image and rounded to whole pixels. */
  box: Rect
  /** Box-sized mask, 1 = remove this pixel. */
  remove: Uint8Array
  /** Background color when the surroundings are plain (then no inpainting is needed). */
  solid: Rgb | null
  /** Area sent to the worker for TELEA (box + margin), in image coordinates. */
  crop: Rect
}

/** Copies a rect of RGBA pixels out of an image. */
export function cropPixels(img: Pixels, r: Rect): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(r.w * r.h * 4)
  for (let row = 0; row < r.h; row++) {
    const start = ((r.y + row) * img.width + r.x) * 4
    out.set(img.data.subarray(start, start + r.w * 4), row * r.w * 4)
  }
  return out
}

/** Returns null when the box lies outside the image. */
export function planRemoval(img: Pixels, rawBox: Rect): RemovalPlan | null {
  const box = clampRect(rawBox, img.width, img.height)
  if (box.w === 0 || box.h === 0) return null
  const boxPx = cropPixels(img, box)
  const remove = removalMask(textMask(boxPx, box.w, box.h))

  // Background samples: box pixels that are kept + a thin ring just outside the box.
  const ring = expandRect(box, RING_WIDTH, img.width, img.height)
  const ringPx = cropPixels(img, ring)
  const samples: number[] = []
  for (let y = 0; y < ring.h; y++) {
    for (let x = 0; x < ring.w; x++) {
      const bx = ring.x + x - box.x
      const by = ring.y + y - box.y
      const inBox = bx >= 0 && by >= 0 && bx < box.w && by < box.h
      if (inBox && remove[by * box.w + bx]) continue
      samples.push(y * ring.w + x)
    }
  }
  const solid = uniformColor(ringPx, samples)
  return { box, remove, solid, crop: expandRect(box, CROP_MARGIN, img.width, img.height) }
}

/** Crop-sized mask for the worker (255 = remove), from the box-sized removal mask. */
export function cropMask(plan: RemovalPlan): Uint8Array<ArrayBuffer> {
  const { box, crop, remove } = plan
  const out = new Uint8Array(crop.w * crop.h)
  const ox = box.x - crop.x
  const oy = box.y - crop.y
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      if (remove[y * box.w + x]) out[(y + oy) * crop.w + x + ox] = 255
    }
  }
  return out
}

/**
 * Box-sized RGBA patch: removed pixels are opaque (new color), all other pixels are fully
 * transparent, so drawing the patch changes nothing but the letter pixels.
 * @param colorAt RGB for a removed pixel at box coordinates (x, y)
 */
export function buildPatch(
  plan: RemovalPlan,
  colorAt: (x: number, y: number) => Rgb
): Uint8ClampedArray<ArrayBuffer> {
  const { box, remove } = plan
  const out = new Uint8ClampedArray(box.w * box.h * 4)
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = y * box.w + x
      if (!remove[i]) continue
      const [r, g, b] = colorAt(x, y)
      out.set([r, g, b, 255], i * 4)
    }
  }
  return out
}

/** Reads an RGB pixel of the worker's crop result at box coordinates. */
export function cropColor(plan: RemovalPlan, cropRgba: Uint8ClampedArray | Uint8Array) {
  const { box, crop } = plan
  return (x: number, y: number): Rgb => {
    const i = ((y + box.y - crop.y) * crop.w + x + box.x - crop.x) * 4
    return [cropRgba[i] ?? 0, cropRgba[i + 1] ?? 0, cropRgba[i + 2] ?? 0]
  }
}
