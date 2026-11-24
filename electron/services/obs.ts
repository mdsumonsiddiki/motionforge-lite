import { existsSync } from 'node:fs'

/** Default OBS install path (spec section 10). */
export const DEFAULT_OBS_PATH = 'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe'

/** Places OBS Studio is usually installed on Windows, most likely first. */
export const OBS_CANDIDATE_PATHS: readonly string[] = [
  DEFAULT_OBS_PATH,
  'C:\\Program Files (x86)\\obs-studio\\bin\\64bit\\obs64.exe'
]

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
