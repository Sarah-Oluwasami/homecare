import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PanelProps {
  title: string
  /** Small badge to the right of the title, e.g. "4 Active". */
  badge?: ReactNode
  /** Footer link rendered centred beneath the body. */
  action?: { label: string; to: string }
  children: ReactNode
  /** Set when the body supplies its own padding (tables, divided lists). */
  flush?: boolean
  className?: string
}

export function Panel({
  title,
  badge,
  action,
  children,
  flush,
  className,
}: PanelProps) {
  const headingId = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <section
      aria-labelledby={headingId}
      className={cn('card flex flex-col overflow-hidden', className)}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-4 pt-4',
          flush ? 'pb-3' : 'pb-0',
        )}
      >
        <h2
          id={headingId}
          className="text-ink min-w-0 text-sm font-semibold tracking-tight"
        >
          {title}
        </h2>
        {badge}
      </div>

      <div className={cn('flex-1', flush ? '' : 'px-4 pt-3 pb-4')}>
        {children}
      </div>

      {action && (
        /*
         * No rule above the link. The designs draw the footer as part of the
         * card rather than as a band cut off from it, and where the body is a
         * divided list the extra full-bleed rule read as one more row.
         */
        <div className="p-3 text-center">
          <Link
            to={action.to}
            className="text-brand-700 hover:text-brand-800 inline-flex items-center gap-1.5 text-sm font-medium"
          >
            {action.label}
            <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  )
}
