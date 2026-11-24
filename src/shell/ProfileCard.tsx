import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { version } from '../../package.json'
import { PROFILE_NAME_MAX } from '../../electron/shared/settings'
import { useNavStore } from '../store/navStore'
import { useSettingsStore } from '../store/settingsStore'
import { notify } from '../store/toastStore'
import { CameraIcon, ChevronUpIcon, DownloadIcon, KeyboardIcon, LibraryIcon } from './icons'
import { displayName, initials, photoTargetSize } from './profile'
import { useBackup } from './useBackup'

/** Round avatar with the theme ring + glow (reference: 50px card, 66px popover). */
function Avatar({ size, name, photo }: { size: 50 | 66; name: string; photo: string }) {
  const big = size === 66
  return (
    <span
      style={{
        position: 'relative',
        flex: `0 0 ${size}px`,
        width: size,
        height: size,
        borderRadius: '50%',
        padding: big ? 3 : 2.5,
        boxSizing: 'border-box',
        background: 'var(--ring)',
        boxShadow: 'var(--ring-glow)'
      }}
    >
      <span
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'var(--avatar-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: big ? 22 : 17,
          fontWeight: 700,
          color: 'var(--initials)',
          letterSpacing: big ? undefined : '0.03em',
          overflow: 'hidden'
        }}
      >
        {photo ? (
          <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initials(name)
        )}
      </span>
      {!big && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: 13,
            height: 13,
            borderRadius: '50%',
            background: 'var(--live)',
            border: '2.5px solid var(--side-solid)',
            boxSizing: 'border-box'
          }}
        />
      )}
    </span>
  )
}

/** Downscales a picked JPG / PNG to a small JPEG data URL for settings.json. */
async function toPhotoDataUrl(data: Uint8Array, type: 'jpg' | 'png'): Promise<string> {
  const blob = new Blob([data as BlobPart], { type: type === 'png' ? 'image/png' : 'image/jpeg' })
  const bitmap = await createImageBitmap(blob)
  const size = photoTargetSize(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.drawImage(bitmap, 0, 0, size.width, size.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

const tileStyle: React.CSSProperties = {
  minHeight: 64,
  borderRadius: 16,
  border: 0,
  cursor: 'pointer',
  background: 'var(--panel-solid)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  fontSize: 12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6
}

/** Popover above the profile card (290px): name, Display name, 4 tiles, version + Done. */
function ProfilePopover({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const navigate = useNavStore((s) => s.navigate)
  const { busy, status, backup } = useBackup()
  const [draft, setDraft] = useState(settings?.profileName ?? '')
  const savedName = settings?.profileName ?? ''

  // Save the name shortly after typing stops (live-updates sidebar + Home greeting).
  useEffect(() => {
    if (draft === savedName) return
    const id = window.setTimeout(() => void update({ profileName: draft }), 250)
    return () => window.clearTimeout(id)
  }, [draft, savedName, update])

  const name = displayName(draft, t('profile.defaultName'))
  const photo = settings?.profilePhoto ?? ''

  const changePhoto = async (): Promise<void> => {
    try {
      const picked = await window.api.document.pickImage(t('profile.pickPhoto'))
      if (!picked) return
      await update({ profilePhoto: await toPhotoDataUrl(picked.data, picked.type) })
    } catch {
      notify.error('errors.photoFailed')
    }
  }

  return (
    <div
      role="dialog"
      aria-label={t('profile.title')}
      className="as-raise"
      style={{
        position: 'absolute',
        left: 0,
        bottom: 84,
        zIndex: 30,
        width: 290,
        borderRadius: 24,
        background: 'var(--panel-solid)',
        border: '1px solid var(--accent-line)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '22px 20px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'var(--profile-head)',
          borderBottom: '1px solid var(--accent-line)'
        }}
      >
        <Avatar size={66} name={name} photo={photo} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span
            style={{ fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {name}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('profile.local')}</span>
        </span>
      </div>
      <div style={{ padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
          {t('profile.displayName')}
          <input
            className="as-in as-sink"
            type="text"
            autoFocus
            value={draft}
            maxLength={PROFILE_NAME_MAX}
            placeholder={t('profile.defaultName')}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => draft !== savedName && void update({ profileName: draft })}
            style={{
              minHeight: 44,
              borderRadius: 14,
              border: '1px solid var(--input-border)',
              background: 'var(--inset)',
              color: 'var(--text)',
              padding: '0 14px',
              fontFamily: 'inherit',
              fontSize: 14
            }}
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <button type="button" className="as-btn" style={tileStyle} onClick={() => void changePhoto()}>
            <CameraIcon stroke="var(--accent-text)" />
            {t('profile.changePhoto')}
          </button>
          <button
            type="button"
            className="as-btn"
            style={tileStyle}
            onClick={() => {
              onClose()
              navigate('home')
            }}
          >
            <LibraryIcon stroke="var(--accent-text)" />
            {t('profile.library')}
          </button>
          <button type="button" className="as-btn" style={tileStyle} disabled={busy} onClick={() => void backup()}>
            <DownloadIcon stroke="var(--accent-text)" />
            {t('profile.backup')}
          </button>
          <button
            type="button"
            className="as-btn"
            style={tileStyle}
            disabled
            title={t('common.comingSoon')}
          >
            <KeyboardIcon stroke="var(--accent-text)" />
            {t('profile.shortcuts')}
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{t('common.comingSoon')}</span>
          </button>
        </div>
        {status && (
          <p role="status" style={{ margin: 0, fontSize: 11, color: 'var(--muted)', overflowWrap: 'anywhere' }}>
            {status}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 4px 2px',
            fontSize: 11,
            color: 'var(--muted)'
          }}
        >
          <span>{`MotionForge Lite · ${version}`}</span>
          <button
            type="button"
            className="as-btn"
            onClick={onClose}
            style={{
              minHeight: 34,
              padding: '0 12px',
              borderRadius: 10,
              border: 0,
              cursor: 'pointer',
              background: 'var(--panel-solid)',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: 12
            }}
          >
            {t('profile.done')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Sidebar profile card (UI_REDESIGN.md 4.3): avatar, name, "STUDIO OWNER" badge, chevron.
 * Collapsed sidebar → avatar only. Click opens the profile popover.
 */
export function ProfileCard({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const name = displayName(settings?.profileName ?? '', t('profile.defaultName'))

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={box} style={{ position: 'relative', paddingTop: 10 }}>
      <button
        type="button"
        className={`as-btn ${open ? 'as-on' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={t('profile.menu')}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={collapsed ? name : undefined}
        style={{
          width: '100%',
          minHeight: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12,
          padding: 9,
          borderRadius: 22,
          border: '1px solid var(--accent-line)',
          cursor: 'pointer',
          background: 'var(--profile-bg)',
          color: 'var(--text)',
          fontFamily: 'inherit',
          textAlign: 'left'
        }}
      >
        <Avatar size={50} name={name} photo={settings?.profilePhoto ?? ''} />
        {!collapsed && (
          <>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span
                style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {name}
              </span>
              <span
                style={{
                  alignSelf: 'flex-start',
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  padding: '3px 8px',
                  borderRadius: 999,
                  color: 'var(--on-accent)',
                  background: 'var(--badge)'
                }}
              >
                {t('profile.badge')}
              </span>
            </span>
            <ChevronUpIcon stroke="var(--muted)" />
          </>
        )}
      </button>
      {open && <ProfilePopover onClose={() => setOpen(false)} />}
    </div>
  )
}
