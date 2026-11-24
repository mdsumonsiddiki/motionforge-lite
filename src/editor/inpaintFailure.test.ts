import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToastStore } from '../store/toastStore'
import { INPAINT_TOAST_GAP_MS, reportInpaintFailure, resetInpaintFailureReport } from './inpaintFailure'

describe('reportInpaintFailure', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetInpaintFailureReport()
    useToastStore.setState({ toasts: [] })
  })
  afterEach(() => vi.useRealTimers())

  it('shows an error toast instead of failing silently', () => {
    expect(reportInpaintFailure(1000)).toBe(true)
    expect(useToastStore.getState().toasts).toMatchObject([
      { kind: 'error', messageKey: 'errors.inpaintFailed' }
    ])
  })

  it('shows one toast when many boxes fail together', () => {
    reportInpaintFailure(1000)
    reportInpaintFailure(1001)
    reportInpaintFailure(1000 + INPAINT_TOAST_GAP_MS - 1)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(reportInpaintFailure(1000 + INPAINT_TOAST_GAP_MS)).toBe(true)
    expect(useToastStore.getState().toasts).toHaveLength(2)
  })
})
