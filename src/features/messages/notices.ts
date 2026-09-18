import { SIGNED_IN } from '@/lib/session'
import { TODAY } from '@/lib/today'
import { addDays, boardOn, formatTime } from '@/features/scheduling/board-data'
import { referenceFor } from '@/features/scheduling/visit-detail'

/**
 * The half of the inbox nobody sent.
 *
 * The source design mixed these in with the conversations — "Visit
 * VIS-2026-0872: check-in confirmed" sitting between two people talking, with a
 * reply box under it. Nothing is on the other end of that reply, so they are
 * kept apart: a notice can be read and opened, and that is all it can be.
 */
export type NoticeKind = 'visit' | 'announcement'

export interface Notice {
  id: string
  kind: NoticeKind
  title: string
  body: string
  /** ISO date. */
  at: string
  /** 24-hour, where the record behind it holds one. */
  time: string | null
  /** Who wrote it. Null on a notice the app assembled from a record. */
  author: string | null
  /** The record it is about. */
  to: string | null
  /** The visit's own reference, so it can be quoted. */
  reference: string | null
}

/** How far back the visit feed reads. */
export const NOTICE_WINDOW_DAYS = 7

/**
 * One notice per visit record filed in the window.
 *
 * Only records that exist: a visit is here because somebody clocked in on it,
 * not because it was due. Nothing that needs a decision is in this feed —
 * late arrivals, missed doses and uncovered slots are alerts, they already have
 * a screen, and a second copy here would be a second queue to work.
 */
export function visitNotices(asAt = TODAY, days = NOTICE_WINDOW_DAYS): Notice[] {
  const notices: Notice[] = []

  for (let i = 0; i < days; i++) {
    const date = addDays(asAt, -i)
    // Latest first within the day: the board runs in start-time order, which
    // reads backwards in a feed.
    for (const visit of [...boardOn(date)].reverse()) {
      if (!visit.clockIn) continue
      const closed = visit.clockOut
        ? ` and closed at ${formatTime(visit.clockOut)}`
        : ', with no clock-out on the record'
      const written = visit.logged
        ? 'The visit is written up.'
        : 'No write-up has been filed yet.'

      notices.push({
        id: `visit-${visit.id}`,
        kind: 'visit',
        title: `${visit.recipientName} · ${visit.type}`,
        body: `${visit.caregiverName} checked in at ${formatTime(visit.clockIn)}${closed}. ${written}`,
        at: visit.date,
        time: visit.clockIn,
        author: null,
        to: `/scheduling/visits/${visit.id}`,
        reference: referenceFor(visit),
      })
    }
  }

  return notices
}

/**
 * Broadcasts. Written by a person, sent to everyone, and answered nowhere —
 * there is no group conversation in this app for a reply to land in.
 */
const announcements: Notice[] = [
  {
    id: 'ann-3',
    kind: 'announcement',
    title: 'Coordination meeting tomorrow, 9:00 AM',
    body: 'North Branch meeting room. Bring anything still open on your caseload — we will go through the week together rather than one by one.',
    at: TODAY,
    time: '08:05',
    author: SIGNED_IN,
    to: null,
    reference: null,
  },
  {
    id: 'ann-2',
    kind: 'announcement',
    title: 'Write visit records up on the day',
    body: 'A lot of last week closed with no record against it. If signal is the problem in the flat, file it from the office on the way home rather than leaving it to the weekend.',
    at: '2026-07-22',
    time: '17:30',
    author: 'Mike Chen',
    to: '/live-monitoring/history',
    reference: null,
  },
  {
    id: 'ann-1',
    kind: 'announcement',
    title: 'Credential renewals this month',
    body: 'HR is collecting renewal paperwork. Check the expiry dates on your own profile before the end of the month — a lapsed licence takes you off the rota the day it runs out.',
    at: '2026-07-20',
    time: '09:15',
    author: 'Dr. Jane Foster',
    to: '/caregivers',
    reference: null,
  },
]

export function announcementNotices(): Notice[] {
  return announcements
}

export function allNotices(asAt = TODAY): Notice[] {
  return [...visitNotices(asAt), ...announcementNotices()]
}

export function findNotice(id: string | undefined): Notice | undefined {
  if (!id) return undefined
  return allNotices().find((n) => n.id === id)
}

/** Newest first, with the clock breaking a same-day tie. */
export function sortNotices(list: Notice[]): Notice[] {
  return [...list].sort((a, b) =>
    `${b.at} ${b.time ?? '00:00'}`.localeCompare(`${a.at} ${a.time ?? '00:00'}`),
  )
}

export function searchNotices(list: Notice[], query: string): Notice[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return list
  return list.filter(
    (n) =>
      n.title.toLowerCase().includes(needle) ||
      n.body.toLowerCase().includes(needle) ||
      (n.reference?.toLowerCase().includes(needle) ?? false),
  )
}

/* -------------------------------- formatting ------------------------------- */

const dayLabel = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const DAY_MS = 86_400_000

/** Clock inside today, the day beyond it — the same rule the threads use. */
export function formatNoticeStamp(notice: Notice, today = TODAY): string {
  const days = Math.round(
    (new Date(`${today}T00:00:00Z`).getTime() -
      new Date(`${notice.at}T00:00:00Z`).getTime()) /
      DAY_MS,
  )
  if (days === 0) return notice.time ? formatTime(notice.time) : 'Today'
  if (days === 1) return 'Yesterday'
  return dayLabel.format(new Date(`${notice.at}T00:00:00Z`))
}

const fullDayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatNoticeDate(notice: Notice): string {
  const day = fullDayLabel.format(new Date(`${notice.at}T00:00:00Z`))
  return notice.time ? `${day}, ${formatTime(notice.time)}` : day
}
