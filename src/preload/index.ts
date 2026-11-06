import { contextBridge, webUtils } from 'electron'

// The renderer's only door to the main process. Add IPC methods here as features land.
const api = {
  platform: process.platform,
  /** Absolute path of a File from a file input or drop (File.path was removed in Electron 32). */
  getPathForFile: (file: File): string => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
