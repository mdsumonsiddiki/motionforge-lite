/**
 * Toggle between a few options (Settings: Language, Theme, Reduce effects).
 * Look: the navbar language switch of UI_REDESIGN.md (sunken track, raised options,
 * selected = accent).
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="group"
      className="as-sink"
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: 5,
        borderRadius: 999,
        background: 'var(--inset)'
      }}
    >
      {options.map((opt) => {
        const on = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            className={`as-btn ${on ? 'as-on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(opt.value)}
            style={{
              minHeight: 38,
              padding: '0 16px',
              borderRadius: 999,
              border: 0,
              cursor: 'pointer',
              background: on ? 'var(--accent)' : 'var(--panel)',
              color: on ? 'var(--on-accent)' : 'var(--muted)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: on ? 600 : 400
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
