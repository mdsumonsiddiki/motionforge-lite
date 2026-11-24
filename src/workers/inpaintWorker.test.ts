import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')

describe('inpaint worker', () => {
  it('has no import/export statements (it must run as a classic worker)', () => {
    // An `import type` line makes the Vite dev server emit `export {}`, which is a
    // SyntaxError in a classic worker: the worker never starts and no text is removed.
    const source = readFileSync(resolve(root, 'src/workers/inpaint.worker.ts'), 'utf8')
    expect(source).not.toMatch(/^\s*(import|export)\s/m)
  })

  it('loads OpenCV and removes text when served by the Vite dev server', () => {
    // Transforms the worker exactly like `npm run dev`, then runs it in a classic-worker
    // sandbox with the real opencv.js. The build output is checked by the same script
    // without --dev (node scripts/check-inpaint-worker.mjs) after `npm run build`.
    const run = spawnSync(process.execPath, ['scripts/check-inpaint-worker.mjs', '--dev'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 90_000
    })
    expect(run.stdout + run.stderr).toMatch(/dev: OK/)
    expect(run.status).toBe(0)
  }, 100_000)
})
