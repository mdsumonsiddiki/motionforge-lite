import type { ItemSummary } from '../../../electron/shared/storage'

/**
 * Home section data (UI_REDESIGN.md section 5, Home). Pure, unit-tested.
 */

/** What the "Continue Editing" card shows. */
export type ContinueTarget<S> =
  | { kind: 'open'; slot: S; slotNumber: number }
  | { kind: 'saved'; item: ItemSummary }
  | { kind: 'none' }

/**
 * Last opened document: the active editor slot, else the first open slot, else the
 * newest saved document. Nothing at all → "Open your first document".
 */
export function continueTarget<S extends { key: string }>(
  slots: readonly S[],
  activeKey: string | null,
  savedDocuments: readonly ItemSummary[]
): ContinueTarget<S> {
  const index = Math.max(
    0,
    slots.findIndex((s) => s.key === activeKey)
  )
  const slot = slots[index]
  if (slot) return { kind: 'open', slot, slotNumber: index + 1 }
  const newest = savedDocuments[0]
  if (newest) return { kind: 'saved', item: newest }
  return { kind: 'none' }
}

export type GettingStarted = { steps: [boolean, boolean, boolean]; done: number; percent: number }

/**
 * Getting Started (3 steps): Edit your first document (≥ 1 document saved or open),
 * Create a character (≥ 1 saved), Go live in OBS (needs LIVE detection — not built yet).
 */
export function gettingStarted(documents: number, characters: number, live: boolean): GettingStarted {
  const steps: [boolean, boolean, boolean] = [documents > 0, characters > 0, live]
  const done = steps.filter(Boolean).length
  return { steps, done, percent: Math.round((done / 3) * 100) }
}
