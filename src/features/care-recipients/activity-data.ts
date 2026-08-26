import { TODAY } from '@/lib/today'
import { getCaregiverRecord, roleFor } from './caregivers-data'
import { getCarePlan } from './care-plan-data'
import { getFamilyRecord, memberName } from './family-data'
import { getHealthRecord } from './health-data'
import { getMedicationPlan } from './medications-data'
import { getCareNotes, noteCategoryLabels } from './notes-data'
import type { NoteCategory } from './notes-data'
import { getDocuments } from './documents-data'
import { getVisitHistory } from './visits-data'
import {
  formatMoney,
  getBillingRecord,
  invoiceAmount,
  patientDue,
} from './billing-data'
import type { Tone } from '@/types'

/* ---------------------------------- types --------------------------------- */

export type ActivityType = 'visits' | 'medical' | 'administrative' | 'billing'

/** Which module the entry came from. Shown so that, say, a fall incident's
 *  health event, care note and uploaded report read as one occurrence. */
export type ActivitySource =
  | 'Visits'
  | 'Notes'
  | 'Health'
  | 'Medications'
  | 'Documents'
  | 'Billing'
  | 'Care Plan'
  | 'Caregivers'
  | 'Family'

export interface ActivityEntry {
  id: string
  source: ActivitySource
  /** ISO date. */
  date: string
  /** 24h "HH:MM". Absent where the source records only a date. */
  time?: string
  title: string
  detail: string
  actor: string
  actorRole: string
  type: ActivityType
}

export const ACTIVITY_PAGE_SIZE = 12

export const activityTypes: { value: ActivityType; label: string; tone: Tone }[] =
  [
    { value: 'visits', label: 'Visits', tone: 'green' },
    { value: 'medical', label: 'Medical', tone: 'blue' },
    { value: 'administrative', label: 'Administrative', tone: 'amber' },
    { value: 'billing', label: 'Billing', tone: 'purple' },
  ]

export const activityTypeLabels = Object.fromEntries(
  activityTypes.map((t) => [t.value, t.label]),
) as Record<ActivityType, string>

export const activityTypeTones = Object.fromEntries(
  activityTypes.map((t) => [t.value, t.tone]),
) as Record<ActivityType, Tone>

export { TODAY } from '@/lib/today'

/* -------------------------------- time parsing ----------------------------- */

/** "08:58 AM" → "08:58", "2:00 PM" → "14:00". */
function to24h(label: string): string | undefined {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim())
  if (!match) return undefined
  const [, h, m, meridiem] = match
  let hour = Number(h) % 12
  if (meridiem.toUpperCase() === 'PM') hour += 12
  return `${String(hour).padStart(2, '0')}:${m}`
}

/** "14:05" → "2:05 PM". */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const meridiem = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${meridiem}`
}

/** A clinical note is medical, a coordinator note is administrative — the
 *  earlier ternary filed all eleven non-incident notes under Visits. */
const noteTypeByCategory: Record<NoteCategory, ActivityType> = {
  visit: 'visits',
  clinical: 'medical',
  incident: 'medical',
  coordinator: 'administrative',
  family: 'administrative',
}

/* -------------------------------- aggregation ------------------------------ */

/**
 * The audit trail is not authored — it is assembled from the tabs it audits.
 * Anything shown here already exists somewhere else in the record, which is
 * also what stops it drifting away from them.
 */
export function buildActivity(recipientId: string): ActivityEntry[] {
  const entries: ActivityEntry[] = []
  const who = (name: string) => ({
    actor: name,
    actorRole: roleFor(recipientId, name),
  })

  /* --- visits: clock-in, clock-out and cancellations --- */
  const visits = getVisitHistory(recipientId)?.visits ?? []
  for (const v of visits) {
    if (v.status === 'cancelled') {
      entries.push({
        id: `${v.id}-cancelled`,
        source: 'Visits',
        date: v.date,
        time: to24h(v.time),
        title: 'Visit Cancelled',
        detail: `${v.type} visit cancelled. ${v.notes}`,
        ...who(v.caregiver),
        type: 'visits',
      })
      continue
    }
    if (v.clockIn) {
      entries.push({
        id: `${v.id}-in`,
        source: 'Visits',
        date: v.date,
        time: to24h(v.clockIn),
        title: 'Visit Started',
        detail: `${v.caregiver} clocked in for ${v.type}${
          v.status === 'late-arrival' ? ' (late arrival)' : ''
        }.`,
        ...who(v.caregiver),
        type: 'visits',
      })
    }
    if (v.clockOut) {
      entries.push({
        id: `${v.id}-out`,
        source: 'Visits',
        date: v.date,
        time: to24h(v.clockOut),
        title: 'Visit Completed',
        detail: `${v.caregiver} clocked out. Duration: ${v.durationHours}h.`,
        ...who(v.caregiver),
        type: 'visits',
      })
    }
  }

  /* --- care notes --- */
  for (const n of getCareNotes(recipientId)) {
    entries.push({
      id: `${n.id}-note`,
        source: 'Notes',
      date: n.at.slice(0, 10),
      time: n.at.slice(11, 16),
      title:
        n.category === 'incident' ? 'Incident Note Filed' : 'Care Note Added',
      // Includes the body so the search box can match note content.
      detail: `${noteCategoryLabels[n.category]}: ${n.body}${n.flagged ? ' (flagged for supervisor review)' : ''}`,
      ...who(n.author),
      type: noteTypeByCategory[n.category],
    })
  }

  /* --- medication doses already administered today --- */
  const plan = getMedicationPlan(recipientId)
  if (plan) {
    for (const dose of plan.doses) {
      // A missed dose is the most audit-relevant medication event of all.
      if (dose.state === 'scheduled') continue
      entries.push({
        id: `${dose.id}-dose`,
        source: 'Medications',
        date: plan.scheduleDateIso,
        time: to24h(dose.time),
        title:
          dose.state === 'missed'
            ? 'Medication Missed'
            : 'Medication Administered',
        detail: `${dose.medications} ${dose.state === 'missed' ? 'not given' : 'marked as given'}.`,
        ...who(dose.administeredBy),
        type: 'medical',
      })
    }
  }

  /* --- prescription changes --- */
  for (const a of plan?.audits ?? []) {
    entries.push({
      id: `${a.id}-audit`,
      source: 'Medications',
      date: a.dateIso,
      title: 'Prescription Updated',
      detail: `${a.title} — ${a.detail}.`,
      ...who('Mike Chen'),
      type: 'medical',
    })
  }

  /* --- health events --- */
  for (const e of getHealthRecord(recipientId)?.events ?? []) {
    entries.push({
      id: `${e.id}-health`,
        source: 'Health',
      date: e.date,
      title: e.title,
      detail: e.detail,
      ...who(e.recordedBy),
      type: 'medical',
    })
  }

  /* --- documents --- */
  for (const d of getDocuments(recipientId)) {
    entries.push({
      id: `${d.id}-doc`,
        source: 'Documents',
      date: d.uploadedAt,
      title: 'Document Uploaded',
      detail: `${d.name} added to ${d.category}.`,
      ...who(d.uploadedBy),
      type: 'administrative',
    })
  }

  /* --- billing --- */
  const billing = getBillingRecord(recipientId)
  if (billing) {
    const rate = billing.insurance.coverageRate
    for (const inv of billing.invoices) {
      entries.push({
        id: `${inv.id}-issued`,
        source: 'Billing',
        date: inv.issuedAt,
        title: 'Invoice Raised',
        detail: `${inv.number} for ${formatMoney(invoiceAmount(inv))} (${inv.visits} visits).`,
        ...who('Admin Support'),
        type: 'billing',
      })
      if (inv.paidAt) {
        entries.push({
          id: `${inv.id}-paid`,
        source: 'Billing',
          date: inv.paidAt,
          title: 'Payment Received',
          detail: `${formatMoney(patientDue(inv, rate))} settled against ${inv.number}.`,
          ...who(billing.contact.name),
          type: 'billing',
        })
      }
    }
  }

  /* --- care plan revisions --- */
  for (const r of getCarePlan(recipientId)?.revisions ?? []) {
    entries.push({
      id: `${r.id}-plan`,
      source: 'Care Plan',
      date: r.dateIso,
      title: 'Care Plan Updated',
      detail: r.summary,
      ...who(r.author),
      type: 'administrative',
    })
  }

  /* --- caregiver assignments --- */
  for (const h of getCaregiverRecord(recipientId)?.history ?? []) {
    entries.push({
      id: `${h.id}-assign`,
      source: 'Caregivers',
      date: h.dateIso,
      title: h.action === 'assigned' ? 'Caregiver Assigned' : 'Caregiver Removed',
      detail: `${h.caregiver} — ${h.reason}.`,
      ...who(h.by),
      type: 'administrative',
    })
  }

  /* --- family contact --- */
  const family = getFamilyRecord(recipientId)
  for (const c of family?.log ?? []) {
    entries.push({
      id: `${c.id}-contact`,
        source: 'Family',
      date: c.at,
      title: 'Family Contact Logged',
      detail: `${c.type} with ${memberName(family?.members ?? [], c.memberId)} — ${c.subject}.`,
      ...who(c.staff),
      type: 'administrative',
    })
  }

  return entries
}

/* --------------------------------- sorting -------------------------------- */

export type ActivityOrder = 'newest' | 'oldest'

export const orderOptions: { value: ActivityOrder; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
]

/** Date-only entries sort to the end of their day rather than the start. */
function sortKey(e: ActivityEntry): string {
  return `${e.date}T${e.time ?? '23:59'}`
}

export function sortActivity(
  entries: ActivityEntry[],
  order: ActivityOrder,
): ActivityEntry[] {
  return [...entries].sort((a, b) => {
    const newestFirst = sortKey(b).localeCompare(sortKey(a))
    const primary = order === 'newest' ? newestFirst : -newestFirst
    // Stable, readable order for entries sharing a timestamp.
    return primary || a.id.localeCompare(b.id)
  })
}

/** Distinct actors, for the user filter. */
export function actors(entries: ActivityEntry[]): string[] {
  return [...new Set(entries.map((e) => e.actor))].sort()
}

/* --------------------------------- grouping ------------------------------- */

const DAY_MS = 86_400_000

const dayFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "Today — July 24, 2026", "Yesterday — July 23, 2026", else the date. */
export function formatDayHeading(iso: string, today = TODAY): string {
  const absolute = dayFormat.format(new Date(`${iso}T00:00:00Z`))
  const diff =
    (new Date(`${today}T00:00:00Z`).getTime() -
      new Date(`${iso}T00:00:00Z`).getTime()) /
    DAY_MS
  if (diff === 0) return `Today — ${absolute}`
  if (diff === 1) return `Yesterday — ${absolute}`
  return absolute
}

export interface ActivityDay {
  date: string
  entries: ActivityEntry[]
}

/** Groups an already-sorted list, preserving its order. */
export function groupByDay(entries: ActivityEntry[]): ActivityDay[] {
  const days: ActivityDay[] = []
  for (const entry of entries) {
    const last = days[days.length - 1]
    if (last?.date === entry.date) last.entries.push(entry)
    else days.push({ date: entry.date, entries: [entry] })
  }
  return days
}

export function withinRange(
  entry: ActivityEntry,
  days: number | 'all',
  today = TODAY,
): boolean {
  if (days === 'all') return true
  const elapsed =
    (new Date(`${today}T00:00:00Z`).getTime() -
      new Date(`${entry.date}T00:00:00Z`).getTime()) /
    DAY_MS
  return elapsed <= days
}

export const rangeOptions: { value: string; label: string }[] = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
]
