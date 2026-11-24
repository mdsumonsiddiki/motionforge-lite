import type { ReactNode } from 'react'

/**
 * Line icons of the app shell, copied from docs/ui-reference/AppShell.reference.html.
 * Decorative: always aria-hidden (the button around them carries the label).
 */
function Svg({
  size = 20,
  stroke = 'currentColor',
  width = 2,
  join,
  children
}: {
  size?: number
  stroke?: string
  width?: number
  join?: boolean
  children: ReactNode
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin={join ? 'round' : undefined}
      aria-hidden="true"
      style={{ flex: `0 0 ${size}px` }}
    >
      {children}
    </svg>
  )
}

type P = { size?: number; stroke?: string }

export const HomeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </Svg>
)
export const HumanIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M5 21c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5" />
  </Svg>
)
export const DocIcon = (p: P) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Svg>
)
export const CamIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="M16 10l5-3v10l-5-3z" />
  </Svg>
)
export const GearIcon = (p: P) => (
  <Svg {...p} join>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
)
export const MenuIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h10M4 18h16" />
  </Svg>
)
export const SunIcon = (p: P) => (
  <Svg size={19} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)
export const MoonIcon = (p: P) => (
  <Svg size={19} {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Svg>
)
export const PowerIcon = ({ size = 19, ...p }: P) => (
  <Svg size={size} width={2.2} {...p}>
    <path d="M12 3v9" />
    <path d="M6.3 7.3a8 8 0 1 0 11.4 0" />
  </Svg>
)
export const RestartIcon = (p: P) => (
  <Svg size={18} {...p}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 3v6h-6" />
  </Svg>
)
export const ChevronUpIcon = (p: P) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.stroke ?? 'currentColor'} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flex: '0 0 16px' }}>
    <path d="M7 14l5-5 5 5" />
  </svg>
)
export const CameraIcon = (p: P) => (
  <Svg size={18} {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
)
export const LibraryIcon = (p: P) => (
  <Svg size={18} {...p}>
    <rect x="3" y="4" width="7" height="7" rx="1.5" />
    <rect x="14" y="4" width="7" height="7" rx="1.5" />
    <rect x="3" y="15" width="7" height="6" rx="1.5" />
    <rect x="14" y="15" width="7" height="6" rx="1.5" />
  </Svg>
)
export const DownloadIcon = (p: P) => (
  <Svg size={18} {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </Svg>
)
export const KeyboardIcon = (p: P) => (
  <Svg size={18} {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  </Svg>
)
export const ImageIcon = (p: P) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={p.stroke ?? 'currentColor'} strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
)

/** Filled person silhouette (output previews, reference viewBox 0 0 170 200). */
export const Silhouette = ({ width, height }: { width: number; height: number }) => (
  <svg width={width} height={height} viewBox="0 0 170 200" aria-hidden="true">
    <circle cx="85" cy="70" r="42" fill="#c9c4d8" />
    <path d="M18 196c0-42 30-68 67-68s67 26 67 68z" fill="#c9c4d8" />
  </svg>
)
