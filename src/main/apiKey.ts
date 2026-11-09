/**
 * The OpenRouter API key, encrypted with the OS keychain via Electron's safeStorage and kept in
 * the app's data folder. Only the main process ever sees the plain key: the renderer gets a
 * "set / ends in ab12" status, and the backend receives the key per request in a header.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, safeStorage } from 'electron'

import type { KeyStatus, KeyVerdict } from '../shared/types'

const keyFile = (): string => join(app.getPath('userData'), 'openrouter-key.enc')
const baseUrl = (): string => process.env['OPENROUTER_BASE_URL'] || 'https://openrouter.ai/api/v1'

export function readKey(): string | null {
  if (!existsSync(keyFile())) return null
  try {
    return safeStorage.decryptString(readFileSync(keyFile()))
  } catch {
    return null // unreadable (e.g. copied from another Mac): treat as not set
  }
}

export function keyStatus(): KeyStatus {
  const key = readKey()
  return key ? { saved: true, last4: key.slice(-4) } : { saved: false }
}

/** Checks the key with OpenRouter, then saves it. A rejected key isn't saved. */
export async function saveKey(raw: string): Promise<KeyVerdict> {
  const key = raw.trim()
  if (!key) return { ok: false, error: 'Paste a key first.' }
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, error: 'This Mac’s keychain isn’t available, so the key can’t be stored safely.' }
  }

  let verified = false
  let note: string | undefined
  try {
    const res = await fetch(`${baseUrl()}/key`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000)
    })
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'OpenRouter rejected this key.' }
    verified = res.ok
    if (!res.ok) note = `Saved, but OpenRouter couldn’t check it (error ${res.status}).`
  } catch {
    note = 'Saved, but OpenRouter couldn’t be reached to check it.'
  }

  writeFileSync(keyFile(), safeStorage.encryptString(key), { mode: 0o600 })
  return { ok: true, status: keyStatus(), verified, note }
}

export function clearKey(): KeyStatus {
  rmSync(keyFile(), { force: true })
  return keyStatus()
}
