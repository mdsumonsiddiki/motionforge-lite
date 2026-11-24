import { describe, expect, it } from 'vitest'
import { readJpegOrientation } from './exif'

/** Builds a tiny JPEG header with an EXIF APP1 segment holding one orientation entry. */
function jpegWithOrientation(orientation: number, little: boolean, withApp0 = false): Uint8Array {
  const tiff: number[] = []
  const u16 = (v: number): number[] => (little ? [v & 0xff, v >> 8] : [v >> 8, v & 0xff])
  const u32 = (v: number): number[] =>
    little
      ? [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24]
      : [v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]
  tiff.push(...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8))
  // IFD0: 2 entries (an unrelated one first), then next-IFD offset 0.
  tiff.push(...u16(2))
  tiff.push(...u16(0x010f), ...u16(2), ...u32(1), 0, 0, 0, 0) // Make (ASCII), ignored
  tiff.push(...u16(0x0112), ...u16(3), ...u32(1), ...u16(orientation), 0, 0)
  tiff.push(...u32(0))

  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]
  const size = payload.length + 2
  const app1 = [0xff, 0xe1, size >> 8, size & 0xff, ...payload]
  const app0 = withApp0 ? [0xff, 0xe0, 0x00, 0x10, ...new Array<number>(14).fill(0)] : []
  return new Uint8Array([0xff, 0xd8, ...app0, ...app1, 0xff, 0xda, 0x00, 0x02])
}

describe('readJpegOrientation', () => {
  it('reads little-endian (II) EXIF, which tesseract.js misses', () => {
    expect(readJpegOrientation(jpegWithOrientation(6, true))).toBe(6)
    expect(readJpegOrientation(jpegWithOrientation(8, true))).toBe(8)
  })

  it('reads big-endian (MM) EXIF', () => {
    expect(readJpegOrientation(jpegWithOrientation(3, false))).toBe(3)
  })

  it('finds EXIF after an APP0 (JFIF) segment', () => {
    expect(readJpegOrientation(jpegWithOrientation(6, true, true))).toBe(6)
  })

  it('returns 1 for upright, missing or broken data', () => {
    expect(readJpegOrientation(jpegWithOrientation(1, true))).toBe(1)
    expect(readJpegOrientation(jpegWithOrientation(42, true))).toBe(1) // out of range
    expect(readJpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1) // no EXIF
    expect(readJpegOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(1) // PNG
    expect(readJpegOrientation(jpegWithOrientation(6, true).slice(0, 20))).toBe(1) // truncated
    expect(readJpegOrientation(new Uint8Array())).toBe(1)
  })

  it('works on a view into a larger buffer', () => {
    const inner = jpegWithOrientation(6, true)
    const big = new Uint8Array(inner.length + 10)
    big.set(inner, 10)
    expect(readJpegOrientation(big.subarray(10))).toBe(6)
  })
})
