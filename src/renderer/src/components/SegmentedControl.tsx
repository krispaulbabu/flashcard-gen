import { useRef } from 'react'
import type { Difficulty } from './DifficultyBadge'
import './DifficultyBadge.css' // pip styles
import './SegmentedControl.css'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Difficulty options take that difficulty's tint when selected. */
  tone?: Difficulty
}

interface SegmentedControlProps<T extends string> {
  /** Accessible name of the group. */
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}

const PIPS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 }

/** Single choice among 2–4 short options. Arrow keys move the selection, like native radios. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange
}: SegmentedControlProps<T>): React.JSX.Element {
  const groupRef = useRef<HTMLDivElement>(null)

  function move(delta: number): void {
    const i = options.findIndex((o) => o.value === value)
    const next = options[(i + delta + options.length) % options.length]
    onChange(next.value)
    requestAnimationFrame(() =>
      groupRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    )
  }

  return (
    <div
      ref={groupRef}
      className="seg"
      role="radiogroup"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          move(1)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          move(-1)
        }
      }}
    >
      {options.map((o) => {
        const checked = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={o.tone ? `seg-tone-${o.tone}` : undefined}
            onClick={() => onChange(o.value)}
          >
            {o.tone && (
              <span className="pips" aria-hidden>
                {[1, 2, 3].map((i) => (
                  <i key={i} className={i <= PIPS[o.tone!] ? 'on' : undefined} />
                ))}
              </span>
            )}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
