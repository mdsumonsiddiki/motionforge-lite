import type { Rect } from './types'

/** Keeps a rect inside a w×h image and rounds it to whole pixels. */
export function clampRect(r: Rect, imgW: number, imgH: number): Rect {
  const clamp = (v: number, max: number): number => Math.max(0, Math.min(v, max))
  const x0 = clamp(Math.round(r.x), imgW)
  const y0 = clamp(Math.round(r.y), imgH)
  // The far edge is clamped separately, so a part hanging off the left/top is cut off.
  const x1 = clamp(Math.round(r.x + r.w), imgW)
  const y1 = clamp(Math.round(r.y + r.h), imgH)
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }
}

/** Grows a rect by `by` px on every side (then clamps to the image). */
export function expandRect(r: Rect, by: number, imgW: number, imgH: number): Rect {
  return clampRect({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by }, imgW, imgH)
}

/** Rect from two drag points (any direction). */
export function rectFromPoints(ax: number, ay: number, bx: number, by: number): Rect {
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) }
}

/** Minimum size of a placed image, so it can still be grabbed. */
export const MIN_LAYER_SIZE = 8

export type Handle = 'nw' | 'ne' | 'sw' | 'se'

/** New rect after dragging a corner handle by (dx, dy). The opposite corner stays fixed. */
export function resizeRect(r: Rect, handle: Handle, dx: number, dy: number): Rect {
  let { x, y, w, h } = r
  if (handle === 'nw' || handle === 'sw') {
    const nw = Math.max(MIN_LAYER_SIZE, w - dx)
    x += w - nw
    w = nw
  } else {
    w = Math.max(MIN_LAYER_SIZE, w + dx)
  }
  if (handle === 'nw' || handle === 'ne') {
    const nh = Math.max(MIN_LAYER_SIZE, h - dy)
    y += h - nh
    h = nh
  } else {
    h = Math.max(MIN_LAYER_SIZE, h + dy)
  }
  return { x, y, w, h }
}

/** Largest scale (≤ 1) at which a w×h image fits into a box. */
export function fitScale(imgW: number, imgH: number, boxW: number, boxH: number): number {
  if (imgW <= 0 || imgH <= 0 || boxW <= 0 || boxH <= 0) return 1
  return Math.min(1, boxW / imgW, boxH / imgH)
}
