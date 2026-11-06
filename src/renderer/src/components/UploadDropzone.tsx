import { useRef, useState } from 'react'
import { ACCEPTED_EXTENSIONS, takeFiles, useWindowFileDrag, type OnFiles } from '../lib/files'
import { Icon } from './Icon'
import { SkippedNotice } from './SkippedNotice'
import './UploadDropzone.css'

interface UploadDropzoneProps {
  onFiles: OnFiles
  /** Names of files skipped on the last add; kept by the parent so it survives layout changes. */
  skipped?: string[]
}

/**
 * The giant plus, used until a project has documents. Click to open the file picker, or drop
 * files on it. While a file is being dragged anywhere over the window, it lights up.
 */
export function UploadDropzone({ onFiles, skipped = [] }: UploadDropzoneProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const windowDrag = useWindowFileDrag()
  const [over, setOver] = useState(false)

  return (
    <div className="dropzone-wrap">
      <button
        type="button"
        className={['dropzone', (over || windowDrag) && 'is-over'].filter(Boolean).join(' ')}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          takeFiles(e.dataTransfer.files, onFiles)
        }}
      >
        <span className="dropzone-plus">
          <Icon name="plus" />
        </span>
        <span className="dropzone-text">
          <span className="dropzone-title">Add documents</span>
          <span className="dropzone-hint">Click to browse, or drop files here</span>
        </span>
        <span className="dropzone-types" aria-label="Accepted file types">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span key={ext}>{ext}</span>
          ))}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(',')}
        hidden
        onChange={(e) => {
          takeFiles(e.target.files, onFiles)
          e.target.value = '' // allow picking the same file again
        }}
      />
      <SkippedNotice skipped={skipped} />
    </div>
  )
}
