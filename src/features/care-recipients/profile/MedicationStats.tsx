import type { MedicationStat } from '../medications-data'
import { toneChip, toneText } from '@/lib/tone'
import { cn } from '@/lib/cn'

export function MedicationStats({ stats }: { stats: MedicationStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ id, label, value, hint, hintTone, icon: Icon, tone }) => (
        <article key={id} className="card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
              {label}
            </p>
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-lg',
                toneChip[tone],
              )}
            >
              <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
            </span>
          </div>

          <p className="text-ink mt-3 text-2xl font-bold tracking-tight break-words">
            {value}
          </p>
          <p className={cn('mt-1 text-xs', toneText[hintTone])}>{hint}</p>
        </article>
      ))}
    </div>
  )
}
