// Data shapes shared by the preload bridge and the renderer (mirror backend/crema_backend/models.py).

export type Difficulty = 'easy' | 'medium' | 'hard'
export type DifficultySetting = Difficulty | 'random'

export type StoredCard = {
  id: string
  front: string
  back: string
  difficulty: Difficulty
  source: string | null
  document_id: string | null
}
export type StoredDocument = { id: string; name: string; size: number }
export type StoredProject = { id: string; name: string; documents: StoredDocument[]; cards: StoredCard[] }

export type GenerateResponse = {
  cards: StoredCard[]
  errors: { document_id: string; name: string; message: string }[]
  model: string
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; cancelled?: boolean }

export type KeyStatus = { saved: boolean; last4?: string }
export type KeyVerdict =
  | { ok: true; status: KeyStatus; verified: boolean; note?: string }
  | { ok: false; error: string }
