import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../store/settingsStore'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

/**
 * App shell (UI_REDESIGN.md section 4): 20px page padding, rounded glass shell,
 * sidebar | (navbar / center workspace + right control panel).
 * Below ~1100px the right panel wraps under the center (flex-wrap).
 */
export function Shell({
  title,
  center,
  right,
  obsPill,
  profile
}: {
  title: string
  center: ReactNode
  right?: ReactNode
  obsPill: ReactNode
  profile?: ReactNode
}) {
  const { t } = useTranslation()
  const collapsed = useSettingsStore((s) => s.settings?.sidebarCollapsed ?? false)
  const update = useSettingsStore((s) => s.update)

  return (
    <div
      style={{
        height: '100%',
        boxSizing: 'border-box',
        padding: 20,
        color: 'var(--text)',
        fontFamily: 'var(--font-ui)'
      }}
    >
      <div
        className="as-glass"
        style={{
          maxWidth: 1440,
          height: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          background: 'var(--shell)',
          border: '1px solid var(--shell-border)',
          borderRadius: 28,
          overflow: 'hidden',
          display: 'flex',
          boxShadow: 'var(--shell-shadow)'
        }}
      >
        <Sidebar collapsed={collapsed} profile={profile} />

        <div style={{ flex: '999 1 600px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Navbar
            title={title}
            obsPill={obsPill}
            onToggleSidebar={() => void update({ sidebarCollapsed: !collapsed })}
          />
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', minHeight: 0, overflow: 'auto' }}>
            <main
              style={{
                flex: '999 1 480px',
                minWidth: 0,
                boxSizing: 'border-box',
                padding: 26,
                display: 'flex',
                flexDirection: 'column',
                gap: 24
              }}
            >
              {center}
            </main>
            {right && (
              <aside
                aria-label={t('nav.controls')}
                className="as-glass"
                style={{
                  flex: '1 1 280px',
                  maxWidth: 340,
                  boxSizing: 'border-box',
                  background: 'var(--right)',
                  borderLeft: '1px solid var(--border)',
                  padding: '24px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18
                }}
              >
                {right}
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
