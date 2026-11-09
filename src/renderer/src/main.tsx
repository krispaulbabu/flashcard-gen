import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/literata'
import './styles/tokens.css'
import './styles/global.css'
import App from './App'
import { applyRememberedTheme } from './lib/theme'

applyRememberedTheme()

// A file dropped outside the drop-zone would make Electron navigate away to it. Swallow those drops.
window.addEventListener('dragover', (e) => e.preventDefault())
window.addEventListener('drop', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
