import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFilterProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  /**
   * Rounded-full chip rather than the default rounded rectangle. Opt-in, so the
   * dozen screens already using the square shape are left alone.
   */
  pill?: boolean
}

/**
 * A real <select> rather than a custom menu — native keyboard handling and the
 * platform picker on touch devices beat exact visual parity with a mock.
 */
export function SelectFilter({
  label,
  value,
  onChange,
  options,
  className,
  pill = false,
}: SelectFilterProps) {
  return (
    <div className={cn('relative', className)}>
      <label
        className={cn(
          `border-line hover:bg-sunken focus-within:border-brand-400 flex min-h-11 items-center gap-1.5 border text-sm
            has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600`,
          pill ? 'rounded-full pl-4' : 'rounded-lg pl-3',
        )}
      >
        <span className="text-ink-muted shrink-0">{label}:</span>
        {/* grow + pr-8 puts the select's own hit area under the chevron —
            clicking a label only focuses a select, it doesn't open it. */}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'text-ink h-full min-w-0 grow appearance-none bg-transparent font-medium',
            pill ? 'pr-9' : 'pr-8',
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'text-ink-subtle pointer-events-none absolute top-1/2 size-4 -translate-y-1/2',
          pill ? 'right-3.5' : 'right-3',
        )}
      />
    </div>
  )
}
