import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SavedList } from '../components/SavedList'
import { useLibraryStore } from '../store/libraryStore'
import { useNavStore, type Page } from '../store/navStore'

type Tile = { page: Page; titleKey: string; descKey: string; icon: string }

/** The three big entry buttons (spec section 6). Settings is in the header. */
const TILES: Tile[] = [
  { page: 'human', titleKey: 'dashboard.human', descKey: 'dashboard.humanDesc', icon: '🧑' },
  {
    page: 'document',
    titleKey: 'dashboard.document',
    descKey: 'dashboard.documentDesc',
    icon: '📄'
  },
  { page: 'output', titleKey: 'dashboard.output', descKey: 'dashboard.outputDesc', icon: '🎥' }
]

export function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavStore((s) => s.navigate)
  const characters = useLibraryStore((s) => s.characters)
  const documents = useLibraryStore((s) => s.documents)
  const refresh = useLibraryStore((s) => s.refresh)

  // Reload the name lists whenever the Dashboard is shown.
  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 p-8">
      <div className="grid w-full max-w-4xl grid-cols-3 gap-6">
        {TILES.map((tile) => (
          <button
            key={tile.page}
            type="button"
            onClick={() => navigate(tile.page)}
            className="flex h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center transition hover:border-indigo-500 hover:bg-indigo-50 dark:border-neutral-800 dark:bg-neutral-800/50 dark:hover:border-indigo-400 dark:hover:bg-neutral-800"
          >
            <span className="text-5xl" aria-hidden="true">
              {tile.icon}
            </span>
            <span className="text-xl font-semibold">{t(tile.titleKey)}</span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{t(tile.descKey)}</span>
          </button>
        ))}
      </div>
      <div className="grid w-full max-w-4xl grid-cols-2 gap-6">
        <SavedList kind="characters" items={characters} />
        <SavedList kind="documents" items={documents} />
      </div>
    </div>
  )
}
