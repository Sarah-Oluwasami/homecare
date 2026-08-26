import { useMemo } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { CircleAlert, Download, Layers, X } from 'lucide-react'
import {
  failedPayment,
  formatMoney,
  hoursPackageFor,
  planById,
  plans,
  renewalsDue,
  subscriptions,
} from '@/features/billing/data'
import type {
  PlanId,
  Subscription,
  SubscriptionStatus,
  Transaction,
} from '@/features/billing/data'
import {
  familyNameFor,
  getSubscriptionDetail,
} from '@/features/billing/subscription-detail'
import {
  ActivityPanel,
  AuditPanel,
  BillingPanel,
  CaregiverPanel,
  CoordinatorPanel,
  HoursPanel,
  NotesPanel,
  OverviewPanel,
  PaymentsPanel,
  RenewalsPanel,
} from '@/features/billing/SubscriptionTabs'
import {
  ACTIVE_RECIPIENTS,
  DISCHARGED_RECIPIENTS,
  ON_HOLD_RECIPIENTS,
  recipients,
} from '@/features/care-recipients/data'
import { getRecipientProfile } from '@/features/care-recipients/profile-data'
import { getCaregiverRecord, roleFor } from '@/features/care-recipients/caregivers-data'
import { Panel } from '@/components/ui/Panel'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { cn } from '@/lib/cn'

const tabs = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'billing', label: 'Billing' },
  { slug: 'hours', label: 'Flexible hours' },
  { slug: 'renewals', label: 'Renewals' },
  { slug: 'coordinator', label: 'Coordinator' },
  { slug: 'caregiver', label: 'Caregiver' },
  { slug: 'payments', label: 'Payment history' },
  { slug: 'activity', label: 'Activity timeline' },
  { slug: 'notes', label: 'Notes' },
  { slug: 'audit', label: 'Audit log' },
] as const

type TabSlug = (typeof tabs)[number]['slug']

function isTab(value: string | undefined): value is TabSlug {
  return tabs.some((t) => t.slug === value)
}

function statusFilter(value: string | null): SubscriptionStatus | 'all' {
  return value && Object.hasOwn(statusStyles, value)
    ? (value as SubscriptionStatus)
    : 'all'
}

const statusStyles: Record<SubscriptionStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'bg-emerald-50 text-emerald-700' },
  paused: { label: 'Paused', tone: 'bg-amber-50 text-amber-700' },
  pending: { label: 'Pending start', tone: 'bg-blue-50 text-blue-700' },
  cancelled: { label: 'Cancelled', tone: 'bg-red-50 text-red-700' },
}

const chip =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap'

/** One denormalised row, all of it derived from the owning modules. */
interface Row {
  sub: Subscription
  familyName: string
  patient: string
  age: number
  coordinator: string
  caregiver: string
  caregiverRole: string | undefined
  hoursLabel: string
  hoursPercent: number | null
  /** The last failed charge on this plan, if any. */
  failed: Transaction | undefined
}

function buildRows(): Row[] {
  return subscriptions.map((sub) => {
    const recipient = recipients.find((r) => r.id === sub.recipientId)!
    const profile = getRecipientProfile(sub.recipientId)
    const team = getCaregiverRecord(sub.recipientId)?.team
    const primary = team?.find((m) => m.primary) ?? team?.[0]
    // The row's own package, not a module-level one: a second flexible
    // subscriber would otherwise inherit Patricia Brown's balance and expiry.
    const pkg = hoursPackageFor(sub.recipientId)
    const percent = pkg ? Math.round((pkg.used / pkg.purchased) * 100) : null

    return {
      sub,
      familyName: familyNameFor(recipient.name),
      patient: recipient.name,
      age: recipient.age,
      coordinator: profile?.summary.coordinator ?? 'Unassigned',
      caregiver: primary?.name ?? 'Unassigned',
      caregiverRole: primary ? roleFor(sub.recipientId, primary.name) : undefined,
      hoursLabel: pkg
        ? `${pkg.purchased - pkg.used}h left`
        : 'Not applicable',
      hoursPercent: percent,
      failed: failedPayment(sub),
    }
  })
}

export function SubscriptionsPage() {
  const { subId, tab } = useParams()
  const [params, setParams] = useSearchParams()

  /*
   * Filters live in the query string rather than component state: a filtered
   * table is worth sharing, and it survives any remount. Row links carry the
   * search along, so opening a record can't silently widen the table
   * underneath it.
   */
  const query = params.get('q') ?? ''
  const status = statusFilter(params.get('status'))
  // An unknown plan slug would filter every row out and render no chip to
  // clear, leaving no way back except editing the URL.
  const planParam = params.get('plan')
  const planFilter = plans.some((p) => p.id === planParam) ? planParam : null

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const rows = useMemo(() => buildRows(), [])

  /*
   * Rebuilt rather than passed through, so an unrecognised `plan` value is
   * dropped instead of riding along in every link on the page with no chip to
   * clear it.
   */
  const search = new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(planFilter ? { plan: planFilter } : {}),
  }).toString()
  const suffix = search ? `?${search}` : ''
  const recordPath = (id: string) =>
    `/billing/subscriptions/${id}/${isTab(tab) ? tab : 'overview'}${suffix}`

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (status !== 'all' && row.sub.status !== status) return false
      if (planFilter && row.sub.planId !== planFilter) return false
      if (!needle) return true
      return (
        row.familyName.toLowerCase().includes(needle) ||
        row.patient.toLowerCase().includes(needle) ||
        planById[row.sub.planId].name.toLowerCase().includes(needle) ||
        row.coordinator.toLowerCase().includes(needle) ||
        row.caregiver.toLowerCase().includes(needle)
      )
    })
  }, [rows, query, status, planFilter])

  // Rebuilding the record on every keystroke in the filter box means re-sorting
  // the invoice, timeline and audit lists for a panel that hasn't changed.
  const detail = useMemo(() => getSubscriptionDetail(subId), [subId])

  // A subscription id that doesn't resolve is a dead end, not an empty panel.
  // Both guards carry the filters, or a shared deep link would land on an
  // unfiltered table.
  if (subId && !detail)
    return <Navigate to={`/billing/subscriptions${suffix}`} replace />
  if (subId && !isTab(tab))
    return <Navigate to={`/billing/subscriptions/${subId}/overview${suffix}`} replace />

  /*
   * Three tiles are org-wide because the directory publishes those totals; the
   * other three can only see the eight tracked rows. Mixing the two scopes
   * without saying so is how "6 renewals out of 1,247" happens.
   */
  const tiles: {
    id: string
    label: string
    value: number
    hint: string
  }[] = [
    {
      id: 'active',
      label: 'Active',
      value: ACTIVE_RECIPIENTS,
      hint: 'Organisation-wide',
    },
    {
      id: 'paused',
      label: 'Paused',
      value: ON_HOLD_RECIPIENTS,
      hint: 'Organisation-wide, on hold',
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      value: DISCHARGED_RECIPIENTS,
      hint: 'Organisation-wide, discharged',
    },
    {
      id: 'pending',
      label: 'Pending activation',
      value: rows.filter((r) => r.sub.status === 'pending').length,
      hint: 'Tracked accounts',
    },
    {
      id: 'renewing',
      label: 'Renewing in 7 days',
      value: renewalsDue(7).length,
      hint: 'Tracked accounts',
    },
    {
      id: 'hours',
      label: 'Hours packages',
      value: rows.filter((r) => r.hoursPercent !== null).length,
      hint: 'Tracked accounts',
    },
  ]

  const activePlan = planFilter ? plans.find((p) => p.id === planFilter) : undefined

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Monitor and manage care subscriptions. Selecting a row opens the full
            record beneath the table.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
          >
            <Download className="size-4" strokeWidth={1.9} aria-hidden="true" />
            Export
          </button>
          <button
            type="button"
            className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
          >
            <Layers className="size-4" strokeWidth={1.9} aria-hidden="true" />
            Bulk actions
          </button>
        </div>
      </header>

      <section aria-labelledby="sub-kpis">
        <h2 id="sub-kpis" className="sr-only">
          Subscription counts
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {tiles.map((t) => (
            <article key={t.id} className="card p-4">
              <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
                {t.label}
              </p>
              <p className="text-ink mt-2 text-2xl font-bold tracking-tight tabular-nums">
                {t.value.toLocaleString()}
              </p>
              <p className="text-ink-subtle mt-1 text-xs break-words">{t.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <Panel title="Subscriptions database" flush>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Filter subscriptions</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Filter by family, patient, plan or staff"
              className="border-line focus:border-brand-500 h-10 w-full min-w-40 rounded-lg border px-3 text-sm"
            />
          </label>
          <SelectFilter
            label="Status"
            value={status}
            onChange={(v) => setParam('status', v === 'all' ? null : v)}
            options={[
              { value: 'all', label: 'All statuses' },
              ...(Object.keys(statusStyles) as SubscriptionStatus[]).map((s) => ({
                value: s,
                label: statusStyles[s].label,
              })),
            ]}
          />
          {activePlan && (
            <button
              type="button"
              onClick={() => setParam('plan', null)}
              className="border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
            >
              {activePlan.name}
              <X className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              <span className="sr-only">Clear the plan filter</span>
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm">
            No subscriptions match these filters.
          </p>
        ) : (
          <>
            <div
              tabIndex={0}
              role="region"
              aria-label="Subscriptions table"
              className="hidden overflow-x-auto xl:block"
            >
              <table className="w-full min-w-5xl text-left text-sm">
                <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
                  <tr>
                    {[
                      'Family',
                      'Patient',
                      'Plan',
                      'Coordinator',
                      'Caregiver',
                      'Cycle',
                      'Hours',
                      'Renewal',
                      'Auto',
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
                  {filtered.map((row) => {
                    const selected = row.sub.id === subId
                    return (
                      <tr
                        key={row.sub.id}
                        aria-current={selected ? 'true' : undefined}
                        className={cn(
                          'transition-colors',
                          selected ? 'bg-brand-50' : 'hover:bg-canvas',
                        )}
                      >
                        <th scope="row" className="px-4 py-3 font-normal whitespace-nowrap">
                          <Link
                            to={recordPath(row.sub.id)}
                            className="text-ink hover:text-brand-700 font-medium"
                          >
                            {row.familyName}
                          </Link>
                        </th>
                        <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                          {row.patient}{' '}
                          <span className="text-ink-subtle">({row.age})</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            to={`/billing/plans/${row.sub.planId}/general`}
                            className="text-brand-700 hover:text-brand-800 font-medium"
                          >
                            {planById[row.sub.planId].name}
                          </Link>
                        </td>
                        <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                          {row.coordinator}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-ink-muted">{row.caregiver}</span>
                          {row.caregiverRole && (
                            <span className="text-ink-subtle block text-xs">
                              {row.caregiverRole}
                            </span>
                          )}
                        </td>
                        <td className="text-ink-muted px-4 py-3">{row.sub.cycle}</td>
                        <td className="text-ink-muted px-4 py-3 whitespace-nowrap tabular-nums">
                          {row.hoursPercent === null ? (
                            <span className="text-ink-subtle">Not applicable</span>
                          ) : (
                            <span className="flex items-center gap-2">
                              {/* The bar fills with what has been used, so the
                                  label next to it says used, not left. */}
                              <span
                                aria-hidden="true"
                                className="bg-sunken h-1.5 w-16 shrink-0 overflow-hidden rounded-full"
                              >
                                <span
                                  className="bg-brand-600 block h-full rounded-full"
                                  style={{ width: `${row.hoursPercent}%` }}
                                />
                              </span>
                              {row.hoursPercent}% used, {row.hoursLabel}
                            </span>
                          )}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 whitespace-nowrap',
                            row.sub.renewsAt ? 'text-ink-muted' : 'text-ink-subtle',
                          )}
                        >
                          {row.sub.renewsAt
                            ? new Date(`${row.sub.renewsAt}T00:00:00Z`).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
                              )
                            : row.sub.invoiceBilled
                              ? 'Billed by invoice'
                              : row.sub.status === 'pending'
                                ? 'Awaiting start'
                                : 'Not scheduled'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              row.sub.autoRenew ? 'text-emerald-700' : 'text-ink-subtle',
                            )}
                          >
                            {row.sub.autoRenew ? 'On' : 'Off'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(chip, statusStyles[row.sub.status].tone)}>
                            {statusStyles[row.sub.status].label}
                          </span>
                          {/* The cycle date rolls forward after a bounce, so
                              without this the row reads Active, auto-renew on,
                              and nothing owing. */}
                          {row.failed && (
                            <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-700">
                              <CircleAlert
                                className="size-3 shrink-0"
                                strokeWidth={2.5}
                                aria-hidden="true"
                              />
                              Last charge failed
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-line border-line divide-y border-t xl:hidden">
              {filtered.map((row) => (
                <li
                  key={row.sub.id}
                  className={cn('p-4', row.sub.id === subId && 'bg-brand-50')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={recordPath(row.sub.id)}
                        className="text-ink hover:text-brand-700 text-sm font-semibold break-words"
                      >
                        {row.familyName}
                      </Link>
                      <p className="text-ink-subtle mt-0.5 text-xs break-words">
                        {row.patient} ({row.age}) · {planById[row.sub.planId].name}
                      </p>
                    </div>
                    <span className={cn(chip, statusStyles[row.sub.status].tone)}>
                      {statusStyles[row.sub.status].label}
                    </span>
                  </div>
                  <p className="text-ink-muted mt-2 text-sm break-words">
                    {row.coordinator} · {row.caregiver} · {row.sub.cycle}
                    {row.hoursPercent !== null && ` · ${row.hoursLabel}`}
                  </p>
                  {row.failed && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-700">
                      <CircleAlert
                        className="size-3 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                      Last charge failed ({row.failed.id})
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
          Showing {filtered.length} of {rows.length} tracked subscriptions. The
          workspace follows these accounts; the tiles above marked
          organisation-wide come from the care directory.
        </p>
      </Panel>

      {detail && isTab(tab) && (
        <Panel
          title={`${detail.familyName} subscription`}
          badge={
            <Link
              to={`/billing/subscriptions${suffix}`}
              className="text-ink-muted hover:text-ink inline-flex min-h-11 shrink-0 items-center gap-1 text-xs"
            >
              <X className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              Close
              <span className="sr-only"> the {detail.familyName} record</span>
            </Link>
          }
          flush
        >
          {/* Navigation, not an ARIA tablist — see CarePlansPage. */}
          <nav
            aria-label={`${detail.familyName} subscription record`}
            className="border-line no-scrollbar flex gap-1 overflow-x-auto border-y px-2"
          >
            {tabs.map((t) => {
              const selected = t.slug === tab
              return (
                <Link
                  key={t.slug}
                  to={`/billing/subscriptions/${detail.subscription.id}/${t.slug}${suffix}`}
                  aria-current={selected ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors',
                    selected
                      ? 'border-brand-600 text-brand-700'
                      : 'text-ink-muted hover:text-ink border-transparent',
                  )}
                >
                  {t.label}
                </Link>
              )
            })}
          </nav>

          <div className="p-4">
            {tab === 'overview' && <OverviewPanel detail={detail} />}
            {tab === 'billing' && <BillingPanel detail={detail} />}
            {tab === 'hours' && <HoursPanel detail={detail} />}
            {tab === 'renewals' && <RenewalsPanel detail={detail} />}
            {tab === 'coordinator' && <CoordinatorPanel detail={detail} />}
            {tab === 'caregiver' && <CaregiverPanel detail={detail} />}
            {tab === 'payments' && <PaymentsPanel detail={detail} />}
            {tab === 'activity' && <ActivityPanel detail={detail} />}
            {tab === 'notes' && <NotesPanel detail={detail} />}
            {tab === 'audit' && <AuditPanel detail={detail} />}
          </div>

          <div className="border-line flex flex-wrap items-center justify-between gap-2 border-t p-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="h-10 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Cancel subscription
                <span className="sr-only"> for {detail.familyName}</span>
              </button>
              <button
                type="button"
                className="h-10 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                Pause subscription
                <span className="sr-only"> for {detail.familyName}</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="border-line text-ink hover:bg-sunken h-10 rounded-lg border px-4 text-sm font-medium"
              >
                Change plan tier
                <span className="sr-only"> for {detail.familyName}</span>
              </button>
              <button
                type="button"
                className="bg-brand-600 hover:bg-brand-700 h-10 rounded-lg px-4 text-sm font-medium text-white"
              >
                Force renewal
                <span className="sr-only"> for {detail.familyName}</span>
              </button>
            </div>
          </div>
        </Panel>
      )}

      <p className="text-ink-subtle text-xs">
        All figures in Nigerian Naira. Plan prices come from the{' '}
        <Link to="/billing/plans/standard/general" className="text-brand-700">
          care plan catalogue
        </Link>
        ; {formatMoney(planById['standard' as PlanId].monthlyPrice)} is the
        Standard list price.
      </p>
    </div>
  )
}
