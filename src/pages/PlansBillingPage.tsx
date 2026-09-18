import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  ClipboardList,
  CreditCard,
  FileText,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import {
  averageMonthlySpend,
  customerLifetimeValue,
  formatCompact,
  formatDate,
  formatMoney,
  hoursConsumedPercent,
  hoursPackage,
  hoursRemaining,
  monthlyRevenue,
  mrr,
  planRevenue,
  plans,
  premiumExpansionRatio,
  renewalsDue,
  retentionMonths,
  revenueByRegion,
  revenueGrowth,
  revenueSeries,
  subscriptions,
  todaysRevenue,
  totalSubscribers,
  transactionCounts,
  transactions,
  type TransactionStatus,
} from '@/features/billing/data'
import {
  careRequests,
  pendingRequestCount,
} from '@/features/care-recipients/requests-data'
import {
  CareRequests,
  PlanPerformance,
  RenewalsTimeline,
  SubscriptionTable,
  TransactionLog,
} from '@/features/billing/BillingTables'
import { Panel } from '@/components/ui/Panel'
import { Donut } from '@/components/ui/Donut'
import { LineChart } from '@/components/ui/LineChart'
import { toneText } from '@/lib/tone'
import { cn } from '@/lib/cn'
import type { Tone } from '@/types'

/*
 * All buttons. "Create care plan" briefly linked to the catalogue, which opens
 * an existing plan for editing — close enough to look wired, wrong enough to
 * mislead. No create screen exists yet, and the catalogue and workspace are one
 * click away in the sidebar.
 */
const quickActions: {
  id: string
  label: string
  icon: typeof ClipboardList
}[] = [
  { id: 'plan', label: 'Create care plan', icon: ClipboardList },
  { id: 'sub', label: 'Create subscription', icon: Plus },
  { id: 'approve', label: 'Approve care request', icon: Users },
  { id: 'invoice', label: 'Generate invoice', icon: FileText },
  { id: 'refund', label: 'Issue refund', icon: RefreshCw },
  { id: 'export', label: 'Export revenue report', icon: TrendingUp },
]

export function PlansBillingPage() {
  const [txFilter, setTxFilter] = useState<TransactionStatus | 'all'>('all')

  const counts = useMemo(() => transactionCounts(), [])
  const txRows = useMemo(
    () =>
      txFilter === 'all'
        ? transactions
        : transactions.filter((t) => t.status === txFilter),
    [txFilter],
  )

  // Cumulative windows, so "this month" contains "this week" contains "today".
  const renewalGroups = useMemo(
    () => [
      { id: 'today', label: 'Renewing today', items: renewalsDue(0) },
      { id: 'week', label: 'This week', items: renewalsDue(7) },
      { id: 'month', label: 'This month', items: renewalsDue(30) },
    ],
    [],
  )

  const subscribers = totalSubscribers()
  const monthly = monthlyRevenue()
  const regions = revenueByRegion()

  const growth = revenueGrowth()

  /*
   * Every KPI is computed from the plan table or a list on this page. Some can
   * only see what is on it — a handful of renewals against the org-wide
   * subscription base would otherwise read as a collapse — so they say so.
   */
  const kpis: {
    id: string
    label: string
    value: string
    delta?: string
    direction?: 'up' | 'down'
    note?: string
    icon: typeof Wallet
    tone: Tone
  }[] = [
    {
      id: 'today',
      label: "Today's revenue",
      value: formatMoney(todaysRevenue()),
      note: 'Settled payments in the log below',
      icon: Wallet,
      tone: 'green',
    },
    {
      id: 'monthly',
      label: 'Monthly revenue',
      value: formatMoney(monthly),
      delta: `${Math.abs(growth)}%`,
      direction: growth >= 0 ? 'up' : 'down',
      note: 'Organisation-wide, all plans',
      icon: TrendingUp,
      tone: 'blue',
    },
    {
      id: 'subs',
      label: 'Total subscriptions',
      value: subscribers.toLocaleString(),
      note: 'Active accounts across all four plans',
      icon: Users,
      tone: 'purple',
    },
    {
      id: 'requests',
      label: 'Pending care requests',
      value: String(pendingRequestCount()),
      note: 'Awaiting review or changes',
      icon: ClipboardList,
      tone: 'amber',
    },
    {
      id: 'renewals',
      label: 'Renewals due (30 days)',
      value: String(renewalsDue(30).length),
      note: 'Tracked accounts only',
      icon: RefreshCw,
      tone: 'blue',
    },
    {
      id: 'failed',
      label: 'Failed payments',
      value: String(counts.failed),
      note: 'In the transaction log below',
      icon: CircleAlert,
      tone: 'red',
    },
  ]

  const insights: { id: string; label: string; value: string; hint: string }[] = [
    {
      id: 'spend',
      label: 'Average monthly spend',
      value: formatMoney(averageMonthlySpend()),
      hint: `Monthly revenue across ${subscribers.toLocaleString()} subscriptions`,
    },
    {
      id: 'clv',
      label: 'Customer lifetime value',
      value: formatMoney(customerLifetimeValue()),
      hint: `Average retention ${retentionMonths} months`,
    },
    {
      id: 'mrr',
      label: 'Recurring revenue (MRR)',
      value: formatMoney(mrr()),
      hint: `${formatMoney(monthly - mrr())} of monthly revenue is non-recurring`,
    },
    {
      id: 'expansion',
      label: 'Premium expansion ratio',
      value: `${premiumExpansionRatio()}%`,
      hint: 'On Premium or Live-in tiers',
    },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-ink text-2xl font-bold tracking-tight">
          Plans &amp; Billing
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          Subscription performance, care requests and transaction reconciliation
          across the organisation.
        </p>
      </header>

      <section aria-labelledby="kpis">
        <h2 id="kpis" className="sr-only">
          Key figures
        </h2>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {kpis.map(({ id, label, value, delta, direction, note, icon: Icon, tone }) => (
            <article key={id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
                  {label}
                </p>
                <Icon
                  className={cn('size-4 shrink-0', toneText[tone])}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </div>
              <p className="text-ink mt-3 text-2xl font-bold tracking-tight break-words tabular-nums">
                {value}
              </p>
              {delta && (
                <p
                  className={cn(
                    'mt-1 inline-flex items-center gap-1 text-xs font-medium',
                    direction === 'up' ? 'text-emerald-700' : 'text-red-600',
                  )}
                >
                  {direction === 'up' ? (
                    <ArrowUp className="size-3" strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <ArrowDown className="size-3" strokeWidth={2.5} aria-hidden="true" />
                  )}
                  {/* The arrow and the colour are the only sighted carriers of
                      direction; without this the value is read unsigned. */}
                  <span className="sr-only">
                    {direction === 'up' ? 'up' : 'down'}{' '}
                  </span>
                  {delta} vs last month
                </p>
              )}
              {note && (
                <p className="text-ink-subtle mt-1 text-xs break-words">{note}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Monthly Revenue Analytics" className="xl:col-span-2">
          <p className="text-ink-muted -mt-1 mb-2 text-sm">
            Total monthly revenue over the last twelve months. The final point
            is the headline figure above.
          </p>
          <div className="text-brand-600">
            <LineChart
              points={revenueSeries()}
              formatTick={formatCompact}
              formatValue={formatMoney}
              caption="Total revenue by month, oldest first"
              columns={['Month', 'Total revenue']}
            />
          </div>
        </Panel>

        <Panel title="Subscription Distribution">
          <Donut
            segments={plans.map((p) => ({
              id: p.id,
              label: p.name,
              value: p.subscribers,
              colourClass: toneText[p.tone],
            }))}
            centreLabel="Subscriptions"
            centreValue={subscribers.toLocaleString()}
            caption="Subscriptions by plan"
            columns={['Plan', 'Subscriptions', 'Share']}
            formatValue={(v) => v.toLocaleString()}
          />
        </Panel>
      </div>

      <CareRequests requests={careRequests} />

      <PlanPerformance
        items={plans.map((p) => ({
          id: p.id,
          name: p.name,
          subscribers: p.subscribers,
          revenue: planRevenue(p),
          hours: `${p.hoursPerMonth} hrs/mo`,
          renewalRate: p.renewalRate,
          tone: p.tone,
        }))}
      />

      <SubscriptionTable rows={subscriptions} />

      <Panel title="Flexible Hours Asset Tracker">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <p className="text-ink text-3xl font-bold tracking-tight tabular-nums">
              {hoursRemaining()} hrs
            </p>
            <p className="text-ink-muted mt-0.5 text-sm">
              remaining for {hoursPackage.client} · expires{' '}
              {formatDate(hoursPackage.expiresAt)}
            </p>
            <p className="text-ink-subtle mt-0.5 text-xs">
              Contract {hoursPackage.contract}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="bg-brand-600 hover:bg-brand-700 h-10 rounded-lg px-4 text-sm font-medium text-white"
            >
              Add hours
            </button>
            <button
              type="button"
              className="border-control text-ink hover:bg-sunken h-10 rounded-lg border px-4 text-sm font-medium"
            >
              Adjust hours
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-ink-muted flex flex-wrap justify-between gap-x-4 text-xs">
            <span>Used {hoursPackage.used}h</span>
            <span>Purchased {hoursPackage.purchased}h</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={hoursConsumedPercent()}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Hours consumed"
            className="bg-sunken mt-1.5 h-2 w-full overflow-hidden rounded-full"
          >
            <div
              className="bg-brand-600 h-full rounded-full"
              style={{ width: `${hoursConsumedPercent()}%` }}
            />
          </div>
          <div className="text-ink-subtle mt-1.5 flex flex-wrap justify-between gap-x-4 text-xs">
            <span>{hoursConsumedPercent()}% consumed</span>
            <span>{100 - hoursConsumedPercent()}% buffer left</span>
          </div>
        </div>
      </Panel>

      <TransactionLog
        rows={txRows}
        counts={counts}
        filter={txFilter}
        onFilter={setTxFilter}
      />

      <RenewalsTimeline groups={renewalGroups} />

      <section aria-labelledby="insights">
        <h2
          id="insights"
          className="text-ink mb-3 text-base font-semibold tracking-tight"
        >
          Operational Revenue Insights
        </h2>

        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
          {insights.map(({ id, label, value, hint }) => (
            <article key={id} className="card p-4">
              <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
                {label}
              </p>
              <p className="text-ink mt-2 text-2xl font-bold tracking-tight tabular-nums">
                {value}
              </p>
              <p className="text-ink-subtle mt-1 text-xs break-words">{hint}</p>
            </article>
          ))}
        </div>

        <Panel title="Revenue by Region" className="mt-4">
          {/* Shares are computed from the amounts, and the amounts sum to the
              monthly revenue KPI by construction. */}
          <dl className="space-y-3">
            {regions.map((region) => (
              <div key={region.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <dt className="text-ink-muted text-sm">{region.label}</dt>
                  <dd className="text-ink text-sm font-semibold tabular-nums">
                    {formatMoney(region.amount)}
                    <span className="text-ink-subtle ml-1.5 font-normal">
                      ({region.share}%)
                    </span>
                  </dd>
                </div>
                <div className="bg-sunken mt-1.5 h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-brand-600 h-full rounded-full"
                    style={{ width: `${region.share}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </Panel>
      </section>

      <section aria-labelledby="quick-actions">
        <h2
          id="quick-actions"
          className="text-ink mb-3 text-base font-semibold tracking-tight"
        >
          Immediate Command Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {quickActions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="card hover:border-brand-300 hover:bg-brand-50/40 group flex min-h-11 items-center gap-2.5 p-3 text-left transition-colors"
            >
              <span className="bg-sunken text-ink-muted group-hover:bg-brand-100 group-hover:text-brand-600 grid size-8 shrink-0 place-items-center rounded-lg transition-colors">
                <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="text-ink min-w-0 text-sm font-medium break-words">
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <p className="text-ink-subtle text-xs">
        <CreditCard className="mr-1 inline size-3" aria-hidden="true" />
        All figures in Nigerian Naira, the organisation&rsquo;s reporting
        currency.
      </p>
    </div>
  )
}
