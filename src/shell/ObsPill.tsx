import { useTranslation } from 'react-i18next'

export type ObsStatus = 'offline' | 'running' | 'live'

/**
 * Navbar OBS status pill (UI_REDESIGN.md 4.2).
 * Offline = grey dot, Running = accent dot, LIVE = green pulsing dot (`.as-live`).
 * LIVE needs OBS WebSocket (not built yet), so callers only pass it behind a flag.
 */
export function ObsPill({ status }: { status: ObsStatus }) {
  const { t } = useTranslation()
  const live = status === 'live'
  const dot = live ? 'var(--live)' : status === 'running' ? 'var(--accent)' : 'var(--offline)'
  return (
    <div
      role="status"
      className={`as-btn ${live ? 'as-on' : ''}`}
      style={{
        minHeight: 46,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 18px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        background: 'var(--panel)',
        color: live ? 'var(--live-fg)' : status === 'running' ? 'var(--text)' : 'var(--muted)',
        boxSizing: 'border-box'
      }}
    >
      <span
        className={live ? 'as-live' : undefined}
        aria-hidden="true"
        style={{ width: 10, height: 10, borderRadius: '50%', background: dot }}
      />
      {t(`obs.${status}`)}
    </div>
  )
}
