/**
 * The app was called Crema before it became Retain. Electron names the data folder after the app,
 * so on first launch as Retain, move the database and uploaded documents across from
 * ~/Library/Application Support/Crema (or %APPDATA%\Crema). The backend then repoints the stored
 * document paths at the new folder.
 *
 * The OpenRouter key isn't moved: it was encrypted with a keychain entry tied to the old name,
 * so it has to be pasted into Settings again.
 */
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'

/** oldDir: <appData>/Crema. newDir: this app's userData folder. */
export function moveDataFromCrema(oldDir: string, newDir: string): void {
  const oldDb = join(oldDir, 'crema.db')
  const newDb = join(newDir, 'retain.db')
  if (oldDir === newDir || !existsSync(oldDb) || existsSync(newDb)) return

  try {
    mkdirSync(newDir, { recursive: true })
    // SQLite's write-ahead log files hold changes not yet written into the main file.
    for (const suffix of ['', '-wal', '-shm']) {
      if (existsSync(oldDb + suffix)) renameSync(oldDb + suffix, newDb + suffix)
    }
    const oldDocs = join(oldDir, 'documents')
    const newDocs = join(newDir, 'documents')
    if (existsSync(oldDocs) && !existsSync(newDocs)) renameSync(oldDocs, newDocs)
  } catch (err) {
    console.error('Couldn’t move data from the Crema folder:', err)
  }
}
