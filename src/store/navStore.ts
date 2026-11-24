import { create } from 'zustand'

/**
 * Simple state-based routing. The app has a handful of fixed pages,
 * so a router library is not needed.
 */
export type Page = 'dashboard' | 'human' | 'document' | 'output' | 'settings'

type NavState = {
  page: Page
  navigate: (page: Page) => void
}

/** The app opens straight on the Dashboard (spec section 6). */
export const useNavStore = create<NavState>((set) => ({
  page: 'dashboard',
  navigate: (page) => set({ page })
}))
