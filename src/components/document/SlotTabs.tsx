import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isDirty, useDocumentStore, type Slot } from '../../store/documentStore'
import { closeSlot } from '../../editor/session'
import { MAX_SLOTS } from '../../editor/types'
import { ConfirmDialog } from '../ConfirmDialog'

/** Tabs for the open documents (max 3). Closing a tab with unsaved changes asks first. */
export function SlotTabs() {
  const { t } = useTranslation()
  const slots = useDocumentStore((s) => s.slots)
  const activeKey = useDocumentStore((s) => s.activeKey)
  const setActive = useDocumentStore((s) => s.setActive)
  const [closing, setClosing] = useState<Slot | null>(null)

  const requestClose = (slot: Slot): void => {
    if (isDirty(slot)) setClosing(slot)
    else closeSlot(slot.key)
  }

  return (
    <div className="flex h-10 shrink-0 items-end gap-1 border-b border-neutral-200 px-2 dark:border-neutral-800">
      {slots.map((slot) => (
        <div
          key={slot.key}
          className={`flex max-w-56 items-center gap-1 rounded-t-md border border-b-0 px-3 py-1.5 text-sm ${
            slot.key === activeKey
              ? 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
              : 'border-transparent text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <button type="button" onClick={() => setActive(slot.key)} className="truncate">
            {isDirty(slot) ? '● ' : ''}
            {slot.name}
          </button>
          <button
            type="button"
            onClick={() => requestClose(slot)}
            aria-label={t('doc.closeSlot')}
            title={t('doc.closeSlot')}
            className="rounded px-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700"
          >
            ✕
          </button>
        </div>
      ))}
      <span className="ml-auto pb-2 text-xs text-neutral-400">
        {t('doc.slotCount', { count: slots.length, max: MAX_SLOTS })}
      </span>

      <ConfirmDialog
        open={closing !== null}
        title={t('doc.unsavedTitle')}
        message={t('doc.closeUnsavedMessage', { name: closing?.name ?? '' })}
        confirmLabel={t('doc.closeAnyway')}
        cancelLabel={t('close.cancel')}
        onCancel={() => setClosing(null)}
        onConfirm={() => {
          if (closing) closeSlot(closing.key)
          setClosing(null)
        }}
      />
    </div>
  )
}
