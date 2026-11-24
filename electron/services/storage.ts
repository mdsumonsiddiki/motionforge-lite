import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  cleanName,
  isValidId,
  type CharacterBackground,
  type CharacterMeta,
  type DocumentMeta,
  type ItemKind,
  type ItemMeta,
  type ItemSummary
} from '../shared/storage'

/**
 * Local JSON + image file storage (spec section 5).
 *
 *   <root>/characters/<id>/meta.json, source.jpg, generated.png, cutout.png, custom-bg.*, poses/<stateKey>.png
 *   <root>/documents/<id>/meta.json, original.(jpg|png), edits.json, edited.png
 *
 * Only known file names are allowed (allow-list), so nothing can be written outside an item folder.
 */

/** Allowed file names inside a character folder (meta.json is managed separately). */
const CHARACTER_FILE = /^(source\.jpg|generated\.png|cutout\.png|custom-bg\.(png|jpe?g|webp)|poses\/[a-z0-9_.+-]{1,128}\.png)$/

/** Allowed file names inside a document folder. */
const DOCUMENT_FILE = /^(original\.(jpg|png)|edits\.json|edited\.png)$/

/** Files that must never be replaced once written (spec section 8: original never changes). */
const WRITE_ONCE = /^original\./

export class StorageError extends Error {}

const BACKGROUNDS: readonly CharacterBackground[] = ['original', 'transparent', 'custom']

/** Checks the shape of a meta.json read from disk (it may come from a restored backup). */
export function isValidMeta(kind: ItemKind, raw: unknown, folderId: string): boolean {
  if (typeof raw !== 'object' || raw === null) return false
  const m = raw as Record<string, unknown>
  const common =
    m.id === folderId && typeof m.name === 'string' && typeof m.createdAt === 'string'
  if (!common) return false
  return kind === 'characters'
    ? BACKGROUNDS.includes(m.background as CharacterBackground)
    : typeof m.updatedAt === 'string'
}

export function isAllowedFile(kind: ItemKind, file: string): boolean {
  return (kind === 'characters' ? CHARACTER_FILE : DOCUMENT_FILE).test(file)
}

export type SaveCharacterInput = {
  /** Omit to create a new character. */
  id?: string
  name: string
  background: CharacterBackground
  files?: Record<string, Buffer>
}

export type SaveDocumentInput = {
  id?: string
  name: string
  files?: Record<string, Buffer>
}

export class Storage {
  /** @param root the userData folder */
  constructor(
    private readonly root: string,
    private readonly now: () => Date = () => new Date()
  ) {}

  private itemDir(kind: ItemKind, id: string): string {
    if (!isValidId(id)) throw new StorageError(`Invalid id: ${id}`)
    return join(this.root, kind, id)
  }

  /**
   * Reads and validates meta.json. Returns null for a missing, corrupt or
   * wrongly shaped file, or when its id does not match the folder name.
   */
  private readMeta<T extends ItemMeta>(kind: ItemKind, id: string): T | null {
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(join(this.itemDir(kind, id), 'meta.json'), 'utf8'))
    } catch {
      return null
    }
    return isValidMeta(kind, raw, id) ? (raw as T) : null
  }

  /** Validates every file first, then writes; so a rejected file never leaves a half-saved item. */
  private writeFiles(kind: ItemKind, id: string, files: Record<string, Buffer>): void {
    const dir = this.itemDir(kind, id)
    const names = Object.keys(files)
    for (const file of names) {
      if (!isAllowedFile(kind, file)) throw new StorageError(`File not allowed: ${file}`)
    }
    // Only one original.* may ever exist, and it can never be replaced.
    const originals = names.filter((f) => WRITE_ONCE.test(f))
    if (originals.length > 0) {
      const hasOriginal = existsSync(dir) && readdirSync(dir).some((f) => WRITE_ONCE.test(f))
      if (hasOriginal || originals.length > 1) {
        throw new StorageError(`${originals[0]} cannot be changed`)
      }
    }
    for (const file of names) {
      const target = join(dir, file)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, files[file])
    }
  }

  /** Name list for the Dashboard, newest first. Folders with a missing/corrupt meta.json are skipped. */
  list(kind: ItemKind): ItemSummary[] {
    const base = join(this.root, kind)
    if (!existsSync(base)) return []
    return readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory() && isValidId(d.name))
      .map((d) => this.readMeta(kind, d.name))
      .filter((m): m is ItemMeta => m !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ id, name }) => ({ id, name }))
  }

  getMeta<T extends ItemMeta>(kind: ItemKind, id: string): T | null {
    return this.readMeta<T>(kind, id)
  }

  /** Reads one file of an item, or null if it does not exist. */
  readFile(kind: ItemKind, id: string, file: string): Buffer | null {
    if (!isAllowedFile(kind, file)) throw new StorageError(`File not allowed: ${file}`)
    const target = join(this.itemDir(kind, id), file)
    return existsSync(target) ? readFileSync(target) : null
  }

  saveCharacter(input: SaveCharacterInput): CharacterMeta {
    const name = cleanName(input.name)
    if (!name) throw new StorageError('Name is required')
    const existing = input.id ? this.readMeta<CharacterMeta>('characters', input.id) : null
    if (input.id && !existing) throw new StorageError(`Character not found: ${input.id}`)
    const meta: CharacterMeta = {
      id: existing?.id ?? randomUUID(),
      name,
      createdAt: existing?.createdAt ?? this.now().toISOString(),
      background: input.background
    }
    this.writeFiles('characters', meta.id, input.files ?? {})
    this.writeMetaFile('characters', meta)
    return meta
  }

  saveDocument(input: SaveDocumentInput): DocumentMeta {
    const name = cleanName(input.name)
    if (!name) throw new StorageError('Name is required')
    const existing = input.id ? this.readMeta<DocumentMeta>('documents', input.id) : null
    if (input.id && !existing) throw new StorageError(`Document not found: ${input.id}`)
    const now = this.now().toISOString()
    const meta: DocumentMeta = {
      id: existing?.id ?? randomUUID(),
      name,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    this.writeFiles('documents', meta.id, input.files ?? {})
    this.writeMetaFile('documents', meta)
    return meta
  }

  private writeMetaFile(kind: ItemKind, meta: ItemMeta): void {
    const dir = this.itemDir(kind, meta.id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8')
  }

  /** Deletes an item folder. The UI asks for confirmation first. Returns false if it did not exist. */
  delete(kind: ItemKind, id: string): boolean {
    const dir = this.itemDir(kind, id)
    if (!existsSync(dir)) return false
    rmSync(dir, { recursive: true, force: true })
    return true
  }
}
