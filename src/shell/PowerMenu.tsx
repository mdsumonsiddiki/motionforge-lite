import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExitStore } from '../store/exitStore'
import { PowerIcon, RestartIcon } from './icons'

const itemStyle: React.CSSProperties = {
  minHeight: 46,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 14px',
  borderRadius: 12,
  border: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13
}

/**
 * Navbar power button (UI_REDESIGN.md 4.2): Restart app / Quit app.
 * Both go through CloseConfirmDialog (unsaved-changes check + Output window warning).
 */
export function PowerMenu() {
  const { t } = useTranslation()
  const request = useExitStore((s) => s.request)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape.
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

  const choose = (kind: 'restart' | 'quit'): void => {
    setOpen(false)
    request(kind)
  }

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`as-btn ${open ? 'as-on' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={t('power.button')}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          border: 0,
          cursor: 'pointer',
          background: 'var(--panel)',
          color: 'var(--power)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <PowerIcon />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t('power.menu')}
          className="as-raise"
          style={{
            position: 'absolute',
            right: 0,
            top: 58,
            zIndex: 20,
            width: 220,
            borderRadius: 18,
            background: 'var(--panel-solid)',
            border: '1px solid var(--border)',
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <button
            type="button"
            role="menuitem"
            autoFocus
            className="as-btn"
            onClick={() => choose('restart')}
            style={{ ...itemStyle, background: 'var(--panel-solid)', color: 'var(--text)' }}
          >
            <RestartIcon />
            {t('power.restartApp')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="as-btn"
            onClick={() => choose('quit')}
            style={{ ...itemStyle, background: 'var(--danger)', color: '#ffffff', fontWeight: 600 }}
          >
            <PowerIcon size={18} />
            {t('power.quitApp')}
          </button>
          <span style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--muted)', padding: '2px 4px' }}>
            {t('power.hint')}
          </span>
        </div>
      )}
    </div>
  )
}
