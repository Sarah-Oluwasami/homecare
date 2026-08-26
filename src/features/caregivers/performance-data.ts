import { recipients } from '@/features/care-recipients/data'
import { getFamilyRecord } from '@/features/care-recipients/family-data'
import { performanceFor, visitsFor } from './roster-data'
import { staffByName } from './staff'
import type { StaffMember } from './staff'
import { TODAY } from '@/lib/today'

export { TODAY }

/* ---------------------------------- types --------------------------------- */

export type Trait =
  | 'Attentiveness'
  | 'Reliability'
  | 'Communication'
  | 'Punctuality'
  | 'Clinical skill'
  | 'Warmth'

export interface Review {
  id: string
  caregiverId: string
  /** Whose care the review is about. */
  recipientId: string
  /**
   * The family member who wrote it, by id in that recipient's family record —
   * so the name and the relationship can never contradict the directory. The
   * source design had David Johnson down as Margaret's husband; he is her son.
   */
  memberId?: string
  /** Set instead of `memberId` when the reviewer is staff, not family. */
  staffName?: string
  /** ISO. */
  at: string
  rating: 1 | 2 | 3 | 4 | 5
  body: string
  traits: Trait[]
}

export interface ResolvedReview extends Review {
  authorName: string
  authorRole: string
  recipientName: string
}

/* ---------------------------------- data ---------------------------------- */

/*
 * Every date is on or before the sample clock of 2026-07-24. The source design
 * listed reviews dated 2024 and a performance history containing September
 * 2026 — two months after the day the app is running.
 */
const reviews: Review[] = [
  {
    id: 'rv1',
    caregiverId: 'cg-001',
    recipientId: 'cr-001',
    memberId: 'fm1',
    at: '2026-07-24',
    rating: 5,
    body: 'Sarah is wonderful. Mum always looks forward to her visits. Her attentiveness has put the whole family at ease.',
    traits: ['Attentiveness', 'Warmth'],
  },
  {
    id: 'rv2',
    caregiverId: 'cg-001',
    recipientId: 'cr-001',
    memberId: 'fm2',
    at: '2026-07-15',
    rating: 5,
    body: 'Handles the medication schedule without fuss and always explains any change to us.',
    traits: ['Reliability', 'Communication'],
  },
  {
    id: 'rv3',
    caregiverId: 'cg-001',
    recipientId: 'cr-001',
    staffName: 'Mike Chen',
    at: '2026-07-10',
    rating: 5,
    body: 'Consistently reliable. Handles schedule changes gracefully and communicates proactively on care updates.',
    traits: ['Reliability', 'Communication'],
  },
  {
    id: 'rv4',
    caregiverId: 'cg-001',
    recipientId: 'cr-001',
    memberId: 'fm4',
    at: '2026-06-28',
    rating: 4,
    body: 'Very attentive to Mum. One late start, which was flagged and explained at the time.',
    traits: ['Attentiveness'],
  },
  {
    id: 'rv5',
    caregiverId: 'cg-001',
    recipientId: 'cr-001',
    memberId: 'fm1',
    at: '2026-06-05',
    rating: 5,
    body: 'Six months in and the routine is completely settled. We could not ask for better.',
    traits: ['Reliability', 'Warmth'],
  },
  {
    id: 'rv6',
    caregiverId: 'cg-002',
    recipientId: 'cr-001',
    memberId: 'fm1',
    at: '2026-07-23',
    rating: 5,
    body: 'David covers well when Sarah is off. Careful with the dressing changes.',
    traits: ['Clinical skill', 'Reliability'],
  },
  {
    id: 'rv7',
    caregiverId: 'cg-002',
    recipientId: 'cr-002',
    memberId: 'fm1',
    at: '2026-07-12',
    rating: 4,
    body: 'Good with Dad. Occasionally arrives at the back of the window rather than the front.',
    traits: ['Warmth'],
  },
  {
    id: 'rv8',
    caregiverId: 'cg-003',
    recipientId: 'cr-007',
    memberId: 'fm1',
    at: '2026-07-15',
    rating: 5,
    body: 'Emma spotted a pressure area early and escalated it the same day.',
    traits: ['Clinical skill', 'Communication'],
  },
  {
    id: 'rv9',
    caregiverId: 'cg-004',
    recipientId: 'cr-003',
    memberId: 'fm1',
    at: '2026-07-08',
    rating: 5,
    body: 'Great patience with the physical therapy exercises. She motivates Mum while respecting her limits.',
    traits: ['Warmth', 'Attentiveness'],
  },
  {
    id: 'rv10',
    caregiverId: 'cg-005',
    recipientId: 'cr-005',
    memberId: 'fm1',
    at: '2026-07-18',
    rating: 4,
    body: 'Reliable on the weekday round. We would like a little more detail in the visit notes.',
    traits: ['Reliability'],
  },
]

/* --------------------------------- resolving ------------------------------- */

export function reviewsFor(member: StaffMember): ResolvedReview[] {
  return reviews
    .filter((r) => r.caregiverId === member.id)
    .map((review) => {
      const recipient = recipients.find((r) => r.id === review.recipientId)
      const family = getFamilyRecord(review.recipientId)
      const author = review.memberId
        ? family?.members.find((m) => m.id === review.memberId)
        : undefined

      return {
        ...review,
        authorName: author?.name ?? review.staffName ?? 'Family member',
        authorRole: author
          ? `${author.relationship} of ${recipient?.name ?? 'a client'}`
          : review.staffName
            ? // Read off the roster, not restated: a title typed here could
              // drift from the staff record.
              (staffByName(review.staffName)?.title ?? 'Colleague')
            : `Family of ${recipient?.name ?? 'a client'}`,
        recipientName: recipient?.name ?? 'Unknown',
      }
    })
    .sort((a, b) => b.at.localeCompare(a.at))
}

/* --------------------------------- scoring -------------------------------- */

export interface Feedback {
  count: number
  /** Mean of the ratings, to one decimal. */
  average: number | null
  positive: number
  neutral: number
  negative: number
  /** Traits named more than once, most-named first. */
  praised: Trait[]
}

/**
 * Everything here is counted from the reviews. The source design stated a 4.9
 * average beside a breakdown of 38 positive and 4 neutral, which averages 4.8,
 * and listed five reviews whose own stars averaged 4.8 as well.
 */
export function clientReviewsFor(member: StaffMember): ResolvedReview[] {
  return reviewsFor(member).filter((r) => r.memberId !== undefined)
}

export function internalReviewsFor(member: StaffMember): ResolvedReview[] {
  return reviewsFor(member).filter((r) => r.memberId === undefined)
}

/** Families only — a coordinator's note is not client satisfaction. */
export function feedbackFor(member: StaffMember): Feedback {
  const list = clientReviewsFor(member)
  if (list.length === 0) {
    return { count: 0, average: null, positive: 0, neutral: 0, negative: 0, praised: [] }
  }

  const tally = new Map<Trait, number>()
  for (const review of list) {
    for (const trait of review.traits) {
      tally.set(trait, (tally.get(trait) ?? 0) + 1)
    }
  }

  return {
    count: list.length,
    average:
      Math.round((list.reduce((sum, r) => sum + r.rating, 0) / list.length) * 10) / 10,
    positive: list.filter((r) => r.rating >= 4).length,
    neutral: list.filter((r) => r.rating === 3).length,
    negative: list.filter((r) => r.rating <= 2).length,
    praised: [...tally.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([trait]) => trait),
  }
}

/**
 * The headline score. Blends what families said with what the visit log shows,
 * so a five-star average cannot sit above a punctuality figure that disagrees
 * with it.
 */
export function overallScore(
  member: StaffMember,
): { score: number; from: string } | null {
  const feedback = feedbackFor(member)
  const performance = performanceFor(member)

  const parts: { value: number; label: string }[] = []
  if (feedback.average !== null) {
    parts.push({ value: feedback.average, label: 'client rating' })
  }
  if (performance.punctuality !== null) {
    // Mapped onto 1–5, not 0–5: the star scale floors at one, so scaling
    // straight off a percentage could land below its own minimum.
    parts.push({
      value: 1 + (performance.punctuality / 100) * 4,
      label: 'punctuality',
    })
  }
  if (parts.length === 0) return null

  return {
    score:
      Math.round(
        (parts.reduce((sum, p) => sum + p.value, 0) / parts.length) * 10,
      ) / 10,
    // Named from what actually went in, so a caregiver with no logged visits
    // is not told punctuality is in their score.
    from: parts.map((p) => p.label).join(' and '),
  }
}

/* --------------------------------- history -------------------------------- */

export interface MonthRow {
  /** ISO first-of-month, so the label is derived rather than typed. */
  month: string
  /** Everything in the log, cancellations included. */
  visits: number
  /** What was actually worked — the basis of hours and punctuality. */
  attended: number
  hours: number
  punctuality: number | null
  rating: number | null
}

const monthLabel = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatMonth(iso: string): string {
  return monthLabel.format(new Date(`${iso}T00:00:00Z`))
}

function monthsBack(count: number, today = TODAY): string[] {
  const now = new Date(`${today}T00:00:00Z`)
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1),
    )
    return date.toISOString().slice(0, 10)
  })
}

/**
 * The last `count` months up to today, oldest first. Derived from the visit log
 * and the reviews — the source design's table repeated July three times, spelt
 * it two ways, and included a month two ahead of the current date.
 */
export function historyFor(
  member: StaffMember,
  count = 6,
  today = TODAY,
): MonthRow[] {
  const visits = visitsFor(member)
  const list = reviewsFor(member)

  return monthsBack(count, today).map((month) => {
    const prefix = month.slice(0, 7)
    const inMonth = visits.filter((v) => v.date.startsWith(prefix))
    const attended = inMonth.filter(
      (v) => v.status === 'completed' || v.status === 'late-arrival',
    )
    const completed = inMonth.filter((v) => v.status === 'completed')
    const rated = list.filter((r) => r.at.startsWith(prefix))

    return {
      month,
      visits: inMonth.length,
      attended: attended.length,
      hours:
        Math.round(attended.reduce((sum, v) => sum + v.durationHours, 0) * 10) / 10,
      punctuality:
        attended.length === 0
          ? null
          : Math.round((completed.length / attended.length) * 100),
      rating:
        rated.length === 0
          ? null
          : Math.round(
              (rated.reduce((sum, r) => sum + r.rating, 0) / rated.length) * 10,
            ) / 10,
    }
  })
}

/** Months that actually carry a rating, for the trend chart. */
export function ratingTrend(member: StaffMember, count = 6): MonthRow[] {
  return historyFor(member, count).filter((row) => row.rating !== null)
}

const dayLabel = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDate(iso: string): string {
  return dayLabel.format(new Date(`${iso}T00:00:00Z`))
}
