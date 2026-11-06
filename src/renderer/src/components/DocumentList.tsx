import { useEffect, useRef, useState } from 'react'
import { takeFiles, useWindowFileDrag, type OnFiles } from '../lib/files'
import { DocumentItem, type ProjectDocument } from './DocumentItem'
import './DocumentList.css'

interface DocumentListProps {
  documents: ProjectDocument[]
  onRemove: (id: string) => void
  /** Files dropped onto the panel. */
  onFiles: OnFiles
}

/**
 * A project's uploaded documents in a fixed-height panel that scrolls on its own,
 * so a long list never pushes the rest of the project page out of view.
 */
export function DocumentList({ documents, onRemove, onFiles }: DocumentListProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(documents.length)
  const windowDrag = useWindowFileDrag()
  const [over, setOver] = useState(false)

  // When documents are added, scroll so the newest ones are visible.
  useEffect(() => {
    const el = scrollRef.current
    if (el && documents.length > prevCount.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
    prevCount.current = documents.length
  }, [documents.length])

  const n = documents.length

  return (
    <section className="doc-panel" aria-labelledby="doc-panel-title">
      <div className="doc-panel-head">
        <h2 id="doc-panel-title">Documents</h2>
        <span className="doc-panel-count">
          {n} file{n === 1 ? '' : 's'}
        </span>
        <span className="doc-panel-hint">{windowDrag ? 'Drop to add' : 'Drop files here to add more'}</span>
      </div>
      {/* tabIndex lets keyboard users focus the panel and scroll it with the arrow keys. */}
      <div
        ref={scrollRef}
        className={['doc-panel-scroll', windowDrag && 'is-drop-target', over && 'is-over'].filter(Boolean).join(' ')}
        tabIndex={0}
        role="region"
        aria-label="Uploaded documents"
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
          setOver(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          takeFiles(e.dataTransfer.files, onFiles)
        }}
      >
        <ul className="doc-panel-list">
          {documents.map((d) => (
            <li key={d.id}>
              <DocumentItem doc={d} onRemove={() => onRemove(d.id)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
