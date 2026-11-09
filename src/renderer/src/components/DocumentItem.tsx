import { IconButton } from './Button'
import './DocumentItem.css'

export interface ProjectDocument {
  id: string
  name: string
  size: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentItemProps {
  doc: ProjectDocument
  onRemove: () => void
}

/** One uploaded file in a project. */
export function DocumentItem({ doc, onRemove }: DocumentItemProps): React.JSX.Element {
  const ext = (doc.name.split('.').pop() ?? 'doc').slice(0, 4).toUpperCase()
  return (
    <div className="doc">
      <span className="doc-badge" aria-hidden>
        {ext}
      </span>
      <div className="doc-body">
        <div className="doc-name" title={doc.name}>
          {doc.name}
        </div>
        <div className="doc-meta">{formatSize(doc.size)}</div>
      </div>
      <IconButton icon="x" label={`Remove ${doc.name}`} onClick={onRemove} />
    </div>
  )
}
