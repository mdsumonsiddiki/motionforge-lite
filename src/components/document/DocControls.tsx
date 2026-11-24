import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ExportFormat } from '../../../electron/shared/document'
import { slotBoxes, slotLayers, useDocumentStore, type Slot } from '../../store/documentStore'
import { useDocUiStore } from '../../store/docUiStore'
import { useLibraryStore } from '../../store/libraryStore'
import { notify } from '../../store/toastStore'
import { canRedo, canUndo } from '../../editor/history'
import { applyTextEdit, removeLayer, textForBox } from '../../editor/edits'
import { isUncertain, looksUnreliable } from '../../editor/ocrBoxes'
import { loadFontList } from '../../editor/fonts'
import { BUNDLED_FONTS, type OcrBox } from '../../editor/types'
import {
  closeSlot,
  exportSlot,
  isInpainting,
  matchStyle,
  runOcr,
  saveSlot,
  syncAssets
} from '../../editor/session'
import { Btn, Muted, PanelTitle } from '../../shell/ui'
import { fieldStyle } from '../../shell/styles'
import { ConfirmDialog } from '../ConfirmDialog'

/** Warning text (uncertain OCR): amber that passes 4.5:1 in both themes. */
const WARN = { color: 'var(--warn)' } as const

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 12,
  color: 'var(--muted)'
}

/** Text edit form for one OCR box: new text + font, then Apply. */
function TextEditor({
  slot,
  box,
  fonts,
  font,
  onFontChange,
  inpainting
}: {
  slot: Slot
  box: OcrBox
  fonts: string[]
  font: string
  onFontChange: (font: string) => void
  inpainting: boolean
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => textForBox(slotLayers(slot), box))
  const [applying, setApplying] = useState(false)

  /**
   * Apply: remove the old letters and draw the new text (spec section 8, step 4).
   * Size, position and color are matched to the old letters first (needs the font loaded).
   */
  const apply = async (): Promise<void> => {
    setApplying(true)
    try {
      const style = await matchStyle(slot.key, box, font)
      // Read the latest state: the history may have changed while the font was loading.
      const { slots, commitLayers } = useDocumentStore.getState()
      const current = slots.find((s) => s.key === slot.key)
      if (!current) return
      commitLayers(slot.key, applyTextEdit(slotLayers(current), box, draft, style))
      syncAssets(slot.key)
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      {isUncertain(box) && <Muted style={WARN}>{t('doc.uncertainHint')}</Muted>}
      <Muted>{t('doc.adjustBoxHint')}</Muted>
      <label style={labelStyle}>
        <span style={{ overflowWrap: 'anywhere' }}>
          {t('doc.ocrText')}: <span style={{ color: 'var(--text)' }}>{box.text}</span>
        </span>
        <textarea
          className="as-in as-sink"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          aria-label={t('doc.newText')}
          style={{
            ...fieldStyle,
            minHeight: undefined,
            padding: '12px 14px',
            resize: 'vertical',
            fontFamily: `"${font}"`
          }}
        />
      </label>
      <label style={labelStyle}>
        {t('doc.font')}
        <select
          className="as-in as-sink"
          value={font}
          onChange={(e) => onFontChange(e.target.value)}
          style={{ ...fieldStyle, padding: '0 12px' }}
        >
          {fonts.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <Muted>{t('doc.autoStyle')}</Muted>
      <Btn
        tone="accent"
        disabled={!draft.trim() || applying}
        onClick={() => void apply()}
        style={{ minHeight: 48, fontSize: 14 }}
      >
        {t('doc.apply')}
      </Btn>
      {inpainting && <Muted>{t('doc.removingOld')}</Muted>}
    </>
  )
}

/** OCR status line(s): progress, "n lines found · m uncertain", error + retry. */
function OcrStatus({ slot }: { slot: Slot }) {
  const { t } = useTranslation()
  if (slot.ocrStatus === 'running') {
    const percent = Math.round(slot.ocrProgress * 100)
    return (
      <>
        <Muted>{t('doc.ocrRunning', { percent })}</Muted>
        <div
          className="as-sink"
          role="progressbar"
          aria-label={t('doc.ocr')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          style={{ height: 10, borderRadius: 999, background: 'var(--inset)', overflow: 'hidden' }}
        >
          <div style={{ height: '100%', width: `${percent}%`, background: 'var(--accent)', borderRadius: 999 }} />
        </div>
      </>
    )
  }
  if (slot.ocrStatus === 'error') {
    return (
      <>
        <Muted style={{ color: 'var(--danger-text)' }}>{t('errors.ocrFailed')}</Muted>
        <Btn onClick={() => void runOcr(slot.key)}>{t('doc.retry')}</Btn>
      </>
    )
  }
  const uncertain = slot.ocr.filter(isUncertain).length
  return (
    <>
      <Muted>{t('doc.linesFound', { count: slot.ocr.length, uncertain })}</Muted>
      {looksUnreliable(slot.ocr) && (
        <Muted style={WARN}>
          <span role="status">{t('doc.unreliableOcr')}</span>
        </Muted>
      )}
    </>
  )
}

/**
 * Document Editor right panel (UI_REDESIGN.md section 5): Edit Text, Replace Image,
 * Undo · Redo · Export, then the document's name / Save / Delete. Logic unchanged.
 */
export function DocControls({ slot }: { slot: Slot }) {
  const { t } = useTranslation()
  const update = useDocumentStore((s) => s.update)
  const commitLayers = useDocumentStore((s) => s.commitLayers)
  const undo = useDocumentStore((s) => s.undo)
  const redo = useDocumentStore((s) => s.redo)
  const refreshLibrary = useLibraryStore((s) => s.refresh)
  const selectingArea = useDocUiStore((s) => s.selectingArea)
  const toggleSelectingArea = useDocUiStore((s) => s.toggleSelectingArea)

  const [fonts, setFonts] = useState<string[]>([...BUNDLED_FONTS])
  const [font, setFont] = useState<string>(BUNDLED_FONTS[0] ?? 'Noto Sans Bengali')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    void loadFontList().then(setFonts)
  }, [])

  const layers = slotLayers(slot)
  const box = slotBoxes(slot).find((b) => b.id === slot.selectedBoxId) ?? null
  const selectedImage = layers.find((l) => l.id === slot.selectedLayerId && l.kind === 'image')

  const withBusy = async (fn: () => Promise<void>, errorKey: string): Promise<void> => {
    setBusy(true)
    setStatus(null)
    try {
      await fn()
    } catch {
      notify.error(errorKey)
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    withBusy(async () => {
      if (!slot.name.trim()) throw new Error('name')
      await saveSlot(slot.key)
      await refreshLibrary()
      setStatus(t('doc.saved'))
    }, 'errors.docSaveFailed')

  const doExport = (format: ExportFormat) => {
    setExportOpen(false)
    return withBusy(async () => {
      const file = await exportSlot(slot.key, format)
      if (file) setStatus(t('doc.exported', { file }))
    }, 'errors.exportFailed')
  }

  const remove = () =>
    withBusy(async () => {
      if (slot.docId) await window.api.storage.delete('documents', slot.docId)
      closeSlot(slot.key)
      await refreshLibrary()
    }, 'errors.storageDelete')

  const inpainting = isInpainting(slot.key)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PanelTitle>{t('doc.editText')}</PanelTitle>
      <OcrStatus slot={slot} />
      {box ? (
        <TextEditor
          // Re-mount per box, so the text field starts with that box's current text.
          key={`${slot.key}:${box.id}`}
          slot={slot}
          box={box}
          fonts={fonts}
          font={font}
          onFontChange={setFont}
          inpainting={inpainting}
        />
      ) : (
        slot.ocrStatus === 'done' && <Muted>{t('doc.selectBoxHint')}</Muted>
      )}

      <PanelTitle sub>{t('doc.imageReplace')}</PanelTitle>
      <Btn
        on={selectingArea}
        aria-pressed={selectingArea}
        onClick={toggleSelectingArea}
        style={selectingArea ? { color: 'var(--accent-text)', fontWeight: 600 } : undefined}
      >
        {selectingArea ? t('doc.cancelSelect') : t('doc.selectArea')}
      </Btn>
      <Muted>{t('doc.imageReplaceHint')}</Muted>
      {selectedImage && (
        <Btn
          onClick={() => {
            commitLayers(slot.key, removeLayer(layers, selectedImage.id))
            update(slot.key, { selectedLayerId: null })
          }}
          style={{ color: 'var(--danger-text)' }}
        >
          {t('doc.removeImage')}
        </Btn>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <Btn disabled={!canUndo(slot.history)} onClick={() => undo(slot.key)} title="Ctrl+Z" style={{ flex: 1 }}>
          {t('doc.undo')}
        </Btn>
        <Btn disabled={!canRedo(slot.history)} onClick={() => redo(slot.key)} title="Ctrl+Y" style={{ flex: 1 }}>
          {t('doc.redo')}
        </Btn>
        <Btn
          on={exportOpen}
          disabled={busy}
          aria-expanded={exportOpen}
          onClick={() => setExportOpen(!exportOpen)}
          style={{ flex: 1 }}
        >
          {t('doc.export')}
        </Btn>
      </div>
      {exportOpen && (
        <div style={{ display: 'flex', gap: 12 }}>
          <Btn tone="solid" onClick={() => void doExport('png')} style={{ flex: 1 }}>
            {t('doc.exportPng')}
          </Btn>
          <Btn tone="solid" onClick={() => void doExport('jpg')} style={{ flex: 1 }}>
            {t('doc.exportJpg')}
          </Btn>
        </div>
      )}

      <PanelTitle sub>{t('doc.file')}</PanelTitle>
      <label style={labelStyle}>
        {t('doc.name')}
        <input
          className="as-in as-sink"
          type="text"
          value={slot.name}
          maxLength={100}
          onChange={(e) => update(slot.key, { name: e.target.value })}
          style={fieldStyle}
        />
      </label>
      <div style={{ display: 'flex', gap: 12 }}>
        <Btn tone="accent" disabled={busy} onClick={() => void save()} style={{ flex: 1 }}>
          {t('doc.save')}
        </Btn>
        {slot.docId && (
          <Btn disabled={busy} onClick={() => setConfirmDelete(true)} style={{ flex: 1, color: 'var(--danger-text)' }}>
            {t('library.delete')}
          </Btn>
        )}
      </div>
      {status && (
        <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--muted)', overflowWrap: 'anywhere' }}>
          {status}
        </p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t('library.deleteTitle')}
        message={t('library.deleteMessage', { name: slot.name })}
        confirmLabel={t('library.delete')}
        cancelLabel={t('close.cancel')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          void remove()
        }}
      />
    </div>
  )
}
