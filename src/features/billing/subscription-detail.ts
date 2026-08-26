import {
  failedPayment,
  hoursConsumedPercent,
  hoursPackageFor,
  hoursRemaining,
  packageValue,
  planById,
  renewalAmount,
  renewalPayment,
  subscriptions,
  transactions,
} from './data'
import type { Subscription, Transaction } from './data'
import { recipients } from '@/features/care-recipients/data'
import type { Recipient } from '@/features/care-recipients/data'
import { getRecipientProfile } from '@/features/care-recipients/profile-data'
import type { RecipientProfile } from '@/features/care-recipients/profile-data'
import { getFamilyRecord } from '@/features/care-recipients/family-data'
import type { FamilyMember } from '@/features/care-recipients/family-data'
import { getCaregiverRecord, roleFor } from '@/features/care-recipients/caregivers-data'
import type { TeamMember } from '@/features/care-recipients/caregivers-data'
import {
  RATE_PER_VISIT,
  getBillingRecord,
  invoiceAmount,
  patientDue,
  payments,
  sortInvoices,
} from '@/features/care-recipients/billing-data'
import type { BillingRecord, Invoice, Payment } from '@/features/care-recipients/billing-data'
import { getCareNotes } from '@/features/care-recipients/notes-data'
import type { CareNoteEntry } from '@/features/care-recipients/notes-data'
import { TODAY } from '@/lib/today'

export { TODAY }

/* ---------------------------------- types --------------------------------- */

export interface HoursLedger {
  contract: string
  purchased: number
  used: number
  remaining: number
  consumedPercent: number
  /** What the balance cost, at the base hourly rate. */
  value: number
  expiresAt: string
}

export interface TimelineEntry {
  id: string
  /** ISO. */
  at: string
  title: string
  detail: string
  actor: string
}

export interface SubscriptionDetail {
  subscription: Subscription
  recipient: Recipient
  profile: RecipientProfile
  /** Surname-derived, so the table and the panel always agree. */
  familyName: string
  primaryContact: FamilyMember | undefined
  coordinator: string
  caregiver: TeamMember | undefined
  caregiverRole: string | undefined
  billing: BillingRecord | undefined
  invoices: Invoice[]
  paymentHistory: Payment[]
  transactions: Transaction[]
  notes: CareNoteEntry[]
  hours: HoursLedger | undefined
  timeline: TimelineEntry[]
  audit: TimelineEntry[]
  renewal: {
    at: string | undefined
    amount: number
    payment: Transaction | undefined
    /** Set when the last charge on this plan bounced. */
    failed: Transaction | undefined
  }
}

/* --------------------------------- helpers -------------------------------- */

/**
 * "Wilson Family" from "James Wilson". Derived rather than stored: the mockup
 * carried a separate family column that drifted from the patient's surname.
 */
export function familyNameFor(name: string): string {
  const surname = name.trim().split(/\s+/).at(-1) ?? name
  return `${surname} Family`
}

export function getSubscription(subId: string | undefined): Subscription | undefined {
  return subscriptions.find((s) => s.id === subId)
}

/* ------------------------------- the builder ------------------------------ */

export function getSubscriptionDetail(
  subId: string | undefined,
): SubscriptionDetail | undefined {
  const subscription = getSubscription(subId)
  if (!subscription) return undefined

  const recipient = recipients.find((r) => r.id === subscription.recipientId)
  const profile = getRecipientProfile(subscription.recipientId)
  if (!recipient || !profile) return undefined

  const family = getFamilyRecord(subscription.recipientId)
  const primaryContact =
    family?.members.find((m) => m.roles.includes('Primary Contact')) ??
    family?.members[0]

  const caregivers = getCaregiverRecord(subscription.recipientId)
  const caregiver =
    caregivers?.team.find((m) => m.primary) ?? caregivers?.team[0]

  const billing = getBillingRecord(subscription.recipientId)
  const invoices = billing ? sortInvoices(billing.invoices) : []
  const rate = billing?.insurance.coverageRate ?? 0
  const paymentHistory = billing ? payments(invoices, rate) : []

  const clientTransactions = transactions.filter((t) => t.client === recipient.name)

  // Only a flexible subscriber holds a prepaid balance; everyone else shows
  // "not applicable" rather than a fabricated zero.
  const pkg = hoursPackageFor(subscription.recipientId)
  const hours: HoursLedger | undefined = pkg
    ? {
        contract: pkg.contract,
        purchased: pkg.purchased,
        used: pkg.used,
        remaining: hoursRemaining(pkg),
        consumedPercent: hoursConsumedPercent(pkg),
        value: packageValue(pkg),
        expiresAt: pkg.expiresAt,
      }
    : undefined

  return {
    subscription,
    recipient,
    profile,
    familyName: familyNameFor(recipient.name),
    primaryContact,
    coordinator: profile.summary.coordinator,
    caregiver,
    caregiverRole: caregiver
      ? roleFor(subscription.recipientId, caregiver.name)
      : undefined,
    billing,
    invoices,
    paymentHistory,
    transactions: clientTransactions,
    notes: getCareNotes(subscription.recipientId).slice(0, 5),
    hours,
    timeline: buildTimeline(subscription, profile, clientTransactions),
    audit: buildAudit(subscription, profile, invoices, rate, clientTransactions),
    renewal: {
      at: subscription.renewsAt,
      amount: renewalAmount(subscription),
      payment: renewalPayment(subscription),
      failed: failedPayment(subscription),
    },
  }
}

/* -------------------------------- timelines ------------------------------- */

function newest(a: TimelineEntry, b: TimelineEntry) {
  return b.at.localeCompare(a.at)
}

/**
 * Onboarding and lifecycle. Every entry is an event another module already
 * records — this view authors nothing, which is what makes it a cross-check.
 */
function buildTimeline(
  sub: Subscription,
  profile: RecipientProfile,
  clientTransactions: Transaction[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  // Recipients without a full profile record carry no start date. Emitting the
  // entry anyway would hand an empty string to Intl, which throws on an
  // invalid date rather than rendering a dash.
  if (profile.summary.startDateIso) {
    entries.push({
      id: `${sub.id}-start`,
      at: profile.summary.startDateIso,
      title: 'Care started',
      detail: `${planById[sub.planId].name} · ${profile.careLevel} cover`,
      actor: profile.summary.coordinator,
    })
  }

  const pkg = hoursPackageFor(sub.recipientId)
  if (pkg) {
    entries.push({
      id: `${sub.id}-hours`,
      at: pkg.expiresAt,
      title: 'Hours package expires',
      detail: `${pkg.contract} · ${hoursRemaining(pkg)} hours remaining`,
      actor: 'System',
    })
  }

  for (const t of clientTransactions) {
    entries.push({
      id: `${sub.id}-${t.id}`,
      at: t.at,
      title:
        t.status === 'succeeded'
          ? 'Payment settled'
          : t.status === 'failed'
            ? 'Payment failed'
            : 'Payment in flight',
      detail: `${t.reference} · ${t.method}`,
      actor: 'System',
    })
  }

  if (sub.renewsAt) {
    entries.push({
      id: `${sub.id}-renewal`,
      at: sub.renewsAt,
      title: 'Next automated renewal',
      detail: `${planById[sub.planId].name} · ${sub.cycle}`,
      actor: sub.autoRenew ? 'Auto-billing' : 'Manual',
    })
  }

  return entries.sort(newest)
}

/** Money-moving events only, each traceable to an invoice or a transaction. */
function buildAudit(
  sub: Subscription,
  profile: RecipientProfile,
  invoices: Invoice[],
  coverageRate: number,
  clientTransactions: Transaction[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  if (profile.summary.startDateIso) {
    entries.push({
      id: `${sub.id}-created`,
      at: profile.summary.startDateIso,
      title: 'Subscription created',
      detail: `${planById[sub.planId].name}, ${sub.cycle} cycle`,
      actor: profile.summary.coordinator,
    })
  }

  for (const invoice of invoices) {
    entries.push({
      id: `${sub.id}-${invoice.id}-issued`,
      at: invoice.issuedAt,
      title: `Invoice ${invoice.number} issued`,
      detail: `${invoice.visits} visits × ₦${RATE_PER_VISIT} = ₦${invoiceAmount(
        invoice,
      ).toLocaleString()} · patient share ₦${patientDue(
        invoice,
        coverageRate,
      ).toLocaleString()}`,
      actor: 'Billing',
    })
    if (invoice.paidAt) {
      entries.push({
        id: `${sub.id}-${invoice.id}-paid`,
        at: invoice.paidAt,
        title: `Invoice ${invoice.number} settled`,
        detail: `₦${patientDue(invoice, coverageRate).toLocaleString()} received`,
        actor: 'System',
      })
    }
  }

  for (const t of clientTransactions) {
    entries.push({
      id: `${sub.id}-audit-${t.id}`,
      at: t.at,
      title: `${t.id} ${t.status}`,
      detail: `₦${t.amount.toLocaleString()} · ${t.reference}`,
      actor: 'Payments',
    })
  }

  return entries.sort(newest)
}

/* ------------------------------ workspace KPIs ----------------------------- */

export interface StatusCount {
  id: string
  label: string
  value: number
  /** Whether the figure covers the whole organisation or only tracked rows. */
  scope: 'org' | 'tracked'
  hint: string
}
