import type { Difficulty } from '../components/DifficultyBadge'

// Saved to the backend database (API keys excluded). Not applied to the UI yet.

export type ThemeSetting = 'light' | 'dark' | 'system'
export type TextSize = 'sm' | 'md' | 'lg'
/** 'random' gives each card a random level, mixing all three in one batch. */
export type DifficultySetting = Difficulty | 'random'

export interface ProviderConfig {
  id: string
  name: string
  kind: 'cloud' | 'local'
  /** Cloud providers: API key. */
  apiKey: string
  /** Local providers (Ollama): server URL. */
  baseUrl: string
  model: string
  modelPlaceholder: string
}

export interface Settings {
  theme: ThemeSetting
  font: string
  textSize: TextSize
  providers: ProviderConfig[]
  defaultProviderId: string
  defaultDifficulty: DifficultySetting
  cardsPerDocument: string
  ankiDeckName: string
  ankiNoteType: string
  ankiTagDifficulty: 'on' | 'off'
}

export const FONTS = ['Bookerly', 'Literata', 'Georgia', 'Charter', 'System sans-serif']
export const ANKI_NOTE_TYPES = ['Basic', 'Basic (and reversed card)']

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  font: 'Bookerly',
  textSize: 'md',
  providers: [
    {
      id: 'anthropic',
      name: 'Anthropic',
      kind: 'cloud',
      apiKey: '',
      baseUrl: '',
      model: 'claude-sonnet-5-5',
      modelPlaceholder: 'e.g. claude-sonnet-5-5'
    },
    { id: 'openai', name: 'OpenAI', kind: 'cloud', apiKey: '', baseUrl: '', model: '', modelPlaceholder: 'e.g. gpt-5' },
    {
      id: 'ollama',
      name: 'Ollama (local)',
      kind: 'local',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b',
      modelPlaceholder: 'e.g. llama3.1:8b'
    }
  ],
  defaultProviderId: 'anthropic',
  defaultDifficulty: 'medium',
  cardsPerDocument: '20',
  ankiDeckName: 'Crema',
  ankiNoteType: 'Basic',
  ankiTagDifficulty: 'on'
}
