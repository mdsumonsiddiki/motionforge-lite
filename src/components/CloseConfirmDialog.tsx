import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * App close confirmation (spec section 6).
 * Main process cancels the first close and sends "close requested";
 * this dialog asks the user, and on confirm tells main to really close.
 */
export function CloseConfirmDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const cancel = useCallback(() => setOpen(false), [])

  useEffect(() => window.api.app.onCloseRequested(() => setOpen(true)), [])

  return (
    <ConfirmDialog
      open={open}
      title={t('close.title')}
      message={t('close.message')}
      confirmLabel={t('close.confirm')}
      cancelLabel={t('close.cancel')}
      onConfirm={() => window.api.app.confirmClose()}
      onCancel={cancel}
    />
  )
}
