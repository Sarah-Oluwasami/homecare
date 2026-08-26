/**
 * Monitoring history — what the board looked like on days that have finished.
 *
 * Three separate things, matching the three tabs: visits whose window has
 * closed, alerts that were outstanding at the end of a day, and incidents on
 * file. They are kept apart because they are counted differently and mean
 * different things; a single "history" number over all three would be the sort
 * of total nobody can check.
 *
 * Nothing here is a stored history. Every row is recomputed from the same
 * records the live screens read, which is why a visit can appear here as "not
 * written up" — the day passed and no record was filed, and this app has no
 * way to say a visit happened without one.
 */
import { TODAY } from '@/lib/today'
import { addDays, boardOn, formatTime } from '@/features/scheduling/board-data'
import type { BoardVisit } from '@/features/scheduling/board-data'
import { minutesOfDay, staffMembers } from '@/features/caregivers/roster-data'
import { alertsAt } from './live-data'
import type { LiveAlert } from './live-data'
import { incidentsFiled } from './incidents-data'
import type { IncidentRecord } from './incidents-data'

/**
 * Title Case because these read as chip values on the history screen; the page
 * lowercases the label where it drops one into a sentence.
 */
export const historyRanges = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
] as const

export type HistoryRange = (typeof historyRanges)[number]['value']

/**
 * How a finished visit turned out.
 *
 * Deliberately not just "Completed / Completed Late". Most visits on a past day
 * have no record at all, and calling those completed would assert attendance
 * the app cannot evidence — the same distinction the live board draws with its
 * "Not written up" badge.
 */
export type VisitOutcome =
  | 'written-up'
  | 'late'
  | 'unrecorded'
  | 'uncovered'
  | 'cancelled'

export const outcomeLabels: Record<VisitOutcome, string> = {
  'written-up': 'Written up',
  late: 'Late arrival',
  unrecorded: 'Not written up',
  uncovered: 'Went uncovered',
  cancelled: 'Cancelled',
}

export interface HistoryVisit {
  id: string
  date: string
  recipientId: string
  recipientName: string
  caregiverId: string | null
  caregiverName: string | null
  branch: string | null
  type: string
  outcome: VisitOutcome
  /** Minutes. */
  duration: number
  /**
   * True when the duration came off the clock-in and clock-out on the record.
   * False when it is the rota's, which is a plan rather than a measurement.
   */
  measured: boolean
  clockIn: string | null
  clockOut: string | null
}

function outcomeOf(visit: BoardVisit): VisitOutcome {
  if (visit.status === 'cancelled') return 'cancelled'
  if (visit.caregiverId === null) return 'uncovered'
  if (!visit.logged) return 'unrecorded'
  return visit.status === 'late-arrival' ? 'late' : 'written-up'
}

function branchOf(caregiverId: string | null): string | null {
  if (!caregiverId) return null
  return staffMembers.find((m) => m.id === caregiverId)?.branch ?? null
}

/** Days in the range, most recent first. Never includes today, which is live. */
function daysBack(range: HistoryRange, asAt: string): string[] {
  const days: string[] = []
  for (let i = 1; i <= Number(range); i++) days.push(addDays(asAt, -i))
  return days
}

export function historyVisits(
  range: HistoryRange = '30',
  asAt = TODAY,
): HistoryVisit[] {
  return daysBack(range, asAt).flatMap((date) =>
    // Newest first within the day as well as across days: the board sorts by
    // start time, which read backwards in a history. Copied before reversing —
    // boardOn hands back its cached array.
    [...boardOn(date)].reverse().map((visit) => {
      // The record's own clock where it has one. A rota duration is what was
      // planned; only a clock-in and a clock-out measure what happened.
      const measured = Boolean(visit.clockIn && visit.clockOut)
      const duration = measured
        ? minutesOfDay(formatTime(visit.clockOut!)) -
          minutesOfDay(formatTime(visit.clockIn!))
        : Math.round(visit.durationHours * 60)
      return {
        id: visit.id,
        date: visit.date,
        recipientId: visit.recipientId,
        recipientName: visit.recipientName,
        caregiverId: visit.caregiverId,
        caregiverName: visit.caregiverName,
        branch: branchOf(visit.caregiverId),
        type: visit.type,
        outcome: outcomeOf(visit),
        // A clock-out before the clock-in would be a wrapped overnight shift;
        // fall back rather than report a negative visit.
        duration: measured && duration > 0 ? duration : Math.round(visit.durationHours * 60),
        measured: measured && duration > 0,
        clockIn: visit.clockIn,
        clockOut: visit.clockOut,
      }
    }),
  )
}

export interface HistoryAlert extends LiveAlert {
  /** The day it was outstanding on. */
  date: string
}

/**
 * Alerts still outstanding at the end of each past day.
 *
 * Sampled once, at 23:45, rather than replayed minute by minute: the question
 * a history answers is "what was still wrong when the day finished", not "what
 * flickered during it". An alert that was raised and cleared inside the same
 * day does not appear, which is the honest reading of end-of-day.
 */
export function historyAlerts(
  range: HistoryRange = '30',
  asAt = TODAY,
): HistoryAlert[] {
  return daysBack(range, asAt).flatMap((date) =>
    alertsAt(date, '23:45').map((alert) => ({ ...alert, date })),
  )
}

export function historyIncidents(
  range: HistoryRange = '30',
  asAt = TODAY,
): IncidentRecord[] {
  // The register's own window, driven by the same control.
  return incidentsFiled(asAt, Number(range))
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`
}

/** "12 Oct 2026". */
const dayStamp = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatHistoryDate(iso: string): string {
  return dayStamp.format(new Date(`${iso}T00:00:00Z`))
}
