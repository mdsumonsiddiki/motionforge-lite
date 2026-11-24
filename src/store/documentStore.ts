import { create } from 'zustand'
import type { ImageType } from '../../electron/shared/document'
import type { DocumentMeta } from '../../electron/shared/storage'
import { createHistory, pushHistory, redo, undo, type History } from '../editor/history'
import { MAX_SLOTS, type Layer, type OcrBox, type Rect } from '../editor/types'

/**
 * Open documents (spec section 8: max 3 slots). Slots stay open when the user switches
 * pages, so Webcam Output (Phase 5) can show them.
 * Only plain data lives here; decoded images and inpaint patches are kept in editor/session.ts.
 */

export type OcrStatus = 'running' | 'done' | 'error'

/**
 * One undoable state of a document: the layers plus the user's box adjustments
 * (moved / resized OCR boxes, keyed by box id). Both go through Undo / Redo together.
 */
export type EditState = { layers: Layer[]; boxRects: Readonly<Record<string, Rect>> }

export type Slot = {
  /** Local key of the slot (not the stored document id). */
  key: string
  /** Stored document id; null until first saved. */
  docId: string | null
  name: string
  original: { type: ImageType; data: Uint8Array }
  width: number
  height: number
  /** OCR boxes as recognised (or as saved). Use slotBoxes() for the adjusted boxes. */
  ocr: OcrBox[]
  ocrStatus: OcrStatus
  ocrProgress: number
  history: History<EditState>
  /** Edit state / name at the last save (for the unsaved-changes check). */
  savedEdits: EditState | null
  savedName: string | null
  selectedBoxId: string | null
  selectedLayerId: string | null
  /** Bumped when non-reactive render data (patches, images) changes. */
  renderTick: number
}

export type NewSlotInput = {
  docId: string | null
  name: string
  original: { type: ImageType; data: Uint8Array }
  width: number
  height: number
  ocr: OcrBox[] | null
  layers: Layer[]
}

export type OpenResult = { status: 'opened'; key: string } | { status: 'existing'; key: string } | { status: 'full' }

type DocumentState = {
  slots: Slot[]
  activeKey: string | null
  openSlot: (input: NewSlotInput) => OpenResult
  closeSlot: (key: string) => void
  setActive: (key: string) => void
  update: (key: string, patch: Partial<Slot>) => void
  /** Records a layer change in the undo history. */
  commitLayers: (key: string, layers: Layer[]) => void
  /** Records a moved / resized OCR box in the undo history. */
  commitBoxRect: (key: string, boxId: string, rect: Rect) => void
  undo: (key: string) => void
  redo: (key: string) => void
  markSaved: (key: string, meta: DocumentMeta) => void
  bumpRender: (key: string) => void
}

/** True when the slot has changes that are not saved (a never-saved document counts as unsaved). */
export function isDirty(slot: Slot): boolean {
  return (
    slot.docId === null || slot.savedEdits !== slot.history.present || slot.savedName !== slot.name
  )
}

/** The current layers of a slot. */
export const slotLayers = (slot: Slot): Layer[] => slot.history.present.layers

/** The OCR boxes of a slot with the user's moves / resizes applied. */
export function slotBoxes(slot: Slot): OcrBox[] {
  const rects = slot.history.present.boxRects
  return slot.ocr.map((b) => (rects[b.id] ? { ...b, rect: rects[b.id] as Rect } : b))
}

let slotCounter = 0

export const useDocumentStore = create<DocumentState>((set, get) => {
  const mapSlot = (key: string, fn: (s: Slot) => Slot): void =>
    set((st) => ({ slots: st.slots.map((s) => (s.key === key ? fn(s) : s)) }))

  return {
    slots: [],
    activeKey: null,

    openSlot: (input) => {
      const { slots } = get()
      const existing = input.docId ? slots.find((s) => s.docId === input.docId) : undefined
      if (existing) {
        set({ activeKey: existing.key })
        return { status: 'existing', key: existing.key }
      }
      if (slots.length >= MAX_SLOTS) return { status: 'full' }

      slotCounter += 1
      const key = `slot${slotCounter}`
      const history = createHistory<EditState>({ layers: input.layers, boxRects: {} })
      const slot: Slot = {
        key,
        docId: input.docId,
        name: input.name,
        original: input.original,
        width: input.width,
        height: input.height,
        ocr: input.ocr ?? [],
        ocrStatus: input.ocr ? 'done' : 'running',
        ocrProgress: input.ocr ? 1 : 0,
        history,
        savedEdits: input.docId ? history.present : null,
        savedName: input.docId ? input.name : null,
        selectedBoxId: null,
        selectedLayerId: null,
        renderTick: 0
      }
      set({ slots: [...slots, slot], activeKey: key })
      return { status: 'opened', key }
    },

    closeSlot: (key) =>
      set((st) => {
        const index = st.slots.findIndex((s) => s.key === key)
        const slots = st.slots.filter((s) => s.key !== key)
        let activeKey = st.activeKey
        if (activeKey === key) {
          activeKey = slots[Math.min(index, slots.length - 1)]?.key ?? null
        }
        return { slots, activeKey }
      }),

    setActive: (key) => set({ activeKey: key }),

    update: (key, patch) => mapSlot(key, (s) => ({ ...s, ...patch })),

    commitLayers: (key, layers) =>
      mapSlot(key, (s) =>
        layers === s.history.present.layers
          ? s
          : { ...s, history: pushHistory(s.history, { ...s.history.present, layers }) }
      ),

    commitBoxRect: (key, boxId, rect) =>
      mapSlot(key, (s) => {
        const boxRects = { ...s.history.present.boxRects, [boxId]: rect }
        return { ...s, history: pushHistory(s.history, { ...s.history.present, boxRects }) }
      }),

    undo: (key) => mapSlot(key, (s) => ({ ...s, history: undo(s.history), selectedLayerId: null })),

    redo: (key) => mapSlot(key, (s) => ({ ...s, history: redo(s.history), selectedLayerId: null })),

    markSaved: (key, meta) =>
      mapSlot(key, (s) => ({
        ...s,
        docId: meta.id,
        name: meta.name,
        savedName: meta.name,
        savedEdits: s.history.present
      })),

    bumpRender: (key) => mapSlot(key, (s) => ({ ...s, renderTick: s.renderTick + 1 }))
  }
})

/** The slot being edited, or null. */
export function useActiveSlot(): Slot | null {
  return useDocumentStore((st) => st.slots.find((s) => s.key === st.activeKey) ?? null)
}
