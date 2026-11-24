import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { resolveAppFile } from './appProtocol'

describe('resolveAppFile', () => {
  const root = join('C:', 'app', 'out', 'renderer')

  it('maps normal paths inside the renderer folder', () => {
    expect(resolveAppFile(root, '/index.html')).toBe(join(root, 'index.html'))
    expect(resolveAppFile(root, '/')).toBe(join(root, 'index.html'))
    expect(resolveAppFile(root, '/tessdata/ben.traineddata.gz')).toBe(
      join(root, 'tessdata', 'ben.traineddata.gz')
    )
    expect(resolveAppFile(root, '/assets/a%20b.js')).toBe(join(root, 'assets', 'a b.js'))
  })

  it('blocks paths that escape the folder', () => {
    expect(resolveAppFile(root, '/../main/main.js')).toBeNull()
    expect(resolveAppFile(root, '/%2e%2e/%2e%2e/secret')).toBeNull()
    expect(resolveAppFile(root, '/assets/..%5c..%5cx')).toBeNull()
  })

  it('rejects malformed or null-byte paths', () => {
    expect(resolveAppFile(root, '/%E0%A4%A')).toBeNull()
    expect(resolveAppFile(root, '/a%00.js')).toBeNull()
  })
})
