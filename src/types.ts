/**
 * Domain vocabulary shared across features. Kept out of any one feature so UI
 * primitives don't have to import from a sibling feature's data module.
 */

/** Semantic colour slot. Concrete classes live in `src/lib/tone.ts`. */
export type Tone = 'green' | 'blue' | 'purple' | 'amber' | 'red' | 'rose' | 'slate'

export type Priority = 'critical' | 'urgent' | 'high' | 'medium' | 'normal' | 'low'

export type Severity = 'critical' | 'high' | 'medium'

export type VisitStatus =
  | 'completed'
  | 'in-progress'
  | 'starting-soon'
  | 'unassigned'
  | 'upcoming'
  | 'late-arrival'
  | 'cancelled'

export type RecipientStatus = 'active' | 'on-hold' | 'new' | 'discharged'

/** How much of a caregiver's week a recipient occupies. */
export type CareLevel = 'Full-Time' | 'Part-Time' | 'Hourly' | '24-Hour'
