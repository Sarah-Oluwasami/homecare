import { ArrowUpDown, Columns3, Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

export type DirectoryFilter =
  | 'all'
  | 'active'
  | 'on-hold'
  | 'high-priority'
  | 'new'

interface DirectoryToolbarProps {
  filter: DirectoryFilter
  onFilterChange: (filter: DirectoryFilter) => void
  query: string
  onQueryChange: (query: string) => void
  counts: Record<DirectoryFilter, number>
}

const filterLabels: { id: DirectoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'on-hold', label: 'On Hold' },
  { id: 'high-priority', label: 'High Priority' },
  { id: 'new', label: 'New' },
]

const tools = [
  { id: 'filters', label: 'Filters', icon: SlidersHorizontal },
  { id: 'sort', label: 'Sort', icon: ArrowUpDown },
  { id: 'columns', label: 'Columns', icon: Columns3 },
]

export function DirectoryToolbar({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  counts,
}: DirectoryToolbarProps) {
  return (
    <div className="border-line flex flex-col gap-3 border-b p-3 xl:flex-row xl:items-center xl:justify-between">
      {/* Pills scroll rather than wrap — five of them won't fit narrow screens */}
      <div
        role="group"
        aria-label="Filter care recipients"
        className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1"
      >
        {filterLabels.map(({ id, label }) => {
          const selected = filter === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onFilterChange(id)}
              className={cn(
                'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
                // An idle chip carries its own fill. Without one the row read
                // as a single button followed by four pieces of loose text —
                // the count beside each label was the only hint they were the
                // same kind of control.
                selected
                  ? 'bg-brand-600 text-white'
                  : 'bg-sunken text-ink-muted hover:bg-line hover:text-ink',
              )}
            >
              {label}
              <span
                className={cn(
                  // ink-subtle clears 4.5:1 on white but not on the chip's
                  // own fill, and the count is real content, not decoration.
                  'text-xs tabular-nums',
                  selected ? 'text-white' : 'text-ink-muted',
                )}
              >
                {counts[id]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:w-64">
          <Search
            className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            strokeWidth={1.8}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search care recipients"
            placeholder="Search name, ID, or condition..."
            className="border-line bg-surface text-ink placeholder:text-ink-subtle focus:border-brand-400 h-10 w-full rounded-lg border pr-3 pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {tools.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              // Labels drop below sm; the accessible name stays either way
              aria-label={label}
              className="border-control text-ink-muted hover:bg-sunken inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors sm:flex-none"
            >
              <Icon className="size-4" strokeWidth={1.8} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
