import { create } from 'zustand'

/**
 * Simple state-based routing. The app has a handful of fixed sections,
 * so a router library is not needed.
 * Changing the section never warns: open documents live in documentStore and are kept
 * (user decision 2026-11-24). Unsaved warnings appear only when closing a tab or the app.
 * Sections follow docs/UI_REDESIGN.md section 5 (Home replaces the old Dashboard).
 */
export type Page = 'home' | 'human' | 'document' | 'output' | 'settings'

type NavState = {
  page: Page
  navigate: (page: Page) => void
}

/** The app opens straight on Home (spec section 6, UI_REDESIGN.md section 5.1). */
export const useNavStore = create<NavState>((set) => ({
  page: 'home',
  navigate: (page) => set({ page })
}))
