import { Link } from 'react-router-dom'
import { Check, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { StaffMember } from './roster-data'
import {
  RENEWAL_WINDOW_DAYS,
  age,
  assignmentsFor,
  availabilityFor,
  coordinatingFor,
  complianceFor,
  complianceLabels,
  complianceTones,
  credentialStates,
  emailFor,
  formatDate,
  formatTime,
  performanceFor,
  todaysVisits,
  weekdays,
  weeklyHours,
} from './roster-data'
import { Panel } from '@/components/ui/Panel'
import { VisitStatusBadge } from '@/components/ui/StatusBadge'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

const chip =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap'

function Rows({
  rows,
}: {
  rows: { id: string; label: string; value: React.ReactNode }[]
}) {
  return (
    <dl className="divide-line divide-y">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5 first:pt-0 last:pb-0"
        >
          <dt className="text-ink-muted min-w-0 text-sm">{row.label}</dt>
          <dd className="text-ink min-w-0 text-right text-sm font-medium break-words">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/* -------------------------------- overview -------------------------------- */

export function OverviewTab({
  member,
  suffix = '',
}: {
  member: StaffMember
  suffix?: string
}) {
  const assignments = assignmentsFor(member)
  const coordinating = coordinatingFor(member)
  const today = todaysVisits(member)

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Panel title="Personal information">
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <Rows
              rows={[
                { id: 'phone', label: 'Phone', value: member.phone },
                {
                  id: 'email',
                  label: 'Email',
                  value: <span className="break-all">{emailFor(member)}</span>,
                },
                { id: 'address', label: 'Address', value: member.address },
              ]}
            />
            <Rows
              rows={[
                {
                  id: 'dob',
                  label: 'Date of birth',
                  // Age is computed from the date beside it; the source design
                  // printed "June 15, 1988 (Age 36)" against a 2026 clock.
                  value: `${formatDate(member.dateOfBirth)} (age ${age(member)})`,
                },
                {
                  id: 'emergency',
                  label: 'Emergency contact',
                  value: `${member.emergencyContact.name} (${member.emergencyContact.relationship}) — ${member.emergencyContact.phone}`,
                },
                {
                  id: 'languages',
                  label: 'Languages',
                  value: member.languages.join(', '),
                },
              ]}
            />
          </div>
        </Panel>

        <Panel
          title="Current assignments"
          badge={
            <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
              {assignments.length} client{assignments.length === 1 ? '' : 's'}
            </span>
          }
          flush
        >
          {assignments.length === 0 ? (
            <p className="text-ink-subtle border-line border-t px-4 py-8 text-center text-sm">
              No care recipients assigned.
            </p>
          ) : (
            <>
              <div
                tabIndex={0}
                role="region"
                aria-label="Current assignments table"
                className="hidden overflow-x-auto sm:block"
              >
                <table className="w-full min-w-2xl text-left text-sm">
                  <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
                    <tr>
                      {['Care recipient', 'Care level', 'Shift pattern', 'Care started'].map(
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
                    {assignments.map((a) => (
                      <tr key={a.recipientId} className="hover:bg-canvas transition-colors">
                        <th scope="row" className="px-4 py-3 font-normal whitespace-nowrap">
                          <Link
                            to={`/care-recipients/${a.recipientId}`}
                            className="text-ink hover:text-brand-700 font-medium"
                          >
                            {a.recipientName}
                          </Link>
                          {a.primary && (
                            <span className="text-ink-subtle block text-xs">
                              Primary caregiver
                            </span>
                          )}
                        </th>
                        <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                          {a.careLevel}
                        </td>
                        <td className="text-ink-muted px-4 py-3">{a.schedule}</td>
                        <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                          {a.since}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-line border-line divide-y border-t sm:hidden">
                {assignments.map((a) => (
                  <li key={a.recipientId} className="p-4">
                    <Link
                      to={`/care-recipients/${a.recipientId}`}
                      className="text-ink hover:text-brand-700 text-sm font-semibold break-words"
                    >
                      {a.recipientName}
                    </Link>
                    <p className="text-ink-muted mt-1 text-sm break-words">
                      {a.careLevel} · {a.schedule}
                    </p>
                    <p className="text-ink-subtle mt-0.5 text-xs">
                      Care started {a.since}
                      {a.primary && ' · primary caregiver'}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {coordinating.length > 0 && (
            <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs break-words">
              Also coordinates{' '}
              {coordinating.map((a) => a.recipientName).join(', ')} without being
              on the rota for them.
            </p>
          )}
        </Panel>

        <Panel title="Today's schedule" flush>
          {today.length === 0 ? (
            <p className="text-ink-subtle border-line border-t px-4 py-8 text-center text-sm">
              Nothing logged for today.
            </p>
          ) : (
            <ol className="divide-line border-line divide-y border-t">
              {today.map((visit) => (
                <li key={visit.id} className="flex flex-wrap gap-x-4 gap-y-1 p-4">
                  <p className="text-ink-muted w-20 shrink-0 text-sm tabular-nums">
                    {visit.time}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink text-sm font-semibold break-words">
                      {visit.recipientName}
                    </p>
                    <p className="text-ink-subtle mt-0.5 text-xs break-words">
                      {visit.type} · {visit.durationHours} hrs
                    </p>
                  </div>
                  <VisitStatusBadge status={visit.status} />
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <div className="space-y-4">
        <PerformanceCard member={member} compact suffix={suffix} />
        <ComplianceCard member={member} compact suffix={suffix} />

        <Panel title="Skills and specialisations">
          <ul className="flex flex-wrap gap-2">
            {member.skills.map((skill) => (
              <li
                key={skill}
                className="border-line text-ink rounded-full border px-3 py-1.5 text-sm"
              >
                {skill}
              </li>
            ))}
          </ul>
        </Panel>

        <AvailabilityCard member={member} />
      </div>
    </div>
  )
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

  return (
    <Panel
      title="Performance"
      action={
        compact
          ? {
              label: 'Open performance',
              to: `/caregivers/${member.id}/performance${suffix}`,
            }
          : undefined
      }
    >
      <div className="space-y-4">
        {/* The rating is a care-team judgement and exists whether or not any
            visit has been logged; only the computed rates need the log. */}
        <div className="bg-sunken rounded-xl p-4">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <p className="text-ink text-3xl font-bold tracking-tight tabular-nums">
              {p.rating ?? '—'}
            </p>
            <p className="text-ink-muted text-sm">
              {p.rating === null
                ? 'Not yet rated'
                : `Average of ${p.ratedOn} care-team rating${p.ratedOn === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {p.logged === 0 ? (
          <p className="text-ink-subtle text-sm">
            No visits logged against this caregiver, so punctuality and hours
            cannot be computed.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <Meter label="Punctuality" value={p.punctuality} />
              <Meter label="Visits attended" value={p.completionRate} />
            </div>

            <dl className="border-line grid grid-cols-2 gap-3 border-t pt-3 min-[380px]:grid-cols-3">
              {[
                ['In the log', String(p.logged)],
                ['Hours attended', `${p.hours}h`],
                ['Cancelled', String(p.missed)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
                    {label}
                  </dt>
                  <dd className="text-ink mt-1 text-xl font-bold tracking-tight tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="text-ink-subtle text-xs">
              Computed from the visit log sample: {p.completed} completed,{' '}
              {p.late} late arrival{p.late === 1 ? '' : 's'}, {p.missed}{' '}
              cancelled. It is not the whole employment history, and the
              care-team rating above is not the client rating on the Performance
              tab — one is colleagues, the other families.
            </p>
          </>
        )}
      </div>
    </Panel>
  )
}

/* ------------------------------- compliance ------------------------------- */

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
    <Panel
      title="Certifications and compliance"
      badge={
        <span className={cn(chip, tonePill[complianceTones[overall]], 'shrink-0')}>
          {complianceLabels[overall]}
        </span>
      }
      action={
        compact
          ? {
              label: 'Open documents',
              to: `/caregivers/${member.id}/documents${suffix}`,
            }
          : undefined
      }
    >
      <ul className="space-y-2.5">
        {states.map(({ credential, state, daysRemaining }) => (
          <li key={credential.id} className="flex gap-2.5">
            {/* Icon and words, not a colour: expiry has to survive greyscale. */}
            {state === 'expired' ? (
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-red-600"
                strokeWidth={2}
                aria-hidden="true"
              />
            ) : state === 'expiring' ? (
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-amber-600"
                strokeWidth={2}
                aria-hidden="true"
              />
            ) : credential.kind === 'check' ? (
              <Check
                className="mt-0.5 size-4 shrink-0 text-emerald-600"
                strokeWidth={2.6}
                aria-hidden="true"
              />
            ) : (
              <ShieldCheck
                className="text-ink-subtle mt-0.5 size-4 shrink-0"
                strokeWidth={1.9}
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <p className="text-ink text-sm font-medium break-words">
                {credential.name}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-xs break-words',
                  state === 'expired'
                    ? 'font-semibold text-red-700'
                    : state === 'expiring'
                      ? 'font-semibold text-amber-700'
                      : 'text-ink-subtle',
                )}
              >
                {credential.expiresAt
                  ? state === 'expired'
                    ? `Expired ${formatDate(credential.expiresAt)}, ${Math.abs(daysRemaining ?? 0)} days ago`
                    : state === 'expiring'
                      ? `Expires ${formatDate(credential.expiresAt)}, in ${daysRemaining} days`
                      : `Valid until ${formatDate(credential.expiresAt)}`
                  : credential.clearedAt
                    ? `Cleared ${formatDate(credential.clearedAt)}`
                    : 'On file'}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-ink-subtle mt-3 text-xs">
        Anything inside {RENEWAL_WINDOW_DAYS} days of expiry is flagged for
        renewal.
      </p>
    </Panel>
  )
}

/* ------------------------------- availability ------------------------------ */

export function AvailabilityCard({ member }: { member: StaffMember }) {
  const week = availabilityFor(member)
  const hours = weeklyHours(member)

  return (
    <Panel
      title="Availability this week"
      badge={
        <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
          {hours}h
        </span>
      }
    >
      <ul className="space-y-1.5">
        {week.map((window, i) => (
          <li key={weekdays[i]} className="flex items-center gap-3">
            <span className="text-ink-muted w-10 shrink-0 text-sm">
              {weekdays[i]}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 rounded-lg px-3 py-2 text-sm',
                window
                  ? 'bg-brand-50 text-brand-800'
                  : 'bg-sunken text-ink-subtle',
              )}
            >
              {window
                ? `${formatTime(window.start)} – ${formatTime(window.end)} · Available`
                : 'Off duty'}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/* ---------------------------------- notes ---------------------------------- */

