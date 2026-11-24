import { describe, expect, it } from 'vitest'
import { exitText } from './exitText'

describe('exitText', () => {
  it('uses the plain close texts when nothing is unsaved', () => {
    expect(exitText('quit', false, false)).toEqual({
      titleKey: 'close.title',
      messageKey: 'close.message',
      confirmKey: 'close.confirm',
      outputWarningKey: null
    })
    expect(exitText('close', false, false).confirmKey).toBe('close.confirm')
  })

  it('warns about unsaved documents (existing unsaved check)', () => {
    const q = exitText('quit', true, false)
    expect(q.titleKey).toBe('doc.unsavedTitle')
    expect(q.messageKey).toBe('close.unsavedMessage')
    expect(q.confirmKey).toBe('close.closeWithoutSaving')
    const r = exitText('restart', true, false)
    expect(r.messageKey).toBe('power.restartUnsavedMessage')
    expect(r.confirmKey).toBe('power.restartWithoutSaving')
  })

  it('has restart texts', () => {
    expect(exitText('restart', false, false)).toMatchObject({
      titleKey: 'power.restartTitle',
      messageKey: 'power.restartMessage',
      confirmKey: 'power.restart'
    })
  })

  it('warns that the Output window will close', () => {
    expect(exitText('restart', false, true).outputWarningKey).toBe('power.outputWillClose')
    expect(exitText('close', true, true).outputWarningKey).toBe('power.outputWillClose')
  })
})
