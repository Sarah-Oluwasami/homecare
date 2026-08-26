import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Info, Plus, Trash2, X } from 'lucide-react'
import {
  addChecklistItem,
  addComment,
  deleteTask,
  formatDue,
  isOverdue,
  relatedTasks,
  removeChecklistItem,
  setChecklistItem,
  setTaskDone,
  taskById,
  categoryLabel,
  useTasks,
} from '@/features/tasks/data'
import { EditTaskDialog } from '@/features/tasks/CreateTaskDialog'
import { Panel } from '@/components/ui/Panel'
import { PriorityBadge } from '@/components/ui/StatusBadge'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { cn } from '@/lib/cn'

/**
 * One task.
 *
 * Two quite different pages behind one route, because there are two quite
 * different kinds of task and pretending otherwise is what would make this
 * screen lie.
 *
 * A **written** task is owned here: it has a description, a checklist, comments
 * and a history, and every one of those is a thing a person did that this app
 * witnessed. It can be edited, ticked off and deleted, because it exists
 * nowhere else.
 *
 * A **worked-out** task owns none of that. It is a sentence about a record kept
 * somewhere else, so the page says which record, why the row exists and what
 * would make it go — and sends you to the place where the work is actually
 * done. No checklist, no comments, no Mark complete: this screen has nothing to
 * mark.
 */
export function TaskDetailsPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const version = useTasks()
  void version

  const task = taskById(taskId)
  const [editing, setEditing] = useState(false)
  const [comment, setComment] = useState('')
  const [item, setItem] = useState('')

  if (!task) return <NotFoundPage />

  const written = task.origin === 'written'
  const checklist = task.checklist ?? []
  const ticked = checklist.filter((c) => c.done).length
  const percent = checklist.length === 0 ? 0 : Math.round((ticked / checklist.length) * 100)
  const related = relatedTasks(task)

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <ol className="text-ink-subtle flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link to="/tasks" className="hover:text-ink">
              Tasks
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-brand-700 min-w-0 font-medium" aria-current="page">
            {task.title}
          </li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight break-words">
            {task.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <PriorityBadge priority={task.priority} />
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                task.done
                  ? 'bg-emerald-50 text-emerald-700'
                  : isOverdue(task)
                    ? 'bg-red-50 text-red-700'
                    : 'bg-sunken text-ink-muted',
              )}
            >
              {task.done ? 'Done' : isOverdue(task) ? 'Overdue' : 'Open'}
            </span>
            <span className="text-ink-subtle">
              Due {formatDue(task.due).toLowerCase()}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {written ? (
            <>
              <button
                type="button"
                onClick={() => setTaskDone(task.id, !task.done)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold',
                  task.done
                    ? 'border-line text-ink hover:bg-sunken border'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700',
                )}
              >
                {!task.done && (
                  <Check className="size-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                )}
                {task.done ? 'Reopen' : 'Mark complete'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTask(task.id)
                  navigate('/tasks')
                }}
                className="border-line inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 className="size-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
                Delete
              </button>
            </>
          ) : (
            // The only button that makes sense on a worked-out task: the work
            // is done in the record, not here.
            <Link
              to={task.to}
              className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white"
            >
              Open the record
            </Link>
          )}
        </div>
      </header>

      {editing && <EditTaskDialog task={task} onClose={() => setEditing(false)} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {written ? (
            <>
              <Panel title="What needs doing">
                {task.description ? (
                  <p className="text-ink-muted text-sm break-words">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-ink-subtle text-sm">
                    No description. Edit the task to add one.
                  </p>
                )}

                <div className="border-line mt-4 border-t pt-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-ink text-sm font-semibold">Checklist</h3>
                    {/* Counted off the list, never stated: a progress bar and a
                        checklist that disagree is the oldest bug in this app's
                        source design. */}
                    <span className="text-ink-subtle text-xs tabular-nums">
                      {checklist.length === 0
                        ? 'Nothing on it yet'
                        : `${ticked} of ${checklist.length} done (${percent}%)`}
                    </span>
                  </div>

                  {checklist.length > 0 && (
                    <div
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Checklist progress"
                      className="bg-sunken mt-2 h-1.5 overflow-hidden rounded-full"
                    >
                      <div
                        className="bg-brand-600 h-full rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}

                  <ul className="mt-3 space-y-1.5">
                    {checklist.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={entry.done}
                          onChange={(e) =>
                            setChecklistItem(task.id, entry.id, e.target.checked)
                          }
                          className="accent-brand-600 mt-0.5 size-4 shrink-0"
                          aria-label={entry.label}
                        />
                        <span
                          className={cn(
                            'min-w-0 flex-1 text-sm break-words',
                            entry.done ? 'text-ink-subtle line-through' : 'text-ink',
                          )}
                        >
                          {entry.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(task.id, entry.id)}
                          className="text-ink-subtle hover:text-ink shrink-0"
                        >
                          <X className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
                          <span className="sr-only">Remove “{entry.label}”</span>
                        </button>
                      </li>
                    ))}
                  </ul>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      addChecklistItem(task.id, item)
                      setItem('')
                    }}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => setItem(e.target.value)}
                      placeholder="Add a step"
                      aria-label="Add a checklist step"
                      className="border-line focus:border-brand-500 h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={item.trim() === ''}
                      className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
                      Add
                    </button>
                  </form>
                </div>
              </Panel>

              <Panel title="Notes">
                <ul className="divide-line divide-y">
                  {(task.comments ?? []).length === 0 && (
                    <li className="text-ink-subtle py-2 text-sm">
                      Nothing written on this one yet.
                    </li>
                  )}
                  {(task.comments ?? []).map((entry) => (
                    <li key={entry.id} className="py-3 first:pt-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-ink text-sm font-semibold">
                          {entry.author}
                        </p>
                        <time
                          dateTime={entry.at}
                          className="text-ink-subtle text-xs tabular-nums"
                        >
                          {stamp(entry.at)}
                        </time>
                      </div>
                      <p className="text-ink-muted mt-1 text-sm break-words">
                        {entry.body}
                      </p>
                    </li>
                  ))}
                </ul>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    addComment(task.id, comment)
                    setComment('')
                  }}
                  className="border-line mt-3 flex flex-wrap gap-2 border-t pt-3"
                >
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a note"
                    aria-label="Add a note"
                    className="border-line focus:border-brand-500 h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={comment.trim() === ''}
                    className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Post
                  </button>
                </form>
              </Panel>
            </>
          ) : (
            <Panel title="Why this is on the list">
              <p className="text-ink text-sm break-words">{task.source}</p>
              <p className="text-ink-muted mt-3 text-sm">
                Nothing created this row and nothing here can tick it off. It is
                worked out from the record every time the list is drawn, and it
                goes on its own the moment that record changes — when the
                write-up is filed, the credential renewed, the incident settled
                or the request answered.
              </p>
              <Link
                to={task.to}
                className="text-brand-700 hover:text-brand-800 mt-3 inline-flex min-h-11 items-center text-sm font-semibold"
              >
                Open the record and deal with it
              </Link>
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel title="Details">
            <dl className="divide-line divide-y text-sm">
              <Row label="Category" value={categoryLabel(task.category)} />
              <Row label="Assigned to" value={task.assignee ?? 'Nobody'} />
              <Row
                label="Client"
                value={
                  task.recipientId ? (
                    <Link
                      to={`/care-recipients/${task.recipientId}`}
                      className="text-brand-700 hover:text-brand-800"
                    >
                      {task.recipientName}
                    </Link>
                  ) : (
                    (task.recipientName ?? 'Not about one client')
                  )
                }
              />
              <Row
                label="Due"
                value={
                  <span className={cn(isOverdue(task) && 'font-semibold text-red-700')}>
                    {task.due ? `${formatDue(task.due)} · ${task.due}` : 'No date'}
                  </span>
                }
              />
              <Row
                label="Source"
                value={written ? `Written by ${task.createdBy}` : 'Worked out'}
              />
              {task.estimateMinutes != null && (
                <Row label="Estimate" value={`${task.estimateMinutes} minutes`} />
              )}
            </dl>
            {/* The design also lists a recurrence. Nothing in this app schedules
                anything, so a task marked "Daily (weekdays)" would never appear
                again and the field would be a promise the app cannot keep. */}
            <p className="text-ink-subtle mt-3 text-xs">
              No recurrence: nothing here schedules a task to come back, so the
              field would be a promise with nothing behind it.
            </p>
          </Panel>

          {written && (
            <Panel title="History">
              <ol className="space-y-3">
                {[...(task.activity ?? [])].reverse().map((event) => (
                  <li key={event.id} className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="bg-brand-500 mt-1.5 size-1.5 shrink-0 rounded-full"
                    />
                    <span className="min-w-0">
                      <span className="text-ink block text-sm break-words">
                        {event.text}
                      </span>
                      <time
                        dateTime={event.at}
                        className="text-ink-subtle block text-xs tabular-nums"
                      >
                        {stamp(event.at)} · {event.by}
                      </time>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          <Panel title="Also open">
            {related.length === 0 ? (
              <p className="text-ink-subtle text-sm">
                Nothing else open for this client or this person.
              </p>
            ) : (
              <ul className="divide-line divide-y">
                {related.map((other) => (
                  <li key={other.id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link
                      to={other.origin === 'written' ? `/tasks/${other.id}` : other.to}
                      className="text-ink hover:text-brand-700 text-sm font-medium break-words"
                    >
                      {other.title}
                    </Link>
                    <span className="text-ink-subtle mt-0.5 block text-xs">
                      {other.assignee ?? 'Nobody'} · due{' '}
                      {formatDue(other.due).toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <p className="text-ink-subtle flex gap-2 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          {written
            ? 'Everything on this page is held for the session only — there is no server behind it, so a reload clears this task and leaves the worked-out ones.'
            : 'This page holds nothing of its own. Every line on it is read off the record it names, at the moment you open it.'}
        </span>
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
      <dt className="text-ink-muted min-w-0">{label}</dt>
      <dd className="text-ink min-w-0 text-right font-medium break-words">{value}</dd>
    </div>
  )
}

const stampFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

function stamp(iso: string): string {
  return stampFormat.format(new Date(iso))
}
