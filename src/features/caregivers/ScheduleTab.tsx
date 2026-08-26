import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, TriangleAlert } from 'lucide-react'
import type { StaffMember } from './staff'
import {
  TODAY,
  addDays,
  availabilitySummary,
  dayOf,
  formatDay,
  formatTime,
  formatWeekRange,
  scheduleFor,
  unrosteredAssignments,
  upcomingVisits,
  visitsOn,
  weekDates,
  weekStart,
  weekSummary,
  weekdays,
} from './schedule-data'
import { weeklyHours } from './roster-data'
import type { ScheduledVisit } from './schedule-data'
import { Panel } from '@/components/ui/Panel'
import { VisitStatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/cn'

const ISO = /^\d{4}-\d{2}-\d{2}$/

export function ScheduleTab({
  member,
  suffix = '',
}: {
  member: StaffMember
  /** The roster's filters, so links out of here keep them. */
  suffix?: string
}) {
  const [params, setParams] = useSearchParams()

  /*
   * The visible week lives in the URL, so a rota someone is looking at can be
   * shared. Anything that is not a Monday is snapped to one — a mid-week value
   * would silently shift every column label.
   */
  // Shape *and* round-trip: "2026-02-31" parses, but rolls forward to March,
  // so the week shown would not be the week asked for.
  const requested = params.get('week')
  const valid =
    requested && ISO.test(requested) && addDays(requested, 0) === requested
  const start = weekStart(valid ? requested : TODAY)
  const thisWeek = weekStart(TODAY)

  const goTo = (next: string) => {
    const params2 = new URLSearchParams(params)
    if (next === thisWeek) params2.delete('week')
    else params2.set('week', next)
    // Pushed, not replaced: paging six weeks forward and pressing Back used to
    // leave the profile entirely.
    setParams(params2)
  }

  const visits = scheduleFor(member, start)
  const summary = weekSummary(member, visits)
  const availability = availabilitySummary(member)
  const upcoming = upcomingVisits(member)
  const unrostered = unrosteredAssignments(member)

  const tiles = [
    {
      id: 'hours',
      label: 'Hours rostered',
      value: `${summary.hours}h of ${summary.target}h`,
      hint: `${summary.loadPercent}% of the ${summary.target}h contract`,
      icon: Clock,
    },
    {
      id: 'visits',
      label: 'Visits rostered',
      value: String(summary.visits),
      hint:
        summary.clients === 0
          ? 'Nothing rostered'
          : `Across ${summary.clients} client${summary.clients === 1 ? '' : 's'}`,
      icon: CalendarDays,
    },
    {
      id: 'availability',
      label: 'Weekly availability',
      value: availability.label,
      hint: availability.detail,
      icon: Clock,
    },
  ]

  return (
    <div className="space-y-4">
      <section aria-labelledby="week-totals">
        {/* Names the week it is describing: the tiles follow the selected week,
            and calling every one of them "this week" was a lie the moment you
            paged forward. */}
        <h2 id="week-totals" className="text-ink mb-3 text-base font-semibold tracking-tight">
          Week of {formatWeekRange(start)}
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
          {tiles.map(({ id, label, value, hint, icon: Icon }) => (
            <article key={id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
                  {label}
                </p>
                <Icon
                  className="text-ink-subtle size-4 shrink-0"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </div>
              <p className="text-ink mt-2 text-xl font-bold tracking-tight break-words tabular-nums">
                {value}
              </p>
              <p className="text-ink-subtle mt-1 text-xs break-words">{hint}</p>
            </article>
          ))}
        </div>
      </section>

      {summary.outsideAvailability > 0 && (
        <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          <span>
            {summary.outsideAvailability} shift
            {summary.outsideAvailability === 1 ? '' : 's'} in this week fall
            outside the availability set on this profile.
          </span>
        </p>
      )}

      {(summary.unlogged > 0 || summary.offRota > 0) && (
        <p className="border-line text-ink-muted rounded-lg border p-3 text-sm">
          {summary.unlogged > 0 && (
            <>
              {summary.unlogged} past slot{summary.unlogged === 1 ? '' : 's'} in
              this week {summary.unlogged === 1 ? 'has' : 'have'} no entry in the
              visit log.{' '}
            </>
          )}
          {summary.offRota > 0 && (
            <>
              {summary.offRota} logged visit{summary.offRota === 1 ? '' : 's'} ran
              without a recurring slot behind {summary.offRota === 1 ? 'it' : 'them'}.
            </>
          )}
        </p>
      )}

      {unrostered.length > 0 && (
        <p className="border-line text-ink-muted rounded-lg border p-3 text-sm">
          Assigned to {unrostered.join(', ')} with no recurring slot on the rota.
        </p>
      )}

      <Panel
        title="Weekly calendar"
        badge={
          <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
            {formatWeekRange(start)}
          </span>
        }
        flush
      >
        <nav
          aria-label="Change week"
          className="flex flex-wrap items-center gap-2 px-4 pb-3"
        >
          <button
            type="button"
            onClick={() => goTo(addDays(start, -7))}
            className="border-line text-ink hover:bg-sunken inline-flex h-9 items-center gap-1 rounded-lg border pr-3 pl-2 text-sm font-medium"
          >
            <ChevronLeft className="size-4" strokeWidth={2} aria-hidden="true" />
            Previous
            <span className="sr-only"> week</span>
          </button>
          <button
            type="button"
            onClick={() => {
              // Guarded, so an aria-disabled control really is inert.
              if (start === thisWeek) return
              goTo(thisWeek)
            }}
            aria-disabled={start === thisWeek}
            className={cn(
              'inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium',
              start === thisWeek
                ? 'border-line bg-sunken text-ink-subtle cursor-not-allowed'
                : 'border-line text-ink hover:bg-sunken',
            )}
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => goTo(addDays(start, 7))}
            className="border-line text-ink hover:bg-sunken inline-flex h-9 items-center gap-1 rounded-lg border pr-2 pl-3 text-sm font-medium"
          >
            Next
            <span className="sr-only"> week</span>
            <ChevronRight className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </nav>

        {/* Seven columns cannot fit at 320, so the grid becomes a day list. */}
        <div
          tabIndex={0}
          role="region"
          aria-label={`Rota for ${formatWeekRange(start)}`}
          className="border-line hidden overflow-x-auto border-t xl:block"
        >
          <div className="grid min-w-4xl grid-cols-7 divide-x divide-[var(--color-line)]">
            {weekDates(start).map((date) => (
              <DayColumn
                key={date}
                date={date}
                visits={visitsOn(visits, date)}
                today={date === TODAY}
              />
            ))}
          </div>
        </div>

        <ul className="divide-line border-line divide-y border-t xl:hidden">
          {weekDates(start).map((date) => {
            const day = visitsOn(visits, date)
            return (
              <li key={date} className={cn('p-4', date === TODAY && 'bg-brand-50')}>
                <p className="text-ink text-sm font-semibold">
                  {dayOf(date)} {formatDay(date)}
                  {date === TODAY && (
                    <span className="text-brand-700 ml-2 text-xs font-semibold">
                      Today
                    </span>
                  )}
                </p>
                {day.length === 0 ? (
                  <p className="text-ink-subtle mt-1 text-sm">Off duty</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {day.map((visit) => (
                      <li key={visit.id}>
                        <VisitBlock visit={visit} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Next five visits" className="xl:col-span-2" flush>
          {upcoming.length === 0 ? (
            <p className="text-ink-subtle border-line border-t px-4 py-8 text-center text-sm">
              Nothing rostered after today.
            </p>
          ) : (
            <>
              <div
                tabIndex={0}
                role="region"
                aria-label="Upcoming visits table"
                className="hidden overflow-x-auto sm:block"
              >
                <table className="w-full min-w-2xl text-left text-sm">
                  <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
                    <tr>
                      {['Date', 'Time', 'Care recipient', 'Visit type', 'Duration', 'Status'].map(
                        (col) => (
                          <th
                            key={col}
                            scope="col"
                            className="px-4 py-2.5 font-semibold tracking-wide uppercase"
                          >
                            {col}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-line divide-y">
                    {upcoming.map((visit) => (
                      <tr key={visit.id} className="hover:bg-canvas transition-colors">
                        <th
                          scope="row"
                          className="text-ink px-4 py-3 font-medium whitespace-nowrap"
                        >
                          {dayOf(visit.date)} {formatDay(visit.date)}
                        </th>
                        <td className="text-ink-muted px-4 py-3 whitespace-nowrap tabular-nums">
                          {formatTime(visit.start)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            to={`/care-recipients/${visit.recipientId}`}
                            className="text-brand-700 hover:text-brand-800"
                          >
                            {visit.recipientName}
                          </Link>
                        </td>
                        <td className="text-ink-muted px-4 py-3">{visit.type}</td>
                        <td className="text-ink-muted px-4 py-3 tabular-nums">
                          {visit.durationHours}h
                        </td>
                        <td className="px-4 py-3">
                          <VisitStatusBadge status={visit.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-line border-line divide-y border-t sm:hidden">
                {upcoming.map((visit) => (
                  <li key={visit.id} className="p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-ink text-sm font-semibold">
                        {dayOf(visit.date)} {formatDay(visit.date)}
                      </p>
                      <VisitStatusBadge status={visit.status} />
                    </div>
                    <p className="text-ink-muted mt-1 text-sm break-words">
                      {formatTime(visit.start)} · {visit.recipientName} ·{' '}
                      {visit.type} · {visit.durationHours}h
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel
          title="Availability settings"
          action={{
            label: 'Edit availability',
            to: `/caregivers/${member.id}/edit${suffix}`,
          }}
        >
          <ul className="space-y-1.5">
            {weekdays.map((day) => {
              const window = member.availability.find((w) => w.day === day)
              return (
                <li key={day} className="flex items-center gap-3">
                  <span className="text-ink-muted w-10 shrink-0 text-sm">{day}</span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 rounded-lg px-3 py-2 text-sm',
                      window
                        ? 'bg-brand-50 text-brand-800'
                        : 'bg-sunken text-ink-subtle',
                    )}
                  >
                    {window
                      ? `${formatTime(window.start)} – ${formatTime(window.end)}`
                      : 'Off duty'}
                  </span>
                </li>
              )
            })}
          </ul>

          <dl className="divide-line border-line mt-4 divide-y border-t pt-2">
            {[
              ['Hours offered by this grid', `${weeklyHours(member)}h`],
              ['Contracted maximum', `${member.maxHoursPerWeek}h`],
              ['Preferred shift', member.preferredShift],
              ['Employment', member.employment],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-wrap justify-between gap-x-4 py-2 text-sm"
              >
                <dt className="text-ink-muted">{label}</dt>
                <dd className="text-ink font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {weeklyHours(member) > member.maxHoursPerWeek && (
            <p className="mt-2 text-xs font-medium text-amber-800">
              {weeklyHours(member) - member.maxHoursPerWeek}h more is offered
              than the contract allows, so not all of it can be rostered.
            </p>
          )}
        </Panel>
      </div>
    </div>
  )
}

/* ---------------------------------- parts --------------------------------- */

function DayColumn({
  date,
  visits,
  today,
}: {
  date: string
  visits: ScheduledVisit[]
  today: boolean
}) {
  return (
    <section
      aria-label={`${dayOf(date)} ${formatDay(date)}`}
      className={cn('min-w-0 p-2', today && 'bg-brand-50/60')}
    >
      <p className="text-ink-subtle px-1 text-xs font-semibold tracking-wider uppercase">
        {dayOf(date)}
      </p>
      <p className="text-ink px-1 text-sm font-semibold">
        {formatDay(date)}
        {today && (
          <span className="text-brand-700 ml-1.5 text-xs font-semibold">Today</span>
        )}
      </p>

      {visits.length === 0 ? (
        <p className="text-ink-subtle bg-sunken mt-2 rounded-lg px-2 py-3 text-center text-xs">
          Off duty
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {visits.map((visit) => (
            <li key={visit.id}>
              <VisitBlock visit={visit} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function VisitBlock({
  visit,
  compact,
}: {
  visit: ScheduledVisit
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-2',
        visit.outsideAvailability
          ? 'border-amber-300 bg-amber-50'
          : 'border-brand-200 bg-brand-50/70',
      )}
    >
      <p className="text-ink text-xs font-semibold tabular-nums">
        {formatTime(visit.start)} – {formatTime(visit.end)}
      </p>
      <p className="text-ink mt-0.5 text-sm font-medium break-words">
        {visit.recipientName}
      </p>
      <p className="text-ink-muted text-xs break-words">{visit.type}</p>
      <div className={cn('mt-1.5', compact && 'origin-left scale-95')}>
        {visit.logged || visit.status !== 'unassigned' ? (
          <VisitStatusBadge status={visit.status} />
        ) : (
          <span className="text-ink-subtle bg-sunken inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
            Not logged
          </span>
        )}
      </div>
      {visit.offRota && (
        <p className="text-ink-subtle mt-1 text-xs">Not on the recurring rota</p>
      )}
      {visit.outsideAvailability && (
        <p className="mt-1 text-xs font-medium text-amber-800">
          Outside set availability
        </p>
      )}
    </div>
  )
}
