import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OpenResult } from '../../store/documentStore'
import { useLibraryStore } from '../../store/libraryStore'
import { notify } from '../../store/toastStore'
import { openImage, openSaved } from '../../editor/session'

/** Maps an IPC error from main to a translated message key. */
function openErrorKey(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('IMAGE_TOO_LARGE')) return 'errors.imageTooLarge'
  if (msg.includes('NOT_AN_IMAGE')) return 'errors.notAnImage'
  return 'errors.openFailed'
}

function handleResult(result: OpenResult): void {
  if (result.status === 'full') notify.error('errors.slotsFull')
}

/** "Open image" and "Open saved document" controls. */
export function OpenControls() {
  const { t } = useTranslation()
  const documents = useLibraryStore((s) => s.documents)
  const refresh = useLibraryStore((s) => s.refresh)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      notify.error(openErrorKey(err))
    } finally {
      setBusy(false)
    }
  }

  const pick = () =>
    run(async () => {
      const picked = await window.api.document.pickImage(t('doc.pickImageTitle'))
      if (picked) handleResult(await openImage(picked))
    })

  const openStored = () =>
    run(async () => {
      if (!selected) return
      handleResult(await openSaved(await window.api.document.load(selected)))
    })

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void pick()}
        className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {t('doc.openImage')}
      </button>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('doc.openImageHint')}</p>
      {documents.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label={t('doc.savedDocuments')}
            className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">{t('doc.chooseSaved')}</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !selected}
            onClick={() => void openStored()}
            className="rounded-md border border-neutral-300 px-3 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {t('doc.open')}
          </button>
        </div>
      )}
    </div>
  )
}
