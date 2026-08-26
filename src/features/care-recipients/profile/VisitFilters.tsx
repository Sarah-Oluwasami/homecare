import { Search } from 'lucide-react'
import { rangeOptions } from './visit-filter-state'
import type { VisitFilterState } from './visit-filter-state'
import { SelectFilter } from '@/components/ui/SelectFilter'

interface VisitFiltersProps {
  filters: VisitFilterState
  onChange: (next: VisitFilterState) => void
  caregivers: string[]
  types: string[]
  statuses: { value: string; label: string }[]
}

export function VisitFilters({
  filters,
  onChange,
  caregivers,
  types,
  statuses,
}: VisitFiltersProps) {
  const set = <K extends keyof VisitFilterState>(
    key: K,
    value: VisitFilterState[K],
  ) => onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
      {/* Four across only at 2xl — below that each column is too narrow for
          "Last 30 Days" and the native control clips without an ellipsis. */}
      <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 2xl:grid-cols-4">
        <SelectFilter
          label="Date Range"
          value={filters.range}
          onChange={(v) => set('range', v)}
          options={rangeOptions}
        />
        <SelectFilter
          label="Caregiver"
          value={filters.caregiver}
          onChange={(v) => set('caregiver', v)}
          options={[
            { value: 'all', label: 'All' },
            ...caregivers.map((c) => ({ value: c, label: c })),
          ]}
        />
        <SelectFilter
          label="Visit Type"
          value={filters.type}
          onChange={(v) => set('type', v)}
          options={[
            { value: 'all', label: 'All' },
            ...types.map((t) => ({ value: t, label: t })),
          ]}
        />
        <SelectFilter
          label="Status"
          value={filters.status}
          onChange={(v) => set('status', v)}
          options={[{ value: 'all', label: 'All' }, ...statuses]}
        />
      </div>

      <div className="relative 2xl:w-64">
        <Search
          aria-hidden="true"
          className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          strokeWidth={1.8}
        />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set('query', e.target.value)}
          aria-label="Search visits and notes"
          placeholder="Search visits, notes..."
          className="border-line bg-surface text-ink placeholder:text-ink-subtle focus:border-brand-400 h-10 w-full rounded-lg border pr-3 pl-9 text-sm"
        />
      </div>
    </div>
  )
}
