import { coordinators, recipients } from './data'
import { RATE_PER_HOUR, planById, plans } from '@/features/billing/data'
import type { PlanId } from '@/features/billing/data'
import { getPlanDetail } from '@/features/billing/plan-catalogue'
import type { ServiceId } from '@/features/billing/plan-catalogue'
import { TODAY } from '@/lib/today'
import type { Tone } from '@/types'

export { TODAY }
export type { ServiceId }

/* ---------------------------------- types --------------------------------- */

export type PaymentCheck = 'verified' | 'pending' | 'failed'

/** What the coordinator has decided, as distinct from what is blocking. */
export type Decision = 'undecided' | 'approved' | 'rejected'

/**
 * The overall queue state. Derived from the decision plus whatever is blocking,
 * never stored: the source design carried a status column that disagreed with
 * the payment and document columns sitting beside it.
 */
export type RequestStatus =
  | 'approved'
  | 'rejected'
  | 'ready'
  | 'pending-review'
  | 'needs-changes'

export type DocKind = 'identity' | 'medical' | 'insurance' | 'home-survey'

export type DocsStatus = 'complete' | 'incomplete' | 'missing'

export type Priority = 'high' | 'medium' | 'low'

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface RequestSchedule {
  days: Weekday[]
  /** 24-hour, "09:00". */
  start: string
  end: string
}

export interface UploadedDoc {
  id: string
  kind: DocKind
  name: string
  /** ISO. */
  uploadedAt: string
}

/** A stated need, tagged with the catalogue service that would cover it. */
export interface SpecialNeed {
  label: string
  /** A `serviceCatalogue` id, where one covers it. */
  service?: ServiceId
}

export interface CareRequest {
  id: string
  /** Human-facing reference, e.g. CR-2026-104. */
  ref: string
  patient: {
    name: string
    age: number
    sex: string
    conditions: string[]
  }
  contact: {
    name: string
    relationship: string
    phone: string
    email: string
    address: string
  }
  planId: PlanId
  schedule: RequestSchedule
  specialNeeds: SpecialNeed[]
  documents: UploadedDoc[]
  payment: PaymentCheck
  /** ISO. */
  submittedAt: string
  coordinator: (typeof coordinators)[number] | null
  decision: Decision
}

export const REQUESTS_PAGE_SIZE = 8

/* --------------------------------- labels --------------------------------- */

export const statusLabels: Record<RequestStatus, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  ready: 'Ready to schedule',
  'pending-review': 'Pending review',
  'needs-changes': 'Needs changes',
}

export const statusTones: Record<RequestStatus, Tone> = {
  approved: 'green',
  rejected: 'red',
  ready: 'blue',
  'pending-review': 'amber',
  'needs-changes': 'red',
}

export const paymentLabels: Record<PaymentCheck, string> = {
  verified: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
}

export const paymentTones: Record<PaymentCheck, Tone> = {
  verified: 'green',
  pending: 'amber',
  failed: 'red',
}

export const docsLabels: Record<DocsStatus, string> = {
  complete: 'Complete',
  incomplete: 'Incomplete',
  missing: 'Missing',
}

export const docsTones: Record<DocsStatus, Tone> = {
  complete: 'green',
  incomplete: 'amber',
  missing: 'red',
}

export const priorityLabels: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const priorityTones: Record<Priority, Tone> = {
  high: 'red',
  medium: 'amber',
  low: 'slate',
}

export const docKindLabels: Record<DocKind, string> = {
  identity: 'Identity verification',
  medical: 'Medical records',
  insurance: 'Insurance details',
  'home-survey': 'Home survey',
}

/* ---------------------------------- data ---------------------------------- */

/*
 * Prospective clients only. The source design listed Margaret Johnson and
 * Eleanor Davis here, both of whom are already active recipients with live
 * invoices — a request is someone who is not a client yet, so having one in the
 * intake queue would onboard them a second time.
 */
const requests: CareRequest[] = [
  {
    id: 'cr-2026-104',
    ref: 'CR-2026-104',
    patient: {
      name: 'Folake Adeyemi',
      age: 74,
      sex: 'Female',
      conditions: ['Type 2 diabetes', 'Reduced mobility'],
    },
    contact: {
      name: 'Tunde Adeyemi',
      relationship: 'Son',
      phone: '(555) 214-8890',
      email: 'tunde.adeyemi@example.com',
      address: '12 Adeola Odeku Street, Victoria Island, Lagos',
    },
    planId: 'standard',
    schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '09:00', end: '11:00' },
    specialNeeds: [
      { label: 'Insulin administration', service: 'medication' },
      { label: 'Assistance walking', service: 'mobility' },
    ],
    documents: [
      { id: 'd1', kind: 'identity', name: 'Identity_Verification_Folake.pdf', uploadedAt: '2026-07-23' },
      { id: 'd2', kind: 'medical', name: 'Medical_Records_Endocrine.pdf', uploadedAt: '2026-07-23' },
      { id: 'd3', kind: 'insurance', name: 'MedCare_Policy_Adeyemi.pdf', uploadedAt: '2026-07-23' },
    ],
    payment: 'verified',
    submittedAt: '2026-07-23',
    coordinator: 'Mike Chen',
    decision: 'approved',
  },
  {
    id: 'cr-2026-103',
    ref: 'CR-2026-103',
    patient: {
      name: 'Chidi Okonkwo',
      age: 69,
      sex: 'Male',
      conditions: ['Post-operative recovery'],
    },
    contact: {
      name: 'Ngozi Okonkwo',
      relationship: 'Daughter',
      phone: '(555) 331-0247',
      email: 'ngozi.okonkwo@example.com',
      address: '5 Awolowo Road, Ikoyi, Lagos',
    },
    planId: 'flexible',
    schedule: { days: ['Tue', 'Thu'], start: '10:00', end: '13:00' },
    // Nurse oversight, which the hourly plan explicitly excludes.
    specialNeeds: [{ label: 'Wound dressing checks', service: 'clinical' }],
    documents: [
      { id: 'd4', kind: 'identity', name: 'Identity_Verification_Chidi.pdf', uploadedAt: '2026-07-22' },
    ],
    payment: 'pending',
    submittedAt: '2026-07-22',
    coordinator: null,
    decision: 'undecided',
  },
  {
    id: 'cr-2026-102',
    ref: 'CR-2026-102',
    patient: {
      name: 'George Hartley',
      age: 81,
      sex: 'Male',
      conditions: ['Congestive heart failure', 'Hypertension'],
    },
    contact: {
      name: 'Marianne Hartley',
      relationship: 'Wife',
      phone: '(555) 662-1194',
      email: 'm.hartley@example.com',
      address: '88 Kingsway Road, Ikoyi, Lagos',
    },
    planId: 'premium',
    schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '08:00', end: '10:45' },
    specialNeeds: [
      { label: 'Daily vitals', service: 'clinical' },
      { label: 'Medication administration', service: 'medication' },
    ],
    documents: [
      { id: 'd5', kind: 'identity', name: 'Identity_Verification_George.pdf', uploadedAt: '2026-07-21' },
      { id: 'd6', kind: 'medical', name: 'Medical_Records_Cardio.pdf', uploadedAt: '2026-07-21' },
      { id: 'd7', kind: 'insurance', name: 'MedCare_Policy_Hartley.pdf', uploadedAt: '2026-07-21' },
    ],
    payment: 'verified',
    submittedAt: '2026-07-21',
    coordinator: 'Dr. Jane Foster',
    decision: 'undecided',
  },
  {
    id: 'cr-2026-101',
    ref: 'CR-2026-101',
    patient: {
      name: 'Aisha Bello',
      age: 77,
      sex: 'Female',
      conditions: ['Advanced dementia'],
    },
    contact: {
      name: 'Aminu Bello',
      relationship: 'Son',
      phone: '(555) 490-3312',
      email: 'aminu.bello@example.com',
      address: '23 Gana Street, Maitama, Abuja',
    },
    planId: 'live-in',
    schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], start: '08:00', end: '17:00' },
    specialNeeds: [
      { label: 'Overnight supervision', service: 'overnight' },
      { label: 'Wandering risk' },
    ],
    documents: [],
    payment: 'failed',
    submittedAt: '2026-07-19',
    coordinator: null,
    decision: 'undecided',
  },
  {
    id: 'cr-2026-100',
    ref: 'CR-2026-100',
    patient: {
      name: 'Yuki Nakamura',
      age: 72,
      sex: 'Female',
      conditions: ['Parkinson’s disease'],
    },
    contact: {
      name: 'Kenji Nakamura',
      relationship: 'Son',
      phone: '(555) 118-7745',
      email: 'kenji.nakamura@example.com',
      address: '41 Glover Road, Ikoyi, Lagos',
    },
    planId: 'standard',
    // Deliberately above the Standard allowance: the rota is the thing the
    // queue has to catch, because the family picked the plan, not the agency.
    schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu'], start: '09:00', end: '12:00' },
    specialNeeds: [
      { label: 'Mobility support', service: 'mobility' },
      { label: 'Meal preparation', service: 'meals' },
    ],
    documents: [
      { id: 'd8', kind: 'identity', name: 'Identity_Verification_Yuki.pdf', uploadedAt: '2026-07-18' },
      { id: 'd9', kind: 'medical', name: 'Medical_Records_Neuro.pdf', uploadedAt: '2026-07-18' },
    ],
    payment: 'pending',
    submittedAt: '2026-07-18',
    coordinator: null,
    decision: 'undecided',
  },
  {
    id: 'cr-2026-099',
    ref: 'CR-2026-099',
    patient: {
      name: 'Musa Ibrahim',
      age: 84,
      sex: 'Male',
      conditions: ['Stroke recovery', 'Aphasia'],
    },
    contact: {
      name: 'Halima Ibrahim',
      relationship: 'Daughter',
      phone: '(555) 773-2018',
      email: 'halima.ibrahim@example.com',
      address: '7 Yakubu Gowon Crescent, Asokoro, Abuja',
    },
    planId: 'live-in',
    schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], start: '07:00', end: '16:00' },
    specialNeeds: [
      { label: 'Speech therapy support', service: 'clinical' },
      { label: 'Transfer assistance', service: 'mobility' },
    ],
    documents: [
      { id: 'd10', kind: 'identity', name: 'Identity_Verification_Musa.pdf', uploadedAt: '2026-07-17' },
      { id: 'd11', kind: 'medical', name: 'Medical_Records_Stroke.pdf', uploadedAt: '2026-07-17' },
      { id: 'd12', kind: 'home-survey', name: 'Home_Survey_Asokoro.pdf', uploadedAt: '2026-07-18' },
    ],
    payment: 'verified',
    submittedAt: '2026-07-17',
    coordinator: 'Amara Nwosu',
    decision: 'undecided',
  },
  {
    id: 'cr-2026-098',
    ref: 'CR-2026-098',
    patient: {
      name: 'Ngozi Eze',
      age: 79,
      sex: 'Female',
      conditions: ['Chronic kidney disease'],
    },
    contact: {
      name: 'Emeka Eze',
      relationship: 'Son',
      phone: '(555) 204-9963',
      email: 'emeka.eze@example.com',
      address: '19 Rumuola Road, Port Harcourt',
    },
    planId: 'premium',
    schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '08:00', end: '10:45' },
    specialNeeds: [
      { label: 'Dialysis transport', service: 'transport' },
      { label: 'Fluid monitoring', service: 'clinical' },
    ],
    documents: [
      { id: 'd13', kind: 'identity', name: 'Identity_Verification_Ngozi.pdf', uploadedAt: '2026-07-16' },
      { id: 'd14', kind: 'medical', name: 'Medical_Records_Renal.pdf', uploadedAt: '2026-07-16' },
      { id: 'd15', kind: 'insurance', name: 'MedCare_Policy_Eze.pdf', uploadedAt: '2026-07-16' },
    ],
    payment: 'failed',
    submittedAt: '2026-07-16',
    coordinator: 'Dr. Jane Foster',
    decision: 'rejected',
  },
  {
    id: 'cr-2026-097',
    ref: 'CR-2026-097',
    patient: {
      name: 'Robert Williams',
      age: 82,
      sex: 'Male',
      conditions: ['Mild dementia', 'Hypertension'],
    },
    contact: {
      name: 'Arthur Williams',
      relationship: 'Son',
      phone: '(555) 019-2834',
      email: 'arthur.williams@example.com',
      address: '742 Ikorodu Road, Maryland, Lagos',
    },
    /*
     * Flexible with a 30-hour week. The hourly plan has no ceiling, so the rota
     * itself is legal — it just bills ₦19,500 a month. What the queue has to
     * catch is that the plan carries no medication support and no mobility
     * assistance, and both are in the stated needs below.
     */
    planId: 'flexible',
    schedule: { days: ['Mon', 'Wed', 'Fri'], start: '09:00', end: '19:00' },
    specialNeeds: [
      { label: 'Medication administration', service: 'medication' },
      { label: 'Companionship during lunch', service: 'companionship' },
      { label: 'Assistance walking', service: 'mobility' },
    ],
    documents: [
      { id: 'd16', kind: 'identity', name: 'Identity_Verification_Robert.pdf', uploadedAt: '2026-07-15' },
    ],
    payment: 'pending',
    submittedAt: '2026-07-15',
    coordinator: null,
    decision: 'undecided',
  },
  {
    id: 'cr-2026-096',
    ref: 'CR-2026-096',
    patient: {
      name: 'Grace Smith',
      age: 68,
      sex: 'Female',
      conditions: ['Rheumatoid arthritis'],
    },
    contact: {
      name: 'Daniel Smith',
      relationship: 'Husband',
      phone: '(555) 887-4410',
      email: 'daniel.smith@example.com',
      address: '30 Bourdillon Road, Ikoyi, Lagos',
    },
    planId: 'flexible',
    schedule: { days: ['Tue', 'Thu'], start: '14:00', end: '16:00' },
    specialNeeds: [{ label: 'Meal preparation', service: 'meals' }],
    documents: [
      { id: 'd17', kind: 'identity', name: 'Identity_Verification_Grace.pdf', uploadedAt: '2026-07-14' },
      { id: 'd18', kind: 'medical', name: 'Medical_Records_Rheum.pdf', uploadedAt: '2026-07-14' },
    ],
    payment: 'verified',
    submittedAt: '2026-07-14',
    coordinator: 'Mike Chen',
    decision: 'approved',
  },
  {
    id: 'cr-2026-095',
    ref: 'CR-2026-095',
    patient: {
      name: 'Halima Danjuma',
      age: 76,
      sex: 'Female',
      conditions: ['COPD'],
    },
    contact: {
      name: 'Ibrahim Danjuma',
      relationship: 'Son',
      phone: '(555) 556-3021',
      email: 'i.danjuma@example.com',
      address: '14 Aminu Kano Crescent, Wuse II, Abuja',
    },
    planId: 'premium',
    schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '07:00', end: '09:45' },
    specialNeeds: [
      { label: 'Oxygen therapy support', service: 'clinical' },
      { label: 'Nebuliser administration', service: 'medication' },
    ],
    documents: [
      { id: 'd19', kind: 'identity', name: 'Identity_Verification_Halima.pdf', uploadedAt: '2026-07-13' },
      { id: 'd20', kind: 'medical', name: 'Medical_Records_Pulmonary.pdf', uploadedAt: '2026-07-13' },
      { id: 'd21', kind: 'insurance', name: 'MedCare_Policy_Danjuma.pdf', uploadedAt: '2026-07-14' },
    ],
    payment: 'verified',
    submittedAt: '2026-07-13',
    coordinator: 'Amara Nwosu',
    decision: 'undecided',
  },
  {
    id: 'cr-2026-094',
    ref: 'CR-2026-094',
    patient: {
      name: 'Nneka Obi',
      age: 71,
      sex: 'Female',
      conditions: ['Osteoporosis'],
    },
    contact: {
      name: 'Chinelo Obi',
      relationship: 'Daughter',
      phone: '(555) 645-7789',
      email: 'chinelo.obi@example.com',
      address: '9 Ogui Road, Enugu',
    },
    planId: 'flexible',
    schedule: { days: ['Wed'], start: '10:00', end: '13:00' },
    specialNeeds: [{ label: 'Companionship visits', service: 'companionship' }],
    documents: [
      { id: 'd22', kind: 'identity', name: 'Identity_Verification_Nneka.pdf', uploadedAt: '2026-07-11' },
      { id: 'd23', kind: 'medical', name: 'Medical_Records_Ortho.pdf', uploadedAt: '2026-07-11' },
    ],
    payment: 'verified',
    submittedAt: '2026-07-11',
    coordinator: 'Mike Chen',
    decision: 'undecided',
  },
  {
    id: 'cr-2026-093',
    ref: 'CR-2026-093',
    patient: {
      name: 'Chidinma Achebe',
      age: 66,
      sex: 'Female',
      conditions: ['Early-stage Alzheimer’s'],
    },
    contact: {
      name: 'Obiora Achebe',
      relationship: 'Husband',
      phone: '(555) 310-6628',
      email: 'obiora.achebe@example.com',
      address: '52 Ademola Adetokunbo Crescent, Wuse II, Abuja',
    },
    planId: 'standard',
    schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu'], start: '13:00', end: '15:30' },
    specialNeeds: [
      { label: 'Cognitive engagement', service: 'companionship' },
      { label: 'Routine supervision' },
    ],
    documents: [
      { id: 'd24', kind: 'identity', name: 'Identity_Verification_Chidinma.pdf', uploadedAt: '2026-07-09' },
      { id: 'd25', kind: 'medical', name: 'Medical_Records_Neurology.pdf', uploadedAt: '2026-07-09' },
      { id: 'd26', kind: 'insurance', name: 'MedCare_Policy_Achebe.pdf', uploadedAt: '2026-07-10' },
    ],
    payment: 'verified',
    submittedAt: '2026-07-09',
    coordinator: null,
    decision: 'undecided',
  },
]

/** Newest first, the way a queue is worked. */
export const careRequests: CareRequest[] = [...requests].sort((a, b) =>
  b.submittedAt.localeCompare(a.submittedAt),
)

export function getCareRequest(id: string | undefined): CareRequest | undefined {
  return careRequests.find((r) => r.id === id)
}

/* --------------------------------- derived -------------------------------- */

/** "Adeyemi Family" from "Folake Adeyemi" — never stored beside the name. */
export function familyNameFor(name: string): string {
  const surname = name.trim().split(/\s+/).at(-1) ?? name
  return `${surname} Family`
}

const DAY_MS = 86_400_000

export function daysWaiting(request: CareRequest, today = TODAY): number {
  const from = new Date(`${request.submittedAt}T00:00:00Z`).getTime()
  const now = new Date(`${today}T00:00:00Z`).getTime()
  return Math.max(0, Math.round((now - from) / DAY_MS))
}

function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function dailyHours(schedule: RequestSchedule): number {
  return (minutes(schedule.end) - minutes(schedule.start)) / 60
}

export function weeklyHours(schedule: RequestSchedule): number {
  return schedule.days.length * dailyHours(schedule)
}

/** 52 weeks over 12 months, so a weekly rota and a monthly plan compare. */
export function monthlyHours(schedule: RequestSchedule): number {
  return Math.round((weeklyHours(schedule) * 52) / 12)
}

export function formatSchedule(schedule: RequestSchedule): string {
  return `${schedule.days.join(', ')} · ${schedule.start}–${schedule.end}`
}

/**
 * Documents the plan actually requires, read off the plan rather than a fixed
 * list: only the insurance-billed plans need a policy, and only Live-in needs
 * a home survey (see the plan catalogue's eligibility rules).
 */
export function requiredDocuments(planId: PlanId): DocKind[] {
  const base: DocKind[] = ['identity', 'medical']
  if (planId === 'live-in') return [...base, 'home-survey']
  if (planId === 'flexible') return base
  return [...base, 'insurance']
}

export function missingDocuments(request: CareRequest): DocKind[] {
  const held = new Set(request.documents.map((d) => d.kind))
  return requiredDocuments(request.planId).filter((kind) => !held.has(kind))
}

export function docsStatus(request: CareRequest): DocsStatus {
  const missing = missingDocuments(request)
  if (missing.length === 0) return 'complete'
  // Measured against what the plan requires, not against the upload count:
  // three irrelevant uploads and nothing required is still "missing".
  return missing.length === requiredDocuments(request.planId).length
    ? 'missing'
    : 'incomplete'
}

export interface PlanFit {
  requestedHours: number
  /** Undefined on a pay-per-hour plan, which has no ceiling. */
  allowanceHours: number | undefined
  /** Positive when the rota asks for more than a capped plan covers. */
  overBy: number
  fits: boolean
  /**
   * The list price on a capped plan, or the metered cost on the hourly plan.
   * It is not adjusted for `overBy`: the point of a capped plan being exceeded
   * is that the extra hours aren't covered at all.
   */
  estimatedCost: number
  /** The cheapest plan whose allowance covers the rota; none may. */
  suggested: PlanId | undefined
}

/**
 * The smallest capped plan whose monthly allowance covers `hours`, or undefined
 * when none does. It used to fall back to the largest plan, which produced
 * "Live-in doesn't cover this rota — Live-in covers it" on any request above
 * 300 hours.
 */
export function bestPlanFor(hours: number): PlanId | undefined {
  return [...plans]
    .filter((p) => p.model !== 'per-hour')
    .sort((a, b) => a.hoursPerMonth - b.hoursPerMonth)
    .find((p) => p.hoursPerMonth >= hours)?.id
}

/**
 * Whether the requested rota fits the requested plan.
 *
 * Only a capped plan can be exceeded. The hourly plan's ten hours is a
 * contractual *minimum*, not a ceiling — treating it as one flagged three
 * quarters of the queue and made the column worthless.
 */
export function planFit(request: CareRequest): PlanFit {
  const plan = planById[request.planId]
  const requested = monthlyHours(request.schedule)
  const capped = plan.model !== 'per-hour'
  const allowance = capped ? plan.hoursPerMonth : undefined

  return {
    requestedHours: requested,
    allowanceHours: allowance,
    overBy: allowance ? Math.max(0, requested - allowance) : 0,
    fits: allowance === undefined || requested <= allowance,
    // An hourly plan bills what is used, above the monthly minimum.
    estimatedCost: capped
      ? plan.monthlyPrice
      : Math.max(plan.monthlyPrice, Math.round(requested * RATE_PER_HOUR)),
    suggested: bestPlanFor(requested),
  }
}

/**
 * Stated needs the requested plan doesn't include. This is the check the source
 * design was reaching for: a dementia patient was put on the hourly plan with
 * "medication administration" among the special needs, and the hourly plan
 * carries no medication support at all.
 */
export function serviceGaps(request: CareRequest): SpecialNeed[] {
  const included = new Set(getPlanDetail(request.planId).services)
  return request.specialNeeds.filter(
    (need) => need.service !== undefined && !included.has(need.service),
  )
}

/** The cheapest plan that includes every service the request needs. */
export function bestPlanForServices(request: CareRequest): PlanId {
  const needed = request.specialNeeds
    .map((n) => n.service)
    .filter((id): id is ServiceId => id !== undefined)

  const covering = [...plans]
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice)
    .find((p) => {
      const included = new Set(getPlanDetail(p.id).services)
      return needed.every((id) => included.has(id))
    })
  return (covering ?? planById['live-in']).id
}

/**
 * Computed, not asserted: how much care the family actually asked for, whether
 * it is clinical, and how long they have been waiting.
 *
 * Scored off the requested rota rather than the plan's nominal allowance — the
 * plan is the family's guess, and scoring it made Standard and Premium
 * indistinguishable while a 130-hour hourly request ranked below a 13-hour one.
 */
export function priorityFor(request: CareRequest, today = TODAY): Priority {
  const hours = monthlyHours(request.schedule)
  const load = hours >= 200 ? 2 : hours >= 45 ? 1 : 0

  const clinical = request.specialNeeds.some(
    (n) => n.service === 'clinical' || n.service === 'overnight',
  )
    ? 1
    : 0

  const waited = daysWaiting(request, today) >= 5 ? 1 : 0
  const score = load + clinical + waited
  return score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low'
}

export interface Blocker {
  id: string
  label: string
  detail: string
}

/** Everything standing between the request and an approval. */
export function blockers(request: CareRequest): Blocker[] {
  const list: Blocker[] = []

  if (request.payment !== 'verified') {
    list.push({
      id: 'payment',
      label:
        request.payment === 'failed'
          ? 'Payment failed'
          : 'Payment not verified',
      detail:
        request.payment === 'failed'
          ? 'The first charge was declined; the family needs to re-enter a method.'
          : 'The deposit has not cleared yet.',
    })
  }

  const missing = missingDocuments(request)
  if (missing.length > 0) {
    list.push({
      id: 'docs',
      label: `${missing.length} document${missing.length > 1 ? 's' : ''} outstanding`,
      detail: missing.map((k) => docKindLabels[k]).join(', '),
    })
  }

  const fit = planFit(request)
  if (!fit.fits) {
    list.push({
      id: 'plan',
      label: 'Requested plan does not cover the rota',
      detail: fit.suggested
        ? `${fit.requestedHours} hours a month requested against a ${fit.allowanceHours}-hour allowance. ${planById[fit.suggested].name} covers it.`
        : `${fit.requestedHours} hours a month requested against a ${fit.allowanceHours}-hour allowance. No catalogue plan covers this rota; it needs a bespoke quote.`,
    })
  }

  const gaps = serviceGaps(request)
  if (gaps.length > 0) {
    list.push({
      id: 'services',
      label: `${planById[request.planId].name} excludes ${gaps.length} stated need${gaps.length > 1 ? 's' : ''}`,
      detail: `${gaps.map((g) => g.label).join(', ')}. ${planById[bestPlanForServices(request)].name} includes them.`,
    })
  }

  if (alreadyInDirectory(request)) {
    list.push({
      id: 'duplicate',
      label: 'Already a care recipient',
      detail: `${request.patient.name} is in the directory. Approving would onboard them twice.`,
    })
  }

  if (!request.coordinator) {
    list.push({
      id: 'coordinator',
      label: 'No coordinator assigned',
      detail: 'A coordinator has to own the request before it can be scheduled.',
    })
  }

  return list
}

/** Derived from the decision and the blockers, so no column can disagree. */
export function statusFor(request: CareRequest): RequestStatus {
  if (request.decision === 'rejected') return 'rejected'
  if (request.decision === 'approved') return 'approved'
  const open = blockers(request)
  if (open.length === 0) return 'ready'
  /*
   * "Needs changes" means the family has to act. A coordinator we haven't
   * assigned yet and a deposit still clearing are both ours to wait on, so a
   * request blocked only on those is under review, not bounced back.
   */
  const oursToChase = (b: Blocker) =>
    b.id === 'coordinator' || (b.id === 'payment' && request.payment === 'pending')
  return open.every(oursToChase) ? 'pending-review' : 'needs-changes'
}

export function canApprove(request: CareRequest): boolean {
  return request.decision === 'undecided' && blockers(request).length === 0
}

/* -------------------------------- summaries -------------------------------- */

/** Requests still waiting on the agency or the family. */
export function pendingRequestCount(): number {
  return careRequests.filter((r) => {
    const status = statusFor(r)
    return status === 'pending-review' || status === 'needs-changes'
  }).length
}

export function statusCounts(): Record<RequestStatus, number> {
  const counts: Record<RequestStatus, number> = {
    approved: 0,
    rejected: 0,
    ready: 0,
    'pending-review': 0,
    'needs-changes': 0,
  }
  for (const r of careRequests) counts[statusFor(r)] += 1
  return counts
}

/**
 * An approved request becomes a recipient, so nobody in the directory should
 * also be sitting in intake. Surfaced as a blocker rather than left as a
 * comment: the source design had two active clients in this queue.
 */
export function alreadyInDirectory(request: CareRequest): boolean {
  return recipients.some((r) => r.name === request.patient.name)
}

/* ---------------------------------- sort ---------------------------------- */

export type RequestSort = 'priority' | 'newest' | 'oldest'

export const sortOptions: { value: RequestSort; label: string }[] = [
  { value: 'priority', label: 'Priority, longest waiting' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

/** Default is priority, because a queue sorted newest-first buries the urgent. */
export function sortRequests(
  list: CareRequest[],
  order: RequestSort,
): CareRequest[] {
  const sorted = [...list]
  if (order === 'newest')
    return sorted.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  if (order === 'oldest')
    return sorted.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  return sorted.sort(
    (a, b) =>
      priorityRank[priorityFor(a)] - priorityRank[priorityFor(b)] ||
      a.submittedAt.localeCompare(b.submittedAt),
  )
}
