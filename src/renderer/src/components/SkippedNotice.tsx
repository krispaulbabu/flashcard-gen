import './SkippedNotice.css'

/** Tells the user which dropped/picked files were ignored because of their type. */
export function SkippedNotice({ skipped, align = 'center' }: { skipped: string[]; align?: 'center' | 'start' }): React.JSX.Element | null {
  if (skipped.length === 0) return null
  return (
    <p className={`skipped-notice skipped-notice-${align}`} role="status">
      Skipped {skipped.length === 1 ? skipped[0] : `${skipped.length} files`} — Crema reads PDF, Word, Markdown, text and
      EPUB files.
    </p>
  )
}
