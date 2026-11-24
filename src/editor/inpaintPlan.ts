import { clampRect, expandRect } from './geometry'
import type { Rect } from './types'

/** The mask is a little larger than the OCR box so anti-aliased stroke edges are removed too. */
export const MASK_PADDING = 2
/** Extra context around the mask that inpainting samples from. */
export const CROP_MARGIN = 12

/**
 * Plans an inpaint job for one text box: which crop of the image to send to the worker,
 * and where the mask is inside that crop. Only the crop is processed, which keeps it fast.
 * Returns null when the box lies outside the image.
 */
export function planInpaint(box: Rect, imgW: number, imgH: number): { crop: Rect; mask: Rect } | null {
  const inside = clampRect(box, imgW, imgH)
  if (inside.w === 0 || inside.h === 0) return null
  const mask = expandRect(inside, MASK_PADDING, imgW, imgH)
  const crop = expandRect(mask, CROP_MARGIN, imgW, imgH)
  return { crop, mask: { x: mask.x - crop.x, y: mask.y - crop.y, w: mask.w, h: mask.h } }
}
