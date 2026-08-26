import { Link, Navigate, useParams } from 'react-router-dom'
import { Archive, Plus } from 'lucide-react'
import {
  formatMoney,
  planById,
  planRevenue,
  plans,
  totalSubscribers,
} from '@/features/billing/data'
import {
  archivedPlanCount,
  getPlanDetail,
  isPlanId,
} from '@/features/billing/plan-catalogue'
import {
  AnalyticsTab,
  BillingRulesTab,
  CoverageTab,
  EligibilityTab,
  GeneralTab,
  HistoryTab,
  PricingTab,
  RenewalRulesTab,
  ServicesTab,
} from '@/features/billing/PlanTabs'
import { Panel } from '@/components/ui/Panel'
import { toneText } from '@/lib/tone'
import { cn } from '@/lib/cn'

const tabs = [
  { slug: 'general', label: 'General' },
  { slug: 'pricing', label: 'Pricing' },
  { slug: 'services', label: 'Services included' },
  { slug: 'eligibility', label: 'Eligibility' },
  { slug: 'coverage', label: 'Coverage areas' },
  { slug: 'billing-rules', label: 'Billing rules' },
  { slug: 'renewal-rules', label: 'Renewal rules' },
  { slug: 'analytics', label: 'Analytics' },
  { slug: 'history', label: 'Version history' },
] as const

type TabSlug = (typeof tabs)[number]['slug']

function isTab(value: string | undefined): value is TabSlug {
  return tabs.some((t) => t.slug === value)
}

export function CarePlansPage() {
  const { planId, tab } = useParams()

  /*
   * The catalogue always has a plan open — the nine detail tabs below the cards
   * have nothing to render otherwise — so a missing or unknown slug resolves to
   * the first plan rather than bouncing back to a path that would match here
   * again and render nothing at all.
   */
  if (!isPlanId(planId))
    return <Navigate to={`/billing/plans/${plans[0].id}/general`} replace />
  if (!isTab(tab)) return <Navigate to={`/billing/plans/${planId}/general`} replace />

  const plan = planById[planId]
  const base = totalSubscribers()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">Care Plans</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Create, configure and manage the agency&rsquo;s care plan catalogue.
            Editing a plan changes what every subscription on it is billed.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
          >
            <Archive className="size-4" strokeWidth={1.9} aria-hidden="true" />
            Archived plans
            <span className="text-ink-subtle tabular-nums">{archivedPlanCount}</span>
          </button>
          <button
            type="button"
            className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white"
          >
            <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
            Create new plan
          </button>
        </div>
      </header>

      <section aria-labelledby="catalogue">
        <h2
          id="catalogue"
          className="text-ink mb-3 text-base font-semibold tracking-tight"
        >
          Active care plan catalogue
        </h2>

        <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => {
            const selected = p.id === planId
            return (
              <li key={p.id}>
                {/* The whole card is the control, so the selection target is
                    the whole card and not a link buried at the bottom of it. */}
                <Link
                  to={`/billing/plans/${p.id}/${tab}`}
                  aria-label={`Open ${p.name}`}
                  aria-current={selected ? 'true' : undefined}
                  className={cn(
                    'card block h-full p-4 transition-colors',
                    selected
                      ? 'border-brand-400 ring-brand-200 ring-2'
                      : 'hover:border-brand-300 hover:bg-brand-50/30',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-ink flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'size-2.5 shrink-0 rounded-sm bg-current',
                          toneText[p.tone],
                        )}
                      />
                      <span className="min-w-0 break-words">{p.name}</span>
                    </h3>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Active
                    </span>
                  </div>

                  <p className="text-ink-subtle mt-2 line-clamp-3 text-xs break-words">
                    {getPlanDetail(p.id).summary}
                  </p>

                  <dl className="mt-3 space-y-1.5 text-sm">
                    {[
                      ['Monthly price', formatMoney(p.monthlyPrice)],
                      ['Subscribers', p.subscribers.toLocaleString()],
                      ['Renewal rate', `${p.renewalRate}%`],
                      ['Monthly revenue', formatMoney(planRevenue(p))],
                    ].map(([label, value]) => (
                      <div key={label} className="flex flex-wrap justify-between gap-x-3">
                        <dt className="text-ink-muted shrink-0">{label}</dt>
                        <dd className="text-ink min-w-0 text-right font-medium tabular-nums">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Link>

                {/* Outside the card link: a nested anchor is invalid, and this
                    one leaves the catalogue entirely. */}
                <Link
                  to={`/billing/subscriptions?plan=${p.id}`}
                  className="text-brand-700 hover:text-brand-800 mt-2 inline-flex min-h-11 items-center text-sm font-medium"
                >
                  View tracked subscriptions
                  <span className="sr-only"> on {p.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <p className="text-ink-subtle mt-3 text-xs">
          {base.toLocaleString()} active subscriptions across{' '}
          {plans.length} plans, generating {formatMoney(plans.reduce((sum, p) => sum + planRevenue(p), 0))} a month.
        </p>
      </section>

      <Panel title={plan.name} flush>
        {/* Navigation, not an ARIA tablist: each one is a URL. `role="tab"`
            would hide that they are links and advertise arrow-key movement
            that anchors don't have. */}
        <nav
          aria-label={`${plan.name} configuration`}
          className="border-line no-scrollbar flex gap-1 overflow-x-auto border-y px-2"
        >
          {tabs.map((t) => {
            const selected = t.slug === tab
            return (
              <Link
                key={t.slug}
                to={`/billing/plans/${planId}/${t.slug}`}
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
          {tab === 'general' && <GeneralTab plan={plan} />}
          {tab === 'pricing' && <PricingTab plan={plan} />}
          {tab === 'services' && <ServicesTab plan={plan} />}
          {tab === 'eligibility' && <EligibilityTab plan={plan} />}
          {tab === 'coverage' && <CoverageTab plan={plan} />}
          {tab === 'billing-rules' && <BillingRulesTab plan={plan} />}
          {tab === 'renewal-rules' && <RenewalRulesTab plan={plan} />}
          {tab === 'analytics' && <AnalyticsTab plan={plan} />}
          {tab === 'history' && <HistoryTab plan={plan} />}
        </div>
      </Panel>
    </div>
  )
}
