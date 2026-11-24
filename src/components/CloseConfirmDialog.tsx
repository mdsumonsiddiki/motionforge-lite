import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isDirty, useDocumentStore } from '../store/documentStore'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * App close confirmation (spec sections 5 and 6).
 * Main process cancels the first close and sends "close requested";
 * this dialog asks the user, and on confirm tells main to really close.
 * When open documents have unsaved changes, the dialog says so (the only other
 * unsaved warning is when a document tab is closed; changing pages never warns).
 */
export function CloseConfirmDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [unsaved, setUnsaved] = useState(false)
  const cancel = useCallback(() => setOpen(false), [])

  useEffect(
    () =>
      window.api.app.onCloseRequested(() => {
        setUnsaved(useDocumentStore.getState().slots.some(isDirty))
        setOpen(true)
      }),
    []
  )

  return (
    <ConfirmDialog
      open={open}
      title={unsaved ? t('doc.unsavedTitle') : t('close.title')}
      message={unsaved ? t('close.unsavedMessage') : t('close.message')}
      confirmLabel={unsaved ? t('close.closeWithoutSaving') : t('close.confirm')}
      cancelLabel={t('close.cancel')}
      onConfirm={() => window.api.app.confirmClose()}
      onCancel={cancel}
    />
  )
}
