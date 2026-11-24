import { describe, expect, it } from 'vitest'
import { mergeFontLists } from './fonts'

describe('mergeFontLists', () => {
  it('keeps bundled fonts first and adds sorted, unique system fonts', () => {
    expect(
      mergeFontLists(['Noto Sans', 'Hind Siliguri'], ['Arial', 'noto sans', 'Calibri', 'Arial', ' ', 'Nirmala UI'])
    ).toEqual(['Noto Sans', 'Hind Siliguri', 'Arial', 'Calibri', 'Nirmala UI'])
  })
})
