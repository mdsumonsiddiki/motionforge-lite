import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
// Bundled OFL fonts for the Document Editor (spec section 8). Served locally, no Internet needed.
import '@fontsource/noto-sans-bengali/400.css'
import '@fontsource/noto-serif-bengali/400.css'
import '@fontsource/hind-siliguri/400.css'
import '@fontsource/noto-sans/400.css'
import '@fontsource/noto-serif/400.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
