/**
 * What a person has done about an alert.
 *
 * Every other fact on the monitoring screens is derived: read off the board at
 * a minute, gone when it stops being true. These are the opposite kind of thing
 * — somebody did them, and no derivation can produce them. So they have to be
 * stored, and this module is the store.
 *
 * Three actions. Acknowledging says "I have seen this and I am on it";
 * escalating says "I have handed it to somebody else, and here is why". Both
 * are claims about a person, which is what makes them honest to record.
 *
 * Resolving is the careful one, because it is half a claim about the *world* —
 * and the world is the derivation's job. It is offered only where the record
 * already says what happened and no clock will ever unsay it (`canResolve`
 * below). There, the alert has no other ending: it will go on asking for
 * attention forever until a person deals with it and writes down what they
 * did. Where the fact could still change, resolving is refused, because it
 * would take a client who is currently alone off the board on the strength of
 * a coordinator feeling on top of it. Nothing here ever hides a row either
 * way — a resolved alert keeps its place and its derived state, and gains an
 * account of who settled it.
 *
 * All three live in memory for the length of the session, and the screens say so
 * rather than implying otherwise. There is no backend in this app; writing them
 * to localStorage would only move the problem somewhere quieter, since a
 * coordinator on another machine still would not see them.
 *
 * Keyed on the alert's `thread`, never its `id`. An id changes as a problem
 * gets worse — "Nobody on the visit" at 11:00 becomes "Went uncovered" at
 * 12:30, same visit, different id — and a record that fell off at the moment
 * the problem escalated would be worse than no record at all.
 */
import { useSyncExternalStore } from 'react'
import { staffMembers } from '@/features/caregivers/roster-data'
import { SIGNED_IN } from '@/lib/session'

interface AlertActionBase {
  /** The alert thread, which survives the problem getting worse. */
  thread: string
  /** The day the alert was raised on. */
  date: string
  /** Clock time on that day, 24-hour — the same clock the board runs on. */
  at: string
  /** Who did it. */
  by: string
  byRole: string
  /** What they wrote. */
  note: string
}

export interface AlertAcknowledgement extends AlertActionBase {
  /**
   * Who is picking it up. Usually the client's own coordinator; the signer
   * where the client has none on their care team.
   */
  coordinator: string
}

/**
 * Why it was passed on.
 *
 * A short stated vocabulary rather than free text alone: somebody reading the
 * row tomorrow wants to sort by the reason, and "see notes" does not sort.
 */
export type EscalationReason =
  | 'unresponsive'
  | 'no-cover'
  | 'client-risk'
  | 'clinical'
  | 'repeat'
  | 'other'

export const escalationReasonLabels: Record<EscalationReason, string> = {
  unresponsive: 'Caregiver not responding',
  'no-cover': 'Nobody available to cover',
  'client-risk': 'Client may be at risk',
  clinical: 'Needs a clinical decision',
  repeat: 'Happened before',
  other: 'Something else',
}

export interface AlertEscalation extends AlertActionBase {
  /** Who it went to, as they are on the roster. */
  toId: string
  toName: string
  toTitle: string
  /**
   * Their number, copied onto the record at the moment of escalation.
   *
   * Nothing is sent anywhere — this app has no outbound channel — so the one
   * useful thing an escalation can do besides recording itself is put the
   * number to ring in front of the person who escalated.
   */
  toPhone: string
  reason: EscalationReason
}

/**
 * How a settled alert was dealt with.
 *
 * Dispositions rather than descriptions. The design's dropdown offered
 * "Caregiver Arrived Late", which the alert on the row already says — asking a
 * coordinator to restate it is data entry that can only introduce a
 * disagreement between the two. What the row cannot know is what was *done*.
 */
export type ResolutionCategory =
  | 'explained'
  | 'corrected'
  | 'covered'
  | 'raised-with-caregiver'
  | 'billing'
  | 'written-up'
  | 'other'

export const resolutionCategoryLabels: Record<ResolutionCategory, string> = {
  explained: 'Explained, nothing further needed',
  corrected: 'Record corrected',
  covered: 'Cover arranged',
  'raised-with-caregiver': 'Raised with the caregiver',
  billing: 'Billing adjusted',
  'written-up': 'Written up as an incident',
  other: 'Something else',
}

export interface AlertResolution extends AlertActionBase {
  category: ResolutionCategory
  /** Administrative aside — billing, who else was told. Optional. */
  internal: string
}

/**
 * Whether this alert can be signed off at all.
 *
 * Only where the record already says what happened. That is the app's own
 * timing test — "could the record still come to say something different?" — and
 * it is exactly the line resolving must not cross. An alert that is still
 * changeable clears itself the minute the caregiver checks in; letting somebody
 * mark it resolved first would take a client who is currently alone off the
 * board because a coordinator felt on top of it. Those alerts have the two
 * actions that fit — acknowledge it, or hand it on.
 *
 * The other half of the argument is why this exists at all: a recorded alert
 * never clears on its own, because the fact behind it is finished and true
 * forever. Somebody dealing with it is the only ending it has.
 */
export function canResolve(alert: { timing: 'changeable' | 'recorded' }): boolean {
  return alert.timing === 'recorded'
}

/**
 * The levels an alert can go up to, in order, and who is at each.
 *
 * Read off the roster rather than declared: a level with nobody at it is a
 * dropdown that leads nowhere. The signed-in user is excluded, which is why
 * Operations Manager does not currently appear — Sarah Jenkins is the only one
 * on file, and a level whose only member is you is not an escalation.
 */
const TIER_TITLES = [
  { title: 'Care Coordinator', label: 'Care coordinator' },
  { title: 'Registered Nurse (RN)', label: 'Registered nurse' },
  { title: 'Operations Manager', label: 'Operations manager' },
] as const

export const escalationTiers = TIER_TITLES.map(({ title, label }) => ({
  title: title as string,
  label,
  people: staffMembers.filter(
    (m) => m.title === title && m.status === 'active' && m.name !== SIGNED_IN,
  ),
})).filter((tier) => tier.people.length > 0)

const acknowledgements = new Map<string, AlertAcknowledgement>()
const escalations = new Map<string, AlertEscalation>()
const resolutions = new Map<string, AlertResolution>()
const listeners = new Set<() => void>()

/**
 * Bumped on every write. `useSyncExternalStore` needs a snapshot that is stable
 * between renders and different after a change, and a Map is neither.
 */
let version = 0

/** The date is fixed-width, so one space is enough to keep the halves apart. */
function keyOf(date: string, thread: string): string {
  return `${date} ${thread}`
}

function emit(): void {
  version += 1
  for (const listener of listeners) listener()
}

export function acknowledge(ack: AlertAcknowledgement): void {
  acknowledgements.set(keyOf(ack.date, ack.thread), ack)
  emit()
}

/** Undo. Nothing is kept about the withdrawn one — it was never sent anywhere. */
export function withdrawAcknowledgement(date: string, thread: string): void {
  if (acknowledgements.delete(keyOf(date, thread))) emit()
}

export function acknowledgementFor(
  date: string,
  thread: string,
): AlertAcknowledgement | undefined {
  return acknowledgements.get(keyOf(date, thread))
}

export function escalate(escalation: AlertEscalation): void {
  escalations.set(keyOf(escalation.date, escalation.thread), escalation)
  emit()
}

export function withdrawEscalation(date: string, thread: string): void {
  if (escalations.delete(keyOf(date, thread))) emit()
}

export function escalationFor(
  date: string,
  thread: string,
): AlertEscalation | undefined {
  return escalations.get(keyOf(date, thread))
}

export function resolve(resolution: AlertResolution): void {
  resolutions.set(keyOf(resolution.date, resolution.thread), resolution)
  emit()
}

export function withdrawResolution(date: string, thread: string): void {
  if (resolutions.delete(keyOf(date, thread))) emit()
}

export function resolutionFor(
  date: string,
  thread: string,
): AlertResolution | undefined {
  return resolutions.get(keyOf(date, thread))
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Re-renders the calling component whenever anything is acknowledged, escalated
 * or withdrawn, and hands back the lookups rather than the stores, so a screen
 * can read what was done but cannot quietly reach in and change it.
 */
export function useAlertActions(): {
  acknowledgementFor: typeof acknowledgementFor
  escalationFor: typeof escalationFor
  resolutionFor: typeof resolutionFor
} {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  )
  return { acknowledgementFor, escalationFor, resolutionFor }
}
