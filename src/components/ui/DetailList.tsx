import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface DetailItem {
  label: string
  value: ReactNode
  /** Extra line beneath the value, e.g. "(Age 36)". */
  hint?: string
  /** Spans both columns in the stacked variant. */
  wide?: boolean
}

/**
 * Label above value, two per row on wider screens. Used where the label is a
 * field name rather than a metric, e.g. Personal Information.
 */
export function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(({ label, value, hint, wide }) => (
        <div key={label} className={cn('min-w-0', wide && 'sm:col-span-2')}>
          <dt className="text-ink-subtle text-xs font-medium tracking-wider uppercase">
            {label}
          </dt>
          <dd className="text-ink mt-1 text-sm break-words">
            {value}
            {hint && <span className="text-ink-subtle"> {hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Label left, value right, one per row. Used for summary readouts where the
 * value is the thing being scanned.
 */
export function DetailRows({
  items,
  divided,
}: {
  items: DetailItem[]
  divided?: boolean
}) {
  return (
    <dl className={cn('text-sm', divided && 'divide-line divide-y')}>
      {items.map(({ label, value }) => (
        <div
          key={label}
          className={cn(
            'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5',
            divided ? 'py-2.5 first:pt-0 last:pb-0' : 'py-1.5',
          )}
        >
          <dt className="text-ink-muted shrink-0">{label}</dt>
          <dd className="text-ink min-w-0 text-right font-medium break-words">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
