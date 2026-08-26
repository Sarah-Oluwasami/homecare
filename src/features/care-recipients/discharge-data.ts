import { TODAY } from '@/lib/today'
import { getCaregiverRecord } from './caregivers-data'
import { getCarePlan } from './care-plan-data'
import { getDocuments } from './documents-data'
import {
  formatContactDate,
  getFamilyRecord,
  lastContact,
  memberWithRole,
} from './family-data'
import { getVisitHistory } from './visits-data'
import {
  formatMoney,
  getBillingRecord,
  invoiceStatus,
  outstandingBalance,
} from './billing-data'
import { getRecipientProfile } from './profile-data'
import { recipientStatusLabels } from '@/lib/status-labels'

export { TODAY }

/* ---------------------------------- types --------------------------------- */

export type DischargeAction = 'hold' | 'discharge'

/** `blocked` prevents submission; `attention` warns but does not. */
export type CheckState = 'clear' | 'attention' | 'blocked' | 'not-started'

export interface ChecklistItem {
  id: string
  label: string
  detail: string
  state: CheckState
}

export interface SummaryItem {
  id: string
  label: string
  value: string
  emphasis?: 'good' | 'bad'
}

export interface DischargeReadiness {
  summary: SummaryItem[]
  checklist: ChecklistItem[]
  /** True when nothing in the checklist is `blocked`. */
  canProcess: boolean
}

export const dischargeReasons = [
  'Care no longer needed',
  'Transition to residential facility',
  'Relocated out of coverage area',
  'Care recipient deceased',
  'Family requested termination',
]

export const holdReasons = [
  'Hospitalisation or clinical rehab stay',
  'Family vacation or seasonal travel',
  'Temporary out-of-area arrangement',
  'Awaiting insurance re-authorisation',
]

export const acknowledgements = [
  'Final overall functional and safety assessment completed and filed',
  'Outstanding medication or clinical tasks resolved',
  'Family notified formally',
  'Final service invoices generated and verified',
  'Care plan document and physical signatures archived for reference',
]

/* --------------------------------- helpers -------------------------------- */

const DAY_MS = 86_400_000

/** "4 months, 9 days" from a care start date. */
export function careDuration(startIso: string, today = TODAY): string {
  const start = new Date(`${startIso}T00:00:00Z`)
  const now = new Date(`${today}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) return 'Not recorded'

  let months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth())
  let days = now.getUTCDate() - start.getUTCDate()
  if (days < 0) {
    months -= 1
    const previous = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0),
    )
    days += previous.getUTCDate()
  }

  if (months < 0 || (months === 0 && days < 0)) return 'Not started'
  days = Math.max(0, days)

  const years = Math.floor(months / 12)
  const parts: string[] = []
  if (years > 0) parts.push(`${years} yr`)
  if (months % 12 > 0) parts.push(`${months % 12} mo`)
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  return parts.join(', ')
}

/** ISO date `days` from today, for the effective-date default. */
export function defaultEffectiveDate(days = 7, today = TODAY): string {
  return new Date(new Date(`${today}T00:00:00Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

/* -------------------------------- readiness ------------------------------- */

/**
 * Nothing here is asserted. Each row is answered by the module that owns the
 * fact, so the screen cannot claim a zero balance over an unpaid invoice or a
 * clean roster while five caregivers are still attached.
 */
export function getDischargeReadiness(
  recipientId: string,
  action: DischargeAction,
): DischargeReadiness | undefined {
  const profile = getRecipientProfile(recipientId)
  if (!profile) return undefined

  const billing = getBillingRecord(recipientId)
  const rate = billing?.insurance.coverageRate ?? 0
  const invoices = billing?.invoices ?? []
  const balance = billing ? outstandingBalance(invoices, rate) : 0
  const overdue = invoices.filter((i) => invoiceStatus(i) === 'overdue').length

  const visits = getVisitHistory(recipientId)
  const team = getCaregiverRecord(recipientId)?.team ?? []
  const plan = getCarePlan(recipientId)
  const family = getFamilyRecord(recipientId)
  const primaryContact = family
    ? memberWithRole(family.members, 'Primary Contact')
    : undefined
  const contacted = primaryContact
    ? lastContact(family?.log ?? [], primaryContact.id)
    : undefined
  const dischargeLetter = getDocuments(recipientId).some((d) =>
    /discharge/i.test(d.name),
  )

  const summary: SummaryItem[] = [
    {
      id: 'status',
      label: 'Status',
      value: recipientStatusLabels[profile.status],
      emphasis: profile.status === 'active' ? 'good' : undefined,
    },
    {
      id: 'duration',
      label: 'Care duration',
      value: careDuration(profile.summary.startDateIso),
    },
    {
      id: 'visits',
      label: 'Total visits',
      value: `${visits?.totalVisits ?? 0} total`,
    },
    {
      id: 'plan',
      label: 'Active plan',
      value: plan ? `Yes (${profile.careLevel})` : 'None on file',
    },
    {
      id: 'balance',
      label: 'Outstanding balance',
      value: formatMoney(balance),
      emphasis: balance > 0 ? 'bad' : 'good',
    },
    {
      id: 'team',
      label: 'Assigned caregivers',
      value: `${team.length} ${team.length === 1 ? 'professional' : 'professionals'}`,
    },
  ]

  /*
   * A temporary hold preserves the record, so it only warns about things a
   * pause would leave dangling. A full discharge blocks on them.
   */
  const blockOn = (condition: boolean): CheckState =>
    condition ? 'clear' : action === 'discharge' ? 'blocked' : 'attention'

  const futureVisits = profile.upcoming.length

  const checklist: ChecklistItem[] = [
    {
      id: 'shifts',
      label: 'Shifts reconciled',
      detail:
        futureVisits === 0
          ? 'No future visits outstanding'
          : `${futureVisits} future visits still scheduled`,
      state: blockOn(futureVisits === 0),
    },
    {
      id: 'billing',
      label: 'Billing reconciled',
      detail:
        balance > 0
          ? `${formatMoney(balance)} outstanding${overdue > 0 ? `, ${overdue} overdue` : ''}`
          : 'Balance confirmed at zero',
      state: blockOn(balance === 0),
    },
    // A hold preserves both by design, so the label changes with the action
    // rather than showing a tick over text that says the opposite.
    action === 'hold'
      ? {
          id: 'plan',
          label: 'Care plan preserved',
          detail: plan
            ? 'Kept intact for reactivation'
            : 'No active care plan on file',
          state: 'clear' as const,
        }
      : {
          id: 'plan',
          label: 'Care plan closed',
          detail: plan
            ? 'Active care plan still open'
            : 'No active care plan on file',
          state: plan ? ('blocked' as const) : ('clear' as const),
        },
    action === 'hold'
      ? {
          id: 'staff',
          label: 'Staff assignments retained',
          detail:
            team.length > 0
              ? `${team.length} stay attached for the duration of the hold`
              : 'No caregivers attached',
          state: 'clear' as const,
        }
      : {
          id: 'staff',
          label: 'Staff assignments removed',
          detail:
            team.length > 0
              ? `${team.length} still attached to this recipient`
              : 'No caregivers attached',
          state: blockOn(team.length === 0),
        },
    {
      id: 'family',
      label: 'Family acknowledgement',
      detail: contacted
        ? `${primaryContact?.name} contacted ${formatContactDate(contacted.at)}`
        : 'No contact recorded with the primary contact',
      state: contacted ? 'clear' : 'attention',
    },
    {
      id: 'letter',
      label: 'Discharge letter generated',
      detail: dischargeLetter
        ? 'Letter filed in documents'
        : 'Not generated yet',
      state: dischargeLetter ? 'clear' : 'not-started',
    },
  ]

  return {
    summary,
    checklist,
    canProcess: !checklist.some((c) => c.state === 'blocked'),
  }
}
