/**
 * Kept out of VisitFilters.tsx so that file only exports components — mixing
 * constants in breaks Fast Refresh.
 */

export interface VisitFilterState {
  range: string
  caregiver: string
  type: string
  status: string
  query: string
}

export const initialFilters: VisitFilterState = {
  range: '30',
  caregiver: 'all',
  type: 'all',
  status: 'all',
  query: '',
}

export const rangeOptions = [
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
]
