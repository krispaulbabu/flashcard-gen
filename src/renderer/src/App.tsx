import { useState, type ReactNode } from 'react'
import { Sidebar, type Project } from './components/Sidebar'
import { Welcome } from './components/Welcome'
import { UploadDropzone } from './components/UploadDropzone'
import type { ProjectDocument } from './components/DocumentItem'
import { DocumentList } from './components/DocumentList'
import { AddDocumentsButton } from './components/AddDocumentsButton'
import { Button } from './components/Button'
import { SkippedNotice } from './components/SkippedNotice'
import { CardList } from './components/CardList'
import type { Card } from './components/Flashcard'
import { makeDummyCards } from './lib/dummyCards'

interface AppProject extends Project {
  documents: ProjectDocument[]
  cards: Card[]
}

function toDocument(file: File): ProjectDocument {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    // window.api only exists inside Electron; a plain browser tab has no file paths.
    path: window.api?.getPathForFile(file) ?? ''
  }
}

/** "lecture-04_mitochondria.pdf" → "lecture 04 mitochondria" */
function projectNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return base || 'Untitled project'
}

function App(): React.JSX.Element {
  // In-memory for now; persistence comes with the project store.
  const [projects, setProjects] = useState<AppProject[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [skipped, setSkipped] = useState<string[]>([])
  const active = projects.find((p) => p.id === activeId)

  function open(id: string | undefined): void {
    setActiveId(id)
    setSkipped([])
  }

  function handleNewProject(): void {
    const project: AppProject = { id: crypto.randomUUID(), name: 'Untitled project', documents: [], cards: [] }
    setProjects((prev) => [project, ...prev])
    open(project.id)
  }

  function handleDelete(id: string): void {
    const index = projects.findIndex((p) => p.id === id)
    const remaining = projects.filter((p) => p.id !== id)
    setProjects(remaining)
    // If the open project was deleted, move to its neighbour (the one below, else above).
    if (id === activeId) open(remaining[Math.min(index, remaining.length - 1)]?.id)
  }

  function handleFiles(files: File[], skippedNames: string[]): void {
    setSkipped(skippedNames)
    if (files.length === 0) return
    const docs = files.map(toDocument)
    if (active) {
      setProjects((prev) => prev.map((p) => (p.id === active.id ? { ...p, documents: [...p.documents, ...docs] } : p)))
    } else {
      // Dropping files with no project open starts one, named after the first file.
      const project: AppProject = {
        id: crypto.randomUUID(),
        name: projectNameFromFile(files[0].name),
        documents: docs,
        cards: []
      }
      setProjects((prev) => [project, ...prev])
      setActiveId(project.id) // not open(): keep the skipped notice for this drop
    }
  }

  function handleRemoveDocument(docId: string): void {
    if (!active) return
    setProjects((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, documents: p.documents.filter((d) => d.id !== docId) } : p))
    )
  }

  // Placeholder: appends three sample cards. The real generator replaces this.
  function handleGenerateCards(): void {
    if (!active) return
    const names = active.documents.map((d) => d.name)
    setProjects((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, cards: [...p.cards, ...makeDummyCards(p.cards.length, names)] } : p))
    )
  }

  return (
    <div className="shell">
      <Sidebar
        projects={projects.map((p) => ({ id: p.id, name: p.name, cardCount: p.cards.length }))}
        activeId={activeId}
        onNewProject={handleNewProject}
        onSelect={open}
        onRename={(id, name) => setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))}
        onDelete={handleDelete}
        onOpenSettings={() => {
          /* Settings modal comes next. */
        }}
      />
      <main className="main">
        <div className="main-drag" />

        {!active ? (
          // First launch (or nothing open): welcome only while there are no projects at all.
          <div className="main-center">
            {projects.length === 0 && <Welcome />}
            <UploadDropzone onFiles={handleFiles} skipped={skipped} />
          </div>
        ) : active.documents.length === 0 ? (
          <div className="main-center">
            <ProjectHeader project={active} />
            <UploadDropzone onFiles={handleFiles} skipped={skipped} />
          </div>
        ) : (
          <div className="main-page">
            <ProjectHeader
              project={active}
              actions={
                <>
                  <AddDocumentsButton onFiles={handleFiles} />
                  {/* Not wired up yet: Anki export comes later. */}
                  <Button icon="download">Export to Anki</Button>
                  <Button variant="primary" icon="sparkle" onClick={handleGenerateCards}>
                    Generate cards
                  </Button>
                </>
              }
            />
            <div className="doc-section">
              <SkippedNotice skipped={skipped} align="start" />
              <DocumentList documents={active.documents} onRemove={handleRemoveDocument} onFiles={handleFiles} />
            </div>
            <CardList cards={active.cards} />
          </div>
        )}
      </main>
    </div>
  )
}

function ProjectHeader({ project, actions }: { project: AppProject; actions?: ReactNode }): React.JSX.Element {
  const n = project.documents.length
  return (
    <header className="page-head">
      <div className="page-head-text">
        <h1>{project.name}</h1>
        <p>
          {n === 0 ? 'No documents yet' : `${n} document${n === 1 ? '' : 's'}`} · {project.cards.length} card{project.cards.length === 1 ? '' : 's'}
        </p>
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </header>
  )
}

export default App
