import { describe, expect, it } from 'vitest'
import {
  contentRect,
  coverRect,
  DEFAULT_VIEW,
  fitWindowSize,
  pan,
  PAN_LIMIT,
  zoomIn,
  zoomOut,
  ZOOM_MAX,
  ZOOM_MIN
} from './output'

describe('output layout', () => {
  it('fits content inside the output at zoom 1, centred', () => {
    // A4-ish portrait document on 16:9 output → limited by height.
    expect(contentRect(1280, 720, 1000, 1414, DEFAULT_VIEW)).toEqual({
      x: (1280 - 1000 * (720 / 1414)) / 2,
      y: 0,
      w: 1000 * (720 / 1414),
      h: 720
    })
  })

  it('applies zoom and pan', () => {
    const r = contentRect(1000, 1000, 100, 100, { zoom: 2, panX: 0.1, panY: -0.1 })
    expect(r).toEqual({ x: -500 + 100, y: -500 - 100, w: 2000, h: 2000 })
  })

  it('returns an empty rect for empty content', () => {
    expect(contentRect(100, 100, 0, 10, DEFAULT_VIEW)).toEqual({ x: 0, y: 0, w: 0, h: 0 })
  })

  it('covers the whole output with a background picture', () => {
    expect(coverRect(1280, 720, 1000, 1000)).toEqual({ x: 0, y: -280, w: 1280, h: 1280 })
  })

  it('clamps zoom between the limits', () => {
    let v = DEFAULT_VIEW
    for (let i = 0; i < 100; i++) v = zoomIn(v)
    expect(v.zoom).toBe(ZOOM_MAX)
    for (let i = 0; i < 100; i++) v = zoomOut(v)
    expect(v.zoom).toBe(ZOOM_MIN)
  })

  it('pans in steps and stops at the limit', () => {
    expect(pan(DEFAULT_VIEW, 'right').panX).toBeCloseTo(0.05)
    expect(pan(DEFAULT_VIEW, 'up').panY).toBeCloseTo(-0.05)
    let v = DEFAULT_VIEW
    for (let i = 0; i < 100; i++) v = pan(v, 'left')
    expect(v.panX).toBe(-PAN_LIMIT)
  })

  it('sizes the window to fit the screen, keeping the aspect ratio', () => {
    expect(fitWindowSize('landscape', { width: 1920, height: 1040 })).toEqual({ width: 1280, height: 720 })
    expect(fitWindowSize('portrait', { width: 1920, height: 1040 })).toEqual({ width: 468, height: 832 })
  })
})
