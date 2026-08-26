import { cn } from '@/lib/cn'

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** e.g. "Showing 1-8 of 342 care recipients" */
  summary: string
}

/**
 * Builds a page list with ellipses: 1 … n-1 n n+1 … last.
 * Returns `'gap'` markers rather than rendering them, so the caller controls
 * how a gap looks.
 */
function pageItems(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  }

  const items: (number | 'gap')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)

  if (start > 2) items.push('gap')
  for (let i = start; i <= end; i++) items.push(i)
  if (end < pageCount - 1) items.push('gap')

  items.push(pageCount)
  return items
}

const stepClasses =
  'border-line text-ink-muted h-9 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-sunken aria-disabled:pointer-events-none aria-disabled:opacity-40'

export function Pagination({
  page,
  pageCount,
  onPageChange,
  summary,
}: PaginationProps) {
  const items = pageItems(page, pageCount)
  const atStart = page <= 1
  const atEnd = page >= pageCount

  return (
    <nav
      aria-label="Pagination"
      className="border-line flex flex-col gap-3 border-t p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Announced on filter/search so the row count change isn't silent */}
      <p aria-live="polite" className="text-ink-muted text-sm">
        {summary}
      </p>

      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          // aria-disabled rather than disabled: a disabled button leaves the
          // tab order mid-interaction and drops focus to <body>.
          aria-disabled={atStart}
          onClick={() => !atStart && onPageChange(page - 1)}
          className={stepClasses}
        >
          Previous
        </button>

        {/* Page numbers are noise on a phone; the summary line carries context */}
        <div className="hidden items-center gap-1 sm:flex">
          {items.map((item, i) =>
            item === 'gap' ? (
              <span
                key={`gap-${i}`}
                aria-hidden="true"
                className="text-ink-subtle px-1 text-sm"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  'grid size-9 place-items-center rounded-lg text-sm font-medium tabular-nums transition-colors',
                  item === page
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-muted hover:bg-sunken',
                )}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          aria-disabled={atEnd}
          onClick={() => !atEnd && onPageChange(page + 1)}
          className={stepClasses}
        >
          Next
        </button>
      </div>
    </nav>
  )
}
