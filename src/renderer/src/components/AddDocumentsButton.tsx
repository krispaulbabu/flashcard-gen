import { useRef } from 'react'
import { ACCEPTED_EXTENSIONS, takeFiles, type OnFiles } from '../lib/files'
import { Button } from './Button'

/** Compact "Add documents" button for the project header once a project has documents. */
export function AddDocumentsButton({ onFiles }: { onFiles: OnFiles }): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button icon="upload" onClick={() => inputRef.current?.click()}>
        Add documents
      </Button>
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
    </>
  )
}
