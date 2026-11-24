import { beforeEach, describe, expect, it } from 'vitest'
import { useNavStore } from './navStore'

const nav = () => useNavStore.getState()

describe('navStore', () => {
  beforeEach(() => useNavStore.setState({ page: 'dashboard' }))

  it('starts on the dashboard', () => {
    expect(nav().page).toBe('dashboard')
  })

  it('navigates to every page without asking (no leave warning)', () => {
    for (const page of ['human', 'document', 'output', 'settings', 'dashboard'] as const) {
      nav().navigate(page)
      expect(nav().page).toBe(page)
    }
  })
})
