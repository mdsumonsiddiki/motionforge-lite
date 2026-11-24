/** Message sent to inpaint.worker.ts. `pixels` is the RGBA crop (transferred, not copied). */
export type InpaintRequest = {
  id: number
  opencvUrl: string
  width: number
  height: number
  pixels: ArrayBuffer
  /**
   * Pixels to remove: one byte per crop pixel, 255 = remove (the dilated text mask),
   * 0 = keep. Transferred, not copied.
   */
  mask: ArrayBuffer
}

export type InpaintResponse = { id: number; pixels: ArrayBuffer } | { id: number; error: string }
