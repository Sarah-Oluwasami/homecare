import { credentialStates, complianceFor } from './roster-data'
import { staffMembers } from './staff'
import type { ComplianceState, Credential, StaffMember } from './staff'
import { TODAY } from '@/lib/today'

export { TODAY }

/* ---------------------------------- types --------------------------------- */

export type DocumentCategory = 'credential' | 'employment' | 'training'

export type EmploymentKind = 'Legal' | 'Tax' | 'Payroll'

export interface StaffDocument {
  id: string
  name: string
  category: DocumentCategory
  /** What sort of employment paperwork it is; credentials have none. */
  kind?: EmploymentKind
  fileName: string
  /** ISO. */
  uploadedAt: string
  uploadedBy: string
  /** The credential this file evidences, where it evidences one. */
  credentialId?: string
}

export type TrainingState = 'complete' | 'in-progress' | 'not-started'

export interface TrainingRecord {
  id: string
  name: string
  /** ISO, or null while it is still running. */
  completedAt: string | null
  /** Hours done so far. Equals `requiredHours` once complete. */
  hours: number
  requiredHours: number
  /** The credential this course renews, if any. */
  renews?: string
}

/* --------------------------------- training -------------------------------- */

/*
 * Training and credentials are kept consistent on purpose. The source design
 * showed an "Alzheimer's Care Advanced" course completed in June beside an
 * Alzheimer's certification that expired that same month — a completed renewal
 * that renewed nothing. Here the recertification is the course still running,
 * which is why the certificate has lapsed.
 */
const training: Record<string, TrainingRecord[]> = {
  'cg-001': [
    {
      id: 't1',
      name: 'Medication administration',
      completedAt: '2026-07-06',
      hours: 16,
      requiredHours: 16,
    },
    {
      id: 't2',
      name: 'Infection control',
      completedAt: '2026-03-18',
      hours: 4,
      requiredHours: 4,
    },
    {
      id: 't3',
      name: 'Fall prevention',
      completedAt: '2026-01-22',
      hours: 8,
      requiredHours: 8,
    },
    {
      id: 't4',
      name: "Alzheimer's care recertification",
      completedAt: null,
      hours: 12,
      requiredHours: 40,
      renews: 'c2',
    },
    {
      id: 't5',
      name: 'CPR and first aid refresher',
      completedAt: null,
      hours: 0,
      requiredHours: 8,
      renews: 'c3',
    },
  ],
  'cg-002': [
    {
      id: 't1',
      name: 'Wound care level 2',
      completedAt: '2026-05-14',
      hours: 24,
      requiredHours: 24,
    },
    {
      id: 't2',
      name: 'Infection control',
      completedAt: '2026-02-09',
      hours: 4,
      requiredHours: 4,
    },
  ],
  'cg-003': [
    {
      id: 't1',
      name: 'Clinical assessment update',
      completedAt: '2026-04-30',
      hours: 12,
      requiredHours: 12,
    },
  ],
  'cg-004': [
    {
      id: 't1',
      name: 'Safe handling of medicines',
      completedAt: '2026-06-11',
      hours: 16,
      requiredHours: 16,
    },
    {
      // The certificate expiring in August has its renewal underway, which is
      // what makes "renewal due" actionable rather than just alarming.
      id: 't2',
      name: 'Medication administration renewal',
      completedAt: null,
      hours: 6,
      requiredHours: 16,
      renews: 'c2',
    },
    {
      id: 't3',
      name: 'Dementia awareness',
      completedAt: null,
      hours: 6,
      requiredHours: 12,
    },
  ],
  'cg-005': [
    {
      id: 't1',
      name: 'Moving and handling',
      completedAt: '2026-03-05',
      hours: 8,
      requiredHours: 8,
    },
  ],
  'cg-006': [
    {
      id: 't1',
      name: 'Overnight care practice',
      completedAt: '2026-02-20',
      hours: 12,
      requiredHours: 12,
    },
  ],
}

export function trainingFor(member: StaffMember): TrainingRecord[] {
  return [...(training[member.id] ?? [])].sort((a, b) =>
    (b.completedAt ?? '9999').localeCompare(a.completedAt ?? '9999'),
  )
}

export function trainingState(record: TrainingRecord): TrainingState {
  if (record.completedAt) return 'complete'
  return record.hours > 0 ? 'in-progress' : 'not-started'
}

export function trainingHours(member: StaffMember): {
  completed: number
  inProgress: number
} {
  const list = trainingFor(member)
  return {
    completed: list
      .filter((t) => t.completedAt)
      .reduce((sum, t) => sum + t.hours, 0),
    inProgress: list
      .filter((t) => !t.completedAt)
      .reduce((sum, t) => sum + t.hours, 0),
  }
}

/* -------------------------------- employment ------------------------------- */

const surname = (name: string) => name.trim().split(/\s+/).at(-1) ?? name

/**
 * Dated off the hire date rather than typed, so a contract can never predate
 * the employment it documents. The W-4 is filed in the January of the current
 * tax year, or at hire if that was later.
 */
function employmentDocuments(member: StaffMember, today = TODAY): StaffDocument[] {
  const hired = member.hiredAt
  const taxYear = today.slice(0, 4)
  const w4 = `${taxYear}-01-05` > hired ? `${taxYear}-01-05` : hired
  const last = surname(member.name)

  const atHire: [string, EmploymentKind][] = [
    ['Employment contract', 'Legal'],
    ['I-9 verification', 'Legal'],
    ['Direct deposit form', 'Payroll'],
    ['Non-disclosure agreement', 'Legal'],
  ]

  return [
    ...atHire.map(([name, kind], i) => ({
      id: `emp-${i}`,
      name,
      category: 'employment' as const,
      kind,
      fileName: `${name.replace(/[^A-Za-z]+/g, '_')}_${last}_${hired.slice(0, 4)}.pdf`,
      uploadedAt: hired,
      uploadedBy: 'HR',
    })),
    {
      id: 'emp-w4',
      name: `W-4 form (${taxYear})`,
      category: 'employment' as const,
      kind: 'Tax' as const,
      fileName: `W4_${last}_${taxYear}.pdf`,
      uploadedAt: w4,
      uploadedBy: 'HR',
    },
  ]
}

/* -------------------------------- documents -------------------------------- */

/**
 * One list. The upload history below is a view of it sorted by date, not a
 * second fixture that could disagree — the source design's history said the
 * CPR card was renewed in March while the table showed it expiring that month.
 */
export function documentsFor(member: StaffMember, today = TODAY): StaffDocument[] {
  const last = surname(member.name)

  const credentialDocs: StaffDocument[] = member.credentials.map((c) => ({
    id: `doc-${c.id}`,
    name: c.name,
    category: 'credential',
    // A credential's file arrives when the credential is granted, or when the
    // check is cleared.
    // Prefixed by category: a credential and a training certificate with the
    // same name produced one file name and two upload rows.
    fileName: `Cert_${c.name.replace(/[^A-Za-z0-9]+/g, '_')}_${last}.pdf`,
    // The later of the two for a check: the evidence cannot predate the
    // clearance it evidences.
    uploadedAt:
      c.kind === 'check'
        ? (c.clearedAt ?? c.issuedAt ?? member.hiredAt)
        : (c.issuedAt ?? c.clearedAt ?? member.hiredAt),
    uploadedBy: c.kind === 'check' ? 'HR' : 'Caregiver',
    credentialId: c.id,
  }))

  const trainingDocs: StaffDocument[] = trainingFor(member)
    .filter((t): t is TrainingRecord & { completedAt: string } =>
      Boolean(t.completedAt),
    )
    .map((t) => ({
      id: `doc-${t.id}`,
      name: `${t.name} certificate`,
      category: 'training',
      fileName: `Training_${t.name.replace(/[^A-Za-z0-9]+/g, '_')}_${last}.pdf`,
      uploadedAt: t.completedAt,
      uploadedBy: 'Caregiver',
    }))

  return [...credentialDocs, ...employmentDocuments(member, today), ...trainingDocs]
    .filter((d) => d.uploadedAt <= today)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

/* --------------------------------- summary --------------------------------- */

export interface DocumentSummary {
  compliance: ComplianceState
  /** Files actually on record, counted rather than stated. */
  count: number
  /** The most recent upload, or null when there is nothing. */
  lastUpdated: string | null
  /** The soonest credential still in date. */
  nextExpiry: { credential: Credential; days: number } | null
  /** Credentials whose date has already passed. */
  expired: Credential[]
  trainingComplete: number
  trainingInProgress: number
}

export function documentSummary(
  member: StaffMember,
  today = TODAY,
): DocumentSummary {
  const states = credentialStates(member, today)
  const documents = documentsFor(member, today)
  const list = trainingFor(member)

  /*
   * "Next impending expiry" means the next one still to come. The source design
   * pointed at a card that had lapsed four months earlier and said "85 days
   * remaining" — a countdown on a date already past.
   */
  const upcoming = states
    .filter((s) => s.state !== 'expired' && s.daysRemaining !== null)
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))[0]

  return {
    compliance: complianceFor(member, today),
    count: documents.length,
    lastUpdated: documents[0]?.uploadedAt ?? null,
    nextExpiry: upcoming
      ? { credential: upcoming.credential, days: upcoming.daysRemaining ?? 0 }
      : null,
    expired: states.filter((s) => s.state === 'expired').map((s) => s.credential),
    trainingComplete: list.filter((t) => t.completedAt).length,
    trainingInProgress: list.filter((t) => !t.completedAt).length,
  }
}

/** Which credential, if any, a running course would renew. */
export function renewalFor(
  member: StaffMember,
  credentialId: string,
): TrainingRecord | undefined {
  return trainingFor(member).find(
    (t) => t.renews === credentialId && !t.completedAt,
  )
}

/* -------------------------------- formatting ------------------------------- */

const longDate = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDate(iso: string): string {
  return longDate.format(new Date(`${iso}T00:00:00Z`))
}

export function formatMonth(iso: string): string {
  return shortDate.format(new Date(`${iso}T00:00:00Z`))
}

export { staffMembers }
