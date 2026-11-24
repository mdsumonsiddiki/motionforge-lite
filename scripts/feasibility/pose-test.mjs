// Phase 1 feasibility test (free, no paid API).
// Sends a set of CharacterStates to the free Hugging Face Space
// fffiloni/expression-editor (LivePortrait expression editor), saves each result
// image to docs/screenshots/phase-1/ and records the latency in results.json.
//
// Usage: node --env-file-if-exists=.env scripts/feasibility/pose-test.mjs <portrait.jpg> [prefix] [only]
// HF_TOKEN (free Hugging Face "Read" token) in .env raises the free ZeroGPU quota.
// Without it the anonymous quota runs out after ~3 calls. The token is never printed.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { Client, handle_file } from '@gradio/client'
import { NEUTRAL, stateKey, stateToParams } from './poseMapping.mjs'

const SPACE = 'fffiloni/expression-editor'
const OUT_DIR = 'docs/screenshots/phase-1'
const TIMEOUT_MS = 120_000

// Optional 3rd argument: comma-separated case-name prefixes to run (e.g. "08,09,10"),
// so a small free quota is spent only on the cases still missing.
const [, , imagePath, prefix = 'pose', onlyArg = ''] = process.argv
const only = onlyArg ? onlyArg.split(',').map((x) => x.trim()) : null
if (!imagePath || !existsSync(imagePath)) {
  console.error('Usage: node scripts/feasibility/pose-test.mjs <portrait.jpg> [prefix] [only]')
  process.exit(1)
}

/** Builds a CharacterState from a partial patch on top of NEUTRAL. */
const s = (patch = {}) => ({
  head: { ...NEUTRAL.head, ...patch.head },
  eyes: { ...NEUTRAL.eyes, ...patch.eyes },
  mouth: patch.mouth ?? NEUTRAL.mouth
})

// Test cases: one per control in spec 7.2, plus a combined pose and a repeat.
const CASES = [
  ['00-neutral', s()],
  ['01-yaw+15', s({ head: { yaw: 15 } })],
  ['02-yaw-15', s({ head: { yaw: -15 } })],
  ['03-yaw+25-clamped', s({ head: { yaw: 25 } })],
  ['04-pitch+10', s({ head: { pitch: 10 } })],
  ['05-pitch-10', s({ head: { pitch: -10 } })],
  ['06-eyes-left', s({ eyes: { direction: 'left' } })],
  ['07-eyes-right', s({ eyes: { direction: 'right' } })],
  ['08-eyes-up', s({ eyes: { direction: 'up' } })],
  ['09-eyes-down', s({ eyes: { direction: 'down' } })],
  ['10-eyes-closed', s({ eyes: { open: false } })],
  ['11-mouth-smile', s({ mouth: 'smile' })],
  ['12-mouth-open', s({ mouth: 'open' })],
  ['13-mouth-close', s({ mouth: 'close' })],
  ['14-combined', s({ head: { yaw: 15 }, eyes: { direction: 'left' }, mouth: 'smile' })],
  ['15-neutral-repeat', s()]
]

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

mkdirSync(OUT_DIR, { recursive: true })
const imageBlob = new Blob([readFileSync(imagePath)])

const t0 = Date.now()
const client = await Client.connect(SPACE, { token: process.env.HF_TOKEN || undefined })
const connectMs = Date.now() - t0
console.log(`connected in ${connectMs} ms`)

// Resume support: keep earlier successful results so the small free quota is not wasted.
const resultsPath = `${OUT_DIR}/${prefix}-results.json`
const previous = existsSync(resultsPath)
  ? JSON.parse(readFileSync(resultsPath, 'utf8')).results.filter((r) => r.ok)
  : []
const results = [...previous]
const done = new Set(previous.map((r) => r.name))

for (const [name, state] of CASES) {
  if (done.has(name)) continue
  if (only && !only.some((p) => name.startsWith(p))) continue
  const start = Date.now()
  try {
    const res = await withTimeout(
      client.predict('/edit_expression', { image: handle_file(imageBlob), ...stateToParams(state) }),
      TIMEOUT_MS
    )
    const file = res.data[0]
    const img = Buffer.from(await (await fetch(file.url)).arrayBuffer())
    const ext = (file.url.split('?')[0].split('.').pop() || 'png').toLowerCase()
    const outPath = `${OUT_DIR}/${prefix}-${name}.${ext}`
    writeFileSync(outPath, img)
    const ms = Date.now() - start
    results.push({ name, key: stateKey(state), ok: true, ms, file: outPath, bytes: img.length })
    console.log(`${name}: OK ${ms} ms`)
  } catch (err) {
    const ms = Date.now() - start
    const message = String(err?.message ?? err).slice(0, 300)
    results.push({ name, key: stateKey(state), ok: false, ms, error: message })
    console.log(`${name}: FAIL ${ms} ms - ${message}`)
    // ZeroGPU quota errors will repeat for every call; stop early to save time.
    if (/quota|exceeded/i.test(message)) break
  }
}

const ok = results.filter((r) => r.ok)
const summary = {
  space: SPACE,
  image: imagePath,
  date: new Date().toISOString(),
  connectMs,
  calls: results.length,
  success: ok.length,
  avgMs: ok.length ? Math.round(ok.reduce((a, r) => a + r.ms, 0) / ok.length) : null,
  minMs: ok.length ? Math.min(...ok.map((r) => r.ms)) : null,
  maxMs: ok.length ? Math.max(...ok.map((r) => r.ms)) : null,
  results
}
// Keep results in test-case order.
const order = CASES.map(([n]) => n)
summary.results.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
writeFileSync(resultsPath, JSON.stringify(summary, null, 2))
console.log(`done: ${summary.success}/${summary.calls} ok, avg ${summary.avgMs} ms`)
process.exit(0)
