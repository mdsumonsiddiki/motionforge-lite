import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_VIEW } from '../../electron/shared/output'
import { pickShownSlot, useOutputStore } from './outputStore'

const out = () => useOutputStore.getState()

describe('outputStore', () => {
  beforeEach(() =>
    useOutputStore.setState({
      orientation: 'landscape',
      background: 'original',
      customBackground: null,
      documentKey: null,
      view: DEFAULT_VIEW
    })
  )

  it('zooms, moves and resets the view', () => {
    out().zoomIn()
    out().move('right')
    expect(out().view.zoom).toBeGreaterThan(1)
    expect(out().view.panX).toBeGreaterThan(0)
    out().resetView()
    expect(out().view).toEqual(DEFAULT_VIEW)
  })

  it('switching the document resets the view', () => {
    out().zoomIn()
    out().setDocumentKey('slot2')
    expect(out().documentKey).toBe('slot2')
    expect(out().view).toEqual(DEFAULT_VIEW)
  })

  it('choosing a custom picture switches to the custom background', () => {
    out().setCustomBackground({ type: 'png', data: new Uint8Array([1]) })
    expect(out().background).toBe('custom')
  })
})

describe('pickShownSlot', () => {
  it('keeps the chosen slot while it is open, else falls back to the first', () => {
    expect(pickShownSlot(['a', 'b'], 'b')).toBe('b')
    expect(pickShownSlot(['a', 'b'], 'gone')).toBe('a')
    expect(pickShownSlot(['a'], null)).toBe('a')
    expect(pickShownSlot([], 'a')).toBeNull()
  })
})
