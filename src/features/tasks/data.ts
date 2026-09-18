/**
 * The agency's open work, in one list.
 *
 * Two kinds of row, kept visibly apart because they behave differently and a
 * coordinator has to know which they are looking at.
 *
 * A **worked-out** task is read off the records the rest of the app already
 * keeps: a visit that closed with no write-up, a credential that has lapsed, an
 * incident nobody has settled, a care request nobody has answered. Nothing
 * creates these and nothing can tick them off — they exist exactly as long as
 * the fact behind them does, and they go when somebody files the write-up,
 * renews the licence, settles the incident or answers the request. A checkbox
 * on one of those would be a lie with a due date attached: the paperwork would
 * still be missing and the list would have stopped saying so.
 *
 * A **written** task is one somebody typed. "Order medical supplies" is not
 * derivable from anything and never will be, so it is stored, and it is ticked
 * off by hand because a person is the only thing that knows it is done.
 *
 * Written tasks live in memory for the session, like the alert actions and the
 * contact log — there is no backend, and the screens that write say so.
 */
import { useSyncExternalStore } from 'react'
import { NOW, TODAY } from '@/lib/today'
import { addDays, boardOn } from '@/features/scheduling/board-data'
import type { BoardVisit } from '@/features/scheduling/board-data'
import { historyVisits } from '@/features/monitoring/history-data'
import { incidentsFiled } from '@/features/monitoring/incidents-data'
import { incidentTypeLabels } from '@/features/care-recipients/notes-data'
import { careRequests, daysWaiting } from '@/features/care-recipients/requests-data'
import { recipients } from '@/features/care-recipients/data'
import { credentialStates, staffMembers } from '@/features/caregivers/roster-data'
import { SIGNED_IN, SIGNED_IN_ROLE } from '@/lib/session'
import { priorityOrder as priorityRankOrder } from './settings'
import type { TaskCategory, TaskPriority } from './settings'

export type TaskOrigin = 'worked-out' | 'written'

/*
 * The vocabulary is settings, not data: categories and priority labels are what
 * a coordinator edits on the task settings screen, so they live in one place
 * and every screen reads them from there. Re-exported here so a page importing
 * "the tasks module" gets the labels with the tasks.
 */
export {
  allCategories,
  categoryLabel,
  categoryTone,
  defaultAssigneeFor,
  defaultPriority,
  offeredCategories,
  priorityLabel,
  priorityOrder,
  useTaskSettings,
} from './settings'
export type { TaskCategory, TaskPriority } from './settings'

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface TaskComment {
  id: string
  /** ISO datetime, UTC. */
  at: string
  author: string
  body: string
}

/**
 * Something that happened to this task.
 *
 * Only events the app actually witnessed — created, assigned, ticked, reopened,
 * commented on. The design's "Task auto-assigned" and "Template schedule
 * activated" describe machinery that does not exist here, and a timeline is the
 * one place where an invented line is indistinguishable from a real one.
 */
export interface TaskEvent {
  id: string
  /** ISO datetime, UTC. */
  at: string
  text: string
  by: string
}

export interface AgencyTask {
  id: string
  origin: TaskOrigin
  title: string
  category: TaskCategory
  priority: TaskPriority
  /** Who it falls to. Null where the record names nobody. */
  assignee: string | null
  recipientId: string | null
  recipientName: string | null
  /** ISO date. Null on a written task with no date on it. */
  due: string | null
  /**
   * What the row was read off, in words. Only on worked-out tasks — it is the
   * answer to "why am I being told this", and a written task's answer is
   * "because somebody typed it".
   */
  source?: string
  /** Where the work actually gets done. */
  to: string
  done: boolean
  /** The visit this is about, where the row came off one. */
  visitId?: string
  /** Written tasks only, all of them. */
  createdBy?: string
  /** ISO datetime, UTC. */
  createdAt?: string
  fromTemplate?: string
  description?: string
  checklist?: ChecklistItem[]
  comments?: TaskComment[]
  activity?: TaskEvent[]
  /** The creator's own estimate, in minutes. Never computed. */
  estimateMinutes?: number
}

/* ------------------------------ written tasks ----------------------------- */

interface WrittenTask {
  id: string
  title: string
  category: TaskCategory
  priority: TaskPriority
  assignee: string | null
  recipientId: string | null
  due: string | null
  createdBy: string
  /** ISO datetime, UTC. When it was written down. */
  createdAt: string
  done: boolean
  /** Set when the task was raised from a template, so the template can count. */
  fromTemplate?: string
  description?: string
  /* Optional in the fixtures so a seed without a checklist does not need three
     empty arrays; normalised to [] on the way out. */
  checklist?: ChecklistItem[]
  comments?: TaskComment[]
  activity?: TaskEvent[]
  estimateMinutes?: number
}

/*
 * Seeded so the list is not all machinery on a first look. Every assignee is
 * somebody really on the roster, and the dates sit around today rather than in
 * a month nobody is looking at.
 */
const written: WrittenTask[] = [
  {
    id: 'wt-1',
    title: 'Order incontinence supplies for the Johnson household',
    category: 'supplies',
    priority: 'medium',
    assignee: 'Admin Support',
    recipientId: 'cr-001',
    due: TODAY,
    createdBy: 'Mike Chen',
    createdAt: `${addDays(TODAY, -1)}T09:00:00Z`,
    done: false,
    description:
      'The pack size changed with the July delivery. Check what is left in the hall cupboard before ordering, and put the order through the usual supplier account.',
    estimateMinutes: 20,
    checklist: [
      { id: 'c1', label: 'Count what is left in the cupboard', done: true },
      { id: 'c2', label: 'Confirm the new pack size with the supplier', done: true },
      { id: 'c3', label: 'Place the order', done: false },
      { id: 'c4', label: 'Tell the family when it will arrive', done: false },
    ],
    comments: [
      {
        id: 'k1',
        at: `${addDays(TODAY, -1)}T14:20:00Z`,
        author: 'Sarah Williams',
        body: 'Down to about four days of stock on the morning round.',
      },
    ],
    activity: [
      {
        id: 'e1',
        at: `${addDays(TODAY, -1)}T09:00:00Z`,
        text: 'Created and assigned to Admin Support',
        by: 'Mike Chen',
      },
    ],
  },
  {
    id: 'wt-2',
    title: 'Arrange the family meeting about overnight cover',
    category: 'family',
    priority: 'high',
    assignee: 'Mike Chen',
    recipientId: 'cr-006',
    due: addDays(TODAY, 1),
    createdBy: SIGNED_IN,
    createdAt: `${addDays(TODAY, -2)}T11:20:00Z`,
    done: false,
  },
  {
    id: 'wt-3',
    title: 'Chase the hoist service engineer',
    category: 'admin',
    priority: 'high',
    assignee: 'Admin Support',
    recipientId: 'cr-005',
    due: addDays(TODAY, -1),
    createdBy: 'Dr. Jane Foster',
    createdAt: `${addDays(TODAY, -4)}T15:45:00Z`,
    done: false,
  },
  {
    id: 'wt-4',
    title: 'Book the quarterly manual handling refresher',
    category: 'compliance',
    priority: 'medium',
    assignee: 'HR Team',
    recipientId: null,
    due: addDays(TODAY, 6),
    createdBy: SIGNED_IN,
    createdAt: `${addDays(TODAY, -3)}T08:30:00Z`,
    done: false,
  },
  {
    id: 'wt-5',
    title: 'Write up the July rota review for the branch meeting',
    category: 'admin',
    priority: 'low',
    assignee: 'Amara Nwosu',
    recipientId: null,
    due: addDays(TODAY, 4),
    createdBy: 'Amara Nwosu',
    createdAt: `${addDays(TODAY, -6)}T16:10:00Z`,
    done: false,
  },
  {
    id: 'wt-6',
    title: 'Confirm the new key safe code with the family',
    category: 'family',
    priority: 'medium',
    assignee: 'Lisa Thompson',
    recipientId: 'cr-005',
    due: addDays(TODAY, -2),
    createdBy: 'Dr. Jane Foster',
    createdAt: `${addDays(TODAY, -5)}T10:05:00Z`,
    done: true,
  },
]

let filed = 0
let version = 0
const listeners = new Set<() => void>()

function emit(): void {
  version += 1
  for (const listener of listeners) listener()
}

export interface NewTask {
  title: string
  description?: string
  /** Checklist labels, in order. Used when a task comes off a template. */
  items?: string[]
  /** The template this came from, where one did. */
  fromTemplate?: string
  category: TaskCategory
  priority: TaskPriority
  assignee: string | null
  recipientId: string | null
  due: string | null
  estimateMinutes?: number | null
}

export function createTask(task: NewTask): string {
  filed += 1
  const id = `wt-new-${filed}`
  const entry: WrittenTask = {
    ...task,
    id,
    description: task.description?.trim() === '' ? undefined : task.description,
    estimateMinutes: task.estimateMinutes ?? undefined,
    checklist: (task.items ?? []).map((label, index) => ({
      id: `c${index + 1}`,
      label,
      done: false,
    })),
    createdBy: SIGNED_IN,
    createdAt: nowStamp(),
    done: false,
    activity: [],
  }
  record(entry, `Created and assigned to ${task.assignee ?? 'nobody'}`)
  written.unshift(entry)
  emit()
  return id
}

/** Only ever a written task: see the note at the top of this file. */
export function setTaskDone(id: string, done: boolean): void {
  const task = find(id)
  if (!task || task.done === done) return
  task.done = done
  record(task, done ? 'Marked complete' : 'Reopened')
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTasks(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  )
}

/** Stamped on everything written during the session, off the same clock. */
function nowStamp(): string {
  return `${TODAY}T${NOW}:00Z`
}

let sequence = 0
function nextId(prefix: string): string {
  sequence += 1
  return `${prefix}-${sequence}`
}

function record(task: WrittenTask, text: string): void {
  task.activity = [
    ...(task.activity ?? []),
    { id: nextId('e'), at: nowStamp(), text, by: SIGNED_IN },
  ]
}

function find(id: string): WrittenTask | undefined {
  return written.find((t) => t.id === id)
}

/** Everything a person can change about a written task. */
export interface TaskEdit {
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  assignee: string | null
  recipientId: string | null
  due: string | null
  estimate: number | null
}

export function updateTask(id: string, edit: TaskEdit): void {
  const task = find(id)
  if (!task) return
  const moved = task.assignee !== edit.assignee
  Object.assign(task, {
    title: edit.title,
    description: edit.description === '' ? undefined : edit.description,
    category: edit.category,
    priority: edit.priority,
    assignee: edit.assignee,
    recipientId: edit.recipientId,
    due: edit.due,
    estimateMinutes: edit.estimate ?? undefined,
  })
  // Reassignment is the edit worth its own line: everything else is a detail,
  // but somebody else's name appearing on a task is a handover.
  record(task, moved ? `Reassigned to ${edit.assignee ?? 'nobody'}` : 'Edited')
  emit()
}

export function deleteTask(id: string): void {
  const at = written.findIndex((t) => t.id === id)
  if (at === -1) return
  written.splice(at, 1)
  emit()
}

export function addComment(id: string, body: string): void {
  const task = find(id)
  if (!task || body.trim() === '') return
  task.comments = [
    ...(task.comments ?? []),
    { id: nextId('k'), at: nowStamp(), author: SIGNED_IN, body: body.trim() },
  ]
  record(task, 'Commented')
  emit()
}

export function addChecklistItem(id: string, label: string): void {
  const task = find(id)
  if (!task || label.trim() === '') return
  task.checklist = [
    ...(task.checklist ?? []),
    { id: nextId('c'), label: label.trim(), done: false },
  ]
  emit()
}

export function setChecklistItem(id: string, itemId: string, done: boolean): void {
  const task = find(id)
  if (!task) return
  task.checklist = (task.checklist ?? []).map((item) =>
    item.id === itemId ? { ...item, done } : item,
  )
  emit()
}

export function removeChecklistItem(id: string, itemId: string): void {
  const task = find(id)
  if (!task) return
  task.checklist = (task.checklist ?? []).filter((item) => item.id !== itemId)
  emit()
}

/* ----------------------------- worked-out tasks ---------------------------- */

/** How long a visit's paperwork can be outstanding before it is urgent. */
const WRITE_UP_GRACE_DAYS = 2

/** A credential inside this window is somebody's job this week. */
const RENEWAL_WINDOW_DAYS = 45

/** A request left unanswered this long is late, not merely waiting. */
const REQUEST_GRACE_DAYS = 3

const recipientNames = new Map(recipients.map((r) => [r.id, r.name]))

function recipientNameOf(id: string | null): string | null {
  return id ? (recipientNames.get(id) ?? null) : null
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  )
}

/**
 * Every worked-out task, at the day given.
 *
 * Each block below names the record it reads and the question it answers. None
 * of them invent a due date: the date on the row is the date the record itself
 * carries — the day the visit closed, the day the licence runs out, the day the
 * request came in.
 */
function derivedTasks(today = TODAY): AgencyTask[] {
  const tasks: AgencyTask[] = []

  // 1. Visits that closed with nothing filed. The paperwork is owed by whoever
  //    was on the visit, and it is owed from the day the visit ended.
  for (const visit of historyVisits('7', today)) {
    if (visit.outcome !== 'unrecorded') continue
    const age = daysBetween(visit.date, today)
    tasks.push({
      id: `wo-writeup-${visit.id}`,
      origin: 'worked-out',
      title: `Write up the ${visit.type.toLowerCase()} visit`,
      category: 'paperwork',
      priority: age > WRITE_UP_GRACE_DAYS ? 'high' : 'medium',
      assignee: visit.caregiverName,
      recipientId: visit.recipientId,
      recipientName: visit.recipientName,
      due: visit.date,
      source: 'The visit closed with no record filed against it.',
      to: `/scheduling/visits/${visit.id}/overview`,
      visitId: visit.id,
      done: false,
    })
  }

  // 2. Credentials. Expired is somebody rostered on a lapsed licence, which is
  //    the same fact the compliance alert raises; expiring is the renewal
  //    nobody has booked yet.
  for (const member of staffMembers) {
    if (member.status !== 'active') continue
    for (const { credential, state, daysRemaining } of credentialStates(
      member,
      today,
    )) {
      if (!credential.expiresAt) continue
      const expired = state === 'expired'
      if (!expired && (daysRemaining === null || daysRemaining > RENEWAL_WINDOW_DAYS))
        continue
      tasks.push({
        id: `wo-cred-${member.id}-${credential.id}`,
        origin: 'worked-out',
        title: `${expired ? 'Renew the lapsed' : 'Renew'} ${credential.name.toLowerCase()} for ${member.name}`,
        category: 'compliance',
        priority: expired ? 'critical' : daysRemaining! <= 14 ? 'high' : 'medium',
        // Not the caregiver: chasing a renewal is the office's job, and putting
        // it on the person whose licence lapsed is how it stays lapsed.
        assignee: 'HR Team',
        recipientId: null,
        recipientName: null,
        due: credential.expiresAt,
        source: expired
          ? `${credential.name} expired ${Math.abs(daysRemaining ?? 0)} days ago and they are still on the rota.`
          : `${credential.name} runs out in ${daysRemaining} days.`,
        to: `/caregivers/${member.id}/documents`,
        done: false,
      })
    }
  }

  // 3. Incidents nobody has settled. The write-up exists; what is outstanding
  //    is somebody deciding what happens next.
  for (const incident of incidentsFiled(today, 60)) {
    if (incident.outcome !== 'open') continue
    tasks.push({
      id: `wo-incident-${incident.id}`,
      origin: 'worked-out',
      title: `Follow up the ${incidentTypeLabels[incident.type].toLowerCase()} written up for ${incident.recipientName}`,
      category: 'incident',
      priority:
        incident.severity === 'critical' || incident.severity === 'high'
          ? 'high'
          : 'medium',
      assignee: incident.reporter,
      recipientId: incident.recipientId,
      recipientName: incident.recipientName,
      due: incident.at.slice(0, 10),
      source: `Incident ${incident.reference} is still open.`,
      to: `/live-monitoring/alerts/${incident.reference}/overview`,
      done: false,
    })
  }

  // 4. Care requests waiting on a decision. The clock started when the family
  //    sent it, not when somebody got round to it.
  for (const request of careRequests) {
    if (request.decision !== 'undecided') continue
    const waiting = daysWaiting(request, today)
    tasks.push({
      id: `wo-request-${request.id}`,
      origin: 'worked-out',
      title: `Decide on ${request.patient.name}'s care request`,
      category: 'intake',
      priority: waiting > REQUEST_GRACE_DAYS ? 'high' : 'medium',
      // The coordinator is a name on the request, not a record — the field
      // holds the string the family's request was routed to.
      assignee: request.coordinator ?? null,
      recipientId: null,
      recipientName: request.patient.name,
      due: addDays(request.submittedAt.slice(0, 10), REQUEST_GRACE_DAYS),
      source: `${request.ref} has been waiting ${waiting} day${waiting === 1 ? '' : 's'}.`,
      to: `/care-recipients/requests/${request.id}`,
      done: false,
    })
  }

  return tasks
}

/* --------------------------------- reading -------------------------------- */

/** Built off the one ordering, so a rank can never disagree with a filter. */
const priorityRank = Object.fromEntries(
  priorityRankOrder.map((p, index) => [p, index]),
) as Record<TaskPriority, number>

/**
 * Everything open, worst first: overdue before due, then by priority, then by
 * date. Done tasks sort last — they are kept so a coordinator can see what was
 * cleared today, not to pad the top of the list.
 */
export function allTasks(today = TODAY): AgencyTask[] {
  const rows: AgencyTask[] = [
    ...derivedTasks(today),
    ...written.map((task) => ({
      ...task,
      origin: 'written' as const,
      recipientName: recipientNameOf(task.recipientId),
      checklist: task.checklist ?? [],
      comments: task.comments ?? [],
      activity: task.activity ?? [],
      // Its own page: a written task is the only kind this app owns, so it is
      // the only kind with somewhere of its own to be.
      to: `/tasks/${task.id}`,
    })),
  ]

  return rows.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const aLate = isOverdue(a, today)
    const bLate = isOverdue(b, today)
    if (aLate !== bLate) return aLate ? -1 : 1
    return (
      priorityRank[a.priority] - priorityRank[b.priority] ||
      (a.due ?? '9999').localeCompare(b.due ?? '9999')
    )
  })
}

export function isOverdue(task: AgencyTask, today = TODAY): boolean {
  return !task.done && task.due !== null && task.due < today
}

export function isDueToday(task: AgencyTask, today = TODAY): boolean {
  return !task.done && task.due === today
}

/** "Today", "Yesterday", "in 3 days", "12 Aug" — a due date reads as a distance. */
export function formatDue(due: string | null, today = TODAY): string {
  if (due === null) return 'No date'
  const days = daysBetween(today, due)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days < 0) return `${Math.abs(days)} days ago`
  if (days <= 7) return `In ${days} days`
  return dayStamp.format(new Date(`${due}T00:00:00Z`))
}

const dayStamp = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/**
 * What to call the person a task falls to.
 *
 * Read off the roster where they are on it. The two desks that are not — HR and
 * admin — are named rather than left blank, and anyone else falls back to their
 * own name rather than to an invented title.
 */
export function roleOf(name: string | null): string | null {
  if (!name) return null
  const member = staffMembers.find((m) => m.name === name)
  if (member) return member.title
  if (name === 'HR Team') return 'Human resources'
  if (name === 'Admin Support') return 'Administration'
  if (name === SIGNED_IN) return SIGNED_IN_ROLE
  return null
}

/** Everyone a task can be put on: the roster, plus the desks that are not on it. */
export function assignableNames(): string[] {
  const names = new Set<string>(['HR Team', 'Admin Support', SIGNED_IN])
  for (const member of staffMembers) {
    if (member.status === 'active') names.add(member.name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

/** One task by id, worked-out or written. Undefined once a written one is deleted. */
export function taskById(id: string | undefined, today = TODAY): AgencyTask | undefined {
  if (!id) return undefined
  return allTasks(today).find((t) => t.id === id)
}

/**
 * What else is open around this one — the same client first, then the same
 * person's other work. Nothing here is a stated "related task" field: a list
 * somebody has to maintain by hand goes stale the day after it is written.
 */
export function relatedTasks(task: AgencyTask, today = TODAY): AgencyTask[] {
  return allTasks(today)
    .filter(
      (other) =>
        other.id !== task.id &&
        !other.done &&
        ((task.recipientId !== null && other.recipientId === task.recipientId) ||
          (task.assignee !== null && other.assignee === task.assignee)),
    )
    .slice(0, 5)
}

/**
 * Tasks raised from a given template, this session.
 *
 * The only usage figure this app can produce. A template's card would rather
 * say "280 generated a month", but nothing generates anything here — see the
 * note at the top of `templates.ts`.
 */
export function tasksFromTemplate(templateId: string, today = TODAY): AgencyTask[] {
  return allTasks(today).filter((t) => t.fromTemplate === templateId)
}

/**
 * The visit a task is about.
 *
 * Two quite different questions with one answer. A worked-out paperwork row
 * *came off* a visit, so it names it outright. A written task does not come off
 * anything — but one about a client, due on a day that client is seen, is
 * almost always about that visit, so the page offers it as the visit it falls
 * alongside rather than as the visit it belongs to. Where neither holds, there
 * is no card: a task about ordering supplies is not about a visit, and pointing
 * it at the nearest one would be a guess with an address on it.
 */
export function relatedVisit(task: AgencyTask): BoardVisit | undefined {
  if (task.visitId) {
    return boardOn(task.due ?? TODAY).find((v) => v.id === task.visitId)
  }
  if (!task.recipientId || !task.due) return undefined
  return boardOn(task.due).find((v) => v.recipientId === task.recipientId)
}
