import type { OpenResult } from '../../store/documentStore'
import { notify } from '../../store/toastStore'

/** Maps an IPC error from main to a translated message key. */
export function openErrorKey(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('IMAGE_TOO_LARGE')) return 'errors.imageTooLarge'
  if (msg.includes('NOT_AN_IMAGE')) return 'errors.notAnImage'
  return 'errors.openFailed'
}

/** Shows "3 documents are already open" when no slot is free. */
export function handleOpenResult(result: OpenResult): void {
  if (result.status === 'full') notify.error('errors.slotsFull')
}
