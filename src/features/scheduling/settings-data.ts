import {
  STARTING_SOON_MINUTES,
  scheduleFor,
  weekStart,
  weekSummary,
} from '@/features/caregivers/schedule-data'
import {
  complianceFor,
  credentialStates,
  minutesOfDay,
  staffMembers,
} from '@/features/caregivers/roster-data'
import { weekdays } from '@/features/caregivers/staff'
import type { Weekday } from '@/features/caregivers/staff'
import { addDays, boardOn, dayOf, formatTime } from './board-data'
import type { BoardVisit } from './board-data'
import { requirementFor } from './assign-data'
import { TODAY } from '@/lib/today'

export { STARTING_SOON_MINUTES, TODAY, formatTime, weekdays }
export type { Weekday }

/*
 * How much of the rota every check on this screen is measured against. Stated
 * on the page, because "3 visits fall outside these hours" is meaningless
 * without saying over what stretch.
 */
export const HORIZON_BACK = 28
export const HORIZON_FORWARD = 180
/** Inclusive of both ends and of today itself. */
export const HORIZON_DAYS = HORIZON_BACK + HORIZON_FORWARD + 1

let horizonCache: BoardVisit[] | null = null

/** Every visit in the window, once. */
export function horizon(): BoardVisit[] {
  if (horizonCache) return horizonCache
  const all: BoardVisit[] = []
  for (let i = -HORIZON_BACK; i <= HORIZON_FORWARD; i += 1) {
    all.push(...boardOn(addDays(TODAY, i)))
  }
  horizonCache = all
  return all
}

/* ------------------------------ business hours ----------------------------- */

export interface DayHours {
  day: Weekday
  open: boolean
  /** 24-hour, "HH:MM". */
  start: string
  end: string
}

/* ------------------------------- service types ----------------------------- */

/**
 * Every service the rota and the visit log actually use, read from the board
 * rather than typed here. The source design listed seven, two of which
 * ("Medication Administration", "Companionship") are not services at all —
 * Companionship is a caregiver skill — and omitted five that are.
 */
export function serviceTypes(): string[] {
  return [...new Set(horizon().map((v) => v.type))].sort()
}

/**
 * A second name for a service that already has one. Surfaced so the duplicate
 * row on this screen is explained rather than reading as two services. Stated
 * without claiming which source uses which name: "Evening Care" appears in
 * both the rota and the visit log, so calling either the log's name was wrong.
 */
export const serviceAliases: Record<string, string> = {
  'Evening Routine': 'Evening Care',
  'Clinical Checkup': 'Clinical Assessment',
  'Medication Review': 'Medication',
}

/** The duration most visits of a type actually run, to seed the default. */
export function commonDuration(type: string): number {
  const counts = new Map<number, number>()
  for (const v of horizon()) {
    if (v.type !== type) continue
    counts.set(v.durationHours, (counts.get(v.durationHours) ?? 0) + 1)
  }
  let best = 0
  let seen = -1
  for (const [hours, n] of counts) {
    if (n > seen) {
      best = hours
      seen = n
    }
  }
  return best
}

/* ---------------------------------- rules ---------------------------------- */

export type RuleId =
  | 'certification-match'
  | 'auto-assign-preferred'
  | 'allow-overtime'
  | 'approve-urgent'
  | 'send-reminders'
  | 'auto-cancel-unconfirmed'

export interface RuleDefinition {
  id: RuleId
  label: string
  detail: string
  /** Whether anything in the app currently acts on this setting. */
  enforced: boolean
}

/*
 * Which of these the app actually acts on. A settings screen that presents a
 * live control and a decorative one identically is lying about one of them.
 */
export const ruleDefinitions: RuleDefinition[] = [
  {
    id: 'certification-match',
    label: 'Require a matching certification for the service',
    detail:
      'Assign Caregiver blocks nobody on this rule; it marks the gap and asks for a coordinator’s sign-off.',
    enforced: true,
  },
  {
    id: 'allow-overtime',
    label: 'Allow rostering beyond contracted hours',
    detail:
      'Recorded here; the board flags an over-contract week regardless of this switch.',
    enforced: false,
  },
  {
    id: 'send-reminders',
    label: 'Remind the caregiver before the visit',
    detail: `Boards mark a visit “Starting soon” ${STARTING_SOON_MINUTES} minutes ahead.`,
    enforced: true,
  },
  {
    id: 'auto-assign-preferred',
    label: 'Offer the client’s existing caregiver first',
    detail: 'Ranking already scores continuity with the care team.',
    enforced: true,
  },
  {
    id: 'approve-urgent',
    label: 'Require coordinator approval for urgent visits',
    detail: 'Recorded here; no approval step is wired up yet.',
    enforced: false,
  },
  {
    id: 'auto-cancel-unconfirmed',
    label: 'Auto-cancel unconfirmed visits after 24 hours',
    detail: 'Recorded here; nothing cancels visits automatically yet.',
    enforced: false,
  },
]

/* --------------------------------- holidays -------------------------------- */

export type HolidayPolicy = 'closed' | 'emergency' | 'normal'

export const holidayPolicyLabels: Record<HolidayPolicy, string> = {
  closed: 'Closed',
  emergency: 'Emergency only',
  normal: 'Normal operations',
}

/** Fixed to a date, or to the nth weekday of a month. */
type HolidayRule =
  | { kind: 'fixed'; month: number; day: number }
  | { kind: 'nth'; month: number; weekday: number; nth: number }

export interface Holiday {
  id: string
  name: string
  policy: HolidayPolicy
  rule: HolidayRule
}

/*
 * Dates are computed, never typed. The source design dated Thanksgiving 2026
 * to Nov 28 (a Saturday; it falls on the 26th) and MLK Day to Jan 20 (a
 * Tuesday; the third Monday is the 19th), and listed two 2026 dates that had
 * already passed.
 */
export const defaultHolidays: Holiday[] = [
  {
    id: 'new-year',
    name: 'New Year’s Day',
    policy: 'emergency',
    rule: { kind: 'fixed', month: 1, day: 1 },
  },
  {
    id: 'mlk',
    name: 'Martin Luther King Jr. Day',
    policy: 'normal',
    rule: { kind: 'nth', month: 1, weekday: 1, nth: 3 },
  },
  {
    id: 'memorial',
    name: 'Memorial Day',
    policy: 'emergency',
    rule: { kind: 'nth', month: 5, weekday: 1, nth: -1 },
  },
  {
    id: 'independence',
    name: 'Independence Day',
    policy: 'emergency',
    rule: { kind: 'fixed', month: 7, day: 4 },
  },
  {
    id: 'labor',
    name: 'Labor Day',
    policy: 'emergency',
    rule: { kind: 'nth', month: 9, weekday: 1, nth: 1 },
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving Day',
    policy: 'closed',
    rule: { kind: 'nth', month: 11, weekday: 4, nth: 4 },
  },
  {
    id: 'christmas',
    name: 'Christmas Day',
    policy: 'closed',
    rule: { kind: 'fixed', month: 12, day: 25 },
  },
]

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** `nth` of -1 means the last such weekday in the month. */
export function holidayDate(rule: HolidayRule, year: number): string {
  if (rule.kind === 'fixed') return iso(year, rule.month, rule.day)

  const daysInMonth = new Date(Date.UTC(year, rule.month, 0)).getUTCDate()

  if (rule.nth < 0) {
    for (let day = daysInMonth; day >= 1; day -= 1) {
      if (new Date(Date.UTC(year, rule.month - 1, day)).getUTCDay() === rule.weekday)
        return iso(year, rule.month, day)
    }
  } else {
    let found = 0
    for (let day = 1; day <= daysInMonth; day += 1) {
      if (new Date(Date.UTC(year, rule.month - 1, day)).getUTCDay() !== rule.weekday)
        continue
      found += 1
      if (found === rule.nth) return iso(year, rule.month, day)
    }
  }
  // An unsatisfiable rule (a fifth Monday in a month with four) has no date.
  // Returning the 1st turned a configuration error into a plausible wrong day.
  throw new Error(
    `No weekday ${rule.weekday} number ${rule.nth} in month ${rule.month} of ${year}`,
  )
}

/** The next occurrence on or after `today`, so nothing is listed in the past. */
export function nextOccurrence(holiday: Holiday, today = TODAY): string {
  const year = Number(today.slice(0, 4))
  const thisYear = holidayDate(holiday.rule, year)
  return thisYear >= today ? thisYear : holidayDate(holiday.rule, year + 1)
}

/* --------------------------------- settings -------------------------------- */

export interface BufferSettings {
  /** Minutes required between one visit ending and the next starting. */
  minutes: number
  allowBackToBack: boolean
  estimateTravel: boolean
  maxTravelMiles: number
}

export interface ScheduleSettings {
  hours: DayHours[]
  durations: Record<string, number>
  rules: Record<RuleId, boolean>
  buffer: BufferSettings
  reminderMinutes: number
  holidays: Holiday[]
}

/**
 * Defaults that describe the rota rather than contradicting it: the window is
 * seeded from the earliest start and latest end actually on the board, and
 * every day the rota uses is open. The source design closed Sundays over 29
 * rostered Sunday visits and closed at 8 PM over shifts that run to 9.
 */
export function defaultSettings(): ScheduleSettings {
  const visits = horizon()

  const perDay = new Map<Weekday, BoardVisit[]>()
  for (const v of visits) {
    const list = perDay.get(v.day)
    if (list) list.push(v)
    else perDay.set(v.day, [v])
  }

  const round = (minutes: number, dir: 'down' | 'up') => {
    const step = 30
    const n = dir === 'down' ? Math.floor(minutes / step) : Math.ceil(minutes / step)
    const total = Math.min(24 * 60, Math.max(0, n * step))
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const hours: DayHours[] = weekdays.map((day) => {
    const list = perDay.get(day) ?? []
    if (list.length === 0)
      return { day, open: false, start: '08:00', end: '18:00' }
    const first = list.reduce((a, v) => (v.start < a ? v.start : a), '23:59')
    const last = list.reduce((a, v) => (v.end > a ? v.end : a), '00:00')
    return {
      day,
      open: true,
      start: round(minutesOfDay(formatTime(first)), 'down'),
      end: round(minutesOfDay(formatTime(last)), 'up'),
    }
  })

  const durations = Object.fromEntries(
    serviceTypes().map((type) => [type, commonDuration(type)]),
  )

  return {
    hours,
    durations,
    rules: {
      'certification-match': true,
      'auto-assign-preferred': true,
      // The rota already runs one caregiver 70h against a 48h contract, so
      // defaulting this off would put the settings at odds with the board.
      'allow-overtime': true,
      'approve-urgent': true,
      'send-reminders': true,
      'auto-cancel-unconfirmed': false,
    },
    buffer: {
      minutes: 30,
      allowBackToBack: true,
      estimateTravel: true,
      maxTravelMiles: 15,
    },
    reminderMinutes: STARTING_SOON_MINUTES,
    holidays: defaultHolidays,
  }
}

/* ---------------------------------- impact --------------------------------- */

export interface Impact {
  /** Visits in the window the setting would put in conflict. */
  count: number
  /** A few of them, named. */
  examples: string[]
}

const none: Impact = { count: 0, examples: [] }

function summarise(rows: { label: string }[], limit = 3): Impact {
  return {
    count: rows.length,
    examples: rows.slice(0, limit).map((r) => r.label),
  }
}

function describe(visit: BoardVisit): string {
  return `${visit.recipientName}, ${visit.day} ${formatTime(visit.start)}–${formatTime(visit.end)}`
}

/** Visits that fall outside the business hours as configured. */
export function hoursImpact(hours: DayHours[]): Impact {
  const byDay = new Map(hours.map((h) => [h.day, h]))
  const rows = horizon()
    .filter((v) => {
      const h = byDay.get(v.day)
      if (!h) return false
      if (!h.open) return true
      // A cleared time input is '', and '' compares below every clock value —
      // which made every visit look compliant on a day with no opening time.
      if (!h.start || !h.end) return true
      // An overnight block cannot be judged on end-of-day alone.
      return v.start < h.start || (!v.overnight && v.end > h.end)
    })
    .map((v) => ({ label: describe(v) }))

  // Dedupe: the same rota slot recurs weekly and would otherwise report the
  // same problem twenty times.
  const seen = new Set<string>()
  const unique = rows.filter((r) => !seen.has(r.label) && seen.add(r.label))
  return summarise(unique)
}

/**
 * The other lengths this service actually runs for. Deliberately not an
 * `Impact` — that type counts visits, and this counts distinct durations.
 */
export function otherDurations(type: string, hoursValue: number): number[] {
  const seen = new Set<number>()
  for (const v of horizon()) if (v.type === type) seen.add(v.durationHours)
  return [...seen].filter((h) => h !== hoursValue).sort((a, b) => a - b)
}

/** Consecutive visits for one caregiver closer together than the buffer. */
export function bufferImpact(buffer: BufferSettings): Impact {
  const rows: { label: string }[] = []
  const seen = new Set<string>()

  for (let i = -HORIZON_BACK; i <= HORIZON_FORWARD; i += 1) {
    const date = addDays(TODAY, i)
    for (const member of staffMembers) {
      const mine = boardOn(date)
        .filter((v) => v.caregiverId === member.id)
        .sort((a, b) => a.start.localeCompare(b.start))

      for (let j = 0; j < mine.length - 1; j += 1) {
        const gap =
          minutesOfDay(formatTime(mine[j + 1].start)) -
          minutesOfDay(formatTime(mine[j].end))
        if (gap < 0) continue // an overlap; the board reports that separately
        if (gap === 0 && buffer.allowBackToBack) continue
        if (gap >= buffer.minutes) continue
        const label = `${member.name}: ${gap} min between ${mine[j].recipientName} and ${mine[j + 1].recipientName}`
        if (seen.has(label)) continue
        seen.add(label)
        rows.push({ label })
      }
    }
  }
  return summarise(rows)
}

/** What turning a rule on would flag on the current rota. */
export function ruleImpact(id: RuleId, on: boolean): Impact {
  if (!on) return none

  if (id === 'allow-overtime') return none

  if (id === 'certification-match') {
    const seen = new Set<string>()
    const rows: { label: string }[] = []
    for (const v of horizon()) {
      if (!v.caregiverId) continue
      const required = requirementFor(v.type)
      if (required === null) continue
      const member = staffMembers.find((m) => m.id === v.caregiverId)
      if (!member) continue
      const holds = credentialStates(member, TODAY).some(
        (c) => c.credential.name === required && c.state !== 'expired',
      )
      if (holds) continue
      // Deduped on the same axis as `hoursImpact` — recipient, weekday and
      // clock — so the count means what the page says it means. Rolling up by
      // caregiver instead reported 1 where 89 visits breach the rule.
      const key = `${member.id} ${describe(v)}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({ label: `${member.name} on ${describe(v)} without ${required}` })
    }
    return summarise(rows)
  }

  return none
}

/**
 * Caregivers already rostered past their contract, when overtime is off.
 *
 * Rostered hours, from the same `weekSummary` the board's own over-contract
 * conflict uses. `weeklyHours` sums the *availability grid* — the hours someone
 * could work — which counted two coordinators with no visits at all and put
 * John Adams at 84h where the board says 70.
 */
export function overtimeImpact(allowed: boolean): Impact {
  if (allowed) return none
  const rows = staffMembers.flatMap((m) => {
    const week = weekSummary(m, scheduleFor(m, weekStart(TODAY)))
    if (week.visits === 0 || week.hours <= m.maxHoursPerWeek) return []
    return [
      {
        label: `${m.name}: ${week.hours}h rostered against a ${m.maxHoursPerWeek}h contract`,
      },
    ]
  })
  return summarise(rows)
}

/**
 * Visits already on the board on a day the calendar marks closed. Looks at the
 * holiday's own date, which can be beyond the horizon the other checks use —
 * the page says as much rather than implying one window covers everything.
 */
export function holidayImpact(holiday: Holiday, today = TODAY): Impact {
  if (holiday.policy === 'normal') return none
  const date = nextOccurrence(holiday, today)
  const rows = boardOn(date).map((v) => ({
    label: `${v.recipientName}, ${formatTime(v.start)} ${v.type}`,
  }))
  return summarise(rows, 2)
}

/** Staff whose credentials have lapsed — relevant to the certification rule. */
export function lapsedStaff(): string[] {
  return staffMembers
    .filter((m) => complianceFor(m, TODAY) === 'expired')
    .map((m) => m.name)
}

/* --------------------------------- equality -------------------------------- */

/** Whether anything has been changed, so Save can say so. */
export function isDirty(a: ScheduleSettings, b: ScheduleSettings): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

export function changedCount(a: ScheduleSettings, b: ScheduleSettings): number {
  let n = 0
  for (const day of a.hours) {
    const other = b.hours.find((h) => h.day === day.day)
    if (
      !other ||
      other.open !== day.open ||
      other.start !== day.start ||
      other.end !== day.end
    )
      n += 1
  }
  for (const [type, value] of Object.entries(a.durations))
    if (b.durations[type] !== value) n += 1
  for (const rule of ruleDefinitions)
    if (a.rules[rule.id] !== b.rules[rule.id]) n += 1
  if (a.buffer.minutes !== b.buffer.minutes) n += 1
  if (a.buffer.allowBackToBack !== b.buffer.allowBackToBack) n += 1
  if (a.buffer.estimateTravel !== b.buffer.estimateTravel) n += 1
  if (a.buffer.maxTravelMiles !== b.buffer.maxTravelMiles) n += 1
  if (a.reminderMinutes !== b.reminderMinutes) n += 1
  // Every holiday present in one list and not the other, counted once. The
  // loop below already covers removals; adding the length delta on top counted
  // four removals as five changes.
  for (const holiday of a.holidays) {
    const other = b.holidays.find((h) => h.id === holiday.id)
    if (!other || other.policy !== holiday.policy) n += 1
  }
  n += b.holidays.filter((h) => !a.holidays.some((x) => x.id === h.id)).length
  return n
}

export { dayOf }
