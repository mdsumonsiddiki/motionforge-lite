import { create } from 'zustand'
import type { ItemKind, ItemSummary } from '../../electron/shared/storage'
import { notify } from './toastStore'

/** Storage calls used by this store. In the app this is `window.api.storage` (IPC). */
export type LibraryBackend = {
  list: (kind: ItemKind) => Promise<ItemSummary[]>
  delete: (kind: ItemKind, id: string) => Promise<boolean>
}

let backendOverride: LibraryBackend | null = null

/** Test hook: replace the IPC backend with a fake. */
export function setLibraryBackend(backend: LibraryBackend | null): void {
  backendOverride = backend
}

function backend(): LibraryBackend {
  return backendOverride ?? window.api.storage
}

type LibraryState = {
  characters: ItemSummary[]
  documents: ItemSummary[]
  /** Reloads both name lists from disk. */
  refresh: () => Promise<void>
  /** Deletes one item (after the UI confirmed) and reloads its list. */
  remove: (kind: ItemKind, id: string) => Promise<void>
}

/** Saved Characters / Documents shown as a small name list on the Dashboard (spec section 6). */
export const useLibraryStore = create<LibraryState>((set) => ({
  characters: [],
  documents: [],

  refresh: async () => {
    try {
      const [characters, documents] = await Promise.all([
        backend().list('characters'),
        backend().list('documents')
      ])
      set({ characters, documents })
    } catch {
      notify.error('errors.storageLoad')
    }
  },

  remove: async (kind, id) => {
    try {
      await backend().delete(kind, id)
      set({ [kind]: await backend().list(kind) } as Pick<LibraryState, ItemKind>)
    } catch {
      notify.error('errors.storageDelete')
    }
  }
}))
