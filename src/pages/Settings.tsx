import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Language, Settings as SettingsData, Theme } from '../../electron/shared/settings'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Segmented } from '../components/Segmented'
import { useDocumentStore } from '../store/documentStore'
import { useLibraryStore } from '../store/libraryStore'
import { useSettingsStore } from '../store/settingsStore'
import { notify } from '../store/toastStore'
import { Btn, Card, Muted } from '../shell/ui'
import { fieldStyle } from '../shell/styles'

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
    <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>{t('settings.title')}</h1>

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

  return (
    <div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Btn disabled={busy} onClick={() => void backup()} style={{ padding: '0 20px' }}>
          {t('backup.backup')}
        </Btn>
        <Btn disabled={busy} onClick={() => setConfirmRestore(true)} style={{ padding: '0 20px' }}>
          {t('backup.restore')}
        </Btn>
      </div>
      {status && (
        <p role="status" style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)', overflowWrap: 'anywhere' }}>
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

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <input
        className="as-in as-sink"
        type="text"
        value={draft}
        spellCheck={false}
        aria-label={t('settings.obsPath')}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        style={{ ...fieldStyle, flex: 1, minWidth: 0, fontFamily: 'ui-monospace, Consolas, monospace' }}
      />
      <Btn onClick={() => void browse()} style={{ padding: '0 16px', flexShrink: 0 }}>
        {t('settings.obsBrowse')}
      </Btn>
      <Btn onClick={() => void detect()} style={{ padding: '0 16px', flexShrink: 0 }}>
        {t('settings.obsDetect')}
      </Btn>
    </div>
  )
}

/** One settings row as a raised card (UI_REDESIGN.md look). */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Card style={{ padding: 20, gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{label}</h2>
      {children}
      {hint && <Muted>{hint}</Muted>}
    </Card>
  )
}
