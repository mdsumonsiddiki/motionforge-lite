import { execFile, spawn } from 'node:child_process'
import { ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import {
  checkObsPath,
  CLOSE_COMMAND,
  closeResult,
  isObsRunning,
  launchCommand,
  STATUS_COMMAND
} from '../services/obs'
import { getSettings } from './settings'

export type ObsLaunchResult = 'launched' | 'empty' | 'notObs' | 'missing' | 'failed'

/** Registers Launch OBS / Close OBS (spec section 10). */
export function registerObsIpc(): void {
  // Uses the saved OBS path only (never a path sent by the renderer).
  ipcMain.handle(IPC.obsLaunch, (): Promise<ObsLaunchResult> => {
    const path = getSettings().obsPath
    const problem = checkObsPath(path)
    if (problem) return Promise.resolve(problem)
    const { command, args, cwd } = launchCommand(path)
    return new Promise((resolve) => {
      const child = spawn(command, args, { cwd, detached: true, stdio: 'ignore' })
      child.once('error', () => resolve('failed'))
      child.once('spawn', () => {
        child.unref() // OBS keeps running on its own
        resolve('launched')
      })
    })
  })

  // Asks OBS to close normally; never force-kills it.
  ipcMain.handle(IPC.obsClose, () =>
    new Promise((resolve) => {
      execFile(CLOSE_COMMAND.command, CLOSE_COMMAND.args, { windowsHide: true }, (err) => {
        const code = err ? (typeof err.code === 'number' ? err.code : null) : 0
        resolve(closeResult(code))
      })
    })
  )

  // Navbar OBS pill (UI_REDESIGN.md 4.2): is obs64.exe running? Errors → not running.
  ipcMain.handle(IPC.obsStatus, () =>
    new Promise<boolean>((resolve) => {
      execFile(
        STATUS_COMMAND.command,
        STATUS_COMMAND.args,
        { windowsHide: true, timeout: 5000 },
        (err, stdout) => resolve(!err && isObsRunning(String(stdout)))
      )
    })
  )
}
