import { useTranslation } from 'react-i18next'

/**
 * Temporary page body for sections built in later phases.
 * Uses the app layout rule: controls on the left, preview on the right (spec section 6).
 */
export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-neutral-200 p-6 dark:border-neutral-800">
        <h1 className="text-xl font-semibold">{t(titleKey)}</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {t('pages.comingSoon')}
        </p>
      </aside>
      <section className="flex-1 bg-neutral-100 dark:bg-neutral-950" />
    </div>
  )
}
