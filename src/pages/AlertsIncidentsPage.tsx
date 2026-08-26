import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity,
  Check,
  CircleAlert,
  CircleCheck,
  Phone,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  NOW,
  TODAY,
  alertCategoryLabels,
  alertCategoryOf,
  alertKindLabels,
  alertTabs,
  alertTimingLabels,
  alertsAt,
  countBySeverity,
  countByTab,
  resolvedAt,
  filterAlerts,
  formatTime,
  matchesTab,
  minutesOfDay,
  minutesToClock,
  clearedBecause,
  stateLabels,
  telHref,
} from '@/features/monitoring/live-data'
import type {
  AlertQuery,
  AlertTab,
  LiveAlert,
} from '@/features/monitoring/live-data'
import { contextFor, referenceFor } from '@/features/scheduling/visit-detail'
import { placeOfRecipient } from '@/features/monitoring/locations-data'
import { ClockCard } from '@/features/monitoring/ClockCard'
import {
  INCIDENT_WINDOW_DAYS,
  formatIncidentAge,
  incidentsFiled,
} from '@/features/monitoring/incidents-data'
import type { IncidentRecord } from '@/features/monitoring/incidents-data'
import { AcknowledgeAlertDialog } from '@/features/monitoring/AcknowledgeAlertDialog'
import { EscalateAlertDialog } from '@/features/monitoring/EscalateAlertDialog'
import { ResolveAlertDialog } from '@/features/monitoring/ResolveAlertDialog'
import {
  escalationTiers,
  useAlertActions,
  canResolve,
  resolutionCategoryLabels,
  withdrawAcknowledgement,
  withdrawEscalation,
  withdrawResolution,
} from '@/features/monitoring/alert-actions'
import { branchesOnRoster } from '@/features/scheduling/assign-data'
import { Panel } from '@/components/ui/Panel'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { SeverityBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/cn'

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/

/**
 * Alerts and incidents — the record, not the work queue.
 *
 * Live Monitoring's Attention Required tab answers "what do I do next" and
 * carries the action buttons. This page answers "what has the day thrown up",
 * carries the description and the provenance, and includes the things already
 * settled that the queue has dropped.
 *
 * Laid out to the design: a tab row, a row of filter dropdowns, then a table of
 * alert type / description / who / time / priority / status. Two substitutions,
 * both because the app holds no alert record to put a lifecycle on —
 * see `alertTimingLabels` and the tab list below.
 */
export function AlertsIncidentsPage() {
  const [params, setParams] = useSearchParams()

  const requested = params.get('at')
  const now =
    requested && CLOCK.test(requested)
      ? minutesToClock(Math.round(minutesOfDay(formatTime(requested)) / 15) * 15)
      : NOW

  // Every param validated with a fallback, so a hand-edited URL cannot narrow
  // the list to nothing without saying why.
  const rawTab = params.get('tab') ?? 'all'
  const tab: AlertTab = alertTabs.some((t) => t.value === rawTab)
    ? (rawTab as AlertTab)
    : 'all'
  const rawBranch = params.get('team') ?? 'all'
  const branch =
    rawBranch === 'none' || branchesOnRoster.includes(rawBranch) ? rawBranch : 'all'
  const rawVisitState = params.get('state') ?? 'all'
  const visitState =
    rawVisitState === 'none' || rawVisitState in stateLabels ? rawVisitState : 'all'

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    // Replace only for the clock: dragging a slider should not fill the back
    // stack with 96 entries.
    setParams(next, { replace: key === 'at' })
  }

  /*
   * Everything the day has thrown up: what is raised at this minute, plus what
   * was raised earlier and has since cleared. The "All" tab means all of it —
   * the design's 19 over a table of 7 was counting something the table did not
   * contain, and this is what would make that number honest.
   */
  const live = useMemo(() => alertsAt(TODAY, now), [now])
  const cleared = useMemo(() => resolvedAt(TODAY, now), [now])
  const alerts = useMemo(() => [...live, ...cleared], [live, cleared])

  /** Service types the day's alerts actually mention, so the list is not fiction. */
  const serviceTypes = useMemo(
    () =>
      [...new Set(alerts.map((a) => a.serviceType).filter((t): t is string => !!t))].sort(),
    [alerts],
  )
  const rawService = params.get('service') ?? 'all'
  const serviceType =
    rawService === 'none' || serviceTypes.includes(rawService) ? rawService : 'all'

  const boardHref = `/live-monitoring${now === NOW ? '' : `?at=${now}`}`
  const queueHref = `/live-monitoring?view=attention${now === NOW ? '' : `&at=${now}`}`

  const query = useMemo<AlertQuery>(
    () => ({ tab, branch, visitState, serviceType }),
    [tab, branch, visitState, serviceType],
  )
  const shown = useMemo(() => filterAlerts(alerts, query), [alerts, query])

  // Each control counts what the *others* leave, so a tab or an option is never
  // a non-zero number above a list it would empty.
  const incidents = useMemo(() => incidentsFiled(TODAY), [])
  const tabCounts = useMemo(() => {
    const base = countByTab(filterAlerts(alerts, { ...query, tab: 'all' }))
    // The Incidents tab is its own register, so its badge counts that rather
    // than a slice of the alert list.
    return { ...base, incidents: incidents.length }
  }, [alerts, query, incidents])
  const countsFor = (key: keyof AlertQuery, pick: (a: LiveAlert) => string) => {
    const base = filterAlerts(alerts, { ...query, [key]: 'all' })
    const counts = new Map<string, number>()
    for (const a of base) counts.set(pick(a), (counts.get(pick(a)) ?? 0) + 1)
    return { counts, total: base.length }
  }
  const branches = countsFor('branch', (a) => a.branch ?? 'none')
  const states = countsFor('visitState', (a) => a.visitState ?? 'none')
  const services = countsFor('serviceType', (a) => a.serviceType ?? 'none')

  const totals = useMemo(() => countBySeverity(live), [live])
  const allTabs = useMemo(() => countByTab(alerts), [alerts])
  const anyFilter =
    tab !== 'all' || branch !== 'all' || visitState !== 'all' || serviceType !== 'all'
  /** Incidents that have not yet settled — the design's "Open Incidents". */
  const openIncidents = useMemo(
    () => live.filter((a) => matchesTab(a, 'incidents') && a.timing === 'changeable')
      .length,
    [live],
  )

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <ol className="text-ink-subtle flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link to={boardHref} className="hover:text-ink">
              Live monitoring
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-brand-700 font-medium" aria-current="page">
            Alerts &amp; incidents
          </li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">
            Alerts &amp; incidents
          </h1>
          <p className="text-ink-muted mt-1 max-w-2xl text-sm">
            {/* Not "Live · updated 30s ago": nothing polls, and the fixture's
                clock does not move on its own. */}
            Operational alerts and incidents across today&rsquo;s board, worked
            out from the records rather than filed by anyone.{' '}
            <Link to={queueHref} className="text-brand-700">
              Attention Required
            </Link>{' '}
            is the same day as a work queue, with the buttons to act on it, and{' '}
            <Link to="/live-monitoring/history" className="text-brand-700">
              Monitoring history
            </Link>{' '}
            covers the days before this one.
          </p>
        </div>
      </header>

      <ClockCard
        now={now}
        onChange={(next) => set('at', next)}
        summary={
          shown.length === alerts.length
            ? `${formatTime(now)} — ${alerts.length} alert${alerts.length === 1 ? '' : 's'}, ${totals.critical} critical.`
            : `${formatTime(now)} — ${shown.length} of ${alerts.length} alert${alerts.length === 1 ? '' : 's'} shown.`
        }
      />

      {/* Five tiles, following the design: tinted icon, figure, label. Every
          figure counted from the rows below — the source headlined "8 Active /
          3 High / 1 Critical / 4 Open Incidents / 6 Resolved Today" over a
          table of seven.

          Read-only, as designed. Four of the five correspond to a tab and one
          — High priority — has no tab to select, and five identical-looking
          cards where only four respond is worse than five that all just
          report. The tabs immediately below do the filtering. */}
      <section aria-labelledby="alert-totals">
        <h2 id="alert-totals" className="sr-only">
          Totals at {formatTime(now)}
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Tile
            icon={Activity}
            tint="brand"
            label="Active alerts"
            value={allTabs.active}
          />
          <Tile
            icon={CircleAlert}
            tint="amber"
            label="High priority"
            value={totals.high}
          />
          <Tile
            icon={ShieldAlert}
            tint="red"
            label="Critical"
            value={totals.critical}
          />
          <Tile
            icon={TriangleAlert}
            tint="orange"
            // "Open" is the design's word and it is the right one: an incident
            // that has cleared is not open.
            label="Open incidents"
            value={openIncidents}
          />
          <Tile
            icon={CircleCheck}
            tint="green"
            label="Resolved today"
            value={allTabs.resolved}
          />
        </ul>
      </section>

      <section aria-labelledby="alerts-list" className="space-y-4">
        <h2 id="alerts-list" className="sr-only">
          Alerts
        </h2>

        {/* Tabs, then dropdowns, as the design has it. */}
        <div
          role="group"
          aria-label="Filter by what the alert is about"
          className="border-line no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
        >
          {alertTabs.map((t) => {
            const active = t.value === tab
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => set('tab', t.value)}
                aria-pressed={active}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-brand-600 text-brand-700'
                    : 'text-ink-muted hover:text-ink border-transparent',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                    active ? 'bg-brand-50 text-brand-700' : 'bg-sunken text-ink-subtle',
                  )}
                >
                  {tabCounts[t.value]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Branch, Visit status, Service type — the design's three, all of
            them things the fixture actually carries. Priority moved out: it is
            a column here and the Critical tab covers the urgent case. */}
        <p className="text-ink-subtle text-xs">
          {alertTabs.find((t) => t.value === tab)!.hint}
        </p>

        {/* The register has none of these fields — an incident belongs to a
            client and a reporter, not to a visit's branch or service type — so
            the filters are hidden rather than left inert on that tab. */}
        {tab !== 'incidents' && (
        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter
            label="Branch"
            value={branch}
            onChange={(v) => set('team', v)}
            options={[
              { value: 'all', label: `All branches (${branches.total})` },
              ...branchesOnRoster
                .filter((b) => (branches.counts.get(b) ?? 0) > 0 || branch === b)
                .map((b) => ({
                  value: b,
                  label: `${b} (${branches.counts.get(b) ?? 0})`,
                })),
              // Named, not hidden. An unfilled slot has no caregiver and so no
              // branch, and a client-level fact is not about a caregiver at
              // all — both are what a branch filter would otherwise make
              // vanish without saying so.
              ...((branches.counts.get('none') ?? 0) > 0 || branch === 'none'
                ? [
                    {
                      value: 'none',
                      label: `Not tied to a branch (${branches.counts.get('none') ?? 0})`,
                    },
                  ]
                : []),
            ]}
          />
          <SelectFilter
            label="Visit status"
            value={visitState}
            onChange={(v) => set('state', v)}
            options={[
              { value: 'all', label: `Any (${states.total})` },
              ...Object.keys(stateLabels)
                .filter(
                  (st) => (states.counts.get(st) ?? 0) > 0 || visitState === st,
                )
                .map((st) => ({
                  value: st,
                  label: `${stateLabels[st as keyof typeof stateLabels]} (${states.counts.get(st) ?? 0})`,
                })),
              // A lapsed credential and a client's care status are not about
              // any single visit, so they have no visit status to filter on.
              ...((states.counts.get('none') ?? 0) > 0 || visitState === 'none'
                ? [
                    {
                      value: 'none',
                      label: `No visit behind it (${states.counts.get('none') ?? 0})`,
                    },
                  ]
                : []),
            ]}
          />
          <SelectFilter
            label="Service type"
            value={serviceType}
            onChange={(v) => set('service', v)}
            options={[
              { value: 'all', label: `All (${services.total})` },
              ...serviceTypes
                .filter(
                  (t) => (services.counts.get(t) ?? 0) > 0 || serviceType === t,
                )
                .map((t) => ({
                  value: t,
                  label: `${t} (${services.counts.get(t) ?? 0})`,
                })),
              ...((services.counts.get('none') ?? 0) > 0 || serviceType === 'none'
                ? [
                    {
                      value: 'none',
                      label: `No visit behind it (${services.counts.get('none') ?? 0})`,
                    },
                  ]
                : []),
            ]}
          />
          {anyFilter && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(params)
                for (const key of ['tab', 'team', 'state', 'service']) next.delete(key)
                setParams(next)
              }}
              className="text-brand-700 hover:text-brand-800 inline-flex min-h-11 items-center px-1 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
        )}

        {tab === 'incidents' ? (
          <IncidentRegister incidents={incidents} />
        ) : tab === 'emergencies' ? (
          <EmergencyPanels alerts={shown} now={now} />
        ) : tab === 'resolved' ? (
          <ResolvedTable alerts={shown} now={now} />
        ) : (
        <Panel
          title={`Alerts at ${formatTime(now)}`}
          badge={
            <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
              {shown.length}
              {shown.length !== alerts.length && ` of ${alerts.length}`}
            </span>
          }
          flush
        >
          {shown.length === 0 ? (
            <p
              className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm"
              role="status"
            >
              {/* Any of the four controls can be the reason, so the message
                  names the ones actually applied. Each is its own clause:
                  joining the labels with "+" mixed nouns and verb phrases. */}
              {/* The Resolved and Incidents tabs render their own tables and
                  their own empty states, so this branch only ever serves All,
                  Active Alerts and Emergencies. */}
              {alerts.length === 0
                ? `Nothing on the board needs a coordinator at ${formatTime(now)}.`
                : `Nothing at ${formatTime(now)} is ${[
                    tab !== 'all' &&
                      `under ${alertTabs
                        .find((t) => t.value === tab)!
                        .label.toLowerCase()}`,
                    branch !== 'all' &&
                      (branch === 'none' ? 'without a branch' : `with ${branch}`),
                    visitState !== 'all' &&
                      (visitState === 'none'
                        ? 'without a visit behind it'
                        : `on a visit that is “${stateLabels[visitState as keyof typeof stateLabels]}”`),
                    serviceType !== 'all' &&
                      (serviceType === 'none'
                        ? 'without a service type'
                        : `a ${serviceType.toLowerCase()} visit`),
                  ]
                    .filter(Boolean)
                    .join(' and ')}.`}
            </p>
          ) : (
            <>
              <div
                tabIndex={0}
                role="region"
                aria-label="Alerts table"
                className="border-line hidden overflow-x-auto border-t xl:block"
              >
                <table className="w-full min-w-4xl text-left text-sm">
                  <thead className="text-ink-subtle bg-sunken text-xs">
                    <tr>
                      {[
                        'Alert type',
                        'Description',
                        // "Source" is the right word and stays: it means who
                        // or what the alert came off, which covers a client, a
                        // caregiver whose credential lapsed, or a medication
                        // plan without implying any of them.
                        'Source',
                        'Time',
                        'Priority',
                        // Not the design's Active / Investigating /
                        // Acknowledged / Resolved: nothing stores an alert, so
                        // there is no state to move one into.
                        'Status',
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
                    {shown.map((alert) => (
                      <AlertTableRow key={alert.id} alert={alert} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* AlertCard is itself an <li>; wrapping it in another was invalid
                  and doubled the padding. */}
              <ul className="border-line divide-line divide-y border-t xl:hidden">
                {shown.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </ul>
            </>
          )}

          <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
            Every row is worked out from the clock, the visit record, the
            medication plan, the care notes or the{' '}
            <Link to="/scheduling?view=conflicts" className="text-brand-700">
              Scheduling board
            </Link>{' '}
            — each row says which underneath its description. Nothing is stored
            as an alert, so there is nothing to resolve: a row disappears when
            the fact behind it stops being true, and Status moves on its own as
            the clock passes — a changeable row becomes one that is on the
            record without anybody touching it. Acknowledging is the one thing
            here a person does rather than the clock, and it is held for this
            session only: it says somebody has picked the problem up, never that
            the problem has gone.
          </p>
        </Panel>
        )}
      </section>
    </div>
  )
}

const tileTints = {
  brand: 'bg-brand-50 text-brand-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
  green: 'bg-emerald-50 text-emerald-600',
} as const

function Tile({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: LucideIcon
  tint: keyof typeof tileTints
  label: string
  value: number
}) {
  return (
    <li className="card p-4">
      {/* Decorative: the label below already names the figure, and an icon
          that repeated it would be read twice. */}
      <span
        aria-hidden="true"
        className={cn('grid size-9 place-items-center rounded-xl', tileTints[tint])}
      >
        <Icon className="size-4.5" strokeWidth={2.2} />
      </span>
      <span className="text-ink mt-3 block text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </span>
      <span className="text-ink-muted mt-0.5 block text-sm">{label}</span>
    </li>
  )
}

/**
 * The Status column.
 *
 * Three derived states — cleared (the thread stopped raising anything), still
 * changeable, or already on the record — and three that are not derived at all.
 * The design's Active / Investigating / Acknowledged / Resolved needed somebody
 * to have pressed something, and three of those four now exist: a person can
 * honestly assert that they picked an alert up, handed it on, or settled one
 * whose record was already written.
 *
 * All three sit *under* the derived state rather than replacing it. Somebody
 * picking a problem up does not make the problem stop being true, and neither
 * does signing it off: the row still says the visit went uncovered, because it
 * did.
 */
function StatusCell({ alert }: { alert: LiveAlert }) {
  const { acknowledgementFor, escalationFor, resolutionFor } = useAlertActions()
  const ack = acknowledgementFor(TODAY, alert.thread)
  const escalation = escalationFor(TODAY, alert.thread)
  const resolution = resolutionFor(TODAY, alert.thread)

  return (
    <>
      {alert.clearedAt ? (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-emerald-700">
          Cleared {formatTime(alert.clearedAt)}
        </span>
      ) : (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
            alert.timing === 'changeable'
              ? 'bg-amber-50 text-amber-800'
              : 'bg-sunken text-ink-muted',
          )}
        >
          {alertTimingLabels[alert.timing]}
        </span>
      )}
      {ack && (
        <span className="text-ink-subtle mt-1 block text-xs whitespace-nowrap">
          Picked up {formatTime(ack.at)} by {ack.by}
        </span>
      )}
      {escalation && (
        <span className="mt-0.5 block text-xs whitespace-nowrap text-amber-800">
          Escalated to {escalation.toName}
        </span>
      )}
      {resolution && (
        <span className="mt-0.5 block text-xs whitespace-nowrap text-emerald-700">
          Resolved {formatTime(resolution.at)} by {resolution.by}
        </span>
      )}
    </>
  )
}

function AlertTableRow({ alert }: { alert: LiveAlert }) {
  return (
    <tr
      className={cn(
        'transition-colors',
        alert.severity === 'critical' ? 'bg-red-50/60' : 'hover:bg-canvas',
      )}
    >
      <th scope="row" className="px-4 py-3.5 break-words">
        {/* The type is the link, pointed at the record rather than the remedy:
            `action.to` for an unassigned visit is the assign *form*, so
            clicking "Nobody on the visit" dropped a coordinator into a booking
            screen instead of the visit it names. */}
        <Link
          to={alert.secondary?.to ?? alert.action.to}
          className="text-ink hover:text-brand-700 font-semibold"
        >
          {alertKindLabels[alert.kind]}
          <span className="sr-only"> — {alert.subject}</span>
        </Link>
      </th>
      <td
        className="text-ink-muted max-w-xs px-4 py-3.5"
        // The provenance. Kept off the row to match the design's single line
        // per cell, but not dropped — these are derived facts, not entries
        // somebody filed, and the card layout below shows it outright.
        title={`${alert.detail}\n\nRead off: ${alert.source}`}
      >
        <span className="block truncate">{alert.detail}</span>
      </td>
      <td className="text-ink px-4 py-3.5 whitespace-nowrap">
        {alert.subject}
        {alert.counterpart && (
          <span className="text-ink-subtle block text-xs">
            with {alert.counterpart}
          </span>
        )}
      </td>
      <td className="text-ink-muted px-4 py-3.5 whitespace-nowrap">
        {/* Empty where there is no stopwatch, rather than borrowing the column
            for something that is not a duration — the design put "10m ago",
            "No GPS Lock" and "Late 15m" under one heading. */}
        {alert.elapsed ? (
          `${alert.elapsed} ago`
        ) : (
          <span className="text-ink-subtle">
            {alert.weekScoped ? 'This week' : 'Not timed'}
          </span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <SeverityBadge severity={alert.severity} />
      </td>
      <td className="px-4 py-3.5">
        <StatusCell alert={alert} />
      </td>
    </tr>
  )
}

function AlertCard({ alert }: { alert: LiveAlert }) {
  return (
    <li className={cn('p-4', alert.severity === 'critical' && 'bg-red-50/60')}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <Link
          to={alert.secondary?.to ?? alert.action.to}
          className="text-brand-700 hover:text-brand-800 min-w-0 text-sm font-semibold break-words"
        >
          {alertKindLabels[alert.kind]}
        </Link>
        <span className="flex shrink-0 flex-wrap items-center gap-1.5">
          <SeverityBadge severity={alert.severity} />
          <StatusCell alert={alert} />
        </span>
      </div>
      <p className="text-ink-muted mt-1 text-sm break-words">{alert.detail}</p>
      <p className="text-ink mt-1.5 text-sm break-words">
        {alert.subject}
        {alert.counterpart && (
          <span className="text-ink-subtle"> with {alert.counterpart}</span>
        )}
      </p>
      <p className="text-ink-subtle mt-0.5 text-xs break-words">
        {alertCategoryLabels[alertCategoryOf[alert.kind]]}
        {' · '}
        {alert.elapsed
          ? `For ${alert.elapsed}`
          : alert.weekScoped
            ? 'This week'
            : 'Not timed'}
        {' · '}
        {alert.branch ?? 'Not tied to a branch'}
      </p>
      <p className="text-ink-subtle mt-0.5 text-xs break-words">
        Read off: {alert.source}
      </p>
    </li>
  )
}

/**
 * The incident register — the design's Incidents tab, which is a different
 * table over a different entity.
 *
 * Six columns, following the design. Four map onto fields the note actually
 * holds. Two do not and are renamed rather than filled with invention:
 *
 *  - SEVERITY becomes RAISED. A note carries one bit — flagged for review —
 *    not a scale, and painting that bit as High/Medium would be a rating
 *    nobody gave.
 *  - STATUS becomes FOLLOW-UP. There is no Open/Closed/Resolved on a note; the
 *    nearest real signal of whether anybody picked it up is the reply count,
 *    which the note does keep.
 */
function IncidentRegister({ incidents }: { incidents: IncidentRecord[] }) {
  return (
    <Panel
      title="Incident register"
      badge={
        <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
          Last {INCIDENT_WINDOW_DAYS} days
        </span>
      }
      flush
    >
      {incidents.length === 0 ? (
        <p
          className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm"
          role="status"
        >
          No incident has been written up in the last {INCIDENT_WINDOW_DAYS} days.
        </p>
      ) : (
        <>
          <div
            tabIndex={0}
            role="region"
            aria-label="Incident register table"
            className="border-line hidden overflow-x-auto border-t xl:block"
          >
            <table className="w-full min-w-4xl text-left text-sm">
              <thead className="text-ink-subtle bg-sunken text-xs">
                <tr>
                  {[
                    'Incident ID',
                    'Description',
                    'Reporter',
                    'Date',
                    'Raised',
                    'Follow-up',
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
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-canvas transition-colors">
                    <th scope="row" className="px-4 py-3.5 whitespace-nowrap">
                      <Link
                        to={`/live-monitoring/alerts/${incident.reference}/overview`}
                        className="text-brand-700 hover:text-brand-800 font-medium"
                      >
                        {incident.reference}
                        <span className="sr-only"> — {incident.recipientName}</span>
                      </Link>
                    </th>
                    <td className="text-ink max-w-md px-4 py-3.5" title={incident.body}>
                      <span className="block truncate">{incident.body}</span>
                      {/* Whose incident it is. The design's table never says,
                          which on a register spanning every client is the one
                          thing you cannot leave out. */}
                      <span className="text-ink-subtle block text-xs">
                        {incident.recipientName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-ink block">{incident.reporter}</span>
                      <span className="text-ink-subtle block text-xs">
                        {incident.reporterRole}
                      </span>
                    </td>
                    <td className="text-ink-muted px-4 py-3.5 whitespace-nowrap">
                      <time dateTime={incident.at}>
                        {formatIncidentAge(incident.at)}
                      </time>
                      <span className="text-ink-subtle block text-xs">
                        {incident.at.slice(0, 10)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <RaisedBadge flagged={incident.flagged} />
                    </td>
                    <td className="text-ink-muted px-4 py-3.5 whitespace-nowrap">
                      <FollowUp incident={incident} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="border-line divide-line divide-y border-t xl:hidden">
            {incidents.map((incident) => (
              <li key={incident.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <Link
                    to={`/live-monitoring/alerts/${incident.reference}/overview`}
                    className="text-brand-700 hover:text-brand-800 text-sm font-semibold"
                  >
                    {incident.reference}
                  </Link>
                  <RaisedBadge flagged={incident.flagged} />
                </div>
                <p className="text-ink mt-1 text-sm break-words">{incident.body}</p>
                <p className="text-ink-subtle mt-1.5 text-xs break-words">
                  {incident.recipientName} · written up by {incident.reporter} (
                  {incident.reporterRole}) ·{' '}
                  <time dateTime={incident.at}>
                    {formatIncidentAge(incident.at)}
                  </time>
                </p>
                <p className="text-ink-subtle mt-0.5 text-xs">
                  <FollowUp incident={incident} />
                </p>
              </li>
            ))}
          </ul>

          <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
            Incidents a caregiver wrote up, taken from the clients&rsquo; own
            care notes — this app has no separate incidents table. Unlike the
            other tabs these are filed documents rather than facts derived from
            the clock, so they do not change as the day runs and the window is
            the last {INCIDENT_WINDOW_DAYS} days rather than today. The
            reference is derived from the note&rsquo;s date and order, not a
            ticket number the agency issued.
          </p>
        </>
      )}
    </Panel>
  )
}

function RaisedBadge({ flagged }: { flagged: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        flagged ? 'bg-red-50 text-red-700' : 'bg-sunken text-ink-muted',
      )}
    >
      {flagged ? 'Flagged for review' : 'Filed'}
    </span>
  )
}

function FollowUp({ incident }: { incident: IncidentRecord }) {
  return (
    <>
      {incident.replies === 0
        ? 'No reply yet'
        : `${incident.replies} ${incident.replies === 1 ? 'reply' : 'replies'}`}
      {incident.attachments > 0 && (
        <span className="text-ink-subtle">
          {' · '}
          {incident.attachments}{' '}
          {incident.attachments === 1 ? 'attachment' : 'attachments'}
        </span>
      )}
    </>
  )
}

/**
 * The Emergencies tab: a detail panel per critical alert, not a table row.
 *
 * The design is right that this deserves its own treatment — one client
 * without the care they are booked for is not a row to scan past. What it
 * fills the panel with is mostly unavailable:
 *
 *  - "Caregiver Emergency SOS Triggered" needs a panic button. There is none.
 *  - "Geofence status confirmed" and "Automated system callback initiated"
 *    need a device feed and a telephony integration. There is neither.
 *  - The Emergency Response Protocol renders five ticked checkboxes, which
 *    claims somebody worked through a checklist this app does not store.
 *  - "Acknowledge & Assign" and "New / Unresolved" need alert state.
 *
 * What replaces them is what a coordinator actually needs in the thirty
 * seconds after opening this: where the client is, who is nearest to reach,
 * the standing instructions on their care plan, and the visit's real timeline.
 */
function EmergencyPanels({ alerts, now }: { alerts: LiveAlert[]; now: string }) {
  if (alerts.length === 0)
    return (
      <Panel title={`Emergencies at ${formatTime(now)}`}>
        <p
          className="text-ink-muted flex items-start gap-2 text-sm"
          role="status"
        >
          <CircleCheck
            className="mt-0.5 size-4 shrink-0 text-emerald-600"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          <span>
            Nobody on today&rsquo;s board is without the care they are booked
            for at {formatTime(now)}. Critical means exactly that — a visit
            running with no caregiver, or a dose the record says was missed.
          </span>
        </p>
      </Panel>
    )

  return (
    <div className="space-y-4">
      <p
        role="alert"
        className="flex items-center gap-2.5 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white"
      >
        <CircleAlert className="size-5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        Critical — {alerts.length}{' '}
        {alerts.length === 1 ? 'client is' : 'clients are'} without the care they
        are booked for
      </p>
      {alerts.map((alert) => (
        <EmergencyCard key={alert.id} alert={alert} now={now} />
      ))}
    </div>
  )
}

function EmergencyCard({ alert, now }: { alert: LiveAlert; now: string }) {
  const [acknowledging, setAcknowledging] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [resolving, setResolving] = useState(false)
  const { acknowledgementFor, escalationFor, resolutionFor } = useAlertActions()
  const ack = acknowledgementFor(TODAY, alert.thread)
  const escalation = escalationFor(TODAY, alert.thread)
  const resolution = resolutionFor(TODAY, alert.thread)

  // Visit-scoped alerts carry the visit id as their thread, which is all the
  // rest of the record hangs off. A critical alert with no visit behind it
  // still renders — just without the columns a visit would supply.
  const context = contextFor(alert.thread)
  const place = context ? placeOfRecipient(context.visit.recipientId) : undefined
  const standing = context?.carePlan
    ? [...context.carePlan.medicalNeeds, ...context.carePlan.behavioural].filter(
        (i) => i.level !== 'standard',
      )
    : []

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="card border-red-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h3 className="text-ink min-w-0 text-lg font-bold tracking-tight break-words">
            {alert.label}
          </h3>
          <span className="text-ink-subtle shrink-0 text-xs">
            {/* The visit's own reference, derived from its date and rota slot
                — not an incident number, because no incident has been filed. */}
            {context ? referenceFor(context.visit) : alert.id}
          </span>
        </div>
        <p className="text-ink-muted mt-1 text-sm break-words">{alert.detail}</p>

        <dl className="divide-line mt-4 divide-y border-t border-b">
          <Row label="Care recipient" value={alert.subject} />
          <Row
            label="Caregiver"
            value={
              context?.visit.caregiverName ?? (
                <span className="font-semibold text-red-700">Nobody assigned</span>
              )
            }
          />
          {context && (
            <Row
              label="Visit"
              value={`${context.visit.type}, ${formatTime(context.visit.start)}–${formatTime(context.visit.end)}`}
            />
          )}
          {place && <Row label="Address" value={place.address} />}
          <Row
            label={alert.elapsed ? 'Unattended for' : 'Raised'}
            value={
              alert.elapsed ? (
                <span className="font-semibold text-red-700">{alert.elapsed}</span>
              ) : (
                formatTime(now)
              )
            }
          />
          <Row label="Read off" value={alert.source} />
        </dl>

        <h4 className="text-ink-subtle mt-4 text-xs font-semibold tracking-wider uppercase">
          Actions
        </h4>
        {/* No "Contact emergency services" — the app holds no emergency number
            and a button that dials nothing is worse than no button. "Resolve"
            appears only where the record is already written: while the fact can
            still change, the alert goes when the fact goes, and signing it off
            first would clear a row for a client who is still without a
            caregiver. */}
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            to={alert.action.to}
            className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white"
          >
            {alert.action.label}
          </Link>
          {resolution ? (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-50 px-4 text-sm font-medium text-emerald-800">
              <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
              Resolved by {resolution.by} at {formatTime(resolution.at)} —{' '}
              {resolutionCategoryLabels[resolution.category].toLowerCase()}
              <button
                type="button"
                onClick={() => withdrawResolution(TODAY, alert.thread)}
                className="text-emerald-900 underline underline-offset-2 hover:no-underline"
              >
                Undo
              </button>
            </span>
          ) : canResolve(alert) ? (
            <button
              type="button"
              onClick={() => setResolving(true)}
              className="inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Resolve
            </button>
          ) : (
            // Said rather than left blank: a button that is present on some
            // rows and absent on others, with no reason on screen, reads as a
            // bug.
            <span className="text-ink-subtle inline-flex min-h-11 items-center text-xs">
              Nothing to sign off yet — this one clears itself when the record
              changes.
            </span>
          )}
          {ack ? (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-50 px-4 text-sm font-medium text-emerald-800">
              <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
              Picked up by {ack.by} at {formatTime(ack.at)}
              <button
                type="button"
                onClick={() => withdrawAcknowledgement(TODAY, alert.thread)}
                className="text-emerald-900 underline underline-offset-2 hover:no-underline"
              >
                Undo
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAcknowledging(true)}
              className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
            >
              Acknowledge
            </button>
          )}
          {escalation ? (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-50 px-4 text-sm font-medium text-amber-900">
              Escalated to {escalation.toName} ({escalation.toTitle}) at{' '}
              {formatTime(escalation.at)}
              <a
                href={telHref(escalation.toPhone)}
                className="inline-flex items-center gap-1.5 underline underline-offset-2 hover:no-underline"
              >
                <Phone className="size-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
                {escalation.toPhone}
              </a>
              <button
                type="button"
                onClick={() => withdrawEscalation(TODAY, alert.thread)}
                className="underline underline-offset-2 hover:no-underline"
              >
                Undo
              </button>
            </span>
          ) : (
            escalationTiers.length > 0 && (
              <button
                type="button"
                onClick={() => setEscalating(true)}
                className="inline-flex min-h-11 items-center rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Escalate
              </button>
            )
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
          {resolving && (
            <ResolveAlertDialog
              alert={alert}
              date={TODAY}
              now={now}
              onClose={() => setResolving(false)}
            />
          )}
          {alert.contact && (
            <a
              href={telHref(alert.contact.phone)}
              className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
            >
              <Phone className="size-4" strokeWidth={1.9} aria-hidden="true" />
              {alert.contact.label}
              <span className="text-ink-subtle">
                {alert.contact.role.toLowerCase()}
              </span>
            </a>
          )}
          {alert.secondary && (
            <Link
              to={alert.secondary.to}
              className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
            >
              {alert.secondary.label}
            </Link>
          )}
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        {/* Where the design has a ticked-off response protocol. These are the
            client's own standing instructions from their care plan — real, and
            the thing somebody arriving cold actually needs. Nothing here
            claims any step has been done. */}
        <h3 className="text-ink text-base font-semibold tracking-tight">
          Standing instructions
        </h3>
        {standing.length === 0 ? (
          <p className="text-ink-subtle mt-2 text-sm">
            {context
              ? `No caution or critical instruction is on ${alert.subject}’s care plan.`
              : 'No care plan is attached to this alert.'}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {standing.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'rounded-lg border p-2.5 text-sm break-words',
                  item.level === 'critical'
                    ? 'border-red-200 bg-red-50 text-red-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900',
                )}
              >
                <span className="mr-1.5 text-xs font-semibold uppercase">
                  {item.level}
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        )}

        {context && (
          <>
            <h3 className="text-ink mt-5 text-base font-semibold tracking-tight">
              Who to reach
            </h3>
            <dl className="divide-line mt-2 divide-y border-t">
              <Row
                label="Coordinator"
                value={context.profile.summary.coordinator}
              />
              {context.primaryContact ? (
                <Row
                  label={`${context.primaryContact.relationship}`}
                  value={
                    <a
                      href={telHref(context.primaryContact.phone)}
                      className="text-brand-700 hover:text-brand-800"
                    >
                      {context.primaryContact.name} · {context.primaryContact.phone}
                    </a>
                  }
                />
              ) : (
                <Row label="Family contact" value="None on file" />
              )}
            </dl>

            <h3 className="text-ink mt-5 text-base font-semibold tracking-tight">
              Timeline
            </h3>
            {context.timeline.length === 0 ? (
              <p className="text-ink-subtle mt-2 text-sm">
                Nothing on this visit carries a time.
              </p>
            ) : (
              <ol className="divide-line mt-2 divide-y border-t">
                {context.timeline.map((entry) => (
                  <li key={entry.id} className="flex gap-3 py-2">
                    <span className="text-ink-subtle w-16 shrink-0 text-xs tabular-nums">
                      {formatTime(entry.at)}
                    </span>
                    <span className="min-w-0">
                      <span className="text-ink block text-sm break-words">
                        {entry.label}
                      </span>
                      <span className="text-ink-subtle block text-xs">
                        {entry.source === 'record'
                          ? 'Recorded'
                          : 'Scheduled — nothing recorded it'}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-ink-subtle mt-2 text-xs">
              Every line is a time the record carries. There is no arrival ping,
              no location and no automated callback, so none appear.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5">
      <dt className="text-ink-muted min-w-0 text-sm">{label}</dt>
      <dd className="text-ink min-w-0 text-right text-sm font-medium break-words">
        {value}
      </dd>
    </div>
  )
}

/**
 * The Resolved tab: things that were true earlier today and are not now.
 *
 * Five of the design's six columns are real. The sixth is "Resolved by", filled
 * with names — "Sarah Jenkins", "System Auto". Nothing in this app records an
 * actor. An alert is recomputed from the records on every render, so what can
 * be known is which record moved, never who moved it, and the column says that
 * rather than picking a plausible name.
 */
function ResolvedTable({ alerts, now }: { alerts: LiveAlert[]; now: string }) {
  return (
    <Panel
      title={`Cleared earlier today, as at ${formatTime(now)}`}
      badge={
        alerts.length > 0 ? (
          <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
            {alerts.length}
          </span>
        ) : undefined
      }
      flush={alerts.length > 0}
    >
      {alerts.length === 0 ? (
        <p className="text-ink-muted text-sm" role="status">
          Nothing raised earlier today has cleared by {formatTime(now)}.
          <span className="text-ink-subtle mt-2 block">
            {/* Said plainly rather than left as a blank panel. This is a
                property of the sample data, not of the screen. */}
            Every alert here is derived from records that do not themselves
            change as the day runs, so a problem escalates — an overdue
            check-in becomes an unwritten-up visit — rather than going away.
            Against a live backend a caregiver checking in would move their row
            straight into this tab.
          </span>
        </p>
      ) : (
        <>
          <div
            tabIndex={0}
            role="region"
            aria-label="Resolved alerts table"
            className="border-line hidden overflow-x-auto border-t xl:block"
          >
            <table className="w-full min-w-4xl text-left text-sm">
              <thead className="text-ink-subtle bg-sunken text-xs">
                <tr>
                  {[
                    'Alert type',
                    'Description',
                    'Source',
                    // Not "Resolved by": no actor is recorded anywhere.
                    'How it cleared',
                    'Cleared',
                    'Open for',
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
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-canvas transition-colors">
                    <th scope="row" className="px-4 py-3.5 break-words">
                      <Link
                        to={alert.secondary?.to ?? alert.action.to}
                        className="text-ink hover:text-brand-700 font-semibold"
                      >
                        {alertKindLabels[alert.kind]}
                        <span className="sr-only"> — {alert.subject}</span>
                      </Link>
                    </th>
                    <td
                      className="text-ink-muted max-w-xs px-4 py-3.5"
                      title={`${alert.detail}\n\nRead off: ${alert.source}`}
                    >
                      <span className="block truncate">{alert.detail}</span>
                    </td>
                    <td className="text-ink px-4 py-3.5 whitespace-nowrap">
                      {alert.subject}
                    </td>
                    <td className="text-ink-muted px-4 py-3.5 break-words">
                      {clearedBecause[alert.kind]}
                      <span className="text-ink-subtle block text-xs">
                        Nobody is recorded as having done it
                      </span>
                    </td>
                    <td className="text-ink-muted px-4 py-3.5 whitespace-nowrap tabular-nums">
                      {alert.clearedAt ? formatTime(alert.clearedAt) : '—'}
                    </td>
                    <td className="text-ink-muted px-4 py-3.5 whitespace-nowrap">
                      {/* Raised until cleared, both worked out by walking the
                          day — not a service-level figure anybody agreed. */}
                      {alert.openFor ?? '—'}
                      {alert.raisedAt && (
                        <span className="text-ink-subtle block text-xs tabular-nums">
                          from {formatTime(alert.raisedAt)}
                        </span>
                      )}
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
                  <Link
                    to={alert.secondary?.to ?? alert.action.to}
                    className="text-ink hover:text-brand-700 min-w-0 text-sm font-semibold break-words"
                  >
                    {alertKindLabels[alert.kind]}
                  </Link>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Cleared {alert.clearedAt ? formatTime(alert.clearedAt) : ''}
                  </span>
                </div>
                <p className="text-ink-muted mt-1 text-sm break-words">
                  {alert.detail}
                </p>
                <p className="text-ink mt-1.5 text-sm break-words">{alert.subject}</p>
                <p className="text-ink-subtle mt-0.5 text-xs break-words">
                  {clearedBecause[alert.kind]} · open for {alert.openFor ?? '—'}
                  {alert.raisedAt && ` from ${formatTime(alert.raisedAt)}`}
                </p>
                <p className="text-ink-subtle mt-0.5 text-xs break-words">
                  Read off: {alert.source}
                </p>
              </li>
            ))}
          </ul>

          <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
            A row lands here when the thing behind it stopped being true —
            worked out by replaying the day, not by anybody marking it done. A
            problem that merely changed name is not counted: an unattended visit
            becoming an uncovered one stays open. Nothing records who acted, so
            &ldquo;how it cleared&rdquo; names the record that moved rather than
            a person.
          </p>
        </>
      )}
    </Panel>
  )
}
