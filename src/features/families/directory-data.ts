import { recipients } from '@/features/care-recipients/data'
import type { Recipient } from '@/features/care-recipients/data'
import {
  LOG_WINDOW_DAYS,
  getFamilyRecord,
  logRevision,
  newestFirst,
} from '@/features/care-recipients/family-data'
import type {
  AccessLevel,
  CommunicationEntry,
  ContactChannel,
  FamilyMember,
  FamilyRole,
} from '@/features/care-recipients/family-data'
import {
  failedPayment,
  planById,
  renewalPayment,
  subscriptions,
} from '@/features/billing/data'
import {
  getBillingRecord,
  outstandingBalance,
} from '@/features/care-recipients/billing-data'
import { TODAY } from '@/lib/today'
import type { Tone } from '@/types'

export { TODAY, LOG_WINDOW_DAYS }

/* ---------------------------------- types --------------------------------- */

/** A recipient this person is attached to, with the relationship they hold. */
export interface RecipientLink {
  recipientId: string
  name: string
  relationship: string
  roles: FamilyRole[]
  status: Recipient['status']
}

/** Where one person's entries sit: their member id under each recipient. */
export interface LogSource {
  recipientId: string
  memberId: string
}

export type AccountStatus = 'active' | 'inactive' | 'pending'

export type BillingState = 'current' | 'overdue' | 'pending' | 'none'

export interface FamilyAccount {
  /** Stable slug used in the URL, e.g. `fam-1029`. */
  id: string
  /** Human-facing reference shown under the name. */
  ref: string
  name: string
  phone: string
  email: string
  location?: string
  access: AccessLevel
  preferred: ContactChannel
  portalEnabled: boolean
  /** Every recipient this person is a contact for. */
  links: RecipientLink[]
  /** Union of the roles they hold across all of those recipients. */
  roles: FamilyRole[]
  /** Which member record under which recipient is this person. */
  sources: LogSource[]
  /**
   * Their entries from every linked recipient's log, newest first.
   *
   * Read live rather than stored: this used to be a copy taken when the module
   * first loaded, so a contact recorded on a Family tab appeared there and on
   * the messages thread while the directory carried on showing the old count.
   */
  log: (CommunicationEntry & { recipientId: string })[]
}

/* --------------------------------- labels --------------------------------- */

export const statusLabels: Record<AccountStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending verification',
}

export const statusTones: Record<AccountStatus, Tone> = {
  active: 'green',
  inactive: 'slate',
  pending: 'amber',
}

export const billingLabels: Record<BillingState, string> = {
  current: 'Current',
  overdue: 'Overdue',
  pending: 'Pending',
  none: 'No account',
}

export const billingTones: Record<BillingState, Tone> = {
  current: 'green',
  overdue: 'red',
  pending: 'amber',
  none: 'slate',
}

export const ACCOUNTS_PAGE_SIZE = 8

/* --------------------------------- building -------------------------------- */

/**
 * Two entries are the same human when the phone matches. Names alone are not
 * enough (two Grace Browns would merge) and ids are scoped per recipient, so
 * the same person carries a different id under each one.
 *
 * The synthesised fallback contact hands every record-less recipient the same
 * placeholder number, so that one is keyed per recipient instead — otherwise
 * every fallback in the system would collapse into a single account.
 */
const PLACEHOLDER_PHONE = '5550000001'

function identity(member: FamilyMember, recipientId: string): string {
  const digits = member.phone.replace(/\D/g, '')
  return digits && digits !== PLACEHOLDER_PHONE
    ? `phone:${digits}`
    : `member:${recipientId}:${member.id}`
}

/** Full access outranks view, which outranks limited. */
const accessRank: Record<AccessLevel, number> = { full: 0, view: 1, limited: 2 }

interface Draft {
  members: { member: FamilyMember; link: RecipientLink }[]
}

/**
 * One person's log entries, gathered across every recipient they act for and
 * ordered newest first.
 *
 * Memoised against the log's revision rather than recomputed per read: the
 * unread walk touches `account.log` once per link, and a getter that sorted
 * every time turned that into a resort per row per render.
 */
const logCache = new WeakMap<
  LogSource[],
  { revision: number; entries: (CommunicationEntry & { recipientId: string })[] }
>()

function entriesFor(
  sources: LogSource[],
): (CommunicationEntry & { recipientId: string })[] {
  const revision = logRevision()
  const cached = logCache.get(sources)
  if (cached && cached.revision === revision) return cached.entries

  const entries = sources
    .flatMap(({ recipientId, memberId }) =>
      (getFamilyRecord(recipientId)?.log ?? [])
        .filter((e) => e.memberId === memberId)
        .map((e) => ({ ...e, recipientId })),
    )
    .sort(newestFirst)

  logCache.set(sources, { revision, entries })
  return entries
}

/*
 * The family records are stored per recipient, which is the right shape for a
 * profile tab and the wrong one for a directory: a person acting for two
 * clients appears twice, and there is no row that represents *them*.
 *
 * This inverts them. One row per human, with every recipient they touch — so
 * "2 recipients" is a fact about the account, not a number typed into a column.
 */
function build(): FamilyAccount[] {
  const drafts = new Map<string, Draft>()

  for (const recipient of recipients) {
    const record = getFamilyRecord(recipient.id)
    if (!record) continue

    for (const member of record.members) {
      const key = identity(member, recipient.id)
      const draft = drafts.get(key) ?? { members: [] }

      draft.members.push({
        member,
        link: {
          recipientId: recipient.id,
          name: recipient.name,
          relationship: member.relationship,
          roles: [...member.roles],
          status: recipient.status,
        },
      })
      drafts.set(key, draft)
    }
  }

  const accounts = [...drafts.values()].map((draft) => {
    /*
     * Personal details come from the record where they act as primary contact,
     * not from whichever recipient happened to sort first — a first-wins pick
     * presented "preferred channel" as a fact about the person when it was an
     * arbitrary choice between two records.
     *
     * Links are ordered primary-first for the same reason: the relationship
     * label, the headline recipient and the profile link all read `links[0]`,
     * and they have to be describing the same person.
     */
    const ordered = [...draft.members].sort(
      (a, b) =>
        Number(b.member.roles.includes('Primary Contact')) -
        Number(a.member.roles.includes('Primary Contact')),
    )
    const source = ordered[0].member

    const roles: FamilyRole[] = []
    let access = source.access
    let portalEnabled = false
    for (const { member } of ordered) {
      for (const role of member.roles) {
        if (!roles.includes(role)) roles.push(role)
      }
      // The widest access they hold anywhere, and the portal is on if it is on
      // for any of their links — both are properties of the person's login.
      if (accessRank[member.access] < accessRank[access]) access = member.access
      portalEnabled ||= member.portalEnabled
    }

    return {
      id: '',
      ref: '',
      name: source.name,
      phone: source.phone,
      email: source.email,
      location: source.location,
      access,
      preferred: source.preferred,
      portalEnabled,
      links: ordered.map((m) => m.link),
      roles,
      sources: ordered.map((m) => ({
        recipientId: m.link.recipientId,
        memberId: m.member.id,
      })),
    }
  })

  // Sorted first, then numbered: references assigned in map order ran down the
  // page out of sequence.
  return accounts
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((account, i) => {
      const { sources } = account
      return {
        ...account,
        id: `fam-${1029 + i}`,
        ref: `#FAM-${1029 + i}`,
        get log() {
          return entriesFor(sources)
        },
      }
    })
}

export const familyAccounts: FamilyAccount[] = build()

export function getFamilyAccount(id: string | undefined): FamilyAccount | undefined {
  return familyAccounts.find((a) => a.id === id)
}

/* --------------------------------- derived -------------------------------- */

const DAY_MS = 86_400_000

/** Most recent contact of any kind, or null when there has never been one. */
export function lastActivity(account: FamilyAccount): string | null {
  return account.log[0]?.at ?? null
}

export function daysSinceContact(
  account: FamilyAccount,
  today = TODAY,
): number | null {
  const at = lastActivity(account)
  if (!at) return null
  const from = new Date(`${at}T00:00:00Z`).getTime()
  const now = new Date(`${today}T00:00:00Z`).getTime()
  return Math.max(0, Math.round((now - from) / DAY_MS))
}

/** Only written channels can be unread; a phone call cannot be. */
const messageTypes = new Set(['App Message', 'Email'])

/**
 * Inbound messages nobody has answered. Counted by walking the log newest-first
 * and stopping at the first outbound message — everything before it is still
 * waiting on us.
 */
export function unreadCount(account: FamilyAccount): number {
  /*
   * Per recipient, then summed. The log is merged across every link, so a
   * single reply about one client used to zero the outstanding questions about
   * another — the walk stopped at the first outbound entry it met.
   */
  let unread = 0
  for (const link of account.links) {
    for (const entry of account.log) {
      if (entry.recipientId !== link.recipientId) continue
      if (!messageTypes.has(entry.type)) continue
      if (entry.direction === 'outbound') break
      unread += 1
    }
  }
  return unread
}

/**
 * Derived from the portal and the log, not stored. "Pending verification" is
 * an invited account that has not been through the portal; "inactive" is a
 * verified one nobody has spoken to inside the log window.
 */
export function accountStatus(
  account: FamilyAccount,
  today = TODAY,
): AccountStatus {
  if (!account.portalEnabled) return 'pending'
  const days = daysSinceContact(account, today)
  return days === null || days > LOG_WINDOW_DAYS ? 'inactive' : 'active'
}

/**
 * Billing is a property of the recipient, not the contact, so an account shows
 * the worst state across everyone it is billed for — and only where the person
 * actually holds the billing role.
 */
export function billingState(account: FamilyAccount): BillingState {
  const billed = account.links.filter((l) => l.roles.includes('Billing Contact'))
  if (billed.length === 0) return 'none'

  const states = billed.map((link): BillingState => {
    const sub = subscriptions.find((s) => s.recipientId === link.recipientId)
    if (!sub) return 'none'
    if (failedPayment(sub)) return 'overdue'
    // A charge still clearing, and a subscription that hasn't started, are both
    // "pending" to a billing contact. A paused or cancelled account is not
    // "current" — nothing is being collected at all.
    if (renewalPayment(sub)?.status === 'pending') return 'pending'
    switch (sub.status) {
      case 'active':
        return 'current'
      case 'pending':
        return 'pending'
      case 'paused':
      case 'cancelled':
        return 'none'
    }
  })

  if (states.includes('overdue')) return 'overdue'
  if (states.includes('pending')) return 'pending'
  if (states.includes('current')) return 'current'
  return 'none'
}

/** Whether any recipient they are billed for has an invoice ledger at all. */
export function hasInvoiceLedger(account: FamilyAccount): boolean {
  return account.links.some(
    (l) => l.roles.includes('Billing Contact') && getBillingRecord(l.recipientId),
  )
}

/** What the recipients they are billed for actually owe today. */
export function outstanding(account: FamilyAccount): number {
  return account.links
    .filter((l) => l.roles.includes('Billing Contact'))
    .reduce((sum, link) => {
      const record = getBillingRecord(link.recipientId)
      if (!record) return sum
      return sum + outstandingBalance(record.invoices, record.insurance.coverageRate)
    }, 0)
}

/** The recipient they are primary contact for, else the first they are linked to. */
export function primaryLink(account: FamilyAccount): RecipientLink {
  return (
    account.links.find((l) => l.roles.includes('Primary Contact')) ??
    account.links[0]
  )
}

/** "Son · Primary contact" — the relationship, and the role held alongside it. */
export function relationshipLabel(account: FamilyAccount): string {
  const link = primaryLink(account)
  const role = link.roles.find(
    (r) =>
      r !== 'Emergency Contact' &&
      // A power of attorney whose relationship *is* power of attorney would
      // otherwise read "Power of attorney · Power of Attorney".
      r.toLowerCase() !== link.relationship.toLowerCase(),
  )
  return role ? `${link.relationship} · ${role}` : link.relationship
}

export function isEmergencyContact(account: FamilyAccount): boolean {
  return account.roles.includes('Emergency Contact')
}

/** Whether any linked recipient is currently receiving care. */
export function hasActiveCare(account: FamilyAccount): boolean {
  return account.links.some((l) => l.status === 'active')
}

/** The plans behind the linked recipients, for the preview drawer. */
export function linkedPlans(account: FamilyAccount): string[] {
  return [
    ...new Set(
      account.links.flatMap((link) => {
        const sub = subscriptions.find((s) => s.recipientId === link.recipientId)
        return sub ? [planById[sub.planId].name] : []
      }),
    ),
  ]
}

/* -------------------------------- summaries -------------------------------- */

export function statusCounts(): Record<AccountStatus, number> {
  const counts: Record<AccountStatus, number> = {
    active: 0,
    inactive: 0,
    pending: 0,
  }
  for (const account of familyAccounts) counts[accountStatus(account)] += 1
  return counts
}

export interface DirectorySummary {
  accounts: number
  /** Distinct care recipients these contacts cover, not contacts. */
  recipientsCovered: number
  primaryContacts: number
  withActiveCare: number
  unreadMessages: number
  outstandingPayments: number
  pendingVerification: number
}

/**
 * The source design put "187 total families" above "203 primary contacts",
 * which cannot both be true if a family has one designated contact. These are
 * two different populations and the tiles now say which is which.
 */
export function directorySummary(): DirectorySummary {
  const counts = statusCounts()
  return {
    accounts: familyAccounts.length,
    // Distinct care recipients behind the contacts, not households — two
    // recipients under one roof would count twice, and nothing models that.
    recipientsCovered: new Set(
      familyAccounts.flatMap((a) => a.links.map((l) => l.recipientId)),
    ).size,
    primaryContacts: familyAccounts.filter((a) =>
      a.roles.includes('Primary Contact'),
    ).length,
    withActiveCare: familyAccounts.filter(hasActiveCare).length,
    unreadMessages: familyAccounts.reduce((sum, a) => sum + unreadCount(a), 0),
    outstandingPayments: familyAccounts.filter(
      (a) => billingState(a) === 'overdue',
    ).length,
    pendingVerification: counts.pending,
  }
}

/* ---------------------------------- sort ---------------------------------- */

export type AccountSort = 'name' | 'activity' | 'unread'

export const sortOptions: { value: AccountSort; label: string }[] = [
  { value: 'name', label: 'Name, A to Z' },
  { value: 'activity', label: 'Most recent activity' },
  { value: 'unread', label: 'Unanswered messages' },
]

export function sortAccounts(
  list: FamilyAccount[],
  order: AccountSort,
): FamilyAccount[] {
  const sorted = [...list]
  if (order === 'activity')
    return sorted.sort((a, b) =>
      (lastActivity(b) ?? '').localeCompare(lastActivity(a) ?? ''),
    )
  if (order === 'unread')
    return sorted.sort(
      (a, b) =>
        unreadCount(b) - unreadCount(a) ||
        (lastActivity(b) ?? '').localeCompare(lastActivity(a) ?? ''),
    )
  return sorted.sort((a, b) => a.name.localeCompare(b.name))
}

/* -------------------------------- formatting ------------------------------- */

const dayFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Relative inside the week, absolute beyond it. */
export function formatActivity(account: FamilyAccount, today = TODAY): string {
  const days = daysSinceContact(account, today)
  if (days === null) return 'No activity'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  const at = lastActivity(account)!
  return dayFormat.format(new Date(`${at}T00:00:00Z`))
}
