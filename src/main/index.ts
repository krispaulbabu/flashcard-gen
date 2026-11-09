import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { callSidecar, startSidecar, stopSidecar, type Method } from './sidecar'

// The renderer may only reach these backend routes.
const ID = '[0-9a-f-]{36}'
const ROUTES: [Method, RegExp][] = [
  ['GET', /^\/projects$/],
  ['POST', /^\/projects$/],
  ['PATCH', new RegExp(`^/projects/${ID}$`)],
  ['DELETE', new RegExp(`^/projects/${ID}$`)],
  ['POST', new RegExp(`^/projects/${ID}/documents$`)],
  ['POST', new RegExp(`^/projects/${ID}/cards/generate$`)],
  ['DELETE', new RegExp(`^/documents/${ID}$`)],
  ['PATCH', new RegExp(`^/cards/${ID}$`)],
  ['GET', /^\/settings$/],
  ['PUT', /^\/settings$/]
]

function isAllowed(method: Method, path: string): boolean {
  return ROUTES.some(([m, re]) => m === method && re.test(path))
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Crema',
    // DESIGN.md: hidden inset title bar; the sidebar's top 44px is the drag strip.
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#faf6f0', // `paper` — avoids a white flash before the renderer paints
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => win.show())

  // Open external links in the user's browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Start the backend early so the first "Generate cards" doesn't wait for Python to boot.
  startSidecar()

  // Returns { ok, data } / { ok, error } rather than throwing: Electron mangles thrown
  // errors into "Error invoking remote method…", which isn't something to show a user.
  ipcMain.handle('backend:request', async (_event, method: Method, path: string, body?: unknown) => {
    if (!isAllowed(method, path)) return { ok: false, error: `Not allowed: ${method} ${path}` }
    try {
      return { ok: true, data: await callSidecar(method, path, body) }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', stopSidecar)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
