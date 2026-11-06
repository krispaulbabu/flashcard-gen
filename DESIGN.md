# DESIGN.md — Crema design system

All UI in this app follows the **Crema** design system. The full system — live component previews, usage notes for every token, and the component bundle — is published here:

**https://claude.ai/artifact/A9ejtyhFXHTVJK2Y535STf**

This file is the in-repo summary. When the two disagree, update both; the artifact holds the source `tokens.json`, `bundle.css`, `bundle.js` and `index.d.ts`.

> "Crema" is a working name for the app. Rename freely; keep the tokens.

---

## Principles

- Feels like reading a good book at a café table: warm paper, dark-roast ink, one serif. Calm first, clever second.
- Surfaces separate by **tone first, hairline second, shadow last**. No gradients.
- One primary (espresso) button per view.
- Never convey meaning by colour alone — difficulty always shows its word and pips.

## Voice and copy

- Address the student as "you"; the app never says "I". Sentence case everywhere ("New project").
- Buttons are verb-first: "Add documents", "Export .apkg", "Regenerate". Never "OK" / "Submit".
- At most one coffee nod per screen ("Steeping your document…", theme names Latte/Roast). Never in errors.
- Errors say what happened and what to do. No exclamation marks, no emoji in the UI.

---

## Color tokens

Set `data-theme="light" | "dark"` on `<html>`. Settings also offers "System" (follow `prefers-color-scheme`).

| Token | Latte (light) | Roast (dark) | Use |
|---|---|---|---|
| `paper` | `#faf6f0` | `#1d1713` | Main panel background |
| `paper-sunk` | `#f1e9de` | `#17120e` | Sidebar, settings nav rail |
| `paper-raised` | `#fffdf9` | `#271f19` | Cards, inputs, modal, menus |
| `latte` | `#ecdcc6` | `#3b2c21` | Selected / hovered rows, drop-zone while dragging |
| `crema` | `#c8955c` | `#c08a52` | Decoration only (plus ring, loader edges, list markers). **Never text.** |
| `line` | `#e6dccf` | `#33291f` | Hairline dividers (decorative) |
| `line-strong` | `#94806b` | `#8a7462` | Input borders, dashed drop-zone, secondary buttons (≥3:1) |
| `ink` | `#2e2219` | `#f2e8db` | Primary text |
| `ink-muted` | `#6e5a48` | `#bba893` | Secondary text (≥4.8:1 on all surfaces) |
| `espresso` | `#6f4a2f` | `#d6a774` | Brand: primary button, links, focus ring, active icon |
| `espresso-hover` | `#5b3c25` | `#e2b887` | Primary hover / pressed |
| `on-espresso` | `#fffaf3` | `#1d1713` | Text on espresso — never hard-code white |
| `easy` / `easy-tint` | `#2f6673` / `#e2edef` | `#86c0cc` / `#1f3034` | Easy (teal — kept off red/green) |
| `medium` / `medium-tint` | `#8a5a12` / `#f5e7cf` | `#e0b062` / `#3a2c16` | Medium (amber) |
| `hard` / `hard-tint` | `#9a3b2a` / `#f6e1da` | `#ec9a85` / `#3d211b` | Hard (rust) |
| `danger` | `#a3392b` | `#ef9584` | Errors, destructive actions |
| `success` | `#2f6673` | `#86c0cc` | Confirmations (same teal as easy) |

Rules: text is `ink` or `ink-muted` only (or a difficulty colour on its tint). Never put `paper-raised` on `paper-raised`.

## Typography

- One family: `--font-serif: Bookerly, Literata, Georgia, "Times New Roman", serif`.
  - Bookerly is proprietary (Amazon) and can't be bundled; it's used if installed locally. **Literata** (Google Fonts, bundled/loaded) is the real default.
  - The font is user-changeable (Settings → Appearance): swap `--font-serif` at the root. Never set `font-family` on an individual component.
- `--font-mono: "SF Mono", ui-monospace, Menlo, Consolas, monospace` — API keys, model ids, URLs, file extensions only.

| Style | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 40 / 46, −0.01em | 600 | First-launch welcome only |
| `title` | 26 / 32 | 600 | Project name, modal heading |
| `card-face` | 22 / 32 | 400 | Flashcard question |
| `heading` | 18 / 26 | 600 | Section headings (Documents, Summary, Cards) |
| `body` | 16 / 26 | 400 | Summaries, running text |
| `body-sm` | 14 / 22 | 400 | Sidebar names, helper text |
| `label` | 13 / 18, +0.01em | 600 | Buttons, field labels, segments |
| `caption` | 12 / 16, +0.02em | 400 | Counts, timestamps, badges |
| `overline` | 11 / 14, +0.08em, uppercase | 600 | Sidebar "Projects" label |
| `code` | 13 / 20 mono | 400 | Keys, model ids |

The text-size setting scales `card-face` and `body` only.

## Spacing, radius, shadow, motion

- Spacing: `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-6` 24 · `space-8` 32 · `space-12` 48 · `space-16` 64. No in-between values.
- Radius: `radius-sm` 6 (rows, badges, segments) · `radius-md` 10 (buttons, inputs) · `radius-lg` 16 (cards, drop-zone, modal) · `radius-full` 999 (plus button, progress bars).
- Shadow: `shadow-card` (warm-tinted) for flashcards and hovered drop-zone; `shadow-modal` for the settings modal. Nothing else gets a shadow.
- Motion: `duration-fast` 120ms (hover/press) · `duration-base` 220ms (modal, selection) · `duration-flip` 480ms (card flip). Easing `cubic-bezier(.2,.7,.2,1)`. Respect `prefers-reduced-motion`: no flip animation, loader holds still.
- Focus: 2px `espresso` ring offset by 2px of `paper` on every interactive element.

---

## Layout

- Electron window, min 900 × 600, `titleBarStyle: "hiddenInset"`.
- **Sidebar** 260px on `paper-sunk`, top to bottom:
  1. 44px drag strip (`-webkit-app-region: drag`) for the macOS traffic lights
  2. Full-width primary **New project** button
  3. "Projects" overline + project list (book icon, name, card count; selected = `latte` + weight 600)
  4. Footer with only the settings gear, bottom-right
- **Main panel**:
  - First launch (no projects): `Welcome` above a centred `UploadDropzone` (giant 112px espresso plus with a crema ring). Welcome never shows again once a project exists.
  - Project page: title + counts and actions on one row; then Documents, Summary, Cards sections separated by `space-12`. Gutters `space-8`/`space-12`; summary column max 680px; card grid `repeat(auto-fill, minmax(300px, 1fr))`, gap `space-6`.
- **Settings**: small modal (max 680 × 460) with a 184px nav rail — Appearance, AI providers, Card generation, Export. Changes apply immediately; no Save button. Closes on Esc, ✕, or scrim click.

## Components

Defined in the artifact (`components/bundle.js`, typed in `components/index.d.ts`, class prefix `cr-`):

| Component | Purpose |
|---|---|
| `Button` | `primary` / `secondary` (default) / `quiet` / `danger`; `sm`; `icon`; `block` |
| `IconButton` | Round icon-only; `label` required |
| `Icon` | 24px grid line icons, 1.6 stroke, `currentColor` |
| `TextField` | Label, hint, `error`/`success`; `type="password"` adds show/hide; `mono`; `options` → select |
| `SegmentedControl` | 2–4 options; `tone: easy\|medium\|hard` for difficulty |
| `DifficultyBadge` | Word + tint + 1–3 pips |
| `Sidebar` | As described above |
| `Welcome` | First-launch greeting |
| `UploadDropzone` | Giant plus; click to browse or drop; accepts .pdf .docx .md .txt .epub |
| `ProcessingLoader` | Fanning card deck + progress + pipeline steps |
| `DocumentItem` | File row with processing / ready / failed status |
| `SummaryPanel` | AI summary with model meta and Regenerate |
| `Flashcard` | Flips on click/Space; front, back, difficulty, index/total, source |
| `SettingsModal` | Popup with nav rail and the four panes |

Iconography: line icons only (plus, gear, book, file, x, check, key, palette, sparkle, upload, download, refresh, eye, flip). No emoji, no filled icons. No logo yet — set the name in `title` type.

## Feature → UI mapping

- **Upload documents** → `UploadDropzone`; each file becomes a `DocumentItem`.
- **Processing** → `ProcessingLoader` in the main panel (not a modal), shown for anything over ~400ms. Default steps mirror the LangGraph ingest graph: read → split into passages → embed into ChromaDB → summarise → generate cards. Advance `step` from streamed graph node events.
- **AI summarisation** → `SummaryPanel` with the model name in its meta line.
- **Flashcard generation (Easy / Medium / Hard)** → `SegmentedControl` with difficulty tones + `Flashcard`. Props mirror the Pydantic card model (`front`, `back`, `difficulty`, `source`); render only cards that validated.
- **Add / change LLM APIs** → Settings → AI providers: one block per provider with masked mono key field, model field and "Make default". Ollama/local takes a server URL. Store keys with Electron `safeStorage`, never in plain settings files. Validate on blur and report "Key verified" or a specific error.
- **Export to Anki** → Settings → Export (deck name, note type, difficulty tags, "Export .apkg") and a secondary "Export to Anki" button on the project page.
