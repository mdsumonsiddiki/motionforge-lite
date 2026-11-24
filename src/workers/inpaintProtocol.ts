import type { Rect } from '../editor/types'

/** Message sent to inpaint.worker.ts. `pixels` is the RGBA crop (transferred, not copied). */
export type InpaintRequest = {
  id: number
  opencvUrl: string
  width: number
  height: number
  pixels: ArrayBuffer
  /** Area to remove, relative to the crop. */
  mask: Rect
}

export type InpaintResponse = { id: number; pixels: ArrayBuffer } | { id: number; error: string }
