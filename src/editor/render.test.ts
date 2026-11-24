import { describe, expect, it } from 'vitest'
import { fontCss, LINE_HEIGHT, lineCenters } from './render'

describe('render helpers', () => {
  it('builds a quoted CSS font', () => {
    expect(fontCss(24, 'Noto Sans Bengali')).toBe('24px "Noto Sans Bengali"')
    expect(fontCss(10, 'Bad"Name')).toBe('10px "BadName"')
  })

  it('centres one line in the box and stacks more lines around the centre', () => {
    expect(lineCenters(100, 40, 20, 1)).toEqual([120])
    const step = 20 * LINE_HEIGHT
    expect(lineCenters(100, 40, 20, 2)).toEqual([120 - step / 2, 120 + step / 2])
  })
})
