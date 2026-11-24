/**
 * Inpaint Web Worker (spec section 3: heavy work never on the UI thread).
 * Removes old text with OpenCV's TELEA inpainting, on a small crop around the text box.
 *
 * This MUST stay a classic worker script: OpenCV is loaded with importScripts from
 * resources/opencv/, and importScripts does not exist in module workers.
 * So this file has no `import` / `export` statements at all. Even an `import type` line
 * makes the Vite dev server emit `export {}`, which is a SyntaxError in a classic worker:
 * the worker then never starts and no text is removed (the bug fixed on 2026-11-24).
 * Types from other files are referenced with inline `import('...')` types instead.
 * Checked by inpaintWorker.test.ts and scripts/check-inpaint-worker.mjs.
 */
;(() => {
  type InpaintRequest = import('./inpaintProtocol').InpaintRequest
  type InpaintResponse = import('./inpaintProtocol').InpaintResponse

  type Cv = {
    Mat: { zeros(rows: number, cols: number, type: number): CvMat }
    matFromImageData(img: { data: Uint8ClampedArray; width: number; height: number }): CvMat
    cvtColor(src: CvMat, dst: CvMat, code: number): void
    inpaint(src: CvMat, mask: CvMat, dst: CvMat, radius: number, flags: number): void
    CV_8UC1: number
    COLOR_RGBA2RGB: number
    COLOR_RGB2RGBA: number
    INPAINT_TELEA: number
    onRuntimeInitialized?: () => void
  }
  type CvMat = { data: Uint8Array; delete(): void }

  type WorkerScope = {
    importScripts?: (url: string) => void
    postMessage(message: InpaintResponse, transfer?: Transferable[]): void
    onmessage: ((e: MessageEvent<InpaintRequest>) => void) | null
    cv?: Cv | Promise<Cv>
  }
  const scope = self as unknown as WorkerScope

  /** Inpaint radius in px (how far around each masked pixel is sampled). */
  const INPAINT_RADIUS = 3

  let cvReady: Promise<Cv> | null = null

  /** Loads opencv.js once and waits until its WASM runtime is ready. */
  function loadCv(url: string): Promise<Cv> {
    if (!cvReady) {
      cvReady = (async () => {
        if (typeof scope.importScripts !== 'function') {
          throw new Error('Inpaint worker must be a classic worker (importScripts missing)')
        }
        scope.importScripts(url)
        const loaded = scope.cv
        if (!loaded) throw new Error('OpenCV failed to load')
        if (loaded instanceof Promise) return await loaded
        if ('Mat' in loaded && typeof loaded.inpaint === 'function') return loaded
        await new Promise<void>((resolve) => (loaded.onRuntimeInitialized = resolve))
        return loaded
      })().catch((err: unknown) => {
        cvReady = null // allow a retry on the next request
        throw err
      })
    }
    return cvReady
  }

  function inpaint(cv: Cv, req: InpaintRequest): Uint8ClampedArray<ArrayBuffer> {
    const { width, height } = req
    const maskBytes = new Uint8Array(req.mask)
    if (maskBytes.length !== width * height) throw new Error('Mask size does not match the crop')
    const rgba = cv.matFromImageData({ data: new Uint8ClampedArray(req.pixels), width, height })
    const rgb = cv.Mat.zeros(height, width, 0)
    const mask = cv.Mat.zeros(height, width, cv.CV_8UC1)
    const out = cv.Mat.zeros(height, width, 0)
    const outRgba = cv.Mat.zeros(height, width, 0)
    try {
      cv.cvtColor(rgba, rgb, cv.COLOR_RGBA2RGB)
      // Only the letter pixels (dilated text mask) are inpainted, never the whole box.
      mask.data.set(maskBytes)
      cv.inpaint(rgb, mask, out, INPAINT_RADIUS, cv.INPAINT_TELEA)
      cv.cvtColor(out, outRgba, cv.COLOR_RGB2RGBA)
      return new Uint8ClampedArray(outRgba.data) // copy out of WASM memory
    } finally {
      for (const mat of [rgba, rgb, mask, out, outRgba]) mat.delete()
    }
  }

  scope.onmessage = (e) => {
    const req = e.data
    loadCv(req.opencvUrl)
      .then((cv) => {
        const pixels = inpaint(cv, req)
        scope.postMessage({ id: req.id, pixels: pixels.buffer }, [pixels.buffer])
      })
      .catch((err: unknown) => {
        scope.postMessage({ id: req.id, error: err instanceof Error ? err.message : String(err) })
      })
  }
})()
