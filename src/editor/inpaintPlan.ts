import { clampRect, expandRect } from './geometry'
import { uniformColor, type Rgb } from './solidFill'
import { dilate, dilateRadius, hasClearText, inkBox, isTextLum, lum, textMask } from './textMask'
import type { Rect } from './types'

/**
 * Plans the removal of the old text of one box (spec section 8, step 4).
 *
 * Rules (user decisions 2026-11-24):
 *  - Only the letter pixels are removed: the dilated text mask inside the box.
 *  - Bangla matra: OCR boxes often cut off the matra (the horizontal head line) at the top.
 *    So the search reaches a few px ABOVE the box, but there only text-coloured pixels that
 *    are connected to the letters inside the box are taken (the matra stroke, not whatever
 *    happens to be above the line).
 *  - Every other pixel stays exactly as in the original.
 */

/** Extra context around the area that TELEA inpainting may READ from (never written). */
export const CROP_MARGIN = 12
/** Width of the ring outside the area that is sampled for the plain-background check. */
export const RING_WIDTH = 4
/** How far above the box a matra is searched: ~25% of the box height, at least 3 px. */
export const MATRA_REACH_RATIO = 0.25
export const MIN_MATRA_REACH = 3

export const matraReach = (boxHeight: number): number =>
  Math.max(MIN_MATRA_REACH, Math.round(boxHeight * MATRA_REACH_RATIO))

/** Plain RGBA image (ImageData-compatible, also usable in tests). */
export type Pixels = { data: Uint8ClampedArray | Uint8Array; width: number; height: number }

/** Copies a rect of RGBA pixels out of an image. */
export function cropPixels(img: Pixels, r: Rect): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(r.w * r.h * 4)
  for (let row = 0; row < r.h; row++) {
    const start = ((r.y + row) * img.width + r.x) * 4
    out.set(img.data.subarray(start, start + r.w * 4), row * r.w * 4)
  }
  return out
}

/** The old text of one box: where it is and which pixels are letters. */
export type TextRegion = {
  /** Box + the strip above it (image coordinates). Everything else is outside. */
  area: Rect
  /** Rows of `area` above the box (the matra strip). */
  strip: number
  /** Area-sized, 1 = letter pixel (not dilated): box letters + connected matra pixels. */
  text: Uint8Array
  /** True when clear letters were found (otherwise the whole box is removed). */
  clear: boolean
  /** Ink box of all letter pixels, relative to `area`, or null. */
  ink: Rect | null
  /** True when the letters are darker than the background. */
  textIsDark: boolean
}

/**
 * Letter pixels of `rawBox`, including a matra just above it.
 * Returns null when the box lies outside the image.
 */
export function findText(img: Pixels, rawBox: Rect): TextRegion | null {
  const box = clampRect(rawBox, img.width, img.height)
  if (box.w === 0 || box.h === 0) return null
  const strip = Math.min(box.y, matraReach(box.h))
  const area = { x: box.x, y: box.y - strip, w: box.w, h: box.h + strip }
  const px = cropPixels(img, area)
  const w = area.w

  // Threshold and polarity come from the box only (the strip may be mostly background).
  const tm = textMask(px.subarray(strip * w * 4), box.w, box.h)
  const text = new Uint8Array(w * area.h)
  text.set(tm.mask, strip * w)
  const clear = hasClearText(tm)

  if (clear && strip > 0) {
    // Flood fill upwards from the letters' top row through text-coloured strip pixels
    // (8-connected), so only strokes attached to the letters are taken.
    const isText = (i: number): boolean =>
      isTextLum(tm, lum(px[i * 4] ?? 0, px[i * 4 + 1] ?? 0, px[i * 4 + 2] ?? 0))
    const stack: number[] = []
    for (let x = 0; x < w; x++) if (text[strip * w + x]) stack.push(strip * w + x)
    while (stack.length > 0) {
      const i = stack.pop() ?? 0
      const x = i % w
      const y = (i - x) / w
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy
          const nx = x + dx
          if (ny < 0 || ny >= strip || nx < 0 || nx >= w) continue // only into the strip
          const j = ny * w + nx
          if (text[j] || !isText(j)) continue
          text[j] = 1
          stack.push(j)
        }
      }
    }
  }
  return { area, strip, text, clear, ink: clear ? inkBox(text, w, area.h) : null, textIsDark: tm.textIsDark }
}

export type RemovalPlan = {
  /** Area that may change: the box + the matra strip above it (image coordinates). */
  area: Rect
  /** Area-sized mask, 1 = remove this pixel. */
  remove: Uint8Array
  /** Background color when the surroundings are plain (then no inpainting is needed). */
  solid: Rgb | null
  /** Area sent to the worker for TELEA (area + margin), in image coordinates. */
  crop: Rect
}

/** Area-sized removal mask: dilated letters; in the strip only around matra pixels. */
export function regionRemovalMask(region: TextRegion): Uint8Array {
  const { area, strip, text, clear } = region
  const w = area.w
  const out = new Uint8Array(w * area.h)
  if (!clear) {
    // No clear letters: the whole box (never the strip), like removalMask().
    out.fill(1, strip * w)
    return out
  }
  const r = dilateRadius(area.h - strip)
  const grown = dilate(text, w, area.h, r)
  // Strip pixels are only removed next to matra pixels, not just because a letter
  // touches the top edge of the box.
  const stripOnly = new Uint8Array(w * area.h)
  stripOnly.set(text.subarray(0, strip * w))
  const nearMatra = dilate(stripOnly, w, area.h, r)
  for (let i = 0; i < out.length; i++) {
    const inStrip = i < strip * w
    out[i] = grown[i] && (!inStrip || nearMatra[i]) ? 1 : 0
  }
  return out
}

/** Returns null when the box lies outside the image. */
export function planRemoval(img: Pixels, rawBox: Rect): RemovalPlan | null {
  const region = findText(img, rawBox)
  if (!region) return null
  const { area } = region
  const remove = regionRemovalMask(region)

  // Background samples: kept pixels of the area + a thin ring just outside it.
  const ring = expandRect(area, RING_WIDTH, img.width, img.height)
  const ringPx = cropPixels(img, ring)
  const samples: number[] = []
  for (let y = 0; y < ring.h; y++) {
    for (let x = 0; x < ring.w; x++) {
      const ax = ring.x + x - area.x
      const ay = ring.y + y - area.y
      const inArea = ax >= 0 && ay >= 0 && ax < area.w && ay < area.h
      if (inArea && remove[ay * area.w + ax]) continue
      samples.push(y * ring.w + x)
    }
  }
  const solid = uniformColor(ringPx, samples)
  return { area, remove, solid, crop: expandRect(area, CROP_MARGIN, img.width, img.height) }
}

/** Crop-sized mask for the worker (255 = remove), from the area-sized removal mask. */
export function cropMask(plan: RemovalPlan): Uint8Array<ArrayBuffer> {
  const { area, crop, remove } = plan
  const out = new Uint8Array(crop.w * crop.h)
  const ox = area.x - crop.x
  const oy = area.y - crop.y
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      if (remove[y * area.w + x]) out[(y + oy) * crop.w + x + ox] = 255
    }
  }
  return out
}

/**
 * Area-sized RGBA patch: removed pixels are opaque (new color), all other pixels are fully
 * transparent, so drawing the patch changes nothing but the letter pixels.
 * @param colorAt RGB for a removed pixel at area coordinates (x, y)
 */
export function buildPatch(
  plan: RemovalPlan,
  colorAt: (x: number, y: number) => Rgb
): Uint8ClampedArray<ArrayBuffer> {
  const { area, remove } = plan
  const out = new Uint8ClampedArray(area.w * area.h * 4)
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      const i = y * area.w + x
      if (!remove[i]) continue
      const [r, g, b] = colorAt(x, y)
      out.set([r, g, b, 255], i * 4)
    }
  }
  return out
}

/** Reads an RGB pixel of the worker's crop result at area coordinates. */
export function cropColor(plan: RemovalPlan, cropRgba: Uint8ClampedArray | Uint8Array) {
  const { area, crop } = plan
  return (x: number, y: number): Rgb => {
    const i = ((y + area.y - crop.y) * crop.w + x + area.x - crop.x) * 4
    return [cropRgba[i] ?? 0, cropRgba[i + 1] ?? 0, cropRgba[i + 2] ?? 0]
  }
}
