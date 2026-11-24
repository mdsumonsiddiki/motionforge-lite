import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLibraryStore } from '../store/libraryStore'
import { Btn, Chip, Muted, PanelTitle } from '../shell/ui'
import { fieldStyle } from '../shell/styles'

/**
 * Human Studio center (UI_REDESIGN.md section 5). The studio is built in Phases 6–8:
 * until then this is a placeholder stage with the reference look.
 */
export function HumanStudio() {
  const { t } = useTranslation()
  const characters = useLibraryStore((s) => s.characters.length)
  const refresh = useLibraryStore((s) => s.refresh)

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
      <div
        className="as-sink"
        style={{
          flex: 1,
          minHeight: 480,
          borderRadius: 26,
          background: 'var(--inset)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          position: 'relative',
          padding: 24,
          textAlign: 'center'
        }}
      >
        <span
          className="as-raise"
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            fontSize: 12,
            padding: '7px 13px',
            borderRadius: 999,
            background: 'var(--panel)',
            color: 'var(--muted)'
          }}
        >
          {t('human.previewChip')}
        </span>
        <svg width="170" height="200" viewBox="0 0 170 200" aria-hidden="true">
          <circle cx="85" cy="70" r="42" fill="none" stroke="var(--muted)" strokeWidth="3" strokeDasharray="6 7" />
          <path
            d="M18 196c0-42 30-68 67-68s67 26 67 68"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="3"
            strokeDasharray="6 7"
          />
        </svg>
        <span style={{ fontSize: 18, fontWeight: 600 }}>{t('human.noCharacter')}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('human.noCharacterHint')}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-text)' }}>{t('human.comingSoon')}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Chip>{t('human.savedChip', { count: characters })}</Chip>
        <Chip>{t('human.headLimitChip')}</Chip>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 12,
  color: 'var(--muted)'
}

/** One disabled slider of the reference (Pose & Expression). */
function Slider({ label, min, max, value }: { label: string; min: number; max: number; value: number }) {
  return (
    <label style={labelStyle}>
      {label}
      <input className="as-range as-in" type="range" min={min} max={max} defaultValue={value} disabled />
    </label>
  )
}

/** Human Studio right panel: every control disabled + "Coming soon (Phase 6–8)". */
export function HumanStudioPanel() {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PanelTitle>{t('human.character')}</PanelTitle>
      <Muted style={{ color: 'var(--accent-text)', fontWeight: 600 }}>{t('human.comingSoon')}</Muted>
      <div style={{ display: 'flex', gap: 12 }}>
        <Btn tone="accent" disabled title={t('human.comingSoon')} style={{ flex: 1 }}>
          {t('human.uploadPhoto')}
        </Btn>
        <Btn disabled title={t('human.comingSoon')} style={{ flex: 1 }}>
          {t('human.generate')}
        </Btn>
      </div>
      <PanelTitle sub>{t('human.poseExpression')}</PanelTitle>
      <Slider label={t('human.headTurn')} min={-20} max={20} value={0} />
      <Slider label={t('human.headTilt')} min={-20} max={20} value={0} />
      <Slider label={t('human.eyes')} min={0} max={100} value={0} />
      <Slider label={t('human.smile')} min={0} max={100} value={20} />
      <Slider label={t('human.zoom')} min={50} max={150} value={100} />
      <label style={labelStyle}>
        {t('human.textCommand')}
        <input
          className="as-in as-sink"
          type="text"
          disabled
          placeholder={t('human.textCommandPlaceholder')}
          style={{ ...fieldStyle, opacity: 0.55, cursor: 'not-allowed' }}
        />
      </label>
      <Btn tone="accent" disabled title={t('human.comingSoon')}>
        {t('human.saveCharacter')}
      </Btn>
    </div>
  )
}
