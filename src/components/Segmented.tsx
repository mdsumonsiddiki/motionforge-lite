/** Toggle between a few options (Language, Theme, Output size, Background, ...). */
export function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-neutral-300 p-1 dark:border-neutral-700">
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
