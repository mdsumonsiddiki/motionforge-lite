import { beforeEach, describe, expect, it } from 'vitest'
import { useNavStore } from './navStore'

const nav = () => useNavStore.getState()

describe('navStore', () => {
  beforeEach(() => useNavStore.setState({ page: 'home' }))

  it('starts on Home', () => {
    expect(nav().page).toBe('home')
  })

  it('navigates to every section without asking (no leave warning)', () => {
    for (const page of ['human', 'document', 'output', 'settings', 'home'] as const) {
      nav().navigate(page)
      expect(nav().page).toBe(page)
    }
  })
})
