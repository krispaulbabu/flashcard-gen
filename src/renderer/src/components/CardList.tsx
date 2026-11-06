import { useEffect, useRef } from 'react'
import { Flashcard, type Card } from './Flashcard'
import './CardList.css'

/** A project's flashcards in a grid. Newly added cards are scrolled into view. */
export function CardList({ cards }: { cards: Card[] }): React.JSX.Element | null {
  const gridRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(cards.length)

  useEffect(() => {
    if (cards.length > prevCount.current) {
      const firstNew = gridRef.current?.children[prevCount.current] as HTMLElement | undefined
      firstNew?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    prevCount.current = cards.length
  }, [cards.length])

  if (cards.length === 0) return null

  return (
    <section className="card-list" aria-labelledby="card-list-title">
      <div className="card-list-head">
        <h2 id="card-list-title">Cards</h2>
        <span className="card-list-count">{cards.length}</span>
      </div>
      <div ref={gridRef} className="card-grid">
        {cards.map((c, i) => (
          <Flashcard key={c.id} card={c} index={i + 1} total={cards.length} />
        ))}
      </div>
    </section>
  )
}
