import { cn } from '@/lib/cn'

/**
 * A filter chip carrying its own count.
 *
 * Shared by the live board's state rail and the alerts page's category and
 * priority rails — three rails that were the same markup three times, and had
 * already started to drift on focus ring and padding.
 */
export function CountChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
        active
          ? 'border-brand-600 bg-brand-50 text-brand-700'
          : 'border-line text-ink-muted hover:text-ink',
      )}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  )
}
