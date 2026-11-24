import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocControls } from '../components/document/DocControls'
import { DocPreview } from '../components/document/DocPreview'
import { OpenControls } from '../components/document/OpenControls'
import { SlotTabs } from '../components/document/SlotTabs'
import { addImageLayer } from '../editor/edits'
import { syncAssets } from '../editor/session'
import type { Rect } from '../editor/types'
import { isDirty, useActiveSlot, useDocumentStore } from '../store/documentStore'
import { useNavStore } from '../store/navStore'
import { notify } from '../store/toastStore'

/** Max size of a replacement picture (it is embedded in edits.json as base64). */
const MAX_REPLACE_IMAGE_BYTES = 8 * 1024 * 1024

/** Reads picked image bytes as a data: URL (stored inside edits.json). */
function toDataUrl(data: Uint8Array, type: 'png' | 'jpg'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(
      new Blob([data as Uint8Array<ArrayBuffer>], { type: type === 'png' ? 'image/png' : 'image/jpeg' })
    )
  })
}

/** Document Editor (spec section 8): up to 3 slots, OCR, text edit, image replace, undo/redo. */
export function DocumentEditor() {
  const { t } = useTranslation()
  const slot = useActiveSlot()
  const hasSlots = useDocumentStore((s) => s.slots.length > 0)
  const setLeaveGuard = useNavStore((s) => s.setLeaveGuard)
  const [selectingArea, setSelectingArea] = useState(false)

  // Warn before leaving this page with unsaved changes (spec section 5).
  useEffect(() => {
    setLeaveGuard(() => useDocumentStore.getState().slots.some(isDirty))
    return () => setLeaveGuard(null)
  }, [setLeaveGuard])

  // Ctrl+Z / Ctrl+Y (also Ctrl+Shift+Z). Text fields keep their own undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!e.ctrlKey) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const { activeKey, undo, redo } = useDocumentStore.getState()
      if (!activeKey) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo(activeKey)
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo(activeKey)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Keep render assets (inpaint patches, images) in sync after undo/redo or opening.
  useEffect(() => {
    if (slot) syncAssets(slot.key)
  }, [slot?.key, slot?.history.present]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Image Replace: after an area is selected, the user picks the new image. */
  const onAreaSelected = async (rect: Rect): Promise<void> => {
    setSelectingArea(false)
    if (!slot) return
    try {
      const picked = await window.api.document.pickImage(t('doc.pickReplaceTitle'))
      if (!picked) return
      // The picture is stored inside edits.json, so keep it reasonably small.
      if (picked.data.length > MAX_REPLACE_IMAGE_BYTES) {
        notify.error('errors.replaceTooLarge')
        return
      }
      const dataUrl = await toDataUrl(picked.data, picked.type)
      const { slots, commitLayers, update } = useDocumentStore.getState()
      const current = slots.find((s) => s.key === slot.key)
      if (!current) return
      const layers = addImageLayer(current.history.present, rect, dataUrl)
      commitLayers(slot.key, layers)
      update(slot.key, { selectedLayerId: layers[layers.length - 1]?.id ?? null, selectedBoxId: null })
      syncAssets(slot.key)
    } catch {
      notify.error('errors.openFailed')
    }
  }

  return (
    <div className="flex h-full flex-col">
      {hasSlots && <SlotTabs />}
      {slot ? (
        <div className="flex min-h-0 flex-1">
          <aside className="w-80 shrink-0 overflow-y-auto border-r border-neutral-200 dark:border-neutral-800">
            <DocControls
              slot={slot}
              selectingArea={selectingArea}
              onToggleSelectArea={() => setSelectingArea((v) => !v)}
            />
          </aside>
          <section className="min-w-0 flex-1 bg-neutral-100 p-4 dark:bg-neutral-950">
            <DocPreview
              slot={slot}
              selectingArea={selectingArea}
              onAreaSelected={(rect) => void onAreaSelected(rect)}
            />
          </section>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-80 space-y-4">
            <h1 className="text-xl font-semibold">{t('dashboard.document')}</h1>
            <OpenControls />
          </div>
        </div>
      )}
    </div>
  )
}
