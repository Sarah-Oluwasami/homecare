import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Info, Plus } from 'lucide-react'
import {
  allTasks,
  formatDue,
  isDueToday,
  isOverdue,
  setTaskDone,
  allCategories,
  categoryLabel,
  priorityLabel,
  priorityOrder,
  useTasks,
} from '@/features/tasks/data'
import type { AgencyTask } from '@/features/tasks/data'
import { CreateTaskDialog } from '@/features/tasks/CreateTaskDialog'
import { Pagination } from '@/components/ui/Pagination'
import { Panel } from '@/components/ui/Panel'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { PriorityBadge } from '@/components/ui/StatusBadge'
import { TODAY } from '@/lib/today'
import { cn } from '@/lib/cn'

const tabs = [
  { slug: 'all', label: 'Everything open' },
  { slug: 'today', label: 'Due today' },
  { slug: 'overdue', label: 'Overdue' },
  { slug: 'done', label: 'Ticked off' },
] as const

type TabSlug = (typeof tabs)[number]['slug']

const PAGE_SIZE = 10

function matches(term: string, ...fields: (string | null | undefined)[]): boolean {
  return (
    term === '' ||
    fields.some((f) => f != null && f.toLowerCase().includes(term))
  )
}

/**
 * Tasks — everything the agency owes, worked out and written down together.
 *
 * The list is two things at once and says which is which on every row. Most of
 * it is derived: paperwork missing off a visit, a licence about to lapse, an
 * incident nobody has settled, a request nobody has answered. Those cannot be
 * ticked off here, because ticking one would not file the write-up — the row
 * goes when the record changes, and that is the only honest way for it to go.
 * The rest is typed by a coordinator and ticked off by one.
 *
 * What is deliberately not here: Export, templates, bulk assign and a
 * "mark all complete" that would tick a page of rows nobody looked at.
 */
export function TasksPage() {
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)

  // Written tasks are stored, so the list has to be told when one is added or
  // ticked; the worked-out half recomputes with it.
  const version = useTasks()
  const tasks = useMemo(() => {
    void version
    return allTasks()
  }, [version])

  const rawTab = params.get('tab') ?? 'all'
  const tab = (tabs.find((t) => t.slug === rawTab)?.slug ?? 'all') as TabSlug
  const search = params.get('q') ?? ''
  const term = search.trim().toLowerCase()

  const assigneeOptions = useMemo(() => {
    const names = new Set<string>()
    for (const t of tasks) if (t.assignee) names.add(t.assignee)
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [tasks])

  const categoryOptions = useMemo(() => {
    const present = new Set(tasks.map((t) => t.category))
    return allCategories()
      .filter((c) => present.has(c.id))
      .map((c) => ({ value: c.id, label: c.label }))
  }, [tasks])

  const priorityOptions = useMemo(() => {
    const present = new Set(tasks.map((t) => t.priority))
    return priorityOrder
      .filter((p) => present.has(p))
      .map((p) => ({ value: p as string, label: priorityLabel(p) }))
  }, [tasks])

  const rawAssignee = params.get('who') ?? 'all'
  const assignee = assigneeOptions.includes(rawAssignee) ? rawAssignee : 'all'
  const rawCategory = params.get('category') ?? 'all'
  const category = categoryOptions.some((o) => o.value === rawCategory)
    ? rawCategory
    : 'all'
  const rawPriority = params.get('priority') ?? 'all'
  const priority = priorityOptions.some((o) => o.value === rawPriority)
    ? rawPriority
    : 'all'
  const rawSource = params.get('source') ?? 'all'
  const source = ['worked-out', 'written'].includes(rawSource) ? rawSource : 'all'

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: key === 'q' })
  }

  const shown = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (tab === 'done'
            ? t.done
            : tab === 'today'
              ? isDueToday(t)
              : tab === 'overdue'
                ? isOverdue(t)
                : !t.done) &&
          (assignee === 'all' || t.assignee === assignee) &&
          (category === 'all' || t.category === category) &&
          (priority === 'all' || t.priority === priority) &&
          (source === 'all' || t.origin === source) &&
          matches(term, t.title, t.assignee, t.recipientName, t.source),
      ),
    [tasks, tab, assignee, category, priority, source, term],
  )

  const counts = {
    all: tasks.filter((t) => !t.done).length,
    today: tasks.filter((t) => isDueToday(t)).length,
    overdue: tasks.filter((t) => isOverdue(t)).length,
    done: tasks.filter((t) => t.done).length,
  }

  const open = tasks.filter((t) => !t.done)
  const tiles = [
    {
      id: 'open',
      label: 'Open',
      value: counts.all,
      hint: `${open.filter((t) => t.origin === 'worked-out').length} worked out, ${open.filter((t) => t.origin === 'written').length} written`,
    },
    {
      id: 'today',
      label: 'Due today',
      value: counts.today,
      hint: 'Dated today and not yet done',
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: counts.overdue,
      hint: 'Past their date',
      urgent: counts.overdue > 0,
    },
    {
      id: 'urgent',
      label: 'Critical or high',
      value: open.filter((t) => t.priority === 'critical' || t.priority === 'high')
        .length,
      hint: 'Of everything still open',
    },
  ]

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const requestedPage = Number(params.get('page'))
  const pageNumber =
    Number.isInteger(requestedPage) && requestedPage >= 1
      ? Math.min(requestedPage, pageCount)
      : 1
  const page = shown.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE)

  const filtered =
    assignee !== 'all' ||
    category !== 'all' ||
    priority !== 'all' ||
    source !== 'all' ||
    term !== ''

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-ink-muted mt-1 max-w-2xl text-sm">
            {/* No Export, no templates, no bulk assign: none of them exist, and
                a button that does nothing is worse than a shorter header. */}
            Everything outstanding across the agency. Most of it is worked out
            from the records — missing write-ups, lapsing credentials, open
            incidents, requests waiting on an answer — and clears itself when the
            record changes. The rest is written down here and ticked off by hand.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white"
        >
          <Plus className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          Create task
        </button>
      </header>

      {creating && <CreateTaskDialog onClose={() => setCreating(false)} />}

      <section aria-labelledby="task-totals">
        <h2 id="task-totals" className="sr-only">
          Totals
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
          {tiles.map((t) => (
            <article key={t.id} className="card p-4">
              <span className="text-ink-subtle block text-xs font-semibold tracking-wider uppercase">
                {t.label}
              </span>
              <span
                className={cn(
                  'mt-2 block text-2xl font-bold tracking-tight tabular-nums',
                  t.urgent ? 'text-red-700' : 'text-ink',
                )}
              >
                {t.value}
              </span>
              <span className="text-ink-subtle mt-1 block text-xs break-words">
                {t.hint}
              </span>
            </article>
          ))}
        </div>
      </section>

      <div
        role="group"
        aria-label="Choose a list"
        className="border-line no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
      >
        {tabs.map((t) => {
          const active = t.slug === tab
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => set('tab', t.slug)}
              aria-pressed={active}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors',
                active
                  ? 'border-brand-600 text-brand-700'
                  : 'text-ink-muted hover:text-ink border-transparent',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                  active ? 'bg-brand-50 text-brand-700' : 'bg-sunken text-ink-subtle',
                )}
              >
                {counts[t.slug]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter
            pill
            label="Assigned to"
            value={assignee}
            onChange={(v) => set('who', v)}
            options={[
              { value: 'all', label: 'Anyone' },
              ...assigneeOptions.map((n) => ({ value: n, label: n })),
            ]}
          />
          <SelectFilter
            pill
            label="Priority"
            value={priority}
            onChange={(v) => set('priority', v)}
            options={[{ value: 'all', label: 'All' }, ...priorityOptions]}
          />
          <SelectFilter
            pill
            label="Category"
            value={category}
            onChange={(v) => set('category', v)}
            options={[{ value: 'all', label: 'All' }, ...categoryOptions]}
          />
          {/* The filter the design has no equivalent of, and the one this list
              most needs: the two halves behave differently. */}
          <SelectFilter
            pill
            label="Source"
            value={source}
            onChange={(v) => set('source', v)}
            options={[
              { value: 'all', label: 'Both kinds' },
              { value: 'worked-out', label: 'Worked out' },
              { value: 'written', label: 'Written down' },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-0 flex-1 sm:max-w-xs">
            <span className="sr-only">Search tasks</span>
            <input
              type="search"
              value={search}
              onChange={(e) => set('q', e.target.value)}
              placeholder="Search tasks..."
              className="border-line bg-canvas focus:border-brand-500 focus:bg-surface h-10 w-full rounded-lg border px-3 text-sm"
            />
          </label>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(params)
                for (const key of ['who', 'priority', 'category', 'source', 'q', 'page'])
                  next.delete(key)
                setParams(next)
              }}
              className="text-brand-700 hover:text-brand-800 inline-flex min-h-11 items-center px-1 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
        <p className="text-ink-subtle text-xs">
          {shown.length} of {counts[tab]} shown.
        </p>
      </div>

      <Panel title={tabs.find((t) => t.slug === tab)!.label} flush>
        {shown.length === 0 ? (
          <p
            className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm"
            role="status"
          >
            Nothing here matches those filters.
          </p>
        ) : (
          <>
            <div
              tabIndex={0}
              role="region"
              aria-label="Tasks table"
              className="border-line hidden overflow-x-auto border-t xl:block"
            >
              <table className="w-full min-w-4xl text-left text-sm">
                <thead className="text-ink bg-sunken text-[13px]">
                  <tr className="border-line border-b">
                    {['Task', 'Assigned To', 'Client', 'Due', 'Priority', 'Source'].map(
                      (col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-4 py-3 font-semibold whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {page.map((task) => (
                    <tr
                      key={task.id}
                      className={cn(
                        'transition-colors',
                        isOverdue(task) ? 'bg-red-50/50' : 'hover:bg-canvas',
                        task.done && 'text-ink-muted',
                      )}
                    >
                      <th scope="row" className="max-w-md px-4 py-3.5 text-left">
                        <div className="flex items-start gap-2.5">
                          {/* A checkbox only where ticking it is true. A
                              worked-out row is settled by changing the record,
                              not by this list agreeing to stop mentioning it. */}
                          {task.origin === 'written' ? (
                            <input
                              type="checkbox"
                              checked={task.done}
                              onChange={(e) => setTaskDone(task.id, e.target.checked)}
                              aria-label={`Mark "${task.title}" ${task.done ? 'not done' : 'done'}`}
                              className="accent-brand-600 mt-0.5 size-4 shrink-0"
                            />
                          ) : (
                            <span className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          )}
                          <span className="min-w-0">
                            <Link
                              to={`/tasks/${task.id}`}
                              className={cn(
                                'font-medium break-words',
                                task.done
                                  ? 'text-ink-muted line-through'
                                  : 'text-ink hover:text-brand-700',
                              )}
                            >
                              {task.title}
                            </Link>
                            <span className="text-ink-subtle block text-xs break-words">
                              {categoryLabel(task.category)}
                              {task.source && ` · ${task.source}`}
                            </span>
                          </span>
                        </div>
                      </th>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {task.assignee ?? (
                          <span className="font-medium text-red-700">Nobody</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {task.recipientId ? (
                          <Link
                            to={`/care-recipients/${task.recipientId}`}
                            className="text-ink hover:text-brand-700"
                          >
                            {task.recipientName}
                          </Link>
                        ) : (
                          <span className="text-ink-subtle">
                            {task.recipientName ?? '—'}
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3.5 whitespace-nowrap',
                          isOverdue(task)
                            ? 'font-semibold text-red-700'
                            : 'text-ink-muted',
                        )}
                      >
                        {formatDue(task.due)}
                      </td>
                      <td className="px-4 py-3.5">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="px-4 py-3.5">
                        <SourceChip task={task} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="border-line divide-line divide-y border-t xl:hidden">
              {page.map((task) => (
                <li key={task.id} className="p-4">
                  <div className="flex items-start gap-2.5">
                    {task.origin === 'written' && (
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={(e) => setTaskDone(task.id, e.target.checked)}
                        aria-label={`Mark "${task.title}" ${task.done ? 'not done' : 'done'}`}
                        className="accent-brand-600 mt-1 size-4 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <Link
                          to={`/tasks/${task.id}`}
                          className={cn(
                            'min-w-0 text-sm font-semibold break-words',
                            task.done
                              ? 'text-ink-muted line-through'
                              : 'text-ink hover:text-brand-700',
                          )}
                        >
                          {task.title}
                        </Link>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <p className="text-ink-muted mt-1 text-xs break-words">
                        {categoryLabel(task.category)}
                        {task.source && ` · ${task.source}`}
                      </p>
                      <p className="text-ink-subtle mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span>{task.assignee ?? 'Nobody'}</span>
                        {task.recipientName && <span>· {task.recipientName}</span>}
                        <span
                          className={cn(
                            isOverdue(task) && 'font-semibold text-red-700',
                          )}
                        >
                          · {formatDue(task.due)}
                        </span>
                        <SourceChip task={task} />
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
              A worked-out row has no tick box because ticking it would not file
              the write-up or renew the licence. Open the record, deal with it,
              and the row goes on its own.
            </p>
          </>
        )}
        {pageCount > 1 && (
          <div className="border-line border-t p-4">
            <Pagination
              page={pageNumber}
              pageCount={pageCount}
              onPageChange={(p) => set('page', String(p))}
              summary={`Showing ${(pageNumber - 1) * PAGE_SIZE + 1}–${Math.min(pageNumber * PAGE_SIZE, shown.length)} of ${shown.length} tasks`}
            />
          </div>
        )}
      </Panel>

      <p className="text-ink-subtle flex gap-2 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          Counted as at {TODAY}. Written tasks are held for this session only —
          there is no server behind them — while the worked-out rows are
          recomputed every time this screen opens, so they can never disagree
          with the records they came from.
        </span>
      </p>
    </div>
  )
}

function SourceChip({ task }: { task: AgencyTask }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        task.origin === 'worked-out'
          ? 'bg-brand-50 text-brand-700'
          : 'bg-sunken text-ink-muted',
      )}
    >
      {task.origin === 'worked-out' ? 'Worked out' : `By ${task.createdBy}`}
    </span>
  )
}
