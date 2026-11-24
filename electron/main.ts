import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { IPC } from './shared/ipc'
import { registerSettingsIpc } from './ipc/settings'
import { registerStorageIpc } from './ipc/storage'

/**
 * Creates the main application window.
 * Security: contextIsolation on, nodeIntegration off, sandboxed renderer.
 * All file access and cloud calls go through IPC.
 */
function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'MotionForge Lite',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Show only when ready to avoid a white flash (no splash screen per spec).
  win.once('ready-to-show', () => win.show())
  // Never open new Electron windows from links; open external URLs in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  setupCloseConfirmation(win)

  // electron-vite sets ELECTRON_RENDERER_URL in dev mode.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

/**
 * App close confirmation (spec section 6).
 * The first close is cancelled and the renderer is asked to show a translated
 * confirm dialog. When the user confirms, the renderer sends `appConfirmClose`
 * and the window closes for real.
 */
function setupCloseConfirmation(win: BrowserWindow): void {
  let closeConfirmed = false
  let rendererGone = false
  win.webContents.on('render-process-gone', () => (rendererGone = true))

  win.on('close', (event) => {
    // If the renderer is gone it cannot show the dialog, so just close.
    if (closeConfirmed || rendererGone) return
    event.preventDefault()
    win.webContents.send(IPC.appCloseRequested)
  })

  const onConfirm = (event: Electron.IpcMainEvent): void => {
    if (event.sender !== win.webContents) return
    closeConfirmed = true
    win.close()
  }
  ipcMain.on(IPC.appConfirmClose, onConfirm)
  win.on('closed', () => ipcMain.off(IPC.appConfirmClose, onConfirm))
}

app.whenReady().then(() => {
  registerSettingsIpc()
  registerStorageIpc()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
