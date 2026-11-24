import { createWorker, type Worker } from 'tesseract.js'
import { linesToBoxes, type OcrBlock } from '../editor/ocrBoxes'
import type { OcrBox } from '../editor/types'

/**
 * OCR with tesseract.js (eng + ben), fully offline.
 * tesseract.js runs recognition inside its own Web Worker, so the UI thread never blocks.
 * Worker script, WASM core and traineddata are served locally from resources/ (see
 * scripts/copy-assets.mjs) — nothing is downloaded from the Internet.
 */

/** Resolves a public asset relative to the page (works for the dev server and app://bundle/). */
const asset = (path: string): string => new URL(path, document.baseURI).href.replace(/\/$/, '')

let workerPromise: Promise<Worker> | null = null
/** Progress listener of the job that is running now (tesseract has one logger per worker). */
let onProgress: ((p: number) => void) | null = null
/** OCR jobs run one after another on the single worker. */
let queue: Promise<unknown> = Promise.resolve()

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(['eng', 'ben'], 1, {
      workerPath: asset('tesseract/worker.min.js'),
      corePath: asset('tesseract'),
      langPath: asset('tessdata'),
      gzip: true,
      workerBlobURL: false,
      cacheMethod: 'none',
      logger: (m) => {
        if (m.status === 'recognizing text') onProgress?.(m.progress)
      }
    }).catch((err: unknown) => {
      workerPromise = null // allow a retry
      throw err
    })
  }
  return workerPromise
}

/**
 * Recognises text lines in an image.
 * @param image the image as a Blob (JPG/PNG)
 * @param size image size in px (used to drop boxes that are too big to be a text line)
 * @param progress 0..1 while recognising
 */
export function recognize(
  image: Blob,
  size: { width: number; height: number },
  progress: (p: number) => void
): Promise<OcrBox[]> {
  const job = queue.then(async () => {
    const worker = await getWorker()
    onProgress = progress
    try {
      const { data } = await worker.recognize(image, {}, { blocks: true })
      progress(1)
      return linesToBoxes(data.blocks as unknown as OcrBlock[] | null, size.width, size.height)
    } finally {
      onProgress = null
    }
  })
  queue = job.catch(() => undefined)
  return job
}
