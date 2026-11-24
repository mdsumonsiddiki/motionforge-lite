/**
 * Undo / Redo for the edit layers (spec section 8: Ctrl+Z / Ctrl+Y, session only).
 * Immutable: every function returns a new History.
 */
export type History<T> = { past: T[]; present: T; future: T[] }

/** Oldest steps are dropped beyond this, to cap memory. */
export const HISTORY_LIMIT = 100

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] }
}

/** Records a new state. Clears the redo stack. */
export function pushHistory<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h
  const past = [...h.past, h.present]
  if (past.length > HISTORY_LIMIT) past.shift()
  return { past, present: next, future: [] }
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h
  const previous = h.past[h.past.length - 1] as T
  return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] }
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h
  const [next, ...rest] = h.future as [T, ...T[]]
  return { past: [...h.past, h.present], present: next, future: rest }
}

export const canUndo = <T>(h: History<T>): boolean => h.past.length > 0
export const canRedo = <T>(h: History<T>): boolean => h.future.length > 0
