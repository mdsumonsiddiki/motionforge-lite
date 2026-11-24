import { useEffect, type ComponentType } from 'react'
import i18n from './i18n'
import { AppHeader } from './components/AppHeader'
import { CloseConfirmDialog } from './components/CloseConfirmDialog'
import { Toaster } from './components/Toaster'
import { Dashboard } from './pages/Dashboard'
import { DocumentEditor } from './pages/DocumentEditor'
import { HumanStudio } from './pages/HumanStudio'
import { Settings } from './pages/Settings'
import { WebcamOutput } from './pages/WebcamOutput'
import { useNavStore, type Page } from './store/navStore'
import { useSettingsStore } from './store/settingsStore'
import { useOutputSync } from './output/useOutputSync'

const PAGES: Record<Page, ComponentType> = {
  dashboard: Dashboard,
  human: HumanStudio,
  document: DocumentEditor,
  output: WebcamOutput,
  settings: Settings
}

/** App shell: header + current page + toasts + close confirmation. */
export default function App() {
  const page = useNavStore((s) => s.page)
  const settings = useSettingsStore((s) => s.settings)
  const load = useSettingsStore((s) => s.load)

  // Keep the Webcam Output window in sync with the controls and open documents.
  useOutputSync()

  // Load saved settings once (theme and language survive a restart).
  useEffect(() => {
    void load()
  }, [load])

  // Apply theme and language as soon as they change.
  const theme = settings?.theme ?? 'dark'
  const language = settings?.language ?? 'en'
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  useEffect(() => {
    void i18n.changeLanguage(language)
    document.documentElement.lang = language
  }, [language])

  const CurrentPage = PAGES[page]

  return (
    <div className="flex h-full flex-col bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <AppHeader />
      <main className="min-h-0 flex-1 overflow-auto">
        <CurrentPage />
      </main>
      <Toaster />
      <CloseConfirmDialog />
    </div>
  )
}
