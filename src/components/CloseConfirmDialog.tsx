import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { isDirty, useDocumentStore } from '../store/documentStore'
import { useExitStore } from '../store/exitStore'
import { useOutputStore } from '../store/outputStore'
import { exitText } from '../shell/exitText'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * App close / quit / restart confirmation (spec sections 5 and 6, UI_REDESIGN.md 4.2).
 * - Window ✕: main cancels the first close and sends "close requested".
 * - Power menu: Quit app / Restart app call `useExitStore.request`.
 * The dialog runs the existing unsaved-changes check (open documents) and warns when
 * the Output window is open. On confirm it tells main to close or restart for real.
 */
export function CloseConfirmDialog() {
  const { t } = useTranslation()
  const pending = useExitStore((s) => s.pending)
  const request = useExitStore((s) => s.request)
  const cancel = useExitStore((s) => s.cancel)
  const unsaved = useDocumentStore((s) => s.slots.some(isDirty))
  const outputOpen = useOutputStore((s) => s.windowOpen)

  useEffect(() => window.api.app.onCloseRequested(() => request('close')), [request])

  if (!pending) return null
  const text = exitText(pending, unsaved, outputOpen)
  const message = text.outputWarningKey
    ? `${t(text.messageKey)} ${t(text.outputWarningKey)}`
    : t(text.messageKey)

  return (
    <ConfirmDialog
      open
      title={t(text.titleKey)}
      message={message}
      confirmLabel={t(text.confirmKey)}
      cancelLabel={t('close.cancel')}
      onConfirm={() => {
        cancel()
        if (pending === 'restart') window.api.app.restart()
        else window.api.app.confirmClose()
      }}
      onCancel={cancel}
    />
  )
}
