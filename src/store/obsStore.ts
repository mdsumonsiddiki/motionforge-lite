import { useEffect } from 'react'
import { create } from 'zustand'
import type { ObsStatus } from '../shell/ObsPill'

/**
 * OBS status for the navbar pill and Home (UI_REDESIGN.md 4.2).
 * Offline / Running come from a read-only process check in main.
 * LIVE needs OBS WebSocket (not built yet): it stays behind this flag.
 */
export const OBS_LIVE_ENABLED = false

/** How often the running check runs while the app is open. */
export const OBS_POLL_MS = 3000

type ObsState = {
  status: ObsStatus
  refresh: () => Promise<void>
}

export const useObsStore = create<ObsState>((set) => ({
  status: 'offline',
  refresh: async () => {
    try {
      set({ status: (await window.api.obsControl.isRunning()) ? 'running' : 'offline' })
    } catch {
      set({ status: 'offline' })
    }
  }
}))

/** Polls the OBS status (call once, in App). */
export function useObsPolling(): void {
  const refresh = useObsStore((s) => s.refresh)
  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), OBS_POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])
}
