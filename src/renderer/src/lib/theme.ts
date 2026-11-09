import type { ThemeSetting } from './settings'

/**
 * Applies Latte (light) or Roast (dark) by setting data-theme on <html>, which switches the token
 * set in tokens.css. It's remembered in localStorage so the next launch paints in the right theme
 * before settings arrive from the backend.
 */

const STORAGE_KEY = 'crema-theme'

/** Call once before the first render. */
export function applyRememberedTheme(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved
  } catch {
    // storage unavailable: the default (Latte) shows until settings load
  }
}

export function applyTheme(theme: ThemeSetting): void {
  document.documentElement.dataset.theme = theme
  // Native parts of the window (background, scrollbars, form controls) follow too.
  window.api?.setTheme(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore
  }
}

/** Settings saved before "System" was removed: keep whatever the Mac was showing. */
export function normalizeTheme(value: unknown): ThemeSetting {
  if (value === 'light' || value === 'dark') return value
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
