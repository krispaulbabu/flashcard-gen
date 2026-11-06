import { contextBridge } from 'electron'

// The renderer's only door to the main process. Add IPC methods here as features land.
const api = {
  platform: process.platform
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
