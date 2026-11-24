import { ZipArchive } from 'archiver'
import extractZip from 'extract-zip'
import {
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync
} from 'node:fs'
import { join, relative, resolve, isAbsolute } from 'node:path'

/**
 * Backup / Restore (spec section 5).
 * Backup = characters/ + documents/ + settings.json in one .zip.
 * Nothing else from userData is included (the API key, added in Phase 6, stays out of backups).
 */

/** The only top-level entries that go into, and are accepted from, a backup. */
export const BACKUP_DIRS = ['characters', 'documents'] as const
export const BACKUP_FILES = ['settings.json'] as const
const BACKUP_ENTRIES: readonly string[] = [...BACKUP_DIRS, ...BACKUP_FILES]

/** Upper bound on files in a backup, as a guard against broken or hostile zips. */
const MAX_RESTORE_ENTRIES = 100_000

export class BackupError extends Error {}

/** e.g. MotionForge-Backup-2026-11-24-1530.zip (local time). */
export function backupFileName(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
  return `MotionForge-Backup-${stamp}.zip`
}

/** True when `child` is `parent` itself or somewhere inside it. */
function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * Writes a backup zip of `userData` to `destFile`.
 * Missing folders/files are simply skipped (a fresh install can still be backed up).
 * On failure the partial zip is removed.
 */
export async function createBackup(userData: string, destFile: string): Promise<void> {
  // A zip inside userData could end up containing itself.
  if (isInside(userData, destFile)) throw new BackupError('Choose a folder outside the app data')

  try {
    await new Promise<void>((done, fail) => {
      const output = createWriteStream(destFile)
      const archive = new ZipArchive({ zlib: { level: 6 } })
      const abort = (err: unknown): void => {
        archive.abort()
        output.destroy()
        fail(err)
      }

      output.on('close', () => done())
      output.on('error', abort)
      archive.on('error', abort)
      archive.on('warning', abort)
      archive.pipe(output)

      for (const dir of BACKUP_DIRS) {
        const src = join(userData, dir)
        if (existsSync(src)) archive.directory(src, dir)
      }
      for (const file of BACKUP_FILES) {
        const src = join(userData, file)
        if (existsSync(src)) archive.file(src, { name: file })
      }
      void archive.finalize()
    })
  } catch (err) {
    rmSync(destFile, { force: true })
    throw err
  }
}

/**
 * Checks an extracted backup: only known top-level entries, folders are real folders,
 * settings.json is a file, no symlinks anywhere, and a sane number of files.
 */
function validateStaging(staging: string): void {
  const top = readdirSync(staging)
  if (top.length === 0 || top.some((e) => !BACKUP_ENTRIES.includes(e))) {
    throw new BackupError('Not a MotionForge Lite backup')
  }
  for (const entry of top) {
    const stat = lstatSync(join(staging, entry))
    const ok = (BACKUP_DIRS as readonly string[]).includes(entry)
      ? stat.isDirectory()
      : stat.isFile()
    if (!ok) throw new BackupError(`Unexpected entry type: ${entry}`)
  }

  let count = 0
  const walk = (dir: string): void => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      if (++count > MAX_RESTORE_ENTRIES) throw new BackupError('Backup has too many files')
      if (d.isSymbolicLink()) throw new BackupError('Backup contains a link')
      if (d.isDirectory()) walk(join(dir, d.name))
    }
  }
  walk(staging)
}

/**
 * Restores a backup zip into `userData`, replacing current characters, documents and settings.
 *
 * Steps:
 *  1. extract into `.restore-tmp` and validate it — current data is untouched if this fails;
 *  2. move current entries aside into `.restore-old`;
 *  3. move restored entries in;
 *  4. delete `.restore-old`.
 * If step 2 or 3 fails, the moved-aside data is put back (rollback).
 */
export async function restoreBackup(
  zipFile: string,
  userData: string,
  /** Injectable for tests (to simulate a failing move). */
  rename: (from: string, to: string) => void = renameSync
): Promise<void> {
  const staging = join(userData, '.restore-tmp')
  const old = join(userData, '.restore-old')
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })

  try {
    try {
      // extract-zip rejects entries that would land outside `staging` (zip-slip).
      await extractZip(zipFile, { dir: staging })
    } catch {
      throw new BackupError('Not a valid backup file')
    }
    validateStaging(staging)

    rmSync(old, { recursive: true, force: true })
    mkdirSync(old, { recursive: true })
    try {
      for (const entry of BACKUP_ENTRIES) {
        if (existsSync(join(userData, entry))) rename(join(userData, entry), join(old, entry))
      }
      for (const entry of BACKUP_ENTRIES) {
        if (existsSync(join(staging, entry))) rename(join(staging, entry), join(userData, entry))
      }
    } catch (err) {
      rollback(userData, old)
      throw err
    }
    rmSync(old, { recursive: true, force: true })
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

/** Puts every moved-aside entry from `old` back into `userData`. */
function rollback(userData: string, old: string): void {
  for (const entry of BACKUP_ENTRIES) {
    const saved = join(old, entry)
    if (!existsSync(saved)) continue
    rmSync(join(userData, entry), { recursive: true, force: true })
    renameSync(saved, join(userData, entry))
  }
  rmSync(old, { recursive: true, force: true })
}
