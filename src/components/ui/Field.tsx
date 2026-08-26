import { useId } from 'react'
import { cn } from '@/lib/cn'

interface FieldProps {
  label: string
  /** Rendered under the control and wired up with aria-describedby. */
  hint?: string
  error?: string
  /** Locked fields still read out; they are not omitted. */
  readOnlyNote?: string
  className?: string
  children: (props: {
    id: string
    'aria-describedby': string | undefined
    'aria-invalid': true | undefined
  }) => React.ReactNode
}

/**
 * A label, a control and its messages, wired together.
 *
 * The control is a render prop rather than a wrapped `<input>` because half the
 * form is selects, textareas and date inputs, and a component that switches on
 * a `type` string ends up reimplementing the DOM badly.
 */
export function Field({
  label,
  hint,
  error,
  readOnlyNote,
  className,
  children,
}: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy =
    [error ? errorId : null, hint || readOnlyNote ? hintId : null]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="text-ink-muted mb-1.5 block text-xs font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
      {!error && (hint || readOnlyNote) && (
        <p id={hintId} className="text-ink-subtle mt-1 text-xs break-words">
          {hint ?? readOnlyNote}
        </p>
      )}
    </div>
  )
}
