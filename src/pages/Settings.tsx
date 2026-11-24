import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Language, Settings as SettingsData, Theme } from '../../electron/shared/settings'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Segmented } from '../components/Segmented'
import { useDocumentStore } from '../store/documentStore'
import { useLibraryStore } from '../store/libraryStore'
import { useSettingsStore } from '../store/settingsStore'
import { notify } from '../store/toastStore'

/**
 * Settings page: Language, Theme, OBS Path, Backup / Restore.
 * (API Key and Output info are added in later phases.)
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

      <Field label={t('settings.reduceEffects')} hint={t('settings.reduceEffectsHint')}>
        <Segmented<'off' | 'on'>
          value={settings.reduceEffects ? 'on' : 'off'}
          onChange={(v) => void update({ reduceEffects: v === 'on' })}
          options={[
            { value: 'off', label: t('settings.off') },
            { value: 'on', label: t('settings.on') }
          ]}
        />
      </Field>

      <Field label={t('settings.obsPath')} hint={t('settings.obsPathHint')}>
        {/* key: re-mount the input when the saved path changes (Browse / Auto-detect). */}
        <ObsPathInput key={settings.obsPath} settings={settings} onSave={update} />
      </Field>

      <Field label={t('backup.title')} hint={t('backup.hint')}>
        <BackupRestore />
      </Field>
    </div>
  )
}

/**
 * Backup (user picks a folder) and Restore (confirmation, then user picks the zip).
 * The result is shown as a line of text under the buttons, not as a toast
 * (spec section 6 allows only "Generation Complete" and "Error" notifications).
 */
function BackupRestore() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const reloadSettings = useSettingsStore((s) => s.load)
  const refreshLibrary = useLibraryStore((s) => s.refresh)

  const backup = async (): Promise<void> => {
    setBusy(true)
    setStatus(null)
    try {
      const result = await window.api.backup.create(t('backup.pickFolder'))
      if (result.status === 'done') setStatus(t('backup.saved', { file: result.file }))
    } catch {
      notify.error('errors.backupFailed')
    } finally {
      setBusy(false)
    }
  }

  const restore = async (): Promise<void> => {
    setConfirmRestore(false)
    setBusy(true)
    setStatus(null)
    try {
      const result = await window.api.backup.restore(t('backup.pickFile'))
      if (result.status === 'done') {
        // Restored settings (theme, language) and name lists take effect right away.
        await Promise.all([reloadSettings(), refreshLibrary()])
        // Open documents may no longer exist on disk: treat them as new, unsaved documents.
        const docs = useDocumentStore.getState()
        for (const s of docs.slots) {
          if (s.docId) docs.update(s.key, { docId: null, savedEdits: null, savedName: null })
        }
        setStatus(t('backup.restored'))
      }
    } catch {
      notify.error('errors.restoreFailed')
    } finally {
      setBusy(false)
    }
  }

  const buttonClass =
    'rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800'

  return (
    <div>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void backup()} className={buttonClass}>
          {t('backup.backup')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmRestore(true)}
          className={buttonClass}
        >
          {t('backup.restore')}
        </button>
      </div>
      {status && (
        <p role="status" className="mt-2 text-sm break-all text-emerald-600 dark:text-emerald-400">
          {status}
        </p>
      )}
      <ConfirmDialog
        open={confirmRestore}
        title={t('backup.restoreTitle')}
        message={t('backup.restoreMessage')}
        confirmLabel={t('backup.restore')}
        cancelLabel={t('close.cancel')}
        onCancel={() => setConfirmRestore(false)}
        onConfirm={() => void restore()}
      />
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
        className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 font-mono text-sm"
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
