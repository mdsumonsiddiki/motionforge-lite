import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ZipArchive } from 'archiver'
import { createWriteStream } from 'node:fs'
import { backupFileName, BackupError, createBackup, restoreBackup } from './backup'
import { Storage } from './storage'
import { saveSettings, loadSettings } from './settingsFile'

/** Writes a zip with arbitrary entries (to build bad backups). */
function writeZip(file: string, entries: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const out = createWriteStream(file)
    const zip = new ZipArchive()
    out.on('close', () => resolve())
    zip.on('error', reject)
    zip.pipe(out)
    for (const [name, content] of Object.entries(entries)) zip.append(content, { name })
    void zip.finalize()
  })
}

describe('backup / restore', () => {
  let tmp: string
  let userData: string
  let zip: string

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'mf-backup-'))
    userData = join(tmp, 'userData')
    mkdirSync(userData)
    zip = join(tmp, 'backup.zip')
  })
  afterEach(() => rmSync(tmp, { recursive: true, force: true }))

  it('names the file with a local timestamp', () => {
    expect(backupFileName(new Date(2026, 10, 4, 9, 5))).toBe(
      'MotionForge-Backup-2026-11-04-0905.zip'
    )
  })

  it('backup → delete everything → restore brings it all back (Phase 3 "Done when")', async () => {
    const storage = new Storage(userData)
    const char = storage.saveCharacter({
      name: 'Rahim',
      background: 'transparent',
      files: { 'generated.png': Buffer.from('gen'), 'poses/y5_p0.png': Buffer.from('p') }
    })
    const doc = storage.saveDocument({ name: 'Bill', files: { 'original.jpg': Buffer.from('o') } })
    saveSettings(join(userData, 'settings.json'), {
      language: 'bn',
      theme: 'light',
      obsPath: 'x',
      reduceEffects: false
    })
    // A file that must NOT go into the backup (e.g. future encrypted API key).
    writeFileSync(join(userData, 'secret.bin'), 'key')

    await createBackup(userData, zip)
    expect(existsSync(zip)).toBe(true)

    // Delete everything.
    storage.delete('characters', char.id)
    storage.delete('documents', doc.id)
    rmSync(join(userData, 'settings.json'))
    expect(storage.list('characters')).toEqual([])

    await restoreBackup(zip, userData)

    expect(storage.list('characters')).toEqual([{ id: char.id, name: 'Rahim' }])
    expect(storage.list('documents')).toEqual([{ id: doc.id, name: 'Bill' }])
    expect(storage.readFile('characters', char.id, 'poses/y5_p0.png')?.toString()).toBe('p')
    expect(storage.readFile('documents', doc.id, 'original.jpg')?.toString()).toBe('o')
    expect(loadSettings(join(userData, 'settings.json'), 'd')).toMatchObject({ language: 'bn' })
    expect(existsSync(join(userData, '.restore-tmp'))).toBe(false)
    // secret.bin was not in the backup, and restore leaves it alone.
    expect(readFileSync(join(userData, 'secret.bin'), 'utf8')).toBe('key')
  })

  it('restore replaces items created after the backup', async () => {
    const storage = new Storage(userData)
    storage.saveDocument({ name: 'Before' })
    await createBackup(userData, zip)
    storage.saveDocument({ name: 'After' })
    await restoreBackup(zip, userData)
    expect(storage.list('documents').map((d) => d.name)).toEqual(['Before'])
  })

  it('backs up an empty profile without failing', async () => {
    await createBackup(userData, zip)
    expect(existsSync(zip)).toBe(true)
  })

  it('rejects a zip with unexpected entries and keeps current data', async () => {
    const storage = new Storage(userData)
    storage.saveDocument({ name: 'Keep' })
    await writeZip(zip, { 'evil.exe': 'x', 'documents/a/meta.json': '{}' })
    await expect(restoreBackup(zip, userData)).rejects.toThrow(BackupError)
    expect(storage.list('documents').map((d) => d.name)).toEqual(['Keep'])
    expect(existsSync(join(userData, '.restore-tmp'))).toBe(false)
  })

  it('rolls back to the current data when moving restored files fails', async () => {
    const storage = new Storage(userData)
    storage.saveDocument({ name: 'InBackup' })
    await createBackup(userData, zip)
    storage.saveDocument({ name: 'Current' })
    saveSettings(join(userData, 'settings.json'), {
      language: 'bn',
      theme: 'light',
      obsPath: 'x',
      reduceEffects: false
    })

    // Fail on the first move from staging into userData (after current data was moved aside).
    const failingRename = (from: string, to: string): void => {
      if (from.includes('.restore-tmp')) throw new Error('file locked')
      renameSync(from, to)
    }
    await expect(restoreBackup(zip, userData, failingRename)).rejects.toThrow('file locked')

    expect(storage.list('documents').map((d) => d.name)).toEqual(['Current', 'InBackup'])
    expect(loadSettings(join(userData, 'settings.json'), 'd').language).toBe('bn')
    expect(existsSync(join(userData, '.restore-old'))).toBe(false)
    expect(existsSync(join(userData, '.restore-tmp'))).toBe(false)
  })

  it('rejects a backup whose "characters" entry is a file', async () => {
    await writeZip(zip, { characters: 'not a folder' })
    await expect(restoreBackup(zip, userData)).rejects.toThrow(BackupError)
  })

  it('refuses to write the backup inside the app data folder', async () => {
    await expect(createBackup(userData, join(userData, 'b.zip'))).rejects.toThrow(BackupError)
    expect(existsSync(join(userData, 'b.zip'))).toBe(false)
  })

  it('rejects a file that is not a zip', async () => {
    writeFileSync(zip, 'not a zip')
    await expect(restoreBackup(zip, userData)).rejects.toThrow(BackupError)
  })
})
