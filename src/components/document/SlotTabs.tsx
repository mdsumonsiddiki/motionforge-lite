import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isDirty, useDocumentStore, type Slot } from '../../store/documentStore'
import { closeSlot } from '../../editor/session'
import { MAX_SLOTS } from '../../editor/types'
import { ConfirmDialog } from '../ConfirmDialog'
import { OpenControls } from './OpenControls'

const tabStyle: React.CSSProperties = {
  minHeight: 46,
  padding: '0 18px',
  borderRadius: 14,
  border: 0,
  cursor: 'pointer',
  background: 'var(--panel)',
  fontFamily: 'inherit',
  fontSize: 13
}

/** "+ Open document" tab: opens a small popover with the open controls. */
function OpenTab() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`as-btn ${open ? 'as-on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{ ...tabStyle, color: 'var(--muted)' }}
      >
        {t('doc.openTab')}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('doc.openTab')}
          className="as-raise"
          style={{
            position: 'absolute',
            left: 0,
            top: 56,
            zIndex: 20,
            width: 300,
            borderRadius: 18,
            background: 'var(--panel-solid)',
            border: '1px solid var(--border)',
            padding: 14
          }}
        >
          <OpenControls onOpened={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

/**
 * Tabs for the open documents (max 3) + "+ Open document" for free slots
 * (UI_REDESIGN.md section 5). Closing a tab with unsaved changes asks first.
 */
export function SlotTabs() {
  const { t } = useTranslation()
  const slots = useDocumentStore((s) => s.slots)
  const activeKey = useDocumentStore((s) => s.activeKey)
  const setActive = useDocumentStore((s) => s.setActive)
  const [closing, setClosing] = useState<Slot | null>(null)
  const anyDirty = slots.some(isDirty)

  const requestClose = (slot: Slot): void => {
    if (isDirty(slot)) setClosing(slot)
    else closeSlot(slot.key)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <div role="tablist" aria-label={t('doc.openDocuments')} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {slots.map((slot) => {
          const on = slot.key === activeKey
          return (
            <div
              key={slot.key}
              className={`as-btn ${on ? 'as-on' : ''}`}
              style={{
                ...tabStyle,
                padding: '0 8px 0 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                maxWidth: 240,
                cursor: 'default'
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(slot.key)}
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: on ? 600 : 400,
                  color: on ? 'var(--accent-text)' : 'var(--muted)',
                  padding: '12px 0'
                }}
              >
                {isDirty(slot) ? '● ' : ''}
                {slot.name}
              </button>
              <button
                type="button"
                onClick={() => requestClose(slot)}
                aria-label={t('doc.closeSlot')}
                title={t('doc.closeSlot')}
                style={{
                  flex: '0 0 auto',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontSize: 13
                }}
              >
                ✕
              </button>
            </div>
          )
        })}
        {Array.from({ length: Math.max(0, MAX_SLOTS - slots.length) }, (_, i) => (
          <OpenTab key={`open-${i}`} />
        ))}
      </div>
      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
        {t('doc.slotCount', { count: slots.length, max: MAX_SLOTS })} ·{' '}
        {anyDirty ? t('home.unsaved') : t('home.allSaved')}
      </span>

      <ConfirmDialog
        open={closing !== null}
        title={t('doc.unsavedTitle')}
        message={t('doc.closeUnsavedMessage', { name: closing?.name ?? '' })}
        confirmLabel={t('doc.closeAnyway')}
        cancelLabel={t('close.cancel')}
        onCancel={() => setClosing(null)}
        onConfirm={() => {
          if (closing) closeSlot(closing.key)
          setClosing(null)
        }}
      />
    </div>
  )
}
