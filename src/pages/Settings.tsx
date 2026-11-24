import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Language, Settings as SettingsData, Theme } from '../../electron/shared/settings'
import { useSettingsStore } from '../store/settingsStore'
import { notify } from '../store/toastStore'

/**
 * Settings page. Phase 2: Language, Theme, OBS Path.
 * (API Key, Backup, Restore and Output info are added in later phases.)
 */
export function Settings() {
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)

  if (!settings) return null

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>

      <Field label={t('settings.language')}>
        <Segmented<Language>
          value={settings.language}
          onChange={(language) => void update({ language })}
          options={[
            { value: 'en', label: t('settings.languageEn') },
            { value: 'bn', label: t('settings.languageBn') }
          ]}
        />
      </Field>

      <Field label={t('settings.theme')}>
        <Segmented<Theme>
          value={settings.theme}
          onChange={(theme) => void update({ theme })}
          options={[
            { value: 'dark', label: t('settings.themeDark') },
            { value: 'light', label: t('settings.themeLight') }
          ]}
        />
      </Field>

      <Field label={t('settings.obsPath')} hint={t('settings.obsPathHint')}>
        {/* key: re-mount the input when the saved path changes (Browse / Auto-detect). */}
        <ObsPathInput key={settings.obsPath} settings={settings} onSave={update} />
      </Field>
    </div>
  )
}

/** OBS path text box. Saved on blur / Enter (not on every keystroke). */
function ObsPathInput({
  settings,
  onSave
}: {
  settings: SettingsData
  onSave: (patch: Partial<SettingsData>) => Promise<void>
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(settings.obsPath)

  const commit = (): void => {
    if (draft.trim() !== settings.obsPath) void onSave({ obsPath: draft })
  }

  const browse = async (): Promise<void> => {
    const picked = await window.api.obs.browse(t('settings.obsBrowseTitle'))
    if (picked) void onSave({ obsPath: picked })
  }

  const detect = async (): Promise<void> => {
    const found = await window.api.obs.detect()
    if (found) void onSave({ obsPath: found })
    else notify.error('errors.obsNotFound')
  }

  const buttonClass =
    'shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800'

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={draft}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-neutral-700"
      />
      <button type="button" onClick={() => void browse()} className={buttonClass}>
        {t('settings.obsBrowse')}
      </button>
      <button type="button" onClick={() => void detect()} className={buttonClass}>
        {t('settings.obsDetect')}
      </button>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{label}</div>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
    </div>
  )
}

/** Two-or-more option toggle (used for Language and Theme). */
function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-300 p-1 dark:border-neutral-700">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-4 py-1.5 text-sm ${
            opt.value === value
              ? 'bg-indigo-600 text-white'
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
