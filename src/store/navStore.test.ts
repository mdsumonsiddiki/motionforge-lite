import { beforeEach, describe, expect, it } from 'vitest'
import { useNavStore } from './navStore'

const nav = () => useNavStore.getState()

describe('navStore', () => {
  beforeEach(() => useNavStore.setState({ page: 'dashboard', pendingPage: null, leaveGuard: null }))

  it('starts on the dashboard', () => {
    expect(nav().page).toBe('dashboard')
  })

  it('navigates to every page', () => {
    for (const page of ['human', 'document', 'output', 'settings', 'dashboard'] as const) {
      nav().navigate(page)
      expect(nav().page).toBe(page)
    }
  })

  it('asks before leaving a page with unsaved changes', () => {
    nav().navigate('document')
    nav().setLeaveGuard(() => true)
    nav().navigate('dashboard')
    expect(nav().page).toBe('document')
    expect(nav().pendingPage).toBe('dashboard')

    nav().cancelLeave()
    expect(nav().page).toBe('document')
    expect(nav().pendingPage).toBeNull()

    nav().navigate('settings')
    nav().confirmLeave()
    expect(nav().page).toBe('settings')
  })

  it('leaves freely when the guard says there is nothing unsaved', () => {
    nav().navigate('document')
    nav().setLeaveGuard(() => false)
    nav().navigate('output')
    expect(nav().page).toBe('output')
  })
})
