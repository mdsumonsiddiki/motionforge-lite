import { create } from 'zustand'

/**
 * Simple state-based routing. The app has a handful of fixed pages,
 * so a router library is not needed.
 */
export type Page = 'dashboard' | 'human' | 'document' | 'output' | 'settings'

type NavState = {
  page: Page
  /** Page the user wants to go to while an unsaved-changes warning is shown. */
  pendingPage: Page | null
  /** Returns true when leaving the current page needs a warning (unsaved changes). */
  leaveGuard: (() => boolean) | null
  navigate: (page: Page) => void
  setLeaveGuard: (guard: (() => boolean) | null) => void
  confirmLeave: () => void
  cancelLeave: () => void
}

/** The app opens straight on the Dashboard (spec section 6). */
export const useNavStore = create<NavState>((set, get) => ({
  page: 'dashboard',
  pendingPage: null,
  leaveGuard: null,

  navigate: (page) => {
    const { page: current, leaveGuard } = get()
    if (page === current) return
    // Spec section 5: warn before leaving a page with unsaved changes.
    if (leaveGuard?.()) set({ pendingPage: page })
    else set({ page, pendingPage: null })
  },

  setLeaveGuard: (leaveGuard) => set({ leaveGuard }),

  confirmLeave: () => {
    const { pendingPage } = get()
    if (pendingPage) set({ page: pendingPage, pendingPage: null })
  },

  cancelLeave: () => set({ pendingPage: null })
}))
