import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'
import {
  NOW,
  TODAY,
  addDays,
  allUnassigned,
  boardOn,
  conflictLabels,
  conflictTones,
  conflictsOn,
  dayOf,
  dayStats,
  formatFullDay,
  formatTime,
  formatWeekRange,
  isUnlogged,
  unassignedReason,
  weekStart,
} from '@/features/scheduling/board-data'
import type { BoardVisit } from '@/features/scheduling/board-data'
import { weekDates } from '@/features/caregivers/schedule-data'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityBadge, VisitStatusBadge } from '@/components/ui/StatusBadge'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** A visit that has not happened yet, and so can still change hands. */
function bookable(visit: BoardVisit): boolean {
  return (
    visit.date >= TODAY &&
    visit.status !== 'completed' &&
    visit.status !== 'cancelled'
  )
}

const views = [
  { slug: 'day', label: 'Day' },
  { slug: 'week', label: 'Week' },
  { slug: 'unassigned', label: 'Unassigned' },
  { slug: 'conflicts', label: 'Conflicts' },
] as const

type View = (typeof views)[number]['slug']

export function SchedulingPage() {
  const [params, setParams] = useSearchParams()

  const requested = params.get('date')
  const valid = requested && ISO.test(requested) && addDays(requested, 0) === requested
  const date = valid ? requested : TODAY
  const view = (views.find((v) => v.slug === params.get('view'))?.slug ?? 'day') as View

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const visits = useMemo(() => boardOn(date), [date])
  const conflicts = useMemo(() => conflictsOn(date), [date])
  const stats = useMemo(() => dayStats(date), [date])
  const outstanding = useMemo(() => allUnassigned(), [])

  // Hints follow the selected date. "Finished earlier today" under a heading
  // reading Saturday the 25th was two facts contradicting each other.
  const isToday = date === TODAY
  const past = date < TODAY
  const when = isToday ? 'today' : past ? 'that day' : 'that day'

  const tiles = [
    {
      id: 'total',
      label: 'Visits on the board',
      value: stats.total,
      hint: `${stats.onDuty} caregiver${stats.onDuty === 1 ? '' : 's'} on duty`,
    },
    {
      id: 'progress',
      label: 'In progress',
      value: stats.inProgress,
      hint: isToday ? `As at ${formatTime(NOW)}` : 'Not the current day',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: stats.completed,
      hint: isToday ? 'Finished earlier today' : `Finished ${when}`,
    },
    {
      id: 'upcoming',
      label: 'Still to come',
      value: stats.upcoming,
      hint: isToday ? 'Later today' : `Rostered ${when}`,
    },
    {
      id: 'unlogged',
      label: 'Not written up',
      value: stats.unlogged,
      hint:
        stats.unlogged > 0
          ? 'Window closed, no visit record'
          : 'Every closed window is recorded',
    },
    {
      id: 'unassigned',
      label: 'Unassigned',
      value: stats.unassigned,
      hint:
        stats.unassigned > 0
          ? `Needs a caregiver ${when}`
          : `All covered ${when}`,
      view: 'unassigned' as View,
    },
    {
      id: 'conflicts',
      label: 'Conflicts',
      value: stats.conflicts,
      hint: stats.conflicts > 0 ? 'Needs attention' : 'Nothing flagged',
      view: 'conflicts' as View,
    },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">Scheduling</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Every caregiver&rsquo;s rota in one place. The board reads the same
            projection each caregiver&rsquo;s own Schedule tab does, so a visit
            cannot appear on one and not the other.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
          >
            <Download className="size-4" strokeWidth={1.9} aria-hidden="true" />
            Export
          </button>
          {/* Assigning needs a visit to assign to, so this goes to the queue
              of visits that need one rather than nowhere. */}
          <Link
            to="/scheduling?view=unassigned"
            className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
          >
            <UserPlus className="size-4" strokeWidth={1.9} aria-hidden="true" />
            Fill unassigned visits
          </Link>
          <button
            type="button"
            className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white"
          >
            <CalendarPlus className="size-4" strokeWidth={1.9} aria-hidden="true" />
            Schedule visit
          </button>
        </div>
      </header>

      <section aria-labelledby="board-totals">
        {/* Weekday and month come from the date itself; the source design
            printed "Julyober 24" and called a Friday a Thursday. */}
        <h2
          id="board-totals"
          className="text-ink mb-3 text-base font-semibold tracking-tight"
        >
          {formatFullDay(date)}
          {date === TODAY && (
            <span className="text-ink-muted ml-2 text-sm font-normal">
              today, as at {formatTime(NOW)}
            </span>
          )}
        </h2>

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {tiles.map((t) => {
            // `span`, not `p`: these render inside a button for the two tiles
            // that link onward, and a button takes phrasing content only.
            const body = (
              <>
                <span className="text-ink-subtle block text-xs font-semibold tracking-wider uppercase">
                  {t.label}
                </span>
                <span className="text-ink mt-2 block text-2xl font-bold tracking-tight tabular-nums">
                  {t.value}
                </span>
                <span className="text-ink-subtle mt-1 block text-xs break-words">
                  {t.hint}
                </span>
              </>
            )
            return t.view && t.value > 0 ? (
              <button
                key={t.id}
                type="button"
                onClick={() => setParam('view', t.view!)}
                className="card hover:border-brand-300 p-4 text-left transition-colors"
              >
                {body}
              </button>
            ) : (
              <article key={t.id} className="card p-4">
                {body}
              </article>
            )
          })}
        </div>
      </section>

      <div
        role="group"
        aria-label="Choose a view"
        className="no-scrollbar flex gap-1.5 overflow-x-auto"
      >
        {views.map((v) => {
          const active = v.slug === view
          const count =
            v.slug === 'unassigned'
              ? // Every date, and the tab says so — the tile beside it counts
                // only the selected day, and the two read differently.
                outstanding.length
              : v.slug === 'conflicts'
                ? conflicts.length
                : null
          return (
            <button
              key={v.slug}
              type="button"
              aria-pressed={active}
              onClick={() => setParam('view', v.slug === 'day' ? null : v.slug)}
              className={cn(
                'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors',
                active ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-sunken',
              )}
            >
              {v.slug === 'unassigned' ? 'Unassigned, all dates' : v.label}
              {count !== null && (
                <span className={active ? 'text-white' : 'text-ink-subtle'}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Hoisted out of the day view: the week, unassigned and conflict views
          are all date-scoped too, and none of them could move the date. */}
      {view !== 'unassigned' && (
        <DateNav
          date={date}
          step={view === 'week' ? 7 : 1}
          unit={view === 'week' ? 'week' : 'day'}
          onDate={(next) => setParam('date', next === TODAY ? null : next)}
        />
      )}

      {view === 'day' && <DayBoard date={date} visits={visits} />}
      {view === 'week' && <WeekBoard date={date} />}
      {view === 'unassigned' && <UnassignedQueue visits={outstanding} date={date} />}
      {view === 'conflicts' && <ConflictList conflicts={conflicts} date={date} />}

      <p className="text-ink-subtle text-xs">
        {stats.availableCaregivers} caregiver
        {stats.availableCaregivers === 1 ? ' is' : 's are'} available to dispatch
        on {formatFullDay(date)} — active caregivers with a window set and no
        lapsed credential.{' '}
        <Link to="/caregivers?sort=compliance" className="text-brand-700">
          Check the roster
        </Link>
        .
      </p>
    </div>
  )
}

/* --------------------------------- day view -------------------------------- */

function DateNav({
  date,
  step,
  unit,
  onDate,
}: {
  date: string
  step: number
  unit: string
  onDate: (next: string) => void
}) {
  return (
    <nav
      aria-label={`Change ${unit}`}
      className="flex flex-wrap items-center gap-2"
    >
      <button
        type="button"
        onClick={() => onDate(addDays(date, -step))}
        className="border-line text-ink hover:bg-sunken inline-flex h-9 items-center gap-1 rounded-lg border pr-3 pl-2 text-sm font-medium"
      >
        <ChevronLeft className="size-4" strokeWidth={2} aria-hidden="true" />
        Previous
        <span className="sr-only"> {unit}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          if (date === TODAY) return
          onDate(TODAY)
        }}
        aria-disabled={date === TODAY}
        className={cn(
          'inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium',
          date === TODAY
            ? 'border-line bg-sunken text-ink-subtle cursor-not-allowed'
            : 'border-line text-ink hover:bg-sunken',
        )}
      >
        Today
      </button>
      <button
        type="button"
        onClick={() => onDate(addDays(date, step))}
        className="border-line text-ink hover:bg-sunken inline-flex h-9 items-center gap-1 rounded-lg border pr-2 pl-3 text-sm font-medium"
      >
        Next
        <span className="sr-only"> {unit}</span>
        <ChevronRight className="size-4" strokeWidth={2} aria-hidden="true" />
      </button>
      <p className="text-ink-subtle text-sm">
        {unit === 'week' ? formatWeekRange(weekStart(date)) : formatFullDay(date)}
      </p>
    </nav>
  )
}

function DayBoard({ date, visits }: { date: string; visits: BoardVisit[] }) {
  return (
    <Panel title="Visits" flush>
      {visits.length === 0 ? (
        <p
          role="status"
          className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm"
        >
          Nothing on the board for {formatFullDay(date)}.
        </p>
      ) : (
        <>
          <div
            tabIndex={0}
            role="region"
            aria-label={`Visits on ${formatFullDay(date)}`}
            className="hidden overflow-x-auto xl:block"
          >
            <table className="w-full min-w-4xl text-left text-sm">
              <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
                <tr>
                  {['Time', 'Care recipient', 'Caregiver', 'Service', 'Status', 'Priority', ''].map(
                    (col, i) => (
                      <th
                        key={col || `actions-${i}`}
                        scope="col"
                        className="px-4 py-2.5 font-semibold tracking-wide uppercase"
                      >
                        {col || <span className="sr-only">Actions</span>}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {visits.map((visit) => (
                  <tr
                    key={visit.id}
                    className={cn(
                      'transition-colors',
                      visit.caregiverId ? 'hover:bg-canvas' : 'bg-red-50/40',
                    )}
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 font-medium whitespace-nowrap tabular-nums"
                    >
                      {/* The time opens the visit — every row on this board is
                          a record, not just a slot. */}
                      <Link
                        to={`/scheduling/visits/${visit.id}/overview`}
                        className="text-ink hover:text-brand-700"
                      >
                        {formatTime(visit.start)}
                        <span className="sr-only">
                          {' '}
                          visit for {visit.recipientName}
                        </span>
                        <span className="text-ink-subtle block text-xs font-normal">
                          to {formatTime(visit.end)}
                        </span>
                      </Link>
                    </th>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        to={`/care-recipients/${visit.recipientId}`}
                        className="text-ink hover:text-brand-700 font-medium"
                      >
                        {visit.recipientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {visit.caregiverId ? (
                        <span className="flex items-center gap-2">
                          <Avatar
                            name={visit.caregiverName!}
                            decorative
                            className="size-7 shrink-0 text-xs"
                          />
                          <Link
                            to={`/caregivers/${visit.caregiverId}/schedule`}
                            className="text-ink hover:text-brand-700"
                          >
                            {visit.caregiverName}
                          </Link>
                        </span>
                      ) : (
                        <span className="font-medium text-red-700">Unassigned</span>
                      )}
                    </td>
                    <td className="text-ink-muted px-4 py-3">{visit.type}</td>
                    <td className="px-4 py-3">
                      <StatusCell visit={visit} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={visit.priority} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Nobody can be booked onto a visit that is over. */}
                      {bookable(visit) ? (
                        <Link
                          to={`/scheduling/visits/${visit.id}/assign`}
                          className={
                            visit.caregiverId
                              ? 'text-brand-700 hover:text-brand-800 inline-flex min-h-11 items-center text-sm font-medium'
                              : 'bg-brand-600 hover:bg-brand-700 inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-white'
                          }
                        >
                          {visit.caregiverId ? 'Reassign' : 'Assign'}
                          <span className="sr-only">
                            {' '}
                            a caregiver to {visit.recipientName} at{' '}
                            {formatTime(visit.start)}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-ink-subtle text-sm">Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-line border-line divide-y border-t xl:hidden">
            {visits.map((visit) => (
              <li
                key={visit.id}
                className={cn('p-4', !visit.caregiverId && 'bg-red-50/40')}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Link
                    to={`/scheduling/visits/${visit.id}/overview`}
                    className="text-ink hover:text-brand-700 text-sm font-semibold tabular-nums"
                  >
                    {formatTime(visit.start)} – {formatTime(visit.end)}
                    <span className="sr-only"> visit for {visit.recipientName}</span>
                  </Link>
                  <StatusCell visit={visit} />
                </div>
                <p className="text-ink mt-1 text-sm font-medium break-words">
                  {visit.recipientName}
                </p>
                <p className="text-ink-muted mt-0.5 text-sm break-words">
                  {visit.type} ·{' '}
                  {visit.caregiverId ? (
                    <Link
                      to={`/caregivers/${visit.caregiverId}/schedule`}
                      className="text-brand-700 hover:text-brand-800"
                    >
                      {visit.caregiverName}
                    </Link>
                  ) : (
                    <span className="font-medium text-red-700">Unassigned</span>
                  )}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={visit.priority} />
                  {/* The table's action, kept — a card fallback that drops it
                      leaves the row unusable below 1280px. */}
                  {bookable(visit) && (
                    <Link
                      to={`/scheduling/visits/${visit.id}/assign`}
                      className={
                        visit.caregiverId
                          ? 'text-brand-700 hover:text-brand-800 inline-flex min-h-11 items-center text-sm font-medium'
                          : 'bg-brand-600 hover:bg-brand-700 inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-white'
                      }
                    >
                      {visit.caregiverId ? 'Reassign' : 'Assign'}
                      <span className="sr-only">
                        {' '}
                        a caregiver to {visit.recipientName} at{' '}
                        {formatTime(visit.start)}
                      </span>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
            {visits.length} visit{visits.length === 1 ? '' : 's'} on{' '}
            {formatFullDay(date)}, counted from the board above.
          </p>
        </>
      )}
    </Panel>
  )
}

/* -------------------------------- week view -------------------------------- */

function WeekBoard({ date }: { date: string }) {
  const start = weekStart(date)
  const days = weekDates(start)
  // Today and the selected day are different facts; marking only the first
  // left the tiles describing a Wednesday while the grid highlighted Friday.

  return (
    <Panel title="Week at a glance" flush>
      <div
        tabIndex={0}
        role="region"
        aria-label="Visits by day this week"
        className="border-line hidden overflow-x-auto border-t xl:block"
      >
        <div className="grid min-w-4xl grid-cols-7 divide-x divide-[var(--color-line)]">
          {days.map((day) => (
            <DayColumn key={day} date={day} selected={day === date} />
          ))}
        </div>
      </div>

      <ul className="divide-line border-line divide-y border-t xl:hidden">
        {days.map((day) => {
          const visits = boardOn(day)
          return (
            <li
              key={day}
              className={cn(
                'p-4',
                day === TODAY && 'bg-brand-50',
                day === date && day !== TODAY && 'border-brand-500 border-l-4 pl-3',
              )}
            >
              <p className="text-ink text-sm font-semibold">
                {formatFullDay(day)}
                {day === TODAY && (
                  <span className="text-brand-700 ml-2 text-xs">Today</span>
                )}
                {day === date && day !== TODAY && (
                  <span className="text-brand-700 ml-2 text-xs">Selected</span>
                )}
              </p>
              <p className="text-ink-muted mt-1 text-sm">
                {visits.length === 0
                  ? 'Nothing rostered'
                  : `${visits.length} visit${visits.length === 1 ? '' : 's'}${
                      visits.some((v) => !v.caregiverId)
                        ? `, ${visits.filter((v) => !v.caregiverId).length} unassigned`
                        : ''
                    }`}
              </p>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function DayColumn({ date, selected }: { date: string; selected: boolean }) {
  const visits = boardOn(date)
  const unassignedCount = visits.filter((v) => !v.caregiverId).length

  return (
    <section
      aria-label={formatFullDay(date)}
      aria-current={selected ? 'date' : undefined}
      className={cn(
        'min-w-0 p-2',
        date === TODAY && 'bg-brand-50/60',
        selected && date !== TODAY && 'ring-brand-300 ring-2 ring-inset',
      )}
    >
      <p className="text-ink-subtle px-1 text-xs font-semibold tracking-wider uppercase">
        {dayOf(date)}
      </p>
      <p className="text-ink px-1 text-sm font-semibold">
        {new Date(`${date}T00:00:00Z`).getUTCDate()}
        {date === TODAY && (
          <span className="text-brand-700 ml-1.5 text-xs">Today</span>
        )}
        {selected && date !== TODAY && (
          <span className="text-brand-700 ml-1.5 text-xs">Selected</span>
        )}
      </p>

      {visits.length === 0 ? (
        <p className="text-ink-subtle bg-sunken mt-2 rounded-lg px-2 py-3 text-center text-xs">
          Nothing on
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {visits.map((visit) => (
            <li
              key={visit.id}
              className={cn(
                'rounded-lg border p-2',
                visit.caregiverId
                  ? 'border-brand-200 bg-brand-50/70'
                  : 'border-red-200 bg-red-50',
              )}
            >
              <Link
                to={`/scheduling/visits/${visit.id}/overview`}
                className="hover:text-brand-700 block"
              >
                <span className="text-ink block text-xs font-semibold tabular-nums">
                  {formatTime(visit.start)}
                </span>
                <span className="text-ink mt-0.5 block text-xs font-medium break-words">
                  {visit.recipientName}
                </span>
              </Link>
              <p className="text-ink-muted text-xs break-words">
                {visit.caregiverName ?? 'Unassigned'}
              </p>
            </li>
          ))}
        </ul>
      )}

      {unassignedCount > 0 && (
        <p className="mt-2 px-1 text-xs font-medium text-red-700">
          {unassignedCount} unassigned
        </p>
      )}
    </section>
  )
}

/* ----------------------------- unassigned queue ---------------------------- */

function UnassignedQueue({
  visits,
  date,
}: {
  visits: BoardVisit[]
  date: string
}) {
  return (
    <Panel title="Unassigned visits" flush>
      {visits.length === 0 ? (
        <p className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm">
          Every visit on the board has a caregiver.
        </p>
      ) : (
        <ul className="divide-line border-line divide-y border-t">
          {visits.map((visit) => (
            <li key={visit.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold break-words">
                    <Link
                      to={`/care-recipients/${visit.recipientId}`}
                      className="hover:text-brand-700"
                    >
                      {visit.recipientName}
                    </Link>
                  </p>
                  <p className="text-ink-muted mt-0.5 text-sm break-words">
                    <Link
                      to={`/scheduling/visits/${visit.id}/overview`}
                      className="hover:text-brand-700"
                    >
                      {formatFullDay(visit.date)} · {formatTime(visit.start)} –{' '}
                      {formatTime(visit.end)} · {visit.type}
                    </Link>
                  </p>
                  {/* Why it is unassigned, not just that it is — three of these
                      are clients with no caregiver in the directory at all. */}
                  <p className="text-ink-subtle mt-0.5 text-xs break-words">
                    {unassignedReason(visit.id)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <PriorityBadge priority={visit.priority} />
                  <Link
                    to={`/scheduling/visits/${visit.id}/assign`}
                    className="bg-brand-600 hover:bg-brand-700 inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-white"
                  >
                    Assign
                    <span className="sr-only">
                      {' '}
                      a caregiver to {visit.recipientName} on{' '}
                      {formatFullDay(visit.date)}
                    </span>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
        Every date with an unassigned visit, not just{' '}
        {formatFullDay(date)}.
      </p>
    </Panel>
  )
}

/**
 * An assigned past visit with no record is not the same as one with nobody on
 * it. Both carried status "unassigned", so the board showed a red Unassigned
 * badge next to a caregiver's name.
 */
function StatusCell({ visit }: { visit: BoardVisit }) {
  if (!isUnlogged(visit)) return <VisitStatusBadge status={visit.status} />
  return (
    <span className="text-ink-subtle bg-sunken inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
      Not written up
    </span>
  )
}

/* ------------------------------- conflict list ----------------------------- */

function ConflictList({
  conflicts,
  date,
}: {
  conflicts: ReturnType<typeof conflictsOn>
  date: string
}) {
  return (
    <Panel title="Conflicts and alerts" flush>
      {conflicts.length === 0 ? (
        <p className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm">
          Nothing flagged on {formatFullDay(date)}.
        </p>
      ) : (
        <ul className="divide-line border-line divide-y border-t">
          {conflicts.map((conflict) => (
            <li key={conflict.id} className="flex gap-3 p-4">
              <TriangleAlert
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  conflictTones[conflict.kind] === 'red'
                    ? 'text-red-600'
                    : 'text-amber-600',
                )}
                strokeWidth={2.2}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-ink min-w-0 text-sm font-semibold break-words">
                    {conflict.label}
                  </p>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                      tonePill[conflictTones[conflict.kind]],
                    )}
                  >
                    {conflictLabels[conflict.kind]}
                  </span>
                </div>
                <p className="text-ink-muted mt-1 text-sm break-words">
                  {conflict.detail}
                </p>
                {conflict.caregiverId &&
                  (() => {
                    // Land on the tab that holds the fix. A lapsed credential
                    // is resolved on Documents; sending every conflict to the
                    // rota meant the one link offered was the wrong one.
                    const documents = conflict.kind === 'lapsed-credential'
                    return (
                      <Link
                        to={`/caregivers/${conflict.caregiverId}/${documents ? 'documents' : 'schedule'}`}
                        className="text-brand-700 hover:text-brand-800 mt-1.5 inline-flex min-h-11 items-center text-sm font-medium"
                      >
                        {documents ? 'Open their credentials' : 'Open the rota'}
                        <span className="sr-only"> for {conflict.label}</span>
                      </Link>
                    )
                  })()}
                {conflict.recipientId && (
                  <Link
                    to={`/care-recipients/${conflict.recipientId}`}
                    className="text-brand-700 hover:text-brand-800 mt-1.5 inline-flex min-h-11 items-center text-sm font-medium"
                  >
                    Open the care record
                    <span className="sr-only"> for {conflict.label}</span>
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
