import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ItemKind, ItemSummary } from '../../electron/shared/storage'
import { setLibraryBackend, useLibraryStore } from './libraryStore'
import { useToastStore } from './toastStore'

describe('libraryStore', () => {
  let db: Record<ItemKind, ItemSummary[]>
  let fail: boolean

  beforeEach(() => {
    db = {
      characters: [{ id: 'c1', name: 'Rahim' }],
      documents: [
        { id: 'd2', name: 'New' },
        { id: 'd1', name: 'Old' }
      ]
    }
    fail = false
    useLibraryStore.setState({ characters: [], documents: [] })
    useToastStore.setState({ toasts: [] })
    setLibraryBackend({
      list: async (kind) => {
        if (fail) throw new Error('io')
        return [...db[kind]]
      },
      delete: async (kind, id) => {
        db[kind] = db[kind].filter((i) => i.id !== id)
        return true
      }
    })
  })
  afterEach(() => setLibraryBackend(null))

  it('loads both lists', async () => {
    await useLibraryStore.getState().refresh()
    expect(useLibraryStore.getState().characters).toEqual([{ id: 'c1', name: 'Rahim' }])
    expect(useLibraryStore.getState().documents.map((d) => d.name)).toEqual(['New', 'Old'])
  })

  it('removes an item and reloads only that list', async () => {
    await useLibraryStore.getState().refresh()
    await useLibraryStore.getState().remove('documents', 'd2')
    expect(useLibraryStore.getState().documents).toEqual([{ id: 'd1', name: 'Old' }])
    expect(useLibraryStore.getState().characters).toHaveLength(1)
  })

  it('shows an error toast when loading fails', async () => {
    fail = true
    await useLibraryStore.getState().refresh()
    expect(useToastStore.getState().toasts[0]?.messageKey).toBe('errors.storageLoad')
  })
})
