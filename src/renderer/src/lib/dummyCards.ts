import type { Card } from '../components/Flashcard'
import type { Difficulty } from '../components/DifficultyBadge'

// Placeholder content until the real generator (LangGraph + Pydantic) is wired up.
const SAMPLES: { front: string; back: string; difficulty: Difficulty }[] = [
  {
    front: 'What organelle produces most of the cell’s ATP?',
    back: 'The mitochondrion, through oxidative phosphorylation on its inner membrane.',
    difficulty: 'easy'
  },
  {
    front: 'Where in the cell does glycolysis take place?',
    back: 'In the cytoplasm, outside the mitochondria.',
    difficulty: 'medium'
  },
  {
    front: 'Why does the proton gradient across the inner mitochondrial membrane matter?',
    back: 'It powers ATP synthase: protons flowing back into the matrix turn the enzyme and drive ATP synthesis.',
    difficulty: 'hard'
  },
  {
    front: 'What is the net ATP yield of glycolysis per glucose molecule?',
    back: 'Two ATP (four produced, two consumed).',
    difficulty: 'easy'
  },
  {
    front: 'Which molecule is the final electron acceptor in the electron transport chain?',
    back: 'Oxygen, which is reduced to water.',
    difficulty: 'medium'
  },
  {
    front: 'How does cyanide stop cellular respiration?',
    back: 'It binds cytochrome c oxidase (Complex IV), blocking electron transfer to oxygen and collapsing the proton gradient.',
    difficulty: 'hard'
  }
]

/** Three placeholder cards, continuing through the sample set on each call. */
export function makeDummyCards(existingCount: number, documentNames: string[], count = 3): Card[] {
  return Array.from({ length: count }, (_, i) => {
    const n = existingCount + i
    const sample = SAMPLES[n % SAMPLES.length]
    const doc = documentNames[n % Math.max(documentNames.length, 1)]
    return {
      id: crypto.randomUUID(),
      ...sample,
      source: doc ? `${doc} · p. ${(n % 12) + 1}` : undefined
    }
  })
}
