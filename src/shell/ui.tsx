import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

/**
 * Small building blocks of the redesigned UI (docs/UI_REDESIGN.md). Every value comes
 * from docs/ui-reference/AppShell.reference.html; colours are theme tokens (tokens.css).
 */

type Tone = 'panel' | 'solid' | 'accent' | 'danger' | 'go'

const toneStyle: Record<Tone, CSSProperties> = {
  panel: { background: 'var(--panel)', color: 'inherit' },
  solid: { background: 'var(--panel-solid)', color: 'var(--text)' },
  accent: { background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 600 },
  danger: { background: 'var(--danger)', color: '#ffffff', fontWeight: 600 },
  go: { background: 'var(--go-live)', color: '#ffffff', fontWeight: 700 }
}

/**
 * A raised 3D button (`.as-btn`). `on` = selected (sunken).
 * Defaults: 46px high, radius 14, 13px text — the most common button in the reference.
 */
export function Btn({
  tone = 'panel',
  on = false,
  className = '',
  style,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; on?: boolean }) {
  return (
    <button
      type="button"
      className={`as-btn ${on ? 'as-on' : ''} ${className}`}
      style={{
        minHeight: 46,
        borderRadius: 14,
        border: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        ...toneStyle[tone],
        ...style
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

/** A raised card (`.as-raise`): radius 26, panel background, glass blur in light mode. */
export function Card({
  children,
  style,
  as: Tag = 'section'
}: {
  children: ReactNode
  style?: CSSProperties
  as?: 'section' | 'div'
}) {
  return (
    <Tag
      className="as-raise as-glass"
      style={{
        borderRadius: 26,
        background: 'var(--panel)',
        border: '1px solid var(--card-border)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        ...style
      }}
    >
      {children}
    </Tag>
  )
}

/** A sunken area (`.as-sink`): previews, tracks, input wells. */
export function Sink({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="as-sink" style={{ background: 'var(--inset)', ...style }}>
      {children}
    </div>
  )
}

/** Small raised pill with info text ("1280 × 720 · 24 FPS"). */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      className="as-raise"
      style={{ fontSize: 12, padding: '9px 15px', borderRadius: 999, background: 'var(--panel)' }}
    >
      {children}
    </span>
  )
}

/** Right panel heading (17px) or sub-heading (15px). */
export function PanelTitle({ children, sub = false }: { children: ReactNode; sub?: boolean }) {
  return (
    <h2 style={{ margin: sub ? '6px 0 0' : 0, fontSize: sub ? 15 : 17, fontWeight: 600 }}>
      {children}
    </h2>
  )
}

/** Muted 12px helper text. */
export function Muted({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ fontSize: 12, color: 'var(--muted)', ...style }}>{children}</span>
}

/** Label + field column (12px muted label, field below). */
export function FieldLabel({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
      {label}
      {children}
    </label>
  )
}
