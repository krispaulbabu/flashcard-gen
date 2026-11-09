import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { StoredCard, StoredProject } from '../../shared/types'
import { Sidebar, type Project } from './components/Sidebar'
import { Welcome } from './components/Welcome'
import { UploadDropzone } from './components/UploadDropzone'
import type { ProjectDocument } from './components/DocumentItem'
import { DocumentList } from './components/DocumentList'
import { AddDocumentsButton } from './components/AddDocumentsButton'
import { Button } from './components/Button'
import { SkippedNotice } from './components/SkippedNotice'
import { GenerateErrors } from './components/GenerateErrors'
import { CardList } from './components/CardList'
import type { Card } from './components/Flashcard'
import type { Difficulty } from './components/DifficultyBadge'
import { SettingsModal } from './components/SettingsModal'
import { StudyPanel } from './components/StudyPanel'
import { DEFAULT_SETTINGS, type ProviderConfig, type Settings } from './lib/settings'

interface AppProject extends Project {
  documents: ProjectDocument[]
  cards: Card[]
  generating?: boolean
  /** Problems from the last generate run, one line per document (or one for the whole run). */
  generateErrors?: string[]
}

type LoadState = { kind: 'loading' } | { kind: 'ready' } | { kind: 'failed'; message: string }

function toCard(c: StoredCard): Card {
  return { id: c.id, front: c.front, back: c.back, difficulty: c.difficulty, source: c.source ?? undefined }
}

function toProject(p: StoredProject): AppProject {
  return { id: p.id, name: p.name, documents: p.documents, cards: p.cards.map(toCard) }
}

/** Saved settings may predate newer fields, so fill gaps from the defaults. */
function mergeSettings(saved: Record<string, unknown>): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...saved } as Settings
  // Providers come from the defaults (OpenRouter only); keep a saved model for each one that still exists.
  const savedProviders = Array.isArray(saved.providers) ? (saved.providers as Partial<ProviderConfig>[]) : []
  merged.providers = DEFAULT_SETTINGS.providers.map((d) => {
    const s = savedProviders.find((p) => p.id === d.id)
    return { ...d, model: typeof s?.model === 'string' && s.model.trim() ? s.model : d.model }
  })
  merged.defaultProviderId = DEFAULT_SETTINGS.defaultProviderId
  return merged
}

/** "lecture-04_mitochondria.pdf" → "lecture 04 mitochondria" */
function projectNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return base || 'Untitled project'
}

function App(): React.JSX.Element {
  // Projects, cards and settings live in the backend's SQLite database; this is the loaded copy.
  const [projects, setProjects] = useState<AppProject[]>([])
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  const [activeId, setActiveId] = useState<string>()
  const [skipped, setSkipped] = useState<string[]>([])
  /** A failed save (create, rename, delete, upload). Cleared by the next action. */
  const [actionError, setActionError] = useState<string>()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [studyOpen, setStudyOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const settingsLoaded = useRef(false)
  const active = projects.find((p) => p.id === activeId)

  useEffect(() => {
    if (!window.api) {
      setLoad({ kind: 'failed', message: 'Open Crema in the app. A browser tab can’t reach your projects.' })
      return
    }
    Promise.all([window.api.listProjects(), window.api.getSettings()]).then(([list, saved]) => {
      if (!list.ok) return setLoad({ kind: 'failed', message: list.error })
      setProjects(list.data.map(toProject))
      if (saved.ok) setSettings(mergeSettings(saved.data))
      settingsLoaded.current = true
      setLoad({ kind: 'ready' })
    })
  }, [])

  // Save settings shortly after the last change (typing in a field shouldn't write every keystroke).
  useEffect(() => {
    if (!settingsLoaded.current) return
    const timer = setTimeout(() => {
      window.api.saveSettings(settings).then((r) => {
        if (!r.ok) setActionError(`Couldn’t save settings. ${r.error}`)
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [settings])

  function open(id: string | undefined): void {
    setActiveId(id)
    setSkipped([])
    setActionError(undefined)
  }

  function updateProject(id: string, patch: (p: AppProject) => Partial<AppProject>): void {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch(p) } : p)))
  }

  async function reload(): Promise<void> {
    const list = await window.api.listProjects()
    if (list.ok) setProjects(list.data.map(toProject))
  }

  async function createProject(name: string): Promise<AppProject | undefined> {
    const res = await window.api.createProject(name)
    if (!res.ok) {
      setActionError(`Couldn’t create the project. ${res.error}`)
      return undefined
    }
    const project = toProject(res.data)
    setProjects((prev) => [project, ...prev])
    return project
  }

  async function handleNewProject(): Promise<void> {
    const project = await createProject('Untitled project')
    if (project) open(project.id)
  }

  function handleRename(id: string, name: string): void {
    updateProject(id, () => ({ name }))
    window.api.renameProject(id, name).then((r) => {
      if (!r.ok) {
        setActionError(`Couldn’t rename the project. ${r.error}`)
        reload()
      }
    })
  }

  function handleDelete(id: string): void {
    const index = projects.findIndex((p) => p.id === id)
    const remaining = projects.filter((p) => p.id !== id)
    setProjects(remaining)
    // If the open project was deleted, move to its neighbour (the one below, else above).
    if (id === activeId) open(remaining[Math.min(index, remaining.length - 1)]?.id)
    window.api.deleteProject(id).then((r) => {
      if (!r.ok) {
        setActionError(`Couldn’t delete the project. ${r.error}`)
        reload()
      }
    })
  }

  async function handleFiles(files: File[], skippedNames: string[]): Promise<void> {
    setSkipped(skippedNames)
    setActionError(undefined)
    if (files.length === 0) return

    // Dropping files with no project open starts one, named after the first file.
    const project = active ?? (await createProject(projectNameFromFile(files[0].name)))
    if (!project) return
    if (!active) setActiveId(project.id) // not open(): keep the skipped notice for this drop

    const res = await window.api.addDocuments(
      project.id,
      files.map((f) => ({ path: window.api.getPathForFile(f), name: f.name }))
    )
    if (!res.ok) {
      setActionError(`Couldn’t add the documents. ${res.error}`)
      return
    }
    updateProject(project.id, (p) => ({ documents: [...p.documents, ...res.data.documents] }))
    if (res.data.failed.length > 0) setActionError(`Couldn’t copy ${res.data.failed.join(', ')}.`)
  }

  function handleRemoveDocument(docId: string): void {
    if (!active) return
    const projectId = active.id
    updateProject(projectId, (p) => ({ documents: p.documents.filter((d) => d.id !== docId) }))
    window.api.deleteDocument(docId).then((r) => {
      if (!r.ok) {
        setActionError(`Couldn’t remove the document. ${r.error}`)
        reload()
      }
    })
  }

  function handleSetDifficulty(cardId: string, difficulty: Difficulty): void {
    if (!active) return
    updateProject(active.id, (p) => ({
      cards: p.cards.map((c) => (c.id === cardId ? { ...c, difficulty } : c))
    }))
    window.api.setCardDifficulty(cardId, difficulty).then((r) => {
      if (!r.ok) {
        setActionError(`Couldn’t change the card’s difficulty. ${r.error}`)
        reload()
      }
    })
  }

  async function handleGenerateCards(): Promise<void> {
    if (!active || active.generating) return
    const projectId = active.id
    updateProject(projectId, () => ({ generating: true, generateErrors: [] }))
    const perDocument = Math.min(200, Math.max(1, parseInt(settings.cardsPerDocument, 10) || 20))
    const result = await window.api.generateCards(projectId, {
      difficulty: settings.defaultDifficulty,
      cards_per_document: perDocument,
      model: settings.providers.find((p) => p.id === settings.defaultProviderId)?.model.trim() || undefined
    })

    // The user may have switched projects while this ran; update the one we started on.
    if (result.ok) {
      const { cards, errors } = result.data
      updateProject(projectId, (p) => ({
        generating: false,
        cards: [...p.cards, ...cards.map(toCard)],
        generateErrors: errors.map((e) => `${e.name}: ${e.message}`)
      }))
    } else {
      // Cancelled by the user: nothing to report.
      updateProject(projectId, () => ({ generating: false, generateErrors: result.cancelled ? [] : [result.error] }))
    }
  }

  const errorNotice = <GenerateErrors errors={actionError ? [actionError] : undefined} />

  return (
    <div className={['shell', (settingsOpen || studyOpen) && 'modal-open'].filter(Boolean).join(' ')}>
      <Sidebar
        projects={projects.map((p) => ({ id: p.id, name: p.name, cardCount: p.cards.length }))}
        activeId={activeId}
        onNewProject={handleNewProject}
        onSelect={open}
        onRename={handleRename}
        onDelete={handleDelete}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="main">
        <div className="main-drag" />

        {load.kind === 'loading' ? (
          <div className="main-center">
            <p className="main-status">Opening your projects…</p>
          </div>
        ) : load.kind === 'failed' ? (
          <div className="main-center">
            <GenerateErrors errors={[load.message]} />
          </div>
        ) : !active ? (
          // First launch (or nothing open): welcome only while there are no projects at all.
          <div className="main-center">
            {projects.length === 0 && <Welcome />}
            <UploadDropzone onFiles={handleFiles} skipped={skipped} />
            {errorNotice}
          </div>
        ) : active.documents.length === 0 ? (
          <div className="main-center">
            <ProjectHeader project={active} />
            <UploadDropzone onFiles={handleFiles} skipped={skipped} />
            {errorNotice}
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
                  <Button
                    icon="play"
                    aria-label="Study cards"
                    title={active.cards.length === 0 ? 'Generate cards to study them' : 'Study cards'}
                    disabled={active.cards.length === 0}
                    onClick={() => setStudyOpen(true)}
                  />
                  {active.generating && (
                    <Button onClick={() => window.api.cancelGenerate(active.id)}>Cancel</Button>
                  )}
                  <Button
                    variant="primary"
                    icon="sparkle"
                    onClick={handleGenerateCards}
                    disabled={active.generating}
                    aria-busy={active.generating}
                  >
                    {active.generating ? 'Generating…' : 'Generate cards'}
                  </Button>
                </>
              }
            />
            <div className="doc-section">
              <SkippedNotice skipped={skipped} align="start" />
              {errorNotice}
              <GenerateErrors errors={active.generateErrors} />
              <DocumentList documents={active.documents} onRemove={handleRemoveDocument} onFiles={handleFiles} />
            </div>
            <CardList cards={active.cards} />
          </div>
        )}
      </main>
      {studyOpen && active && (
        <StudyPanel
          projectName={active.name}
          cards={active.cards}
          onSetDifficulty={handleSetDifficulty}
          onClose={() => setStudyOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsModal settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
      )}
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
