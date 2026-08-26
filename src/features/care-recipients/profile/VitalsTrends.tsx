import type { VitalStatus, VitalTrend } from '../health-data'
import { Panel } from '@/components/ui/Panel'
import { Sparkline } from '@/components/ui/Sparkline'
import { cn } from '@/lib/cn'

const dot: Record<VitalStatus, string> = {
  normal: 'bg-emerald-500',
  watch: 'bg-amber-500',
  neutral: 'bg-blue-500',
}

const line: Record<VitalStatus, string> = {
  normal: 'text-emerald-500',
  watch: 'text-amber-500',
  neutral: 'text-blue-500',
}

/** Rendered as visible text — the dot colour must not be the only signal. */
const statusLabel: Record<VitalStatus, string> = {
  normal: 'In range',
  watch: 'Watch',
  neutral: 'Tracked',
}

const statusChip: Record<VitalStatus, string> = {
  normal: 'bg-emerald-50 text-emerald-700',
  watch: 'bg-amber-50 text-amber-700',
  neutral: 'bg-blue-50 text-blue-700',
}

export function VitalsTrends({ vitals }: { vitals: VitalTrend[] }) {
  return (
    <Panel title="Vitals Trend Summary" flush>
      <ul className="divide-line border-line divide-y border-t">
        {vitals.map((v) => (
          <li
            key={v.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          >
            {/* basis-full below sm: with flex-basis 0 the row can never wrap,
                so the label would absorb all the squeeze down to ~24px */}
            <h3 className="text-ink flex min-w-0 basis-full items-center gap-2.5 text-sm font-medium sm:flex-1 sm:basis-40">
              <span
                aria-hidden="true"
                className={cn('size-2 shrink-0 rounded-full', dot[v.status])}
              />
              <span className="break-words">{v.label}</span>
            </h3>

            <span
              className={cn(
                'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
                statusChip[v.status],
              )}
            >
              {statusLabel[v.status]}
            </span>

            <p className="text-ink ml-auto shrink-0 font-semibold tabular-nums">
              {v.value}
              <span className="text-ink-subtle ml-1 text-xs font-normal">
                {v.unit}
              </span>
            </p>

            <span className={cn('shrink-0', line[v.status])}>
              <Sparkline
                series={v.series}
                unit={v.seriesUnit}
                label={v.label}
              />
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
