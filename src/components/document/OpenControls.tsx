import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLibraryStore } from '../../store/libraryStore'
import { notify } from '../../store/toastStore'
import { openImage, openSaved } from '../../editor/session'
import { Btn, Muted } from '../../shell/ui'
import { fieldStyle } from '../../shell/styles'
import { handleOpenResult as handleResult, openErrorKey } from './openErrors'

/** "Open image" and "Open saved document" controls. `onOpened` runs after a successful open. */
export function OpenControls({ onOpened }: { onOpened?: () => void }) {
  const { t } = useTranslation()
  const documents = useLibraryStore((s) => s.documents)
  const refresh = useLibraryStore((s) => s.refresh)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = async (fn: () => Promise<boolean>): Promise<void> => {
    setBusy(true)
    try {
      if (await fn()) onOpened?.()
    } catch (err) {
      notify.error(openErrorKey(err))
    } finally {
      setBusy(false)
    }
  }

  const pick = () =>
    run(async () => {
      const picked = await window.api.document.pickImage(t('doc.pickImageTitle'))
      if (!picked) return false
      const result = await openImage(picked)
      handleResult(result)
      return result.status !== 'full'
    })

  const openStored = () =>
    run(async () => {
      if (!selected) return false
      const result = await openSaved(await window.api.document.load(selected))
      handleResult(result)
      return result.status !== 'full'
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Btn tone="accent" disabled={busy} onClick={() => void pick()}>
        {t('doc.openImage')}
      </Btn>
      <Muted>{t('doc.openImageHint')}</Muted>
      {documents.length > 0 && (
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            className="as-in as-sink"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label={t('doc.savedDocuments')}
            style={{ ...fieldStyle, flex: 1, minWidth: 0, padding: '0 12px' }}
          >
            <option value="">{t('doc.chooseSaved')}</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Btn disabled={busy || !selected} onClick={() => void openStored()} style={{ padding: '0 16px' }}>
            {t('doc.open')}
          </Btn>
        </div>
      )}
    </div>
  )
}
