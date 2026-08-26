import { useSyncExternalStore } from 'react'
import { TODAY } from '@/lib/today'
import { roleFor } from './caregivers-data'
import type { Tone } from '@/types'

/* ---------------------------------- types --------------------------------- */

export type NoteCategory =
  | 'visit'
  | 'clinical'
  | 'coordinator'
  | 'family'
  | 'incident'

/**
 * What an incident was about.
 *
 * Stated on the write-up rather than read out of its text: guessing a category
 * from the words in a paragraph is a classification dressed as a record, and
 * the person filing it already knows which one it was.
 */
export type IncidentType =
  | 'fall'
  | 'medication'
  | 'complaint'
  | 'behavioural'
  | 'property'
  | 'injury'

export const incidentTypeLabels: Record<IncidentType, string> = {
  fall: 'Fall',
  medication: 'Medication Concern',
  complaint: 'Service Complaint',
  behavioural: 'Behavioural',
  property: 'Property Issue',
  injury: 'Caregiver Injury',
}

/**
 * Kept separate from `Severity` in `@/types`, which runs critical/high/medium
 * and is the axis the live board ranks alerts on. An incident can genuinely be
 * minor, and forcing one up to "medium" to fit that scale would overstate it.
 */
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low'

/**
 * Where the write-up ended up.
 *
 * "Resolved" is the thing that was wrong being put right; "closed" is the file
 * being shut with nothing further to do, which is not the same claim. Both are
 * recorded by a person — nothing here derives an outcome from the clock.
 */
export type IncidentOutcome = 'open' | 'resolved' | 'closed'

export const incidentOutcomeLabels: Record<IncidentOutcome, string> = {
  open: 'Open',
  resolved: 'Resolved',
  closed: 'Closed',
}

/** Set on an incident write-up and on nothing else. */
export interface IncidentDetail {
  type: IncidentType
  severity: IncidentSeverity
  outcome: IncidentOutcome
  /**
   * Who certified that safety precautions were followed and the family told.
   *
   * Absent on most write-ups and that is the point: it is an assertion a person
   * makes, so it is recorded only when somebody actually made it. Never
   * required — an incident often has to be filed *before* the family can be
   * reached, and a form that refused would only teach people to tick it anyway.
   */
  certifiedBy?: string
}

interface NoteBase {
  id: string
  author: string
  /** ISO datetime, UTC. Drives sorting and the "this month" count. */
  at: string
  body: string
  /** Raised for supervisor attention; renders with a red accent. */
  flagged?: boolean
  comments: number
  attachments: number
}

/**
 * As stored — the role is resolved at read time.
 *
 * A union rather than one shape with three optional fields: an incident always
 * carries its detail and nothing else ever does, and the compiler is a better
 * place to keep that promise than a comment is.
 */
export type StoredNote =
  | (NoteBase & {
      category: Exclude<NoteCategory, 'incident'>
      incident?: never
    })
  | (NoteBase & { category: 'incident'; incident: IncidentDetail })

/** A stored note with the author's role resolved from the care team. */
export type CareNoteEntry = StoredNote & { authorRole: string }

export const NOTES_PAGE_SIZE = 6

export const noteCategories: { value: NoteCategory; label: string; tone: Tone }[] =
  [
    { value: 'visit', label: 'Visit Notes', tone: 'blue' },
    { value: 'clinical', label: 'Clinical', tone: 'green' },
    { value: 'coordinator', label: 'Coordinator', tone: 'purple' },
    { value: 'family', label: 'Family Communication', tone: 'amber' },
    { value: 'incident', label: 'Incident', tone: 'red' },
  ]

export const noteCategoryLabels = Object.fromEntries(
  noteCategories.map((c) => [c.value, c.label]),
) as Record<NoteCategory, string>

export const noteCategoryTones = Object.fromEntries(
  noteCategories.map((c) => [c.value, c.tone]),
) as Record<NoteCategory, Tone>

export { TODAY } from '@/lib/today'

/* ---------------------------------- data ---------------------------------- */

/*
 * Reverse-chronological, nothing later than 2026-07-24. Every note is written
 * by whoever holds that day's shift block in caregivers-data, and the clinical
 * ones line up with the matching entries in health-data and visits-data.
 */
const logs: Record<string, StoredNote[]> = {
  'cr-001': [
    {
      id: 'n1',
      author: 'Sarah Williams',
      at: '2026-07-24T10:15:00Z',
      category: 'visit',
      body: 'Morning routine completed successfully. Margaret was alert and responsive this morning. Assisted with bathing and dressing without difficulty. Medication administered on schedule — all 3 morning medications taken with breakfast. Blood pressure reading: 128/82. She expressed interest in watching her favourite gardening show after breakfast. Appetite was good.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n2',
      // 9:05, not 8:00 — she clocks in at 08:58 per the visit log.
      author: 'Sarah Williams',
      at: '2026-07-24T09:05:00Z',
      category: 'clinical',
      body: 'Pre-visit assessment: client found in bed, awake and oriented. No overnight incidents reported by family. Skin integrity check completed — no new concerns. Transferred to wheelchair with stand-pivot assist x1.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n3',
      // Thursday afternoon belongs to David Park, not Sarah.
      author: 'David Park',
      at: '2026-07-23T16:30:00Z',
      category: 'visit',
      body: 'Good afternoon session. Completed physical exercises as prescribed — 15 minutes walking with walker, 10 minutes seated stretches. Appetite normal at lunch. Client was slightly confused about day of week but oriented to person and place. Evening handoff to family completed.',
      comments: 1,
      attachments: 0,
    },
    {
      id: 'n4',
      author: 'Mike Chen',
      at: '2026-07-23T11:00:00Z',
      category: 'coordinator',
      body: 'Spoke with David Johnson (son) regarding next week schedule adjustment. Family requesting additional afternoon coverage on Wednesday for a doctor appointment. Approved and scheduling caregiver.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n5',
      author: 'David Johnson',
      at: '2026-07-22T21:00:00Z',
      category: 'family',
      body: 'Mom seemed more tired than usual this evening. She ate only half her dinner. No other concerns. Will monitor tomorrow.',
      comments: 2,
      attachments: 0,
    },
    {
      id: 'n6',
      // Wednesday afternoon is David's block, and this sits inside his
      // 2:00–3:35 PM physical therapy visit.
      author: 'David Park',
      at: '2026-07-22T15:00:00Z',
      category: 'incident',
      incident: { type: 'fall', severity: 'medium', outcome: 'resolved' },
      body: 'Client attempted to stand from wheelchair without assistance at 2:45 PM. Caregiver intervened before any fall occurred. No injury. Reminded about call button use. Near-miss report filed separately.',
      flagged: true,
      comments: 1,
      attachments: 1,
    },
    {
      id: 'n7',
      author: 'Sarah Williams',
      at: '2026-07-22T08:20:00Z',
      category: 'clinical',
      body: 'Fasting glucose 168 mg/dL — above target range. Escalated to care coordinator. Diet adjustment recommended pending physician review.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n8',
      author: 'Sarah Williams',
      at: '2026-07-21T09:40:00Z',
      category: 'visit',
      body: 'Arrived 12 minutes late due to traffic; family notified in advance. Morning routine completed in full, no reduction in care time. Client in good spirits.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n9',
      author: 'Mike Chen',
      at: '2026-07-20T14:15:00Z',
      category: 'coordinator',
      body: 'Care plan revised following Dr. Kim review — evening medication moved from 9 PM to 8 PM. Updated plan uploaded to documents and shared with the care team.',
      comments: 0,
      attachments: 1,
    },
    {
      id: 'n10',
      author: 'Emma Wilson',
      at: '2026-07-19T13:45:00Z',
      category: 'clinical',
      body: 'Clinical checkup completed. Vitals within range, blood pressure slightly elevated at 130/84. Wound site continues to look healthy. No change to dressing schedule.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n11',
      author: 'Maria Garcia',
      at: '2026-07-17T18:30:00Z',
      category: 'coordinator',
      body: 'Evening medication review cancelled by family — rescheduled to July 18. Confirmed with son by phone. No doses missed.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n12',
      author: 'Sarah Williams',
      at: '2026-07-15T11:00:00Z',
      category: 'incident',
      incident: { type: 'fall', severity: 'medium', outcome: 'resolved' },
      body: 'Minor fall in bathroom at 9:15 AM. No injury sustained. Grab bars checked and secure. Client assisted back to chair and monitored for the remainder of the visit. Incident report filed.',
      flagged: true,
      comments: 3,
      attachments: 1,
    },
    {
      id: 'n13',
      author: 'David Park',
      at: '2026-07-14T15:10:00Z',
      category: 'visit',
      body: 'Balance work completed with no incidents. Client tolerated the full session. Gait stability unchanged from last week.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n14',
      author: 'Emma Wilson',
      at: '2026-07-12T13:30:00Z',
      category: 'visit',
      body: 'Extended afternoon visit. Lunch prepared and taken in full, social engagement good, light walking in the garden. No concerns raised.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n15',
      author: 'Sarah Williams',
      at: '2026-06-25T10:00:00Z',
      category: 'clinical',
      body: 'Routine vitals recorded. BP 132/84, HR 75, temperature 98.2. Blood pressure slightly elevated — flagged for monitoring at the next clinical review.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n16',
      author: 'Emma Wilson',
      at: '2026-06-05T14:10:00Z',
      category: 'clinical',
      body: 'Wound check completed. Surgical site from the May procedure healing well with no signs of infection. Dressing changes continue every 48 hours.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n17',
      author: 'Mike Chen',
      at: '2026-06-01T09:30:00Z',
      category: 'coordinator',
      body: 'Prescription review completed with Dr. Park. No changes to the current regimen. Family briefed by phone.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n18',
      author: 'David Johnson',
      at: '2026-05-20T20:15:00Z',
      category: 'family',
      body: 'Visited this evening. Mom was in good spirits and ate a full dinner. Asked about arranging a hairdresser visit — will follow up with the coordinator.',
      comments: 1,
      attachments: 0,
    },
  ],

  /*
   * The clients below hold incident write-ups and the odd note around them
   * rather than a full log. Each one is timed inside a visit that is really on
   * that day's board, and written by whoever was on it — a write-up authored by
   * somebody who was not there is the sort of record that reads fine and
   * cannot be true.
   */

  'cr-002': [
    {
      id: 'n1',
      // Inside David Park's 1:00–3:30 PM medication visit.
      author: 'David Park',
      at: '2026-07-23T13:40:00Z',
      category: 'incident',
      incident: { type: 'medication', severity: 'high', outcome: 'resolved' },
      body: "Yesterday's 1:00 PM metformin found still in the blister pack on arrival. Escalated to the coordinator, pharmacy contacted and the missed dose logged. Client reported no symptoms and today's dose was given on time.",
      flagged: true,
      comments: 2,
      attachments: 1,
    },
    {
      id: 'n2',
      author: 'David Park',
      at: '2026-07-21T15:20:00Z',
      category: 'visit',
      body: 'Medication round completed in full. Client managed the stairs unaided today and asked to sit in the garden afterwards. Nothing outstanding at handover.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n3',
      author: 'David Park',
      at: '2026-07-16T14:05:00Z',
      category: 'incident',
      incident: { type: 'behavioural', severity: 'medium', outcome: 'resolved' },
      body: 'Client became agitated during the medication round and refused the afternoon dose. Settled after about fifteen minutes and took it at 2:20 PM. Family told at handover.',
      comments: 1,
      attachments: 0,
    },
    {
      id: 'n4',
      author: 'David Park',
      at: '2026-07-07T13:20:00Z',
      category: 'incident',
      incident: { type: 'property', severity: 'low', outcome: 'closed' },
      body: 'Bathroom grab rail found loose on arrival. Photographed and reported to the landlord. Client agreed not to use the shower until it has been refitted.',
      comments: 0,
      attachments: 1,
    },
    {
      id: 'n5',
      author: 'Dr. Jane Foster',
      at: '2026-06-30T15:10:00Z',
      category: 'incident',
      incident: { type: 'complaint', severity: 'medium', outcome: 'closed' },
      body: "Client's daughter called to say the afternoon visit has arrived late three days running. Rota checked: the block sits half an hour tight against the visit before it. Schedule adjusted from the following week.",
      comments: 3,
      attachments: 0,
    },
  ],

  'cr-003': [
    {
      id: 'n1',
      // Inside Maria Garcia's 5:00–6:30 PM evening routine.
      author: 'Maria Garcia',
      at: '2026-07-22T17:25:00Z',
      category: 'incident',
      incident: { type: 'fall', severity: 'high', outcome: 'resolved' },
      body: 'Client slipped stepping out of the kitchen at 6:15 PM. Lowered to the floor without injury and helped to a chair. Observations normal and no pain on movement. GP surgery notified the same evening.',
      flagged: true,
      comments: 2,
      attachments: 1,
    },
    {
      id: 'n2',
      author: 'Maria Garcia',
      at: '2026-07-20T18:20:00Z',
      category: 'visit',
      body: 'Evening routine completed. Client ate a full meal and settled in front of the television. Bed rails checked and in position before leaving.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n3',
      author: 'Maria Garcia',
      at: '2026-07-14T18:00:00Z',
      category: 'incident',
      incident: { type: 'medication', severity: 'low', outcome: 'resolved' },
      body: 'Evening tablets already taken on arrival — client had self-administered an hour early. No double dose. Blister pack re-checked and the timing gone over again.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n4',
      author: 'Maria Garcia',
      at: '2026-07-07T17:45:00Z',
      category: 'incident',
      incident: { type: 'behavioural', severity: 'medium', outcome: 'closed' },
      body: 'Client refused personal care and asked the caregiver to leave. Visit shortened to forty minutes with her agreement. Coordinator told the same evening; no repeat since.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n5',
      author: 'Amara Nwosu',
      at: '2026-07-03T18:10:00Z',
      category: 'incident',
      incident: { type: 'complaint', severity: 'low', outcome: 'closed' },
      body: 'Family raised that the evening caregiver changes too often. Explained the relief cover arrangement and confirmed Maria Garcia as the regular for the next eight weeks.',
      comments: 1,
      attachments: 0,
    },
  ],

  'cr-005': [
    {
      id: 'n1',
      // Inside Lisa Thompson's 9:00–11:00 AM morning care visit.
      author: 'Lisa Thompson',
      at: '2026-07-23T09:35:00Z',
      category: 'incident',
      incident: { type: 'injury', severity: 'high', outcome: 'open' },
      body: 'Caregiver strained her back moving the client from the bed to the commode without the hoist, which is away for servicing. Visit completed. Reported before leaving the property and referred to occupational health.',
      flagged: true,
      comments: 1,
      attachments: 1,
    },
    {
      id: 'n2',
      author: 'Lisa Thompson',
      at: '2026-07-21T10:30:00Z',
      category: 'clinical',
      body: 'Blood pressure 142/88, a little above her usual range. Repeated after ten minutes seated: 136/84. Will keep watching across the week.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n3',
      author: 'Lisa Thompson',
      at: '2026-07-17T10:20:00Z',
      category: 'incident',
      incident: { type: 'fall', severity: 'critical', outcome: 'resolved' },
      body: 'Client found on the bedroom floor on arrival, unable to say how long she had been there. Ambulance called at 9:50 AM. Taken to hospital for assessment and discharged the same afternoon. Family and coordinator told from the property.',
      flagged: true,
      comments: 4,
      attachments: 2,
    },
    {
      id: 'n4',
      author: 'Lisa Thompson',
      at: '2026-07-13T09:50:00Z',
      category: 'incident',
      incident: { type: 'property', severity: 'low', outcome: 'closed' },
      body: "Front door key safe jammed. Entry gained with the neighbour's spare key and the safe replaced the same day.",
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n5',
      author: 'Lisa Thompson',
      at: '2026-07-08T10:40:00Z',
      category: 'incident',
      incident: { type: 'medication', severity: 'medium', outcome: 'resolved' },
      body: 'Pain relief patch still in place beyond its 72-hour change window. Removed, skin checked and clear, new patch applied and the change date written on the chart.',
      comments: 1,
      attachments: 0,
    },
  ],

  'cr-006': [
    {
      id: 'n1',
      // John Adams holds the 8:00 AM–6:00 PM live-in block every day.
      author: 'John Adams',
      at: '2026-07-22T17:50:00Z',
      category: 'visit',
      body: 'Quiet day. Client spent the afternoon in the garden and managed lunch independently. Handover notes left for the family.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n2',
      author: 'John Adams',
      at: '2026-07-21T11:15:00Z',
      category: 'incident',
      incident: { type: 'behavioural', severity: 'high', outcome: 'open' },
      body: 'Client became verbally aggressive during the morning wash and struck out once, making no contact. Care paused for half an hour and resumed calmly. Coordinator told; a joint visit has been asked for before the next personal care session.',
      flagged: true,
      comments: 2,
      attachments: 0,
    },
    {
      id: 'n3',
      author: 'John Adams',
      at: '2026-07-18T15:30:00Z',
      category: 'incident',
      incident: { type: 'fall', severity: 'medium', outcome: 'resolved' },
      body: 'Client stumbled on the step into the garden and caught himself on the rail. No injury. Step edge marked with white tape the same afternoon.',
      comments: 0,
      attachments: 1,
    },
    {
      id: 'n4',
      author: 'John Adams',
      at: '2026-07-12T09:20:00Z',
      category: 'incident',
      incident: { type: 'medication', severity: 'medium', outcome: 'closed' },
      body: 'Morning dose given ninety minutes late — the pharmacy delivery had not arrived. Administered as soon as it did and the GP told the same morning.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n5',
      author: 'John Adams',
      at: '2026-07-05T16:45:00Z',
      category: 'incident',
      incident: { type: 'injury', severity: 'low', outcome: 'closed' },
      body: 'Caregiver caught his hand on the bed frame while adjusting the mattress. Minor graze, cleaned and covered from the first aid kit. No time lost.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n6',
      author: 'Amara Nwosu',
      at: '2026-06-27T13:00:00Z',
      category: 'incident',
      incident: { type: 'complaint', severity: 'medium', outcome: 'resolved' },
      body: "Client's son raised that the live-in block leaves no cover between 6:00 PM and 8:00 AM. Explained what the package covers and passed the request for a night sitter to the assessment team.",
      comments: 2,
      attachments: 0,
    },
  ],

  'cr-007': [
    {
      id: 'n1',
      // Inside Emma Wilson's 1:00–3:00 PM clinical assessment.
      author: 'Emma Wilson',
      at: '2026-07-19T13:50:00Z',
      category: 'incident',
      incident: { type: 'medication', severity: 'high', outcome: 'resolved' },
      body: 'Warfarin taken twice — once by the client in the morning and again at the clinical visit. INR check arranged for the following day and the anticoagulant clinic told the same afternoon.',
      flagged: true,
      comments: 3,
      attachments: 1,
    },
    {
      id: 'n2',
      author: 'Emma Wilson',
      at: '2026-07-17T14:30:00Z',
      category: 'clinical',
      body: 'Clinical assessment completed. Chest clear, no oedema, weight stable at 61 kg. Next review in two weeks.',
      comments: 0,
      attachments: 0,
    },
    {
      id: 'n3',
      author: 'Emma Wilson',
      at: '2026-07-12T14:15:00Z',
      category: 'incident',
      incident: { type: 'fall', severity: 'medium', outcome: 'resolved' },
      body: 'Client lost her balance transferring to the armchair. Lowered to the floor, no injury. Transfer belt now in use for every assessment.',
      comments: 0,
      attachments: 1,
    },
    {
      id: 'n4',
      author: 'Emma Wilson',
      at: '2026-07-05T14:40:00Z',
      category: 'incident',
      incident: { type: 'property', severity: 'medium', outcome: 'closed' },
      body: 'Stairlift stopped mid-track with the client on it. Released with the manual override. Engineer attended the same day and replaced the charging contact.',
      comments: 1,
      attachments: 1,
    },
    {
      id: 'n5',
      author: 'Mike Chen',
      at: '2026-06-28T13:30:00Z',
      category: 'incident',
      incident: { type: 'complaint', severity: 'low', outcome: 'closed' },
      body: 'Family asked why the clinical assessment moved from Monday to Friday. Explained the nurse rota change and confirmed the Friday slot for the next six weeks.',
      comments: 0,
      attachments: 0,
    },
  ],
}

/* ------------------------------- filing ---------------------------------- */

/*
 * Notes written during this session.
 *
 * They go into the same `logs` the fixtures live in, so everything downstream
 * picks them up with no special case: the client's Notes tab, the incident
 * register, Monitoring history, and the "Incident written up" alert are all
 * reading one list. In memory only, like the alert actions — there is no
 * backend, and the screens that write say so rather than implying one.
 */
let filed = 0
let notesVersion = 0
const noteListeners = new Set<() => void>()

/** Ids are namespaced so a filed note can never collide with a fixture's. */
export function nextFiledNoteId(): string {
  filed += 1
  return `filed-${filed}`
}

export function fileNote(recipientId: string, note: StoredNote): void {
  const log = (logs[recipientId] ??= [])
  // Inserted in place rather than appended: every reader takes this list as
  // reverse-chronological, and a note filed today belongs at the top, not under
  // last May's.
  const at = log.findIndex((n) => n.at <= note.at)
  log.splice(at === -1 ? log.length : at, 0, note)
  notesVersion += 1
  for (const listener of noteListeners) listener()
}

function subscribeNotes(listener: () => void): () => void {
  noteListeners.add(listener)
  return () => noteListeners.delete(listener)
}

/**
 * Re-renders the caller when a note is filed. Screens hold their derivations in
 * `useMemo`, so without something to invalidate them a note filed on the page
 * you are looking at would not appear until you navigated away and back.
 */
export function useFiledNotes(): number {
  return useSyncExternalStore(
    subscribeNotes,
    () => notesVersion,
    () => notesVersion,
  )
}

export function getCareNotes(recipientId: string): CareNoteEntry[] {
  return (logs[recipientId] ?? []).map((n) => ({
    ...n,
    authorRole: roleFor(recipientId, n.author),
  }))
}

/* -------------------------------- formatting ------------------------------- */

const stamp = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
})

export function formatNoteTime(iso: string): string {
  return stamp.format(new Date(iso)).replace(' at ', ', ')
}

/* --------------------------------- derived -------------------------------- */

/**
 * Counted from the list, like every other tab. The original design stated 89
 * total with pills summing to 89 while listing six notes.
 */
export function categoryCounts(
  notes: CareNoteEntry[],
): Record<NoteCategory, number> {
  const counts = Object.fromEntries(
    noteCategories.map((c) => [c.value, 0]),
  ) as Record<NoteCategory, number>
  for (const n of notes) counts[n.category] += 1
  return counts
}

export function flaggedCount(notes: CareNoteEntry[]): number {
  return notes.filter((n) => n.flagged).length
}

/** Notes written in the same calendar month as `today`. */
export function notesThisMonth(
  notes: CareNoteEntry[],
  today = TODAY,
): number {
  const month = today.slice(0, 7)
  return notes.filter((n) => n.at.slice(0, 7) === month).length
}

/** Distinct authors, for the author filter. */
export function authors(notes: CareNoteEntry[]): string[] {
  return [...new Set(notes.map((n) => n.author))].sort()
}

export type NoteSort = 'latest' | 'oldest'

export const noteSortOptions: { value: NoteSort; label: string }[] = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
]

export function sortNotes(
  notes: CareNoteEntry[],
  sort: NoteSort,
): CareNoteEntry[] {
  return [...notes].sort((a, b) =>
    sort === 'latest' ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at),
  )
}
