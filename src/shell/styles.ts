import type { CSSProperties } from 'react'

/** Style of text inputs / selects / textareas (sunken, radius 14; UI_REDESIGN.md). */
export const fieldStyle: CSSProperties = {
  minHeight: 46,
  borderRadius: 14,
  border: '1px solid var(--input-border)',
  background: 'var(--inset)',
  color: 'var(--text)',
  padding: '0 14px',
  fontFamily: 'inherit',
  fontSize: 13,
  boxSizing: 'border-box',
  width: '100%'
}
