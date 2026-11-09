import { contextBridge, ipcRenderer, webUtils } from 'electron'

import type {
  Difficulty,
  DifficultySetting,
  GenerateResponse,
  KeyStatus,
  KeyVerdict,
  Result,
  StoredDocument,
  StoredProject
} from '../shared/types'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
const request = <T>(method: Method, path: string, body?: unknown): Promise<Result<T>> =>
  ipcRenderer.invoke('backend:request', method, path, body)

const api = {
  platform: process.platform,
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  listProjects: () => request<StoredProject[]>('GET', '/projects'),
  createProject: (name: string) => request<StoredProject>('POST', '/projects', { name }),
  renameProject: (id: string, name: string) => request<{ ok: true }>('PATCH', `/projects/${id}`, { name }),
  deleteProject: (id: string) => request<{ ok: true }>('DELETE', `/projects/${id}`),

  /** The backend copies each file into the app's data folder. */
  addDocuments: (projectId: string, files: { path: string; name: string }[]) =>
    request<{ documents: StoredDocument[]; failed: string[] }>('POST', `/projects/${projectId}/documents`, { files }),
  deleteDocument: (id: string) => request<{ ok: true }>('DELETE', `/documents/${id}`),

  generateCards: (projectId: string, req: { difficulty: DifficultySetting; cards_per_document: number; model?: string }) =>
    request<GenerateResponse>('POST', `/projects/${projectId}/cards/generate`, req),

  setCardDifficulty: (cardId: string, difficulty: Difficulty) =>
    request<{ ok: true }>('PATCH', `/cards/${cardId}`, { difficulty }),

  /** OpenRouter key: stored encrypted by the main process. The full key never comes back here. */
  openRouterKey: {
    status: (): Promise<KeyStatus> => ipcRenderer.invoke('key:status'),
    save: (key: string): Promise<KeyVerdict> => ipcRenderer.invoke('key:save', key),
    clear: (): Promise<KeyStatus> => ipcRenderer.invoke('key:clear')
  },

  getSettings: () => request<Record<string, unknown>>('GET', '/settings'),
  saveSettings: (settings: unknown) => request<{ ok: true }>('PUT', '/settings', settings)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
