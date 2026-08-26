import { useMemo } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  CalendarClock,
  Check,
  CircleDot,
  FileText,
  LogIn,
  LogOut,
  MessageSquare,
  Pill,
  SquarePen,
  TriangleAlert,
  UserPlus,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  HISTORY_WEEKS,
  NOW,
  TODAY,
  contextFor,
  describeArrival,
  describeDeparture,
  detailFor,
  formatFullDay,
  formatSpan,
  formatTime,
  historyFor,
  taskProgress,
  writtenByCaregiver,
} from '@/features/scheduling/visit-detail'
import type {
  TimelineEntry,
  TimelineKind,
  VisitContext,
  VisitTask,
} from '@/features/scheduling/visit-detail'
import {
  countVisitNotes,
  filterVisitNotes,
  visitNoteKindLabels,
  visitNoteKindTones,
  visitNoteKinds,
  visitNoteTime,
  visitNotesFor,
} from '@/features/scheduling/visit-notes'
import type { VisitNote, VisitNoteKind } from '@/features/scheduling/visit-notes'
import type { CareNoteEntry } from '@/features/care-recipients/notes-data'
import type { DoseState } from '@/features/care-recipients/medications-data'
import {
  boardOn,
  conflictLabels,
  conflictTones,
  isUnlogged,
} from '@/features/scheduling/board-data'
import type { BoardVisit } from '@/features/scheduling/board-data'
import { formatNoteTime, noteCategoryLabels } from '@/features/care-recipients/notes-data'
import {
  complianceFor,
  credentialStates,
  minutesOfDay,
} from '@/features/caregivers/roster-data'
import {
  goalBarFill,
  goalStatusLabels,
} from '@/features/care-recipients/care-plan-data'
import {
  NotCapturedList,
  VisitLocationMap,
} from '@/features/monitoring/VisitLocationMap'
import {
  branchDistanceMiles,
  formatMiles,
  placeOfRecipient,
  travelMiles,
} from '@/features/monitoring/locations-data'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityBadge, VisitStatusBadge } from '@/components/ui/StatusBadge'
import { recipientStatusLabels } from '@/lib/status-labels'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

const tabs = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'tasks', label: 'Care tasks' },
  { slug: 'timeline', label: 'Timeline' },
  { slug: 'location', label: 'Location & check-in' },
  { slug: 'recipient', label: 'Recipient' },
  { slug: 'caregiver', label: 'Caregiver' },
  { slug: 'care-plan', label: 'Care plan' },
  { slug: 'notes', label: 'Notes' },
  // Not "History" — for a visit in the future the list also holds occurrences
  // between now and then.
  { slug: 'history', label: 'Occurrences' },
] as const

type TabSlug = (typeof tabs)[number]['slug']

function isTab(value: string | undefined): value is TabSlug {
  return tabs.some((t) => t.slug === value)
}

export function VisitDetailsPage() {
  const { visitId, tab } = useParams()
  const [params] = useSearchParams()
  const context = contextFor(visitId)

  const search = params.toString()
  const suffix = search ? `?${search}` : ''

  // An id that resolves to nothing is a dead end, not an empty shell.
  if (!context) return <Navigate to="/scheduling" replace />
  if (!isTab(tab))
    return (
      <Navigate
        to={`/scheduling/visits/${encodeURIComponent(visitId ?? '')}/overview${suffix}`}
        replace
      />
    )

  const { visit } = context
  const bookable =
    visit.date >= TODAY &&
    visit.status !== 'completed' &&
    visit.status !== 'cancelled'

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="text-ink-subtle flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link to="/scheduling" className="hover:text-ink">
              Scheduling
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to={`/scheduling?date=${visit.date}`} className="hover:text-ink">
              {formatFullDay(visit.date)}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink font-medium" aria-current="page">
            Visit details
          </li>
        </ol>
      </nav>

      <div className="card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-ink text-2xl font-bold tracking-tight">
                Visit details
              </h1>
              {isUnlogged(visit) ? (
                <NotWrittenUp />
              ) : (
                <>
                  <VisitStatusBadge status={visit.status} />
                  {/* A backstop, not the main guard: `isUnlogged` above
                      already catches every case the fixture can produce, since
                      an unlogged visit only reads "completed" once its window
                      has passed. It stays so a future status source cannot put
                      a green Completed badge over an empty timeline. */}
                  {visit.status === 'completed' && !visit.logged && <NotWrittenUp />}
                </>
              )}
              <PriorityBadge priority={visit.priority} />
            </div>
            <p className="text-ink-muted mt-1 text-sm break-words">
              {context.reference} · {visit.type} for {visit.recipientName} ·{' '}
              {formatFullDay(visit.date)}
            </p>
          </div>

          {/* aria-disabled, not disabled: the buttons stay focusable and
              announce their state. None of them is wired up in the sample. */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-disabled="true"
              className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
            >
              <SquarePen className="size-4" strokeWidth={1.9} aria-hidden="true" />
              Edit visit
            </button>
            {/* Gated the same way Cancel is — a visit that is over cannot
                change hands. */}
            {bookable && (
              <Link
                to={`/scheduling/visits/${visit.id}/assign`}
                className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
              >
                <UserPlus className="size-4" strokeWidth={1.9} aria-hidden="true" />
                {visit.caregiverId ? 'Reassign' : 'Assign'}
              </Link>
            )}
            {/* Cancelling a visit that already happened is not a thing, so the
                control is only offered while it still can be. */}
            {bookable && (
              <button
                type="button"
                aria-disabled="true"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100 aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-red-50"
              >
                <X className="size-4" strokeWidth={2.2} aria-hidden="true" />
                Cancel visit
              </button>
            )}
          </div>
        </div>

        {!visit.caregiverId && (
          <p className="mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <span>Nobody is on this visit. {context.unassignedReason}</span>
          </p>
        )}

        {visit.outsideAvailability && visit.caregiverId && (
          <p className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <span>
              This shift falls outside the availability {visit.caregiverName} has
              set for {visit.day}.
            </span>
          </p>
        )}

        {/* The board's conflicts for this row, restated nowhere — read from
            the same `conflictsOn` the Conflicts view uses. */}
        {context.conflicts.length > 0 && (
          <ul className="mt-4 space-y-2">
            {context.conflicts.map((conflict) => (
              <li key={conflict.id} className="border-line rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      tonePill[conflictTones[conflict.kind]],
                    )}
                  >
                    {conflictLabels[conflict.kind]}
                  </span>
                  <span className="text-ink min-w-0 font-medium break-words">
                    {conflict.label}
                  </span>
                </div>
                <p className="text-ink-muted mt-1 break-words">{conflict.detail}</p>
              </li>
            ))}
          </ul>
        )}

        {/* Only while it is actually happening. Elapsed runs from the recorded
            clock-in; the bar is the share of the *window*, not the task
            fraction — the source design labelled a bar with the check-in and
            checkout times and then filled it to "67%", which was 4 of 6
            tasks. */}
        {context.progress.underway && (
          <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <LiveTile
              // Not "Elapsed" without a check-in: that would be a presence
              // claim about somebody the app has no evidence arrived.
              label={context.progress.clockIn ? 'Elapsed' : 'Since due to start'}
              value={formatSpan(context.progress.elapsed ?? 0)}
              hint={
                context.progress.clockIn
                  ? `Checked in ${formatTime(context.progress.clockIn)}`
                  : 'No check-in recorded'
              }
            />
            <LiveTile
              label="Remaining"
              value={formatSpan(context.progress.remaining ?? 0)}
              hint={`Scheduled to finish ${formatTime(context.progress.estimatedEnd)}`}
            />
            <LiveTile
              label="Care tasks"
              value={`${taskProgress(context.tasks).done} of ${taskProgress(context.tasks).total}`}
              hint="Read off the clock — nothing records a task being ticked"
            />
            <LiveTile
              label="Visit record"
              value={visit.logged ? 'On file' : 'None filed'}
              hint={
                visit.logged
                  ? 'The only evidence of attendance this app holds'
                  : 'No record, so nothing confirms anyone arrived'
              }
            />
          </dl>
        )}

        {context.progress.underway && (
          <div className="mt-3">
            <div className="flex flex-wrap justify-between gap-2 text-xs">
              <span className="text-ink-muted">
                {context.progress.clockIn
                  ? `Checked in ${formatTime(context.progress.clockIn)}`
                  : `Due to start ${formatTime(visit.start)}`}
              </span>
              <span className="text-ink-muted">
                Scheduled finish {formatTime(context.progress.estimatedEnd)}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={context.progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Share of the scheduled window elapsed"
              className="bg-sunken mt-1 h-2 overflow-hidden rounded-full"
            >
              <div
                className="bg-brand-600 h-full rounded-full"
                style={{ width: `${context.progress.percent}%` }}
              />
            </div>
            <p className="text-ink-subtle mt-1 text-xs">
              {context.progress.percent}% of the scheduled window, as at{' '}
              {formatTime(NOW)}.
            </p>
          </div>
        )}

        <nav
          aria-label="Visit record"
          className="border-line no-scrollbar -mx-4 mt-4 flex gap-1 overflow-x-auto border-b px-2 sm:-mx-6 sm:px-4"
        >
          {tabs.map((t) => {
            const selected = t.slug === tab
            return (
              <Link
                key={t.slug}
                to={`/scheduling/visits/${visit.id}/${t.slug}${suffix}`}
                aria-current={selected ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors',
                  selected
                    ? 'border-brand-600 text-brand-700'
                    : 'text-ink-muted hover:text-ink border-transparent',
                )}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {tab === 'overview' && <Overview context={context} />}
      {tab === 'tasks' && <TasksTab context={context} />}
      {tab === 'timeline' && <TimelineTab context={context} />}
      {tab === 'location' && <LocationTab context={context} />}
      {tab === 'recipient' && <RecipientTab context={context} />}
      {tab === 'caregiver' && <CaregiverTab context={context} />}
      {tab === 'care-plan' && <CarePlanTab context={context} />}
      {tab === 'notes' && <NotesTab context={context} />}
      {tab === 'history' && <HistoryTab context={context} />}
    </div>
  )
}

/* ---------------------------------- shared --------------------------------- */

function LiveTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="border-line rounded-lg border p-3">
      <dt className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
        {label}
      </dt>
      <dd className="text-ink mt-1 text-xl font-bold tracking-tight tabular-nums">
        {value}
      </dd>
      <dd className="text-ink-subtle mt-0.5 text-xs break-words">{hint}</dd>
    </div>
  )
}

/** One rule for how a visit's state reads on a row, used everywhere. */
function RowStatus({ visit }: { visit: BoardVisit }) {
  if (isUnlogged(visit)) return <NotWrittenUp />
  return (
    <span className="flex shrink-0 flex-wrap items-center gap-1.5">
      <VisitStatusBadge status={visit.status} />
      {visit.status === 'completed' && !visit.logged && <NotWrittenUp />}
    </span>
  )
}

function NotWrittenUp() {
  return (
    <span className="text-ink-subtle bg-sunken inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
      Not written up
    </span>
  )
}

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

/* --------------------------------- overview -------------------------------- */

function Overview({ context }: { context: VisitContext }) {
  const { visit, related, recurrence, profile } = context

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Panel title="Visit information">
          <Rows
            rows={[
              { id: 'ref', label: 'Reference', value: context.reference },
              { id: 'date', label: 'Date', value: formatFullDay(visit.date) },
              {
                id: 'time',
                label: 'Time',
                value: `${formatTime(visit.start)} – ${formatTime(visit.end)}`,
              },
              {
                id: 'duration',
                label: 'Duration',
                value: `${visit.durationHours} hour${visit.durationHours === 1 ? '' : 's'}`,
              },
              { id: 'service', label: 'Service', value: visit.type },
              {
                id: 'location',
                label: 'Location',
                value: profile.personal.address,
              },
              {
                // Read off the rota, so the pattern and the neighbouring
                // visits below cannot describe different weeks.
                id: 'recurring',
                label: 'Recurrence',
                value: recurrence ?? 'One-off visit',
              },
            ]}
          />
        </Panel>

        <VisitTasksPanel context={context} />

        {/* The same rows the Notes tab renders, from the same view model. Two
            hand-written lists over one set of notes drifted immediately: this
            panel said "nobody wrote a note" directly above a link to a tab
            showing two, and it left off the marker saying whether the author
            was even on the visit. */}
        <VisitNotesPanel context={context} limit={OVERVIEW_NOTES} />
      </div>

      <div className="space-y-4">
        <RecipientCard context={context} />
        <CaregiverCard context={context} />
        <VisitTimelinePanel context={context} />

        <Panel title="Related visits">
          {related.length === 0 ? (
            <p className="text-ink-subtle text-sm" role="status">
              {recurrence
                ? 'No other occurrence of this slot within three weeks.'
                : 'This visit does not recur.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {related.map(({ visit: other, when }) => (
                <li key={other.id} className="border-line rounded-lg border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <Link
                      to={`/scheduling/visits/${other.id}/overview`}
                      className="text-brand-700 hover:text-brand-800 min-w-0 text-sm font-semibold break-words"
                    >
                      {when === 'previous' ? 'Previous' : 'Next'}: {formatFullDay(other.date)}
                    </Link>
                    <RowStatus visit={other} />
                  </div>
                  <p className="text-ink-muted mt-0.5 text-xs break-words">
                    {formatTime(other.start)} · {other.type} ·{' '}
                    {other.caregiverName ?? 'Unassigned'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function TaskRow({ task }: { task: VisitTask }) {
  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      {/* Icon and words, never colour alone. */}
      {task.state === 'done' ? (
        <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} aria-hidden="true" />
      ) : task.state === 'current' ? (
        <CircleDot className="text-brand-600 size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className="border-line size-4 shrink-0 rounded-full border" />
      )}
      <span
        className={cn(
          'min-w-0 flex-1 text-sm break-words',
          task.state === 'done' ? 'text-ink-muted' : 'text-ink',
        )}
      >
        {task.label}
      </span>
      <span
        className={cn(
          'shrink-0 text-xs font-semibold',
          task.state === 'done'
            ? 'text-emerald-700'
            : task.state === 'current'
              ? 'text-brand-700'
              : 'text-ink-subtle',
        )}
      >
        {task.state === 'done' ? 'Done' : task.state === 'current' ? 'In progress' : 'Pending'}
      </span>
    </li>
  )
}

/* ----------------------------------- cards --------------------------------- */

function RecipientCard({ context }: { context: VisitContext }) {
  const { recipient, profile, primaryContact } = context
  return (
    <Panel
      title="Care recipient"
      action={{ label: 'Open the care record', to: `/care-recipients/${recipient.id}` }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={recipient.name} decorative className="size-10 shrink-0" />
        <div className="min-w-0">
          <p className="text-ink text-sm font-semibold break-words">{recipient.name}</p>
          <p className="text-ink-subtle text-xs">
            {recipient.age} years old · {profile.sex}
          </p>
        </div>
      </div>
      <Rows
        rows={[
          { id: 'condition', label: 'Primary condition', value: recipient.condition },
          { id: 'level', label: 'Care level', value: recipient.careLevel },
          {
            // From the shared label map, so this screen cannot say "On-hold"
            // where every other screen says "On hold".
            id: 'status',
            label: 'Care status',
            value: recipientStatusLabels[recipient.status],
          },
          {
            id: 'contact',
            label: 'Primary contact',
            // From the family directory, so the relationship cannot drift.
            value: primaryContact
              ? `${primaryContact.name} (${primaryContact.relationship}) · ${primaryContact.phone}`
              : 'None on file',
          },
        ]}
      />
    </Panel>
  )
}

function CaregiverCard({ context }: { context: VisitContext }) {
  const { caregiver, visit } = context

  if (!caregiver) {
    return (
      <Panel title="Assigned caregiver">
        <p className="text-ink-subtle text-sm" role="status">
          Nobody is assigned. {context.unassignedReason}
        </p>
        <Link
          to="/caregivers?sort=compliance"
          className="text-brand-700 hover:text-brand-800 mt-2 inline-flex min-h-11 items-center text-sm font-medium"
        >
          Find someone on the roster
        </Link>
      </Panel>
    )
  }

  const window = caregiver.availability.find((w) => w.day === visit.day)

  return (
    <Panel
      title="Assigned caregiver"
      action={{ label: 'Open the staff record', to: `/caregivers/${caregiver.id}/overview` }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={caregiver.name} decorative className="size-10 shrink-0" />
        <div className="min-w-0">
          <p className="text-ink text-sm font-semibold break-words">{caregiver.name}</p>
          <p className="text-ink-subtle text-xs break-words">{caregiver.title}</p>
        </div>
      </div>
      <Rows
        rows={[
          { id: 'branch', label: 'Branch', value: caregiver.branch },
          { id: 'shift', label: 'Preferred shift', value: caregiver.preferredShift },
          {
            id: 'window',
            label: `${visit.day} availability`,
            value: window
              ? `${formatTime(window.start)} – ${formatTime(window.end)}`
              : 'None set',
          },
        ]}
      />
      <button
        type="button"
        aria-disabled="true"
        className="border-line text-ink hover:bg-sunken mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
      >
        <MessageSquare className="size-4" strokeWidth={1.9} aria-hidden="true" />
        Message
        <span className="sr-only"> {caregiver.name}</span>
      </button>
    </Panel>
  )
}

/* --------------------------------- tasks tab ------------------------------- */

/**
 * The only tasks panel. Overview renders it plain; the Care tasks tab renders
 * it with the evidence attached. One component, so the two can never tell
 * different stories about a cancelled or unrecorded visit — which is exactly
 * what happened when there were two.
 */
function VisitTasksPanel({
  context,
  detailed = false,
}: {
  context: VisitContext
  detailed?: boolean
}) {
  const { tasks, visit, notes } = context
  const progress = taskProgress(tasks)
  const own = writtenByCaregiver(notes, visit)

  // The heading follows the visit, not the raw task state: an all-pending list
  // on a cancelled visit is not "still to do".
  const heading =
    visit.status === 'cancelled'
      ? 'Care tasks — visit cancelled'
      : isUnlogged(visit)
        ? 'Care tasks — never recorded'
        : 'Care tasks'

  const note =
    visit.status === 'cancelled'
      ? 'The visit was cancelled, so none of these ran.'
      : isUnlogged(visit)
        ? // Only the caregiver's own notes. A coordinator's phone note filed
          // during the window is not evidence anybody attended, and offering it
          // as such contradicted the timeline on the same screen.
          own.length > 0
          ? `No visit record was filed; ${own.length === 1 ? 'the caregiver’s note' : `${own.length} notes from the caregiver`} on the timeline ${own.length === 1 ? 'is' : 'are'} the only evidence.`
          : 'The window closed with no visit record, so nothing is known to have happened.'
        : progress.done === 0 && visit.date >= TODAY
          ? 'Nothing is ticked until somebody checks in.'
          : progress.done === 0
            ? 'Nothing was recorded against this visit.'
            : `The checklist for a ${visit.type.toLowerCase()} visit.`

  return (
    <Panel
      title={heading}
      badge={
        <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
          {progress.done} of {progress.total} done
        </span>
      }
      flush={detailed}
    >
      {detailed ? (
        <ul className="divide-line border-line divide-y border-t">
          {tasks.map((task) => (
            <TaskDetailRow key={task.id} task={task} visit={visit} notes={notes} />
          ))}
        </ul>
      ) : (
        <ul className="divide-line divide-y">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
      <p
        className={cn(
          'text-ink-subtle text-xs',
          detailed ? 'border-line border-t px-4 py-3' : 'mt-3',
        )}
      >
        {note} Progress is read off the clock — nothing records a task being
        ticked, so none of these carries a completion time or a sign-off.
      </p>
    </Panel>
  )
}

function TasksTab({ context }: { context: VisitContext }) {
  const { recipient, profile } = context

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <VisitTasksPanel context={context} detailed />
      </div>

      <Panel
        title="Care recipient"
        action={{ label: 'Open the care record', to: `/care-recipients/${recipient.id}` }}
      >
        <Rows
          rows={[
            {
              id: 'name',
              label: 'Name and age',
              value: `${recipient.name}, ${recipient.age}`,
            },
            { id: 'condition', label: 'Primary condition', value: recipient.condition },
            { id: 'level', label: 'Care level', value: recipient.careLevel },
            {
              id: 'secondary',
              label: 'Secondary diagnosis',
              value: profile.summary.secondaryDiagnosis,
            },
            {
              id: 'coordinator',
              label: 'Coordinator',
              value: profile.summary.coordinator,
            },
          ]}
        />
      </Panel>
    </div>
  )
}

/** Typed by DoseState, so a new state is a compile error, not a blank class. */
const doseTone: Record<DoseState, string> = {
  administered: 'bg-emerald-50 text-emerald-700',
  scheduled: 'bg-sunken text-ink-muted',
  missed: 'bg-red-50 text-red-700',
}

function TaskDetailRow({
  task,
  visit,
  notes,
}: {
  task: VisitTask
  visit: BoardVisit
  notes: CareNoteEntry[]
}) {
  const detail = detailFor(task, visit, notes)

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-ink text-sm font-medium break-words">{task.label}</p>
          <p className="mt-1">
            <span className="bg-sunken text-ink-muted inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium">
              {task.category}
            </span>
          </p>
        </div>
        <span className="shrink-0">
          <TaskStateChip state={task.state} />
        </span>
      </div>

      {detail?.kind === 'medication' && (
        <div className="mt-2 space-y-2">
          {detail.doses.map((dose) => (
            <div key={dose.id} className="border-line rounded-lg border p-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-ink text-xs font-semibold">
                  {dose.title} · {dose.time}
                </span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                    doseTone[dose.state],
                  )}
                >
                  {dose.state === 'administered'
                    ? `Given by ${dose.administeredBy}`
                    : dose.state === 'missed'
                      ? 'Missed'
                      : `Scheduled — ${dose.administeredBy}`}
                </span>
              </div>
              <p className="text-ink-muted mt-1 text-xs break-words">{dose.medications}</p>
            </div>
          ))}
          <p className="text-ink-subtle text-xs">
            {/* Not the day's plan — the part of it this visit covers. The
                client's own Medications tab lists all of them. */}
            The {detail.doses.length} of {detail.dosesThatDay} dose window
            {detail.dosesThatDay === 1 ? '' : 's'} on {formatFullDay(visit.date)} that
            this visit&rsquo;s {formatTime(visit.start)}–{formatTime(visit.end)} slot
            covers.
          </p>
        </div>
      )}

      {detail?.kind === 'vitals' && (
        <div className="mt-2">
          <ul className="flex flex-wrap gap-1.5">
            {detail.readings.map((v) => (
              <li key={v.id} className="border-line rounded-md border px-2 py-1 text-xs">
                <span className="text-ink-muted">{v.label} </span>
                <span className="text-ink font-semibold">
                  {v.value} {v.unit}
                </span>
                {/* The word, not just a colour. */}
                {v.status !== 'neutral' && (
                  <span
                    className={cn(
                      'ml-1',
                      v.status === 'watch' ? 'text-amber-700' : 'text-emerald-700',
                    )}
                  >
                    · {v.status === 'watch' ? 'watch' : 'normal'}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-ink-subtle mt-1.5 text-xs">
            The latest readings on {visit.recipientName}&rsquo;s health record — not
            captured on this visit.
          </p>
        </div>
      )}

      {detail?.kind === 'note' && (
        <div className="mt-2 space-y-2">
          {detail.notes.map((note) => (
            <div key={note.id} className="border-line rounded-lg border p-2.5">
              <p className="text-ink-subtle text-xs">
                {note.author} · {note.authorRole} · {formatNoteTime(note.at)} ·{' '}
                {noteCategoryLabels[note.category]}
              </p>
              <p className="text-ink-muted mt-1 text-xs break-words">{note.body}</p>
            </div>
          ))}
          <p className="text-ink-subtle text-xs">
            {/* The app does not link a note to a task; this is the write-up
                that falls inside the visit's window. */}
            From {visit.recipientName}&rsquo;s care notes, written inside this
            visit&rsquo;s window. Nothing links a note to a task.
          </p>
        </div>
      )}

      {detail === null && task.evidence !== 'none' && task.state !== 'pending' && (
        <p className="text-ink-subtle mt-2 text-xs">
          {task.evidence === 'note'
            ? `${visit.caregiverName ?? 'Nobody'} wrote nothing up inside this visit's window.`
            : task.evidence === 'medication'
              ? 'No dose window on the plan falls inside this visit.'
              : `Nothing on ${visit.recipientName}'s health record.`}
        </p>
      )}
    </li>
  )
}

function TaskStateChip({ state }: { state: VisitTask['state'] }) {
  const label = state === 'done' ? 'Done' : state === 'current' ? 'In progress' : 'Pending'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        state === 'done'
          ? 'bg-emerald-50 text-emerald-700'
          : state === 'current'
            ? 'bg-brand-50 text-brand-700'
            : 'bg-sunken text-ink-muted',
      )}
    >
      {state === 'done' && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
      {label}
    </span>
  )
}

/* -------------------------------- timeline tab ----------------------------- */

/** One timeline panel, rendered by the Overview and by the Timeline tab. */
function VisitTimelinePanel({
  context,
  detailed = false,
}: {
  context: VisitContext
  detailed?: boolean
}) {
  const { timeline, visit, notes } = context
  const recorded = timeline.filter((e) => e.source === 'record').length

  if (timeline.length === 0)
    return (
      <Panel title="Timeline">
        {/* Branch on the visit, not on an empty array — the array being empty
            was being *read* as "cancelled". And a cancelled visit can still
            have a note timestamped inside its window, which the Notes panel
            beside this one renders: saying "nothing to show" contradicted it
            on the same screen. */}
        <p className="text-ink-subtle text-sm" role="status">
          {visit.status === 'cancelled'
            ? notes.length > 0
              ? `The visit was cancelled, so no times were recorded against it. ${notes.length === 1 ? 'A note' : `${notes.length} notes`} filed in its window ${notes.length === 1 ? 'is' : 'are'} under Notes.`
              : 'The visit was cancelled, so no times were recorded against it.'
            : 'Nothing on this visit carries a time.'}
        </p>
      </Panel>
    )

  return (
    <Panel
      title="Timeline"
      badge={
        // Not "N recorded of M": a coordinator's note filed during the window
        // is a record, but not a record *of this visit*, and the shorter
        // wording invited that reading.
        <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
          {recorded} timestamped · {timeline.length - recorded} from the rota
        </span>
      }
      flush
    >
      <ol className="divide-line border-line divide-y border-t">
        {timeline.map((entry) => (
          <TimelineRow key={entry.id} entry={entry} detailed={detailed} />
        ))}
      </ol>
      <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
        {/* The distinction the source design erased by calling the whole list
            "verified via GPS and manual logging". */}
        Solid markers are records with their own timestamp — a clock-in or
        clock-out, a medication round, a note. Hollow markers are times nobody
        recorded: the rota&rsquo;s start and finish, and any dose still only
        planned. Both clock times were typed onto a record; nothing behind them
        confirms an arrival or a departure, and no location is captured at
        either.
        {visit.date === TODAY && ` As at ${formatTime(NOW)}.`}
      </p>
    </Panel>
  )
}

const timelineIcons: Record<TimelineKind, LucideIcon> = {
  'scheduled-start': CalendarClock,
  'clock-in': LogIn,
  dose: Pill,
  note: FileText,
  'clock-out': LogOut,
  'scheduled-end': CalendarClock,
}

function TimelineRow({ entry, detailed }: { entry: TimelineEntry; detailed: boolean }) {
  const Icon = timelineIcons[entry.kind]
  const isRecord = entry.source === 'record'

  return (
    <li className="flex gap-3 p-4">
      <span className="flex shrink-0 flex-col items-center">
        {/* Filled for a record, hollow for a scheduled time — shape, not just
            colour. The fill is decorative, so the word goes in the
            accessibility tree. */}
        <span
          className={cn(
            'grid size-7 place-items-center rounded-full border',
            isRecord
              ? 'bg-brand-600 border-brand-600 text-white'
              : 'border-line text-ink-subtle bg-white',
          )}
        >
          <Icon className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          <span className="sr-only">{isRecord ? 'Recorded: ' : 'Scheduled: '}</span>
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p
            className={cn(
              'min-w-0 text-sm break-words',
              entry.next ? 'text-brand-700 font-semibold' : 'text-ink',
            )}
          >
            {entry.label}
            {/* The detailed view carries a visible "Next due" below, so the
                sr-only copy would be read twice. */}
            {entry.next && !detailed && <span className="sr-only"> — next due</span>}
          </p>
          <p className="text-ink-subtle shrink-0 text-xs tabular-nums">
            {formatTime(entry.at)}
          </p>
        </div>
        {entry.detail && (
          <p className="text-ink-muted mt-0.5 text-xs break-words">{entry.detail}</p>
        )}
        {detailed && (
          <p className="text-ink-subtle mt-1 text-xs">
            <span
              className={cn(
                'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold',
                isRecord ? 'bg-emerald-50 text-emerald-700' : 'bg-sunken text-ink-muted',
              )}
            >
              {isRecord ? 'Recorded' : 'Scheduled'}
            </span>
            {entry.next && (
              <span className="text-brand-700 ml-2 font-medium">Next due</span>
            )}
          </p>
        )}
      </div>
    </li>
  )
}

function TimelineTab({ context }: { context: VisitContext }) {
  const { visit, recipient, profile, primaryContact, caregiver } = context

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <VisitTimelinePanel context={context} detailed />
      </div>

      <div className="space-y-4">
        {/* A handover brief built from the care record, not an "ops manager on
            duty" and an "emergency dispatcher" the app has never heard of. */}
        <Panel
          title="Handover brief"
          action={{ label: 'Open the care record', to: `/care-recipients/${recipient.id}` }}
        >
          <Rows
            rows={[
              {
                id: 'diagnosis',
                label: 'Primary diagnosis',
                value: profile.summary.primaryDiagnosis,
              },
              {
                id: 'secondary',
                label: 'Secondary diagnosis',
                value: profile.summary.secondaryDiagnosis,
              },
              {
                id: 'coordinator',
                label: 'Coordinator',
                value: profile.summary.coordinator,
              },
              {
                id: 'caregiver',
                label: 'On this visit',
                value: caregiver
                  ? `${caregiver.name} · ${caregiver.branch}`
                  : 'Nobody assigned',
              },
              {
                id: 'emergency',
                label: 'Emergency contact',
                value: primaryContact
                  ? `${primaryContact.name} (${primaryContact.relationship}) · ${primaryContact.phone}`
                  : 'None on file',
              },
            ]}
          />
        </Panel>

        <Panel title="How this visit closes">
          <p className="text-ink-muted text-sm break-words">
            The rota has it finishing at {formatTime(visit.end)}.{' '}
            {context.progress.clockOut
              ? `A clock-out of ${formatTime(context.progress.clockOut)} was entered on the visit record — a typed time, with no location confirmation and no sign-off behind it.`
              : visit.logged
                ? 'No clock-out was entered on the visit record.'
                : 'No visit record was filed, so nothing closes it at all.'}{' '}
            Whether a record exists is the other half of the closing evidence,
            and it is what the &ldquo;Not written up&rdquo; badge tracks.
          </p>
        </Panel>
      </div>
    </div>
  )
}

/* -------------------------------- location tab ----------------------------- */

function LocationTab({ context }: { context: VisitContext }) {
  const { visit, caregiver } = context
  const place = placeOfRecipient(visit.recipientId)
  const travel = travelMiles(visit.caregiverId, visit.recipientId)
  const branch = caregiver?.branch ?? null
  const fromBranch = branchDistanceMiles(branch, visit.recipientId)

  // Three states, not two: "Window open" on a visit three weeks out read as
  // "in progress, not yet checked out". The end is unwrapped for an overnight
  // block, the way every other computation on this page does it.
  const startMin = minutesOfDay(formatTime(visit.start))
  // An overnight block's finish runs past 24:00; `nowMin` is always a
  // time-of-day on `visit.date`, so it is never the side that needs unwrapping
  // — a guard that added 24 hours to it called a 22:00 visit closed at noon.
  const endMin = startMin + Math.round(visit.durationHours * 60)
  const nowMin = minutesOfDay(formatTime(NOW))
  const windowState: 'closed' | 'open' | 'not-open' =
    visit.date < TODAY
      ? 'closed'
      : visit.date > TODAY
        ? 'not-open'
        : nowMin >= endMin
          ? 'closed'
          : nowMin >= startMin
            ? 'open'
            : 'not-open'
  const windowLabels = {
    closed: 'Window closed',
    open: 'Window open',
    'not-open': 'Not started yet',
  } as const
  const notYet = windowState === 'not-open'

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        {/* A cancelled visit was never due to be attended, and an unassigned
            one has no "they" to talk about. Every sibling tab branches on
            these; this one used to talk about a caregiver either way. */}
        {visit.status === 'cancelled' ? (
          <Panel title="Check-in and check-out">
            <p className="text-ink-muted text-sm break-words" role="status">
              The visit was cancelled, so no check-in was ever due and nothing
              closes it. The address and distances are still the client&rsquo;s.
            </p>
          </Panel>
        ) : visit.caregiverId === null ? (
          <Panel title="Check-in and check-out">
            <p className="text-ink-muted text-sm break-words" role="status">
              Nobody is on this visit, so there is no check-in to record.{' '}
              {context.unassignedReason}
            </p>
          </Panel>
        ) : (
          <>
            <Panel
              title="Check-in"
              badge={
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                    context.progress.clockIn
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-sunken text-ink-muted',
                  )}
                >
                  {/* Not "Verified" — a recorded time is not a verified one.
                      And the same three states as the Check-out badge below:
                      "No time recorded" on a visit next week read as a data
                      defect rather than as a visit that has not happened. */}
                  {context.progress.clockIn
                    ? 'Time recorded'
                    : notYet
                      ? 'Not started yet'
                      : 'No time recorded'}
                </span>
              }
            >
              <Rows
                rows={[
                  {
                    id: 'scheduled',
                    label: 'Scheduled start',
                    value: formatTime(visit.start),
                  },
                  {
                    id: 'clockin',
                    label: 'Clock-in on the visit record',
                    value: context.progress.clockIn
                      ? formatTime(context.progress.clockIn)
                      : notYet
                        ? 'Not due yet'
                        : 'Not recorded',
                  },
                  {
                    id: 'variance',
                    label: 'Difference',
                    value: context.progress.clockIn
                      ? describeArrival(visit.start, context.progress.clockIn)
                      : 'Nothing to compare',
                  },
                  {
                    // The row the mockup filled with "45m (Within Range)".
                    id: 'where',
                    label: 'Where they checked in from',
                    value: 'Not captured',
                  },
                ]}
              />
              <p className="text-ink-subtle mt-3 text-xs">
                A clock-in is a time somebody entered on the visit record.
                Nothing confirms where it was entered from, or that anyone
                arrived.
              </p>
            </Panel>

            <Panel
              title="Check-out"
              badge={
                <span className="bg-sunken text-ink-muted inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
                  {windowLabels[windowState]}
                </span>
              }
            >
              <Rows
                rows={[
                  { id: 'end', label: 'Scheduled finish', value: formatTime(visit.end) },
                  {
                    // The record does carry this. Dropping it while showing the
                    // clock-in let this panel claim the app captures no
                    // checkout at all, while the client's own Visits tab
                    // printed one.
                    id: 'clockout',
                    label: 'Clock-out on the visit record',
                    value: context.progress.clockOut
                      ? formatTime(context.progress.clockOut)
                      : notYet
                        ? 'Not due yet'
                        : 'Not recorded',
                  },
                  {
                    id: 'variance',
                    label: 'Difference',
                    value: context.progress.clockOut
                      ? describeDeparture(visit.end, context.progress.clockOut)
                      : 'Nothing to compare',
                  },
                  {
                    id: 'record',
                    label: 'Visit record',
                    value: visit.logged ? 'On file' : 'None filed',
                  },
                  {
                    id: 'confirm',
                    label: 'Departure confirmation',
                    value: 'Not captured',
                  },
                ]}
              />
              <p className="text-ink-subtle mt-3 text-xs">
                A clock-out is a typed time, the same as the clock-in — no tap,
                no photo, no signature stands behind it. That and whether a
                record was filed are the only closing evidence, and the record is
                what the &ldquo;Not written up&rdquo; badge tracks.
              </p>
            </Panel>
          </>
        )}

        <Panel title="What this app does not capture">
          {/* Named rather than quietly omitted: the mockup showed all four of
              these as live, verified facts. */}
          <NotCapturedList />
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="The address and its boundary">
          <VisitLocationMap visit={visit} />
        </Panel>

        <Panel title="Distances">
          <Rows
            rows={[
              { id: 'address', label: 'Address', value: place?.address ?? 'Not on file' },
              {
                id: 'travel',
                label: 'Caregiver’s home to here, straight line',
                value:
                  travel !== null
                    ? formatMiles(travel)
                    : visit.caregiverId === null
                      ? 'No caregiver assigned'
                      : 'No coordinates on file',
              },
              {
                id: 'branch',
                label: 'Branch to here, straight line',
                value:
                  fromBranch !== null
                    ? `${formatMiles(fromBranch)} from ${branch}`
                    : branch === null
                      ? 'No caregiver, so no branch'
                      : 'No coordinates on file',
              },
            ]}
          />
          <p className="text-ink-subtle mt-3 text-xs">
            Between two addresses, not road distance and not a journey time.{' '}
            <Link to="/live-monitoring?view=map" className="text-brand-700">
              See every visit on the map
            </Link>
            .
          </p>
        </Panel>
      </div>
    </div>
  )
}

/* ----------------------------------- tabs ---------------------------------- */

function RecipientTab({ context }: { context: VisitContext }) {
  const { recipient, profile, family } = context

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <RecipientCard context={context} />
        <Panel title="At the address">
          {/* No care status row here — the card above already carries it, and
              two of them a few hundred pixels apart is a contradiction waiting
              to happen. */}
          <Rows
            rows={[
              { id: 'address', label: 'Address', value: profile.personal.address },
              { id: 'phone', label: 'Phone', value: profile.personal.phone },
              { id: 'email', label: 'Email', value: profile.personal.email },
            ]}
          />
        </Panel>
      </div>

      <Panel
        title="Who to call"
        badge={
          <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
            {family.length} contact{family.length === 1 ? '' : 's'}
          </span>
        }
        action={{
          label: 'Open the family record',
          to: `/care-recipients/${recipient.id}/family`,
        }}
      >
        {family.length === 0 ? (
          <p className="text-ink-subtle text-sm" role="status">
            No family contact is on file for {recipient.name}.
          </p>
        ) : (
          <ul className="divide-line divide-y">
            {family.map((member) => (
              <li key={member.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-ink text-sm font-semibold break-words">
                  {member.name}
                  <span className="text-ink-subtle ml-2 text-xs font-normal">
                    {member.relationship}
                  </span>
                </p>
                <p className="text-ink-muted mt-0.5 text-sm break-words">
                  {member.phone} · prefers {member.preferred.toLowerCase()}
                </p>
                <p className="text-ink-subtle mt-0.5 text-xs break-words">
                  {member.roles.join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function CaregiverTab({ context }: { context: VisitContext }) {
  const { caregiver, visit } = context

  if (!caregiver)
    return (
      <div className="max-w-2xl">
        <CaregiverCard context={context} />
      </div>
    )

  const asAt = visit.date > TODAY ? visit.date : TODAY
  const compliance = complianceFor(caregiver, asAt)
  const credentials = credentialStates(caregiver, asAt)
  // The rest of their day, so a coordinator can see what reassigning costs.
  const sameDay = boardOn(visit.date).filter(
    (v) => v.caregiverId === caregiver.id && v.id !== visit.id,
  )

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <CaregiverCard context={context} />
      </div>

      <div className="space-y-4">
        <Panel
          title="Credentials"
          badge={
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                tonePill[
                  compliance === 'expired'
                    ? 'red'
                    : compliance === 'expiring'
                      ? 'amber'
                      : 'green'
                ],
              )}
            >
              {compliance === 'expired'
                ? 'Lapsed'
                : compliance === 'expiring'
                  ? 'Renewal due'
                  : 'In date'}
            </span>
          }
          action={{
            label: 'Open their documents',
            to: `/caregivers/${caregiver.id}/documents`,
          }}
        >
          <ul className="divide-line divide-y">
            {credentials.map((c) => (
              <li
                key={c.credential.id}
                className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-ink min-w-0 text-sm break-words">
                  {c.credential.name}
                </span>
                <span
                  className={cn(
                    'shrink-0 text-xs font-semibold',
                    c.state === 'expired'
                      ? 'text-red-700'
                      : c.state === 'expiring'
                        ? 'text-amber-700'
                        : 'text-emerald-700',
                  )}
                >
                  {c.state === 'expired'
                    ? 'Lapsed'
                    : c.state === 'expiring'
                      ? 'Renewal due'
                      : 'In date'}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={`Rest of their ${visit.day}`}>
          {sameDay.length === 0 ? (
            <p className="text-ink-subtle text-sm" role="status">
              This is {caregiver.name}&rsquo;s only visit on {formatFullDay(visit.date)}.
            </p>
          ) : (
            <ul className="divide-line divide-y">
              {sameDay.map((other) => (
                <li key={other.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link
                    to={`/scheduling/visits/${other.id}/overview`}
                    className="text-ink hover:text-brand-700 text-sm font-medium break-words"
                  >
                    {formatTime(other.start)} – {formatTime(other.end)} ·{' '}
                    {other.recipientName}
                  </Link>
                  <p className="text-ink-subtle mt-0.5 text-xs break-words">
                    {other.type}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function CarePlanTab({ context }: { context: VisitContext }) {
  const { carePlan, recipient, visit } = context

  if (!carePlan) {
    return (
      <p className="text-ink-subtle max-w-2xl text-sm" role="status">
        No care plan is recorded for {recipient.name}.{' '}
        <Link
          to={`/care-recipients/${recipient.id}/care-plan`}
          className="text-brand-700 font-medium"
        >
          Open the care plan tab
        </Link>
        .
      </p>
    )
  }

  const critical = [...carePlan.medicalNeeds, ...carePlan.behavioural].filter(
    (i) => i.level !== 'standard',
  )

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel
        title="Goals"
        action={{
          label: 'Open the full plan',
          to: `/care-recipients/${recipient.id}/care-plan`,
        }}
      >
        <ul className="divide-line divide-y">
          {carePlan.goals.map((goal) => (
            <li key={goal.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-ink min-w-0 text-sm font-medium break-words">
                  {goal.title}
                </p>
                {/* The status in words as well as colour — a 92% amber bar and
                    a 92% green bar are the same bar without colour vision. */}
                <p className="text-ink-muted shrink-0 text-xs">
                  <span className="tabular-nums">{goal.percent}%</span> ·{' '}
                  {goalStatusLabels[goal.status]}
                </p>
              </div>
              {/* Same role, same colours and same words as the care record's
                  own goal bars — both read the shared maps. */}
              <div
                role="progressbar"
                aria-valuenow={goal.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${goal.title}: ${goalStatusLabels[goal.status]}`}
                className="bg-sunken mt-1.5 h-1.5 overflow-hidden rounded-full"
              >
                <div
                  className={cn('h-full rounded-full', goalBarFill[goal.status])}
                  style={{ width: `${goal.percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="space-y-4">
        <Panel title="Daily routine">
          <ul className="divide-line divide-y">
            {carePlan.schedule.map((entry) => (
              <li key={entry.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="text-ink-muted w-20 shrink-0 text-xs tabular-nums">
                  {entry.time}
                </span>
                <span className="min-w-0">
                  <span className="text-ink block text-sm break-words">{entry.title}</span>
                  <span className="text-ink-subtle block text-xs break-words">
                    {entry.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        {critical.length > 0 && (
          <Panel title="Standing instructions">
            {/* Only the caution and critical lines — the routine ones are on
                the care record, and a visit screen that repeats all of them
                buries the two that matter. */}
            <ul className="space-y-2">
              {critical.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    'rounded-lg border p-3 text-sm break-words',
                    item.level === 'critical'
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900',
                  )}
                >
                  <span className="mr-1.5 text-xs font-semibold uppercase">
                    {item.level}
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <p className="text-ink-subtle text-xs">
          The plan is owned by the care record; this is the part that bears on a{' '}
          {visit.type.toLowerCase()} visit.
        </p>
      </div>
    </div>
  )
}

function isNoteKind(value: string): value is VisitNoteKind {
  return visitNoteKinds.some((k) => k.value === value)
}

/** How many rows the Overview shows before deferring to the tab. */
const OVERVIEW_NOTES = 3

/**
 * The list, shared by the Overview panel and the Notes tab. The Overview
 * passes a limit and gets no chips; the tab gets the filter row and the
 * footnote.
 */
function VisitNotesPanel({
  context,
  limit,
}: {
  context: VisitContext
  limit?: number
}) {
  const { notes, recipient, visit } = context
  const [params, setParams] = useSearchParams()
  const filterable = limit === undefined

  const all = useMemo(() => visitNotesFor(visit, notes), [visit, notes])
  const raw = params.get('notes') ?? 'all'
  const kind: VisitNoteKind | 'all' =
    filterable && isNoteKind(raw) ? raw : 'all'
  const counts = useMemo(() => countVisitNotes(all), [all])
  const matching = useMemo(() => filterVisitNotes(all, kind), [all, kind])
  const shown = limit === undefined ? matching : matching.slice(0, limit)

  const setKind = (next: VisitNoteKind | 'all') => {
    const nextParams = new URLSearchParams(params)
    if (next === 'all') nextParams.delete('notes')
    else nextParams.set('notes', next)
    setParams(nextParams, { replace: true })
  }

  const authored = counts.all - counts.record

  const empty = (
    <p className="text-ink-subtle text-sm" role="status">
      {visit.status === 'cancelled'
        ? 'The visit was cancelled, so nothing was filed against its window. '
        : visit.caregiverName
          ? `Nothing was filed for ${recipient.name} inside this visit's window — no note, no clock time, no medication round. `
          : `No caregiver is on this visit, and nothing was filed for ${recipient.name} inside its window. `}
      <Link
        to={`/care-recipients/${recipient.id}/notes`}
        className="text-brand-700 font-medium"
      >
        See every note on the care record
      </Link>
      .
    </p>
  )

  const body = (
    <>
      {/* A cancelled visit's notes are still notes, but "On this visit" on a
          row belonging to a visit nobody attended reads as attendance. */}
      {visit.status === 'cancelled' && all.length > 0 && (
        <p className="border-line text-ink-muted mb-3 rounded-lg border p-3 text-sm">
          The visit was cancelled and nobody attended. These were filed against
          its window.
        </p>
      )}

      {filterable && (
        /*
          Chips, not a "+ Add Coordinator Note" button. Nothing in this app
          writes a note, so an enabled compose button would be the one control
          on the screen promising an action it cannot perform.
        */
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterChip
            label="Everything"
            count={counts.all}
            selected={kind === 'all'}
            onSelect={() => setKind('all')}
          />
          {visitNoteKinds
            // A chip that would empty the list is not offered.
            .filter((k) => counts[k.value] > 0)
            .map((k) => (
              <FilterChip
                key={k.value}
                label={k.label}
                count={counts[k.value]}
                selected={kind === k.value}
                onSelect={() => setKind(k.value)}
              />
            ))}
        </div>
      )}

      {/* Reachable by URL even though no chip offers it: `?notes=record` on a
          visit with no record entries used to render an empty list and no
          explanation. */}
      {shown.length === 0 ? (
        <p className="text-ink-subtle text-sm" role="status">
          Nothing here is {visitNoteKindLabels[kind as VisitNoteKind]?.toLowerCase()}.{' '}
          <button
            type="button"
            onClick={() => setKind('all')}
            className="text-brand-700 font-medium underline-offset-2 hover:underline"
          >
            Show all {counts.all}
          </button>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((note) => (
            <VisitNoteRow key={note.id} note={note} date={visit.date} />
          ))}
        </ul>
      )}

      {limit !== undefined && matching.length > limit && (
        <p className="text-ink-subtle mt-3 text-xs">
          {matching.length - limit} more on the Notes tab.
        </p>
      )}

      {filterable && (
        <p className="text-ink-subtle mt-4 text-xs">
          {authored > 0 && (
            <>
              Notes filed between {formatTime(visit.start)} and{' '}
              {formatTime(visit.end)}, give or take an hour
              {counts.record > 0 ? ', plus the times the visit record carries' : ''}
              . Nothing attaches a note to a visit in this app — these are
              records that fall in the window, which is why each row says who
              wrote it and where it came from.{' '}
            </>
          )}
          {authored === 0 && (
            <>
              Nobody wrote a note inside this visit&rsquo;s window. Every row
              here is generated from the visit record, not typed by a person.{' '}
            </>
          )}
          <Link
            to={`/care-recipients/${recipient.id}/notes`}
            className="text-brand-700 font-medium"
          >
            Every note on the care record
          </Link>
          .
        </p>
      )}
    </>
  )

  // The tab is the list on its own; the Overview wraps it in a panel with a
  // way through to the tab.
  if (filterable) return <div className="max-w-3xl">{all.length === 0 ? empty : body}</div>

  return (
    <Panel
      title="Filed in this window"
      badge={
        all.length > 0 ? (
          <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
            {authored} written · {counts.record} from the record
          </span>
        ) : undefined
      }
      action={{
        label: 'Open the Notes tab',
        to: `/scheduling/visits/${visit.id}/notes`,
      }}
    >
      {all.length === 0 ? empty : body}
    </Panel>
  )
}

function NotesTab({ context }: { context: VisitContext }) {
  return <VisitNotesPanel context={context} />
}

function FilterChip({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string
  count: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
        selected
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-line text-ink-muted hover:bg-sunken',
      )}
    >
      {label}
      {/* Full-strength white: at 14px the 80% tint fell under AA on
          brand-600, and it is the only part of the chip carrying a number. */}
      <span className={cn('tabular-nums', selected ? 'text-white' : 'text-ink-subtle')}>
        {count}
      </span>
    </button>
  )
}

function VisitNoteRow({ note, date }: { note: VisitNote; date: string }) {
  return (
    <li
      className={cn(
        'card p-4',
        // Shape, not colour alone: a flagged note keeps its left rule.
        note.flagged && 'border-l-4 border-l-red-500',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* No avatar on a generated entry — the source design gave the
              system check-in a photograph and a job title. */}
          {note.authored ? (
            <Avatar name={note.author} decorative className="size-9 shrink-0" />
          ) : (
            <span
              aria-hidden="true"
              className="border-line text-ink-subtle grid size-9 shrink-0 place-items-center rounded-full border"
            >
              <FileText className="size-4" strokeWidth={1.9} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-ink text-sm font-semibold break-words">
              {note.author}
              {!note.authored && (
                <span className="sr-only"> — generated, not written by a person</span>
              )}
            </p>
            <p className="text-ink-subtle text-xs break-words">{note.authorRole}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
              tonePill[visitNoteKindTones[note.kind]],
            )}
          >
            {visitNoteKindLabels[note.kind]}
          </span>
          <time
            dateTime={note.isInstant ? note.at : `${date}T${note.at}:00Z`}
            className="text-ink-subtle text-xs tabular-nums"
          >
            {formatTime(visitNoteTime(note))}
          </time>
        </div>
      </div>

      <p className="text-ink-muted mt-2.5 text-sm break-words">{note.body}</p>

      <div className="border-line text-ink-subtle mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2.5 text-xs">
        {note.categoryLabel && <span>{note.categoryLabel}</span>}
        {note.flagged && (
          <span className="inline-flex items-center gap-1 font-semibold text-red-700">
            <TriangleAlert className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
            {/* Same words as the care record's own card and the caregiver's
                Notes tab — one flag should not have three names. */}
            Flagged for review
          </span>
        )}
        {note.outside && <span>Filed outside the scheduled window</span>}
        {/* Where the row came from, in place of Acknowledge / Reply / Flag —
            none of which the app can store. */}
        <span className="ml-auto">{note.source}</span>
      </div>
    </li>
  )
}

function HistoryTab({ context }: { context: VisitContext }) {
  const others = historyFor(context.visit)

  if (others.length === 0)
    return (
      <p className="text-ink-subtle max-w-2xl text-sm" role="status">
        {context.recurrence
          ? `No other occurrence of this slot in the ${HISTORY_WEEKS} weeks before this visit.`
          : 'This visit does not recur, so it has no earlier occurrences.'}
      </p>
    )

  /*
   * The window is the four weeks before *this visit*, which for a visit in the
   * future contains dates that have not happened yet. Listing those beside
   * completed ones under one "History" heading made an upcoming visit read as
   * a finished one, so they are separated rather than clamped away — clamping
   * emptied the tab for any visit more than four weeks out.
   */
  const run = others.filter((v) => v.date < TODAY)
  const toCome = others.filter((v) => v.date >= TODAY)

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {run.length > 0 && (
        <OccurrenceList
          title="Already run"
          visits={run}
          note={`${run.length} occurrence${run.length === 1 ? '' : 's'} of this slot in the ${HISTORY_WEEKS} weeks before ${formatFullDay(context.visit.date)}.`}
        />
      )}
      {toCome.length > 0 && (
        <OccurrenceList
          title="Still to come"
          visits={toCome}
          note={`${toCome.length} occurrence${toCome.length === 1 ? '' : 's'} between today and this visit.`}
        />
      )}
    </div>
  )
}

function OccurrenceList({
  title,
  visits,
  note,
}: {
  title: string
  visits: BoardVisit[]
  note: string
}) {
  return (
    <Panel title={title} flush>
      <ul className="divide-line border-line divide-y border-t">
        {visits.map((other) => (
          <li key={other.id} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <Link
                to={`/scheduling/visits/${other.id}/overview`}
                className="text-ink hover:text-brand-700 min-w-0 text-sm font-semibold break-words"
              >
                {formatFullDay(other.date)}
              </Link>
              <RowStatus visit={other} />
            </div>
            <p className="text-ink-muted mt-1 text-sm break-words">
              {formatTime(other.start)} – {formatTime(other.end)} · {other.type} ·{' '}
              {other.durationHours}h
            </p>
          </li>
        ))}
      </ul>
      <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
        {note} Counted from the rota.
      </p>
    </Panel>
  )
}
