import { describe, expect, it } from 'vitest'
import {
  checkObsPath,
  CLOSE_COMMAND,
  closeResult,
  DEFAULT_OBS_PATH,
  detectObsPath,
  isObsRunning,
  launchCommand,
  OBS_CANDIDATE_PATHS,
  STATUS_COMMAND
} from './obs'

describe('OBS running check', () => {
  it('lists only obs64.exe, read-only', () => {
    expect(STATUS_COMMAND.command).toBe('tasklist')
    expect(STATUS_COMMAND.args).toContain('IMAGENAME eq obs64.exe')
    expect(STATUS_COMMAND.args).not.toContain('/F')
  })

  it('parses tasklist output', () => {
    expect(isObsRunning('"obs64.exe","1234","Console","1","250,000 K"\r\n')).toBe(true)
    expect(isObsRunning('INFO: No tasks are running which match the specified criteria.\r\n')).toBe(false)
    expect(isObsRunning('')).toBe(false)
    expect(isObsRunning('"notobs64.exe","1","Console","1","1 K"')).toBe(false)
  })
})

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
