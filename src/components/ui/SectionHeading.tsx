import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SectionHeadingProps {
  /** Must match the `aria-labelledby` on the owning <section>. */
  id?: string
  title: string
  hint?: string
  /** Small red dot before the title, for attention-worthy sections. */
  alert?: boolean
  children?: ReactNode
  className?: string
}

export function SectionHeading({
  id,
  title,
  hint,
  alert,
  children,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'mb-3 flex flex-wrap items-center gap-x-3 gap-y-2',
        className,
      )}
    >
      <h2
        id={id}
        className="text-ink flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight"
      >
        {alert && (
          <span
            className="size-2 shrink-0 rounded-full bg-red-500"
            aria-hidden="true"
          />
        )}
        {title}
      </h2>
      {hint && <p className="text-ink-subtle min-w-0 text-sm">{hint}</p>}
      {children && (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}
