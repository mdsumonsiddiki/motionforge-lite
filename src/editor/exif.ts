/**
 * Minimal EXIF reader: only the JPEG orientation tag (0x0112).
 *
 * Why: phone cameras store a JPEG "sideways" and set an EXIF orientation. The browser's
 * createImageBitmap applies it (the preview is upright), but tesseract.js only detects it
 * for big-endian ("MM") EXIF in the first 500 bytes. For little-endian ("II") files — common
 * on Android phones — OCR would run on the unrotated pixels and its boxes would not line up
 * with the preview. When this returns something other than 1, the editor gives OCR the
 * already-upright pixels instead of the original bytes.
 */

/** EXIF orientation 1..8; 1 = upright (also returned for PNG, no EXIF or a broken file). */
export function readJpegOrientation(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let pos = 2
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) return 1
    const marker = bytes[pos + 1] ?? 0
    // Start of scan / end of image: no more metadata segments follow.
    if (marker === 0xda || marker === 0xd9) return 1
    const size = view.getUint16(pos + 2) // includes the 2 size bytes
    if (size < 2) return 1
    if (marker === 0xe1) {
      const found = orientationFromApp1(view, pos + 4, Math.min(bytes.length, pos + 2 + size))
      if (found !== null) return found
    }
    pos += 2 + size
  }
  return 1
}

/** Reads the orientation from one APP1 segment ([start, end) = segment payload), or null. */
function orientationFromApp1(view: DataView, start: number, end: number): number | null {
  // "Exif\0\0"
  if (end - start < 14 || view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0) {
    return null
  }
  const tiff = start + 6
  const order = view.getUint16(tiff)
  if (order !== 0x4949 && order !== 0x4d4d) return null
  const little = order === 0x4949
  const u16 = (at: number): number => view.getUint16(at, little)
  const u32 = (at: number): number => view.getUint32(at, little)
  if (u16(tiff + 2) !== 42) return null

  const ifd0 = tiff + u32(tiff + 4)
  if (ifd0 + 2 > end) return null
  const count = u16(ifd0)
  for (let i = 0; i < count; i++) {
    const entry = ifd0 + 2 + i * 12
    if (entry + 12 > end) return null
    if (u16(entry) === 0x0112) {
      // Type SHORT (3), the value sits in the first 2 bytes of the value field.
      const value = u16(entry + 8)
      return value >= 1 && value <= 8 ? value : 1
    }
  }
  return null
}
