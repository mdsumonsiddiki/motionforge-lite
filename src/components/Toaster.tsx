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
          className="pointer-events-auto flex items-start justify-between gap-3 px-4 py-3 text-sm"
          style={{
            borderRadius: 16,
            color: '#ffffff',
            background: toast.kind === 'error' ? 'var(--toast-error)' : 'var(--toast-ok)',
            boxShadow: 'var(--shell-shadow)'
          }}
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
