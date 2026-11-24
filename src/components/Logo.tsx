import { useTranslation } from 'react-i18next'

/** Small custom icon with "MotionForge Lite" next to it (spec section 6). */
export function Logo() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-indigo-600" />
        {/* Stylised "M" with a motion streak */}
        <path
          d="M7 23V9l9 9 9-9v14"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
    </div>
  )
}
