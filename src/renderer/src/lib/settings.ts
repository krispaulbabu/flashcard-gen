import type { Difficulty } from '../components/DifficultyBadge'

// Saved to the backend database. Theme is applied (lib/theme.ts); font and text size aren't yet. The OpenRouter key is not part of settings: the main process
// keeps it encrypted (see src/main/apiKey.ts).

export type ThemeSetting = 'light' | 'dark'
export type TextSize = 'sm' | 'md' | 'lg'
/** 'random' gives each card a random level, mixing all three in one batch. */
export type DifficultySetting = Difficulty | 'random'

export interface ProviderConfig {
  id: string
  name: string
  kind: 'cloud' | 'local'
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
  // Only OpenRouter for now; it reaches most models through one key.
  providers: [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      kind: 'cloud',
      baseUrl: '',
      model: 'anthropic/claude-sonnet-5.5',
      modelPlaceholder: 'anthropic/claude-sonnet-5.5'
    }
  ],
  defaultProviderId: 'openrouter',
  defaultDifficulty: 'medium',
  cardsPerDocument: '20',
  ankiDeckName: 'Crema',
  ankiNoteType: 'Basic',
  ankiTagDifficulty: 'on'
}
