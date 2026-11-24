import { create } from 'zustand'
import type { ImageType } from '../../electron/shared/document'
import {
  DEFAULT_VIEW,
  pan,
  zoomIn,
  zoomOut,
  type Direction,
  type Orientation,
  type OutputBackground,
  type OutputView
} from '../../electron/shared/output'

/**
 * Webcam Output controls (spec section 10), set on the Webcam Output page.
 * Phase 5: Document mode only (Human mode is added in Phase 9).
 */
type OutputStoreState = {
  /** Output window is open. */
  windowOpen: boolean
  orientation: Orientation
  background: OutputBackground
  customBackground: { type: ImageType; data: Uint8Array } | null
  /** Which open document slot is shown (null = the first open one). */
  documentKey: string | null
  view: OutputView

  setWindowOpen: (open: boolean) => void
  setOrientation: (o: Orientation) => void
  setBackground: (b: OutputBackground) => void
  setCustomBackground: (img: { type: ImageType; data: Uint8Array }) => void
  setDocumentKey: (key: string) => void
  zoomIn: () => void
  zoomOut: () => void
  move: (dir: Direction) => void
  resetView: () => void
}

export const useOutputStore = create<OutputStoreState>((set) => ({
  windowOpen: false,
  orientation: 'landscape',
  background: 'original',
  customBackground: null,
  documentKey: null,
  view: DEFAULT_VIEW,

  setWindowOpen: (windowOpen) => set({ windowOpen }),
  setOrientation: (orientation) => set({ orientation }),
  setBackground: (background) => set({ background }),
  setCustomBackground: (customBackground) => set({ customBackground, background: 'custom' }),
  // Switching the document starts from a centred view.
  setDocumentKey: (documentKey) => set({ documentKey, view: DEFAULT_VIEW }),
  zoomIn: () => set((s) => ({ view: zoomIn(s.view) })),
  zoomOut: () => set((s) => ({ view: zoomOut(s.view) })),
  move: (dir) => set((s) => ({ view: pan(s.view, dir) })),
  resetView: () => set({ view: DEFAULT_VIEW })
}))

/** The slot to show: the chosen one if it is still open, else the first open slot. */
export function pickShownSlot(openKeys: readonly string[], chosen: string | null): string | null {
  if (chosen && openKeys.includes(chosen)) return chosen
  return openKeys[0] ?? null
}
