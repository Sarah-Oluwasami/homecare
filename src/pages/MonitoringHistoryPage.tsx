import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Info, Search } from 'lucide-react'
import {
  formatDuration,
  formatHistoryDate,
  historyAlerts,
  historyIncidents,
  historyRanges,
  historyVisits,
  outcomeLabels,
} from '@/features/monitoring/history-data'
import type { HistoryRange, VisitOutcome } from '@/features/monitoring/history-data'
import {
  alertKindLabels,
  alertTimingLabels,
  formatTime,
} from '@/features/monitoring/live-data'
import {
  formatIncidentAge,
  incidentOutcomeLabels,
  incidentTypeLabels,
} from '@/features/monitoring/incidents-data'
import type {
  IncidentOutcome,
  IncidentSeverity,
  IncidentType,
} from '@/features/monitoring/incidents-data'
import { referenceFor } from '@/features/scheduling/visit-detail'
import { boardOn } from '@/features/scheduling/board-data'
import { branchesOnRoster } from '@/features/scheduling/assign-data'
import { Pagination } from '@/components/ui/Pagination'
import { Panel } from '@/components/ui/Panel'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { PriorityBadge, SeverityBadge } from '@/components/ui/StatusBadge'
import type { Severity } from '@/types'
import { cn } from '@/lib/cn'

const tabs = [
  { slug: 'visits', label: 'Completed Visits' },
  { slug: 'alerts', label: 'Past Alerts' },
  { slug: 'incidents', label: 'Past Incidents' },
] as const

type TabSlug = (typeof tabs)[number]['slug']

const PAGE_SIZE = 10

/**
 * Free-text match. A module-level helper rather than a closure over `term`,
 * so the memos below can list their real dependencies instead of silencing
 * the exhaustive-deps rule three times.
 */
function matches(term: string, ...fields: (string | null)[]): boolean {
  return (
    term === '' || fields.some((f) => f !== null && f.toLowerCase().includes(term))
  )
}

/** Loudest first, the order the live board ranks them in. */
const severityOrder: Severity[] = ['critical', 'high', 'medium']

const severityLabels: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
}

/**
 * Incidents run one step lower than alerts: an alert is by definition something
 * worth a coordinator's minute, while an incident can be a jammed key safe.
 */
const incidentSeverityOrder: IncidentSeverity[] = ['critical', 'high', 'medium', 'low']

const incidentSeverityLabels: Record<IncidentSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const outcomeToneOf: Record<IncidentOutcome, string> = {
  open: 'bg-amber-50 text-amber-800',
  resolved: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-sunken text-ink-muted',
}

const outcomeTone: Record<VisitOutcome, string> = {
  'written-up': 'bg-emerald-50 text-emerald-700',
  late: 'bg-amber-50 text-amber-800',
  unrecorded: 'bg-sunken text-ink-muted',
  uncovered: 'bg-red-50 text-red-700',
  cancelled: 'bg-red-50 text-red-700',
}

/**
 * Monitoring history — days that have finished.
 *
 * The third screen under Live Monitoring, beside the board (right now) and
 * Alerts & incidents (today). Nothing here is stored: every row is recomputed
 * from the same records the live screens read, which is why most past visits
 * read "Not written up" rather than "Completed". The app has no way to say a
 * visit happened without a record of it, and a history that quietly upgraded
 * those to Completed would be the most consequential fiction on the screen.
 */
export function MonitoringHistoryPage() {
  const [params, setParams] = useSearchParams()

  const rawTab = params.get('tab') ?? 'visits'
  const tab = (tabs.find((t) => t.slug === rawTab)?.slug ?? 'visits') as TabSlug
  const rawRange = params.get('range') ?? '30'
  const range = (historyRanges.some((r) => r.value === rawRange)
    ? rawRange
    : '30') as HistoryRange
  const rawBranch = params.get('branch') ?? 'all'
  const branch =
    rawBranch === 'none' || branchesOnRoster.includes(rawBranch) ? rawBranch : 'all'
  const rawOutcome = params.get('outcome') ?? 'all'
  const outcome = (
    rawOutcome in outcomeLabels ? rawOutcome : 'all'
  ) as VisitOutcome | 'all'
  const search = params.get('q') ?? ''

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    // A filter change invalidates the page number: staying on page 3 of a
    // one-page result showed nothing.
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: key === 'q' })
  }

  const visits = useMemo(() => historyVisits(range), [range])
  const alerts = useMemo(() => historyAlerts(range), [range])
  const incidents = useMemo(() => historyIncidents(range), [range])

  // Both lists come off the visits in range rather than the full directory:
  // a filter that offers a name with nothing behind it only ever returns an
  // empty table.
  const recipientOptions = useMemo(() => {
    const found = new Map<string, string>()
    for (const v of visits) found.set(v.recipientId, v.recipientName)
    return [...found]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [visits])

  const caregiverOptions = useMemo(() => {
    const found = new Map<string, string>()
    let unassigned = false
    for (const v of visits) {
      if (v.caregiverId === null) unassigned = true
      else found.set(v.caregiverId, v.caregiverName ?? v.caregiverId)
    }
    const named = [...found]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
    // A visit nobody was ever put on still happened — or didn't. Named rather
    // than dropped, or the counts stop adding up.
    return unassigned ? [...named, { value: 'unassigned', label: 'Unassigned' }] : named
  }, [visits])

  // Same rule for the alerts tab: only what the range actually raised.
  const priorityOptions = useMemo(() => {
    const present = new Set(alerts.map((a) => a.severity))
    return severityOrder
      .filter((s) => present.has(s))
      .map((s) => ({ value: s as string, label: severityLabels[s] }))
  }, [alerts])

  const kindOptions = useMemo(() => {
    const present = new Set(alerts.map((a) => a.kind))
    return [...present]
      .map((k) => ({ value: k as string, label: alertKindLabels[k] }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [alerts])

  const rawRecipient = params.get('recipient') ?? 'all'
  const recipient = recipientOptions.some((o) => o.value === rawRecipient)
    ? rawRecipient
    : 'all'
  const rawCaregiver = params.get('caregiver') ?? 'all'
  const caregiver = caregiverOptions.some((o) => o.value === rawCaregiver)
    ? rawCaregiver
    : 'all'
  const rawPriority = params.get('priority') ?? 'all'
  const priority = priorityOptions.some((o) => o.value === rawPriority)
    ? rawPriority
    : 'all'
  const rawKind = params.get('kind') ?? 'all'
  const kind = kindOptions.some((o) => o.value === rawKind) ? rawKind : 'all'

  // And again for the register.
  const typeOptions = useMemo(() => {
    const present = new Set(incidents.map((i) => i.type))
    return (Object.keys(incidentTypeLabels) as IncidentType[])
      .filter((t) => present.has(t))
      .map((t) => ({ value: t as string, label: incidentTypeLabels[t] }))
  }, [incidents])

  const severityOptions = useMemo(() => {
    const present = new Set(incidents.map((i) => i.severity))
    return incidentSeverityOrder
      .filter((s) => present.has(s))
      .map((s) => ({ value: s as string, label: incidentSeverityLabels[s] }))
  }, [incidents])

  const statusOptions = useMemo(() => {
    const present = new Set(incidents.map((i) => i.outcome))
    return (Object.keys(incidentOutcomeLabels) as IncidentOutcome[])
      .filter((o) => present.has(o))
      .map((o) => ({ value: o as string, label: incidentOutcomeLabels[o] }))
  }, [incidents])

  const rawType = params.get('type') ?? 'all'
  const type = typeOptions.some((o) => o.value === rawType) ? rawType : 'all'
  const rawSeverity = params.get('severity') ?? 'all'
  const severity = severityOptions.some((o) => o.value === rawSeverity)
    ? rawSeverity
    : 'all'
  const rawStatus = params.get('status') ?? 'all'
  const status = statusOptions.some((o) => o.value === rawStatus) ? rawStatus : 'all'

  const term = search.trim().toLowerCase()

  const shownVisits = useMemo(
    () =>
      visits.filter(
        (v) =>
          (branch === 'all' ||
            (branch === 'none' ? v.branch === null : v.branch === branch)) &&
          (recipient === 'all' || v.recipientId === recipient) &&
          (caregiver === 'all' ||
            (caregiver === 'unassigned'
              ? v.caregiverId === null
              : v.caregiverId === caregiver)) &&
          (outcome === 'all' || v.outcome === outcome) &&
          matches(term, v.recipientName, v.caregiverName, v.type),
      ),
    [visits, branch, recipient, caregiver, outcome, term],
  )
  const shownAlerts = useMemo(
    () =>
      alerts.filter(
        (a) =>
          (branch === 'all' ||
            (branch === 'none' ? a.branch === null : a.branch === branch)) &&
          (priority === 'all' || a.severity === priority) &&
          (kind === 'all' || a.kind === kind) &&
          matches(
            term,
            a.subject,
            a.counterpart,
            a.detail,
            alertKindLabels[a.kind],
          ),
      ),
    [alerts, branch, priority, kind, term],
  )
  const shownIncidents = useMemo(
    () =>
      incidents.filter(
        (i) =>
          (type === 'all' || i.type === type) &&
          (severity === 'all' || i.severity === severity) &&
          (status === 'all' || i.outcome === status) &&
          matches(
            term,
            i.recipientName,
            i.reporter,
            i.body,
            incidentTypeLabels[i.type],
          ),
      ),
    [incidents, type, severity, status, term],
  )

  const rows =
    tab === 'visits'
      ? shownVisits.length
      : tab === 'alerts'
        ? shownAlerts.length
        : shownIncidents.length
  const pageCount = Math.max(1, Math.ceil(rows / PAGE_SIZE))
  const requestedPage = Number(params.get('page'))
  const pageNumber =
    Number.isInteger(requestedPage) && requestedPage >= 1
      ? Math.min(requestedPage, pageCount)
      : 1
  const slice = <T,>(list: T[]) =>
    list.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE)

  const counts = {
    visits: visits.length,
    alerts: alerts.length,
    incidents: incidents.length,
  }
  const rangeLabel = historyRanges.find((r) => r.value === range)!.label.toLowerCase()
  const filtered =
    branch !== 'all' ||
    (tab === 'visits' &&
      (outcome !== 'all' || recipient !== 'all' || caregiver !== 'all')) ||
    (tab === 'alerts' && (priority !== 'all' || kind !== 'all')) ||
    (tab === 'incidents' &&
      (type !== 'all' || severity !== 'all' || status !== 'all')) ||
    term !== ''

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <ol className="text-ink-subtle flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link to="/live-monitoring" className="hover:text-ink">
              Live monitoring
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-brand-700 font-medium" aria-current="page">
            Monitoring history
          </li>
        </ol>
      </nav>

      <header>
        <h1 className="text-ink text-2xl font-bold tracking-tight">
          Monitoring history
        </h1>
        <p className="text-ink-muted mt-1 max-w-2xl text-sm">
          {/* No "Refresh List": nothing is fetched, so a refresh button would
              re-render the same derivation and imply a server that is not
              there. */}
          Visits whose window has closed, alerts that were still outstanding at
          the end of a day, and incidents on file. Worked out from the records
          rather than stored, so today is not included — it is on{' '}
          <Link to="/live-monitoring" className="text-brand-700">
            the board
          </Link>
          .
        </p>
      </header>

      <div
        role="group"
        aria-label="Choose a history"
        className="border-line no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
      >
        {tabs.map((t) => {
          const active = t.slug === tab
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => set('tab', t.slug)}
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
                {counts[t.slug]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter
            pill
            label="Date Range"
            value={range}
            onChange={(v) => set('range', v)}
            options={historyRanges.map((r) => ({ value: r.value, label: r.label }))}
          />
          {tab !== 'incidents' && (
            <SelectFilter
              pill
              label="Branch"
              value={branch}
              onChange={(v) => set('branch', v)}
              options={[
                { value: 'all', label: 'All branches' },
                ...branchesOnRoster.map((b) => ({ value: b, label: b })),
                // An unassigned visit has no caregiver and so no branch. Named
                // rather than dropped, or the counts stop adding up.
                { value: 'none', label: 'Not tied to a branch' },
              ]}
            />
          )}
          {tab === 'visits' && (
            <>
              <SelectFilter
                pill
                label="Care Recipient"
                value={recipient}
                onChange={(v) => set('recipient', v)}
                options={[{ value: 'all', label: 'All' }, ...recipientOptions]}
              />
              <SelectFilter
                pill
                label="Caregiver"
                value={caregiver}
                onChange={(v) => set('caregiver', v)}
                options={[{ value: 'all', label: 'All' }, ...caregiverOptions]}
              />
              {/* Called Status on the screen, because that is what a row of a
                  finished visit reads as. The values stay honest: this app
                  cannot say a visit completed without a record of it, so the
                  list offers "Not written up", never "Completed". */}
              <SelectFilter
                pill
                label="Status"
                value={outcome}
                onChange={(v) => set('outcome', v)}
                options={[
                  { value: 'all', label: 'All outcomes' },
                  ...(Object.keys(outcomeLabels) as VisitOutcome[]).map((o) => ({
                    value: o,
                    label: outcomeLabels[o],
                  })),
                ]}
              />
            </>
          )}
          {tab === 'alerts' && (
            <>
              <SelectFilter
                pill
                label="Priority"
                value={priority}
                onChange={(v) => set('priority', v)}
                options={[{ value: 'all', label: 'All' }, ...priorityOptions]}
              />
              <SelectFilter
                pill
                label="Alert Type"
                value={kind}
                onChange={(v) => set('kind', v)}
                options={[{ value: 'all', label: 'All' }, ...kindOptions]}
              />
            </>
          )}
          {tab === 'incidents' && (
            <>
              <SelectFilter
                pill
                label="Type"
                value={type}
                onChange={(v) => set('type', v)}
                options={[{ value: 'all', label: 'All types' }, ...typeOptions]}
              />
              {/* The design calls this chip "Priority" and its column
                  "Severity". One word for one axis — the column is the thing
                  being filtered, so the column's word wins. */}
              <SelectFilter
                pill
                label="Severity"
                value={severity}
                onChange={(v) => set('severity', v)}
                options={[{ value: 'all', label: 'All' }, ...severityOptions]}
              />
              <SelectFilter
                pill
                label="Status"
                value={status}
                onChange={(v) => set('status', v)}
                options={[{ value: 'all', label: 'All outcomes' }, ...statusOptions]}
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 sm:max-w-xs">
            <span className="sr-only">Search this history</span>
            <Search
              aria-hidden="true"
              className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => set('q', e.target.value)}
              placeholder={
                tab === 'visits'
                  ? 'Search visits...'
                  : tab === 'alerts'
                    ? 'Search alerts...'
                    : 'Search incidents...'
              }
              className="border-line bg-canvas focus:border-brand-500 focus:bg-surface h-10 w-full rounded-lg border pr-3 pl-9 text-sm"
            />
          </label>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(params)
                for (const key of [
                  'branch',
                  'recipient',
                  'caregiver',
                  'outcome',
                  'priority',
                  'kind',
                  'type',
                  'severity',
                  'status',
                  'q',
                  'page',
                ])
                  next.delete(key)
                setParams(next)
              }}
              className="text-brand-700 hover:text-brand-800 inline-flex min-h-11 items-center px-1 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
        <p className="text-ink-subtle text-xs">
          {rows} of{' '}
          {tab === 'visits'
            ? counts.visits
            : tab === 'alerts'
              ? counts.alerts
              : counts.incidents}{' '}
          over the {rangeLabel}.
        </p>
      </div>

      {tab === 'visits' && (
        <Panel title={`Visits closed in the ${rangeLabel}`} flush>
          {shownVisits.length === 0 ? (
            <Empty>No visit in this range matches those filters.</Empty>
          ) : (
            <>
              <div
                tabIndex={0}
                role="region"
                aria-label="Completed visits table"
                className="border-line hidden overflow-x-auto border-t xl:block"
              >
                <table className="w-full min-w-4xl text-left text-sm">
                  <Head
                    cols={[
                      'Visit ID',
                      'Care Recipient',
                      'Caregiver',
                      'Date',
                      'Duration',
                      'Status',
                    ]}
                  />
                  <tbody className="divide-line divide-y">
                    {slice(shownVisits).map((visit) => {
                      const board = boardOn(visit.date).find((v) => v.id === visit.id)
                      return (
                        <tr key={visit.id} className="hover:bg-canvas transition-colors">
                          <th scope="row" className="px-4 py-3.5 whitespace-nowrap">
                            <Link
                              to={`/scheduling/visits/${visit.id}/overview`}
                              className="text-brand-700 hover:text-brand-800 font-medium"
                            >
                              {board ? referenceFor(board) : visit.id}
                            </Link>
                          </th>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link
                              to={`/care-recipients/${visit.recipientId}`}
                              className="text-ink hover:text-brand-700 font-medium"
                            >
                              {visit.recipientName}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
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
                            <span className="text-ink-subtle block text-xs">
                              {visit.branch ?? 'Not tied to a branch'}
                            </span>
                          </td>
                          <td className="text-ink-muted px-4 py-3.5 whitespace-nowrap">
                            {formatHistoryDate(visit.date)}
                            <span className="text-ink-subtle block text-xs">
                              {visit.type}
                            </span>
                          </td>
                          <td className="text-ink-muted px-4 py-3.5 whitespace-nowrap">
                            {formatDuration(visit.duration)}
                            {/* Says which it is. A rota duration is a plan; only
                                a clock-in and clock-out measure the visit, and
                                showing both the same way would be the quiet
                                kind of wrong. */}
                            <span className="text-ink-subtle block text-xs">
                              {visit.measured
                                ? `${formatTime(visit.clockIn!)}–${formatTime(visit.clockOut!)}`
                                : 'Scheduled, not measured'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                                outcomeTone[visit.outcome],
                              )}
                            >
                              {outcomeLabels[visit.outcome]}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="border-line divide-line divide-y border-t xl:hidden">
                {slice(shownVisits).map((visit) => (
                  <li key={visit.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <Link
                        to={`/scheduling/visits/${visit.id}/overview`}
                        className="text-ink hover:text-brand-700 min-w-0 text-sm font-semibold break-words"
                      >
                        {visit.recipientName}
                      </Link>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                          outcomeTone[visit.outcome],
                        )}
                      >
                        {outcomeLabels[visit.outcome]}
                      </span>
                    </div>
                    <p className="text-ink-muted mt-1 text-sm break-words">
                      {formatHistoryDate(visit.date)} · {visit.type} ·{' '}
                      {formatDuration(visit.duration)}
                    </p>
                    <p className="text-ink-subtle mt-0.5 text-xs break-words">
                      {visit.caregiverName ?? 'Unassigned'} ·{' '}
                      {visit.branch ?? 'Not tied to a branch'} ·{' '}
                      {visit.measured
                        ? `${formatTime(visit.clockIn!)}–${formatTime(visit.clockOut!)}`
                        : 'Scheduled, not measured'}
                    </p>
                  </li>
                ))}
              </ul>

              <Foot>
                A visit reads &ldquo;Written up&rdquo; only where a record was
                filed. Everything else closed with no evidence anybody attended,
                which is what &ldquo;Not written up&rdquo; means — this app
                cannot mark a visit completed without one.
              </Foot>
            </>
          )}
          {pageCount > 1 && (
            <div className="border-line border-t p-4">
              <Pagination
                page={pageNumber}
                pageCount={pageCount}
                onPageChange={(p) => set('page', String(p))}
                summary={`Showing ${(pageNumber - 1) * PAGE_SIZE + 1}–${Math.min(pageNumber * PAGE_SIZE, rows)} of ${rows} visits`}
              />
            </div>
          )}
        </Panel>
      )}

      {tab === 'alerts' && (
        <Panel title={`Outstanding at the end of the day`} flush>
          {shownAlerts.length === 0 ? (
            <Empty>No alert in this range matches those filters.</Empty>
          ) : (
            <>
              <div
                tabIndex={0}
                role="region"
                aria-label="Past alerts table"
                className="border-line hidden overflow-x-auto border-t xl:block"
              >
                <table className="w-full min-w-4xl text-left text-sm">
                  <Head
                    cols={[
                      'Alert Type',
                      'Description',
                      'Source',
                      'Date',
                      'Priority',
                      'Resolution',
                    ]}
                  />
                  <tbody className="divide-line divide-y">
                    {slice(shownAlerts).map((alert) => (
                      <tr
                        key={`${alert.date}-${alert.id}`}
                        className="hover:bg-canvas transition-colors"
                      >
                        <th scope="row" className="px-4 py-3.5 text-left">
                          <Link
                            to={alert.secondary?.to ?? alert.action.to}
                            className="text-ink hover:text-brand-700 font-medium break-words"
                          >
                            {alertKindLabels[alert.kind]}
                          </Link>
                        </th>
                        <td className="text-ink-muted max-w-sm px-4 py-3.5 break-words">
                          {alert.detail}
                        </td>
                        <td className="text-ink px-4 py-3.5">
                          {alert.subject}
                          {/* The branch has no column of its own on this table,
                              but it is what the Branch filter above narrows by,
                              so the row still has to say which one it is. */}
                          <span className="text-ink-subtle block text-xs">
                            {alert.branch ?? 'Not tied to a branch'}
                          </span>
                        </td>
                        <td className="text-ink-muted px-4 py-3.5 whitespace-nowrap">
                          {formatHistoryDate(alert.date)}
                        </td>
                        <td className="px-4 py-3.5">
                          <SeverityBadge severity={alert.severity} />
                        </td>
                        {/* Nothing in this app records how an alert ended, and
                            every row here was sampled while still raised, so the
                            column can only say the one thing that is true of all
                            of them. The line under it is the distinction that
                            does vary: whether the record could still change. */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-800">
                            Still open at end of day
                          </span>
                          <span className="text-ink-subtle mt-0.5 block text-xs">
                            {alertTimingLabels[alert.timing]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="border-line divide-line divide-y border-t xl:hidden">
                {slice(shownAlerts).map((alert) => (
                  <li key={`${alert.date}-${alert.id}`} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <p className="text-ink min-w-0 text-sm font-semibold break-words">
                        {alertKindLabels[alert.kind]}
                      </p>
                      <SeverityBadge severity={alert.severity} />
                    </div>
                    <p className="text-ink-muted mt-1 text-sm break-words">
                      {alert.detail}
                    </p>
                    <p className="text-ink-subtle mt-1 text-xs break-words">
                      {formatHistoryDate(alert.date)} · {alert.subject} ·{' '}
                      {alert.branch ?? 'Not tied to a branch'} · Still open at end
                      of day · {alertTimingLabels[alert.timing]}
                    </p>
                  </li>
                ))}
              </ul>

              <Foot>
                Sampled once a day, at 23:45 — so this is what was still wrong
                when the day finished, not everything that flickered during it.
                An alert raised and cleared inside a day does not appear.
              </Foot>
            </>
          )}
          {pageCount > 1 && (
            <div className="border-line border-t p-4">
              <Pagination
                page={pageNumber}
                pageCount={pageCount}
                onPageChange={(p) => set('page', String(p))}
                summary={`Showing ${(pageNumber - 1) * PAGE_SIZE + 1}–${Math.min(pageNumber * PAGE_SIZE, rows)} of ${rows} alerts`}
              />
            </div>
          )}
        </Panel>
      )}

      {tab === 'incidents' && (
        <Panel title={`Incidents filed in the ${rangeLabel}`} flush>
          {shownIncidents.length === 0 ? (
            <Empty>
              No incident has been written up in this range.
            </Empty>
          ) : (
            <>
              <div
                tabIndex={0}
                role="region"
                aria-label="Past incidents table"
                className="border-line hidden overflow-x-auto border-t xl:block"
              >
                <table className="w-full min-w-4xl text-left text-sm">
                  <Head
                    cols={[
                      'Incident ID',
                      'Description',
                      'Care Recipient',
                      'Date',
                      'Severity',
                      'Outcome',
                    ]}
                  />
                  <tbody className="divide-line divide-y">
                    {slice(shownIncidents).map((incident) => (
                      <tr
                        key={incident.id}
                        className="hover:bg-canvas transition-colors"
                      >
                        <th scope="row" className="px-4 py-3.5 text-left whitespace-nowrap">
                          <Link
                            to={`/live-monitoring/alerts/${incident.reference}/overview`}
                            className="text-brand-700 hover:text-brand-800 font-medium"
                          >
                            {incident.reference}
                          </Link>
                        </th>
                        <td className="max-w-sm px-4 py-3.5">
                          <span className="text-ink font-medium">
                            {incidentTypeLabels[incident.type]}
                          </span>
                          {/* The type is what the column in the design shows,
                              but the write-up itself is the record — two lines
                              rather than a label standing in for a paragraph. */}
                          <span className="text-ink-muted line-clamp-2 block text-xs break-words">
                            {incident.body}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/care-recipients/${incident.recipientId}`}
                            className="text-ink hover:text-brand-700 font-medium"
                          >
                            {incident.recipientName}
                          </Link>
                          <span className="text-ink-subtle block text-xs break-words">
                            Written up by {incident.reporter} ({incident.reporterRole})
                          </span>
                        </td>
                        <td className="text-ink-muted px-4 py-3.5 whitespace-nowrap">
                          {formatHistoryDate(incident.at.slice(0, 10))}
                          <span className="text-ink-subtle block text-xs">
                            {formatIncidentAge(incident.at)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <PriorityBadge priority={incident.severity} />
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                              outcomeToneOf[incident.outcome],
                            )}
                          >
                            {incidentOutcomeLabels[incident.outcome]}
                          </span>
                          {/* Flagged is not an outcome — a resolved incident can
                              still be waiting on somebody senior to read it. */}
                          {incident.flagged && (
                            <span className="mt-0.5 block text-xs font-medium text-red-700">
                              Flagged for review
                            </span>
                          )}
                          {/* Only where somebody actually made the claim. Most
                              write-ups do not carry it, and an absent
                              certification is not a failed one. */}
                          {incident.certifiedBy && (
                            <span className="text-ink-subtle mt-0.5 block text-xs">
                              Certified by {incident.certifiedBy}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="border-line divide-line divide-y border-t xl:hidden">
                {slice(shownIncidents).map((incident) => (
                  <li key={incident.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <Link
                        to={`/live-monitoring/alerts/${incident.reference}/overview`}
                        className="text-brand-700 hover:text-brand-800 text-sm font-semibold"
                      >
                        {incident.reference}
                      </Link>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <PriorityBadge priority={incident.severity} />
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                            outcomeToneOf[incident.outcome],
                          )}
                        >
                          {incidentOutcomeLabels[incident.outcome]}
                        </span>
                      </span>
                    </div>
                    <p className="text-ink mt-1 text-sm break-words">
                      <span className="font-medium">
                        {incidentTypeLabels[incident.type]}
                      </span>{' '}
                      — {incident.body}
                    </p>
                    <p className="text-ink-subtle mt-1 text-xs break-words">
                      {incident.recipientName} · written up by {incident.reporter} (
                      {incident.reporterRole}) · {formatIncidentAge(incident.at)} ·{' '}
                      {incident.replies === 0
                        ? 'no reply'
                        : `${incident.replies} ${incident.replies === 1 ? 'reply' : 'replies'}`}
                      {incident.flagged && ' · flagged for review'}
                    </p>
                  </li>
                ))}
              </ul>
              <Foot>
                Incidents are filed documents, not facts derived from the clock,
                so these do not change as a day runs. They are the same records
                the{' '}
                <Link
                  to="/live-monitoring/alerts?tab=incidents"
                  className="text-brand-700"
                >
                  incident register
                </Link>{' '}
                lists.
              </Foot>
            </>
          )}
          {pageCount > 1 && (
            <div className="border-line border-t p-4">
              <Pagination
                page={pageNumber}
                pageCount={pageCount}
                onPageChange={(p) => set('page', String(p))}
                summary={`Showing ${(pageNumber - 1) * PAGE_SIZE + 1}–${Math.min(pageNumber * PAGE_SIZE, rows)} of ${rows} incidents`}
              />
            </div>
          )}
        </Panel>
      )}

      <p className="text-ink-subtle flex gap-2 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          Nothing on this screen is a stored history. Every row is worked out
          from the rota, the visit records and the care notes at the moment you
          open it, so it can never disagree with the live board — and there is
          nothing to refresh.
        </span>
      </p>
    </div>
  )
}

function Head({ cols }: { cols: string[] }) {
  return (
    <thead className="text-ink bg-sunken text-[13px]">
      <tr className="border-line border-b">
        {cols.map((col) => (
          <th key={col} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
            {col}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm"
      role="status"
    >
      {children}
    </p>
  )
}

function Foot({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
      {children}
    </p>
  )
}
