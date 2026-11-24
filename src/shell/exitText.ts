/**
 * Texts of the "leave the app" confirmation (window ✕, power menu Quit / Restart).
 * Pure: returns i18n keys, so it can be unit-tested (UI_REDESIGN.md section 4.2).
 */
export type ExitKind = 'close' | 'quit' | 'restart'

export type ExitText = {
  titleKey: string
  messageKey: string
  confirmKey: string
  /** Extra line: the Output window (used by OBS) will close too. */
  outputWarningKey: string | null
}

export function exitText(kind: ExitKind, unsaved: boolean, outputOpen: boolean): ExitText {
  const restart = kind === 'restart'
  return {
    titleKey: unsaved ? 'doc.unsavedTitle' : restart ? 'power.restartTitle' : 'close.title',
    messageKey: unsaved
      ? restart
        ? 'power.restartUnsavedMessage'
        : 'close.unsavedMessage'
      : restart
        ? 'power.restartMessage'
        : 'close.message',
    confirmKey: restart
      ? unsaved
        ? 'power.restartWithoutSaving'
        : 'power.restart'
      : unsaved
        ? 'close.closeWithoutSaving'
        : 'close.confirm',
    outputWarningKey: outputOpen ? 'power.outputWillClose' : null
  }
}
