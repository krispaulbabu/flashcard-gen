import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import { callSidecar, startSidecar, stopSidecar, type Method } from './sidecar'
import { clearKey, keyStatus, readKey, saveKey } from './apiKey'
import { moveDataFromCrema } from './migrate'

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

/** In-flight "Generate cards" requests by project id, so Cancel can abort them. */
const generations = new Map<string, AbortController>()

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
    title: 'Retain',
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
  // Must run before the backend opens the database. Only for the normal data folder, so a run with
  // --user-data-dir (tests) never pulls in the real one.
  const appData = app.getPath('appData')
  if (app.getPath('userData') === join(appData, 'Retain')) {
    moveDataFromCrema(join(appData, 'Crema'), join(appData, 'Retain'))
  }
  // Start the backend early so the first "Generate cards" doesn't wait for Python to boot.
  startSidecar()

  // Returns { ok, data } / { ok, error } rather than throwing: Electron mangles thrown
  // errors into "Error invoking remote method…", which isn't something to show a user.
  ipcMain.handle('backend:request', async (_event, method: Method, path: string, body?: unknown) => {
    if (!isAllowed(method, path)) return { ok: false, error: `Not allowed: ${method} ${path}` }
    // Only card generation needs the OpenRouter key; it's added here so the renderer never holds it.
    const headers: Record<string, string> = {}
    const generating = path.match(/^\/projects\/([^/]+)\/cards\/generate$/)?.[1]
    let controller: AbortController | undefined
    if (generating) {
      const key = readKey()
      if (key) headers['X-OpenRouter-Key'] = key
      controller = new AbortController()
      generations.set(generating, controller)
    }
    try {
      return { ok: true, data: await callSidecar(method, path, body, headers, controller?.signal) }
    } catch (err) {
      if (controller?.signal.aborted) return { ok: false, error: 'Cancelled.', cancelled: true }
      return { ok: false, error: (err as Error).message }
    } finally {
      if (generating && generations.get(generating) === controller) generations.delete(generating)
    }
  })

  // Aborting drops the connection; the backend sees that and stops (and saves nothing).
  ipcMain.handle('cards:cancel', (_event, projectId: string) => {
    generations.get(String(projectId))?.abort()
  })

  ipcMain.handle('theme:set', (_event, theme: unknown) => {
    if (theme !== 'light' && theme !== 'dark') return
    nativeTheme.themeSource = theme
    // `paper` for each theme, so resizing or reloading never flashes the wrong colour.
    const bg = theme === 'dark' ? '#1d1713' : '#faf6f0'
    for (const win of BrowserWindow.getAllWindows()) win.setBackgroundColor(bg)
  })

  ipcMain.handle('key:status', () => keyStatus())
  ipcMain.handle('key:save', (_event, key: string) => saveKey(String(key ?? '')))
  ipcMain.handle('key:clear', () => clearKey())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', stopSidecar)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
