import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import type { StaffMember } from './staff'
import { performanceFor, visitsFor } from './roster-data'
import {
  clientReviewsFor,
  feedbackFor,
  formatDate,
  formatMonth,
  historyFor,
  overallScore,
  internalReviewsFor,
  ratingTrend,
} from './performance-data'
import type { ResolvedReview } from './performance-data'
import { Panel } from '@/components/ui/Panel'
import { VisitStatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/cn'

/** Five outlines, filled to the nearest half. A number alone reads as a count. */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'size-3.5',
            rating >= n - 0.25
              ? 'fill-amber-400 text-amber-400'
              : rating >= n - 0.75
                ? 'fill-amber-200 text-amber-400'
                : 'text-ink-subtle',
          )}
          strokeWidth={1.8}
        />
      ))}
    </span>
  )
}

export function PerformanceTab({ member }: { member: StaffMember }) {
  const performance = performanceFor(member)
  const feedback = feedbackFor(member)
  const score = overallScore(member)
  const history = historyFor(member)
  const trend = ratingTrend(member)
  const clientReviews = clientReviewsFor(member)
  const internalReviews = internalReviewsFor(member)
  const visits = visitsFor(member)

  const tiles = [
    {
      id: 'overall',
      label: 'Overall score',
      value: score === null ? 'Not scored' : `${score.score} / 5`,
      hint: score === null ? 'Nothing recorded yet' : `From ${score.from}`,
    },
    {
      id: 'punctuality',
      label: 'Punctuality',
      value:
        performance.punctuality === null ? 'No data' : `${performance.punctuality}%`,
      hint:
        performance.logged === 0
          ? 'No visits logged'
          : `${performance.completed} on time of ${performance.completed + performance.late} attended`,
    },
    {
      id: 'satisfaction',
      label: 'Client rating',
      value: feedback.average === null ? 'No reviews' : `${feedback.average} / 5`,
      hint:
        feedback.count === 0
          ? 'Nobody has reviewed this caregiver'
          : `Mean of ${feedback.count} review${feedback.count === 1 ? '' : 's'}`,
    },
    {
      id: 'attended',
      label: 'Visits attended',
      value:
        performance.completionRate === null
          ? 'No data'
          : `${performance.completionRate}%`,
      hint: `${performance.missed} cancelled of ${performance.logged} logged`,
    },
  ]

  return (
    <div className="space-y-4">
      <section aria-labelledby="performance-tiles">
        <h2 id="performance-tiles" className="sr-only">
          Headline scores
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
          {tiles.map((t) => (
            <article key={t.id} className="card p-4">
              <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
                {t.label}
              </p>
              <p className="text-ink mt-2 text-2xl font-bold tracking-tight tabular-nums">
                {t.value}
              </p>
              <p className="text-ink-subtle mt-1 text-xs break-words">{t.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Key metrics">
          <p className="text-ink-muted -mt-1 mb-3 text-sm">
            Counted from the {performance.logged} visit
            {performance.logged === 1 ? '' : 's'} in the log, not from a stored
            monthly figure.
          </p>
          <Rows
            rows={[
              ['Visits logged', String(performance.logged)],
              ['Completed on time', String(performance.completed)],
              ['Late arrivals', String(performance.late)],
              ['Cancelled', String(performance.missed)],
              ['Hours attended', `${performance.hours}h`],
            ]}
          />
        </Panel>

        <Panel title="Client feedback">
          {feedback.count === 0 ? (
            <p className="text-ink-subtle text-sm">
              No reviews have been left for {member.name}.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-ink text-2xl font-bold tracking-tight tabular-nums">
                  {feedback.average} <span className="sr-only">out of 5</span>
                </p>
                <Stars rating={feedback.average ?? 0} />
                <p className="text-ink-muted text-sm">
                  from {feedback.count} review{feedback.count === 1 ? '' : 's'}
                </p>
              </div>
              <Rows
                className="mt-3"
                rows={[
                  ['Positive, 4 stars and up', String(feedback.positive)],
                  ['Neutral, 3 stars', String(feedback.neutral)],
                  ['Negative, 2 stars and under', String(feedback.negative)],
                  [
                    'Praised more than once',
                    feedback.praised.length === 0
                      ? 'Nothing repeated yet'
                      : feedback.praised.join(', '),
                  ],
                ]}
              />
            </>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Rating by month">
          {trend.length === 0 ? (
            <p className="text-ink-subtle text-sm">
              No month in the last six carries a review.
            </p>
          ) : (
            <>
              {/* Bars are decorative; the same figures follow as a table so the
                  trend is not sighted-only. */}
              <ul aria-hidden="true" className="flex items-end gap-3">
                {trend.map((row) => (
                  <li key={row.month} className="min-w-0 flex-1 text-center">
                    <p className="text-ink text-sm font-semibold tabular-nums">
                      {row.rating}
                    </p>
                    <div
                      className="bg-brand-500 mx-auto mt-1 w-full rounded-t"
                      style={{ height: `${((row.rating ?? 0) / 5) * 120}px` }}
                    />
                    <p className="text-ink-subtle mt-1 truncate text-xs">
                      {formatMonth(row.month)}
                    </p>
                  </li>
                ))}
              </ul>
              <table className="sr-only">
                <caption>Average client rating by month</caption>
                <thead>
                  <tr>
                    <th scope="col">Month</th>
                    <th scope="col">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((row) => (
                    <tr key={row.month}>
                      <th scope="row">{formatMonth(row.month)}</th>
                      <td>{row.rating} out of 5</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-ink-subtle mt-3 text-xs">
                Only months with at least one review appear.
              </p>
            </>
          )}
        </Panel>

        <Panel title="Six-month history" flush>
          <div
            tabIndex={0}
            role="region"
            aria-label="Performance by month"
            className="hidden overflow-x-auto sm:block"
          >
            <table className="w-full min-w-2xl text-left text-sm">
              <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
                <tr>
                  {['Month', 'Logged', 'Attended', 'Hours', 'Punctuality', 'Rating'].map(
                    (col) => (
                      <th
                        key={col}
                        scope="col"
                        className="px-4 py-2.5 font-semibold tracking-wide uppercase"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {history.map((row) => (
                  <tr key={row.month} className="hover:bg-canvas transition-colors">
                    <th
                      scope="row"
                      className="text-ink px-4 py-3 font-medium whitespace-nowrap"
                    >
                      {formatMonth(row.month)}
                    </th>
                    <td className="text-ink-muted px-4 py-3 tabular-nums">
                      {row.visits}
                    </td>
                    <td className="text-ink-muted px-4 py-3 tabular-nums">
                      {row.attended}
                    </td>
                    <td className="text-ink-muted px-4 py-3 tabular-nums">
                      {row.hours}h
                    </td>
                    <td className="text-ink-muted px-4 py-3 tabular-nums">
                      {row.punctuality === null ? (
                        <span className="text-ink-subtle">—</span>
                      ) : (
                        `${row.punctuality}%`
                      )}
                    </td>
                    <td className="text-ink-muted px-4 py-3 tabular-nums">
                      {row.rating === null ? (
                        <span className="text-ink-subtle">—</span>
                      ) : (
                        row.rating
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Card fallback: six columns cannot be read at 320. */}
          <ul className="divide-line border-line divide-y border-t sm:hidden">
            {history.map((row) => (
              <li key={row.month} className="p-4">
                <p className="text-ink text-sm font-semibold">
                  {formatMonth(row.month)}
                </p>
                <p className="text-ink-muted mt-1 text-sm break-words">
                  {row.visits} logged, {row.attended} attended, {row.hours}h
                </p>
                <p className="text-ink-subtle mt-0.5 text-xs">
                  Punctuality{' '}
                  {row.punctuality === null ? '—' : `${row.punctuality}%`} ·
                  rating {row.rating ?? '—'}
                </p>
              </li>
            ))}
          </ul>

          <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
            The six months to {formatMonth(history.at(-1)!.month)}, oldest
            first. Hours and punctuality count attended visits only, so a
            cancelled one shows under Logged but not Attended. A dash means
            nothing was recorded.
          </p>
        </Panel>
      </div>

      <Panel
        title="Client reviews"
        badge={
          <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
            {clientReviews.length}
          </span>
        }
      >
        {clientReviews.length === 0 ? (
          <p className="text-ink-subtle text-sm">Nothing from families yet.</p>
        ) : (
          <ul className="divide-line divide-y">
            {clientReviews.map((review) => (
              <ReviewRow key={review.id} review={review} />
            ))}
          </ul>
        )}
      </Panel>

      {internalReviews.length > 0 && (
        <Panel title="Internal reviews">
          {/* Kept apart from the client average: a colleague's note is not
              client satisfaction, and folding it in moved the headline. */}
          <ul className="divide-line divide-y">
            {internalReviews.map((review) => (
              <ReviewRow key={review.id} review={review} />
            ))}
          </ul>
        </Panel>
      )}

      {visits.length > 0 && (
        <Panel
          title="Visit log"
          badge={
            <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
              Latest {Math.min(8, visits.length)} of {visits.length}
            </span>
          }
          flush
        >
          <ul className="divide-line border-line divide-y border-t">
            {visits.slice(0, 8).map((visit) => (
              <li key={`${visit.recipientId}-${visit.id}`} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Link
                    to={`/care-recipients/${visit.recipientId}/visits`}
                    className="text-ink hover:text-brand-700 min-w-0 text-sm font-semibold break-words"
                  >
                    {visit.recipientName}
                  </Link>
                  <VisitStatusBadge status={visit.status} />
                </div>
                <p className="text-ink-muted mt-1 text-sm break-words">
                  {formatDate(visit.date)} · {visit.time} · {visit.type} ·{' '}
                  {visit.durationHours}h
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}

/* ---------------------------------- parts --------------------------------- */

function Rows({
  rows,
  className,
}: {
  rows: [string, string][]
  className?: string
}) {
  return (
    <dl className={cn('divide-line divide-y', className)}>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5 first:pt-0 last:pb-0"
        >
          <dt className="text-ink-muted min-w-0 text-sm">{label}</dt>
          <dd className="text-ink min-w-0 text-right text-sm font-medium break-words">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ReviewRow({ review }: { review: ResolvedReview }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-ink min-w-0 text-sm font-semibold break-words">
          {review.authorName}
          {/* The relationship is read out of the family directory, so it cannot
              disagree with it — the source called a son a husband. */}
          <span className="text-ink-subtle ml-2 text-xs font-normal">
            {review.authorRole}
          </span>
        </p>
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Stars rating={review.rating} />
          <span className="text-ink-subtle text-xs">
            {review.rating} out of 5 · {formatDate(review.at)}
          </span>
        </span>
      </div>
      <p className="text-ink-muted mt-1.5 text-sm break-words">{review.body}</p>
      {review.traits.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {review.traits.map((trait) => (
            <li
              key={trait}
              className="border-line text-ink-muted rounded-full border px-2 py-0.5 text-xs"
            >
              {trait}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
