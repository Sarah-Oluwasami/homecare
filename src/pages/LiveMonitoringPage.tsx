import { useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Check, Info, TriangleAlert } from 'lucide-react'
import {
  CHECK_IN_GRACE_MINUTES,
  NOW,
  TODAY,
  activityAt,
  alertKindLabels,
  alertsAt,
  telHref,
  countBySeverity,
  formatGap,
  formatTime,
  liveBoard,
  liveStats,
  minutesOfDay,
  minutesToClock,
  stateLabels,
  stateTones,
} from '@/features/monitoring/live-data'
import type {
  LiveAlert,
  LiveState,
  LiveVisit,
} from '@/features/monitoring/live-data'
import { branchesOnRoster } from '@/features/scheduling/assign-data'
import { referenceFor } from '@/features/scheduling/visit-detail'
import { MapLegend, VisitMap } from '@/features/monitoring/VisitMap'
import { AcknowledgeAlertDialog } from '@/features/monitoring/AcknowledgeAlertDialog'
import { EscalateAlertDialog } from '@/features/monitoring/EscalateAlertDialog'
import { ResolveAlertDialog } from '@/features/monitoring/ResolveAlertDialog'
import { ReportIncidentDialog } from '@/features/monitoring/ReportIncidentDialog'
import { useFiledNotes } from '@/features/care-recipients/notes-data'
import {
  canResolve,
  escalationReasonLabels,
  escalationTiers,
  resolutionCategoryLabels,
  useAlertActions,
  withdrawAcknowledgement,
  withdrawEscalation,
  withdrawResolution,
} from '@/features/monitoring/alert-actions'
import {
  branchDistanceMiles,
  formatMiles,
  placeOfRecipient,
  travelMiles,
} from '@/features/monitoring/locations-data'
import { Avatar } from '@/components/ui/Avatar'
import { ClockCard } from '@/features/monitoring/ClockCard'
import { CountChip } from '@/components/ui/CountChip'
import { Drawer } from '@/components/ui/Drawer'
import { Pagination } from '@/components/ui/Pagination'
import { Panel } from '@/components/ui/Panel'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { SeverityBadge } from '@/components/ui/StatusBadge'
import { staffMembers } from '@/features/caregivers/roster-data'
import { toneFill, tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

/*
 * Four lists of *visits*, and nothing else.
 *
 * Three of them are lists of *visits*. "Attention Required" is the exception
 * and is a work queue: one row per thing a coordinator can still act on, with
 * the button to act on it. It is deliberately not the Alerts & incidents page
 * — that page is the whole record, filterable by source and provenance and
 * including everything already settled. This tab is only what is still open,
 * and it leads with the client's name and the action rather than with where
 * the fact came from.
 */
const views = [
  { slug: 'now', label: 'Live Overview' },
  { slug: 'visits', label: 'Active Visits' },
  { slug: 'attention', label: 'Attention Required' },
  { slug: 'map', label: 'Map View' },
] as const

type View = (typeof views)[number]['slug']

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Every state `stateOf` can return, so a visible badge is always selectable. */
const selectableStates: LiveState[] = [
  'unattended',
  'overdue',
  'awaiting-check-in',
  'in-progress',
  'overrunning',
  'due',
  'upcoming',
  'unrecorded',
  'uncovered',
  'cancelled',
  'completed',
]

const PAGE_SIZE = 8

/**
 * Chip order follows the row order the board sorts by, so the chip for a state
 * near the top of the table is near the start of the rail.
 */
const orderedStates: LiveState[] = [
  'unattended',
  'overdue',
  'awaiting-check-in',
  'uncovered',
  'overrunning',
  'in-progress',
  'due',
  'upcoming',
  'unrecorded',
  'cancelled',
  'completed',
]

/** The clock-in the log captured, formatted — or null when there is none. */
function checkInOf(visit: LiveVisit): string | null {
  // Not shown before the visit is due: a record that exists for a 9am slot is
  // not a check-in at 6am, which is the same rule the "Written up" tile uses.
  if (!visit.clockIn || visit.sinceStart < 0) return null
  return formatTime(visit.clockIn)
}

export function LiveMonitoringPage() {
  const [params, setParams] = useSearchParams()

  const requested = params.get('at')
  // A hand-edited clock falls back rather than throwing; everything on this
  // page is a function of it.
  // Snapped to the slider's own step, so the thumb and the label agree.
  const now =
    requested && CLOCK.test(requested)
      ? minutesToClock(Math.round(minutesOfDay(formatTime(requested)) / 15) * 15)
      : NOW
  const requestedView = params.get('view')
  const view = (views.find((v) => v.slug === requestedView)?.slug ?? 'now') as View
  // Validated against the options: an unrecognised value left the select
  // reading "Any state" over an empty list.
  const rawState = params.get('state') ?? 'all'
  const state = (selectableStates as string[]).includes(rawState) ? rawState : 'all'
  const rawBranch = params.get('branch') ?? 'all'
  const branch =
    rawBranch === 'none' || branchesOnRoster.includes(rawBranch) ? rawBranch : 'all'

  const rows = useMemo(() => liveBoard(TODAY, now), [now])
  const stats = useMemo(() => liveStats(rows), [rows])
  /*
   * Bumped when somebody files a write-up on this page. `alertsAt` reads the
   * care notes, so an incident filed here raises its own "Incident written up"
   * alert — but only if the memo is told the notes moved.
   */
  const notesVersion = useFiledNotes()
  const alerts = useMemo(() => {
    void notesVersion
    return alertsAt(TODAY, now)
  }, [now, notesVersion])
  /*
   * What the Attention Required tab lists: the alerts a coordinator can still
   * do something about. Not the same set as the Alerts & incidents page, which
   * is the whole log including what is already on the record — this tab is the
   * work queue, that page is the record.
   */
  const attention = useMemo(
    () => alerts.filter((a) => a.timing === 'changeable'),
    [alerts],
  )
  const activity = useMemo(() => activityAt(TODAY, now), [now])
  const allSeverities = useMemo(() => countBySeverity(alerts), [alerts])

  const branchOf = useMemo(() => {
    const map = new Map(staffMembers.map((m) => [m.id, m.branch]))
    return (visit: LiveVisit) =>
      visit.caregiverId ? (map.get(visit.caregiverId) ?? null) : null
  }, [])

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (state === 'all' || r.state === state) &&
          (branch === 'all' ||
            (branch === 'none' ? branchOf(r) === null : branchOf(r) === branch)),
      ),
    [rows, state, branch, branchOf],
  )

  // Everything the branch filter leaves, so the state chips describe the list
  // they would produce rather than the whole board.
  const beforeState = useMemo(
    () =>
      rows.filter(
        (r) =>
          branch === 'all' ||
          (branch === 'none' ? branchOf(r) === null : branchOf(r) === branch),
      ),
    [rows, branch, branchOf],
  )

  /**
   * Rows per branch, counted from what the *state* chip leaves — the same rule
   * the chips use in the other direction, so neither control is ever a
   * non-zero number above a list it would empty.
   */
  const beforeBranch = useMemo(
    () => rows.filter((r) => state === 'all' || r.state === state),
    [rows, state],
  )

  const visitBranchCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of beforeBranch) {
      const key = branchOf(r) ?? 'none'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [beforeBranch, branchOf])

  /**
   * States present in the branch-filtered rows, plus whichever state is
   * selected even when nothing matches it — otherwise moving the clock
   * unmounted the active chip and left no filter visibly applied over an
   * empty table.
   */
  const presentStates = useMemo(() => {
    const counts = new Map<LiveState, number>()
    for (const r of beforeState) counts.set(r.state, (counts.get(r.state) ?? 0) + 1)
    return orderedStates
      .filter((s) => counts.has(s) || s === state)
      .map((s) => [s, counts.get(s) ?? 0] as const)
  }, [beforeState, state])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const requestedPage = Number(params.get('page'))
  // Clamped, like every other paginated screen: a stale ?page= lands on the
  // last page rather than silently jumping to the first.
  const pageNumber =
    Number.isInteger(requestedPage) && requestedPage >= 1
      ? Math.min(requestedPage, pageCount)
      : 1
  const page = filtered.slice(
    (pageNumber - 1) * PAGE_SIZE,
    pageNumber * PAGE_SIZE,
  )
  const summary =
    filtered.length === 0
      ? 'No visits'
      : `Showing ${(pageNumber - 1) * PAGE_SIZE + 1}\u2013${(pageNumber - 1) * PAGE_SIZE + page.length} of ${filtered.length}${filtered.length === rows.length ? '' : ` matching, from ${rows.length}`} visits on the board`

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    // A filter change invalidates the page number; staying on page 3 of a
    // one-page result showed nothing.
    if (key !== 'page') next.delete('page')
    if (key === 'view') {
      // The map plots the whole board, so a branch or state filter carried
      // onto it would be live in the URL and invisible on screen.
      if (value === 'map') {
        next.delete('branch')
        next.delete('state')
      }
      if (value !== 'map') next.delete('pin')
    }
    setParams(next, { replace: key === 'at' })
  }

  // Validated like every other param: a junk ?pin= left a dead value in the
  // URL over the placeholder.
  const pinned = rows.find((r) => r.id === params.get('pin')) ?? null

  // Not in the URL: a panel is a way of looking at the page, not a place. A
  // shared link should open the board somebody meant to share, not their
  // sidebar.
  const [showingAlerts, setShowingAlerts] = useState(false)

  /** Longest journey first — the list the travel-distance setting governs. */
  const byDistance = useMemo(
    () =>
      rows
        .flatMap((visit) => {
          const miles = travelMiles(visit.caregiverId, visit.recipientId)
          return miles === null ? [] : [{ visit, miles }]
        })
        .sort((a, b) => b.miles - a.miles),
    [rows],
  )

  const live = rows.filter((r) => r.sinceStart >= 0 && r.pastEnd < 0)

  const tiles = [
    {
      id: 'board',
      label: 'On the board today',
      value: stats.onBoard,
      hint: `${stats.roster} caregivers on the roster`,
    },
    {
      id: 'window',
      label: 'In their window',
      value: stats.inWindow,
      hint: `${stats.rostered} caregiver${stats.rostered === 1 ? '' : 's'} rostered, ${stats.onDuty} checked in`,
    },
    {
      id: 'recorded',
      label: 'Written up',
      value: stats.recorded,
      hint: 'Visit record exists',
    },
    {
      id: 'overdue',
      label: 'Check-in overdue',
      value: stats.overdue,
      hint:
        stats.awaiting > 0
          ? `Past ${CHECK_IN_GRACE_MINUTES} min · ${stats.awaiting} still inside it`
          : `Past ${CHECK_IN_GRACE_MINUTES} minutes`,
      // A count of *visits* in a state, so it filters the board rather than
      // jumping to a list of alerts that counts differently.
      state: 'overdue' as LiveState,
    },
    {
      id: 'unattended',
      label: 'Nobody on it',
      value: stats.unattended,
      hint: 'Running with no caregiver',
      state: 'unattended' as LiveState,
    },
    {
      id: 'alerts',
      // Named for where it goes. "Needs attention" was the old view's name and
      // pointed at a page called "Alerts & incidents" — two names for one
      // destination, on the screen you navigate from.
      label: 'Alerts & incidents',
      value: alerts.length,
      hint:
        allSeverities.critical > 0
          ? `${allSeverities.critical} critical`
          : alerts.length > 0
            ? `${allSeverities.high} high`
            : 'Nothing outstanding',
      // The one tile that is genuinely about alerts, so it leaves the board.
      to: `/live-monitoring/alerts${now === NOW ? '' : `?at=${now}`}`,
    },
  ]

  /*
   * Alerts were a fourth view of this board for the whole prior life of the
   * app, so every bookmark and shared link still says `?view=alerts`. Falling
   * back to "Happening now" was silent and left the dead param in the URL to
   * be re-shared; this sends them to the page that now owns that list.
   */
  if (requestedView === 'alerts') {
    const carried = new URLSearchParams()
    if (now !== NOW) carried.set('at', now)
    const query = carried.toString()
    return <Navigate to={`/live-monitoring/alerts${query ? `?${query}` : ''}`} replace />
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">
            Live monitoring
          </h1>
          <p className="text-ink-muted mt-1 max-w-2xl text-sm">
            Every visit on today&rsquo;s board, and what state it is in at the
            time shown. Nothing here is stored — move the clock and every row
            recomputes.{' '}
            <Link to="/live-monitoring/history" className="text-brand-700">
              Monitoring history
            </Link>{' '}
            has the days that have finished.
          </p>
        </div>
        {/* No "Refresh": nothing is fetched. What this opens is the same
            derivation the page already ran, in a panel you can keep open while
            working down the board. */}
        <button
          type="button"
          onClick={() => setShowingAlerts(true)}
          className="border-line text-ink hover:bg-sunken inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
        >
          <TriangleAlert
            className={cn(
              'size-4 shrink-0',
              alerts.length > 0 ? 'text-amber-600' : 'text-ink-subtle',
            )}
            strokeWidth={2}
            aria-hidden="true"
          />
          Live alerts
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
              alerts.length > 0
                ? 'bg-amber-100 text-amber-900'
                : 'bg-sunken text-ink-subtle',
            )}
          >
            {alerts.length}
          </span>
        </button>
      </header>

      <LiveAlertsPanel
        alerts={alerts}
        now={now}
        open={showingAlerts}
        onClose={() => setShowingAlerts(false)}
        allHref={`/live-monitoring/alerts${now === NOW ? '' : `?at=${now}`}`}
      />

      <ClockCard
        now={now}
        onChange={(next) => set('at', next)}
        // Whatever the current view actually recomputes. Announcing the alert
        // count on the map view described a list that is not on screen — and
        // is no longer on this page at all.
        summary={
          view === 'visits'
            ? `${formatTime(now)} — ${filtered.length} visit${filtered.length === 1 ? '' : 's'} listed.`
            : view === 'map'
              ? `${formatTime(now)} — ${rows.length} visit${rows.length === 1 ? '' : 's'} plotted.`
              : `${formatTime(now)} — ${stats.inWindow} visit${stats.inWindow === 1 ? '' : 's'} in window, ${alerts.length} alert${alerts.length === 1 ? '' : 's'}.`
        }
      />

      {/* --------------------------------- tiles -------------------------------- */}

      <section aria-labelledby="live-totals">
        <h2 id="live-totals" className="sr-only">
          Totals
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {tiles.map((t) => {
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
            // A tile that leaves the section is a link; one that filters the
            // board in place is a button. Always the same element whatever the
            // count — swapping type as a count crossed zero dropped focus
            // mid-drag.
            if (t.to)
              return (
                <Link
                  key={t.id}
                  to={t.to}
                  className="card hover:border-brand-300 block p-4 transition-colors"
                >
                  {body}
                </Link>
              )
            return t.state ? (
              <button
                key={t.id}
                type="button"
                aria-disabled={t.value === 0}
                onClick={() => {
                  if (t.value === 0) return
                  const next = new URLSearchParams(params)
                  next.set('view', 'visits')
                  next.set('state', t.state!)
                  next.delete('page')
                  // The tile counts the whole board, so it must land on the
                  // whole board. Leaving a branch filter in place put "1
                  // unattended" directly above an empty table — the exact
                  // failure the chip counts elsewhere are built to avoid.
                  next.delete('branch')
                  next.delete('pin')
                  setParams(next)
                }}
                className="card hover:border-brand-300 p-4 text-left transition-colors aria-disabled:cursor-default aria-disabled:hover:border-line"
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

      {/* --------------------------------- views -------------------------------- */}

      {/*
        An underline bar, the same shape the visit-details tabs already use.
        `role="tablist"` is deliberately NOT used: these swap the whole section
        below via the URL rather than toggling panels in place, so a tab widget
        would promise arrow-key panel switching that does not happen. They are
        buttons in a labelled group.
      */}
      <div
        role="group"
        aria-label="Choose a view"
        className="border-line no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
      >
        {views.map((v) => {
          const active = v.slug === view
          const count =
            v.slug === 'now'
              ? live.length
              : v.slug === 'attention'
                ? attention.length
                : rows.length
          return (
            <button
              key={v.slug}
              type="button"
              onClick={() => set('view', v.slug)}
              aria-pressed={active}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors',
                active
                  ? 'border-brand-600 text-brand-700'
                  : 'text-ink-muted hover:text-ink border-transparent',
              )}
            >
              {v.label}
              {/* Kept, though the source design has none: the count is derived
                  from the same rows the tab opens, and "Attention Required 4"
                  is the whole reason to look at that tab first. */}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                  active ? 'bg-brand-50 text-brand-700' : 'bg-sunken text-ink-subtle',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {view === 'now' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Panel
              title="In their window right now"
              badge={
                <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
                  {live.length} of {rows.length}
                </span>
              }
              flush
            >
              {live.length === 0 ? (
                <p
                  className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm"
                  role="status"
                >
                  No visit is inside its window at {formatTime(now)}.
                </p>
              ) : (
                <ul className="divide-line border-line divide-y border-t">
                  {live.map((visit) => (
                    <VisitRow key={visit.id} visit={visit} now={now} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Alerts &amp; incidents"
              badge={
                alerts.length === 0 ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Nothing outstanding
                  </span>
                ) : (
                  <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
                    {alerts.length}
                  </span>
                )
              }
              action={{
                label:
                  alerts.length > 3
                    ? `Open all ${alerts.length} on Alerts & incidents`
                    : 'Open Alerts & incidents',
                // The clock carried across, so the page opens at the minute
                // being looked at rather than silently jumping to noon.
                to: `/live-monitoring/alerts${now === NOW ? '' : `?at=${now}`}`,
              }}
            >
              {alerts.length === 0 ? (
                <p className="text-ink-subtle text-sm" role="status">
                  Nothing on the board needs a coordinator at {formatTime(now)}.
                </p>
              ) : (
                <>
                  {/* A summary, not the table. The full row — source, branch,
                      timing, both actions — belongs on the alerts page; three
                      copies of it squeezed into a sidebar panel was what made
                      the two screens look like the same screen. */}
                  <ul className="divide-line divide-y">
                    {alerts.slice(0, 3).map((alert) => (
                      <li key={alert.id} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                          <Link
                            to={alert.secondary?.to ?? alert.action.to}
                            className="text-ink hover:text-brand-700 min-w-0 text-sm font-medium break-words"
                          >
                            {alert.label}
                          </Link>
                          <SeverityBadge severity={alert.severity} />
                        </div>
                        <p className="text-ink-subtle mt-0.5 text-xs break-words">
                          {alertKindLabels[alert.kind]}
                          {alert.elapsed && ` · for ${alert.elapsed}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {alerts.length > 3 && (
                    <p className="text-ink-subtle mt-2 text-xs">
                      {alerts.length - 3} more.
                    </p>
                  )}
                </>
              )}
            </Panel>
          </div>

          <Panel title="Earlier today" flush>
            {activity.length === 0 ? (
              <p
                className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm"
                role="status"
              >
                Nothing has happened yet at {formatTime(now)}.
              </p>
            ) : (
              <ol className="divide-line border-line divide-y border-t">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3 p-4">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        toneFill[entry.tone],
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-ink-subtle text-xs tabular-nums">
                        {formatTime(entry.at)}
                      </p>
                      <p className="text-ink mt-0.5 text-sm break-words">
                        {entry.to ? (
                          <Link to={entry.to} className="hover:text-brand-700">
                            {entry.label}
                          </Link>
                        ) : (
                          entry.label
                        )}
                      </p>
                      <p className="text-ink-subtle mt-0.5 text-xs break-words">
                        {entry.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
              Visit starts and finishes the clock has passed. Nothing is dated
              later than {formatTime(now)}.
            </p>
          </Panel>
        </div>
      )}

      {view === 'attention' && (
        <AttentionTable
          alerts={attention}
          total={alerts.length}
          now={now}
          logHref={`/live-monitoring/alerts${now === NOW ? '' : `?at=${now}`}`}
        />
      )}

      {view === 'visits' && (
        <section aria-labelledby="board-table" className="space-y-4">
          <h2 id="board-table" className="sr-only">
            Today&rsquo;s visits
          </h2>

          {/* Chips carry counts of what the *other* filter leaves, so a chip is
              never a non-zero number over a list it would empty. */}
          <div className="card space-y-3 p-4">
            <div
              role="group"
              aria-label="Filter by state"
              className="no-scrollbar flex gap-1.5 overflow-x-auto"
            >
              <CountChip
                label="All"
                count={beforeState.length}
                active={state === 'all'}
                onClick={() => set('state', 'all')}
              />
              {presentStates.map(([value, count]) => (
                <CountChip
                  key={value}
                  label={stateLabels[value]}
                  count={count}
                  active={state === value}
                  onClick={() => set('state', value)}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SelectFilter
                label="Branch"
                value={branch}
                onChange={(v) => set('branch', v)}
                options={[
                  { value: 'all', label: `All (${beforeBranch.length})` },
                  ...branchesOnRoster.map((b) => ({
                    value: b,
                    label: `${b} (${visitBranchCounts.get(b) ?? 0})`,
                  })),
                  // A branch belongs to the caregiver, so an unassigned slot
                  // has none. Without this option the three of them were
                  // reachable from no branch value at all and the counts did
                  // not add up to the board — the same gap the alerts filter
                  // beside this one already names.
                  ...((visitBranchCounts.get('none') ?? 0) > 0 || branch === 'none'
                    ? [
                        {
                          value: 'none',
                          label: `Not tied to a branch (${visitBranchCounts.get('none') ?? 0})`,
                        },
                      ]
                    : []),
                ]}
              />
              {(state !== 'all' || branch !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(params)
                    for (const key of ['state', 'branch', 'page']) next.delete(key)
                    setParams(next)
                  }}
                  className="text-brand-700 hover:text-brand-800 inline-flex min-h-11 items-center px-1 text-sm font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <Panel title={`Today’s board at ${formatTime(now)}`} flush>
            {filtered.length === 0 ? (
              <p
                className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm"
                role="status"
              >
                No visit matches those filters
                {state !== 'all' &&
                  ` — no visit is “${stateLabels[state as LiveState]}” at ${formatTime(now)}`}
                .
              </p>
            ) : (
              <>
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="Today’s visits table"
                  className="border-line hidden overflow-x-auto border-t xl:block"
                >
                  <table className="w-full min-w-4xl text-left text-sm">
                    <thead className="text-ink-subtle bg-sunken text-xs">
                      <tr>
                        {[
                          'Reference',
                          'Time',
                          'Care recipient',
                          'Caregiver',
                          'Service',
                          'Check-in',
                          'State',
                          'Write-up',
                        ].map((col) => (
                          <th
                            key={col}
                            scope="col"
                            className="px-4 py-2.5 font-semibold tracking-wide uppercase"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-line divide-y">
                      {page.map((visit) => (
                        <tr
                          key={visit.id}
                          className={cn(
                            'transition-colors',
                            visit.state === 'unattended'
                              ? 'bg-red-50/50'
                              : 'hover:bg-canvas',
                          )}
                        >
                          <th scope="row" className="px-4 py-3 font-normal">
                            {/* Derived from the date and the rota slot, never
                                stored — and never a country code the rest of
                                the app has never heard of. */}
                            <Link
                              to={`/scheduling/visits/${visit.id}/overview`}
                              className="text-brand-700 hover:text-brand-800 font-medium whitespace-nowrap"
                            >
                              {referenceFor(visit)}
                            </Link>
                          </th>
                          <td className="text-ink px-4 py-3 whitespace-nowrap tabular-nums">
                            {formatTime(visit.start)}
                            <span className="text-ink-subtle block text-xs">
                              to {formatTime(visit.end)}
                            </span>
                          </td>
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
                              <Link
                                to={`/caregivers/${visit.caregiverId}/schedule`}
                                className="text-ink hover:text-brand-700"
                              >
                                {visit.caregiverName}
                              </Link>
                            ) : (
                              <span className="font-medium text-red-700">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="text-ink-muted px-4 py-3">{visit.type}</td>
                          <td className="text-ink-muted px-4 py-3 whitespace-nowrap tabular-nums">
                            {/* The clock-in the visit log actually captured —
                                08:58 for a 09:00 slot — not the scheduled time
                                relabelled. No clock-in, no time. */}
                            {checkInOf(visit) ?? (
                              <span className="text-ink-subtle">Not recorded</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StateBadge state={visit.state} />
                          </td>
                          <td className="px-4 py-3">
                            <ReportIncidentButton visit={visit} now={now} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Below 1280px the table becomes cards carrying the same
                    seven facts, rather than a table that scrolls sideways. */}
                <ul className="divide-line border-line divide-y border-t xl:hidden">
                  {page.map((visit) => (
                    <VisitRow key={visit.id} visit={visit} now={now} />
                  ))}
                </ul>
              </>
            )}

            {/* Only when there is a second page: a permanently disabled bar
                over an eight-row board is chrome that never does anything. */}
            {pageCount > 1 && (
              <Pagination
                page={pageNumber}
                pageCount={pageCount}
                onPageChange={(n) => set('page', n === 1 ? '' : String(n))}
                summary={summary}
              />
            )}
          </Panel>
        </section>
      )}

      {view === 'map' && (
        <section aria-labelledby="map-heading" className="space-y-4">
          <h2 id="map-heading" className="sr-only">
            Where today&rsquo;s visits are
          </h2>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="card space-y-3 p-4 xl:col-span-2">
              <MapLegend visits={rows} alerts={alerts} />
              <VisitMap
                visits={rows}
                alerts={alerts}
                selectedId={pinned?.id ?? null}
                onSelect={(id) => set('pin', id === pinned?.id ? '' : id)}
              />
            </div>

            <div className="space-y-4">
              {pinned ? (
                <Panel
                  title="Selected visit"
                  badge={
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                        tonePill[stateTones[pinned.state]],
                      )}
                    >
                      {stateLabels[pinned.state]}
                    </span>
                  }
                >
                  <dl className="divide-line divide-y text-sm">
                    <MapFact label="Reference" value={referenceFor(pinned)} />
                    <MapFact label="Care recipient" value={pinned.recipientName} />
                    <MapFact
                      label="Address"
                      value={placeOfRecipient(pinned.recipientId)?.address ?? 'Not on file'}
                    />
                    <MapFact
                      label="Caregiver"
                      value={pinned.caregiverName ?? 'Unassigned'}
                    />
                    <MapFact label="Service" value={pinned.type} />
                    <MapFact
                      label="Scheduled"
                      value={`${formatTime(pinned.start)} – ${formatTime(pinned.end)}`}
                    />
                    <MapFact
                      label="Check-in"
                      value={checkInOf(pinned) ?? 'Not recorded'}
                    />
                    {/* Real, now that addresses carry coordinates — home to
                        home, not a live position. */}
                    <MapFact
                      label="Caregiver’s home to here, straight line"
                      value={
                        travelMiles(pinned.caregiverId, pinned.recipientId) === null
                          ? 'No caregiver assigned'
                          : formatMiles(
                              travelMiles(pinned.caregiverId, pinned.recipientId)!,
                            )
                      }
                    />
                    <MapFact
                      label="Branch to here, straight line"
                      value={
                        branchDistanceMiles(branchOf(pinned), pinned.recipientId) === null
                          ? 'No caregiver, so no branch'
                          : `${formatMiles(branchDistanceMiles(branchOf(pinned), pinned.recipientId)!)} from ${branchOf(pinned)}`
                      }
                    />
                  </dl>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/scheduling/visits/${pinned.id}/overview`}
                      className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white"
                    >
                      Open the visit
                    </Link>
                    <Link
                      to={`/care-recipients/${pinned.recipientId}`}
                      className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
                    >
                      Care record
                    </Link>
                  </div>
                </Panel>
              ) : (
                <Panel title="Selected visit">
                  <p className="text-ink-subtle text-sm" role="status">
                    Choose a pin to see the visit, its address and how far it is
                    from the caregiver&rsquo;s home.
                  </p>
                </Panel>
              )}

              <Panel title="Longest caregiver journey">
                {/* Home to home, which is the figure the "maximum travel
                    distance" setting was written against — not branch to
                    client, which the panel above shows for one visit. */}
                <ul className="divide-line divide-y">
                  {byDistance.slice(0, 5).map(({ visit, miles }) => (
                    <li
                      key={visit.id}
                      className="flex flex-wrap justify-between gap-x-3 py-2 first:pt-0 last:pb-0"
                    >
                      <button
                        type="button"
                        onClick={() => set('pin', visit.id)}
                        className="text-ink hover:text-brand-700 min-w-0 text-left text-sm break-words"
                      >
                        {visit.recipientName}
                        <span className="text-ink-subtle block text-xs">
                          {visit.caregiverName ?? 'Unassigned'}
                        </span>
                      </button>
                      <span className="text-ink-muted shrink-0 text-sm tabular-nums">
                        {formatMiles(miles)}
                      </span>
                    </li>
                  ))}
                </ul>
                {byDistance.length === 0 ? (
                  <p className="text-ink-subtle text-sm" role="status">
                    No visit today has both a caregiver and an address on file.
                  </p>
                ) : (
                  <p className="text-ink-subtle mt-2 text-xs">
                    {byDistance.length > 5
                      ? `Longest 5 of ${byDistance.length}.`
                      : `All ${byDistance.length} assigned visits today.`}{' '}
                    Unassigned visits have no journey to measure.
                  </p>
                )}
              </Panel>
            </div>
          </div>
        </section>
      )}

      <p className="text-ink-subtle card p-3 text-xs">
        <Info
          className="mr-1.5 -mt-0.5 inline size-3.5"
          strokeWidth={2}
          aria-hidden="true"
        />
        A visit&rsquo;s only evidence of a check-in is whether a visit record
        exists, so an assigned visit under way with no record reads as an
        overdue check-in rather than as running. The map plots home addresses,
        not people: nothing in this app tracks a caregiver&rsquo;s position.
      </p>
    </div>
  )
}

/* --------------------------------- pieces ---------------------------------- */

function VisitRow({ visit, now }: { visit: LiveVisit; now: string }) {
  const inWindow = visit.sinceStart >= 0 && visit.pastEnd < 0

  return (
    <li className={cn('p-4', visit.state === 'unattended' && 'bg-red-50/50')}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {visit.caregiverId ? (
            <Avatar name={visit.caregiverName!} decorative className="size-8" />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-red-100 text-red-700"
            >
              <TriangleAlert className="size-4" strokeWidth={2.4} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-ink text-sm font-semibold break-words">
              {/* Same destination as the table's recipient cell — the same
                  words led to two different places by viewport. */}
              <Link
                to={`/care-recipients/${visit.recipientId}`}
                className="hover:text-brand-700"
              >
                {visit.recipientName}
              </Link>
            </p>
            <p className="text-ink-subtle text-xs break-words">
              {visit.type} ·{' '}
              {visit.caregiverId ? (
                <Link
                  to={`/caregivers/${visit.caregiverId}/schedule`}
                  className="hover:text-ink"
                >
                  {visit.caregiverName}
                </Link>
              ) : (
                <span className="font-medium text-red-700">Unassigned</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
              tonePill[stateTones[visit.state]],
            )}
          >
            {stateLabels[visit.state]}
          </span>
          <span className="text-ink-subtle text-xs whitespace-nowrap tabular-nums">
            {formatTime(visit.start)} – {formatTime(visit.end)}
          </span>
        </div>
      </div>

      {/* Carried down from the table rather than dropped: below 1280px these
          two columns are the ones a narrower layout would lose. */}
      <p className="text-ink-subtle mt-2 flex flex-wrap items-center gap-x-2 text-xs">
        <Link
          to={`/scheduling/visits/${visit.id}/overview`}
          className="text-brand-700 hover:text-brand-800 font-medium"
        >
          {referenceFor(visit)}
        </Link>
        <span aria-hidden="true">·</span>
        <span>
          Check-in {checkInOf(visit) ?? 'not recorded'}
        </span>
      </p>

      {/* How far through, measured from the clock rather than stated. */}
      <p className="text-ink-muted mt-1 text-xs break-words">
        {inWindow
          ? `${formatGap(visit.sinceStart)} in, ${formatGap(-visit.pastEnd)} left of ${visit.durationHours}h.`
          : visit.pastEnd >= 0
            ? `Window closed ${formatGap(visit.pastEnd)} ago.`
            : `Starts in ${formatGap(-visit.sinceStart)}.`}
      </p>

      {inWindow && (
        <div
          role="progressbar"
          aria-valuenow={Math.round(
            (visit.sinceStart / Math.max(1, visit.sinceStart - visit.pastEnd)) * 100,
          )}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${visit.recipientName}’s visit, elapsed`}
          className="bg-sunken mt-1.5 h-1.5 overflow-hidden rounded-full"
        >
          <div
            className={cn('h-full rounded-full', toneFill[stateTones[visit.state]])}
            style={{
              width: `${Math.min(100, Math.max(0, (visit.sinceStart / Math.max(1, visit.sinceStart - visit.pastEnd)) * 100))}%`,
            }}
          />
        </div>
      )}

      <div className="mt-2">
        <ReportIncidentButton visit={visit} now={now} />
      </div>
    </li>
  )
}

function StateBadge({ state }: { state: LiveState }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        tonePill[stateTones[state]],
      )}
    >
      {stateLabels[state]}
    </span>
  )
}

function MapFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-ink-muted min-w-0 text-xs">{label}</dt>
      <dd className="text-ink min-w-0 text-right text-xs font-medium break-words">
        {value}
      </dd>
    </div>
  )
}

/**
 * The Attention Required tab: a work queue, not a log.
 *
 * Five columns, following the design — who it is about, what the issue is, how
 * long it has been true, how loud, and the thing to do about it. The Alerts &
 * incidents page answers a different question and carries the provenance
 * columns (source, branch, timing) that belong to a record rather than to a
 * queue.
 *
 * The design's action column had Escalate, Acknowledge and Resolve. None of
 * those exist: nothing in this app stores an alert, so there is no state to
 * move an alert into and nothing to escalate it to. What survives is the two
 * that are real — a link to the record, and a phone number the fixture
 * actually holds.
 */
function AttentionTable({
  alerts,
  total,
  now,
  logHref,
}: {
  alerts: LiveAlert[]
  /** Every alert, so the tab can say what it is leaving out. */
  total: number
  now: string
  logHref: string
}) {
  const settled = total - alerts.length

  return (
    <section aria-labelledby="attention-table" className="space-y-4">
      <h2 id="attention-table" className="sr-only">
        Needing a coordinator
      </h2>

      {alerts.length === 0 ? (
        <Panel title={`Needing a coordinator at ${formatTime(now)}`}>
          <p className="text-ink-subtle text-sm" role="status">
            {/* Good news said as good news. Reporting it as an empty filter
                result buried the only thing a coordinator wanted to know. */}
            Nothing on today&rsquo;s board needs acting on at {formatTime(now)}.
            {settled > 0 && (
              <>
                {' '}
                {settled} thing{settled === 1 ? '' : 's'} already on the record{' '}
                <Link to={logHref} className="text-brand-700">
                  are under Alerts &amp; incidents
                </Link>
                .
              </>
            )}
          </p>
        </Panel>
      ) : (
        <Panel
          title={`Needing a coordinator at ${formatTime(now)}`}
          badge={
            <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
              {alerts.length} open
            </span>
          }
          flush
        >
          <div
            tabIndex={0}
            role="region"
            aria-label="Attention required table"
            className="border-line hidden overflow-x-auto border-t xl:block"
          >
            <table className="w-full min-w-3xl text-left text-sm">
              <thead className="text-ink-subtle bg-sunken text-xs">
                <tr>
                  {/* "Who", not "Care recipient" as the design has it: a
                      lapsed credential or a contract overrun is about the
                      *caregiver*, and filing their name under a column headed
                      Care recipient would be plainly wrong. */}
                  {['Who', 'Issue', 'For how long', 'Priority', 'Action'].map(
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
                {alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className={cn(
                      'transition-colors',
                      alert.severity === 'critical'
                        ? 'bg-red-50/60'
                        : 'hover:bg-canvas',
                    )}
                  >
                    <th scope="row" className="px-4 py-3 font-medium break-words">
                      <span className="text-ink block">{alert.subject}</span>
                      {alert.counterpart && (
                        <span className="text-ink-subtle block text-xs font-normal">
                          with {alert.counterpart}
                        </span>
                      )}
                    </th>
                    <td className="px-4 py-3">
                      <span className="text-ink block font-medium break-words">
                        {alertKindLabels[alert.kind]}
                      </span>
                      <span className="text-ink-muted block text-xs break-words">
                        {alert.detail}
                      </span>
                    </td>
                    <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                      {/* The design headed this "TIME OVERDUE" and then filled
                          it with "2 min ago", "No GPS Lock" and "Late 15m" —
                          three different measurements under one heading. Empty
                          where there is no stopwatch. */}
                      {alert.elapsed ?? (
                        <span className="text-ink-subtle">
                          {alert.weekScoped ? 'This week' : 'Not timed'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <AlertActions alert={alert} now={now} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="border-line divide-line divide-y border-t xl:hidden">
            {alerts.map((alert) => (
              <li key={alert.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <p className="text-ink min-w-0 text-sm font-semibold break-words">
                    {alert.subject}
                  </p>
                  <SeverityBadge severity={alert.severity} />
                </div>
                <p className="text-ink mt-1 text-sm font-medium break-words">
                  {alertKindLabels[alert.kind]}
                </p>
                <p className="text-ink-muted mt-0.5 text-sm break-words">
                  {alert.detail}
                </p>
                <p className="text-ink-subtle mt-1 text-xs break-words">
                  {alert.counterpart && <>With {alert.counterpart} · </>}
                  {alert.elapsed
                    ? `For ${alert.elapsed}`
                    : alert.weekScoped
                      ? 'This week'
                      : 'Not timed'}
                </p>
                <div className="mt-2">
                  <AlertActions alert={alert} now={now} />
                </div>
              </li>
            ))}
          </ul>

          <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
            Only what can still be acted on.{' '}
            {settled > 0 ? (
              <>
                {settled} more {settled === 1 ? 'is' : 'are'} already on the
                record —{' '}
              </>
            ) : (
              <>Everything, with where each fact came from, is </>
            )}
            <Link to={logHref} className="text-brand-700">
              under Alerts &amp; incidents
            </Link>
            . Nothing here is stored as an alert, so there is nothing to
            acknowledge or resolve: a row leaves when the fact behind it stops
            being true.
          </p>
        </Panel>
      )}
    </section>
  )
}

/**
 * Every alert on the board right now, in a panel beside the work.
 *
 * The same list the Attention Required tab and the alerts page are built from —
 * `alertsAt` at the minute on the clock — laid out to be read down rather than
 * across. It exists because a coordinator working through visits should not
 * have to leave the board to see what is shouting, and it carries the real
 * actions rather than a summary of them: every row here can be acknowledged,
 * escalated, signed off where the record allows it, and rung.
 *
 * No count of its own and no refresh. It re-renders with the clock like
 * everything else, and a number computed a second time is a number that can
 * disagree with the first.
 */
function LiveAlertsPanel({
  alerts,
  now,
  open,
  onClose,
  allHref,
}: {
  alerts: LiveAlert[]
  now: string
  open: boolean
  onClose: () => void
  allHref: string
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Live alerts"
      subtitle={`${alerts.length} at ${formatTime(now)}`}
    >
      <div className="space-y-3 p-4">
        {alerts.length === 0 ? (
          <p className="text-ink-muted text-sm" role="status">
            Nothing on the board needs a coordinator at {formatTime(now)}.
          </p>
        ) : (
          alerts.map((alert) => (
            <article
              key={alert.id}
              className={cn(
                'card border-l-4 p-3.5',
                alert.severity === 'critical'
                  ? 'border-l-red-500'
                  : alert.severity === 'high'
                    ? 'border-l-amber-500'
                    : 'border-l-slate-300',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-ink min-w-0 text-sm font-semibold break-words">
                  {alertKindLabels[alert.kind]}
                </p>
                <SeverityBadge severity={alert.severity} />
              </div>
              <p className="text-ink-muted mt-1 text-sm break-words">
                {alert.detail}
              </p>
              {/* Who it is about, in the alert's own words. "Recipient" and
                  "Caregiver" would be wrong on half these rows: a lapsed
                  credential is about a caregiver and no client at all. */}
              <p className="text-ink-subtle mt-1.5 text-xs break-words">
                {alert.subject}
                {alert.counterpart && ` · with ${alert.counterpart}`}
                {' · '}
                {alert.elapsed ?? (alert.weekScoped ? 'this week' : 'not timed')}
              </p>
              <div className="mt-2.5">
                <AlertActions alert={alert} now={now} />
              </div>
            </article>
          ))
        )}
      </div>

      <div className="border-line bg-surface sticky bottom-0 border-t p-4">
        <Link
          to={allHref}
          onClick={onClose}
          className="text-brand-700 hover:text-brand-800 inline-flex min-h-11 items-center text-sm font-semibold"
        >
          Open Alerts &amp; incidents
          <span className="sr-only">
            {' '}
            — the whole record, including what is already settled
          </span>
        </Link>
      </div>
    </Drawer>
  )
}

/**
 * Writing an incident up against the visit it happened on.
 *
 * On the visit rather than on an alert: an incident is about what happened at
 * somebody's house, and the visit is the only row that knows whose house, which
 * caregiver and which slot. Offered on visits that have started — there is
 * nothing to write up about a visit that has not begun.
 */
function ReportIncidentButton({ visit, now }: { visit: LiveVisit; now: string }) {
  const [reporting, setReporting] = useState(false)

  if (visit.sinceStart < 0) {
    return <span className="text-ink-subtle text-xs">Not started</span>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setReporting(true)}
        className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-medium whitespace-nowrap"
      >
        Report incident
        <span className="sr-only"> — {visit.recipientName}</span>
      </button>
      {reporting && (
        <ReportIncidentDialog
          visit={visit}
          now={now}
          onClose={() => setReporting(false)}
        />
      )}
    </>
  )
}

function AlertActions({ alert, now }: { alert: LiveAlert; now: string }) {
  const [acknowledging, setAcknowledging] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [resolving, setResolving] = useState(false)
  const { acknowledgementFor, escalationFor, resolutionFor } = useAlertActions()
  const ack = acknowledgementFor(TODAY, alert.thread)
  const escalation = escalationFor(TODAY, alert.thread)
  const resolution = resolutionFor(TODAY, alert.thread)

  /*
   * Once it is signed off, the chasing buttons go: acknowledging or handing on
   * something already settled is two coordinators doing the same work twice.
   * The row itself stays exactly where it was, with the state the board
   * derived — resolving records who dealt with it, it does not delete it.
   */
  if (resolution) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Link
          to={alert.action.to}
          className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-medium whitespace-nowrap"
        >
          {alert.action.label}
          <span className="sr-only"> — {alert.subject}</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
          <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          <span className="whitespace-nowrap">
            Resolved {formatTime(resolution.at)} —{' '}
            {resolutionCategoryLabels[resolution.category].toLowerCase()}
            <span className="sr-only">
              {' '}
              by {resolution.by}, {resolution.byRole}. {resolution.note}
            </span>
          </span>
          <button
            type="button"
            onClick={() => withdrawResolution(TODAY, alert.thread)}
            className="text-emerald-900 underline underline-offset-2 hover:no-underline"
          >
            Undo
            <span className="sr-only"> resolving {alert.subject}</span>
          </button>
        </span>
      </span>
    )
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Link
        to={alert.action.to}
        className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold whitespace-nowrap text-white"
      >
        {alert.action.label}
        <span className="sr-only"> — {alert.subject}</span>
      </Link>

      {/* Acknowledge — "I have seen this and I am on it". The one action that
          fits an alert whose fact could still change in the next minute. */}
      {ack ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
          <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          <span className="whitespace-nowrap">
            Picked up {formatTime(ack.at)}
            <span className="sr-only">
              {' '}
              by {ack.by}, {ack.byRole}
              {ack.note && `. Note: ${ack.note}`}
            </span>
          </span>
          <button
            type="button"
            onClick={() => withdrawAcknowledgement(TODAY, alert.thread)}
            className="text-emerald-900 underline underline-offset-2 hover:no-underline"
          >
            Undo
            <span className="sr-only"> acknowledging {alert.subject}</span>
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAcknowledging(true)}
          className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-medium whitespace-nowrap"
        >
          Acknowledge
          <span className="sr-only"> — {alert.subject}</span>
        </button>
      )}

      {/* Escalate, like Acknowledge, records what a person did. Neither of them
          claims the problem has gone — that is the derivation's to say. */}
      {escalation ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
          <span className="whitespace-nowrap">
            Escalated to {escalation.toName}
            <span className="sr-only">
              {' '}
              at {formatTime(escalation.at)} by {escalation.by} —{' '}
              {escalationReasonLabels[escalation.reason]}. {escalation.note}
            </span>
          </span>
          <a
            href={telHref(escalation.toPhone)}
            className="text-amber-900 underline underline-offset-2 hover:no-underline"
          >
            {escalation.toPhone}
          </a>
          <button
            type="button"
            onClick={() => withdrawEscalation(TODAY, alert.thread)}
            className="text-amber-900 underline underline-offset-2 hover:no-underline"
          >
            Undo
            <span className="sr-only"> escalating {alert.subject}</span>
          </button>
        </span>
      ) : (
        escalationTiers.length > 0 && (
          <button
            type="button"
            onClick={() => setEscalating(true)}
            className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-medium whitespace-nowrap"
          >
            Escalate
            <span className="sr-only"> — {alert.subject}</span>
          </button>
        )
      )}

      {/* Only where the record is already written and no clock will unsay it.
          On this tab that is never — Attention Required lists the changeable
          ones by design — so the button belongs to the alerts page, and the
          guard is here because this component is the one that renders actions. */}
      {canResolve(alert) && (
        <button
          type="button"
          onClick={() => setResolving(true)}
          className="inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold whitespace-nowrap text-white hover:bg-emerald-700"
        >
          Resolve
          <span className="sr-only"> — {alert.subject}</span>
        </button>
      )}

      {resolving && (
        <ResolveAlertDialog
          alert={alert}
          date={TODAY}
          now={now}
          onClose={() => setResolving(false)}
        />
      )}
      {acknowledging && (
        <AcknowledgeAlertDialog
          alert={alert}
          date={TODAY}
          now={now}
          onClose={() => setAcknowledging(false)}
        />
      )}
      {escalating && (
        <EscalateAlertDialog
          alert={alert}
          date={TODAY}
          now={now}
          onClose={() => setEscalating(false)}
        />
      )}

      {/* A real telephone link to a number the fixture holds. The role is
          named because "Call Sarah" alone does not say whether Sarah is the
          caregiver or the client's daughter. */}
      {alert.contact && (
        <a
          href={telHref(alert.contact.phone)}
          className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-medium whitespace-nowrap"
        >
          {alert.contact.label}
          <span className="sr-only">
            {' '}
            — {alert.contact.name}, {alert.contact.role}, on{' '}
            {alert.contact.phone}
          </span>
        </a>
      )}
    </span>
  )
}
