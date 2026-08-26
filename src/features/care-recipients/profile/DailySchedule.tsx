import type { ScheduleEntry } from '../care-plan-data'
import { Panel } from '@/components/ui/Panel'

export function DailySchedule({ entries }: { entries: ScheduleEntry[] }) {
  return (
    <Panel title="Daily Care Schedule">
      <ol className="mt-1">
        {entries.map((entry, i) => {
          const last = i === entries.length - 1
          return (
            <li key={entry.id} className="flex gap-3 sm:gap-4">
              {/* Time sits left of the rail on sm+, above it on phones */}
              <span className="text-brand-700 hidden w-20 shrink-0 pt-0.5 text-right text-xs font-semibold sm:block">
                {entry.time}
              </span>

              <span
                aria-hidden="true"
                className="relative flex w-2 shrink-0 flex-col items-center"
              >
                <span className="bg-brand-600 mt-1.5 size-2 shrink-0 rounded-full" />
                {/* -mb-1.5 closes the gap left by the next dot's mt-1.5,
                    otherwise the rail reads as dashed at every stop */}
                {!last && <span className="bg-brand-200 -mb-1.5 w-px flex-1" />}
              </span>

              <div className={last ? 'min-w-0 pb-0' : 'min-w-0 pb-6'}>
                <span className="text-brand-700 block text-xs font-semibold sm:hidden">
                  {entry.time}
                </span>
                <h3 className="text-ink text-sm font-semibold break-words">
                  {entry.title}
                </h3>
                <p className="text-ink-muted mt-0.5 text-sm break-words">
                  {entry.detail}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}
