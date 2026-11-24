import { app, BrowserWindow, ipcMain, net, protocol, session, shell } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { IPC } from './shared/ipc'
import { registerSettingsIpc } from './ipc/settings'
import { registerStorageIpc } from './ipc/storage'
import { registerDocumentIpc } from './ipc/document'
import { registerObsIpc } from './ipc/obs'
import { registerOutputIpc } from './windows/outputWindow'
import { APP_HOST, APP_INDEX_URL, APP_SCHEME, resolveAppFile } from './services/appProtocol'

// Must run before `app.whenReady()`: the built renderer is served from app://bundle/.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true }
  }
])

/** Serves files of the built renderer (out/renderer) under app://bundle/. */
function registerAppProtocol(): void {
  const rendererDir = join(__dirname, '../renderer')
  protocol.handle(APP_SCHEME, (request) => {
    const url = new URL(request.url)
    const file = url.host === APP_HOST ? resolveAppFile(rendererDir, url.pathname) : null
    if (!file) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(file).toString())
  })
}

/**
 * Only the Local Font Access permission is granted (Document Editor lists the
 * fonts installed on Windows). Everything else (camera, mic, ...) is denied.
 */
function restrictPermissions(): void {
  const allowed = new Set(['local-fonts'])
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) =>
    callback(allowed.has(permission))
  )
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed.has(permission))
}

/**
 * Creates the main application window.
 * Security: contextIsolation on, nodeIntegration off, sandboxed renderer.
 * All file access and cloud calls go through IPC.
 */
function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    // UI_REDESIGN.md section 4: window min size 1100×700.
    minWidth: 1100,
    minHeight: 700,
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

  // The window may only show the app itself (dev server in dev, app://bundle/ when built).
  const appOrigin = !app.isPackaged && devUrl ? new URL(devUrl).origin : `${APP_SCHEME}://${APP_HOST}`
  win.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== appOrigin) event.preventDefault()
  })
  if (!app.isPackaged && devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadURL(APP_INDEX_URL)
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
  // Power menu → "Restart app" (UI_REDESIGN.md 4.2). The renderer already ran the
  // unsaved-changes check, so the app restarts without asking again.
  const onRestart = (event: Electron.IpcMainEvent): void => {
    if (event.sender !== win.webContents) return
    closeConfirmed = true
    app.relaunch()
    app.exit(0)
  }
  ipcMain.on(IPC.appConfirmClose, onConfirm)
  ipcMain.on(IPC.appRestart, onRestart)
  win.on('closed', () => {
    ipcMain.off(IPC.appConfirmClose, onConfirm)
    ipcMain.off(IPC.appRestart, onRestart)
  })
}

app.whenReady().then(() => {
  registerAppProtocol()
  restrictPermissions()
  registerSettingsIpc()
  registerStorageIpc()
  registerDocumentIpc()
  registerObsIpc()
  const mainWindow = createMainWindow()
  registerOutputIpc(mainWindow, app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL'])

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
