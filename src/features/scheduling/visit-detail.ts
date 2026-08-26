import { recipients } from '@/features/care-recipients/data'
import { getRecipientProfile } from '@/features/care-recipients/profile-data'
import { getCareNotes } from '@/features/care-recipients/notes-data'
import type {
  CareNoteEntry,
  NoteCategory,
} from '@/features/care-recipients/notes-data'
import { getCarePlan } from '@/features/care-recipients/care-plan-data'
import { getMedicationPlan } from '@/features/care-recipients/medications-data'
import type { DoseWindow } from '@/features/care-recipients/medications-data'
import { getHealthRecord } from '@/features/care-recipients/health-data'
import type { VitalTrend } from '@/features/care-recipients/health-data'
import { getFamilyRecord } from '@/features/care-recipients/family-data'
import type { FamilyMember } from '@/features/care-recipients/family-data'
import { minutesOfDay, staffMembers } from '@/features/caregivers/roster-data'
import type { StaffMember } from '@/features/caregivers/roster-data'
import {
  addDays,
  formatTime,
  rotaFor,
  scheduleFor,
  weekStart,
} from '@/features/caregivers/schedule-data'
import {
  boardOn,
  conflictsOn,
  formatFullDay,
  unassignedDates,
  unassignedReason,
} from './board-data'
import type { BoardVisit, Conflict } from './board-data'
import { formatSpan } from '@/lib/duration'
import { NOW, TODAY } from '@/lib/today'

// Re-exported, not re-implemented — the board and this screen must format a
// date the same way.
export { NOW, TODAY, formatTime, formatFullDay, formatSpan }

/* ---------------------------------- lookup --------------------------------- */

const TRAILING_DATE = /(\d{4}-\d{2}-\d{2})$/

/**
 * A board id carries its own date — `cg-004-r1-2026-07-24` — so one visit can
 * be found without scanning the calendar. Unassigned slots don't, so those fall
 * back to the handful of dates that carry one.
 */
export function findVisit(id: string | undefined): BoardVisit | undefined {
  if (!id) return undefined

  const dated = TRAILING_DATE.exec(id)
  if (dated) return boardOn(dated[1]).find((v) => v.id === id)

  for (const date of unassignedDates()) {
    const found = boardOn(date).find((v) => v.id === id)
    if (found) return found
  }
  return undefined
}

export function caregiverOf(visit: BoardVisit): StaffMember | undefined {
  return staffMembers.find((m) => m.id === visit.caregiverId)
}

/** The rota slot behind a visit, where one exists. */
function slotIdOf(visit: BoardVisit): string | undefined {
  const match = /^cg-\d+-(r\d+)-\d{4}-\d{2}-\d{2}$/.exec(visit.id)
  return match?.[1]
}

/* ---------------------------------- tasks ---------------------------------- */

export type TaskState = 'done' | 'current' | 'pending'

/** Which record, if any, can show that a task was actually done. */
export type TaskEvidence = 'medication' | 'vitals' | 'note' | 'none'

export interface VisitTask {
  id: string
  label: string
  /** Grouping shown as a chip; a property of the task, not of the visit. */
  category: string
  /**
   * The record that would evidence this task. Nothing in this app logs a task
   * being ticked, so where a real record exists the tab shows *that* instead of
   * inventing a completion time.
   */
  evidence: TaskEvidence
  state: TaskState
}

export interface ChecklistItem {
  label: string
  category: string
  evidence: TaskEvidence
}

const personal = (label: string): ChecklistItem => ({
  label,
  category: 'Personal care',
  evidence: 'none',
})
/** A task the dose windows genuinely evidence — giving or prompting a dose. */
const meds = (label: string): ChecklistItem => ({
  label,
  category: 'Medication',
  evidence: 'medication',
})
/** Medication work a dose window does not evidence — reconciling a chart. */
const medsAdmin = (label: string): ChecklistItem => ({
  label,
  category: 'Medication',
  evidence: 'none',
})
/** A task the vitals record genuinely evidences. */
const vitals = (label: string): ChecklistItem => ({
  label,
  category: 'Clinical',
  evidence: 'vitals',
})
/** Clinical work no record in this app evidences — a dressing, a skin check. */
const assess = (label: string): ChecklistItem => ({
  label,
  category: 'Clinical',
  evidence: 'none',
})
const food = (label: string): ChecklistItem => ({
  label,
  category: 'Nutrition',
  evidence: 'none',
})
const mobility = (label: string): ChecklistItem => ({
  label,
  category: 'Mobility',
  evidence: 'none',
})
const wellbeing = (label: string): ChecklistItem => ({
  label,
  category: 'Wellbeing',
  evidence: 'none',
})
const writeUp = (label: string): ChecklistItem => ({
  label,
  category: 'Reporting',
  evidence: 'note',
})

/*
 * A checklist per service, so the tasks describe the visit rather than being
 * the same five lines everywhere.
 */
const checklists: Record<string, ChecklistItem[]> = {
  'Morning Care': [
    personal('Personal care and dressing'),
    meds('Medication prompt'),
    food('Breakfast and fluids'),
    vitals('Vital signs check'),
    writeUp('Write up the visit'),
  ],
  'Afternoon Care': [
    wellbeing('Welfare check'),
    food('Light meal'),
    mobility('Mobility exercises'),
    writeUp('Write up the visit'),
  ],
  // Two names for one service. "Evening Care" is used by both the rota and the
  // visit log; "Evening Routine" is a second rota name for the same thing.
  'Evening Care': [
    food('Evening meal'),
    meds('Medication administration'),
    wellbeing('Settle for the night'),
    writeUp('Write up the visit'),
  ],
  'Evening Routine': [
    food('Evening meal'),
    meds('Medication administration'),
    wellbeing('Settle for the night'),
    writeUp('Write up the visit'),
  ],
  'Medication Review': [
    medsAdmin('Reconcile the prescription chart'),
    medsAdmin('Check for interactions and side effects'),
    wellbeing('Agree any changes with the coordinator'),
    writeUp('Write up the visit'),
  ],
  'Physical Therapy': [
    mobility('Warm-up and range of motion'),
    mobility('Prescribed exercise set'),
    mobility('Walking practice'),
    writeUp('Write up the visit'),
  ],
  'Clinical Checkup': [
    vitals('Vital signs check'),
    medsAdmin('Symptom and medication review'),
    assess('Skin and wound review'),
    writeUp('Write up the visit'),
  ],
  Medication: [
    medsAdmin('Confirm the prescription chart'),
    meds('Administer medication'),
    medsAdmin('Record the dose'),
    writeUp('Write up the visit'),
  ],
  'Clinical Assessment': [
    vitals('Vital signs check'),
    assess('Skin and pressure review'),
    mobility('Range of motion exercises'),
    mobility('Walking practice'),
    writeUp('Write up the visit'),
  ],
  'Wound Care': [
    assess('Remove the existing dressing'),
    assess('Clean and assess the wound'),
    assess('Redress'),
    writeUp('Write up the visit'),
  ],
  'Live-in Care': [
    personal('Morning routine'),
    meds('Medication rounds'),
    food('Meals and fluids'),
    wellbeing('Afternoon activity'),
    personal('Evening routine'),
    writeUp('Write up the day'),
  ],
  'Onboarding visit': [
    personal('Confirm identity and consent'),
    wellbeing('Walk the home'),
    wellbeing('Agree the care plan'),
    writeUp('Write up the visit'),
  ],
}

export function checklistFor(type: string): ChecklistItem[] {
  return (
    checklists[type] ?? [
      wellbeing('Deliver the visit'),
      writeUp('Write up the visit'),
    ]
  )
}

/**
 * Progress is read off the clock, not stored. The source design badged "3 of 5
 * completed" above a list containing two ticks — here the badge counts the
 * list, because it is the same array.
 */
export function tasksFor(
  visit: BoardVisit,
  today = TODAY,
  now = NOW,
): VisitTask[] {
  const labels = checklistFor(visit.type)
  const build = (state: (index: number) => TaskState) =>
    labels.map((item, i) => ({ id: `t${i}`, ...item, state: state(i) }))

  // A cancelled visit never ran, whatever the clock says.
  if (visit.status === 'cancelled') return build(() => 'pending')

  const over = visit.date < today || visit.status === 'completed'

  // Over and never logged: nothing is known to have happened. The log check
  // has to come first — a visit that merely *finished today* is "completed"
  // off the clock alone, and ticking its tasks told the user a record existed
  // while the timeline beneath showed none.
  if (over && !visit.logged) return build(() => 'pending')
  if (over) return build(() => 'done')
  if (visit.date > today || visit.status !== 'in-progress') {
    return build(() => 'pending')
  }
  // Mid-visit with no record is the same claim as over with no record: the app
  // has no evidence anyone arrived, so it ticks nothing. Without this the
  // header read "2 of 6 done" beside "Check-in: not recorded".
  if (!visit.logged) return build(() => 'pending')

  // Mid-visit: how far through the window the clock is, in whole tasks.
  const start = minutesOfDay(formatTime(visit.start))
  const end = minutesOfDay(formatTime(visit.end))
  const elapsed = minutesOfDay(formatTime(now)) - start
  const share = end > start ? elapsed / (end - start) : 0
  const current = Math.min(labels.length - 1, Math.floor(share * labels.length))

  return build((i) => (i < current ? 'done' : i === current ? 'current' : 'pending'))
}

export function taskProgress(tasks: VisitTask[]): { done: number; total: number } {
  return { done: tasks.filter((t) => t.state === 'done').length, total: tasks.length }
}

/* --------------------------------- evidence -------------------------------- */

export interface DoseEvidence {
  kind: 'medication'
  /** Dose windows the visit actually covers, from the medication plan. */
  doses: DoseWindow[]
  /** How many the day holds in total, so the subset is not read as the plan. */
  dosesThatDay: number
}

export interface VitalEvidence {
  kind: 'vitals'
  readings: VitalTrend[]
}

export interface NoteEvidence {
  kind: 'note'
  notes: CareNoteEntry[]
}

export type TaskDetail = DoseEvidence | VitalEvidence | NoteEvidence | null

/**
 * What the app can actually show for a task.
 *
 * Nothing records a task being ticked — no per-task time, no note, no
 * signature. Where a real record exists it is shown instead: the dose windows
 * the visit covers, the client's own vitals, the note the caregiver wrote. The
 * source design invented a completion time and a caregiver quote for each of
 * six tasks and stamped them "Verified".
 */
export function detailFor(
  task: VisitTask,
  visit: BoardVisit,
  notes: CareNoteEntry[],
  today = TODAY,
): TaskDetail {
  // A record that postdates the visit is not evidence for it, and a task
  // nobody has started has nothing to evidence.
  if (visit.date > today || task.state === 'pending') return null

  if (task.evidence === 'medication') {
    const plan = getMedicationPlan(visit.recipientId)
    if (!plan || plan.scheduleDateIso !== visit.date) return null
    const start = minutesOfDay(formatTime(visit.start))
    const end = start + Math.round(visit.durationHours * 60)
    const doses = plan.doses.filter((d) => {
      const at = minutesOfDay(d.time)
      // Half-open: a dose at the closing minute belongs to the next visit, not
      // to both.
      if (!Number.isFinite(at) || at < start || at >= end) return false
      // And it has to be this caregiver's dose. `administeredBy` names who
      // gave it; another caregiver's round is not evidence of this visit.
      return (
        visit.caregiverName === null || d.administeredBy === visit.caregiverName
      )
    })
    return doses.length > 0
      ? { kind: 'medication', doses, dosesThatDay: plan.doses.length }
      : null
  }

  if (task.evidence === 'vitals') {
    const health = getHealthRecord(visit.recipientId)
    return health && health.vitals.length > 0
      ? { kind: 'vitals', readings: health.vitals }
      : null
  }

  if (task.evidence === 'note') {
    // Only a write-up stands in for a write-up, and only the caregiver's own:
    // a clinical note, an incident, or anything a coordinator filed during the
    // same window is a different record, and the Notes tab is where it belongs.
    const written = writtenByCaregiver(notes, visit).filter(
      (n) => n.category === 'visit',
    )
    return written.length > 0 ? { kind: 'note', notes: written } : null
  }
  return null
}

/* --------------------------------- timeline -------------------------------- */

/**
 * Whether an entry is something the app recorded, or something the rota says
 * ought to happen. The source design mixed the two freely and called the whole
 * list "verified via GPS and manual logging".
 */
export type TimelineSource = 'record' | 'schedule'

export type TimelineKind =
  | 'scheduled-start'
  | 'clock-in'
  | 'dose'
  | 'note'
  | 'clock-out'
  | 'scheduled-end'

export interface TimelineEntry {
  id: string
  /** 24-hour clock. */
  at: string
  label: string
  detail?: string
  source: TimelineSource
  kind: TimelineKind
  /** The next thing due, when the clock is inside the visit. */
  next?: boolean
}

/**
 * Everything this app can actually put a time against for one visit.
 *
 * Recorded: the clock-in and clock-out on the visit record, the medication
 * rounds the plan timestamps, and the notes the caregiver wrote. Scheduled: the
 * start and the finish on the rota. Nothing else — there is no arrival ping, no
 * geofence, no per-task completion and no confirmation behind either clock
 * time, so none of those appear.
 */
export function timelineFor(
  visit: BoardVisit,
  notes: CareNoteEntry[],
  today = TODAY,
  now = NOW,
): TimelineEntry[] {
  if (visit.status === 'cancelled') return []

  const entries: TimelineEntry[] = []
  const start = minutesOfDay(formatTime(visit.start))
  const end = start + Math.round(visit.durationHours * 60)

  // Minutes from midnight, unwrapped for an overnight block so an 06:00 finish
  // sorts after a 22:00 start rather than before it.
  const order = (at: string) => {
    const m = minutesOfDay(formatTime(at))
    return visit.overnight && m < start ? m + 24 * 60 : m
  }
  const rawNow = minutesOfDay(formatTime(now))
  const nowMin = visit.overnight && rawNow < start ? rawNow + 24 * 60 : rawNow
  // A record dated after the clock has not happened yet.
  const happened = (at: string) =>
    visit.date < today || (visit.date === today && order(at) <= nowMin)

  entries.push({
    id: 'scheduled-start',
    at: visit.start,
    label: 'Visit due to start',
    detail: `${visit.type}, ${visit.durationHours}h`,
    source: 'schedule',
    kind: 'scheduled-start',
  })

  if (visit.clockIn && happened(visit.clockIn)) {
    entries.push({
      id: 'clock-in',
      at: visit.clockIn,
      label: `${visit.caregiverName ?? 'The caregiver'} checked in`,
      detail: describeArrival(visit.start, visit.clockIn),
      source: 'record',
      kind: 'clock-in',
    })
  }

  // Medication rounds the plan timestamps inside this visit's window.
  // Skipped entirely when nobody is on the visit: another caregiver's round is
  // not a record of this one.
  const plan =
    visit.caregiverId === null ? undefined : getMedicationPlan(visit.recipientId)
  if (plan && plan.scheduleDateIso === visit.date) {
    for (const dose of plan.doses) {
      const at = minutesOfDay(dose.time)
      if (!Number.isFinite(at) || at < start || at >= end) continue
      if (visit.caregiverName && dose.administeredBy !== visit.caregiverName)
        continue
      // A missed dose is a recorded fact, not something still to come — the
      // Care tasks tab already calls it missed.
      const recorded = dose.state !== 'scheduled'
      if (recorded && !happened(to24(at))) continue
      entries.push({
        id: `dose-${dose.id}`,
        at: to24(at),
        label: `${dose.title} ${
          dose.state === 'administered'
            ? 'given'
            : dose.state === 'missed'
              ? 'missed'
              : 'due'
        }`,
        detail: dose.medications,
        source: recorded ? 'record' : 'schedule',
        kind: 'dose',
      })
    }
  }

  // Notes carry their own timestamp; nothing else on this screen does.
  for (const note of notes) {
    const at = note.at.slice(11, 16)
    if (!happened(at)) continue
    const outside = order(at) < start || order(at) >= end
    // A note by anybody else is co-timed, not a record of this visit — a
    // coordinator's phone call at 11:00 is not evidence the caregiver was in
    // the house.
    const theirs = note.author === visit.caregiverName
    const caveats = [
      outside ? 'filed outside the visit window' : null,
      theirs ? null : 'not the caregiver on this visit',
    ].filter(Boolean)
    entries.push({
      id: `note-${note.id}`,
      at,
      // Named by kind: an incident reading identically to a routine write-up
      // is the failure a chronological log exists to prevent.
      // "Visit Notes" already ends in "note"; don't say it twice.
      label: `${note.author} filed ${noteLabels[note.category]}`,
      detail:
        caveats.length > 0 ? `${note.body} — ${caveats.join(', ')}.` : note.body,
      source: 'record',
      kind: 'note',
    })
  }

  if (visit.clockOut && happened(visit.clockOut)) {
    entries.push({
      id: 'clock-out',
      at: visit.clockOut,
      label: `${visit.caregiverName ?? 'The caregiver'} clocked out`,
      detail: describeDeparture(visit.end, visit.clockOut),
      source: 'record',
      kind: 'clock-out',
    })
  }

  const closed = visit.date < today || (visit.date === today && nowMin >= end)

  entries.push({
    id: 'scheduled-end',
    at: visit.end,
    label: 'Visit due to finish',
    detail: closed
      ? visit.clockOut
        ? 'A clock-out time was entered; nothing confirms the departure it describes.'
        : visit.logged
          ? 'No clock-out was entered; the visit record is the only closing evidence.'
          : // Only the caregiver's own note counts here. A coordinator note
            // filed during the window says nothing about whether anyone
            // attended.
            writtenByCaregiver(notes, visit).length > 0
            ? 'No visit record was filed. The caregiver’s note above is the only evidence.'
            : 'The window closed with no visit record.'
      : 'Nothing confirms a departure; only a clock-out time can be entered.',
    source: 'schedule',
    kind: 'scheduled-end',
  })

  // Sorted on unwrapped minutes with an explicit tiebreak, so two entries at
  // the same clock time do not depend on the order they were pushed.
  //
  // `scheduled-end` is pinned last whatever its time, because it is a closing
  // summary rather than an event: notes carry an hour of grace either side, so
  // one filed at 11:00 on a 10:00 visit sorted *below* the line reading "the
  // window closed with no visit record".
  const sorted = entries.sort((a, b) => {
    const aLast = a.kind === 'scheduled-end' ? 1 : 0
    const bLast = b.kind === 'scheduled-end' ? 1 : 0
    return (
      aLast - bLast ||
      order(a.at) - order(b.at) ||
      kindRank[a.kind] - kindRank[b.kind]
    )
  })

  // Only a *scheduled* thing can be "next due", and only while somebody is
  // actually on a visit that is running.
  if (
    // Cancelled visits returned an empty list above, so only the caregiver
    // and the clock need checking here.
    visit.date === today &&
    visit.caregiverId !== null &&
    nowMin >= start &&
    nowMin < end
  ) {
    const upcoming = sorted.find(
      (e) => e.source === 'schedule' && order(e.at) > nowMin,
    )
    if (upcoming) upcoming.next = true
  }
  return sorted
}

/** How each note category reads inside a sentence. */
const noteLabels: Record<NoteCategory, string> = {
  visit: 'a visit note',
  clinical: 'a clinical note',
  coordinator: 'a coordinator note',
  family: 'a family message',
  incident: 'an incident report',
}

const kindRank: Record<TimelineKind, number> = {
  'scheduled-start': 0,
  'clock-in': 1,
  dose: 2,
  note: 3,
  'clock-out': 4,
  // Always last on a tie: it carries the closing summary.
  'scheduled-end': 5,
}

function to24(minutes: number): string {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** "6 minutes early", "on time", "12 minutes late". */
export function describeArrival(scheduled: string, actual: string): string {
  const diff = minutesOfDay(formatTime(actual)) - minutesOfDay(formatTime(scheduled))
  if (diff === 0) return 'On time'
  return diff < 0 ? `${formatSpan(-diff)} early` : `${formatSpan(diff)} late`
}

/**
 * The same comparison for the other end of the visit. Separate wording because
 * "early" and "late" describe an arrival — leaving before the scheduled finish
 * is a short visit, not a punctual one.
 */
export function describeDeparture(scheduled: string, actual: string): string {
  const diff = minutesOfDay(formatTime(actual)) - minutesOfDay(formatTime(scheduled))
  if (diff === 0) return 'At the scheduled finish'
  return diff < 0
    ? `${formatSpan(-diff)} before the scheduled finish`
    : `${formatSpan(diff)} past the scheduled finish`
}

/* ----------------------------- related visits ------------------------------ */

export interface RelatedVisit {
  visit: BoardVisit
  when: 'previous' | 'next'
}

/**
 * The same rota slot before and after this one. Derived by walking the rota
 * outwards rather than stored, so a recurrence and its neighbours cannot
 * disagree — the source design's "next" was a Saturday labelled Friday.
 */
export function relatedVisits(visit: BoardVisit): RelatedVisit[] {
  const slot = slotIdOf(visit)
  const member = caregiverOf(visit)
  if (!slot || !member) return []

  const matches = (candidate: BoardVisit) =>
    candidate.caregiverId === member.id && slotIdOf(candidate) === slot

  const find = (step: number): BoardVisit | undefined => {
    for (let i = 1; i <= 21; i += 1) {
      const date = addDays(visit.date, step * i)
      const found = boardOn(date).find(matches)
      if (found) return found
    }
    return undefined
  }

  const previous = find(-1)
  const next = find(1)

  // Before and after *this* visit, not before and after today — a visit next
  // month still has a preceding occurrence, and hiding it left the panel empty
  // on every future date.
  return [
    ...(previous ? [{ visit: previous, when: 'previous' as const }] : []),
    ...(next ? [{ visit: next, when: 'next' as const }] : []),
  ].filter((r) => r.visit.date !== visit.date)
}

/** "Mon, Wed and Fri" from the rota, not typed beside it. */
export function recurrenceOf(visit: BoardVisit): string | null {
  const slot = slotIdOf(visit)
  const member = caregiverOf(visit)
  if (!slot || !member) return null

  const entry = rotaFor(member).find((r) => r.id === slot)
  if (!entry) return null

  const days = entry.days
  if (days.length === 7) return 'Every day'
  if (days.length === 1) return `Every ${days[0]}`
  return `Every ${days.slice(0, -1).join(', ')} and ${days.at(-1)}`
}

/* ----------------------------- live progress ------------------------------- */

export interface LiveProgress {
  /** True while the clock is inside the visit window. */
  underway: boolean
  /** Minutes since the visit actually began, or null before it does. */
  elapsed: number | null
  /** Minutes to the scheduled end, or null once it has passed. */
  remaining: number | null
  /**
   * Share of the *window* the clock has covered, 0–100. Deliberately separate
   * from task progress: the source design put a task fraction (4 of 6 → 67%)
   * on a bar whose two ends were labelled with the check-in and the checkout.
   */
  percent: number
  /** The clock-in the visit log captured, where there is one. */
  clockIn: string | null
  /**
   * The clock-out the visit log captured. A time on a record like the clock-in
   * — nothing confirms the departure it describes.
   */
  clockOut: string | null
  /** Scheduled end, which is what the rota says rather than what happened. */
  estimatedEnd: string
}

/**
 * Where a visit is up to, measured from the clock. Elapsed runs from the
 * recorded clock-in when there is one, and from the scheduled start otherwise —
 * a caregiver who arrived at 08:58 for a 09:00 slot has been there two minutes
 * longer than the rota says.
 */
export function progressOf(
  visit: BoardVisit,
  today = TODAY,
  now = NOW,
): LiveProgress {
  const scheduledStart = minutesOfDay(formatTime(visit.start))
  const end = scheduledStart + Math.round(visit.durationHours * 60)

  const raw =
    visit.date < today
      ? end
      : visit.date > today
        ? scheduledStart
        : minutesOfDay(formatTime(now))
  // An overnight block's window wraps past midnight; the same guard the board
  // uses, so the two cannot disagree about whether it is running.
  const nowMin = visit.overnight && raw < scheduledStart ? raw + 24 * 60 : raw

  // A clock-in in the future has not happened. Without this, a 09:12 arrival
  // was announced at 09:05.
  const clockIn =
    visit.clockIn && minutesOfDay(formatTime(visit.clockIn)) <= nowMin
      ? visit.clockIn
      : null

  // Same guard: a clock-out the clock has not reached yet has not happened.
  const clockOut =
    visit.clockOut && minutesOfDay(formatTime(visit.clockOut)) <= nowMin
      ? visit.clockOut
      : null

  const from = minutesOfDay(formatTime(clockIn ?? visit.start))
  const elapsed = nowMin - from
  const remaining = end - nowMin
  // Share of the *scheduled* window, which is what the caption claims. Running
  // it from the clock-in made an early arrival read 100% before the end.
  const span = Math.max(1, end - scheduledStart)

  return {
    // Nobody is "elapsed" into a visit they were never assigned to, and a
    // cancelled visit is not running whatever the clock says.
    underway:
      visit.date === today &&
      visit.caregiverId !== null &&
      visit.status !== 'cancelled' &&
      nowMin >= scheduledStart &&
      nowMin < end,
    elapsed: elapsed >= 0 ? elapsed : null,
    remaining: remaining > 0 ? remaining : null,
    percent: Math.max(
      0,
      Math.min(100, Math.round(((nowMin - scheduledStart) / span) * 100)),
    ),
    clockIn,
    clockOut,
    estimatedEnd: visit.end,
  }
}



/* --------------------------------- context --------------------------------- */

export interface VisitContext {
  visit: BoardVisit
  reference: string
  caregiver: StaffMember | undefined
  recipient: (typeof recipients)[number]
  // Non-null: `contextFor` returns undefined when the profile is missing, but
  // the raw return type is nullable and does not narrow through the interface.
  profile: NonNullable<ReturnType<typeof getRecipientProfile>>
  carePlan: ReturnType<typeof getCarePlan>
  primaryContact: FamilyMember | undefined
  family: FamilyMember[]
  /** Everything the board flags about this caregiver or this client today. */
  conflicts: Conflict[]
  progress: LiveProgress
  notes: CareNoteEntry[]
  tasks: VisitTask[]
  timeline: TimelineEntry[]
  related: RelatedVisit[]
  recurrence: string | null
  unassignedReason: string | null
}

/* -------------------------------- reference -------------------------------- */

/**
 * Where the visit counter starts.
 *
 * A running number has to run from somewhere, and this fixture's first record
 * falls well after it, so every reference the app can show is a real position
 * in the count rather than an estimate of one.
 */
const COUNTER_EPOCH = '2026-01-01'

/**
 * Visit id to its place in the count, filled in a day at a time and only as far
 * as it has been asked for. The board is memoised and the fixture is static, so
 * a visit keeps its number for as long as the tab is open — and gets the same
 * one again on the next load.
 */
const visitNumbers = new Map<string, number>()
let countedThrough: string | null = null
let counted = 0

function numberOf(visit: BoardVisit): number | undefined {
  if (visit.date < COUNTER_EPOCH) return undefined
  if (countedThrough === null || countedThrough < visit.date) {
    let day = countedThrough === null ? COUNTER_EPOCH : addDays(countedThrough, 1)
    for (; day <= visit.date; day = addDays(day, 1)) {
      // boardOn sorts by start time, so the count runs in the order the days
      // actually ran — the newest visit always holds the highest number.
      for (const v of boardOn(day)) visitNumbers.set(v.id, ++counted)
    }
    countedThrough = visit.date
  }
  return visitNumbers.get(visit.id)
}

/**
 * Human-facing reference — "CP-0912". Derived, never stored.
 *
 * The number is this visit's place in the running count of visits on the board
 * since {@link COUNTER_EPOCH}. It deliberately encodes nothing about who was
 * sent: the previous form spelled out the caregiver and the rota slot, so
 * reassigning a shift changed the reference printed on it, and the same visit
 * was called two different things either side of the swap.
 */
export function referenceFor(visit: BoardVisit): string {
  const place = numberOf(visit)
  if (place !== undefined) return `CP-${String(place).padStart(4, '0')}`
  // Before the counter starts there is no place to quote. The day and the
  // visit's position on it stand in, rather than a number that would claim a
  // place in a count this visit was never part of.
  const onDay = boardOn(visit.date).findIndex((v) => v.id === visit.id) + 1
  return `CP-${visit.date.replace(/-/g, '')}-${String(onDay).padStart(2, '0')}`
}

/** An hour either side, so a write-up filed just after the shift still lands. */
const NOTE_GRACE_MINUTES = 60

/**
 * Every note filed inside the visit's window, whoever wrote it.
 *
 * Not just the assigned caregiver's: a coordinator who rings the family at
 * 11:00 during a 09:00–11:30 visit has written something that belongs on that
 * visit's file. Filtering to one author meant the Notes tab could only ever
 * show one person, and the Timeline silently dropped records it had.
 *
 * What this is *not* is an attachment. Nothing in the app links a note to a
 * visit; these are notes that happen to be co-timed, which is why every screen
 * that shows them says who wrote it and whether they were the one on the visit.
 */
function notesWithin(visit: BoardVisit): CareNoteEntry[] {
  // Absolute instants, not minutes-of-day plus a date match — a note filed
  // after midnight on an overnight shift carries the *next* calendar date and
  // was rejected before the window was ever consulted.
  const start = Date.parse(`${visit.date}T${visit.start}:00Z`)
  if (Number.isNaN(start)) return []
  const end = start + Math.round(visit.durationHours * 60 * 60 * 1000)
  const grace = NOTE_GRACE_MINUTES * 60 * 1000

  return getCareNotes(visit.recipientId).filter((n) => {
    const at = Date.parse(n.at)
    return at >= start - grace && at <= end + grace
  })
}

/** Notes written by the person actually on the visit. */
export function writtenByCaregiver(
  notes: CareNoteEntry[],
  visit: BoardVisit,
): CareNoteEntry[] {
  return visit.caregiverName === null
    ? []
    : notes.filter((n) => n.author === visit.caregiverName)
}

export function contextFor(id: string | undefined): VisitContext | undefined {
  const visit = findVisit(id)
  if (!visit) return undefined

  const recipient = recipients.find((r) => r.id === visit.recipientId)
  const profile = getRecipientProfile(visit.recipientId)
  if (!recipient || !profile) return undefined

  const caregiver = caregiverOf(visit)
  const family = getFamilyRecord(visit.recipientId)?.members ?? []
  const tasks = tasksFor(visit)
  // Not gated on there being a caregiver: an unassigned slot can still have a
  // coordinator's note filed against the client inside its window, and hiding
  // it hid the record of why nobody went.
  const notesForVisit = notesWithin(visit)

  return {
    visit,
    reference: referenceFor(visit),
    caregiver,
    recipient,
    profile,
    carePlan: getCarePlan(visit.recipientId),
    primaryContact:
      family.find((m) => m.roles.includes('Primary Contact')) ?? family[0],
    family,
    // The board's own judgement on this row, brought onto the record. Without
    // it a visit could read as routine here while Conflicts one click away
    // said the caregiver's licence had lapsed.
    conflicts: conflictsOn(visit.date).filter(
      (c) =>
        ((c.caregiverId !== undefined && c.caregiverId === visit.caregiverId) ||
          (c.recipientId !== undefined && c.recipientId === visit.recipientId)) &&
        // An onboarding visit for a client who has not started care is the
        // point of the visit, not a defect in it.
        !(
          c.kind === 'inactive-recipient' &&
          visit.type === 'Onboarding visit' &&
          visit.recipientStatus === 'new'
        ),
    ),
    // Notes this caregiver wrote for this client inside this visit's window —
    // author and date alone put both of a caregiver's two Monday slots under
    // the same note. The source design filed a note by Sarah Williams under a
    // visit run by Maria Garcia.
    notes: notesForVisit,
    tasks,
    progress: progressOf(visit),
    timeline: timelineFor(visit, notesForVisit),
    related: relatedVisits(visit),
    recurrence: recurrenceOf(visit),
    unassignedReason: visit.caregiverId ? null : unassignedReason(visit.id),
  }
}

/* ---------------------------------- history -------------------------------- */

export const HISTORY_WEEKS = 4

/**
 * Every occurrence of this slot in the four weeks *before* this visit — not
 * "before today". Windowing on today emptied the tab for any visit more than
 * four weeks out while the Related panel on the same screen was still naming
 * the previous occurrence.
 */
export function historyFor(visit: BoardVisit, weeks = HISTORY_WEEKS): BoardVisit[] {
  const member = caregiverOf(visit)
  const slot = slotIdOf(visit)
  if (!member || !slot) return []

  const found: BoardVisit[] = []
  for (let i = 1; i <= weeks * 7; i += 1) {
    const date = addDays(visit.date, -i)
    // `${slot}-`, not `slot` — "r1" is a prefix of "r10", so a bare
    // startsWith would fold two different slots into one history.
    const match = scheduleFor(member, weekStart(date)).find(
      (v) => v.date === date && v.id.startsWith(`${slot}-`),
    )
    if (match) {
      found.push(...boardOn(date).filter((v) => v.id === `${member.id}-${match.id}`))
    }
  }
  return found
}
