import { notify } from '../store/toastStore'

/**
 * Error toast when old text could not be removed (inpaint worker / OpenCV failed).
 * Several boxes usually fail together (e.g. the worker did not start), so at most one
 * toast is shown per few seconds instead of one per box.
 */
export const INPAINT_TOAST_GAP_MS = 5000

let lastShown = Number.NEGATIVE_INFINITY

/** Shows the toast unless one was shown recently. Returns true when shown. */
export function reportInpaintFailure(now: number = Date.now()): boolean {
  if (now - lastShown < INPAINT_TOAST_GAP_MS) return false
  lastShown = now
  notify.error('errors.inpaintFailed')
  return true
}

/** For tests only. */
export function resetInpaintFailureReport(): void {
  lastShown = Number.NEGATIVE_INFINITY
}
