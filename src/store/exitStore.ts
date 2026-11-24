import { create } from 'zustand'
import type { ExitKind } from '../shell/exitText'

/**
 * Which "leave the app" confirmation is showing: window ✕ (close), power menu
 * Quit or Restart. null = none. The dialog itself is CloseConfirmDialog.
 */
type ExitState = {
  pending: ExitKind | null
  request: (kind: ExitKind) => void
  cancel: () => void
}

export const useExitStore = create<ExitState>((set) => ({
  pending: null,
  request: (pending) => set({ pending }),
  cancel: () => set({ pending: null })
}))
