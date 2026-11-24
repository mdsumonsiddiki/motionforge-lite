import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ExportFormat } from '../../../electron/shared/document'
import { useDocumentStore, type Slot } from '../../store/documentStore'
import { useLibraryStore } from '../../store/libraryStore'
import { notify } from '../../store/toastStore'
import { canRedo, canUndo } from '../../editor/history'
import { applyTextEdit, removeLayer, textForBox } from '../../editor/edits'
import { estimateFontSize, estimateTextColor } from '../../editor/textStyle'
import { loadFontList } from '../../editor/fonts'
import { BUNDLED_FONTS, type OcrBox } from '../../editor/types'
import {
  boxPixels,
  closeSlot,
  exportSlot,
  isInpainting,
  runOcr,
  saveSlot,
  syncAssets
} from '../../editor/session'
import { ConfirmDialog } from '../ConfirmDialog'
import { OpenControls } from './OpenControls'

const btn =
  'rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-b border-neutral-200 pb-4 dark:border-neutral-800">
      <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
        {title}
      </h2>
      {children}
    </section>
  )
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
  const commitLayers = useDocumentStore((s) => s.commitLayers)
  const [draft, setDraft] = useState(() => textForBox(slot.history.present, box))

  /** Apply: inpaint the old text away and draw the new text (spec section 8, step 4). */
  const apply = (): void => {
    const style = {
      fontFamily: font,
      fontSize: estimateFontSize(box.rect.h),
      color: estimateTextColor(boxPixels(slot.key, box.rect))
    }
    commitLayers(slot.key, applyTextEdit(slot.history.present, box, draft, style))
    syncAssets(slot.key)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        {t('doc.ocrText')}: <span className="text-neutral-700 dark:text-neutral-300">{box.text}</span>
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        aria-label={t('doc.newText')}
        className="w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
        style={{ fontFamily: `"${font}"` }}
      />
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-neutral-500">{t('doc.font')}</span>
        <select
          value={font}
          onChange={(e) => onFontChange(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {fonts.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-neutral-500">{t('doc.autoStyle')}</p>
      <button
        type="button"
        disabled={!draft.trim()}
        onClick={apply}
        className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {t('doc.apply')}
      </button>
      {inpainting && <p className="text-xs text-neutral-500">{t('doc.removingOld')}</p>}
    </div>
  )
}

/** Left side of the Document Editor (spec section 6: controls left, preview right). */
export function DocControls({
  slot,
  selectingArea,
  onToggleSelectArea
}: {
  slot: Slot
  selectingArea: boolean
  onToggleSelectArea: () => void
}) {
  const { t } = useTranslation()
  const update = useDocumentStore((s) => s.update)
  const commitLayers = useDocumentStore((s) => s.commitLayers)
  const undo = useDocumentStore((s) => s.undo)
  const redo = useDocumentStore((s) => s.redo)
  const refreshLibrary = useLibraryStore((s) => s.refresh)

  const [fonts, setFonts] = useState<string[]>([...BUNDLED_FONTS])
  const [font, setFont] = useState<string>(BUNDLED_FONTS[0] ?? 'Noto Sans Bengali')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    void loadFontList().then(setFonts)
  }, [])

  const layers = slot.history.present
  const box = slot.ocr.find((b) => b.id === slot.selectedBoxId) ?? null
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

  const doExport = (format: ExportFormat) =>
    withBusy(async () => {
      const file = await exportSlot(slot.key, format)
      if (file) setStatus(t('doc.exported', { file }))
    }, 'errors.exportFailed')

  const remove = () =>
    withBusy(async () => {
      if (slot.docId) await window.api.storage.delete('documents', slot.docId)
      closeSlot(slot.key)
      await refreshLibrary()
    }, 'errors.storageDelete')

  const inpainting = isInpainting(slot.key)

  return (
    <div className="space-y-4 p-4">
      <Section title={t('doc.file')}>
        <OpenControls />
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-neutral-500">{t('doc.name')}</span>
          <input
            type="text"
            value={slot.name}
            maxLength={100}
            onChange={(e) => update(slot.key, { name: e.target.value })}
            className="w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 dark:border-neutral-700"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void save()} className={btn}>
            {t('doc.save')}
          </button>
          <button type="button" disabled={busy} onClick={() => void doExport('png')} className={btn}>
            {t('doc.exportPng')}
          </button>
          <button type="button" disabled={busy} onClick={() => void doExport('jpg')} className={btn}>
            {t('doc.exportJpg')}
          </button>
          {slot.docId && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              className={`${btn} text-red-600 dark:text-red-400`}
            >
              {t('library.delete')}
            </button>
          )}
        </div>
        {status && (
          <p role="status" className="text-xs break-all text-emerald-600 dark:text-emerald-400">
            {status}
          </p>
        )}
      </Section>

      <Section title={t('doc.ocr')}>
        {slot.ocrStatus === 'running' && (
          <div>
            <div className="mb-1 text-xs text-neutral-500">
              {t('doc.ocrRunning', { percent: Math.round(slot.ocrProgress * 100) })}
            </div>
            <div className="h-1.5 rounded bg-neutral-200 dark:bg-neutral-800">
              <div
                className="h-1.5 rounded bg-indigo-500 transition-all"
                style={{ width: `${Math.round(slot.ocrProgress * 100)}%` }}
              />
            </div>
          </div>
        )}
        {slot.ocrStatus === 'done' && (
          <p className="text-xs text-neutral-500">{t('doc.ocrDone', { count: slot.ocr.length })}</p>
        )}
        {slot.ocrStatus === 'error' && (
          <div className="space-y-2">
            <p className="text-xs text-red-600 dark:text-red-400">{t('errors.ocrFailed')}</p>
            <button type="button" onClick={() => void runOcr(slot.key)} className={btn}>
              {t('doc.retry')}
            </button>
          </div>
        )}
      </Section>

      <Section title={t('doc.editText')}>
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
          <p className="text-xs text-neutral-500">{t('doc.selectBoxHint')}</p>
        )}
      </Section>

      <Section title={t('doc.imageReplace')}>
        <button
          type="button"
          onClick={onToggleSelectArea}
          aria-pressed={selectingArea}
          className={`${btn} w-full ${selectingArea ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' : ''}`}
        >
          {selectingArea ? t('doc.cancelSelect') : t('doc.selectArea')}
        </button>
        <p className="text-xs text-neutral-500">{t('doc.imageReplaceHint')}</p>
        {selectedImage && (
          <button
            type="button"
            onClick={() => {
              commitLayers(slot.key, removeLayer(layers, selectedImage.id))
              update(slot.key, { selectedLayerId: null })
            }}
            className={`${btn} w-full text-red-600 dark:text-red-400`}
          >
            {t('doc.removeImage')}
          </button>
        )}
      </Section>

      <Section title={t('doc.history')}>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canUndo(slot.history)}
            onClick={() => undo(slot.key)}
            title="Ctrl+Z"
            className={btn}
          >
            {t('doc.undo')}
          </button>
          <button
            type="button"
            disabled={!canRedo(slot.history)}
            onClick={() => redo(slot.key)}
            title="Ctrl+Y"
            className={btn}
          >
            {t('doc.redo')}
          </button>
        </div>
      </Section>

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
