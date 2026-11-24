import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { notify, TOAST_DURATION_MS, useToastStore } from './toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToastStore.setState({ toasts: [] })
  })
  afterEach(() => vi.useRealTimers())

  it('adds success and error toasts', () => {
    notify.success('toast.generationComplete')
    notify.error('errors.settingsSave')
    expect(useToastStore.getState().toasts.map((t) => t.kind)).toEqual(['success', 'error'])
  })

  it('removes a toast after its duration', () => {
    notify.error('errors.settingsSave')
    vi.advanceTimersByTime(TOAST_DURATION_MS - 1)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('dismisses a toast by id', () => {
    const id = notify.error('a')
    notify.error('b')
    useToastStore.getState().dismiss(id)
    expect(useToastStore.getState().toasts.map((t) => t.messageKey)).toEqual(['b'])
  })
})
