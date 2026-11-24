import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import { IPC } from '../shared/ipc'
import {
  fitWindowSize,
  OUTPUT_SIZE,
  OUTPUT_WINDOW_TITLE,
  ORIGINAL_BACKGROUND,
  type Orientation,
  type OutputState
} from '../shared/output'
import { APP_INDEX_URL } from '../services/appProtocol'

/**
 * The Webcam Output window (spec section 10): small, resizable, normal title bar with
 * minimize / close, always on top, no controls inside — only the live output.
 * OBS captures it with "Window Capture" → "MotionForge Lite Output".
 */

let outputWin: BrowserWindow | null = null
/** Last state from the main window; re-sent when the output window (re)loads. */
let lastState: OutputState | null = null
/** The main window, notified when the output window opens or closes. */
let mainWin: BrowserWindow | null = null

function notifyStatus(): void {
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send(IPC.outputStatus, outputWin !== null)
}

function applyOrientation(win: BrowserWindow, orientation: Orientation): void {
  const { width, height } = OUTPUT_SIZE[orientation]
  // Aspect ratio stays locked while the user resizes the window.
  win.setAspectRatio(width / height)
  const display = screen.getDisplayMatching(win.getBounds())
  const size = fitWindowSize(orientation, display.workAreaSize)
  win.setContentSize(size.width, size.height)
}

function createOutputWindow(orientation: Orientation, devUrl: string | undefined): BrowserWindow {
  const size = fitWindowSize(orientation, screen.getPrimaryDisplay().workAreaSize)
  const win = new BrowserWindow({
    ...size,
    useContentSize: true,
    title: OUTPUT_WINDOW_TITLE,
    alwaysOnTop: true,
    resizable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    // Same as the "Original" output background, so there is no dark flash before the first frame.
    backgroundColor: ORIGINAL_BACKGROUND,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Keep drawing at full speed even when the window is behind others (OBS captures it).
      backgroundThrottling: false
    }
  })
  win.setAspectRatio(OUTPUT_SIZE[orientation].width / OUTPUT_SIZE[orientation].height)
  // The fixed title is what users select in OBS; the page must not change it.
  win.on('page-title-updated', (e) => e.preventDefault())
  win.setMenu(null)
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.once('ready-to-show', () => win.show())
  // Closing it only ends the output; the app keeps running (spec section 10).
  win.on('closed', () => {
    outputWin = null
    notifyStatus()
  })

  // The output window renders the same React bundle in "output" mode.
  if (!app.isPackaged && devUrl) void win.loadURL(`${devUrl}#output`)
  else void win.loadURL(`${APP_INDEX_URL}#output`)
  return win
}

/** Registers output IPC. `main` is the main window (receives open/closed status). */
export function registerOutputIpc(main: BrowserWindow, devUrl: string | undefined): void {
  mainWin = main
  // When the main window closes, the output closes too.
  main.on('closed', () => {
    outputWin?.close()
    mainWin = null
  })

  ipcMain.handle(IPC.outputOpen, (event, orientation: unknown) => {
    if (event.sender !== main.webContents) return false
    const o: Orientation = orientation === 'portrait' ? 'portrait' : 'landscape'
    if (outputWin) {
      applyOrientation(outputWin, o)
      outputWin.show()
    } else {
      outputWin = createOutputWindow(o, devUrl)
      notifyStatus()
    }
    return true
  })

  ipcMain.handle(IPC.outputClose, (event) => {
    if (event.sender === main.webContents) outputWin?.close()
  })

  ipcMain.handle(IPC.outputIsOpen, () => outputWin !== null)

  // The output window asks for the latest state once it has started.
  ipcMain.handle(IPC.outputGetState, (event) =>
    outputWin && event.sender === outputWin.webContents ? lastState : null
  )

  // Orientation change while open: resize the window.
  ipcMain.handle(IPC.outputOrientation, (event, orientation: unknown) => {
    if (event.sender !== main.webContents || !outputWin) return
    applyOrientation(outputWin, orientation === 'portrait' ? 'portrait' : 'landscape')
  })

  // Main renderer → output window. Only the main window may send state.
  ipcMain.on(IPC.outputState, (event, state: OutputState) => {
    if (event.sender !== main.webContents) return
    lastState = state
    if (outputWin && !outputWin.isDestroyed()) outputWin.webContents.send(IPC.outputState, state)
  })
}
