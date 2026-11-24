import { isAbsolute, join, normalize, relative } from 'node:path'

/**
 * The built renderer is served from `app://bundle/...` instead of `file://`.
 * A standard, secure scheme lets Web Workers (OCR, inpaint) start and `fetch` local
 * assets such as traineddata, which is unreliable under `file://`.
 */
export const APP_SCHEME = 'app'
export const APP_HOST = 'bundle'
export const APP_INDEX_URL = `${APP_SCHEME}://${APP_HOST}/index.html`

/**
 * Maps a request path to a file inside `rootDir`.
 * Returns null for anything that would escape the folder (e.g. `/../main/main.js`).
 */
export function resolveAppFile(rootDir: string, urlPath: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  // URL paths use "/" only; a backslash or null byte is never legitimate here.
  if (decoded.includes('\0') || decoded.includes('\\')) return null
  const target = normalize(join(rootDir, decoded === '/' ? '/index.html' : decoded))
  const rel = relative(rootDir, target)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null
  return target
}
