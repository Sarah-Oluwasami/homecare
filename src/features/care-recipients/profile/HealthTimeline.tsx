import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { EventCategory, HealthEvent } from '../health-data'
import { EVENTS_PAGE_SIZE, eventFilters } from '../health-data'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { toneDot, tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

type Filter = EventCategory | 'all'

/** Anchored to the sample's "today" rather than the wall clock. */
const RANGE_ANCHOR = new Date('2026-07-24T00:00:00Z').getTime()
const DAY_MS = 86_400_000

const rangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
]

function withinRange(event: HealthEvent, range: string): boolean {
  if (range === 'all') return true
  const days = Number(range)
  if (!Number.isFinite(days)) return true
  const t = new Date(`${event.date}T00:00:00Z`).getTime()
  return RANGE_ANCHOR - t <= days * DAY_MS
}

export function HealthTimeline({ events }: { events: HealthEvent[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [range, setRange] = useState('all')
  const [visible, setVisible] = useState(EVENTS_PAGE_SIZE)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Sorted defensively — nothing enforces the source array's order.
    const ordered = [...events].sort((a, b) => b.date.localeCompare(a.date))
    return ordered.filter((e) => {
      if (filter !== 'all' && e.category !== filter) return false
      if (!withinRange(e, range)) return false
      if (!q) return true
      return [e.title, e.detail, e.recordedBy, e.dateLabel, e.badge]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [events, filter, query, range])

  const shown = rows.slice(0, visible)
  const remaining = rows.length - shown.length

  /** Any filter change restarts paging, else the count carries over. */
  const reset = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value)
    setVisible(EVENTS_PAGE_SIZE)
  }

  return (
    <section aria-labelledby="health-timeline" className="card overflow-hidden">
      <h2 id="health-timeline" className="sr-only">
        Health event timeline
      </h2>

      {/* Six pills plus search and range need ~980px; 2xl, not xl */}
      <div className="border-line flex flex-col gap-3 border-b p-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div
          role="group"
          aria-label="Filter health events"
          className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1"
        >
          {eventFilters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => reset(setFilter)(value)}
              className={cn(
                'min-h-10 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors',
                filter === value
                  ? 'bg-brand-600 text-white'
                  : 'text-ink-muted hover:bg-sunken',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-56">
            <Search
              aria-hidden="true"
              className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              strokeWidth={1.8}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => reset(setQuery)(e.target.value)}
              aria-label="Search health events"
              placeholder="Search events..."
              className="border-line bg-surface text-ink placeholder:text-ink-subtle focus:border-brand-400 h-10 w-full rounded-lg border pr-3 pl-9 text-sm"
            />
          </div>

          <SelectFilter
            label="Range"
            value={range}
            onChange={reset(setRange)}
            options={rangeOptions}
            className="sm:w-44"
          />
        </div>
      </div>

      {/* Filtering otherwise changes the result set silently */}
      <p
        aria-live="polite"
        className="text-ink-muted border-line border-b px-4 py-2 text-sm"
      >
        {rows.length === 0
          ? 'No health events match these filters'
          : `Showing ${shown.length} of ${rows.length} events`}
      </p>

      {rows.length === 0 ? (
        <p className="text-ink-subtle px-4 py-16 text-center text-sm">
          No health events match these filters.
        </p>
      ) : (
        <ol className="p-4">
          {shown.map((e, i) => {
            const last = i === shown.length - 1
            return (
              <li key={e.id} className="flex gap-3 sm:gap-4">
                <span className="text-ink-muted hidden w-24 shrink-0 pt-3.5 text-right text-xs sm:block">
                  {e.dateLabel}
                </span>

                <span
                  aria-hidden="true"
                  className="relative flex w-2 shrink-0 flex-col items-center"
                >
                  <span
                    className={cn(
                      'mt-4 size-2 shrink-0 rounded-full',
                      toneDot[e.tone],
                    )}
                  />
                  {!last && <span className="bg-line -mb-4 w-px flex-1" />}
                </span>

                <div
                  className={cn(
                    'border-line min-w-0 flex-1 rounded-xl border p-3',
                    last ? 'mb-0' : 'mb-3',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-ink min-w-0 text-sm font-semibold break-words">
                      {e.title}
                    </h3>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        tonePill[e.tone],
                      )}
                    >
                      {e.badge}
                    </span>
                  </div>

                  {/* Date repeats inside the card below sm, where the rail
                      column is hidden */}
                  <p className="text-ink-subtle mt-0.5 text-xs sm:hidden">
                    {e.dateLabel}
                  </p>

                  <p className="text-ink-muted mt-1.5 text-sm break-words">
                    {e.detail}
                  </p>

                  <p className="text-ink-subtle mt-2 text-xs break-words">
                    Recorded by:{' '}
                    <span className="text-ink-muted font-medium">
                      {e.recordedBy} ({e.recordedByRole})
                    </span>
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* aria-disabled, not disabled: a focused button that becomes `disabled`
          is pulled out of the focus order and the browser resets focus to
          <body>, so the final click would strand a keyboard user. */}
      {rows.length > EVENTS_PAGE_SIZE && (
        <div className="border-line border-t p-3 text-center">
          <button
            type="button"
            onClick={() => remaining > 0 && setVisible((v) => v + EVENTS_PAGE_SIZE)}
            aria-disabled={remaining === 0}
            className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium transition-colors aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
          >
            {remaining === 0 ? 'All events shown' : 'Load More Events'}
            {remaining > 0 && (
              <span className="text-ink-subtle ml-1.5">({remaining})</span>
            )}
          </button>
        </div>
      )}
    </section>
  )
}
