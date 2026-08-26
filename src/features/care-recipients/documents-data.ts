import { TODAY } from '@/lib/today'
/* ---------------------------------- types --------------------------------- */

export type DocumentCategory =
  | 'Medical Records'
  | 'Care Plans'
  | 'Legal'
  | 'Insurance'
  | 'Certifications'
  | 'Photos'

/** The review state a human sets. Expiry is derived, not asserted. */
export type ReviewState = 'current' | 'pending' | 'verified'

export type DocumentStatus = ReviewState | 'expiring' | 'expired'

export interface CareDocument {
  id: string
  name: string
  category: DocumentCategory
  /** ISO, for sorting and deriving the latest upload. */
  uploadedAt: string
  uploadedBy: string
  review: ReviewState
  /** ISO. Only documents that lapse carry one. */
  expiresAt?: string
  sizeKb: number
}

export { TODAY } from '@/lib/today'

/** Inside this many days of expiry, a document reads as "Expiring Soon". */
export const EXPIRY_WINDOW_DAYS = 30

export const DOCUMENTS_PAGE_SIZE = 10

export const categories: DocumentCategory[] = [
  'Medical Records',
  'Care Plans',
  'Legal',
  'Insurance',
  'Certifications',
  'Photos',
]

export const documentStatusLabels: Record<DocumentStatus, string> = {
  current: 'Current',
  pending: 'Pending Review',
  verified: 'Verified',
  expiring: 'Expiring Soon',
  expired: 'Expired',
}

const DAY_MS = 86_400_000

/**
 * Expiry wins over the review state — a verified document that lapses next
 * week is not "verified" in any useful sense. Derived so the chip can never
 * claim something the dates don't support.
 */
export function effectiveStatus(
  doc: CareDocument,
  today = TODAY,
): DocumentStatus {
  if (!doc.expiresAt) return doc.review
  const days =
    (new Date(`${doc.expiresAt}T00:00:00Z`).getTime() -
      new Date(`${today}T00:00:00Z`).getTime()) /
    DAY_MS
  if (days < 0) return 'expired'
  if (days <= EXPIRY_WINDOW_DAYS) return 'expiring'
  return doc.review
}

/* ---------------------------------- data ---------------------------------- */

/*
 * Reverse-chronological, nothing later than 2026-07-24. Uploaders and dates are
 * reconciled with the other tabs: the fall report matches the July 15 incident,
 * the care plan matches the July 20 revision, the quarterly assessment matches
 * the July 12 review, and the expiring CPR certificate is Maria Garcia's —
 * the one the dashboard already flags.
 */
const libraries: Record<string, CareDocument[]> = {
  'cr-001': [
    {
      // Filed by the flagged care note of the same date.
      id: 'doc2b',
      name: 'Near_Miss_Report_Jul22.pdf',
      category: 'Medical Records',
      uploadedAt: '2026-07-22',
      uploadedBy: 'David Park',
      review: 'pending',
      sizeKb: 112,
    },
    {
      id: 'doc1',
      name: 'Care_Plan_July_2026.pdf',
      category: 'Care Plans',
      uploadedAt: '2026-07-20',
      uploadedBy: 'Mike Chen',
      review: 'current',
      sizeKb: 245,
    },
    {
      id: 'doc3',
      name: 'Medication_Chart_Q3.pdf',
      category: 'Medical Records',
      uploadedAt: '2026-07-20',
      uploadedBy: 'Dr. Sarah Kim',
      review: 'current',
      sizeKb: 128,
    },
    {
      id: 'doc2',
      name: 'Fall_Incident_Report.pdf',
      category: 'Medical Records',
      uploadedAt: '2026-07-15',
      uploadedBy: 'Sarah Williams',
      review: 'pending',
      sizeKb: 156,
    },
    {
      id: 'doc4',
      name: 'Quarterly_Assessment_Q3.pdf',
      category: 'Medical Records',
      uploadedAt: '2026-07-12',
      uploadedBy: 'Mike Chen',
      review: 'current',
      sizeKb: 312,
    },
    {
      id: 'doc5',
      name: 'Neurology_Report_July.pdf',
      category: 'Medical Records',
      uploadedAt: '2026-07-01',
      uploadedBy: 'Dr. Osei',
      review: 'current',
      sizeKb: 204,
    },
    {
      id: 'doc6',
      name: 'DNR_Order.pdf',
      category: 'Legal',
      uploadedAt: '2026-07-01',
      uploadedBy: 'Dr. Sarah Kim',
      review: 'verified',
      sizeKb: 67,
    },
    {
      id: 'doc7',
      name: 'Insurance_Card_2026.pdf',
      category: 'Insurance',
      uploadedAt: '2026-07-01',
      uploadedBy: 'David Johnson',
      review: 'current',
      sizeKb: 89,
    },
    {
      id: 'doc8',
      name: 'CPR_Cert_MGarcia.pdf',
      category: 'Certifications',
      uploadedAt: '2026-06-28',
      uploadedBy: 'HR Team',
      review: 'current',
      // The dashboard flags this as expiring in 3 days
      expiresAt: '2026-07-27',
      sizeKb: 145,
    },
    {
      id: 'doc9',
      name: 'Wound_Care_Protocol.pdf',
      category: 'Medical Records',
      uploadedAt: '2026-06-05',
      uploadedBy: 'Emma Wilson',
      review: 'pending',
      sizeKb: 98,
    },
    {
      id: 'doc10',
      name: 'Care_Plan_Revision_May.pdf',
      category: 'Care Plans',
      uploadedAt: '2026-05-05',
      uploadedBy: 'Dr. Sarah Kim',
      review: 'current',
      sizeKb: 231,
    },
    {
      id: 'doc11',
      name: 'Insurance_Preauth_2026.pdf',
      category: 'Insurance',
      uploadedAt: '2026-04-18',
      uploadedBy: 'Admin Support',
      review: 'current',
      expiresAt: '2026-08-15',
      sizeKb: 76,
    },
    {
      id: 'doc12',
      name: 'CPR_Cert_SWilliams.pdf',
      category: 'Certifications',
      uploadedAt: '2026-04-02',
      uploadedBy: 'HR Team',
      review: 'current',
      expiresAt: '2027-04-02',
      sizeKb: 145,
    },
    {
      id: 'doc13',
      name: 'Power_of_Attorney.pdf',
      category: 'Legal',
      uploadedAt: '2026-03-18',
      uploadedBy: 'David Johnson',
      review: 'verified',
      sizeKb: 1229,
    },
    {
      id: 'doc14',
      name: 'HIPAA_Authorization.pdf',
      category: 'Legal',
      uploadedAt: '2026-03-16',
      uploadedBy: 'Admin Support',
      review: 'pending',
      sizeKb: 98,
    },
    {
      id: 'doc15',
      name: 'Photo_ID.jpg',
      category: 'Photos',
      uploadedAt: '2026-03-15',
      uploadedBy: 'Admin Support',
      review: 'current',
      sizeKb: 2150,
    },
  ],
}

export function getDocuments(recipientId: string): CareDocument[] {
  return libraries[recipientId] ?? []
}

/* -------------------------------- formatting ------------------------------- */

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatUploadDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`))
}

export function formatSize(sizeKb: number): string {
  return sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`
}

/* --------------------------------- derived -------------------------------- */

/**
 * Every headline number is counted from the list. The original design stated a
 * total of 24 with category pills summing to 24 while listing ten rows, and a
 * "Last Upload" date that appeared on no document.
 */
export function categoryCounts(
  docs: CareDocument[],
): Record<DocumentCategory, number> {
  const counts = Object.fromEntries(categories.map((c) => [c, 0])) as Record<
    DocumentCategory,
    number
  >
  for (const d of docs) counts[d.category] += 1
  return counts
}

export function countByStatus(
  docs: CareDocument[],
  status: DocumentStatus,
): number {
  return docs.filter((d) => effectiveStatus(d) === status).length
}

/** Status values actually present, so no filter option leads to an empty list. */
export function presentStatuses(docs: CareDocument[]): DocumentStatus[] {
  const seen = new Set(docs.map((d) => effectiveStatus(d)))
  return (Object.keys(documentStatusLabels) as DocumentStatus[]).filter((s) =>
    seen.has(s),
  )
}

/** Latest upload date, or null for an empty library. */
export function lastUpload(docs: CareDocument[]): string | null {
  return docs.reduce<string | null>(
    (latest, d) => (!latest || d.uploadedAt > latest ? d.uploadedAt : latest),
    null,
  )
}

/* --------------------------------- sorting -------------------------------- */

export type DocumentSort = 'newest' | 'oldest' | 'name' | 'size'

export const documentSortOptions: { value: DocumentSort; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'size', label: 'Largest First' },
]

const comparators: Record<
  DocumentSort,
  (a: CareDocument, b: CareDocument) => number
> = {
  // Same-day uploads fall back to name so the order is stable and predictable.
  newest: (a, b) =>
    b.uploadedAt.localeCompare(a.uploadedAt) || a.name.localeCompare(b.name),
  oldest: (a, b) =>
    a.uploadedAt.localeCompare(b.uploadedAt) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  size: (a, b) => b.sizeKb - a.sizeKb || a.name.localeCompare(b.name),
}

export function sortDocuments(
  docs: CareDocument[],
  sort: DocumentSort,
): CareDocument[] {
  return [...docs].sort(comparators[sort])
}
