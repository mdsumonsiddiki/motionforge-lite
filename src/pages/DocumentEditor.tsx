import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DocControls } from '../components/document/DocControls'
import { DocPreview } from '../components/document/DocPreview'
import { OpenControls } from '../components/document/OpenControls'
import { SlotTabs } from '../components/document/SlotTabs'
import { addImageLayer } from '../editor/edits'
import { syncAssets } from '../editor/session'
import type { Rect } from '../editor/types'
import { slotLayers, useActiveSlot, useDocumentStore } from '../store/documentStore'
import { useDocUiStore } from '../store/docUiStore'
import { notify } from '../store/toastStore'
import { Muted, PanelTitle } from '../shell/ui'

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

/**
 * Document Editor center (spec section 8, UI_REDESIGN.md section 5): slot tabs and the
 * sunken canvas area with the existing editor preview. Controls are in DocumentPanel.
 */
export function DocumentEditor() {
  const { t } = useTranslation()
  const slot = useActiveSlot()
  const selectingArea = useDocUiStore((s) => s.selectingArea)
  const setSelectingArea = useDocUiStore((s) => s.setSelectingArea)

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

  // Leaving the editor ends an area selection.
  useEffect(() => () => setSelectingArea(false), [setSelectingArea])

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
      const layers = addImageLayer(slotLayers(current), rect, dataUrl)
      commitLayers(slot.key, layers)
      update(slot.key, { selectedLayerId: layers[layers.length - 1]?.id ?? null, selectedBoxId: null })
      syncAssets(slot.key)
    } catch {
      notify.error('errors.openFailed')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, minHeight: 0 }}>
      <SlotTabs />
      <div
        className="as-sink"
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 480,
          borderRadius: 26,
          background: 'var(--inset)'
        }}
      >
        {slot ? (
          <div style={{ position: 'absolute', inset: 24 }}>
            <DocPreview
              slot={slot}
              selectingArea={selectingArea}
              onAreaSelected={(rect) => void onAreaSelected(rect)}
            />
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 24,
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 600 }}>{t('doc.noDocument')}</span>
            <Muted style={{ fontSize: 13 }}>{t('doc.noDocumentHint')}</Muted>
          </div>
        )}
      </div>
    </div>
  )
}

/** Document Editor right panel: the editor controls, or the open controls when empty. */
export function DocumentPanel() {
  const { t } = useTranslation()
  const slot = useActiveSlot()
  if (slot) return <DocControls slot={slot} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PanelTitle>{t('doc.file')}</PanelTitle>
      <OpenControls />
    </div>
  )
}
