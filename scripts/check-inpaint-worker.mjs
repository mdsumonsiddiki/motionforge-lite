// Checks that the inpaint worker really loads OpenCV and removes text, in both modes:
//   build: runs out/renderer/assets/inpaint.worker-*.js (needs `npm run build` first)
//   dev:   asks the Vite dev transform for the worker exactly as the dev server serves it
// The worker code runs in a Node vm sandbox that mimics a classic worker scope
// (self, importScripts, postMessage). A module worker would have no importScripts,
// so this also proves the worker is classic.
//
// Usage: node scripts/check-inpaint-worker.mjs [--dev]   → prints a summary, exit 1 on failure
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import vm from 'node:vm'

const root = resolve(import.meta.dirname, '..')
const OPENCV = join(root, 'node_modules/@techstark/opencv-js/dist/opencv.js')

/** Runs worker source in a classic-worker-like sandbox and sends one inpaint request. */
async function runWorker(label, source) {
  const messages = []
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    TextDecoder,
    TextEncoder,
    URL,
    atob,
    performance,
    WebAssembly,
    postMessage: (m) => messages.push(m),
    importScripts: (url) => {
      if (url === '/@vite/env') return // served by the real dev server (env shims only)
      if (!url.endsWith('opencv/opencv.js')) throw new Error(`unexpected importScripts ${url}`)
      vm.runInContext(readFileSync(OPENCV, 'utf8'), sandbox, { filename: 'opencv.js' })
    }
  }
  sandbox.self = sandbox
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: `${label}-worker.js` })
  if (typeof sandbox.onmessage !== 'function') throw new Error('worker did not set onmessage')

  // 40×20 white crop with a black "text" bar at x 10..29, y 6..13; the pixel mask
  // (one byte per pixel, 255 = remove) covers the bar dilated by 2 px.
  const w = 40
  const h = 20
  const px = new Uint8ClampedArray(w * h * 4).fill(255)
  for (let y = 6; y < 14; y++) for (let x = 10; x < 30; x++) px.set([0, 0, 0, 255], (y * w + x) * 4)
  // A grey marker pixel outside the mask: the worker must not change it.
  px.set([128, 128, 128, 255], (1 * w + 1) * 4)
  const mask = new Uint8Array(w * h)
  for (let y = 4; y < 16; y++) for (let x = 8; x < 32; x++) mask[y * w + x] = 255
  sandbox.onmessage({
    data: { id: 1, opencvUrl: 'http://x/opencv/opencv.js', width: w, height: h, pixels: px.buffer, mask: mask.buffer }
  })
  const started = Date.now()
  while (messages.length === 0 && Date.now() - started < 60_000) await new Promise((r) => setTimeout(r, 50))
  const msg = messages[0]
  if (!msg) throw new Error('no answer within 60 s')
  if (msg.error) throw new Error(`worker error: ${msg.error}`)
  const out = new Uint8ClampedArray(msg.pixels)
  // After removal, the darkest pixel inside the old bar must be light.
  let darkest = 255
  for (let y = 6; y < 14; y++) for (let x = 10; x < 30; x++) darkest = Math.min(darkest, out[(y * w + x) * 4])
  if (darkest < 200) throw new Error(`text not removed (darkest ${darkest})`)
  const marker = out[(1 * w + 1) * 4]
  if (marker !== 128) throw new Error(`pixel outside the mask changed (${marker})`)
  return `${label}: OK (${Date.now() - started} ms, darkest ${darkest})`
}

const lines = []
let failed = false
// --dev: only the dev-mode check (used by the Vitest test, which runs without a build).
const devOnly = process.argv.includes('--dev')

// Build mode
if (!devOnly) try {
  const dir = join(root, 'out/renderer/assets')
  const file = existsSync(dir) && readdirSync(dir).find((f) => /^inpaint\.worker-.*\.js$/.test(f))
  if (!file) throw new Error('no built worker — run npm run build first')
  lines.push(await runWorker('build', readFileSync(join(dir, file), 'utf8')))
} catch (err) {
  failed = true
  lines.push(`build: FAIL ${err.message}`)
}

// Dev mode: transform the worker the way the Vite dev server does.
try {
  const { createServer } = await import('vite')
  const server = await createServer({
    configFile: false,
    root: join(root, 'src'),
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }
  })
  try {
    const client = await server.transformRequest('/workers/inpaintClient.ts')
    const workerLine = client?.code.split('\n').find((l) => l.includes('new Worker'))
    lines.push(`dev: client → ${workerLine?.trim()}`)
    if (workerLine && /type:\s*["']module["']/.test(workerLine)) throw new Error('dev worker is a module worker')
    const url = workerLine?.match(/["'](\/[^"']*inpaint\.worker\.ts[^"']*)["']/)?.[1]
    if (!url) throw new Error('worker URL not found in dev transform')
    const worker = await server.transformRequest(url)
    if (!worker) throw new Error(`dev server could not transform ${url}`)
    if (/^\s*(import|export)\s/m.test(worker.code)) throw new Error('dev worker code has import/export (needs a module worker)')
    lines.push(await runWorker('dev', worker.code))
  } finally {
    await server.close()
  }
} catch (err) {
  failed = true
  lines.push(`dev: FAIL ${err.message}`)
}

console.log(lines.join('\n'))
process.exit(failed ? 1 : 0)
