import { Clock, FlaskConical } from 'lucide-react'
import {
  NOW,
  TODAY,
  formatFullDay,
  formatTime,
  minutesOfDay,
  minutesToClock,
} from './live-data'
import { cn } from '@/lib/cn'

/**
 * The clock both monitoring screens are read at.
 *
 * NOT PRODUCT — this control is scaffolding, and is styled to say so.
 *
 * The sample data has a fixed clock, so Live Monitoring would otherwise show
 * one frozen minute forever: you could never watch a check-in go overdue at
 * 08:30 and become an unwritten-up visit at 11:00, which is the entire claim
 * these screens make about themselves. A shipped build deletes this component
 * and reads the real time; nothing else on either page depends on it beyond
 * being handed a `now`.
 *
 * Shared rather than duplicated: the board and the alerts page are two views of
 * the same minute, and two sliders that could disagree about what time it is
 * would be the worst kind of bug on a page whose whole premise is that
 * everything recomputes from one clock.
 */
export function ClockCard({
  now,
  onChange,
  summary,
}: {
  now: string
  onChange: (next: string) => void
  /** Announced on every slider step, so the change is not silent. */
  summary: string
}) {
  const atAppClock = now === NOW

  return (
    <div
      className={cn(
        // One slim row, not a card. Dashed and quiet: every solid card on these
        // screens is real product surface, and a full-height block gave the one
        // control that would not ship the same weight as the board itself.
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed px-3 py-2',
        atAppClock ? 'border-line bg-sunken/30' : 'border-brand-300 bg-brand-50/40',
      )}
    >
      <span
        className="text-ink-subtle inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase"
        title="Not part of the product. The sample data has a fixed clock; a shipped build reads the real time."
      >
        <FlaskConical className="size-3.5" strokeWidth={2} aria-hidden="true" />
        Demo clock
      </span>

      <span className="text-ink shrink-0 text-sm font-semibold tabular-nums">
        {formatTime(now)}
      </span>

      {/* The date only where it is the page's only clock reference; it never
          changes, so it does not earn a line of its own. */}
      <span className="text-ink-subtle hidden shrink-0 text-xs sm:inline">
        {formatFullDay(TODAY)}
      </span>

      {/* Grows to fill whatever is left. `h-11` is the touch target, not the
          visual height — the track is a few pixels inside it. */}
      <input
        type="range"
        min={0}
        max={24 * 60 - 15}
        step={15}
        value={minutesOfDay(formatTime(now))}
        onChange={(e) => onChange(minutesToClock(Number(e.target.value)))}
        aria-label="Time of day (demo control)"
        aria-valuetext={formatTime(now)}
        className="accent-brand-600 h-11 min-w-40 flex-1 cursor-pointer"
      />

      {!atAppClock && (
        <button
          type="button"
          onClick={() => onChange('all')}
          className="border-line text-ink-muted hover:text-ink inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-medium"
        >
          <Clock className="size-3.5" strokeWidth={1.9} aria-hidden="true" />
          Reset to {formatTime(NOW)}
        </button>
      )}

      {/* One always-mounted region: dragging the slider changes every tile and
          the whole list, and only the thumb's value was announced. */}
      <p role="status" aria-live="polite" className="sr-only">
        {summary}
        {atAppClock
          ? ''
          : ` Moved from ${formatTime(NOW)}, which is what every other screen shows.`}
      </p>
    </div>
  )
}
