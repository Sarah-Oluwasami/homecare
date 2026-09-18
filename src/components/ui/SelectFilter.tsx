import { ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
   * Compact chip form: a shorter control on pointer-sized screens. Opt-in, so
   * the dozen screens using the default height are left alone. Still 44px tall
   * below `sm`, where a finger is the pointer.
   */
  chip?: boolean
  /** Leading glyph, where the screen's other controls carry one. */
  icon?: LucideIcon
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
  chip = false,
  icon: Icon,
}: SelectFilterProps) {
  return (
    <div className={cn('relative', className)}>
      <label
        className={cn(
          `border-control hover:bg-sunken focus-within:border-brand-400 flex min-h-11 items-center gap-1.5 border pl-3 text-sm
            has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600`,
          'rounded-lg',
          chip && 'sm:min-h-9.5',
        )}
      >
        {Icon && (
          <Icon
            className="text-ink-subtle size-4 shrink-0"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        )}
        <span className="text-ink-muted shrink-0">{label}:</span>
        {/* grow + pr-8 puts the select's own hit area under the chevron —
            clicking a label only focuses a select, it doesn't open it. */}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          /*
           * `field-sizing: content` makes the control as wide as the option
           * showing rather than as wide as its longest option — "Status: All"
           * stops reserving room for "Late Arrival". Chromium-only for now;
           * everywhere else it falls back to the old behaviour, which is wider
           * but never broken.
           */
          className={cn(
            'text-ink h-full min-w-0 grow appearance-none bg-transparent pr-8 font-medium [field-sizing:content]',
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
        className="text-ink-subtle pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      />
    </div>
  )
}
