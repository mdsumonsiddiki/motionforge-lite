import {
  buildPatch,
  cropColor,
  cropMask,
  cropPixels,
  planRemoval,
  type Pixels
} from '../editor/inpaintPlan'
import type { Rect } from '../editor/types'
import type { InpaintRequest, InpaintResponse } from './inpaintProtocol'

/**
 * A removal patch, box-sized, drawn over the original at (x, y).
 * Only the old letter pixels are opaque; every other pixel is transparent.
 */
export type Patch = { x: number; y: number; image: ImageData }

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (b: ArrayBuffer) => void; reject: (e: Error) => void }>()

function getWorker(): Worker {
  if (!worker) {
    // Classic worker on purpose (OpenCV is loaded with importScripts) — do not add
    // { type: 'module' }. See the comment at the top of inpaint.worker.ts.
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
 * Removes the old letters inside `box` (and a matra just above it) (spec section 8, step 4).
 * The text mask is computed on the main thread (one line box, cheap); only TELEA
 * inpainting of a patterned background runs in the worker.
 * @param original pixels of the untouched original image
 */
export function inpaintBox(original: Pixels, box: Rect): Promise<Patch | null> {
  const plan = planRemoval(original, box)
  if (!plan) return Promise.resolve(null)
  const at = { x: plan.area.x, y: plan.area.y }

  // Plain background (e.g. a white page): fill the letter pixels with that color.
  if (plan.solid) {
    const color = plan.solid
    const image = new ImageData(buildPatch(plan, () => color), plan.area.w, plan.area.h)
    return Promise.resolve({ ...at, image })
  }

  // Patterned / textured background: OpenCV TELEA on the letter pixels only.
  const { crop } = plan
  const pixels = cropPixels(original, crop)
  const mask = cropMask(plan)
  const id = nextId++
  const req: InpaintRequest = {
    id,
    opencvUrl: opencvUrl(),
    width: crop.w,
    height: crop.h,
    pixels: pixels.buffer,
    mask: mask.buffer
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage(req, [pixels.buffer, mask.buffer])
  }).then((buffer) => {
    const image = new ImageData(buildPatch(plan, cropColor(plan, new Uint8ClampedArray(buffer))), plan.area.w, plan.area.h)
    return { ...at, image }
  })
}
