import { Link } from 'react-router-dom'
import { ArrowRight, Check, Shield, Star, TriangleAlert } from 'lucide-react'
import type { StaffMember } from './roster-data'
import {
  age,
  assignmentsFor,
  availabilityFor,
  complianceFor,
  complianceLabels,
  complianceTones,
  credentialStates,
  emailFor,
  formatDate,
  formatTime,
  performanceFor,
  todaysVisits,
  visitsFor,
  weekdays,
} from './roster-data'
import { formatNoteDay, notesFor } from './staff-notes-data'
import type { VisitStatus } from '@/types'
import { TODAY } from '@/lib/today'
import { VisitStatusBadge } from '@/components/ui/StatusBadge'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

/* -------------------------------- overview -------------------------------- */

export function OverviewTab({
  member,
  suffix = '',
}: {
  member: StaffMember
  suffix?: string
}) {
  const assignments = assignmentsFor(member)
  const today = todaysVisits(member)
  const notes = notesFor(member).slice(0, 3)

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <section aria-labelledby="personal-info" className="card p-5">
          <h2 id="personal-info" className="text-ink text-base font-semibold tracking-tight">
            Personal Information
          </h2>
          {/* Label over value, two columns, no rules — read left then right. */}
          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              { id: 'phone', label: 'Phone', value: member.phone },
              {
                id: 'email',
                label: 'Email',
                value: <span className="break-all">{emailFor(member)}</span>,
              },
              { id: 'address', label: 'Address', value: member.address },
              {
                id: 'dob',
                label: 'Date of Birth',
                // Age is computed from the date beside it, against today.
                value: (
                  <>
                    {formatDate(member.dateOfBirth)}{' '}
                    <span className="text-ink-subtle">(Age {age(member)})</span>
                  </>
                ),
              },
              {
                id: 'emergency',
                label: 'Emergency Contact',
                value: (
                  <>
                    {member.emergencyContact.name}{' '}
                    <span className="text-ink-subtle">
                      ({member.emergencyContact.relationship}) — {member.emergencyContact.phone}
                    </span>
                  </>
                ),
              },
              { id: 'languages', label: 'Languages', value: member.languages.join(', ') },
            ].map((row) => (
              <div key={row.id} className="min-w-0">
                <dt className="text-ink-muted text-[11px] tracking-wide uppercase">{row.label}</dt>
                <dd className="text-ink mt-0.5 text-sm break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="current-assignments" className="card p-5">
          <h2 id="current-assignments" className="text-ink text-base font-semibold tracking-tight">
            Current Assignments
          </h2>

          {assignments.length === 0 ? (
            <p className="text-ink-muted mt-4 text-sm">No care recipients assigned.</p>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label="Current assignments table"
              className="border-line mt-4 overflow-x-auto rounded-lg border"
            >
              <table className="w-full min-w-lg text-left text-sm">
                <thead className="border-line bg-sunken text-ink-muted border-b text-xs">
                  <tr>
                    {['Care Recipient', 'Care Level', 'Schedule', 'Since'].map((col) => (
                      <th key={col} scope="col" className="px-4 py-2.5 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-line/70 divide-y">
                  {assignments.map((a) => (
                    <tr key={a.recipientId}>
                      <th scope="row" className="px-4 py-3 font-normal whitespace-nowrap">
                        <Link
                          to={`/care-recipients/${a.recipientId}`}
                          className="text-ink hover:text-brand-700 font-medium"
                        >
                          {a.recipientName}
                        </Link>
                      </th>
                      <td className="text-ink-muted px-4 py-3 whitespace-nowrap">{a.careLevel}</td>
                      <td className="text-ink-muted px-4 py-3">{a.schedule}</td>
                      <td className="text-ink-muted px-4 py-3 whitespace-nowrap">{a.since}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Link
            to={`/caregivers/${member.id}/schedule${suffix}`}
            className="text-brand-700 hover:text-brand-800 mt-4 inline-flex items-center gap-1 text-sm font-medium"
          >
            View Full Schedule
            <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          </Link>
        </section>

        <section aria-labelledby="todays-schedule" className="card p-5">
          <h2 id="todays-schedule" className="text-ink text-base font-semibold tracking-tight">
            Today&rsquo;s Schedule
          </h2>
          {today.length === 0 ? (
            <p className="text-ink-muted mt-4 text-sm">Nothing logged for today.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {today.map((visit) => {
                const done = visit.status === 'completed'
                const live = visit.status === 'in-progress'
                return (
                  <li key={visit.id} className="flex items-center gap-4">
                    <p
                      className={cn(
                        'w-20 shrink-0 text-sm tabular-nums',
                        live ? 'text-brand-700 font-medium' : done ? 'text-ink' : 'text-ink-subtle',
                      )}
                    >
                      {visit.time}
                    </p>
                    <div
                      className={cn(
                        'flex min-w-0 flex-1 items-start justify-between gap-2 rounded-lg border px-3 py-2.5',
                        live
                          ? 'border-brand-300 bg-brand-50'
                          : done
                            ? 'border-line bg-sunken'
                            : 'border-line bg-white',
                      )}
                    >
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'text-sm font-medium break-words',
                            live ? 'text-brand-700' : done ? 'text-ink' : 'text-ink-muted',
                          )}
                        >
                          {visit.recipientName}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 text-xs break-words',
                            live ? 'text-brand-700' : 'text-ink-muted',
                          )}
                        >
                          {visit.type}
                        </p>
                      </div>
                      <ScheduleTag status={visit.status} />
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="recent-notes" className="card p-5">
          <h2 id="recent-notes" className="text-ink text-base font-semibold tracking-tight">
            Recent Notes
          </h2>
          {notes.length === 0 ? (
            <p className="text-ink-muted mt-4 text-sm">No notes yet.</p>
          ) : (
            <ul className="divide-line/70 mt-3 divide-y">
              {notes.map((note) => (
                <li key={note.id} className="py-3 first:pt-0">
                  <p className="text-ink text-sm break-words">
                    {note.authored ? `“${note.body}”` : note.body}
                  </p>
                  <p className="text-ink-muted mt-0.5 text-xs">
                    {note.authored
                      ? `Written by ${note.author === member.name ? 'Self' : note.author}`
                      : 'From the record'}{' '}
                    • {formatNoteDay(note.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`/caregivers/${member.id}/notes${suffix}`}
            className="text-brand-700 hover:text-brand-800 mt-2 inline-flex items-center gap-1 text-sm font-medium"
          >
            View All Notes
            <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          </Link>
        </section>
      </div>

      <div className="space-y-4">
        <PerformanceCard member={member} compact suffix={suffix} />
        <ComplianceCard member={member} compact suffix={suffix} />

        <section aria-labelledby="skills-card" className="card p-5">
          <h2 id="skills-card" className="text-ink text-base font-semibold tracking-tight">
            Skills &amp; Specializations
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {member.skills.map((skill) => (
              <li key={skill} className="bg-sunken text-ink rounded-md px-2.5 py-1 text-xs">
                {skill}
              </li>
            ))}
          </ul>
        </section>

        <AvailabilityCard member={member} />
      </div>
    </div>
  )
}

/* ------------------------------- today's tag ------------------------------ */

function ScheduleTag({ status }: { status: VisitStatus }) {
  if (status === 'completed')
    return (
      <span className="bg-brand-50 text-brand-700 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold">
        Completed
        <Check className="size-3" strokeWidth={2.6} aria-hidden="true" />
      </span>
    )
  if (status === 'in-progress')
    return (
      <span className="text-brand-700 shrink-0 px-1.5 py-0.5 text-[11px] font-semibold">
        In Progress
      </span>
    )
  if (status === 'upcoming')
    return (
      <span className="bg-sunken text-ink shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold">
        Upcoming
      </span>
    )
  return <VisitStatusBadge status={status} square />
}

/* ------------------------------- performance ------------------------------ */

function Meter({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-ink-muted text-sm">{label}</p>
        <p className="text-ink text-sm font-semibold tabular-nums">
          {value === null ? 'Not recorded' : `${value}%`}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="bg-sunken mt-1.5 h-2 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-brand-600 h-full rounded-full"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  )
}

export function PerformanceCard({
  member,
  compact,
  suffix = '',
}: {
  member: StaffMember
  compact?: boolean
  suffix?: string
}) {
  const p = performanceFor(member)
  // The last 30 days of the visit log, counted rather than stated.
  const since = new Date(`${TODAY}T00:00:00Z`)
  since.setUTCDate(since.getUTCDate() - 30)
  const cutoff = since.toISOString().slice(0, 10)
  const monthVisits = visitsFor(member).filter((v) => v.date >= cutoff && v.date <= TODAY).length

  return (
    <section aria-labelledby="perf-summary" className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="perf-summary" className="text-ink text-base font-semibold tracking-tight">
          Performance Summary
        </h2>
        {compact && (
          <Link
            to={`/caregivers/${member.id}/performance${suffix}`}
            className="text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 text-sm font-medium"
          >
            View Performance
            <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="bg-sunken mt-4 flex items-center gap-4 rounded-xl px-4 py-3.5">
        <p className="text-ink text-4xl font-bold tracking-tight tabular-nums">
          {p.rating ?? '—'}
        </p>
        <div className="min-w-0">
          {p.rating !== null && <Stars rating={p.rating} />}
          <p className="text-ink-muted mt-0.5 text-xs">{ratingWord(p.rating)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <Meter label="Punctuality" value={p.punctuality} />
        <Meter
          label="Client Satisfaction"
          value={p.rating === null ? null : Math.round((p.rating / 5) * 100)}
        />
        <Meter label="Task Completion" value={p.completionRate} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {[
          ['Visits (Month)', String(monthVisits)],
          ['Hours Logged', `${p.hours}h`],
          ['Missed Visits', String(p.missed)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-ink-muted text-[11px] tracking-wide uppercase">{label}</dt>
            <dd className="text-ink mt-0.5 text-lg font-bold tracking-tight tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ratingWord(rating: number | null): string {
  if (rating === null) return 'Not yet rated'
  if (rating >= 4.5) return 'Excellent overall rating'
  if (rating >= 4) return 'Very good overall rating'
  if (rating >= 3) return 'Good overall rating'
  return 'Needs improvement'
}

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating)
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          strokeWidth={1.5}
          className={cn('size-4', n <= filled ? 'fill-amber-400 text-amber-400' : 'text-line')}
        />
      ))}
    </span>
  )
}

/* ------------------------------- compliance ------------------------------- */

const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const monthYearLong = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`)

export function ComplianceCard({
  member,
  compact,
  suffix = '',
}: {
  member: StaffMember
  compact?: boolean
  suffix?: string
}) {
  const states = credentialStates(member)
  const overall = complianceFor(member)

  return (
    <section aria-labelledby="compliance-card" className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="compliance-card" className="text-ink text-base font-semibold tracking-tight">
          Certifications &amp; Compliance
        </h2>
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold',
            overall === 'compliant' ? 'bg-sunken text-ink' : tonePill[complianceTones[overall]],
          )}
        >
          {complianceLabels[overall]}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {states.map(({ credential, state }) => (
          <li key={credential.id} className="flex items-center gap-3">
            {/* Icon and words, not a colour: expiry has to survive greyscale. */}
            <span
              aria-hidden="true"
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full',
                state === 'expired'
                  ? 'bg-red-50 text-red-600'
                  : state === 'expiring'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-sunken text-ink-muted',
              )}
            >
              {state !== 'compliant' ? (
                <TriangleAlert className="size-3.5" strokeWidth={2.2} />
              ) : credential.expiresAt ? (
                <Shield className="size-3.5" strokeWidth={2.2} />
              ) : (
                <Check className="size-3.5" strokeWidth={2.6} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-ink text-sm font-medium break-words">{credential.name}</p>
              <p
                className={cn(
                  'text-xs break-words',
                  state === 'expired'
                    ? 'font-semibold text-red-700'
                    : state === 'expiring'
                      ? 'font-semibold text-amber-700'
                      : 'text-ink-muted',
                )}
              >
                {credential.expiresAt
                  ? state === 'expired'
                    ? `Expired ${monthYear.format(asDate(credential.expiresAt))}`
                    : state === 'expiring'
                      ? `Expires ${monthYear.format(asDate(credential.expiresAt))}`
                      : `Valid until ${monthYear.format(asDate(credential.expiresAt))}`
                  : credential.clearedAt
                    ? `Cleared, ${monthYearLong.format(asDate(credential.clearedAt))}`
                    : 'Current'}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {compact && (
        <Link
          to={`/caregivers/${member.id}/documents${suffix}`}
          className="text-brand-700 hover:text-brand-800 mt-4 inline-flex items-center gap-1 text-sm font-medium"
        >
          View Documents
          <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}

/* ------------------------------- availability ------------------------------ */

export function AvailabilityCard({ member }: { member: StaffMember }) {
  const week = availabilityFor(member)

  return (
    <section aria-labelledby="availability-card" className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="availability-card" className="text-ink text-base font-semibold tracking-tight">
          Availability This Week
        </h2>
        <Link
          to={`/caregivers/${member.id}/edit`}
          className="text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 text-sm font-medium"
        >
          Manage Availability
          <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {week.map((window, i) => (
          <li key={weekdays[i]} className="flex items-center gap-3">
            <span className="text-ink-muted w-9 shrink-0 text-sm">{weekdays[i]}</span>
            <span
              className={cn(
                'min-w-0 flex-1 rounded-md px-3 py-1.5 text-center text-xs',
                window ? 'bg-brand-50 text-brand-700' : 'bg-sunken text-ink-muted',
              )}
            >
              {window
                ? `${formatTime(window.start)} - ${formatTime(window.end)} • Available`
                : 'Off Duty'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------------------------- notes ---------------------------------- */

