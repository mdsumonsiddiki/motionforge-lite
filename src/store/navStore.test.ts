import { beforeEach, describe, expect, it } from 'vitest'
import { useNavStore } from './navStore'

describe('navStore', () => {
  beforeEach(() => useNavStore.setState({ page: 'dashboard' }))

  it('starts on the dashboard', () => {
    expect(useNavStore.getState().page).toBe('dashboard')
  })

  it('navigates to every page', () => {
    for (const page of ['human', 'document', 'output', 'settings', 'dashboard'] as const) {
      useNavStore.getState().navigate(page)
      expect(useNavStore.getState().page).toBe(page)
    }
  })
})
