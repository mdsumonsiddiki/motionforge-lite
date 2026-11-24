import { create } from 'zustand'

/**
 * Spec section 6: only two kinds of notification exist —
 * "success" (Generation Complete) and "error".
 */
export type ToastKind = 'success' | 'error'

export type Toast = {
  id: number
  kind: ToastKind
  /** i18next key; the Toaster component translates it. */
  messageKey: string
}

/** How long a toast stays on screen. */
export const TOAST_DURATION_MS = 4000

type ToastState = {
  toasts: Toast[]
  push: (kind: ToastKind, messageKey: string) => number
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, messageKey) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, kind, messageKey }] }))
    setTimeout(() => get().dismiss(id), TOAST_DURATION_MS)
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))

/** Shortcut usable outside React components. */
export const notify = {
  success: (messageKey: string) => useToastStore.getState().push('success', messageKey),
  error: (messageKey: string) => useToastStore.getState().push('error', messageKey)
}
