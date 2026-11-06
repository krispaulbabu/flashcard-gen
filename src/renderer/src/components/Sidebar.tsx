import { useEffect, useRef, useState } from 'react'
import { Button, IconButton } from './Button'
import { Icon } from './Icon'
import './Sidebar.css'

export interface Project {
  id: string
  name: string
  cardCount?: number
}

interface SidebarProps {
  projects: Project[]
  activeId?: string
  onNewProject: () => void
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onOpenSettings: () => void
}

export function Sidebar({
  projects,
  activeId,
  onNewProject,
  onSelect,
  onRename,
  onDelete,
  onOpenSettings
}: SidebarProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string>()

  return (
    <nav className="sidebar" aria-label="Projects">
      {/* Window drag strip; the macOS traffic lights sit here. */}
      <div className="sidebar-drag" />

      <div className="sidebar-top">
        <Button variant="primary" icon="plus" block onClick={onNewProject}>
          New project
        </Button>
      </div>

      <div className="sidebar-label" id="sidebar-projects-label">
        Projects
      </div>

      {projects.length > 0 ? (
        <ul className="sidebar-list" aria-labelledby="sidebar-projects-label">
          {projects.map((p) => (
            <li key={p.id} className="sidebar-item">
              {editingId === p.id ? (
                <ProjectRenameField
                  project={p}
                  onDone={(name, refocus) => {
                    if (name !== undefined) onRename(p.id, name)
                    setEditingId(undefined)
                    if (refocus) {
                      requestAnimationFrame(() =>
                        document.querySelector<HTMLButtonElement>(`[data-project-id="${p.id}"]`)?.focus()
                      )
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="sidebar-project"
                  data-project-id={p.id}
                  aria-current={p.id === activeId ? 'page' : undefined}
                  title={`${p.name} — double-click to rename`}
                  onClick={() => onSelect(p.id)}
                  onDoubleClick={() => setEditingId(p.id)}
                  onKeyDown={(e) => {
                    // F2 renames, matching Finder/Explorer, so renaming works without a mouse.
                    if (e.key === 'F2') {
                      e.preventDefault()
                      setEditingId(p.id)
                    }
                  }}
                >
                  <Icon name="book" />
                  <span className="sidebar-project-name">{p.name}</span>
                  {p.cardCount != null && <span className="sidebar-project-count">{p.cardCount}</span>}
                </button>
              )}
              {editingId !== p.id && <ProjectDeleteButton project={p} onDelete={() => onDelete(p.id)} />}
            </li>
          ))}
        </ul>
      ) : (
        <div className="sidebar-list">
          <p className="sidebar-empty">No projects yet.</p>
        </div>
      )}

      <div className="sidebar-foot">
        <IconButton icon="gear" label="Settings" onClick={onOpenSettings} />
      </div>
    </nav>
  )
}

interface ProjectRenameFieldProps {
  project: Project
  /** Called with the new name to save (undefined = cancel); refocus when finished from the keyboard. */
  onDone: (name: string | undefined, refocus: boolean) => void
}

function ProjectRenameField({ project, onDone }: ProjectRenameFieldProps): React.JSX.Element {
  const [value, setValue] = useState(project.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const finished = useRef(false)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function finish(save: boolean, refocus = false): void {
    if (finished.current) return
    finished.current = true
    const name = value.trim()
    // An empty name keeps the old one rather than leaving a blank row.
    onDone(save && name && name !== project.name ? name : undefined, refocus)
  }

  return (
    <div className="sidebar-project sidebar-project-editing">
      <Icon name="book" />
      <input
        ref={inputRef}
        className="sidebar-rename"
        value={value}
        maxLength={120}
        aria-label={`Rename ${project.name}`}
        spellCheck={false}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            finish(true, true)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            finish(false, true)
          }
        }}
      />
    </div>
  )
}

interface ProjectDeleteButtonProps {
  project: Project
  onDelete: () => void
}

/**
 * Trash icon revealed on row hover / keyboard focus. Deleting is destructive, so the first
 * click arms it ("Delete" in danger) and a second click confirms. Leaving the row, tabbing
 * away, Escape, or waiting 3 seconds disarms it.
 */
function ProjectDeleteButton({ project, onDelete }: ProjectDeleteButtonProps): React.JSX.Element {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])

  return (
    <button
      type="button"
      className={['sidebar-delete', armed && 'is-armed'].filter(Boolean).join(' ')}
      aria-label={armed ? `Confirm delete ${project.name}` : `Delete ${project.name}`}
      title={armed ? 'Click again to delete' : 'Delete project'}
      onClick={(e) => {
        e.stopPropagation()
        if (armed) onDelete()
        else setArmed(true)
      }}
      onMouseLeave={() => setArmed(false)}
      onBlur={() => setArmed(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setArmed(false)
      }}
    >
      {armed ? 'Delete' : <Icon name="trash" />}
    </button>
  )
}
