import { useTranslation } from 'react-i18next'
import { useNavStore } from '../store/navStore'
import { Logo } from './Logo'

/** Top bar: logo (click → Dashboard), Back button on inner pages, Settings icon. */
export function AppHeader() {
  const { t } = useTranslation()
  const page = useNavStore((s) => s.page)
  const navigate = useNavStore((s) => s.navigate)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('dashboard')} className="rounded">
          <Logo />
        </button>
        {page !== 'dashboard' && (
          <button
            type="button"
            onClick={() => navigate('dashboard')}
            className="rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            ← {t('nav.back')}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => navigate('settings')}
        title={t('nav.settings')}
        aria-label={t('nav.settings')}
        className={`rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
          page === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : ''
        }`}
      >
        {/* Gear icon */}
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </header>
  )
}
