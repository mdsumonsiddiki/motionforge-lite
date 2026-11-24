import { planInpaint } from '../editor/inpaintPlan'
import type { Rect } from '../editor/types'
import type { InpaintRequest, InpaintResponse } from './inpaintProtocol'

/** An inpainted piece of the image, drawn over the original at (x, y). */
export type Patch = { x: number; y: number; image: ImageData }

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (b: ArrayBuffer) => void; reject: (e: Error) => void }>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./inpaint.worker.ts', import.meta.url))
    worker.onmessage = (e: MessageEvent<InpaintResponse>) => {
      const job = pending.get(e.data.id)
      if (!job) return
      pending.delete(e.data.id)
      if ('error' in e.data) job.reject(new Error(e.data.error))
      else job.resolve(e.data.pixels)
    }
    worker.onerror = () => {
      for (const job of pending.values()) job.reject(new Error('Inpaint worker crashed'))
      pending.clear()
      worker = null
    }
  }
  return worker
}

const opencvUrl = (): string => new URL('opencv/opencv.js', document.baseURI).href

/**
 * Removes the content of `box` from the original image (spec section 8, step 4).
 * @param original pixels of the untouched original image
 */
export function inpaintBox(original: ImageData, box: Rect): Promise<Patch | null> {
  const plan = planInpaint(box, original.width, original.height)
  if (!plan) return Promise.resolve(null)
  const { crop, mask } = plan

  // Copy the crop rows out of the full image.
  const pixels = new Uint8ClampedArray(crop.w * crop.h * 4)
  for (let row = 0; row < crop.h; row++) {
    const start = ((crop.y + row) * original.width + crop.x) * 4
    pixels.set(original.data.subarray(start, start + crop.w * 4), row * crop.w * 4)
  }

  const id = nextId++
  const req: InpaintRequest = {
    id,
    opencvUrl: opencvUrl(),
    width: crop.w,
    height: crop.h,
    pixels: pixels.buffer,
    mask
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage(req, [pixels.buffer])
  }).then((buffer) => {
    // Keep only the masked area: the margin around it is unchanged original pixels, and
    // drawing it back would cover neighbouring edits (e.g. the line just above).
    const full = new Uint8ClampedArray(buffer)
    const out = new Uint8ClampedArray(mask.w * mask.h * 4)
    for (let row = 0; row < mask.h; row++) {
      const start = ((mask.y + row) * crop.w + mask.x) * 4
      out.set(full.subarray(start, start + mask.w * 4), row * mask.w * 4)
    }
    return { x: crop.x + mask.x, y: crop.y + mask.y, image: new ImageData(out, mask.w, mask.h) }
  })
}
