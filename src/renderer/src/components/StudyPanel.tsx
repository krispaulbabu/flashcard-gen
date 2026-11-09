import { useEffect, useRef, useState } from 'react'
import { Button, IconButton } from './Button'
import { Flashcard, type Card } from './Flashcard'
import type { Difficulty } from './DifficultyBadge'
import { SegmentedControl } from './SegmentedControl'
import { useModal } from '../hooks/useModal'
import './StudyPanel.css'

interface StudyPanelProps {
  projectName: string
  cards: Card[]
  onSetDifficulty: (cardId: string, difficulty: Difficulty) => void
  onClose: () => void
}

/**
 * Near-full-window study panel over a blurred backdrop. Closes on Escape, the ✕, or a click
 * on the backdrop. Opens on a random card; the side arrows (or ← →) step through the cards
 * in project order, wrapping at the ends, and "Random card" jumps to another random one.
 * The Easy / Medium / Hard control shows the card's level and reassigns it.
 */
export function StudyPanel({ projectName, cards, onSetDifficulty, onClose }: StudyPanelProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  // Focus the card, so Space flips it straight away.
  const onKeyDown = useModal(dialogRef, onClose, '.card')
  const n = cards.length
  // The panel only opens when the project has cards. `turn` changes on every move, so the
  // card remounts on its question side even when the same card comes round again.
  const [view, setView] = useState(() => ({ index: Math.floor(Math.random() * n), turn: 0 }))
  const card = cards[view.index]

  const go = (index: number): void => setView((v) => ({ index: (index + n) % n, turn: v.turn + 1 }))
  const step = (delta: number): void => go(view.index + delta)
  function random(): void {
    if (n < 2) return
    const other = Math.floor(Math.random() * (n - 1)) // any card but the current one
    go(other >= view.index ? other + 1 : other)
  }

  useEffect(() => {
    const onArrow = (e: KeyboardEvent): void => {
      // defaultPrevented: the difficulty control already used the arrow to move its selection.
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.defaultPrevented) {
        e.preventDefault()
        step(e.key === 'ArrowRight' ? 1 : -1)
      }
    }
    window.addEventListener('keydown', onArrow)
    return () => window.removeEventListener('keydown', onArrow)
  })

  // The old card unmounts on a move; if it had focus, give focus to the new one so Space still flips.
  useEffect(() => {
    if (document.activeElement === document.body) dialogRef.current?.querySelector<HTMLElement>('.card')?.focus()
  }, [view])

  return (
    <div
      className="study-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="study"
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-title"
        onKeyDown={onKeyDown}
      >
        <header className="study-head">
          <div>
            <h2 id="study-title">{projectName}</h2>
            <p>
              {n} card{n === 1 ? '' : 's'}
            </p>
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </header>
        <div className="study-body">
          {card && (
            <div className="study-stage">
              <div className="study-row">
                <IconButton
                  icon="chevronLeft"
                  label="Previous card (←)"
                  className="study-arrow"
                  onClick={() => step(-1)}
                  disabled={n < 2}
                />
                <div className="study-card">
                  <Flashcard key={view.turn} card={card} index={view.index + 1} total={n} />
                </div>
                <IconButton
                  icon="chevronRight"
                  label="Next card (→)"
                  className="study-arrow"
                  onClick={() => step(1)}
                  disabled={n < 2}
                />
              </div>
              <div className="study-actions">
                <SegmentedControl
                  label="Card difficulty"
                  value={card.difficulty}
                  onChange={(d) => onSetDifficulty(card.id, d)}
                  options={[
                    { value: 'easy', label: 'Easy', tone: 'easy' },
                    { value: 'medium', label: 'Medium', tone: 'medium' },
                    { value: 'hard', label: 'Hard', tone: 'hard' }
                  ]}
                />
                <Button onClick={random} disabled={n < 2}>
                  Random card
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
