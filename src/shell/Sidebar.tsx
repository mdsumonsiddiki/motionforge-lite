import type { ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavStore, type Page } from '../store/navStore'
import { CamIcon, DocIcon, GearIcon, HomeIcon, HumanIcon } from './icons'

/** Sidebar width (UI_REDESIGN.md 4.1): 244px, 88px collapsed. */
const SIDEBAR_WIDTH = { open: '244px', collapsed: '88px' } as const

/** One 52px sidebar item (reference: `nav.*` buttons). */
function NavItem({
  page,
  labelKey,
  Icon,
  showLabel,
  style
}: {
  page: Page
  labelKey: string
  Icon: ComponentType
  showLabel: boolean
  style?: React.CSSProperties
}) {
  const { t } = useTranslation()
  const current = useNavStore((s) => s.page)
  const navigate = useNavStore((s) => s.navigate)
  const on = current === page
  const label = t(labelKey)
  return (
    <button
      type="button"
      className={`as-btn ${on ? 'as-on' : ''}`}
      onClick={() => navigate(page)}
      aria-label={label}
      aria-current={on ? 'page' : undefined}
      title={showLabel ? undefined : label}
      style={{
        minHeight: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 15px',
        borderRadius: 16,
        border: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 14,
        background: on ? 'var(--nav-bg-on)' : 'var(--nav-bg)',
        color: on ? 'var(--nav-fg-on)' : 'var(--nav-fg)',
        ...style
      }}
    >
      <Icon />
      {showLabel && (
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', minWidth: 0 }}>{label}</span>
      )}
    </button>
  )
}

/**
 * Left navigation (UI_REDESIGN.md 4.1): logo, Home · STUDIOS · Human Studio ·
 * Document Editor · Webcam Output, Settings at the bottom, then the profile card.
 */
export function Sidebar({ collapsed, profile }: { collapsed: boolean; profile?: ReactNode }) {
  const { t } = useTranslation()
  const showLabels = !collapsed
  return (
    <nav
      aria-label={t('nav.main')}
      className="as-glass"
      style={{
        flex: `0 0 ${collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.open}`,
        boxSizing: 'border-box',
        background: 'var(--side)',
        borderRight: '1px solid var(--border)',
        padding: '22px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'flex-basis .25s',
        // No overflow clipping here: the profile popover (290px) is wider than the
        // sidebar. Above the center so the popover covers it.
        position: 'relative',
        zIndex: 2
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 18px', minHeight: 40 }}>
        <span
          className="as-raise"
          aria-hidden="true"
          style={{
            flex: '0 0 40px',
            width: 40,
            height: 40,
            borderRadius: 13,
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          M
        </span>
        {showLabels && (
          <span style={{ fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>MotionForge</span>
        )}
      </div>

      <NavItem page="home" labelKey="nav.home" Icon={HomeIcon} showLabel={showLabels} />
      {showLabels && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: 'var(--muted)',
            padding: '6px 14px 0'
          }}
        >
          {t('nav.studios')}
        </span>
      )}
      <NavItem page="human" labelKey="nav.human" Icon={HumanIcon} showLabel={showLabels} />
      <NavItem page="document" labelKey="nav.document" Icon={DocIcon} showLabel={showLabels} />
      <NavItem page="output" labelKey="nav.output" Icon={CamIcon} showLabel={showLabels} />

      <NavItem
        page="settings"
        labelKey="nav.settings"
        Icon={GearIcon}
        showLabel={showLabels}
        style={{ marginTop: 'auto' }}
      />
      {profile}
    </nav>
  )
}
