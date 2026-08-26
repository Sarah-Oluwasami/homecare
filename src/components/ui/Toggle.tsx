import { useId } from 'react'
import { cn } from '@/lib/cn'

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  /** Rendered under the label and wired up with aria-describedby. */
  hint?: React.ReactNode
  /** Extra element ids to describe the switch with, e.g. a warning below it. */
  describedBy?: string
  className?: string
}

/**
 * A real checkbox with `role="switch"`, not a div listening for clicks: the
 * label, keyboard behaviour and the on/off announcement all come free, and a
 * switch that only responds to a mouse is not a control.
 *
 * The track carries a border as well as a fill, so on/off does not rest on
 * colour alone.
 */
export function Toggle({
  label,
  checked,
  onChange,
  hint,
  describedBy,
  className,
}: ToggleProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const described =
    [hint ? hintId : null, describedBy || null].filter(Boolean).join(' ') ||
    undefined

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="text-ink block cursor-pointer text-sm break-words"
        >
          {label}
        </label>
        {hint && (
          <p id={hintId} className="text-ink-subtle mt-0.5 text-xs break-words">
            {hint}
          </p>
        )}
      </div>

      <span className="relative inline-flex shrink-0 pt-0.5">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          aria-describedby={described}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          aria-hidden="true"
          className={cn(
            'block h-6 w-11 cursor-pointer rounded-full border transition-colors',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600',
            checked
              ? 'bg-brand-600 border-brand-600'
              : 'bg-sunken border-line',
          )}
        >
          {/* Track is 44×24 with a 1px border, so the 20px knob sits 1.5px
              from each edge at rest and 20px along when on — symmetric. */}
          <span
            className={cn(
              'mt-[1.5px] block size-5 rounded-full bg-white shadow-sm transition-transform',
              checked ? 'translate-x-[20px]' : 'translate-x-[1.5px]',
            )}
          />
        </label>
      </span>
    </div>
  )
}
