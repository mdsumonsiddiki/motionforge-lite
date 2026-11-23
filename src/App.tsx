import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from './store/themeStore'

/**
 * Phase 0: an empty shell window. Dashboard and routing come in Phase 2.
 */
export default function App() {
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)

  // Keep the <html> class in sync with the theme store.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <main className="flex h-full items-center justify-center bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <h1 className="text-xl font-semibold">{t('app.name')}</h1>
    </main>
  )
}
