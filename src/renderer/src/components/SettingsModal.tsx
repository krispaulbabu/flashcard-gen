import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, IconButton } from './Button'
import { Icon, type IconName } from './Icon'
import { SegmentedControl } from './SegmentedControl'
import { TextField } from './TextField'
import { ANKI_NOTE_TYPES, FONTS, type ProviderConfig, type Settings } from '../lib/settings'
import { useModal } from '../hooks/useModal'
import type { KeyStatus } from '../../../shared/types'
import './SettingsModal.css'

type TabId = 'appearance' | 'providers' | 'generation' | 'export'

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'providers', label: 'AI provider', icon: 'key' },
  { id: 'generation', label: 'Card generation', icon: 'sparkle' },
  { id: 'export', label: 'Export to Anki', icon: 'download' }
]

interface SettingsModalProps {
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
}

/**
 * The small settings window: a nav rail on the left, the chosen pane on the right.
 * Closes on Escape, the ✕, or a click on the dimmed backdrop. UI only for now — values
 * are kept while the app runs but not applied or saved.
 */
export function SettingsModal({ settings, onChange, onClose }: SettingsModalProps): React.JSX.Element {
  const [tab, setTab] = useState<TabId>('appearance')
  const dialogRef = useRef<HTMLDivElement>(null)
  const set = <K extends keyof Settings>(key: K, value: Settings[K]): void => onChange({ ...settings, [key]: value })

  const onKeyDown = useModal(dialogRef, onClose, '[aria-current="page"]')

  const current = TABS.find((t) => t.id === tab)!

  return (
    <div
      className="settings-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onKeyDown={onKeyDown}
      >
        <nav className="settings-rail" aria-label="Settings sections">
          <h2>Settings</h2>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="settings-tab"
              aria-current={t.id === tab ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="settings-main">
          <div className="settings-head">
            <h3 id="settings-title">{current.label}</h3>
            <IconButton icon="x" label="Close settings" onClick={onClose} />
          </div>
          <div className="settings-body">
            {tab === 'appearance' && <AppearancePane settings={settings} set={set} />}
            {tab === 'providers' && <ProvidersPane settings={settings} onChange={onChange} />}
            {tab === 'generation' && <GenerationPane settings={settings} set={set} />}
            {tab === 'export' && <ExportPane settings={settings} set={set} />}
          </div>
        </div>
      </div>
    </div>
  )
}

type Setter = <K extends keyof Settings>(key: K, value: Settings[K]) => void

function Row({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <b>{title}</b>
        <span>{description}</span>
      </div>
      {children}
    </div>
  )
}

function AppearancePane({ settings, set }: { settings: Settings; set: Setter }): React.JSX.Element {
  return (
    <>
      <Row title="Theme" description="Latte is light, Roast is dark. System follows your Mac.">
        <SegmentedControl
          label="Theme"
          value={settings.theme}
          onChange={(v) => set('theme', v)}
          options={[
            { value: 'light', label: 'Latte' },
            { value: 'dark', label: 'Roast' },
            { value: 'system', label: 'System' }
          ]}
        />
      </Row>
      <Row title="Reading font" description="Used for cards, summaries and the interface.">
        <TextField
          label="Reading font"
          className="settings-inline-field"
          options={FONTS}
          value={settings.font}
          onChange={(v) => set('font', v)}
        />
      </Row>
      <Row title="Text size" description="Scales card and summary text.">
        <SegmentedControl
          label="Text size"
          value={settings.textSize}
          onChange={(v) => set('textSize', v)}
          options={[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' }
          ]}
        />
      </Row>
    </>
  )
}

function ProvidersPane({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  function update(id: string, patch: Partial<ProviderConfig>): void {
    onChange({ ...settings, providers: settings.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  }
  // OpenRouter only for now.
  const p = settings.providers[0]

  return (
    <>
      <p className="settings-intro">
        Crema sends your documents to OpenRouter, which passes them to the model you choose, to write cards.
        Your key is stored encrypted on this Mac.
      </p>
      <section className="provider" aria-label={p.name}>
        <div className="provider-head">
          <b>{p.name}</b>
        </div>
        <div className="settings-grid">
          <ApiKeyField />
          <TextField
            label="Model"
            mono
            placeholder={p.modelPlaceholder}
            value={p.model}
            onChange={(e) => update(p.id, { model: e.target.value })}
            hint="Any OpenRouter model id that supports structured outputs."
          />
        </div>
      </section>
    </>
  )
}

function GenerationPane({ settings, set }: { settings: Settings; set: Setter }): React.JSX.Element {
  return (
    <>
      <Row title="Default difficulty" description="New cards start at this level. Random mixes easy, medium and hard.">
        <SegmentedControl
          label="Default difficulty"
          value={settings.defaultDifficulty}
          onChange={(v) => set('defaultDifficulty', v)}
          options={[
            { value: 'easy', label: 'Easy', tone: 'easy' },
            { value: 'medium', label: 'Medium', tone: 'medium' },
            { value: 'hard', label: 'Hard', tone: 'hard' },
            { value: 'random', label: 'Random' }
          ]}
        />
      </Row>
      <div className="settings-grid">
        <TextField
          label="Cards per document"
          type="number"
          min={1}
          max={200}
          hint="Roughly how many cards to write for each document."
          value={settings.cardsPerDocument}
          onChange={(e) => set('cardsPerDocument', e.target.value)}
        />
      </div>
    </>
  )
}

function ExportPane({ settings, set }: { settings: Settings; set: Setter }): React.JSX.Element {
  return (
    <>
      <div className="settings-grid">
        <TextField
          label="Deck name"
          hint="Use :: for sub-decks, e.g. Crema::Biology."
          value={settings.ankiDeckName}
          onChange={(e) => set('ankiDeckName', e.target.value)}
        />
        <TextField
          label="Note type"
          options={ANKI_NOTE_TYPES}
          value={settings.ankiNoteType}
          onChange={(v) => set('ankiNoteType', v)}
        />
      </div>
      <Row title="Tag cards by difficulty" description="Adds easy, medium or hard as a tag on each Anki note.">
        <SegmentedControl
          label="Tag cards by difficulty"
          value={settings.ankiTagDifficulty}
          onChange={(v) => set('ankiTagDifficulty', v)}
          options={[
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' }
          ]}
        />
      </Row>
    </>
  )
}

/**
 * The OpenRouter key. Saved (and checked with OpenRouter) on Enter or when the field loses focus.
 * The saved key is never shown again, only its last four characters.
 */
function ApiKeyField(): React.JSX.Element {
  const [status, setStatus] = useState<KeyStatus>()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ error?: string; success?: string }>({})

  useEffect(() => {
    window.api?.openRouterKey.status().then(setStatus)
  }, [])

  async function save(): Promise<void> {
    if (!draft.trim() || busy) return
    setBusy(true)
    const verdict = await window.api.openRouterKey.save(draft)
    setBusy(false)
    if (verdict.ok) {
      setStatus(verdict.status)
      setDraft('')
      setResult({ success: verdict.note ?? 'Key verified' })
    } else {
      setResult({ error: verdict.error })
    }
  }

  async function remove(): Promise<void> {
    setStatus(await window.api.openRouterKey.clear())
    setResult({})
  }

  const placeholder = status?.saved ? `Saved key ending in ${status.last4}` : 'sk-or-…'
  return (
    <div className="api-key">
      <TextField
        label="API key"
        type="password"
        mono
        placeholder={busy ? 'Checking…' : placeholder}
        value={draft}
        disabled={busy}
        onChange={(e) => {
          setDraft(e.target.value)
          setResult({})
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
        }}
        error={result.error}
        success={result.success}
        hint={status?.saved ? 'Paste a new key to replace it.' : 'From openrouter.ai/keys. Saved when you press Enter.'}
      />
      {status?.saved && (
        <Button variant="quiet" size="sm" onClick={remove}>
          Remove key
        </Button>
      )}
    </div>
  )
}
