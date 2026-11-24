import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * App close confirmation (spec section 6).
 * Main process cancels the first close and sends "close requested";
 * this dialog asks the user, and on confirm tells main to really close.
 */
export function CloseConfirmDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => window.api.app.onCloseRequested(() => setOpen(true)), [])

  // Escape = cancel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="close-title"
        className="w-96 rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-800"
      >
        <h2 id="close-title" className="text-lg font-semibold">
          {t('close.title')}
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{t('close.message')}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => setOpen(false)}
            className="rounded-md px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            {t('close.cancel')}
          </button>
          <button
            type="button"
            onClick={() => window.api.app.confirmClose()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            {t('close.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
