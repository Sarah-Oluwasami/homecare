import {
  assignmentsFor,
  complianceFor,
  credentialStates,
  performanceFor,
  staffMembers,
} from '@/features/caregivers/roster-data'
import type { StaffMember } from '@/features/caregivers/roster-data'
import { getCaregiverRecord } from '@/features/care-recipients/caregivers-data'
import {
  formatTime,
  scheduleFor,
  weekStart,
  weekSummary,
} from '@/features/caregivers/schedule-data'
import { boardOn } from './board-data'
import type { BoardVisit } from './board-data'
import { TODAY } from '@/lib/today'

export { TODAY, formatTime }

/* ------------------------------- requirements ------------------------------ */

/*
 * What a service actually needs someone to hold. Named against the credentials
 * in the staff fixture, so "has the certification" is a lookup rather than a
 * claim typed onto a card — the source design put "Best Match" on the one
 * caregiver with no wound-care certification at all.
 */
const requiredCredential: Record<string, string> = {
  'Wound Care': 'Wound care specialist',
  Medication: 'Medication administration',
  'Medication Review': 'Medication administration',
  'Clinical Assessment': 'RN licence',
  'Clinical Checkup': 'RN licence',
  'Live-in Care': 'Care certificate',
}

/** Skills that make someone a natural fit for a service. */
const relevantSkills: Record<string, string[]> = {
  'Wound Care': ['Wound care', 'Vital signs', 'Clinical assessment'],
  'Morning Care': ['Personal hygiene', 'Meal preparation', 'Mobility support'],
  'Afternoon Care': ['Companionship', 'Meal preparation', 'Mobility support'],
  'Evening Care': ['Evening routine', 'Meal preparation', 'Companionship'],
  'Evening Routine': ['Evening routine', 'Meal preparation', 'Companionship'],
  Medication: ['Medication administration', 'Medication review'],
  'Medication Review': ['Medication review', 'Medication administration'],
  'Clinical Assessment': ['Clinical assessment', 'Vital signs'],
  'Clinical Checkup': ['Clinical assessment', 'Vital signs'],
  'Physical Therapy': ['Physical therapy assist', 'Mobility support'],
  'Live-in Care': ['Overnight cover', 'Personal hygiene', 'Companionship'],
  'Onboarding visit': ['Care planning', 'Family relations'],
}

export function requirementFor(type: string): string | null {
  return requiredCredential[type] ?? null
}

/* --------------------------------- factors --------------------------------- */

export type FactorWeight = 'blocker' | 'caution' | 'plus'

export interface Factor {
  id: string
  label: string
  detail: string
  weight: FactorWeight
}

export type Coverage = 'full' | 'partial' | 'none'

/** One line of the score, so the number on the card can be added up. */
export interface ScorePart {
  id: string
  label: string
  points: number
  max: number
}

export interface Candidate {
  member: StaffMember
  /** Already on this visit — a reassignment is not an assignment. */
  current: boolean
  /** `false` when a blocker applies — the card offers no Assign button. */
  eligible: boolean
  /** 0–100, or null when a blocker applies and ranking is meaningless. */
  score: number | null
  scoreParts: ScorePart[]
  factors: Factor[]
  coverage: Coverage
  /** The availability window on the visit's weekday, if there is one. */
  window: { start: string; end: string } | null
  /** An existing booking this visit would collide with. */
  clash: BoardVisit | null
  /** Visits already on their board that day. */
  dayLoad: number
  /** Contracted hours and what this week already holds. */
  weekHours: number
  contractHours: number
  hasCredential: boolean
  matchedSkills: string[]
  /** Already named on this client's care team. */
  continuity: boolean
  rating: number | null
  ratedOn: number
  caseload: number
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd
}

function coverageOf(
  member: StaffMember,
  visit: BoardVisit,
): { coverage: Coverage; window: { start: string; end: string } | null } {
  const window = member.availability.find((w) => w.day === visit.day) ?? null
  if (!window) return { coverage: 'none', window: null }
  if (window.start <= visit.start && window.end >= visit.end)
    return { coverage: 'full', window }
  if (overlaps(visit.start, visit.end, window.start, window.end))
    return { coverage: 'partial', window }
  return { coverage: 'none', window }
}

/* --------------------------------- scoring --------------------------------- */

/*
 * The score is the parts listed on the card and nothing else. A criterion that
 * cannot apply — a service with no required certification, a caregiver nobody
 * has rated yet — is left out of both the points and the total rather than
 * silently scored, so the percentage is always out of what was actually
 * assessed. Nothing here is stored; change a credential's expiry date and the
 * ranking moves.
 */
const WEIGHTS = {
  credential: 40,
  coverageFull: 25,
  coveragePartial: 10,
  continuity: 15,
  skills: 10,
  rating: 10,
  overContract: -10,
} as const

export function buildCandidate(visit: BoardVisit, member: StaffMember): Candidate {
  const factors: Factor[] = []
  const required = requirementFor(visit.type)
  const asAt = visit.date > TODAY ? visit.date : TODAY
  const current = member.id === visit.caregiverId

  /* ------------------------------- blockers ------------------------------- */

  if (member.status !== 'active') {
    factors.push({
      id: 'status',
      label: 'Not available for work',
      detail:
        member.status === 'on-leave'
          ? 'Currently on leave.'
          : 'Marked inactive on the roster.',
      weight: 'blocker',
    })
  }

  if (member.title === 'Care Coordinator') {
    factors.push({
      id: 'role',
      label: 'Coordinators do not take visits',
      detail: 'They hold cases and supervise; they are never on the rota.',
      weight: 'blocker',
    })
  }

  const compliance = complianceFor(member, asAt)
  const lapsed = credentialStates(member, asAt).filter((c) => c.state === 'expired')
  if (compliance === 'expired') {
    factors.push({
      id: 'compliance',
      label: 'Lapsed credential',
      detail: `${lapsed.map((c) => c.credential.name).join(', ')} out of date as at ${asAt}.`,
      weight: 'blocker',
    })
  }

  // This visit is excluded throughout: reassigning someone must not count
  // their own booking as a clash, as another visit on their day, or as hours
  // they would be taking on for a second time.
  const sameDay = boardOn(visit.date).filter(
    (v) => v.caregiverId === member.id && v.id !== visit.id,
  )
  const clash =
    sameDay.find((v) => overlaps(visit.start, visit.end, v.start, v.end)) ?? null
  if (clash) {
    factors.push({
      id: 'clash',
      label: 'Already booked',
      detail: `${clash.recipientName}, ${formatTime(clash.start)}–${formatTime(clash.end)}.`,
      weight: 'blocker',
    })
  }

  /* ------------------------------- cautions ------------------------------- */

  const held = credentialStates(member, asAt)
  const hasCredential =
    required === null ||
    held.some((c) => c.credential.name === required && c.state !== 'expired')

  if (required !== null && !hasCredential) {
    factors.push({
      id: 'credential',
      // Verbatim — lower-casing turned "RN licence" into "rn licence".
      label: `Not certified: ${required}`,
      detail: `${visit.type} normally calls for it. Assigning anyway needs a coordinator's sign-off.`,
      weight: 'caution',
    })
  }

  const { coverage, window } = coverageOf(member, visit)
  if (coverage === 'none') {
    factors.push({
      id: 'availability',
      label: 'Outside their availability',
      detail: window
        ? `Their ${visit.day} window is ${formatTime(window.start)}–${formatTime(window.end)}.`
        : `They set no availability on a ${visit.day}.`,
      weight: 'caution',
    })
  } else if (coverage === 'partial') {
    factors.push({
      id: 'availability',
      label: 'Only partly inside their availability',
      detail: `Their ${visit.day} window is ${formatTime(window!.start)}–${formatTime(window!.end)}; the visit runs ${formatTime(visit.start)}–${formatTime(visit.end)}.`,
      weight: 'caution',
    })
  }

  const week = weekSummary(member, scheduleFor(member, weekStart(visit.date)))
  const weekHours =
    Math.round((week.hours - (current ? visit.durationHours : 0)) * 10) / 10
  const after = Math.round((weekHours + visit.durationHours) * 10) / 10
  const overContract = after > member.maxHoursPerWeek
  if (overContract) {
    factors.push({
      id: 'contract',
      label: 'Over their contracted week',
      detail: `${after}h against a ${member.maxHoursPerWeek}h contract once this visit is added.`,
      weight: 'caution',
    })
  }

  /* -------------------------------- pluses -------------------------------- */

  if (required !== null && hasCredential) {
    factors.push({
      id: 'credential',
      label: `Holds ${required}`,
      detail: 'In date on the day of the visit.',
      weight: 'plus',
    })
  }

  if (coverage === 'full' && window) {
    factors.push({
      id: 'availability',
      label: 'Inside their availability',
      detail: `Free on a ${visit.day} between ${formatTime(window.start)} and ${formatTime(window.end)}.`,
      weight: 'plus',
    })
  }

  const team = getCaregiverRecord(visit.recipientId)?.team ?? []
  const continuity = team.some((t) => t.name === member.name)
  if (continuity) {
    factors.push({
      id: 'continuity',
      label: 'Already on this care team',
      detail: `${visit.recipientName} knows them.`,
      weight: 'plus',
    })
  }

  const wanted = relevantSkills[visit.type] ?? []
  const matchedSkills = member.skills.filter((s) => wanted.includes(s))
  if (matchedSkills.length > 0) {
    factors.push({
      id: 'skills',
      label: `${matchedSkills.length} matching skill${matchedSkills.length === 1 ? '' : 's'}`,
      detail: matchedSkills.join(', ') + '.',
      weight: 'plus',
    })
  }

  const performance = performanceFor(member)

  /* -------------------------------- scoring ------------------------------- */

  const scoreParts: ScorePart[] = []

  // Only assessed when the service actually calls for a certification.
  if (required !== null) {
    scoreParts.push({
      id: 'credential',
      label: required,
      points: hasCredential ? WEIGHTS.credential : 0,
      max: WEIGHTS.credential,
    })
  }

  scoreParts.push({
    id: 'availability',
    label: `Free on a ${visit.day} at this time`,
    points:
      coverage === 'full'
        ? WEIGHTS.coverageFull
        : coverage === 'partial'
          ? WEIGHTS.coveragePartial
          : 0,
    max: WEIGHTS.coverageFull,
  })

  scoreParts.push({
    id: 'continuity',
    label: 'Known to this client',
    points: continuity ? WEIGHTS.continuity : 0,
    max: WEIGHTS.continuity,
  })

  if (wanted.length > 0) {
    scoreParts.push({
      id: 'skills',
      label: 'Relevant skills',
      points: Math.round((matchedSkills.length / wanted.length) * WEIGHTS.skills),
      max: WEIGHTS.skills,
    })
  }

  // Left out entirely rather than scored as zero — nobody has rated Lisa
  // Thompson, and treating that as 0.0 out of 5 penalised her for it.
  if (performance.rating !== null) {
    scoreParts.push({
      id: 'rating',
      label: 'Client rating',
      points: Math.round((performance.rating / 5) * WEIGHTS.rating),
      max: WEIGHTS.rating,
    })
  }

  if (overContract) {
    scoreParts.push({
      id: 'contract',
      label: 'Over contracted hours',
      points: WEIGHTS.overContract,
      max: 0,
    })
  }

  const earned = scoreParts.reduce((sum, p) => sum + p.points, 0)
  const attainable = scoreParts.reduce((sum, p) => sum + p.max, 0)
  const blocked = factors.some((f) => f.weight === 'blocker')

  const score =
    blocked || attainable === 0
      ? null
      : Math.max(0, Math.min(100, Math.round((earned / attainable) * 100)))

  return {
    member,
    current,
    eligible: !blocked,
    score,
    scoreParts,
    factors,
    coverage,
    window,
    clash,
    dayLoad: sameDay.length,
    weekHours,
    contractHours: member.maxHoursPerWeek,
    hasCredential,
    matchedSkills,
    continuity,
    rating: performance.rating,
    ratedOn: performance.ratedOn,
    caseload: assignmentsFor(member).length,
  }
}

/* --------------------------------- filters --------------------------------- */

export type AvailabilityFilter = 'all' | 'covered' | 'eligible'
export type CredentialFilter = 'all' | 'certified'
export type CandidateSort = 'match' | 'load' | 'rating' | 'name'

export const availabilityOptions = [
  { value: 'all', label: 'Everyone' },
  { value: 'eligible', label: 'Assignable' },
  { value: 'covered', label: 'Free at this time' },
] as const

export const sortOptions = [
  { value: 'match', label: 'Best match' },
  { value: 'load', label: 'Lightest week' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'name', label: 'Name' },
] as const

export interface CandidateQuery {
  search: string
  availability: AvailabilityFilter
  credential: CredentialFilter
  branch: string
  sort: CandidateSort
}

/**
 * Everyone on the roster, ranked. Ineligible people are kept in the list rather
 * than hidden — a coordinator needs to see *why* the obvious choice is out.
 */
export function candidatesFor(visit: BoardVisit): Candidate[] {
  return staffMembers
    .map((member) => buildCandidate(visit, member))
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        (b.score ?? -1) - (a.score ?? -1) ||
        a.member.name.localeCompare(b.member.name),
    )
}

/** Below this, the top of the list is the least-bad option, not a match. */
export const RECOMMEND_THRESHOLD = 50

/**
 * The recommendation: the best-ranked person who can take the visit, is not
 * already on it, and clears the threshold. Read from the default ranking, so
 * re-sorting the list moves the cards around but not the recommendation — and
 * a 12-out-of-100 candidate is never badged "Best match".
 */
export function bestMatch(candidates: Candidate[]): Candidate | null {
  const top = candidates.find((c) => c.eligible && !c.current)
  return top && (top.score ?? 0) >= RECOMMEND_THRESHOLD ? top : null
}

/** The top of the list even when nothing clears the threshold. */
export function topRanked(candidates: Candidate[]): Candidate | null {
  return candidates.find((c) => c.eligible && !c.current) ?? null
}

export function applyQuery(
  candidates: Candidate[],
  query: CandidateQuery,
): Candidate[] {
  const term = query.search.trim().toLowerCase()

  const filtered = candidates.filter((c) => {
    if (query.availability === 'eligible' && !c.eligible) return false
    if (query.availability === 'covered' && (!c.eligible || c.coverage !== 'full'))
      return false
    // Matches how `summarise` counts it: an ineligible person "holding" the
    // certification is not a candidate, and listing them under a certification
    // filter made the footer count disagree with the cards.
    if (query.credential === 'certified' && !(c.eligible && c.hasCredential))
      return false
    if (query.branch !== 'all' && c.member.branch !== query.branch) return false
    if (term === '') return true
    return (
      c.member.name.toLowerCase().includes(term) ||
      c.member.title.toLowerCase().includes(term) ||
      c.member.skills.some((s) => s.toLowerCase().includes(term)) ||
      c.member.credentials.some((cr) => cr.name.toLowerCase().includes(term))
    )
  })

  const byName = (a: Candidate, b: Candidate) =>
    a.member.name.localeCompare(b.member.name)

  switch (query.sort) {
    case 'load':
      // Eligible first regardless of sort — an unassignable person at the top
      // of a "lightest week" list is noise.
      return [...filtered].sort(
        (a, b) =>
          Number(b.eligible) - Number(a.eligible) ||
          a.weekHours / a.contractHours - b.weekHours / b.contractHours ||
          byName(a, b),
      )
    case 'rating':
      return [...filtered].sort(
        (a, b) =>
          Number(b.eligible) - Number(a.eligible) ||
          (b.rating ?? -1) - (a.rating ?? -1) ||
          byName(a, b),
      )
    case 'name':
      // Eligible first here too, so the "Best match" card is never below
      // somebody who cannot take the visit at all.
      return [...filtered].sort(
        (a, b) => Number(b.eligible) - Number(a.eligible) || byName(a, b),
      )
    default:
      return filtered
  }
}

/* --------------------------------- summary --------------------------------- */

export interface AssignSummary {
  total: number
  assignable: number
  free: number
  certified: number
  blocked: number
}

/** Counted from the list, never typed beside it. */
export function summarise(candidates: Candidate[]): AssignSummary {
  return {
    total: candidates.length,
    assignable: candidates.filter((c) => c.eligible).length,
    free: candidates.filter((c) => c.eligible && c.coverage === 'full').length,
    certified: candidates.filter((c) => c.eligible && c.hasCredential).length,
    blocked: candidates.filter((c) => !c.eligible).length,
  }
}

export const branchesOnRoster = [...new Set(staffMembers.map((m) => m.branch))].sort()
