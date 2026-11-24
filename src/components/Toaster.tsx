import { useTranslation } from 'react-i18next'
import { useToastStore } from '../store/toastStore'

/** Renders the toast stack (bottom-right). Only "success" and "error" kinds exist. */
export function Toaster() {
  const { t } = useTranslation()
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.kind === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          <span>{t(toast.messageKey)}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label={t('toast.dismiss')}
            className="opacity-80 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
