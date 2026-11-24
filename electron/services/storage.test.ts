import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isAllowedFile, Storage, StorageError } from './storage'

describe('Storage', () => {
  let root: string
  let clock: number
  let storage: Storage

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mf-storage-'))
    clock = Date.UTC(2026, 10, 24, 10, 0, 0)
    // Each call moves the clock forward 1 minute, so ordering is deterministic.
    storage = new Storage(root, () => new Date((clock += 60_000)))
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  describe('characters', () => {
    it('saves, opens and deletes a character with files', () => {
      const meta = storage.saveCharacter({
        name: '  Rahim  ',
        background: 'original',
        files: { 'source.jpg': Buffer.from('src'), 'poses/y5_p0.png': Buffer.from('pose') }
      })
      expect(meta.name).toBe('Rahim')
      expect(storage.list('characters')).toEqual([{ id: meta.id, name: 'Rahim' }])
      expect(storage.getMeta('characters', meta.id)).toEqual(meta)
      expect(storage.readFile('characters', meta.id, 'source.jpg')?.toString()).toBe('src')
      expect(storage.readFile('characters', meta.id, 'poses/y5_p0.png')?.toString()).toBe('pose')
      expect(storage.readFile('characters', meta.id, 'cutout.png')).toBeNull()

      expect(storage.delete('characters', meta.id)).toBe(true)
      expect(storage.list('characters')).toEqual([])
      expect(storage.delete('characters', meta.id)).toBe(false)
    })

    it('updates an existing character and keeps createdAt', () => {
      const first = storage.saveCharacter({ name: 'A', background: 'original' })
      const second = storage.saveCharacter({ id: first.id, name: 'B', background: 'custom' })
      expect(second).toEqual({ ...first, name: 'B', background: 'custom' })
      expect(storage.list('characters')).toHaveLength(1)
    })

    it('rejects an empty name and an unknown id', () => {
      expect(() => storage.saveCharacter({ name: '   ', background: 'original' })).toThrow(
        StorageError
      )
      expect(() =>
        storage.saveCharacter({ id: 'missing', name: 'X', background: 'original' })
      ).toThrow(StorageError)
    })
  })

  describe('documents', () => {
    it('saves, opens and deletes a document; newest first in the list', () => {
      const a = storage.saveDocument({ name: 'Old', files: { 'original.png': Buffer.from('o') } })
      const b = storage.saveDocument({ name: 'New', files: { 'original.jpg': Buffer.from('o2') } })
      expect(storage.list('documents').map((d) => d.name)).toEqual(['New', 'Old'])
      expect(storage.readFile('documents', a.id, 'original.png')?.toString()).toBe('o')
      storage.delete('documents', b.id)
      expect(storage.list('documents').map((d) => d.name)).toEqual(['Old'])
    })

    it('never overwrites original.* but allows edits and edited.png', () => {
      const doc = storage.saveDocument({ name: 'D', files: { 'original.png': Buffer.from('o') } })
      const updated = storage.saveDocument({
        id: doc.id,
        name: 'D',
        files: { 'edits.json': Buffer.from('{}'), 'edited.png': Buffer.from('e') }
      })
      expect(updated.createdAt).toBe(doc.createdAt)
      expect(updated.updatedAt > doc.updatedAt).toBe(true)
      expect(() =>
        storage.saveDocument({ id: doc.id, name: 'D', files: { 'original.png': Buffer.from('x') } })
      ).toThrow(/cannot be changed/)
      expect(storage.readFile('documents', doc.id, 'original.png')?.toString()).toBe('o')
    })
  })

  describe('safety', () => {
    it('rejects path traversal in ids and file names', () => {
      expect(() => storage.delete('documents', '../x')).toThrow(StorageError)
      expect(() => storage.readFile('documents', 'abc', '../settings.json')).toThrow(StorageError)
      expect(() =>
        storage.saveDocument({ name: 'D', files: { '../../evil.png': Buffer.from('x') } })
      ).toThrow(StorageError)
    })

    it('only allows the spec file names', () => {
      expect(isAllowedFile('characters', 'custom-bg.webp')).toBe(true)
      expect(isAllowedFile('characters', 'poses/../x.png')).toBe(false)
      expect(isAllowedFile('characters', 'original.png')).toBe(false)
      expect(isAllowedFile('documents', 'edited.png')).toBe(true)
      expect(isAllowedFile('documents', 'source.jpg')).toBe(false)
    })

    it('skips folders with a missing or corrupt meta.json', () => {
      storage.saveCharacter({ name: 'Good', background: 'original' })
      mkdirSync(join(root, 'characters', 'broken'), { recursive: true })
      writeFileSync(join(root, 'characters', 'broken', 'meta.json'), '{oops')
      mkdirSync(join(root, 'characters', 'empty'))
      expect(storage.list('characters').map((c) => c.name)).toEqual(['Good'])
    })

    it('skips meta.json with a wrong shape or an id that does not match its folder', () => {
      const good = storage.saveDocument({ name: 'Good' })
      const dir = join(root, 'documents')
      mkdirSync(join(dir, 'no-created'))
      writeFileSync(join(dir, 'no-created', 'meta.json'), JSON.stringify({ id: 'no-created', name: 'x' }))
      mkdirSync(join(dir, 'mismatch'))
      writeFileSync(
        join(dir, 'mismatch', 'meta.json'),
        JSON.stringify({ ...good, id: 'other', name: 'Mismatch' })
      )
      expect(storage.list('documents').map((d) => d.name)).toEqual(['Good'])
    })

    it('allows only one original.* and writes nothing when a file is rejected', () => {
      const doc = storage.saveDocument({ name: 'D', files: { 'original.png': Buffer.from('o') } })
      expect(() =>
        storage.saveDocument({ id: doc.id, name: 'D', files: { 'original.jpg': Buffer.from('x') } })
      ).toThrow(/cannot be changed/)
      expect(() =>
        storage.saveDocument({
          name: 'Two',
          files: { 'original.png': Buffer.from('a'), 'original.jpg': Buffer.from('b') }
        })
      ).toThrow(StorageError)
      expect(() =>
        storage.saveDocument({
          id: doc.id,
          name: 'D',
          files: { 'edited.png': Buffer.from('e'), 'bad.exe': Buffer.from('x') }
        })
      ).toThrow(StorageError)
      expect(storage.readFile('documents', doc.id, 'edited.png')).toBeNull()
      expect(storage.readFile('documents', doc.id, 'original.jpg')).toBeNull()
    })

    it('deleting a missing document returns false', () => {
      expect(storage.delete('documents', 'missing')).toBe(false)
    })

    it('returns an empty list when nothing is stored yet', () => {
      expect(existsSync(join(root, 'documents'))).toBe(false)
      expect(storage.list('documents')).toEqual([])
    })
  })
})
