import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { OUTPUT_FPS, type Direction, type Orientation } from '../../electron/shared/output'
import { Segmented } from '../components/Segmented'
import { useDocumentStore } from '../store/documentStore'
import { useNavStore } from '../store/navStore'
import { pickShownSlot, useOutputStore } from '../store/outputStore'
import { notify } from '../store/toastStore'

const btn =
  'rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Webcam Output page (spec section 10). Controls for the separate Output window, which OBS
 * captures. Phase 5: Document mode (Human mode follows in Phase 9).
 */
export function WebcamOutput() {
  const { t } = useTranslation()
  const o = useOutputStore()
  const slots = useDocumentStore((s) => s.slots)
  const navigate = useNavStore((s) => s.navigate)
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

  const launchObs = async (): Promise<void> => {
    setObsStatus(null)
    const result = await window.api.obsControl.launch()
    if (result === 'launched') setObsStatus(t('output.obsLaunched'))
    else notify.error(`errors.obs_${result}`)
  }

  const closeObs = async (): Promise<void> => {
    setObsStatus(null)
    const result = await window.api.obsControl.close()
    if (result === 'closing') setObsStatus(t('output.obsClosing'))
    else if (result === 'notRunning') setObsStatus(t('output.obsNotRunning'))
    else notify.error('errors.obs_closeFailed')
  }

  const arrows: { dir: Direction; label: string }[] = [
    { dir: 'up', label: '↑' },
    { dir: 'left', label: '←' },
    { dir: 'right', label: '→' },
    { dir: 'down', label: '↓' }
  ]

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 p-6">
      <div className="space-y-4">
        <Card title={t('output.window')}>
          <div className="flex items-center gap-3">
            {o.windowOpen ? (
              <button type="button" onClick={() => void window.api.output.close()} className={btn}>
                {t('output.closeWindow')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void openWindow()}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
              >
                {t('output.openWindow')}
              </button>
            )}
            <span className="text-xs text-neutral-500">
              {o.windowOpen ? t('output.windowOpen') : t('output.windowClosed')}
            </span>
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">{t('output.size')}</div>
            <Segmented<Orientation>
              value={o.orientation}
              onChange={changeOrientation}
              options={[
                { value: 'landscape', label: t('output.landscape') },
                { value: 'portrait', label: t('output.portrait') }
              ]}
            />
          </div>
          <p className="text-xs text-neutral-500">{t('output.fpsInfo', { fps: OUTPUT_FPS })}</p>
        </Card>

        <Card title={t('output.document')}>
          {slots.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500">{t('output.noDocuments')}</p>
              <button type="button" onClick={() => navigate('document')} className={btn}>
                {t('dashboard.document')}
              </button>
            </div>
          ) : (
            <Segmented<string>
              value={shownKey ?? ''}
              onChange={(key) => o.setDocumentKey(key)}
              options={slots.map((s) => ({ value: s.key, label: s.name }))}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={o.zoomIn} className={btn} aria-label={t('output.zoomIn')}>
              {t('output.zoomIn')}
            </button>
            <button type="button" onClick={o.zoomOut} className={btn} aria-label={t('output.zoomOut')}>
              {t('output.zoomOut')}
            </button>
            {arrows.map((a) => (
              <button
                key={a.dir}
                type="button"
                onClick={() => o.move(a.dir)}
                className={btn}
                aria-label={t(`output.move_${a.dir}`)}
                title={t(`output.move_${a.dir}`)}
              >
                {a.label}
              </button>
            ))}
            <button type="button" onClick={o.resetView} className={btn}>
              {t('output.resetPosition')}
            </button>
          </div>
        </Card>

        <Card title={t('output.background')}>
          <Segmented
            value={o.background}
            onChange={(b) => (b === 'custom' && !o.customBackground ? void pickBackground() : o.setBackground(b))}
            options={[
              { value: 'original', label: t('output.bgOriginal') },
              { value: 'green', label: t('output.bgGreen') },
              { value: 'custom', label: t('output.bgCustom') }
            ]}
          />
          <div>
            <button type="button" onClick={() => void pickBackground()} className={btn}>
              {t('output.chooseBackground')}
            </button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card title={t('output.obs')}>
          <div className="flex gap-2">
            <button type="button" onClick={() => void launchObs()} className={btn}>
              {t('output.launchObs')}
            </button>
            <button type="button" onClick={() => void closeObs()} className={btn}>
              {t('output.closeObs')}
            </button>
          </div>
          {obsStatus && (
            <p role="status" className="text-xs text-emerald-600 dark:text-emerald-400">
              {obsStatus}
            </p>
          )}
          <p className="text-xs text-neutral-500">{t('output.obsPathHint')}</p>
        </Card>

        <Card title={t('output.howTo')}>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>{t('output.step1')}</li>
            <li>{t('output.step2')}</li>
            <li>{t('output.step3')}</li>
            <li>{t('output.step4')}</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
