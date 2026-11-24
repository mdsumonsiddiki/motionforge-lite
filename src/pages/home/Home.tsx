import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { openImage, openSaved } from '../../editor/session'
import { handleOpenResult, openErrorKey } from '../../components/document/openErrors'
import { isDirty, useDocumentStore, type Slot } from '../../store/documentStore'
import { useLibraryStore } from '../../store/libraryStore'
import { useNavStore } from '../../store/navStore'
import { pickShownSlot, useOutputStore } from '../../store/outputStore'
import { useSettingsStore } from '../../store/settingsStore'
import { notify } from '../../store/toastStore'
import { ImageIcon } from '../../shell/icons'
import { displayName } from '../../shell/profile'
import { BlobImage } from '../../shell/BlobImage'
import { continueTarget, gettingStarted } from './homeModel'

const cardStyle: CSSProperties = {
  borderRadius: 26,
  background: 'var(--panel)',
  border: '1px solid var(--card-border)'
}

const bigBtn: CSSProperties = {
  minHeight: 48,
  padding: '0 22px',
  borderRadius: 14,
  border: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14
}

/** Output background colours as in the reference (custom = picked image, else gradient). */
const OUTPUT_BG = {
  original: '#ffffff',
  green: '#00b140',
  custom: 'linear-gradient(135deg, #1e3a8a, #9333ea)'
} as const

/** Opens a saved document by id (or focuses it when already open). Returns the slot key. */
async function openSavedById(id: string): Promise<string | null> {
  const open = useDocumentStore.getState().slots.find((s) => s.docId === id)
  if (open) {
    useDocumentStore.getState().setActive(open.key)
    return open.key
  }
  try {
    const result = await openSaved(await window.api.document.load(id))
    handleOpenResult(result)
    return result.status === 'full' ? null : result.key
  } catch (err) {
    notify.error(openErrorKey(err))
    return null
  }
}

/** Paper thumbnail inside the 150×170 well: the document image, or the reference's paper sketch. */
function Thumbnail({ slot }: { slot: Slot | null }) {
  return (
    <div
      className="as-sink"
      style={{
        flex: '0 0 150px',
        height: 170,
        borderRadius: 18,
        background: 'var(--inset)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {slot ? (
        <BlobImage
          image={slot.original}
          style={{
            maxWidth: 104,
            maxHeight: 136,
            borderRadius: 4,
            boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
            objectFit: 'contain'
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            width: 104,
            height: 136,
            background: '#fbfaf6',
            borderRadius: 4,
            boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
            padding: '14px 12px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <span style={{ height: 7, width: '60%', background: '#d9d6cc', borderRadius: 2 }} />
          <span style={{ height: 5, width: '90%', background: '#c9b8ff', borderRadius: 2 }} />
          <span style={{ height: 5, width: '80%', background: '#e5e2d9', borderRadius: 2 }} />
          <span style={{ height: 5, width: '85%', background: '#e5e2d9', borderRadius: 2 }} />
          <span style={{ marginTop: 'auto', height: 34, width: '100%', background: '#ece9e0', borderRadius: 2 }} />
        </div>
      )}
    </div>
  )
}

/** "Continue Editing" card (or "Open your first document" when there is none). */
function ContinueCard() {
  const { t } = useTranslation()
  const navigate = useNavStore((s) => s.navigate)
  const slots = useDocumentStore((s) => s.slots)
  const activeKey = useDocumentStore((s) => s.activeKey)
  const documents = useLibraryStore((s) => s.documents)
  const [busy, setBusy] = useState(false)
  const target = continueTarget(slots, activeKey, documents)

  /** Makes sure the document is open; returns its slot key. */
  const ensureOpen = async (): Promise<string | null> => {
    if (target.kind === 'open') {
      useDocumentStore.getState().setActive(target.slot.key)
      return target.slot.key
    }
    if (target.kind === 'saved') return openSavedById(target.item.id)
    return null
  }

  const run = async (then: (key: string) => void): Promise<void> => {
    setBusy(true)
    try {
      const key = await ensureOpen()
      if (key) then(key)
    } finally {
      setBusy(false)
    }
  }

  const openFirst = async (): Promise<void> => {
    setBusy(true)
    try {
      const picked = await window.api.document.pickImage(t('doc.pickImageTitle'))
      if (!picked) return
      const result = await openImage(picked)
      handleOpenResult(result)
      if (result.status !== 'full') navigate('document')
    } catch (err) {
      notify.error(openErrorKey(err))
    } finally {
      setBusy(false)
    }
  }

  const name = target.kind === 'open' ? target.slot.name : target.kind === 'saved' ? target.item.name : ''
  const detail =
    target.kind === 'open'
      ? t('home.slotStatus', {
          slot: target.slotNumber,
          state: isDirty(target.slot) ? t('home.unsaved') : t('home.allSaved')
        })
      : t('home.savedDocument')

  return (
    <section
      className="as-raise as-glass"
      style={{ ...cardStyle, padding: 22, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}
    >
      <Thumbnail slot={target.kind === 'open' ? target.slot : null} />
      <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {target.kind !== 'none' && (
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--accent-text)' }}>
            {t('home.continue')}
          </span>
        )}
        {target.kind === 'none' ? (
          <>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{t('home.firstTitle')}</h2>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('doc.openImageHint')}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
              <button
                type="button"
                className="as-btn"
                disabled={busy}
                onClick={() => void openFirst()}
                style={{ ...bigBtn, background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 600 }}
              >
                {t('doc.openImage')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                overflowWrap: 'anywhere'
              }}
            >
              {name}
            </h2>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{detail}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
              <button
                type="button"
                className="as-btn"
                disabled={busy}
                onClick={() => void run(() => navigate('document'))}
                style={{ ...bigBtn, background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 600 }}
              >
                {t('home.resume')}
              </button>
              <button
                type="button"
                className="as-btn"
                disabled={busy}
                onClick={() =>
                  void run((key) => {
                    useOutputStore.getState().setDocumentKey(key)
                    navigate('output')
                  })
                }
                style={{ ...bigBtn, background: 'var(--panel)', color: 'var(--text)' }}
              >
                {t('home.sendToOutput')}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/** Mini 16:9 preview of what the Output window shows (document mode, Phase 5). */
function LiveOutputCard() {
  const { t } = useTranslation()
  const slots = useDocumentStore((s) => s.slots)
  const documentKey = useOutputStore((s) => s.documentKey)
  const background = useOutputStore((s) => s.background)
  const customBackground = useOutputStore((s) => s.customBackground)
  const shownKey = pickShownSlot(
    slots.map((s) => s.key),
    documentKey
  )
  const shown = slots.find((s) => s.key === shownKey) ?? null
  const customImage = background === 'custom' ? customBackground : null

  return (
    <section className="as-raise as-glass" style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t('home.liveOutput')}</h2>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('home.offline')}</span>
      </div>
      <div className="as-sink" style={{ borderRadius: 16, padding: 8, background: 'var(--inset)' }}>
        <div
          style={{
            position: 'relative',
            aspectRatio: '16 / 9',
            borderRadius: 10,
            overflow: 'hidden',
            background: OUTPUT_BG[background],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {customImage && (
            <BlobImage
              image={customImage}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {shown ? (
            <BlobImage
              image={shown.original}
              style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span
              style={{
                position: 'relative',
                fontSize: 11,
                color: background === 'original' ? '#5f5980' : '#ffffff'
              }}
            >
              {t('home.noOutput')}
            </span>
          )}
          <span
            style={{
              position: 'absolute',
              left: 8,
              bottom: 8,
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.6)',
              color: '#ffffff'
            }}
          >
            {t('home.previewChip', { source: t('home.sourceDocument') })}
          </span>
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('home.whatObsSees')}</span>
    </section>
  )
}

function StepRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 13,
        color: done ? 'var(--text)' : 'var(--muted)'
      }}
    >
      {done ? (
        <span
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13
          }}
        >
          ✓
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="as-sink"
          style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--inset)' }}
        />
      )}
      {label}
    </div>
  )
}

function GettingStartedCard() {
  const { t } = useTranslation()
  const savedDocs = useLibraryStore((s) => s.documents.length)
  const openDocs = useDocumentStore((s) => s.slots.length)
  const characters = useLibraryStore((s) => s.characters.length)
  const g = gettingStarted(savedDocs + openDocs, characters, false)
  const labels = [t('home.step1'), t('home.step2'), t('home.step3')]
  return (
    <section className="as-raise as-glass" style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t('home.gettingStarted')}</h2>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('home.stepsDone', { done: g.done })}</span>
      </div>
      <div
        className="as-sink"
        role="progressbar"
        aria-label={t('home.gettingStarted')}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={g.done}
        style={{ height: 10, borderRadius: 999, background: 'var(--inset)', overflow: 'hidden' }}
      >
        <div style={{ height: '100%', width: `${g.percent}%`, background: 'var(--accent)', borderRadius: 999 }} />
      </div>
      {g.steps.map((done, i) => (
        <StepRow key={labels[i]} done={done} label={labels[i] ?? ''} />
      ))}
    </section>
  )
}

const tileStyle: CSSProperties = {
  minHeight: 120,
  borderRadius: 20,
  border: 0,
  cursor: 'pointer',
  background: 'var(--panel)',
  color: 'inherit',
  fontFamily: 'inherit',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  textAlign: 'left'
}

const tileWell: CSSProperties = {
  height: 60,
  borderRadius: 12,
  background: 'var(--inset)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

/** Library grid: saved documents (open in the editor) + characters (Human Studio). */
function Library() {
  const { t } = useTranslation()
  const navigate = useNavStore((s) => s.navigate)
  const documents = useLibraryStore((s) => s.documents)
  const characters = useLibraryStore((s) => s.characters)
  const [busy, setBusy] = useState(false)

  const openDoc = async (id: string): Promise<void> => {
    setBusy(true)
    try {
      if (await openSavedById(id)) navigate('document')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t('home.library')}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 18 }}>
        {documents.map((d, i) => (
          <button key={d.id} type="button" className="as-btn" disabled={busy} style={tileStyle} onClick={() => void openDoc(d.id)}>
            <span className="as-sink" style={tileWell}>
              <ImageIcon stroke={i % 2 === 0 ? 'var(--purple)' : 'var(--pink)'} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' }}>{d.name}</span>
          </button>
        ))}
        {characters.map((c) => (
          <button key={c.id} type="button" className="as-btn" style={tileStyle} onClick={() => navigate('human')}>
            <span className="as-sink" style={tileWell}>
              <ImageIcon stroke="var(--teal)" />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' }}>{c.name}</span>
          </button>
        ))}
        {characters.length === 0 && (
          <button
            type="button"
            className="as-btn"
            style={{ ...tileStyle, color: 'var(--muted)' }}
            onClick={() => navigate('human')}
          >
            <span className="as-sink" style={{ ...tileWell, fontSize: 26 }} aria-hidden="true">
              +
            </span>
            <span style={{ fontSize: 13 }}>{t('home.noCharacters')}</span>
          </button>
        )}
      </div>
    </section>
  )
}

/** Home center (UI_REDESIGN.md section 5): greeting, Continue Editing, Live Output, Getting Started, Library. */
export function Home() {
  const { t } = useTranslation()
  const profileName = useSettingsStore((s) => s.settings?.profileName ?? '')
  const refresh = useLibraryStore((s) => s.refresh)

  // Reload the saved lists whenever Home is shown.
  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
          {t('home.hello', { name: displayName(profileName, t('profile.defaultName')) })}
        </h1>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>{t('home.subtitle')}</span>
      </div>
      <ContinueCard />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 }}>
        <LiveOutputCard />
        <GettingStartedCard />
      </div>
      <Library />
    </div>
  )
}
