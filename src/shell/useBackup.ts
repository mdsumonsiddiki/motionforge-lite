import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { notify } from '../store/toastStore'

/**
 * "Back up now" (Settings, profile popover, Home card): asks for a folder and writes
 * the backup zip. The result is a status line (spec section 6 allows only
 * "Generation Complete" and "Error" notifications); failures show an error toast.
 */
export function useBackup() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const backup = async (): Promise<void> => {
    setBusy(true)
    setStatus(null)
    try {
      const result = await window.api.backup.create(t('backup.pickFolder'))
      if (result.status === 'done') setStatus(t('backup.saved', { file: result.file }))
    } catch {
      notify.error('errors.backupFailed')
    } finally {
      setBusy(false)
    }
  }

  return { busy, status, setStatus, backup }
}
