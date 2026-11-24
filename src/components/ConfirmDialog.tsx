import { useEffect } from 'react'
import { Btn } from '../shell/ui'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reusable modal confirmation (App close, Delete, Restore).
 * The confirm button is styled as destructive; Escape or Cancel closes it.
 * Look: UI_REDESIGN.md tokens (raised solid panel, 3D buttons).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)'
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="as-raise"
        style={{
          width: 384,
          borderRadius: 24,
          background: 'var(--panel-solid)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          padding: 24
        }}
      >
        <h2 id="confirm-title" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          {title}
        </h2>
        <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--muted)', overflowWrap: 'anywhere' }}>
          {message}
        </p>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Btn tone="solid" autoFocus onClick={onCancel} style={{ minHeight: 42, padding: '0 16px', borderRadius: 12 }}>
            {cancelLabel}
          </Btn>
          <Btn tone="danger" onClick={onConfirm} style={{ minHeight: 42, padding: '0 16px', borderRadius: 12 }}>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  )
}
