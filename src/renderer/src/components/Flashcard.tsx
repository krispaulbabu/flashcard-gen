import { useState } from 'react'
import { DifficultyBadge, type Difficulty } from './DifficultyBadge'
import './Flashcard.css'

/** Mirrors the card model the generator will return (validated by Pydantic on the Python side). */
export interface Card {
  id: string
  front: string
  back: string
  difficulty: Difficulty
  /** e.g. "lecture-04.pdf · p. 9" */
  source?: string
}

interface FlashcardProps {
  card: Card
  index: number
  total: number
}

/** A study card that flips on click, Enter or Space to reveal the answer. */
export function Flashcard({ card, index, total }: FlashcardProps): React.JSX.Element {
  const [flipped, setFlipped] = useState(false)

  return (
    <button
      type="button"
      className={['card', flipped && 'is-flipped'].filter(Boolean).join(' ')}
      aria-pressed={flipped}
      aria-label={flipped ? `Answer: ${card.back}` : `Question: ${card.front}`}
      onClick={() => setFlipped((f) => !f)}
    >
      <span className="card-inner">
        <span className="card-face card-front" aria-hidden={flipped || undefined}>
          <span className="card-head">
            <span className="card-side">Question</span>
            <DifficultyBadge level={card.difficulty} />
          </span>
          <span className="card-text">{card.front}</span>
          <span className="card-foot">
            <span>
              Card {index} of {total}
            </span>
            <span>Space to flip</span>
          </span>
        </span>
        <span className="card-face card-back" aria-hidden={!flipped || undefined}>
          <span className="card-head">
            <span className="card-side">Answer</span>
            <DifficultyBadge level={card.difficulty} />
          </span>
          <span className="card-text">{card.back}</span>
          <span className="card-foot">
            <span>
              Card {index} of {total}
            </span>
            <span className="card-source">{card.source}</span>
          </span>
        </span>
      </span>
    </button>
  )
}
