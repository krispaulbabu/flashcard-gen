import { useEffect, useState } from 'react'

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.md', '.txt', '.epub'] as const

/** Callback for any "add documents" control: accepted files plus names of skipped ones. */
export type OnFiles = (files: File[], skipped: string[]) => void

function isAccepted(file: File): boolean {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

/** Split a FileList into supported files and the names of unsupported ones, then hand them on. */
export function takeFiles(list: FileList | null, onFiles: OnFiles): void {
  const files = Array.from(list ?? [])
  if (files.length === 0) return
  onFiles(
    files.filter(isAccepted),
    files.filter((f) => !isAccepted(f)).map((f) => f.name)
  )
}

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

/** True while a file is being dragged anywhere over the window, so drop targets can light up. */
export function useWindowFileDrag(): boolean {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    // dragenter/dragleave fire for every child element crossed, hence the depth counter.
    let depth = 0
    const enter = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const leave = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const end = (): void => {
      depth = 0
      setDragging(false)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', end)
    window.addEventListener('dragend', end)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', end)
      window.removeEventListener('dragend', end)
    }
  }, [])

  return dragging
}
