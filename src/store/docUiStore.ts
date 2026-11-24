import { create } from 'zustand'

/**
 * Document Editor UI state shared by the center (preview) and the right panel
 * (controls) since the UI redesign split them. UI only — no document data here.
 */
type DocUiState = {
  /** Image Replace: the user is dragging an area on the preview. */
  selectingArea: boolean
  setSelectingArea: (on: boolean) => void
  toggleSelectingArea: () => void
}

export const useDocUiStore = create<DocUiState>((set) => ({
  selectingArea: false,
  setSelectingArea: (selectingArea) => set({ selectingArea }),
  toggleSelectingArea: () => set((s) => ({ selectingArea: !s.selectingArea }))
}))
