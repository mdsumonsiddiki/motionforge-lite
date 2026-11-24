/**
 * Copies offline runtime assets from node_modules into `resources/` (the renderer's publicDir).
 * Runs before `dev` and `build`, so OCR and inpaint work without Internet (spec section 3).
 *
 *   resources/tessdata/   eng + ben traineddata (gzipped, best_int)
 *   resources/tesseract/  tesseract.js worker + LSTM-only core builds
 *   resources/opencv/     opencv.js (used by the inpaint worker)
 *
 * These folders are generated, so they are git-ignored.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const nm = join(root, 'node_modules')
const out = join(root, 'resources')

/** [source in node_modules, target in resources] */
const FILES = [
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'tessdata/eng.traineddata.gz'],
  ['@tesseract.js-data/ben/4.0.0_best_int/ben.traineddata.gz', 'tessdata/ben.traineddata.gz'],
  ['tesseract.js/dist/worker.min.js', 'tesseract/worker.min.js'],
  // tesseract.js picks one of these at runtime depending on CPU features (OEM 1 = LSTM only).
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract/tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract/tesseract-core-simd-lstm.wasm.js'],
  [
    'tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
    'tesseract/tesseract-core-relaxedsimd-lstm.wasm.js'
  ],
  ['@techstark/opencv-js/dist/opencv.js', 'opencv/opencv.js']
]

let copied = 0
for (const [from, to] of FILES) {
  const src = join(nm, from)
  const dest = join(out, to)
  if (!existsSync(src)) {
    console.error(`copy-assets: missing ${from} — run npm install`)
    process.exit(1)
  }
  // Skip unchanged files to keep `npm run dev` fast.
  if (existsSync(dest) && statSync(dest).size === statSync(src).size) continue
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  copied++
}
console.log(`copy-assets: ${copied} copied, ${FILES.length - copied} up to date`)
