import type { RecipientStatus } from '@/types'

/**
 * Lives here rather than in StatusBadge so non-component modules can read it —
 * files under components/ may only export components.
 */
export const recipientStatusLabels: Record<RecipientStatus, string> = {
  active: 'Active care',
  'on-hold': 'On hold',
  new: 'New',
  discharged: 'Discharged',
}
