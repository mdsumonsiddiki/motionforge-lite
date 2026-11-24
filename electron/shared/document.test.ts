import { describe, expect, it } from 'vitest'
import { baseName, detectImageType, safeFileName } from './document'

describe('document helpers', () => {
  it('detects PNG and JPG from magic bytes', () => {
    expect(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe(
      'png'
    )
    expect(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg')
  })

  it('rejects other files (PDF, GIF, empty)', () => {
    expect(detectImageType(new TextEncoder().encode('%PDF-1.7'))).toBeNull()
    expect(detectImageType(new TextEncoder().encode('GIF89a'))).toBeNull()
    expect(detectImageType(new Uint8Array())).toBeNull()
  })

  it('takes the base name of a Windows path', () => {
    expect(baseName('C:\\Users\\me\\Scans\\bill.final.jpg')).toBe('bill.final')
    expect(baseName('/tmp/x.png')).toBe('x')
    expect(baseName('noext')).toBe('noext')
  })

  it('makes file names safe', () => {
    expect(safeFileName('a/b:c*?.')).toBe('a_b_c__')
    expect(safeFileName('   ')).toBe('document')
    expect(safeFileName('রসিদ ২০২৬')).toBe('রসিদ ২০২৬')
  })
})
