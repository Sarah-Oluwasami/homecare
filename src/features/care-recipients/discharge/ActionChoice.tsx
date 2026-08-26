import { Archive, PauseCircle } from 'lucide-react'
import type { DischargeAction } from '../discharge-data'
import { cn } from '@/lib/cn'

const options: {
  value: DischargeAction
  title: string
  icon: typeof Archive
  chip: string
  description: string
  cases: string[]
}[] = [
  {
    value: 'hold',
    title: 'Place on Temporary Hold',
    icon: PauseCircle,
    chip: 'bg-amber-50 text-amber-600',
    description:
      'Pause active care services. The care plan, vital thresholds and clinical history stay intact, and the record can be reactivated without re-admission checks.',
    cases: [
      'Hospitalisation or temporary clinical rehab stay',
      'Family vacation or extended seasonal travel',
      'Temporary out-of-area care arrangement',
    ],
  },
  {
    value: 'discharge',
    title: 'Full Formal Discharge',
    icon: Archive,
    chip: 'bg-red-50 text-red-600',
    description:
      'Formally end active care. Scheduled shifts are cancelled, caregiver assignments detached, and the profile archived for clinical compliance.',
    cases: [
      'Care no longer clinically necessary or desired',
      'Permanent transition to a residential facility',
      'Relocation out of coverage, or recipient deceased',
    ],
  },
]

export function ActionChoice({
  value,
  onChange,
}: {
  value: DischargeAction
  onChange: (next: DischargeAction) => void
}) {
  return (
    <fieldset>
      <legend className="text-ink-subtle mb-3 text-xs font-semibold tracking-wider uppercase">
        1. Select administrative action
      </legend>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value
          const Icon = option.icon
          return (
            <label
              key={option.value}
              className={cn(
                'card cursor-pointer p-4 transition-colors',
                selected
                  ? 'border-brand-500 ring-brand-500 ring-1'
                  : 'hover:border-brand-300',
                'has-[:focus-visible]:outline-brand-600 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-lg',
                      option.chip,
                    )}
                  >
                    <Icon className="size-4.5" strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span
                    id={`${option.value}-title`}
                    className="text-ink text-base font-semibold break-words"
                  >
                    {option.title}
                  </span>
                </div>

                {/* Named by the title alone — wrapping the whole card would
                    make the radio announce sixty words of description. */}
                <input
                  type="radio"
                  name="discharge-action"
                  value={option.value}
                  checked={selected}
                  onChange={() => onChange(option.value)}
                  aria-labelledby={`${option.value}-title`}
                  aria-describedby={`${option.value}-description`}
                  className="accent-brand-600 mt-1 size-4 shrink-0"
                />
              </div>

              <p
                id={`${option.value}-description`}
                className="text-ink-muted mt-3 text-sm break-words"
              >
                {option.description}
              </p>

              <p className="text-ink-subtle mt-4 text-[0.65rem] font-semibold tracking-wider uppercase">
                Common use cases
              </p>
              <ul className="text-ink-muted mt-1.5 space-y-1 text-sm">
                {option.cases.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span aria-hidden="true" className="text-ink-subtle">
                      •
                    </span>
                    <span className="min-w-0 break-words">{c}</span>
                  </li>
                ))}
              </ul>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
