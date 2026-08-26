import { useMemo } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  Check,
  Info,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react'
import {
  TODAY,
  applyQuery,
  availabilityOptions,
  RECOMMEND_THRESHOLD,
  bestMatch,
  branchesOnRoster,
  candidatesFor,
  formatTime,
  requirementFor,
  sortOptions,
  summarise,
  topRanked,
} from '@/features/scheduling/assign-data'
import type {
  AvailabilityFilter,
  Candidate,
  CandidateSort,
  CredentialFilter,
  Factor,
} from '@/features/scheduling/assign-data'
import { findVisit, formatFullDay } from '@/features/scheduling/visit-detail'
import { formatWeekRange, weekStart } from '@/features/scheduling/board-data'
import type { BoardVisit } from '@/features/scheduling/board-data'
import { credentialStates } from '@/features/caregivers/roster-data'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityBadge } from '@/components/ui/StatusBadge'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { cn } from '@/lib/cn'

/* --------------------------------- helpers --------------------------------- */

function isAvailability(v: string): v is AvailabilityFilter {
  return availabilityOptions.some((o) => o.value === v)
}

function isSort(v: string): v is CandidateSort {
  return sortOptions.some((o) => o.value === v)
}

export function AssignCaregiverPage() {
  const { visitId } = useParams()
  const [params, setParams] = useSearchParams()
  // `findVisit`, not the full `contextFor` — the page only needs the visit,
  // and contextFor walks up to six weeks of the board on every keystroke.
  const visit = useMemo(() => findVisit(visitId), [visitId])

  const search = params.get('q') ?? ''
  const avail = params.get('avail') ?? 'all'
  const cert = params.get('cert') ?? 'all'
  const branch = params.get('branch') ?? 'all'
  const sort = params.get('sort') ?? 'match'

  const required = visit ? requirementFor(visit.type) : null

  // Memoised on the raw strings, not the object — a fresh object every render
  // would defeat the memos below it. Anything unrecognised falls back rather
  // than filtering everything out; a hand-edited link should not render an
  // empty page.
  const query = useMemo(
    () => ({
      search,
      availability: isAvailability(avail) ? avail : ('all' as AvailabilityFilter),
      // A certification filter on a service that requires none has no control
      // to represent it, so it is dropped rather than left silently active.
      credential: (required !== null && cert === 'certified'
        ? 'certified'
        : 'all') as CredentialFilter,
      branch: branchesOnRoster.includes(branch) ? branch : 'all',
      sort: isSort(sort) ? sort : ('match' as CandidateSort),
    }),
    [search, avail, cert, branch, sort, required],
  )

  const all = useMemo(() => (visit ? candidatesFor(visit) : []), [visit])
  const shown = useMemo(() => applyQuery(all, query), [all, query])
  const summary = useMemo(() => summarise(shown), [shown])

  if (!visit) return <Navigate to="/scheduling" replace />

  // Nobody can be booked onto a visit that is already over.
  const closed =
    visit.date < TODAY ||
    visit.status === 'completed' ||
    visit.status === 'cancelled'

  const selectedId = params.get('selected')
  // Eligible only — a shared link naming a blocked caregiver must not open a
  // confirm bar for a booking the card says cannot be made.
  const selected =
    shown.find((c) => c.member.id === selectedId && c.eligible && !c.current) ??
    null
  const best = closed ? null : bestMatch(all)
  const top = closed ? null : topRanked(all)
  const filtered =
    query.search !== '' ||
    query.availability !== 'all' ||
    query.credential !== 'all' ||
    query.branch !== 'all'

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    // Changing the filters must not leave a selection behind that is no longer
    // on screen — the confirm bar would describe an invisible card.
    if (key !== 'selected') next.delete('selected')
    setParams(next, { replace: true })
  }

  return (
    // The confirm bar is fixed; the pad keeps the last card and the escape
    // links clear of it. It wraps to several rows on a narrow screen.
    <div className="space-y-6 pb-56 sm:pb-32">
      <nav aria-label="Breadcrumb">
        <ol className="text-ink-subtle flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link to="/scheduling" className="hover:text-ink">
              Scheduling
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              to={`/scheduling/visits/${visit.id}/overview`}
              className="hover:text-ink"
            >
              {visit.type} · {visit.recipientName}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink font-medium" aria-current="page">
            {visit.caregiverId ? 'Reassign caregiver' : 'Assign caregiver'}
          </li>
        </ol>
      </nav>

      <div className="card p-4 sm:p-6">
        <h1 className="text-ink text-2xl font-bold tracking-tight">
          {visit.caregiverId ? 'Reassign caregiver' : 'Assign caregiver'}
        </h1>
        {closed ? (
          <p className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <span>
              This visit is already over, so nobody can be booked onto it. The
              ranking below is shown for reference only.
            </span>
          </p>
        ) : (
          <p className="text-ink-muted mt-1 text-sm">
            Ranked on the certification the service needs, whether the time
            falls inside their availability, whether the client already knows
            them, matching skills and client ratings. Everyone who cannot take
            it is listed too, with the reason.
          </p>
        )}
      </div>

      <VisitStrip visit={visit} required={required} />

      {/* -------------------------------- filters ------------------------------- */}

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 grow basis-64">
            <span className="sr-only">Search caregivers</span>
            <Search
              className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <input
              type="search"
              value={query.search}
              onChange={(e) => set('q', e.target.value)}
              placeholder="Name, role, skill or certification"
              className="border-line placeholder:text-ink-subtle focus-visible:border-brand-400 h-10 w-full rounded-lg border pr-3 pl-9 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            />
          </label>
          <SelectFilter
            label="Sort by"
            value={query.sort}
            onChange={(v) => set('sort', v)}
            options={sortOptions.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter
            label="Show"
            value={query.availability}
            onChange={(v) => set('avail', v)}
            options={availabilityOptions.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          {required !== null && (
            <SelectFilter
              label="Certification"
              value={query.credential}
              onChange={(v) => set('cert', v)}
              options={[
                { value: 'all', label: 'Any' },
                { value: 'certified', label: required },
              ]}
            />
          )}
          <SelectFilter
            label="Branch"
            value={query.branch}
            onChange={(v) => set('branch', v)}
            options={[
              { value: 'all', label: 'All' },
              ...branchesOnRoster.map((b) => ({ value: b, label: b })),
            ]}
          />
          {filtered && (
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="text-brand-700 hover:text-brand-800 inline-flex min-h-11 items-center px-1 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Every count here is of the cards below, not of the roster — the
            two disagreed the moment a filter was applied. */}
        <p className="text-ink-subtle text-xs" role="status" aria-live="polite">
          Showing {shown.length} of {all.length} · {summary.assignable}{' '}
          assignable · {summary.free} free at this time
          {required !== null && ` · ${summary.certified} hold ${required}`}
        </p>
      </div>

      {/* ------------------------------- candidates ----------------------------- */}

      <section aria-labelledby="candidates-heading">
        <h2 id="candidates-heading" className="sr-only">
          Candidates
        </h2>
        {/* No badge on a weak top-of-list. Calling a 12-out-of-100 candidate
            the best match is worse than saying there isn't one. */}
        {!closed && best === null && top !== null && (
          <p className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <span>
              Nobody scores above {RECOMMEND_THRESHOLD} for this visit.{' '}
              {top.member.name} is the closest at {top.score}, but the gaps on
              their card need a coordinator&rsquo;s judgement.
            </span>
          </p>
        )}
        {!closed && top === null && shown.length > 0 && (
          <p className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <span>
              Nobody on the roster can take this visit. Every reason is on the
              cards below.
            </span>
          </p>
        )}
        {shown.length === 0 ? (
          <p className="text-ink-subtle card p-10 text-center text-sm">
            Nobody on the roster matches those filters.
          </p>
        ) : (
          <ul
            aria-label={`${shown.length} caregiver${shown.length === 1 ? '' : 's'}`}
            className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3"
          >
            {shown.map((candidate) => (
              <CandidateCard
                key={candidate.member.id}
                candidate={candidate}
                visit={visit}
                closed={closed}
                best={best?.member.id === candidate.member.id}
                selected={selected?.member.id === candidate.member.id}
                onSelect={() =>
                  set(
                    'selected',
                    selected?.member.id === candidate.member.id
                      ? ''
                      : candidate.member.id,
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/scheduling/visits/${visit.id}/overview`}
          className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
        >
          Cancel
        </Link>
        <Link
          to={`/caregivers?sort=caseload`}
          className="text-brand-700 hover:text-brand-800 inline-flex min-h-11 items-center text-sm font-medium"
        >
          Can&rsquo;t find a match? Open the full roster
        </Link>
      </div>

      {selected && <ConfirmBar candidate={selected} visit={visit} onClear={() => set('selected', '')} />}
    </div>
  )
}

/* ------------------------------- visit strip ------------------------------- */

function VisitStrip({
  visit,
  required,
}: {
  visit: BoardVisit
  required: string | null
}) {
  const rows = [
    { id: 'service', label: 'Service', value: visit.type },
    // Weekday comes off the date, so it cannot be typed wrong.
    { id: 'date', label: 'Date', value: formatFullDay(visit.date) },
    {
      id: 'time',
      label: 'Time',
      value: `${formatTime(visit.start)} – ${formatTime(visit.end)} (${visit.durationHours}h)`,
    },
    {
      id: 'needs',
      label: 'Normally needs',
      value: required ?? 'No specific certification',
    },
    // Stated plainly — the screen was recommending the incumbent as a fresh
    // assignment with nothing saying the visit already had a caregiver.
    {
      id: 'current',
      label: 'Currently assigned',
      value: visit.caregiverName ?? 'Nobody',
    },
  ]

  return (
    <Panel
      title="The visit"
      badge={<PriorityBadge priority={visit.priority} />}
      action={{
        label: 'Open the visit record',
        to: `/scheduling/visits/${visit.id}/overview`,
      }}
    >
      <p className="text-ink text-base font-semibold break-words">
        {visit.recipientName}
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {rows.map((row) => (
          <div key={row.id} className="border-line border-t py-2 first:border-t-0 sm:border-t-0">
            <dt className="text-ink-subtle text-xs">{row.label}</dt>
            <dd className="text-ink mt-0.5 text-sm font-medium break-words">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {visit.recipientStatus !== 'active' && visit.type !== 'Onboarding visit' && (
        <p className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          <span>
            {visit.recipientName} is not currently receiving care. Confirm with
            the coordinator before booking anyone onto this visit.
          </span>
        </p>
      )}
    </Panel>
  )
}

/* ------------------------------ candidate card ----------------------------- */

function CandidateCard({
  candidate,
  visit,
  closed,
  best,
  selected,
  onSelect,
}: {
  candidate: Candidate
  visit: BoardVisit
  closed: boolean
  best: boolean
  selected: boolean
  onSelect: () => void
}) {
  const { member, factors, eligible, score, current } = candidate
  const blockers = factors.filter((f) => f.weight === 'blocker')
  const cautions = factors.filter((f) => f.weight === 'caution')
  const pluses = factors.filter((f) => f.weight === 'plus')
  const headingId = `candidate-${member.id}`

  return (
    <li>
      {/* An article, not a section — nine named regions on one page turns the
          landmark list into noise. */}
      <article
        aria-labelledby={headingId}
        className={cn(
          'card flex h-full flex-col p-4 transition-colors',
          selected && 'ring-brand-500 ring-2',
          !eligible && 'bg-sunken/40',
        )}
      >
        <div className="flex items-start gap-3">
          <Avatar name={member.name} decorative className="size-10" />
          <div className="min-w-0 flex-1">
            <h3 id={headingId} className="text-ink text-sm font-semibold break-words">
              <Link
                to={`/caregivers/${member.id}/overview`}
                className="hover:text-brand-700"
              >
                {member.name}
              </Link>
            </h3>
            {/* Their real title, not "CNA" for everyone — the roster holds
                RNs, a live-in assistant and coordinators. */}
            <p className="text-ink-subtle text-xs break-words">
              {member.title} · {member.branch}
            </p>
          </div>
          {current ? (
            <span className="bg-sunken text-ink-muted shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              On this visit
            </span>
          ) : (
            best && (
              <span className="bg-brand-600 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white">
                Best match
              </span>
            )
          )}
        </div>

        {eligible && score !== null ? (
          <div className="mt-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-ink-subtle text-xs">Match</span>
              <span className="text-ink text-xs font-semibold tabular-nums">
                {score} / 100
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Match score for ${member.name}`}
              className="bg-sunken mt-1 h-1.5 overflow-hidden rounded-full"
            >
              <div
                className="bg-brand-600 h-full rounded-full"
                style={{ width: `${score}%` }}
              />
            </div>
            {/* Every criterion that fed the number, so it can be added up. A
                criterion that cannot apply is absent from both sides. */}
            <ul className="text-ink-subtle mt-1.5 space-y-0.5 text-xs">
              {candidate.scoreParts.map((part) => (
                <li key={part.id} className="flex justify-between gap-2">
                  <span className="min-w-0 break-words">{part.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {part.points} / {part.max}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-ink-subtle mt-3 text-xs font-semibold">
            Not rankable — see below
          </p>
        )}

        <dl className="divide-line mt-3 divide-y text-sm">
          <Fact
            label={`${visit.day} availability`}
            value={
              candidate.window
                ? `${formatTime(candidate.window.start)} – ${formatTime(candidate.window.end)}`
                : 'None set'
            }
          />
          <Fact
            label={`Week of ${formatWeekRange(weekStart(visit.date))}`}
            value={`${candidate.weekHours}h of ${candidate.contractHours}h contracted`}
          />
          <Fact
            label="That day"
            value={`${candidate.dayLoad} visit${candidate.dayLoad === 1 ? '' : 's'} already booked`}
          />
          <Fact
            label="Rating"
            value={
              candidate.rating === null
                ? 'Not yet rated'
                : `${candidate.rating.toFixed(1)} from ${candidate.ratedOn} client${candidate.ratedOn === 1 ? '' : 's'}`
            }
          />
        </dl>

        <Credentials candidate={candidate} visit={visit} />

        {(blockers.length > 0 || cautions.length > 0 || pluses.length > 0) && (
          <ul className="mt-3 space-y-1.5">
            {[...blockers, ...cautions, ...pluses].map((factor) => (
              <FactorRow key={`${factor.weight}-${factor.id}`} factor={factor} />
            ))}
          </ul>
        )}

        <div className="mt-4 flex-1" />

        {current ? (
          <p className="border-line text-ink-muted inline-flex h-11 w-full items-center justify-center rounded-lg border border-dashed text-sm font-medium">
            Already on this visit
          </p>
        ) : closed ? (
          <p className="border-line text-ink-subtle inline-flex h-11 w-full items-center justify-center rounded-lg border border-dashed text-sm font-medium">
            The visit is over
          </p>
        ) : eligible ? (
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={cn(
              'inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors',
              cautions.length > 0
                ? 'border-brand-600 text-brand-700 hover:bg-brand-50 border'
                : 'bg-brand-600 hover:bg-brand-700 text-white',
            )}
          >
            {/* The label says what assigning them would actually mean. */}
            {selected
              ? 'Selected'
              : cautions.length > 0
                ? 'Assign with sign-off'
                : 'Assign'}
          </button>
        ) : (
          <p className="border-line text-ink-subtle inline-flex h-11 w-full items-center justify-center rounded-lg border border-dashed text-sm font-medium">
            Cannot be assigned
          </p>
        )}
      </article>
    </li>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 py-1.5">
      <dt className="text-ink-muted min-w-0 text-xs">{label}</dt>
      <dd className="text-ink min-w-0 text-right text-xs font-medium break-words">
        {value}
      </dd>
    </div>
  )
}

function Credentials({
  candidate,
  visit,
}: {
  candidate: Candidate
  visit: BoardVisit
}) {
  // Judged on the day of the visit when that is later than today — a card
  // expiring in August is fine for July and not for September.
  const states = credentialStates(
    candidate.member,
    visit.date > TODAY ? visit.date : TODAY,
  )

  return (
    <div className="mt-3">
      <p className="text-ink-subtle text-xs font-semibold tracking-wide uppercase">
        Credentials
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {states.map(({ credential, state }) => (
          <li
            key={credential.id}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
              state === 'expired'
                ? 'bg-red-50 text-red-700'
                : state === 'expiring'
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-sunken text-ink-muted',
            )}
          >
            {credential.name}
            {/* The word, not just the colour. */}
            {state === 'expired' && <span> · lapsed</span>}
            {state === 'expiring' && <span> · renewal due</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

const factorStyles: Record<Factor['weight'], string> = {
  blocker: 'text-red-800 bg-red-50 border-red-200',
  caution: 'text-amber-900 bg-amber-50 border-amber-200',
  plus: 'text-emerald-900 bg-emerald-50 border-emerald-200',
}

function FactorRow({ factor }: { factor: Factor }) {
  const Icon =
    factor.weight === 'blocker' ? X : factor.weight === 'caution' ? TriangleAlert : Check

  return (
    <li
      className={cn(
        'flex gap-2 rounded-lg border p-2 text-xs',
        factorStyles[factor.weight],
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden="true" />
      <span className="min-w-0">
        <span className="font-semibold break-words">{factor.label}.</span>{' '}
        <span className="break-words">{factor.detail}</span>
      </span>
    </li>
  )
}

/* ------------------------------- confirm bar ------------------------------- */

function ConfirmBar({
  candidate,
  visit,
  onClear,
}: {
  candidate: Candidate
  visit: BoardVisit
  onClear: () => void
}) {
  const cautions = candidate.factors.filter((f) => f.weight === 'caution')

  return (
    <div
      role="region"
      aria-label="Confirm assignment"
      className="border-line bg-canvas fixed inset-x-0 bottom-0 z-20 border-t p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink text-sm font-semibold break-words">
            {candidate.member.name} → {visit.recipientName},{' '}
            {formatTime(visit.start)}–{formatTime(visit.end)} on{' '}
            {formatFullDay(visit.date)}
          </p>
          {cautions.length > 0 ? (
            <p className="mt-0.5 flex items-start gap-1.5 text-xs text-amber-900">
              <TriangleAlert
                className="mt-0.5 size-3.5 shrink-0"
                strokeWidth={2.4}
                aria-hidden="true"
              />
              <span className="break-words">
                Needs sign-off: {cautions.map((c) => c.label.toLowerCase()).join('; ')}.
              </span>
            </p>
          ) : (
            <p className="text-ink-subtle mt-0.5 flex items-start gap-1.5 text-xs">
              <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>No warnings on this booking.</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="border-line text-ink hover:bg-sunken inline-flex h-11 items-center rounded-lg border px-4 text-sm font-medium"
          >
            Change
          </button>
          {/* aria-disabled, not disabled — focusable and announced. Nothing
              writes back in the sample, and the note says so. */}
          <button
            type="button"
            aria-disabled="true"
            aria-describedby="confirm-note"
            className="bg-brand-600 inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white aria-disabled:cursor-default aria-disabled:opacity-50"
          >
            <BadgeCheck className="size-4" strokeWidth={2.2} aria-hidden="true" />
            Confirm assignment
          </button>
        </div>
      </div>
      <p id="confirm-note" className="text-ink-subtle mx-auto mt-2 max-w-6xl text-xs">
        Sample data — confirming does not write to the rota.
      </p>
    </div>
  )
}
