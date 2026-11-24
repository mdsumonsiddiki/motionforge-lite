import { useTranslation } from 'react-i18next'
import { MAX_SLOTS } from '../../editor/types'
import { useDocumentStore } from '../../store/documentStore'
import { useLibraryStore } from '../../store/libraryStore'
import { useBackup } from '../../shell/useBackup'

function Count({ value, color, label, small }: { value: string; color: string; label: string; small?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span
        className="as-raise"
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: 'var(--panel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: small ? 13 : undefined,
          color
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
    </div>
  )
}

/** Home right panel: Overview counts + "Back up your work" card (existing Backup). */
export function HomePanel() {
  const { t } = useTranslation()
  const documents = useLibraryStore((s) => s.documents.length)
  const characters = useLibraryStore((s) => s.characters.length)
  const open = useDocumentStore((s) => s.slots.length)
  const { busy, status, backup } = useBackup()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{t('home.overview')}</h2>
      <Count value={String(documents)} color="var(--purple)" label={t('home.savedDocuments')} />
      <Count value={String(characters)} color="var(--pink)" label={t('home.savedCharacters')} />
      <Count value={`${open}/${MAX_SLOTS}`} color="var(--teal)" label={t('home.slotsInUse')} small />
      <div
        className="as-raise"
        style={{
          borderRadius: 22,
          padding: 18,
          background: 'var(--feature)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginTop: 6
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>{t('home.backupTitle')}</span>
        <span style={{ fontSize: 13, lineHeight: 1.5, color: '#e4dcff' }}>{t('home.backupText')}</span>
        <button
          type="button"
          className="as-btn"
          disabled={busy}
          onClick={() => void backup()}
          style={{
            minHeight: 46,
            borderRadius: 999,
            border: 0,
            cursor: 'pointer',
            background: '#ffffff',
            color: '#2a0f8c',
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: 13
          }}
        >
          {t('home.backupNow')}
        </button>
        {status && (
          <span role="status" style={{ fontSize: 12, color: '#e4dcff', overflowWrap: 'anywhere' }}>
            {status}
          </span>
        )}
      </div>
    </div>
  )
}
