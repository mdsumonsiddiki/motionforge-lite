import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  OUTPUT_FPS,
  OUTPUT_SIZE,
  type Direction,
  type Orientation,
  type OutputBackground
} from '../../electron/shared/output'
import { OutputPreview } from '../output/OutputPreview'
import { useDocumentStore } from '../store/documentStore'
import { useNavStore } from '../store/navStore'
import { OBS_LIVE_ENABLED, useObsStore } from '../store/obsStore'
import { pickShownSlot, useOutputStore } from '../store/outputStore'
import { notify } from '../store/toastStore'
import { Btn, Card, Chip, Muted, PanelTitle } from '../shell/ui'

/** A two/three-way choice button (reference: Source / Background buttons). */
function Choice({
  on,
  disabled,
  onClick,
  children,
  small,
  title
}: {
  on: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  small?: boolean
  title?: string
}) {
  return (
    <Btn
      on={on}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      title={title}
      style={{
        flex: 1,
        fontWeight: 600,
        fontSize: small ? 12 : 13,
        color: on ? 'var(--accent-text)' : 'var(--muted)',
        padding: '0 8px'
      }}
    >
      {children}
    </Btn>
  )
}

/**
 * Webcam Output center (spec section 10, UI_REDESIGN.md section 5): sunken frame with the
 * live output preview, source label, size / background chips, and the OBS how-to.
 */
export function WebcamOutput() {
  const { t } = useTranslation()
  const orientation = useOutputStore((s) => s.orientation)
  const background = useOutputStore((s) => s.background)
  const obsStatus = useObsStore((s) => s.status)
  const hasDocument = useDocumentStore((s) => s.slots.length > 0)
  const size = OUTPUT_SIZE[orientation]
  const portrait = orientation === 'portrait'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
      <div className="as-sink" style={{ borderRadius: 26, padding: 16, background: 'var(--inset)' }}>
        <div
          style={{
            position: 'relative',
            width: portrait ? 'auto' : '100%',
            height: portrait ? 'min(60vh, 640px)' : undefined,
            aspectRatio: portrait ? '9 / 16' : '16 / 9',
            margin: '0 auto',
            borderRadius: 14,
            overflow: 'hidden',
            background: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 18px 36px rgba(0,0,0,0.3)'
          }}
        >
          <OutputPreview style={{ position: 'absolute', inset: 0 }} />
          {!hasDocument && (
            <span
              style={{
                position: 'relative',
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.6)',
                color: '#ffffff'
              }}
            >
              {t('home.noOutput')}
            </span>
          )}
          <span
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.6)',
              color: '#ffffff'
            }}
          >
            {t('output.sourceLabel', { source: t('home.sourceDocument') })}
          </span>
          {OBS_LIVE_ENABLED && obsStatus === 'live' && (
            <span
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'var(--go-live)',
                color: '#ffffff'
              }}
            >
              {t('home.live')}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Chip>{t('output.sizeChip', { w: size.width, h: size.height, fps: OUTPUT_FPS })}</Chip>
        <Chip>{t('output.bgChip', { bg: t(`output.bgLabel_${background}`) })}</Chip>
      </div>
      <Card>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t('output.howTo')}</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <li>{t('output.step1')}</li>
          <li>{t('output.step2')}</li>
          <li>{t('output.step3')}</li>
          <li>{t('output.step4')}</li>
        </ol>
      </Card>
    </div>
  )
}

/**
 * Webcam Output right panel: Source, Background, Output window, OBS, Go Live (Coming soon),
 * then the existing size / document / position controls.
 */
export function WebcamOutputPanel() {
  const { t } = useTranslation()
  const o = useOutputStore()
  const slots = useDocumentStore((s) => s.slots)
  const navigate = useNavStore((s) => s.navigate)
  const refreshObs = useObsStore((s) => s.refresh)
  const [obsStatus, setObsStatus] = useState<string | null>(null)

  const shownKey = pickShownSlot(
    slots.map((s) => s.key),
    o.documentKey
  )

  const openWindow = async (): Promise<void> => {
    if (!(await window.api.output.open(o.orientation))) notify.error('errors.outputFailed')
  }

  const changeOrientation = (orientation: Orientation): void => {
    o.setOrientation(orientation)
    if (o.windowOpen) void window.api.output.setOrientation(orientation)
  }

  const pickBackground = async (): Promise<void> => {
    try {
      const picked = await window.api.document.pickImage(t('output.pickBackground'))
      if (picked) o.setCustomBackground({ type: picked.type, data: picked.data })
    } catch {
      notify.error('errors.openFailed')
    }
  }

  const chooseBackground = (b: OutputBackground): void => {
    if (b === 'custom' && !o.customBackground) void pickBackground()
    else o.setBackground(b)
  }

  const launchObs = async (): Promise<void> => {
    setObsStatus(null)
    const result = await window.api.obsControl.launch()
    if (result === 'launched') setObsStatus(t('output.obsLaunched'))
    else notify.error(`errors.obs_${result}`)
    void refreshObs()
  }

  const closeObs = async (): Promise<void> => {
    setObsStatus(null)
    const result = await window.api.obsControl.close()
    if (result === 'closing') setObsStatus(t('output.obsClosing'))
    else if (result === 'notRunning') setObsStatus(t('output.obsNotRunning'))
    else notify.error('errors.obs_closeFailed')
    void refreshObs()
  }

  const arrows: { dir: Direction; label: string }[] = [
    { dir: 'up', label: '↑' },
    { dir: 'left', label: '←' },
    { dir: 'right', label: '→' },
    { dir: 'down', label: '↓' }
  ]
  const small = { minHeight: 40, padding: '0 12px', fontSize: 12 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PanelTitle>{t('output.title')}</PanelTitle>

      <Muted>{t('output.source')}</Muted>
      <div style={{ display: 'flex', gap: 12 }}>
        <Choice on={false} disabled onClick={() => undefined} title={t('output.humanSoon')}>
          {t('output.sourceHuman')}
        </Choice>
        <Choice on onClick={() => undefined}>
          {t('home.sourceDocument')}
        </Choice>
      </div>
      <Muted>{t('output.humanSoon')}</Muted>

      <Muted>{t('output.background')}</Muted>
      <div style={{ display: 'flex', gap: 10 }}>
        <Choice small on={o.background === 'original'} onClick={() => chooseBackground('original')}>
          {t('output.bgOriginal')}
        </Choice>
        <Choice small on={o.background === 'green'} onClick={() => chooseBackground('green')}>
          {t('output.bgGreenShort')}
        </Choice>
        <Choice small on={o.background === 'custom'} onClick={() => chooseBackground('custom')}>
          {t('output.bgCustomShort')}
        </Choice>
      </div>
      <Btn onClick={() => void pickBackground()} style={small}>
        {t('output.chooseBackground')}
      </Btn>

      {o.windowOpen ? (
        <Btn onClick={() => void window.api.output.close()}>{t('output.closeWindow')}</Btn>
      ) : (
        <Btn onClick={() => void openWindow()}>{t('output.openWindow')}</Btn>
      )}
      <Muted>{o.windowOpen ? t('output.windowOpen') : t('output.windowClosed')}</Muted>

      <div style={{ display: 'flex', gap: 12 }}>
        <Btn onClick={() => void launchObs()} style={{ flex: 1 }}>
          {t('output.launchObs')}
        </Btn>
        <Btn onClick={() => void closeObs()} style={{ flex: 1 }}>
          {t('output.closeObs')}
        </Btn>
      </div>
      {obsStatus && (
        <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
          {obsStatus}
        </p>
      )}
      <Muted>{t('output.obsPathHint')}</Muted>

      {/* Go Live needs OBS WebSocket (not built yet): disabled until LIVE detection exists. */}
      <Btn
        tone="go"
        disabled={!OBS_LIVE_ENABLED}
        title={t('common.comingSoon')}
        style={{ minHeight: 52, fontSize: 14 }}
      >
        {t('output.goLive')} · {t('common.comingSoon')}
      </Btn>

      <PanelTitle sub>{t('output.size')}</PanelTitle>
      <div style={{ display: 'flex', gap: 10 }}>
        <Choice small on={o.orientation === 'landscape'} onClick={() => changeOrientation('landscape')}>
          {t('output.landscape')}
        </Choice>
        <Choice small on={o.orientation === 'portrait'} onClick={() => changeOrientation('portrait')}>
          {t('output.portrait')}
        </Choice>
      </div>
      <Muted>{t('output.fpsInfo', { fps: OUTPUT_FPS })}</Muted>

      <PanelTitle sub>{t('output.document')}</PanelTitle>
      {slots.length === 0 ? (
        <>
          <Muted>{t('output.noDocuments')}</Muted>
          <Btn onClick={() => navigate('document')}>{t('nav.document')}</Btn>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {slots.map((s) => (
            <Choice key={s.key} small on={s.key === shownKey} onClick={() => o.setDocumentKey(s.key)}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {s.name}
              </span>
            </Choice>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Btn onClick={o.zoomIn} style={small}>
          {t('output.zoomIn')}
        </Btn>
        <Btn onClick={o.zoomOut} style={small}>
          {t('output.zoomOut')}
        </Btn>
        {arrows.map((a) => (
          <Btn
            key={a.dir}
            onClick={() => o.move(a.dir)}
            aria-label={t(`output.move_${a.dir}`)}
            title={t(`output.move_${a.dir}`)}
            style={{ ...small, minWidth: 40, padding: 0 }}
          >
            {a.label}
          </Btn>
        ))}
        <Btn onClick={o.resetView} style={small}>
          {t('output.resetPosition')}
        </Btn>
      </div>
    </div>
  )
}
