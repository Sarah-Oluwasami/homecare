import { useSyncExternalStore } from 'react'
import { TODAY } from '@/lib/today'
import { recipients } from './data'
import type { Tone } from '@/types'

/* ---------------------------------- types --------------------------------- */

export type FamilyRole =
  | 'Primary Contact'
  | 'Emergency Contact'
  | 'Power of Attorney'
  | 'Billing Contact'
  | 'Secondary Contact'
  | 'Visit Companion'
  | 'Medical Decision Backup'

export type AccessLevel = 'full' | 'view' | 'limited'

export type ContactChannel =
  | 'Phone'
  | 'App message'
  | 'SMS text'
  | 'Email'
  | 'Video call'

export interface FamilyMember {
  id: string
  name: string
  relationship: string
  phone: string
  email: string
  /** Shown when the contact lives away from the care address. */
  location?: string
  roles: FamilyRole[]
  access: AccessLevel
  preferred: ContactChannel
  portalEnabled: boolean
}

export type CommunicationType =
  | 'App Message'
  | 'Phone Call'
  | 'In-Person'
  | 'Email'
  | 'Video Call'

/**
 * How an attempt to reach somebody went.
 *
 * Set only on attempts a coordinator recorded here. The fixture entries leave
 * it undefined, because nothing in the original log said whether the person
 * picked up, and inventing "Reached" for all of them would have turned a gap in
 * the record into a claim about it.
 */
export type ContactOutcome = 'reached' | 'no-answer' | 'left-message'

export const contactOutcomeLabels: Record<ContactOutcome, string> = {
  reached: 'Reached',
  'no-answer': 'No answer',
  'left-message': 'Left a message',
}

export interface CommunicationEntry {
  id: string
  /** ISO date. */
  at: string
  memberId: string
  type: CommunicationType
  subject: string
  staff: string
  /** Only on attempts recorded from the contact panel. */
  outcome?: ContactOutcome
  /**
   * Who started it. Without this an "unread" count is guesswork — the family
   * directory derives outstanding replies from inbound messages that no later
   * outbound message answers.
   */
  direction: 'inbound' | 'outbound'
}

export interface FamilyRecord {
  members: FamilyMember[]
  log: CommunicationEntry[]
}

export { TODAY } from '@/lib/today'

/** The communication log panel shows this window. */
export const LOG_WINDOW_DAYS = 30

export const accessLabels: Record<AccessLevel, string> = {
  full: 'Full Access',
  view: 'View Only',
  limited: 'Limited Access',
}

export const accessTones: Record<AccessLevel, Tone> = {
  full: 'green',
  view: 'blue',
  limited: 'amber',
}

/** What each level actually opens up, shown in the permissions matrix. */
export const accessSections: Record<AccessLevel, string> = {
  full: 'All medical records, billing invoices, care plan, direct coordinator messaging',
  view: 'Daily visit logs, vitals trends, caregiver notes',
  limited: 'Schedule, shift calendar and visit companion bookings only',
}

export const communicationTones: Record<CommunicationType, Tone> = {
  'App Message': 'blue',
  'Phone Call': 'amber',
  'In-Person': 'green',
  Email: 'purple',
  'Video Call': 'blue',
}

/* ---------------------------------- data ---------------------------------- */

const records: Record<string, FamilyRecord> = {
  'cr-001': {
    members: [
      {
        id: 'fm1',
        name: 'David Johnson',
        relationship: 'Son',
        // Matches the emergency contact in profile-data and the guarantor in
        // billing-data — the same person had two different numbers.
        phone: '(555) 123-4567',
        email: 'david.johnson@example.com',
        location: '142 Oak Street, Springfield',
        roles: [
          'Primary Contact',
          'Emergency Contact',
          'Power of Attorney',
          'Billing Contact',
        ],
        access: 'full',
        preferred: 'Phone',
        portalEnabled: true,
      },
      {
        id: 'fm2',
        name: 'Sarah Johnson',
        relationship: 'Daughter-in-law',
        phone: '(555) 123-4568',
        email: 'sarah.johnson@example.com',
        roles: ['Secondary Contact'],
        access: 'view',
        preferred: 'App message',
        portalEnabled: true,
      },
      {
        id: 'fm3',
        name: 'Emily Johnson',
        relationship: 'Granddaughter',
        phone: '(555) 987-6543',
        email: 'emily.johnson@example.com',
        roles: ['Visit Companion'],
        access: 'limited',
        preferred: 'SMS text',
        portalEnabled: false,
      },
      {
        id: 'fm4',
        name: 'Robert Johnson',
        relationship: 'Son',
        phone: '(555) 456-7890',
        email: 'robert.johnson@example.com',
        location: 'Chicago, IL (out of state)',
        roles: ['Medical Decision Backup'],
        access: 'view',
        preferred: 'Video call',
        portalEnabled: true,
      },
    ],
    /*
     * Reverse-chronological, nothing after 2026-07-24. Staff names and dates
     * are reconciled with the shift grid and the other tabs — Mike Chen works
     * Mon–Fri 9–6, and the invoice entry matches INV-2026-089's issue date.
     */
    log: [
      {
        id: 'cl0',
        at: '2026-07-24',
        memberId: 'fm1',
        type: 'App Message',
        subject: 'Question about the new evening carer',
        staff: 'Mike Chen',
        direction: 'inbound',
      },
      {
        id: 'cl1',
        at: '2026-07-24',
        memberId: 'fm1',
        type: 'App Message',
        subject: 'Request to move Thursday visit',
        staff: 'Mike Chen',
        direction: 'inbound',
      },
      {
        id: 'cl2',
        at: '2026-07-23',
        memberId: 'fm1',
        type: 'Phone Call',
        // Follows the family note logged at 9 PM the previous evening.
        subject: 'Follow-up on evening care concern',
        staff: 'Mike Chen',
        direction: 'outbound',
      },
      {
        id: 'cl3',
        at: '2026-07-23',
        memberId: 'fm1',
        type: 'Phone Call',
        subject: 'Next week schedule adjustment request',
        staff: 'Mike Chen',
        direction: 'inbound',
      },
      {
        id: 'cl4',
        at: '2026-07-20',
        memberId: 'fm2',
        type: 'Phone Call',
        subject: 'Medication schedule question',
        staff: 'Mike Chen',
        direction: 'outbound',
      },
      {
        id: 'cl5',
        at: '2026-07-19',
        memberId: 'fm3',
        type: 'In-Person',
        subject: 'Weekend visit check-in',
        staff: 'Emma Wilson',
        direction: 'outbound',
      },
      {
        id: 'cl6',
        at: '2026-07-16',
        memberId: 'fm1',
        type: 'Email',
        subject: 'Invoice INV-2026-089 sent',
        staff: 'Admin Support',
        direction: 'outbound',
      },
      {
        id: 'cl7',
        at: '2026-07-10',
        memberId: 'fm4',
        type: 'Video Call',
        subject: 'Care plan review for out-of-state family',
        staff: 'Mike Chen',
        direction: 'outbound',
      },
      {
        id: 'cl8',
        at: '2026-06-30',
        memberId: 'fm1',
        type: 'Phone Call',
        subject: 'Monthly care summary',
        staff: 'Mike Chen',
        direction: 'outbound',
      },
      /*
       * Older than the display window on purpose — without it the 30-day
       * filter would be real but unobservable.
       */
      {
        id: 'cl9',
        at: '2026-06-10',
        memberId: 'fm2',
        type: 'App Message',
        subject: 'Question about weekend visit cover',
        staff: 'Mike Chen',
        direction: 'inbound',
      },
    ],
  },
  /*
   * Every recipient carries a real record now, not just cr-001. The families
   * directory inverts these into one row per person, so a placeholder here
   * would have become a placeholder account there.
   *
   * Adaeze Nwankwo appears under two recipients on purpose: she is the same
   * human acting for two unrelated clients, which is the case a per-recipient
   * list cannot express and the directory exists to show.
   */
  'cr-002': {
    members: [
      {
        id: 'fm1',
        name: 'Daniel Chen',
        relationship: 'Son',
        phone: '(555) 234-5678',
        email: 'daniel.chen@example.com',
        roles: ['Primary Contact', 'Emergency Contact', 'Billing Contact'],
        access: 'full',
        preferred: 'Phone',
        portalEnabled: true,
      },
      {
        id: 'fm2',
        name: 'Mei Chen',
        relationship: 'Daughter',
        phone: '(555) 234-5679',
        email: 'mei.chen@example.com',
        location: 'Abuja',
        roles: ['Secondary Contact'],
        access: 'view',
        preferred: 'App message',
        portalEnabled: true,
      },
    ],
    log: [
      {
        id: 'cl1',
        at: '2026-07-24',
        memberId: 'fm1',
        type: 'App Message',
        subject: 'Chasing the annual renewal transfer',
        staff: 'Dr. Jane Foster',
        direction: 'inbound',
      },
      {
        id: 'cl2',
        at: '2026-07-19',
        memberId: 'fm1',
        type: 'Email',
        subject: 'Annual renewal payment instructions',
        staff: 'Admin Support',
        direction: 'outbound',
      },
      {
        id: 'cl3',
        at: '2026-07-12',
        memberId: 'fm2',
        type: 'Video Call',
        subject: 'Care plan review',
        staff: 'Dr. Jane Foster',
        direction: 'outbound',
      },
    ],
  },
  'cr-003': {
    members: [
      {
        id: 'fm1',
        name: 'Jennifer Davis',
        relationship: 'Daughter',
        phone: '(555) 345-6789',
        email: 'jennifer.davis@example.com',
        roles: ['Primary Contact', 'Billing Contact', 'Emergency Contact'],
        access: 'full',
        preferred: 'Email',
        portalEnabled: true,
      },
    ],
    log: [
      {
        id: 'cl1',
        at: '2026-07-21',
        memberId: 'fm1',
        type: 'Phone Call',
        subject: 'Failed card payment, retry arranged',
        staff: 'Admin Support',
        direction: 'outbound',
      },
      {
        id: 'cl2',
        at: '2026-07-08',
        memberId: 'fm1',
        type: 'App Message',
        subject: 'Monthly care summary',
        staff: 'Amara Nwosu',
        direction: 'outbound',
      },
    ],
  },
  'cr-004': {
    members: [
      {
        id: 'fm1',
        name: 'Amanda Wilson',
        relationship: 'Spouse',
        // Not (555) 456-7890 — that is Robert Johnson's, and the families
        // directory identifies a person by phone, so the two merged.
        phone: '(555) 461-2208',
        email: 'amanda.wilson@example.com',
        roles: ['Primary Contact', 'Emergency Contact'],
        access: 'full',
        preferred: 'Phone',
        portalEnabled: false,
      },
      {
        id: 'fm2',
        name: 'Adaeze Nwankwo',
        relationship: 'Power of attorney',
        phone: '(555) 902-4417',
        email: 'a.nwankwo@nwankwolegal.example.com',
        location: 'Nwankwo Legal, Lagos',
        roles: ['Power of Attorney'],
        access: 'view',
        preferred: 'Email',
        portalEnabled: true,
      },
    ],
    log: [],
  },
  'cr-005': {
    members: [
      {
        id: 'fm1',
        name: 'Thomas Brown',
        relationship: 'Son',
        phone: '(555) 567-8901',
        email: 'thomas.brown@example.com',
        roles: ['Primary Contact', 'Billing Contact'],
        access: 'full',
        preferred: 'SMS text',
        portalEnabled: true,
      },
      {
        id: 'fm2',
        name: 'Grace Brown',
        relationship: 'Granddaughter',
        phone: '(555) 567-8902',
        email: 'grace.brown@example.com',
        roles: ['Visit Companion'],
        access: 'limited',
        preferred: 'App message',
        portalEnabled: false,
      },
    ],
    log: [
      {
        id: 'cl1',
        at: '2026-07-23',
        memberId: 'fm1',
        type: 'App Message',
        subject: 'Hours balance running low',
        staff: 'Dr. Jane Foster',
        direction: 'outbound',
      },
      {
        id: 'cl2',
        at: '2026-07-14',
        memberId: 'fm1',
        type: 'Phone Call',
        subject: 'Top-up options for the hours package',
        staff: 'Dr. Jane Foster',
        direction: 'outbound',
      },
    ],
  },
  'cr-006': {
    members: [
      {
        id: 'fm1',
        name: 'Lisa Taylor',
        relationship: 'Daughter',
        phone: '(555) 678-9012',
        email: 'lisa.taylor@example.com',
        roles: ['Primary Contact', 'Emergency Contact', 'Billing Contact'],
        access: 'full',
        preferred: 'App message',
        portalEnabled: true,
      },
    ],
    /* Four inbound messages with no reply after them — the directory's unread
       count is exactly this, not a stored number. */
    log: [
      {
        id: 'cl1',
        at: '2026-07-24',
        memberId: 'fm1',
        type: 'App Message',
        subject: 'Third message about the declined payment',
        staff: 'Amara Nwosu',
        direction: 'inbound',
      },
      {
        id: 'cl2',
        at: '2026-07-22',
        memberId: 'fm1',
        type: 'App Message',
        subject: 'Has the new bank card gone through?',
        staff: 'Amara Nwosu',
        direction: 'inbound',
      },
      {
        id: 'cl3',
        at: '2026-07-20',
        memberId: 'fm1',
        type: 'Email',
        subject: 'Sending replacement card details',
        staff: 'Amara Nwosu',
        direction: 'inbound',
      },
      {
        id: 'cl4',
        at: '2026-07-18',
        memberId: 'fm1',
        type: 'App Message',
        subject: 'Card was declined, what happens now?',
        staff: 'Amara Nwosu',
        direction: 'inbound',
      },
      {
        id: 'cl5',
        at: '2026-07-17',
        memberId: 'fm1',
        type: 'Email',
        subject: 'Live-in Plan renewal payment failed',
        staff: 'Admin Support',
        direction: 'outbound',
      },
    ],
  },
  'cr-007': {
    members: [
      {
        id: 'fm1',
        name: 'Robert Martinez',
        relationship: 'Son',
        phone: '(555) 789-0123',
        email: 'robert.martinez@example.com',
        roles: ['Primary Contact', 'Power of Attorney', 'Billing Contact'],
        access: 'full',
        preferred: 'Phone',
        portalEnabled: true,
      },
    ],
    log: [
      {
        id: 'cl1',
        at: '2026-07-24',
        memberId: 'fm1',
        type: 'Email',
        subject: 'Standard Plan renewal receipt',
        staff: 'Admin Support',
        direction: 'outbound',
      },
      {
        id: 'cl2',
        at: '2026-07-15',
        memberId: 'fm1',
        type: 'In-Person',
        subject: 'Quarterly care review',
        staff: 'Mike Chen',
        direction: 'outbound',
      },
    ],
  },
  'cr-008': {
    members: [
      {
        id: 'fm1',
        name: 'Grace Lee',
        relationship: 'Daughter',
        phone: '(555) 812-3344',
        email: 'grace.lee@example.com',
        roles: ['Primary Contact', 'Emergency Contact'],
        access: 'limited',
        preferred: 'Phone',
        portalEnabled: false,
      },
      {
        id: 'fm2',
        name: 'Adaeze Nwankwo',
        relationship: 'Power of attorney',
        phone: '(555) 902-4417',
        email: 'a.nwankwo@nwankwolegal.example.com',
        location: 'Nwankwo Legal, Lagos',
        roles: ['Power of Attorney'],
        access: 'view',
        preferred: 'Email',
        portalEnabled: true,
      },
    ],
    log: [
      {
        id: 'cl1',
        at: '2026-07-11',
        memberId: 'fm1',
        type: 'Phone Call',
        subject: 'Onboarding call, start date to confirm',
        staff: 'Dr. Jane Foster',
        direction: 'outbound',
      },
    ],
  },
}

/**
 * Overview synthesises a family contact for every recipient, so this must too —
 * otherwise seven of eight profiles name a next of kin on one tab and claim
 * none on the next.
 */
function synthesise(recipientId: string): FamilyRecord | undefined {
  const base = recipients.find((r) => r.id === recipientId)
  if (!base) return undefined
  const surname = base.name.split(' ').slice(-1)[0] ?? 'Family'

  return {
    members: [
      {
        id: 'fm1',
        name: `${surname} family contact`,
        relationship: 'Next of kin',
        phone: '(555) 000-0001',
        email: 'Not recorded',
        roles: ['Primary Contact', 'Emergency Contact'],
        access: 'limited',
        preferred: 'Phone',
        portalEnabled: false,
      },
    ],
    log: [],
  }
}

export function getFamilyRecord(recipientId: string): FamilyRecord | undefined {
  return records[recipientId] ?? synthesise(recipientId)
}

/* --------------------------------- logging -------------------------------- */

/*
 * Attempts recorded during this session.
 *
 * They go into the same log the fixtures live in, so the contact panel, the
 * communication log and every "last contact" on the Family tab are reading one
 * list rather than two that can disagree. In memory only — there is no backend,
 * and the panel that writes says so.
 */
let recorded = 0
let logVersion = 0
const logListeners = new Set<() => void>()

/**
 * Ids continue the fixtures' scheme, where a *lower* number means newer and
 * breaks a same-day tie. A recorded attempt is newer than anything already
 * there, so it counts downwards from zero: cl0, cl-1, cl-2.
 */
export function nextContactId(): string {
  const id = `cl${recorded === 0 ? 0 : -recorded}`
  recorded += 1
  return id
}

export function logContact(recipientId: string, entry: CommunicationEntry): void {
  const record = getFamilyRecord(recipientId)
  if (!record) return
  record.log.unshift(entry)
  logVersion += 1
  for (const listener of logListeners) listener()
}

function subscribeLog(listener: () => void): () => void {
  logListeners.add(listener)
  return () => logListeners.delete(listener)
}

/**
 * How many times the log has been written to this session.
 *
 * Exported so a module that *derives* from the log can cache its derivation
 * and invalidate it on a write, rather than either recomputing on every read
 * or — as the families directory did — snapshotting the log at import and
 * quietly disagreeing with the tab that writes to it.
 */
export function logRevision(): number {
  return logVersion
}

/** Re-renders the caller when an attempt is recorded. */
export function useContactLog(): number {
  return useSyncExternalStore(
    subscribeLog,
    () => logVersion,
    () => logVersion,
  )
}

/* -------------------------------- formatting ------------------------------- */

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Absolute and year-bearing — a relative "Today" among absolute dates in the
 *  same column reads as two different formats. */
export function formatContactDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`))
}

/* --------------------------------- derived -------------------------------- */

const DAY_MS = 86_400_000

/**
 * Everything below is computed from the member list and the log. The original
 * design named a "last contact" per card that the log had no entry for, and
 * stated a member total beside four cards.
 */

/** The member holding a given role, if any. */
export function memberWithRole(
  members: FamilyMember[],
  role: FamilyRole,
): FamilyMember | undefined {
  return members.find((m) => m.roles.includes(role))
}

/**
 * Newest first. Ids run cl1..cl10 with higher meaning older, so ascending id
 * breaks a same-day tie — compared numerically, since 'cl10' < 'cl9' as a
 * string.
 */
export function newestFirst(
  a: CommunicationEntry,
  b: CommunicationEntry,
): number {
  return (
    b.at.localeCompare(a.at) || Number(a.id.slice(2)) - Number(b.id.slice(2))
  )
}

/** Most recent log entry for a member. */
export function lastContact(
  log: CommunicationEntry[],
  memberId: string,
): CommunicationEntry | undefined {
  return log.filter((e) => e.memberId === memberId).sort(newestFirst)[0]
}

/** Log entries inside the displayed window, newest first. */
export function recentLog(
  log: CommunicationEntry[],
  today = TODAY,
  days = LOG_WINDOW_DAYS,
): CommunicationEntry[] {
  const cutoff = new Date(`${today}T00:00:00Z`).getTime() - days * DAY_MS
  return [...log]
    .filter((e) => new Date(`${e.at}T00:00:00Z`).getTime() >= cutoff)
    .sort(newestFirst)
}

export function memberName(
  members: FamilyMember[],
  memberId: string,
): string {
  return members.find((m) => m.id === memberId)?.name ?? 'Unknown'
}
