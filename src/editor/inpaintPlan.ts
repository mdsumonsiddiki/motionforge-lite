import { clampRect, expandRect } from './geometry'
import type { Rect } from './types'

/**
 * The mask is larger than the OCR box so the whole old text is removed: Bangla matra
 * (top line), vowel signs above/below the line, descenders and anti-aliased edges often
 * stick out of the OCR line box. Padding = ~15% of the box height, at least 2 px.
 */
export const MASK_PADDING_RATIO = 0.15
export const MIN_MASK_PADDING = 2

export function maskPadding(boxHeight: number): number {
  return Math.max(MIN_MASK_PADDING, Math.round(boxHeight * MASK_PADDING_RATIO))
}

/** Extra context around the mask that inpainting / the background check samples from. */
export const CROP_MARGIN = 12

/**
 * Plans an inpaint job for one text box: which crop of the image to send to the worker,
 * and where the mask is inside that crop. Only the crop is processed, which keeps it fast.
 * Returns null when the box lies outside the image.
 */
export function planInpaint(box: Rect, imgW: number, imgH: number): { crop: Rect; mask: Rect } | null {
  const inside = clampRect(box, imgW, imgH)
  if (inside.w === 0 || inside.h === 0) return null
  const mask = expandRect(inside, maskPadding(inside.h), imgW, imgH)
  const crop = expandRect(mask, CROP_MARGIN, imgW, imgH)
  return { crop, mask: { x: mask.x - crop.x, y: mask.y - crop.y, w: mask.w, h: mask.h } }
}
