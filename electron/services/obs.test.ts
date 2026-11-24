import { describe, expect, it } from 'vitest'
import {
  checkObsPath,
  CLOSE_COMMAND,
  closeResult,
  DEFAULT_OBS_PATH,
  detectObsPath,
  launchCommand,
  OBS_CANDIDATE_PATHS
} from './obs'

describe('detectObsPath', () => {
  it('returns the default path when it exists', () => {
    expect(detectObsPath((p) => p === DEFAULT_OBS_PATH)).toBe(DEFAULT_OBS_PATH)
  })

  it('falls back to the next candidate', () => {
    const x86 = OBS_CANDIDATE_PATHS[1]
    expect(detectObsPath((p) => p === x86)).toBe(x86)
  })

  it('returns null when OBS is not installed', () => {
    expect(detectObsPath(() => false)).toBeNull()
  })

  it('accepts custom candidates', () => {
    expect(detectObsPath(() => true, ['D:\\obs.exe'])).toBe('D:\\obs.exe')
  })
})

describe('checkObsPath', () => {
  const yes = () => true

  it('accepts an existing obs64.exe (any case)', () => {
    expect(checkObsPath(DEFAULT_OBS_PATH, yes)).toBeNull()
    expect(checkObsPath('D:\\Apps\\OBS\\bin\\64bit\\OBS64.EXE', yes)).toBeNull()
  })

  it('rejects empty, non-OBS and missing paths', () => {
    expect(checkObsPath('  ', yes)).toBe('empty')
    expect(checkObsPath('C:\\Windows\\System32\\cmd.exe', yes)).toBe('notObs')
    expect(checkObsPath('C:\\x\\obs64.exe.bat', yes)).toBe('notObs')
    expect(checkObsPath(DEFAULT_OBS_PATH, () => false)).toBe('missing')
  })
})

describe('OBS commands', () => {
  it('launches with the bin\\64bit folder as working directory', () => {
    expect(launchCommand(DEFAULT_OBS_PATH)).toEqual({
      command: DEFAULT_OBS_PATH,
      args: [],
      cwd: 'C:\\Program Files\\obs-studio\\bin\\64bit'
    })
  })

  it('closes normally, never with /F', () => {
    expect(CLOSE_COMMAND.args).not.toContain('/F')
    expect(CLOSE_COMMAND).toEqual({ command: 'taskkill', args: ['/IM', 'obs64.exe'] })
  })

  it('interprets taskkill exit codes', () => {
    expect(closeResult(0)).toBe('closing')
    expect(closeResult(128)).toBe('notRunning')
    expect(closeResult(1)).toBe('failed')
    expect(closeResult(null)).toBe('failed')
  })
})
