import { describe, expect, it } from 'vitest'
import { displayName, initials, photoTargetSize } from './profile'

describe('profile helpers', () => {
  it('falls back to the default name when none is saved', () => {
    expect(displayName('', 'Creator')).toBe('Creator')
    expect(displayName('   ', 'Creator')).toBe('Creator')
    expect(displayName('Sumon', 'Creator')).toBe('Sumon')
  })

  it('makes at most 2 upper-case initials', () => {
    expect(initials('Creator')).toBe('C')
    expect(initials('md sumon siddiki')).toBe('MS')
    expect(initials('  ')).toBe('')
    expect(initials('সুমন সিদ্দিকী')).toBe('সস')
  })

  it('downscales the photo to fit 128px, never upscales', () => {
    expect(photoTargetSize(1024, 512)).toEqual({ width: 128, height: 64 })
    expect(photoTargetSize(300, 600)).toEqual({ width: 64, height: 128 })
    expect(photoTargetSize(50, 40)).toEqual({ width: 50, height: 40 })
  })
})
