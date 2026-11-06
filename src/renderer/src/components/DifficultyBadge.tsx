import './DifficultyBadge.css'

export type Difficulty = 'easy' | 'medium' | 'hard'

const LEVEL: Record<Difficulty, { pips: number; label: string }> = {
  easy: { pips: 1, label: 'Easy' },
  medium: { pips: 2, label: 'Medium' },
  hard: { pips: 3, label: 'Hard' }
}

/** Difficulty as a word, a tint and 1–3 pips — never colour alone (DESIGN.md). */
export function DifficultyBadge({ level }: { level: Difficulty }): React.JSX.Element {
  const { pips, label } = LEVEL[level]
  return (
    <span className={`badge badge-${level}`}>
      <span className="pips" aria-hidden>
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= pips ? 'on' : undefined} />
        ))}
      </span>
      {label}
    </span>
  )
}
