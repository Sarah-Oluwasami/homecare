/**
 * The incident register.
 *
 * Distinct from everything else on the alerts page, and deliberately so. An
 * alert is a fact about the board *at a minute* — derived, unstored, gone when
 * the fact stops being true. An incident is a document: somebody sat down and
 * wrote up something that happened, and it stays on file whatever the clock
 * does. That is why this tab has its own columns (a reference, a reporter, a
 * date) and its own window: alerts are today, incidents are the last month.
 *
 * The source is the client's own care notes, filtered to the `incident`
 * category. There is no separate incidents table in this app and inventing one
 * would mean inventing the incidents in it.
 */
import { TODAY } from '@/lib/today'
import {
  getCareNotes,
  noteCategoryLabels,
} from '@/features/care-recipients/notes-data'
import type {
  CareNoteEntry,
  IncidentOutcome,
  IncidentSeverity,
  IncidentType,
} from '@/features/care-recipients/notes-data'
// Re-exported so a screen showing the register does not have to reach into the
// care-notes module for the vocabulary the register is written in.
export {
  incidentTypeLabels,
  incidentOutcomeLabels,
} from '@/features/care-recipients/notes-data'
export type {
  IncidentOutcome,
  IncidentSeverity,
  IncidentType,
} from '@/features/care-recipients/notes-data'
import { recipients } from '@/features/care-recipients/data'
import { getFamilyRecord } from '@/features/care-recipients/family-data'
import { boardOn } from '@/features/scheduling/board-data'
import type { BoardVisit } from '@/features/scheduling/board-data'

/** How far back the register looks. Matches the family log's own window. */
export const INCIDENT_WINDOW_DAYS = 30

export interface IncidentRecord {
  /** The note's own id, so a row is stable across renders. */
  id: string
  /**
   * A reference, derived rather than stored.
   *
   * The year plus the incident's position among that year's incidents, oldest
   * first — so it is stable, and so it does not pretend to be a stored ticket
   * number the app has never issued.
   */
  reference: string
  /** ISO datetime, UTC. */
  at: string
  recipientId: string
  recipientName: string
  /** Who wrote it up. */
  reporter: string
  reporterRole: string
  body: string
  /** What it was about, as stated on the write-up. */
  type: IncidentType
  severity: IncidentSeverity
  /** Where it ended up. Recorded by a person, never worked out from the date. */
  outcome: IncidentOutcome
  /** Raised for supervisor attention. Separate from the outcome: a resolved
   *  incident can still be flagged for somebody to look over. */
  flagged: boolean
  /**
   * Who certified that precautions were followed and the family told, where
   * anybody did. Undefined on most write-ups — an absent certification is not
   * a failed one, it is simply a claim nobody made.
   */
  certifiedBy?: string
  /** Replies on the note — the nearest thing to "has anybody picked this up". */
  replies: number
  attachments: number
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  )
}

type IncidentNote = Extract<CareNoteEntry, { category: 'incident' }>

/** Every incident note on file for every client, oldest first. */
function allIncidents(): { note: IncidentNote; recipientId: string; recipientName: string }[] {
  return recipients
    .flatMap((r) =>
      getCareNotes(r.id)
        // A type predicate, not a bare comparison: the detail below only exists
        // on the incident arm of the note union.
        .filter((n): n is IncidentNote => n.category === 'incident')
        .map((note) => ({ note, recipientId: r.id, recipientName: r.name })),
    )
    .sort((a, b) => a.note.at.localeCompare(b.note.at))
}

/**
 * Incidents filed within the window ending at `asAt`, newest first.
 *
 * The reference is numbered across the whole year rather than the window, so
 * narrowing the window does not renumber the rows that stay.
 */
export function incidentsFiled(
  asAt = TODAY,
  windowDays = INCIDENT_WINDOW_DAYS,
): IncidentRecord[] {
  const perYear = new Map<string, number>()

  return allIncidents()
    .map(({ note, recipientId, recipientName }) => {
      const year = note.at.slice(0, 4)
      const seq = (perYear.get(year) ?? 0) + 1
      perYear.set(year, seq)
      return {
        id: note.id,
        reference: `INC-${year}-${String(seq).padStart(4, '0')}`,
        at: note.at,
        recipientId,
        recipientName,
        reporter: note.author,
        reporterRole: note.authorRole,
        body: note.body,
        type: note.incident.type,
        severity: note.incident.severity,
        outcome: note.incident.outcome,
        certifiedBy: note.incident.certifiedBy,
        flagged: Boolean(note.flagged),
        replies: note.comments,
        attachments: note.attachments,
      }
    })
    .filter((record) => {
      const age = daysBetween(record.at.slice(0, 10), asAt)
      // Nothing dated after the day being looked at, and nothing older than
      // the window.
      return age >= 0 && age <= windowDays
    })
    .reverse()
}

/** "2 days ago", "Today" — the register spans weeks, so a clock time will not do. */
export function formatIncidentAge(at: string, asAt = TODAY): string {
  const days = daysBetween(at.slice(0, 10), asAt)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
}

/** One incident by its derived reference, or undefined if the id is junk. */
export function incidentByReference(
  reference: string | undefined,
  asAt = TODAY,
): IncidentRecord | undefined {
  if (!reference) return undefined
  // Looked up across the whole year rather than the visible window, so an old
  // link opens the record instead of 404ing once it ages out of the register.
  return incidentsFiled(asAt, 3650).find((i) => i.reference === reference)
}

/**
 * The visit the incident was written up during.
 *
 * Nothing links a note to a visit in this app, so this is the visit on that
 * client's board whose window contains the note — the same rule the visit
 * screen's own notes panel uses. Undefined where nothing contains it, rather
 * than the nearest visit, because "nearest" would be a guess dressed as a
 * reference.
 */
export function visitForIncident(record: IncidentRecord): BoardVisit | undefined {
  const at = Date.parse(record.at)
  return boardOn(record.at.slice(0, 10)).find((visit) => {
    if (visit.recipientId !== record.recipientId) return false
    const start = Date.parse(`${visit.date}T${visit.start}:00Z`)
    if (Number.isNaN(start)) return false
    const end = start + Math.round(visit.durationHours * 60 * 60 * 1000)
    return at >= start && at <= end
  })
}

/** How long after an incident the record is worth reading as its aftermath. */
export const INCIDENT_FOLLOW_DAYS = 3

export interface IncidentEvent {
  id: string
  /** ISO instant for a note, ISO date for a family-log entry. */
  at: string
  kind: 'reported' | 'note' | 'contact'
  title: string
  who: string
  whoRole: string
  detail?: string
  /** The incident itself. Everything else is context that followed it. */
  anchor: boolean
  /** False for family-log rows, which carry a date and no clock time. */
  timed: boolean
}

/**
 * What the record shows around an incident, in order.
 *
 * NOT an audit trail. The design's timeline is one — "Coordinator Notified",
 * "Supervisor Review Started", "System auto-assigned incident" — each with an
 * actor and a minute. This app logs none of that: nobody is notified by it,
 * nothing is auto-assigned, and no review has a start time. Inventing those
 * rows would be inventing an operational history that never happened.
 *
 * What can be shown is what the record does hold in the days after: notes
 * other people wrote on the same client, and contact logged with the family.
 * Neither is *linked* to the incident — nothing in this app links them — so
 * they are presented as what else happened, not as a response to it.
 */
export function incidentHistory(
  record: IncidentRecord,
  followDays = INCIDENT_FOLLOW_DAYS,
): IncidentEvent[] {
  const day = record.at.slice(0, 10)
  const from = Date.parse(record.at)
  const until = Date.parse(`${day}T00:00:00Z`) + (followDays + 1) * 86_400_000

  const events: IncidentEvent[] = [
    {
      id: `reported-${record.id}`,
      at: record.at,
      kind: 'reported',
      title: 'Incident written up',
      who: record.reporter,
      whoRole: record.reporterRole,
      detail: record.body,
      anchor: true,
      timed: true,
    },
  ]

  for (const note of getCareNotes(record.recipientId)) {
    if (note.id === record.id) continue
    const at = Date.parse(note.at)
    if (at < from || at >= until) continue
    events.push({
      id: `note-${note.id}`,
      at: note.at,
      kind: 'note',
      title: `${noteCategoryLabels[note.category]} filed`,
      who: note.author,
      whoRole: note.authorRole,
      detail: note.body,
      anchor: false,
      timed: true,
    })
  }

  for (const entry of getFamilyRecord(record.recipientId)?.log ?? []) {
    const at = Date.parse(`${entry.at}T00:00:00Z`)
    // Same day or later. A call the morning before cannot be a response.
    if (at < Date.parse(`${day}T00:00:00Z`) || at >= until) continue
    events.push({
      id: `contact-${entry.id}`,
      at: entry.at,
      kind: 'contact',
      title:
        entry.direction === 'inbound'
          ? `${entry.type} from the family`
          : `${entry.type} to the family`,
      who: entry.staff,
      whoRole: 'Logged against the family record',
      detail: entry.subject,
      anchor: false,
      timed: false,
    })
  }

  return events.sort((a, b) => {
    const at = (e: IncidentEvent) =>
      e.timed ? Date.parse(e.at) : Date.parse(`${e.at}T23:59:59Z`)
    // Undated rows sort to the end of their day, so a note with a clock time
    // is never pushed below a log entry that only knows the date.
    return at(a) - at(b)
  })
}
