import { useSyncExternalStore } from 'react'
import { SIGNED_IN } from '@/lib/session'
import { NOW, TODAY } from '@/lib/today'
import { familyAccounts } from '@/features/families/directory-data'
import type { FamilyAccount, LogSource } from '@/features/families/directory-data'
import {
  getFamilyRecord,
  logContact,
  nextContactId,
  useContactLog,
} from '@/features/care-recipients/family-data'
import type {
  CommunicationEntry,
  CommunicationType,
} from '@/features/care-recipients/family-data'
import { staffMembers } from '@/features/caregivers/staff'
import type { StaffMember } from '@/features/caregivers/staff'
import { recipients } from '@/features/care-recipients/data'
import { formatTime } from '@/features/caregivers/schedule-data'
import { addDays, boardOn } from '@/features/scheduling/board-data'
import { minutesOfDay } from '@/features/caregivers/roster-data'
import type { BoardVisit } from '@/features/scheduling/board-data'
import { referenceFor } from '@/features/scheduling/visit-detail'
import { getMedicationPlan } from '@/features/care-recipients/medications-data'
import { getCarePlan } from '@/features/care-recipients/care-plan-data'
import type { Recipient } from '@/features/care-recipients/data'

export { NOW, TODAY }

/* ---------------------------------- types --------------------------------- */

export type ThreadKind = 'caregiver' | 'family'

/**
 * A written message in a conversation.
 *
 * `time` is null wherever the record behind the message holds only a day. The
 * family communication log stores a date and no clock, so a family message
 * cannot honestly be stamped "10:15 AM" — the thread prints the day alone and
 * says as much rather than inventing a minute.
 */
export interface Message {
  id: string
  /** ISO date. */
  at: string
  /** 24-hour clock, where the record holds one. */
  time: string | null
  direction: 'inbound' | 'outbound'
  author: string
  body: string
  channel: CommunicationType
  /**
   * True when the body is a log subject line rather than prose somebody typed.
   * The thread renders those in the log's own voice — they are a record *of* a
   * message, not the message itself.
   */
  fromLog: boolean
}

/**
 * A contact on the record that is not a message — a call, a video call, a
 * visit. Shown between the messages because the conversation is otherwise
 * missing the half of it that happened on the phone.
 */
export interface ContactMark {
  id: string
  at: string
  type: CommunicationType
  subject: string
  staff: string
}

export interface Thread {
  id: string
  kind: ThreadKind
  /** Who the agency is talking to. */
  name: string
  /** Their standing — a job title, or a relationship and the role they hold. */
  role: string
  /** Their own record in the app. */
  to: string
  phone: string
  /** The care recipient the conversation is about, where it is about one. */
  about: { id: string; name: string } | null
  /** Oldest first, the way a conversation reads. */
  messages: Message[]
  marks: ContactMark[]
}

/* -------------------------- caregiver conversations ------------------------ */

/**
 * Staff conversations are fixtures — nothing else in the app stores one. The
 * people, clients and visits they refer to are not: every one is a row on the
 * board for the day this fixture runs on, so a message about a three o'clock
 * medication call is about a slot that is genuinely open at three o'clock.
 *
 * They are coordination, not clinical notes. A message claiming a dose was
 * given would be a second, unreconciled record of something the medication tab
 * already holds — and the thread would be the one nobody checks.
 */
interface SeedMessage {
  /** ISO date. */
  at: string
  /** 24-hour. Never later than the app's clock: NOW is 12:00 on TODAY. */
  time: string
  direction: 'inbound' | 'outbound'
  body: string
}

interface CaregiverSeed {
  caregiverId: string
  recipientId: string
  messages: SeedMessage[]
}

const caregiverSeeds: CaregiverSeed[] = [
  {
    // CP-0913, today 09:00–11:30, clocked in 08:58 and closed at 11:30.
    caregiverId: 'cg-001',
    recipientId: 'cr-001',
    messages: [
      {
        at: TODAY,
        time: '08:55',
        direction: 'inbound',
        body: "Outside Margaret's now, a few minutes ahead of the nine o'clock. Her son is here too.",
      },
      {
        at: TODAY,
        time: '09:04',
        direction: 'outbound',
        body: 'Thanks Sarah. Take it at her pace this morning.',
      },
      {
        at: TODAY,
        time: '11:34',
        direction: 'inbound',
        body: 'Visit written up and closed. Nothing to flag.',
      },
    ],
  },
  {
    // CP-0914, today 09:00–11:00 — finished, and still with no visit record.
    caregiverId: 'cg-005',
    recipientId: 'cr-005',
    messages: [
      {
        at: TODAY,
        time: '11:12',
        direction: 'inbound',
        body: "Left Patricia's on time. I had no signal in the flat so the visit record hasn't gone in yet — I'll write it up this evening.",
      },
    ],
  },
  {
    // CP-0916, today 13:00–15:00, not started yet at the app's clock.
    caregiverId: 'cg-003',
    recipientId: 'cr-007',
    messages: [
      {
        at: TODAY,
        time: '11:48',
        direction: 'inbound',
        body: "Heavy traffic heading over for Dorothy's one o'clock assessment. I should still make it — I'll message if that changes.",
      },
    ],
  },
  {
    // CP-0917 is genuinely unassigned at 15:00; Maria is not on until 17:00.
    caregiverId: 'cg-004',
    recipientId: 'cr-003',
    messages: [
      {
        at: TODAY,
        time: '10:20',
        direction: 'inbound',
        body: "Has anyone been found for Eleanor's three o'clock medication call? I'm not on with her until five.",
      },
    ],
  },
  {
    // Every live-in visit on John's rota this week is unrecorded.
    caregiverId: 'cg-006',
    recipientId: 'cr-006',
    messages: [
      {
        at: '2026-07-23',
        time: '19:40',
        direction: 'outbound',
        body: "John — the live-in records for this week haven't come through. Can you file them when you get a chance?",
      },
      {
        at: TODAY,
        time: '07:35',
        direction: 'inbound',
        body: "Sorry, they got away from me. I'll catch up on them after today's handover.",
      },
    ],
  },
  {
    // CP-0911, written up last night. The question he passes on is the one
    // David Johnson then puts to the office himself this morning.
    caregiverId: 'cg-002',
    recipientId: 'cr-001',
    messages: [
      {
        at: '2026-07-23',
        time: '21:05',
        direction: 'inbound',
        body: "Evening visit at Margaret's is written up. Her son asked me who's covering evenings from next week.",
      },
      {
        at: '2026-07-23',
        time: '21:20',
        direction: 'outbound',
        body: "Thanks David. I'll come back to him on that directly.",
      },
    ],
  },
]

/* --------------------------------- sending -------------------------------- */

/*
 * Messages typed into the composer during this session.
 *
 * A message to a family contact is not kept here: it is appended to that
 * recipient's communication log through `logContact`, the same list the Family
 * tab reads and writes. One conversation cannot have two records of itself, and
 * the tab that already exists owns this one.
 *
 * Staff messages have nowhere else to go, so they live here. In memory only —
 * the composer says so.
 */
let sentRevision = 0
let sentCount = 0
const sentByThread = new Map<string, Message[]>()
const sentListeners = new Set<() => void>()

function subscribeSent(listener: () => void): () => void {
  sentListeners.add(listener)
  return () => sentListeners.delete(listener)
}

/** Re-renders the caller when anything is sent, on either store. */
export function useMessageRevision(): number {
  const contacts = useContactLog()
  const sent = useSyncExternalStore(
    subscribeSent,
    () => sentRevision,
    () => sentRevision,
  )
  return contacts + sent
}

/**
 * Send from the signed-in coordinator. Returns nothing: the caller re-reads the
 * threads rather than being handed one, so the list, the folder counts and the
 * thread all rebuild from the same pass.
 */
export function sendMessage(thread: Thread, body: string): void {
  const text = body.trim()
  if (text === '') return

  if (thread.kind === 'family') {
    const source = familySourceOf(thread.id)
    if (!source) return
    const entry: CommunicationEntry = {
      id: nextContactId(),
      at: TODAY,
      memberId: source.memberId,
      type: 'App Message',
      subject: text,
      staff: SIGNED_IN,
      direction: 'outbound',
    }
    logContact(source.recipientId, entry)
    return
  }

  sentCount += 1
  const list = sentByThread.get(thread.id) ?? []
  list.push({
    id: `sent-${sentCount}`,
    at: TODAY,
    // The app's clock, not the wall clock — every other screen measures from
    // NOW, and a message stamped with the real time of day would sit hours
    // after visits that have not happened yet.
    time: NOW,
    direction: 'outbound',
    author: SIGNED_IN,
    body: text,
    channel: 'App Message',
    fromLog: false,
  })
  sentByThread.set(thread.id, list)
  sentRevision += 1
  for (const listener of sentListeners) listener()
}

/* -------------------------------- building -------------------------------- */

/** Written channels. A phone call is a contact, not a message. */
const written = new Set<CommunicationType>(['App Message', 'Email'])

const CAREGIVER_PREFIX = 'cgt-'
const FAMILY_PREFIX = 'famt-'

function familyThreadId(accountId: string, recipientId: string): string {
  return `${FAMILY_PREFIX}${accountId}-${recipientId}`
}

/**
 * Which member record a family thread writes to.
 *
 * Rebuilt from the account rather than carried on the thread, so a thread held
 * in component state across a send cannot address the wrong log.
 */
function familySourceOf(threadId: string): LogSource | undefined {
  if (!threadId.startsWith(FAMILY_PREFIX)) return undefined
  for (const account of familyAccounts) {
    for (const source of account.sources) {
      if (familyThreadId(account.id, source.recipientId) === threadId) {
        return source
      }
    }
  }
  return undefined
}

/** Oldest first — a thread reads downwards. Ties break on the log's own rule,
 *  where a lower id number is the newer entry. */
function oldestFirst(a: CommunicationEntry, b: CommunicationEntry): number {
  return (
    a.at.localeCompare(b.at) || Number(b.id.slice(2)) - Number(a.id.slice(2))
  )
}

function recipientName(id: string): string {
  return recipients.find((r) => r.id === id)?.name ?? 'Unknown recipient'
}

/**
 * "Son · Primary contact" for the recipient this thread is about — not the
 * account-wide label, which describes whichever recipient they are primary for.
 */
function familyRole(account: FamilyAccount, recipientId: string): string {
  const link = account.links.find((l) => l.recipientId === recipientId)
  if (!link) return 'Family contact'
  const role = link.roles.find(
    (r) =>
      r !== 'Emergency Contact' &&
      r.toLowerCase() !== link.relationship.toLowerCase(),
  )
  return role ? `${link.relationship} · ${role}` : link.relationship
}

function familyThreads(): Thread[] {
  const list: Thread[] = []

  for (const account of familyAccounts) {
    for (const source of account.sources) {
      const record = getFamilyRecord(source.recipientId)
      if (!record) continue

      const entries = record.log
        .filter((e) => e.memberId === source.memberId)
        .sort(oldestFirst)

      const messages = entries
        .filter((e) => written.has(e.type))
        .map(
          (e): Message => ({
            id: `${source.recipientId}-${e.id}`,
            at: e.at,
            // The log stores a day, not a clock.
            time: null,
            direction: e.direction,
            author: e.direction === 'inbound' ? account.name : e.staff,
            body: e.subject,
            channel: e.type,
            fromLog: true,
          }),
        )

      // A contact record with no written exchange in it is not a conversation;
      // it belongs on the Family tab's log, where it already is.
      if (messages.length === 0) continue

      list.push({
        id: familyThreadId(account.id, source.recipientId),
        kind: 'family',
        name: account.name,
        role: familyRole(account, source.recipientId),
        to: `/families/${account.id}`,
        phone: account.phone,
        about: {
          id: source.recipientId,
          name: recipientName(source.recipientId),
        },
        messages,
        marks: entries
          .filter((e) => !written.has(e.type))
          .map((e) => ({
            id: `${source.recipientId}-${e.id}`,
            at: e.at,
            type: e.type,
            subject: e.subject,
            staff: e.staff,
          })),
      })
    }
  }

  return list
}

function caregiverThreads(): Thread[] {
  return caregiverSeeds.flatMap((seed): Thread[] => {
    const member: StaffMember | undefined = staffMembers.find(
      (m) => m.id === seed.caregiverId,
    )
    if (!member) return []

    const id = `${CAREGIVER_PREFIX}${seed.caregiverId}-${seed.recipientId}`
    const seeded = seed.messages.map(
      (m, i): Message => ({
        id: `${id}-${i}`,
        at: m.at,
        time: m.time,
        direction: m.direction,
        author: m.direction === 'inbound' ? member.name : SIGNED_IN,
        body: m.body,
        channel: 'App Message',
        fromLog: false,
      }),
    )

    return [
      {
        id,
        kind: 'caregiver',
        name: member.name,
        role: member.title,
        to: `/caregivers/${member.id}`,
        phone: member.phone,
        about: { id: seed.recipientId, name: recipientName(seed.recipientId) },
        messages: [...seeded, ...(sentByThread.get(id) ?? [])],
        marks: [],
      },
    ]
  })
}

/** Every conversation the agency is holding, in no particular order. */
export function allThreads(): Thread[] {
  return [...caregiverThreads(), ...familyThreads()]
}

export function findThread(id: string | undefined): Thread | undefined {
  if (!id) return undefined
  return allThreads().find((t) => t.id === id)
}

/* --------------------------------- derived -------------------------------- */

/**
 * Inbound messages at the end of the thread with nothing after them.
 *
 * This is the same walk the families directory calls an unanswered message, so
 * the two screens count one thing: "unread" would be a third state nothing in
 * this app records, since no screen has ever marked a message as seen.
 */
export function awaitingReply(thread: Thread): number {
  let count = 0
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    if (thread.messages[i].direction === 'outbound') break
    count += 1
  }
  return count
}

export function lastMessage(thread: Thread): Message | undefined {
  return thread.messages[thread.messages.length - 1]
}

/** Sort key: the day, then the clock where the record holds one. Messages with
 *  no time sort to the start of their day, behind anything stamped. */
function activityKey(thread: Thread): string {
  const last = lastMessage(thread)
  if (!last) return ''
  return `${last.at} ${last.time ?? '00:00'}`
}

export type ThreadSort = 'recent' | 'waiting' | 'name'

export const sortOptions: { value: ThreadSort; label: string }[] = [
  { value: 'recent', label: 'Most recent' },
  { value: 'waiting', label: 'Longest waiting' },
  { value: 'name', label: 'Name, A to Z' },
]

export function sortThreads(list: Thread[], order: ThreadSort): Thread[] {
  const sorted = [...list]
  if (order === 'name') return sorted.sort((a, b) => a.name.localeCompare(b.name))
  if (order === 'waiting')
    return sorted.sort((a, b) => {
      // Threads nobody owes a reply to have no wait to measure, so they fall to
      // the bottom rather than sorting among the ones that do.
      const waitA = awaitingReply(a) > 0
      const waitB = awaitingReply(b) > 0
      if (waitA !== waitB) return waitA ? -1 : 1
      return activityKey(a).localeCompare(activityKey(b))
    })
  return sorted.sort((a, b) => activityKey(b).localeCompare(activityKey(a)))
}

export function searchThreads(list: Thread[], query: string): Thread[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return list
  return list.filter(
    (t) =>
      t.name.toLowerCase().includes(needle) ||
      t.role.toLowerCase().includes(needle) ||
      (t.about?.name.toLowerCase().includes(needle) ?? false) ||
      t.messages.some((m) => m.body.toLowerCase().includes(needle)),
  )
}

/* -------------------------------- formatting ------------------------------- */

const dayLabel = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const fullDayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const DAY_MS = 86_400_000

function daysBetween(iso: string, today: string): number {
  return Math.round(
    (new Date(`${today}T00:00:00Z`).getTime() -
      new Date(`${iso}T00:00:00Z`).getTime()) /
      DAY_MS,
  )
}

/** "Today", "Yesterday", "Tomorrow", then the date. Used on day separators and
 *  on the next visit in the context strip, which is the one that looks ahead. */
export function formatThreadDay(iso: string, today = TODAY): string {
  const days = daysBetween(iso, today)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days === -1) return 'Tomorrow'
  return fullDayLabel.format(new Date(`${iso}T00:00:00Z`))
}

/**
 * What the inbox row shows on the right. A message with a clock gets one; a
 * message off the communication log gets its day, because that is all the
 * record holds.
 */
export function formatStamp(message: Message, today = TODAY): string {
  const days = daysBetween(message.at, today)
  const day = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : null
  const clock = message.time ? formatTime(message.time) : null

  if (day && clock) return clock
  if (day) return day
  const date = dayLabel.format(new Date(`${message.at}T00:00:00Z`))
  return clock ? `${date}, ${clock}` : date
}

export function formatClock(time: string): string {
  return formatTime(time)
}

/* --------------------------------- context -------------------------------- */

/**
 * What the coordinator needs beside the conversation.
 *
 * All of it is read from the records the rest of the app keeps — the board, the
 * medication plan, the care plan. The source design's panel listed two drugs
 * under a "Linked Record" heading with no way of knowing whether the plan still
 * held them; this reads the plan.
 */
export interface ThreadContext {
  recipient: Recipient
  /** The next visit on the board for this recipient, measured from the app's clock. */
  next: {
    id: string
    reference: string
    date: string
    start: string
    type: string
    caregiverName: string | null
  } | null
  /** Active prescriptions by name and strength. Empty when the plan has none. */
  medications: string[]
  /** Whether a medication plan exists at all — different from one with nothing on it. */
  hasMedicationPlan: boolean
  hasCarePlan: boolean
}

/** How far ahead the context panel looks for the next visit. */
const LOOKAHEAD_DAYS = 7

function nextVisitFor(
  recipientId: string,
  asAt = TODAY,
  now = NOW,
): BoardVisit | undefined {
  const nowMin = minutesOfDay(formatTime(now))
  for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
    const date = addDays(asAt, i)
    const match = boardOn(date).find(
      (v) =>
        v.recipientId === recipientId &&
        v.status !== 'cancelled' &&
        // Today only counts what has not started; a visit that began an hour
        // ago is the current one, not the next one.
        (i > 0 || minutesOfDay(formatTime(v.start)) >= nowMin),
    )
    if (match) return match
  }
  return undefined
}

export function threadContext(
  recipientId: string,
  asAt = TODAY,
  now = NOW,
): ThreadContext | undefined {
  const recipient = recipients.find((r) => r.id === recipientId)
  if (!recipient) return undefined

  const visit = nextVisitFor(recipientId, asAt, now)
  const plan = getMedicationPlan(recipientId)

  return {
    recipient,
    next: visit
      ? {
          id: visit.id,
          reference: referenceFor(visit),
          date: visit.date,
          start: visit.start,
          type: visit.type,
          caregiverName: visit.caregiverName,
        }
      : null,
    medications: (plan?.prescriptions ?? [])
      .filter((p) => p.status === 'active')
      .map((p) => `${p.name} ${p.strength}`),
    hasMedicationPlan: Boolean(plan),
    hasCarePlan: Boolean(getCarePlan(recipientId)),
  }
}
