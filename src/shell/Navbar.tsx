import { useTranslation } from 'react-i18next'
import type { Language } from '../../electron/shared/settings'
import { useSettingsStore } from '../store/settingsStore'
import { MenuIcon, MoonIcon, SunIcon } from './icons'
import { PowerMenu } from './PowerMenu'

const roundBtn: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: '50%',
  border: 0,
  cursor: 'pointer',
  background: 'var(--panel)',
  color: 'var(--text)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

/** EN / বাংলা segmented control (existing i18n switch, saved in settings). */
function LanguageSwitch() {
  const { t } = useTranslation()
  const language = useSettingsStore((s) => s.settings?.language ?? 'en')
  const update = useSettingsStore((s) => s.update)
  const option = (value: Language, label: string, bangla: boolean) => {
    const on = language === value
    return (
      <button
        type="button"
        className={`as-btn ${on ? 'as-on' : ''}`}
        aria-pressed={on}
        lang={value}
        onClick={() => void update({ language: value })}
        style={{
          minHeight: 38,
          padding: '0 14px',
          borderRadius: 999,
          border: 0,
          cursor: 'pointer',
          background: on ? 'var(--accent)' : 'var(--panel)',
          color: on ? 'var(--on-accent)' : 'var(--muted)',
          fontFamily: bangla ? "'Hind Siliguri', inherit" : 'inherit',
          fontSize: bangla ? 13 : 12,
          fontWeight: on ? 600 : bangla ? 500 : 400
        }}
      >
        {label}
      </button>
    )
  }
  return (
    <div
      role="group"
      aria-label={t('settings.language')}
      className="as-sink"
      style={{ display: 'flex', gap: 6, padding: 5, borderRadius: 999, background: 'var(--inset)' }}
    >
      {option('en', 'EN', false)}
      {option('bn', 'বাংলা', true)}
    </div>
  )
}

/**
 * Top bar (UI_REDESIGN.md 4.2): ☰ collapse, title block, OBS pill, language,
 * theme toggle, power menu.
 */
export function Navbar({
  title,
  onToggleSidebar,
  obsPill
}: {
  title: string
  onToggleSidebar: () => void
  obsPill: React.ReactNode
}) {
  const { t } = useTranslation()
  const theme = useSettingsStore((s) => s.settings?.theme ?? 'dark')
  const update = useSettingsStore((s) => s.update)
  const dark = theme === 'dark'

  return (
    <header
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 14,
        padding: '16px 22px',
        borderBottom: '1px solid var(--border)'
      }}
    >
      <button
        type="button"
        className="as-btn"
        onClick={onToggleSidebar}
        aria-label={t('nav.toggleSidebar')}
        style={{ ...roundBtn, borderRadius: 14 }}
      >
        <MenuIcon />
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', marginRight: 'auto' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('app.name')}</span>
        <span style={{ fontSize: 18, fontWeight: 600 }}>{title}</span>
      </div>
      {obsPill}
      <LanguageSwitch />
      <button
        type="button"
        className="as-btn"
        onClick={() => void update({ theme: dark ? 'light' : 'dark' })}
        aria-label={t('nav.toggleTheme')}
        style={roundBtn}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>
      <PowerMenu />
    </header>
  )
}
