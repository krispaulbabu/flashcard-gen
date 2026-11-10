/**
 * Starts the Python backend (backend/retain_backend) and talks to it over localhost.
 *
 * Each launch picks a free port and a random token; the backend rejects requests without
 * the token, so other programs on the machine can't use it.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'

type Sidecar = { port: number; token: string }

let child: ChildProcess | null = null
let starting: Promise<Sidecar> | null = null
let recentOutput = ''

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      srv.close(() => (addr && typeof addr === 'object' ? resolve(addr.port) : reject(new Error('No port'))))
    })
  })
}

// Dev only. Apps opened from Finder don't inherit the shell PATH, so look in uv's usual install spots.
function findUv(): string {
  if (process.env['RETAIN_UV']) return process.env['RETAIN_UV']
  const candidates =
    process.platform === 'win32'
      ? [join(homedir(), '.local', 'bin', 'uv.exe'), join(homedir(), '.cargo', 'bin', 'uv.exe')]
      : [join(homedir(), '.local/bin/uv'), '/opt/homebrew/bin/uv', '/usr/local/bin/uv']
  return candidates.find((p) => existsSync(p)) ?? 'uv'
}

/**
 * How to start the backend. Packaged app: the frozen executable (PyInstaller) shipped in
 * Resources/backend. Dev: `uv run` against the source in backend/, reloading on edits.
 */
function backendCommand(port: number): { cmd: string; args: string[]; cwd: string } {
  // ~/Library/Application Support/Retain (or %APPDATA%\Retain): the database and copies of uploaded files.
  const common = ['--port', String(port), '--data-dir', app.getPath('userData')]
  if (app.isPackaged) {
    const dir = join(process.resourcesPath, 'backend')
    const exe = process.platform === 'win32' ? 'retain-backend.exe' : 'retain-backend'
    return { cmd: join(dir, exe), args: common, cwd: dir }
  }
  const root = app.getAppPath()
  return {
    cmd: findUv(),
    args: ['run', '--project', join(root, 'backend'), 'python', '-m', 'retain_backend', ...common, '--reload'],
    cwd: root
  }
}

async function waitForHealth(port: number, proc: ChildProcess): Promise<void> {
  const deadline = Date.now() + 60_000 // first run may need to create the venv
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`Backend exited during startup.\n${recentOutput.slice(-800)}`)
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`)
      if (res.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('Backend took too long to start.')
}

async function start(): Promise<Sidecar> {
  const port = await freePort()
  const token = randomBytes(24).toString('hex')

  recentOutput = ''
  const { cmd, args, cwd } = backendCommand(port)
  const proc = spawn(
    cmd,
    args,
    // Token goes via the environment, not argv, so it doesn't show up in `ps`.
    {
      cwd,
      windowsHide: true, // no console window flashing up on Windows
      // RETAIN_PARENT_PID: the backend exits when this process is gone, even after a crash or force quit.
      env: { ...process.env, RETAIN_TOKEN: token, RETAIN_PARENT_PID: String(process.pid) },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  )
  const keep = (buf: Buffer): void => {
    const text = buf.toString()
    process.stdout.write(`[backend] ${text}`)
    recentOutput = (recentOutput + text).slice(-4000)
  }
  proc.stdout?.on('data', keep)
  proc.stderr?.on('data', keep)
  proc.on('exit', () => {
    if (child === proc) {
      child = null
      starting = null // next request restarts it
    }
  })
  proc.on('error', (err) => {
    recentOutput += `\n${err.message}`
  })
  child = proc

  await waitForHealth(port, proc)
  return { port, token }
}

function ensureSidecar(): Promise<Sidecar> {
  if (!starting) {
    starting = start().catch((err) => {
      starting = null
      stopSidecar()
      throw err
    })
  }
  return starting
}

export function startSidecar(): void {
  ensureSidecar().catch((err) => console.error('[backend] failed to start:', err.message))
}

export function stopSidecar(): void {
  child?.kill()
  child = null
}

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export async function callSidecar<T>(
  method: Method,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
  signal?: AbortSignal
): Promise<T> {
  let sidecar: Sidecar
  try {
    sidecar = await ensureSidecar()
  } catch (err) {
    throw new Error(`Couldn't start Retain's backend. ${(err as Error).message}`)
  }
  const res = await fetch(`http://127.0.0.1:${sidecar.port}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Retain-Token': sidecar.token, ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = data?.detail
    const message =
      typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg : `Backend error ${res.status}`
    throw new Error(message)
  }
  return data as T
}
