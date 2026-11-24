import { existsSync } from 'node:fs'
import { dirname, win32 } from 'node:path'

/** Default OBS install path (spec section 10). */
export const DEFAULT_OBS_PATH = 'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe'

/** Places OBS Studio is usually installed on Windows, most likely first. */
export const OBS_CANDIDATE_PATHS: readonly string[] = [
  DEFAULT_OBS_PATH,
  'C:\\Program Files (x86)\\obs-studio\\bin\\64bit\\obs64.exe'
]

/** The executable name OBS Studio uses on Windows. */
export const OBS_EXE = 'obs64.exe'

/**
 * Auto-detects the OBS executable.
 * Returns the first candidate that exists, or `null` if none is found.
 * `exists` is injectable so the logic can be unit-tested without touching the disk.
 */
export function detectObsPath(
  exists: (path: string) => boolean = existsSync,
  candidates: readonly string[] = OBS_CANDIDATE_PATHS
): string | null {
  return candidates.find((p) => exists(p)) ?? null
}

export type ObsPathProblem = 'empty' | 'notObs' | 'missing'

/**
 * Checks the OBS path from Settings before it is executed.
 * Only a file named obs64.exe is ever launched.
 */
export function checkObsPath(
  path: string,
  exists: (path: string) => boolean = existsSync
): ObsPathProblem | null {
  if (!path.trim()) return 'empty'
  if (win32.basename(path).toLowerCase() !== OBS_EXE) return 'notObs'
  if (!exists(path)) return 'missing'
  return null
}

export type Command = { command: string; args: string[]; cwd?: string }

/**
 * Launch command. OBS must be started with its own bin\64bit folder as the working
 * directory, otherwise it fails to find its data files (spec section 10).
 */
export function launchCommand(obsPath: string): Command {
  return { command: obsPath, args: [], cwd: win32.dirname(obsPath) || dirname(obsPath) }
}

/**
 * Close command: `taskkill` WITHOUT /F asks OBS to close normally (like clicking ✕),
 * so OBS can stop the virtual camera and save its settings. Never force-killed.
 */
export const CLOSE_COMMAND: Command = { command: 'taskkill', args: ['/IM', OBS_EXE] }

/**
 * Running check for the navbar OBS pill (UI_REDESIGN.md 4.2): lists only obs64.exe
 * processes as CSV without a header. Read-only, never changes anything.
 */
export const STATUS_COMMAND: Command = {
  command: 'tasklist',
  args: ['/FI', `IMAGENAME eq ${OBS_EXE}`, '/FO', 'CSV', '/NH']
}

/** True when tasklist's CSV output has an obs64.exe row ("INFO: No tasks…" otherwise). */
export function isObsRunning(tasklistOutput: string): boolean {
  return tasklistOutput
    .split(/\r?\n/)
    .some((line) => line.trim().toLowerCase().startsWith(`"${OBS_EXE}"`))
}

export type CloseResult = 'closing' | 'notRunning' | 'failed'

/** Interprets taskkill's exit code (128 = no such process). */
export function closeResult(exitCode: number | null): CloseResult {
  if (exitCode === 0) return 'closing'
  if (exitCode === 128) return 'notRunning'
  return 'failed'
}
