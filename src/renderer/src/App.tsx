import { useState } from 'react'
import { Sidebar, type Project } from './components/Sidebar'

function App(): React.JSX.Element {
  // In-memory for now; persistence comes with the project store.
  const [projects, setProjects] = useState<Project[]>([])
  const [activeId, setActiveId] = useState<string>()

  function handleNewProject(): void {
    const project: Project = { id: crypto.randomUUID(), name: 'Untitled project', cardCount: 0 }
    setProjects((prev) => [project, ...prev])
    setActiveId(project.id)
  }

  function handleDelete(id: string): void {
    const index = projects.findIndex((p) => p.id === id)
    const remaining = projects.filter((p) => p.id !== id)
    setProjects(remaining)
    // If the open project was deleted, move to its neighbour (the one below, else above).
    if (id === activeId) setActiveId(remaining[Math.min(index, remaining.length - 1)]?.id)
  }

  return (
    <div className="shell">
      <Sidebar
        projects={projects}
        activeId={activeId}
        onNewProject={handleNewProject}
        onSelect={setActiveId}
        onRename={(id, name) => setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))}
        onDelete={handleDelete}
        onOpenSettings={() => {
          /* Settings modal comes next. */
        }}
      />
      <main className="main">
        <div className="main-drag" />
      </main>
    </div>
  )
}

export default App
