import { describe, expect, it } from 'vitest'
import { DEFAULT_OBS_PATH, detectObsPath, OBS_CANDIDATE_PATHS } from './obs'

describe('detectObsPath', () => {
  it('returns the default path when it exists', () => {
    expect(detectObsPath((p) => p === DEFAULT_OBS_PATH)).toBe(DEFAULT_OBS_PATH)
  })

  it('falls back to the next candidate', () => {
    const x86 = OBS_CANDIDATE_PATHS[1]
    expect(detectObsPath((p) => p === x86)).toBe(x86)
  })

  it('returns null when OBS is not installed', () => {
    expect(detectObsPath(() => false)).toBeNull()
  })

  it('accepts custom candidates', () => {
    expect(detectObsPath(() => true, ['D:\\obs.exe'])).toBe('D:\\obs.exe')
  })
})
