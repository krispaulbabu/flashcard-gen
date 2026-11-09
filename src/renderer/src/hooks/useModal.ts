import { useEffect, type RefObject } from 'react'

/**
 * Shared modal behaviour: focus moves into the dialog on open and back to the opener on close,
 * Escape closes from anywhere, and Tab stays inside. Returns the dialog's onKeyDown handler.
 *
 * initialFocus: selector for the element to focus first (falls back to the first focusable one).
 */
export function useModal(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocus?: string
): (e: React.KeyboardEvent) => void {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const target = (initialFocus && dialog?.querySelector<HTMLElement>(initialFocus)) || focusables(dialog)[0]
    target?.focus()
    return () => opener?.focus()
  }, []) // once, on open

  // On window, so Escape works even if focus has drifted out of the dialog.
  useEffect(() => {
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  return (e) => {
    if (e.key !== 'Tab') return
    const list = focusables(dialogRef.current)
    if (list.length === 0) return
    const first = list[0]
    const last = list[list.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

function focusables(root: HTMLElement | null | undefined): HTMLElement[] {
  if (!root) return []
  return Array.from(
    root.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, [tabindex]')
  ).filter((el) => el.tabIndex >= 0) // skips e.g. unselected segments, which arrow keys reach
}
