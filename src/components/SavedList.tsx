import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ItemKind, ItemSummary } from '../../electron/shared/storage'
import { useDocumentStore } from '../store/documentStore'
import { useLibraryStore } from '../store/libraryStore'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * Small name list of saved items (spec section 6: no big preview cards).
 * Each row has a Delete button that asks for confirmation first.
 */
export function SavedList({ kind, items }: { kind: ItemKind; items: ItemSummary[] }) {
  const { t } = useTranslation()
  const remove = useLibraryStore((s) => s.remove)
  const [pending, setPending] = useState<ItemSummary | null>(null)

  return (
    <div>
      <h2 className="mb-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
        {t(kind === 'characters' ? 'library.characters' : 'library.documents')}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-400 dark:text-neutral-500">{t('library.empty')}</p>
      ) : (
        <ul className="max-h-40 divide-y divide-neutral-200 overflow-auto rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
              <span className="truncate">{item.name}</span>
              <button
                type="button"
                onClick={() => setPending(item)}
                className="shrink-0 rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                {t('library.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={t('library.deleteTitle')}
        message={t('library.deleteMessage', { name: pending?.name ?? '' })}
        confirmLabel={t('library.delete')}
        cancelLabel={t('close.cancel')}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) {
            void remove(kind, pending.id)
            // A deleted document that is still open becomes a new, unsaved document.
            const open = useDocumentStore.getState().slots.find((s) => s.docId === pending.id)
            if (kind === 'documents' && open) {
              useDocumentStore
                .getState()
                .update(open.key, { docId: null, savedEdits: null, savedName: null })
            }
          }
          setPending(null)
        }}
      />
    </div>
  )
}
