import { ClipboardList, UserRound, UserRoundCheck } from 'lucide-react'
import type { VisitHistory } from '../visits-data'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { toneChip } from '@/lib/tone'
import { cn } from '@/lib/cn'

function TrendChart({
  bars,
  delta,
}: {
  bars: VisitHistory['weeklyTrend']
  delta: VisitHistory['trendDelta']
}) {
  const peak = Math.max(...bars.map((b) => b.count), 1)

  return (
    <article className="card p-4">
      <h3 className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
        Visits Per Week Trend
      </h3>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        {/* The table below is the accessible form; the bars are decoration */}
        <div aria-hidden="true" className="flex items-end gap-1.5">
          {bars.map((bar) => (
            <div key={bar.label} className="flex w-6 flex-col items-center gap-1">
              {/* min-h-px so a zero-count week reads as an empty bar rather
                  than a missing one */}
              <div
                className="bg-brand-600 min-h-px w-full rounded-t-sm"
                style={{ height: `${(bar.count / peak) * 48}px` }}
              />
              <span className="text-ink-subtle text-[0.6rem]">{bar.label}</span>
            </div>
          ))}
        </div>

        <div className="text-right">
          <p
            className={cn(
              'text-lg font-bold tabular-nums',
              delta.direction === 'up' ? 'text-emerald-700' : 'text-red-600',
            )}
          >
            {delta.value}
          </p>
          <p className="text-ink-subtle text-xs">vs previous month</p>
        </div>
      </div>

      <table className="sr-only">
        <caption>Visits per week, last five weeks</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Visits</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.label}>
              <th scope="row">{bar.label}</th>
              <td>{bar.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

function FactCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: typeof UserRound
  tone: 'blue' | 'green'
}) {
  return (
    // The chip sits against the middle of the card, not level with the label —
    // top-aligned it read as a badge on the heading rather than a mark for the
    // figure underneath it.
    <article className="card flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <h3 className="text-ink-muted text-xs font-semibold tracking-wider uppercase">
          {label}
        </h3>
        <p className="text-ink mt-2 text-xl font-bold tracking-tight break-words">
          {value}
        </p>
        <p className="text-ink-subtle mt-1 text-xs break-words">{detail}</p>
      </div>

      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-xl',
          toneChip[tone],
        )}
      >
        <Icon className="size-5" strokeWidth={1.9} aria-hidden="true" />
      </span>
    </article>
  )
}

export function VisitAnalytics({ history }: { history: VisitHistory }) {
  return (
    <section aria-labelledby="visit-analytics">
      <SectionHeading id="visit-analytics" title="Visit Analytics" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TrendChart bars={history.weeklyTrend} delta={history.trendDelta} />
        <FactCard
          label="Most Common Visit Type"
          value={history.commonType.name}
          detail={history.commonType.share}
          icon={ClipboardList}
          tone="blue"
        />
        <FactCard
          label="Primary Caregiver Coverage"
          value={history.coverage.percent}
          detail={history.coverage.detail}
          // A person with a tick: the card is about the share of visits one
          // caregiver covered, not about a caregiver.
          icon={UserRoundCheck}
          tone="green"
        />
      </div>
    </section>
  )
}
