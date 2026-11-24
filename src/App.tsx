import { useEffect, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from './i18n'
import { CloseConfirmDialog } from './components/CloseConfirmDialog'
import { Toaster } from './components/Toaster'
import { Home } from './pages/home/Home'
import { HomePanel } from './pages/home/HomePanel'
import { DocumentEditor, DocumentPanel } from './pages/DocumentEditor'
import { HumanStudio, HumanStudioPanel } from './pages/HumanStudio'
import { Settings } from './pages/Settings'
import { WebcamOutput, WebcamOutputPanel } from './pages/WebcamOutput'
import { useNavStore, type Page } from './store/navStore'
import { useSettingsStore } from './store/settingsStore'
import { useOutputSync } from './output/useOutputSync'
import { Shell } from './shell/Shell'
import { ObsPill } from './shell/ObsPill'
import { ProfileCard } from './shell/ProfileCard'
import { useObsPolling, useObsStore } from './store/obsStore'

/**
 * Sections (UI_REDESIGN.md section 5): center workspace + optional right control panel.
 * Pages are moved into the center / right slots step by step (work order section 7).
 */
type Section = { titleKey: string; center: ComponentType; right?: ComponentType }

const SECTIONS: Record<Page, Section> = {
  home: { titleKey: 'nav.home', center: Home, right: HomePanel },
  human: { titleKey: 'nav.human', center: HumanStudio, right: HumanStudioPanel },
  document: { titleKey: 'nav.document', center: DocumentEditor, right: DocumentPanel },
  output: { titleKey: 'nav.output', center: WebcamOutput, right: WebcamOutputPanel },
  settings: { titleKey: 'nav.settings', center: Settings }
}

/** App root: shell + current section + toasts + close / quit / restart confirmation. */
export default function App() {
  const { t } = useTranslation()
  const page = useNavStore((s) => s.page)
  const settings = useSettingsStore((s) => s.settings)
  const load = useSettingsStore((s) => s.load)

  // Keep the Webcam Output window in sync with the controls and open documents.
  useOutputSync()
  // Navbar OBS pill: Offline / Running.
  useObsPolling()
  const obsStatus = useObsStore((s) => s.status)

  // Load saved settings once (theme, language and sidebar state survive a restart).
  useEffect(() => {
    void load()
  }, [load])

  // Apply theme and language as soon as they change.
  const theme = settings?.theme ?? 'dark'
  const language = settings?.language ?? 'en'
  const reduceEffects = settings?.reduceEffects ?? false
  useEffect(() => {
    const root = document.documentElement
    // `dark` class: Tailwind dark variant for screens not yet re-skinned.
    root.classList.toggle('dark', theme === 'dark')
    // Theme tokens + depth classes (src/styles/tokens.css).
    root.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    document.documentElement.dataset.reduceEffects = String(reduceEffects)
  }, [reduceEffects])
  useEffect(() => {
    void i18n.changeLanguage(language)
    document.documentElement.lang = language
  }, [language])

  const section = SECTIONS[page]
  const Center = section.center
  const Right = section.right

  return (
    <>
      <Shell
        title={t(section.titleKey)}
        obsPill={<ObsPill status={obsStatus} />}
        profile={<ProfileCard collapsed={settings?.sidebarCollapsed ?? false} />}
        center={<Center />}
        right={Right ? <Right /> : undefined}
      />
      <Toaster />
      <CloseConfirmDialog />
    </>
  )
}
