import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, Clock, Info, ListChecks, Plus, User } from 'lucide-react'
import {
  allTemplates,
  deleteTemplate,
  duplicateTemplate,
  setTemplateActive,
  useTemplates,
} from '@/features/tasks/templates'
import type { TaskTemplate } from '@/features/tasks/templates'
import {
  allCategories,
  categoryLabel,
  categoryTone,
  tasksFromTemplate,
  useTasks,
} from '@/features/tasks/data'
import { TemplateDialog } from '@/features/tasks/TemplateDialog'
import { UseTemplateDialog } from '@/features/tasks/UseTemplateDialog'
import { Panel } from '@/components/ui/Panel'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

/**
 * Task templates — reusable checklists, raised by hand.
 *
 * The design's cards report a schedule and a monthly yield: "Daily, 7:00–8:00
 * AM", "280/month", "94% completion". None of those can be true here. Nothing
 * in this app runs while nobody is looking at it, so a template cannot generate
 * anything overnight, and there is no completion history to average — the tasks
 * this session raised are the only ones that exist.
 *
 * So the card reports what is real: how many steps are on the list, the
 * estimate whoever wrote it gave, when it is *usually* done as plain guidance,
 * and how many tasks have actually been raised from it — with links to them.
 * The button that would have been a schedule is the one that matters: use it.
 */
export function TaskTemplatesPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  useTemplates()
  // Usage counts come off the task store, so a task raised here has to move the
  // card behind it.
  useTasks()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<TaskTemplate | null>(null)
  const [using, setUsing] = useState<TaskTemplate | null>(null)

  const templates = allTemplates()

  const search = params.get('q') ?? ''
  const term = search.trim().toLowerCase()

  const categoryOptions = useMemo(() => {
    const present = new Set(templates.map((t) => t.category))
    return allCategories()
      .filter((c) => present.has(c.id))
      .map((c) => ({ value: c.id, label: c.label }))
  }, [templates])

  const rawCategory = params.get('category') ?? 'all'
  const category = categoryOptions.some((o) => o.value === rawCategory)
    ? rawCategory
    : 'all'
  const rawStatus = params.get('status') ?? 'active'
  const status = ['active', 'retired', 'all'].includes(rawStatus)
    ? rawStatus
    : 'active'

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '' || (key === 'status' ? value === 'active' : value === 'all'))
      next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: key === 'q' })
  }

  const shown = templates.filter(
    (t) =>
      (status === 'all' || (status === 'active' ? t.active : !t.active)) &&
      (category === 'all' || t.category === category) &&
      (term === '' ||
        t.name.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.items.some((item) => item.toLowerCase().includes(term))),
  )

  const active = templates.filter((t) => t.active)
  const raised = templates.reduce(
    (total, t) => total + tasksFromTemplate(t.id).length,
    0,
  )

  const tiles = [
    {
      id: 'active',
      label: 'In use',
      value: active.length,
      hint: `${templates.length - active.length} retired`,
    },
    {
      id: 'steps',
      label: 'Steps across them',
      value: active.reduce((total, t) => total + t.items.length, 0),
      hint: 'Counted off the lists themselves',
    },
    {
      id: 'raised',
      label: 'Raised this session',
      value: raised,
      // Said rather than dressed up: the number is small because nothing
      // generates tasks on a clock, and a card claiming otherwise would be the
      // most misleading thing on the screen.
      hint: 'Tasks somebody made from a template',
    },
  ]

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
          <li className="text-brand-700 font-medium" aria-current="page">
            Templates
          </li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">
            Task templates
          </h1>
          <p className="text-ink-muted mt-1 max-w-2xl text-sm">
            {/* No Import: there is nowhere to import from and no file store to
                read. */}
            Checklists worth writing down once. Applying one raises an ordinary
            task with its steps already on it — none of them fire on their own,
            because nothing in this app runs while nobody is looking at it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white"
        >
          <Plus className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          Create template
        </button>
      </header>

      {creating && <TemplateDialog onClose={() => setCreating(false)} />}
      {editing && (
        <TemplateDialog template={editing} onClose={() => setEditing(null)} />
      )}
      {using && (
        <UseTemplateDialog
          template={using}
          onClose={() => setUsing(null)}
          onApplied={(taskId) => navigate(`/tasks/${taskId}`)}
        />
      )}

      <section aria-labelledby="template-totals">
        <h2 id="template-totals" className="sr-only">
          Totals
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          {tiles.map((t) => (
            <article key={t.id} className="card p-4">
              <span className="text-ink-subtle block text-xs font-semibold tracking-wider uppercase">
                {t.label}
              </span>
              <span className="text-ink mt-2 block text-2xl font-bold tracking-tight tabular-nums">
                {t.value}
              </span>
              <span className="text-ink-subtle mt-1 block text-xs break-words">
                {t.hint}
              </span>
            </article>
          ))}
        </div>
      </section>

      <div className="card flex flex-wrap items-center gap-2 p-4">
        <label className="min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Search templates</span>
          <input
            type="search"
            value={search}
            onChange={(e) => set('q', e.target.value)}
            placeholder="Search templates..."
            className="border-line bg-canvas focus:border-brand-500 focus:bg-surface h-10 w-full rounded-lg border px-3 text-sm"
          />
        </label>
        <SelectFilter
          chip
          label="Category"
          value={category}
          onChange={(v) => set('category', v)}
          options={[{ value: 'all', label: 'All' }, ...categoryOptions]}
        />
        <SelectFilter
          chip
          label="Status"
          value={status}
          onChange={(v) => set('status', v)}
          options={[
            { value: 'active', label: 'In use' },
            { value: 'retired', label: 'Retired' },
            { value: 'all', label: 'Both' },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <Panel title="Templates">
          <p className="text-ink-subtle text-sm" role="status">
            No template matches that.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {shown.map((template) => (
            <Card
              key={template.id}
              template={template}
              onUse={() => setUsing(template)}
              onEdit={() => setEditing(template)}
              onDuplicate={() => {
                const id = duplicateTemplate(template.id)
                const copy = id ? allTemplates().find((t) => t.id === id) : undefined
                if (copy) setEditing(copy)
              }}
            />
          ))}
        </div>
      )}

      <p className="text-ink-subtle flex gap-2 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          Templates and the tasks raised from them are held for this session
          only. Retiring one keeps it and its history; deleting it is only
          offered where nothing has been raised from it.
        </span>
      </p>
    </div>
  )
}

function Card({
  template,
  onUse,
  onEdit,
  onDuplicate,
}: {
  template: TaskTemplate
  onUse: () => void
  onEdit: () => void
  onDuplicate: () => void
}) {
  const raised = tasksFromTemplate(template.id)
  const latest = raised[0]

  return (
    <article className={cn('card flex flex-col p-4', !template.active && 'opacity-70')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-ink min-w-0 text-base font-semibold break-words">
          {template.name}
        </h3>
        <span className="flex shrink-0 items-center gap-1.5">
          {!template.active && (
            <span className="bg-sunken text-ink-muted rounded-full px-2.5 py-0.5 text-xs font-semibold">
              Retired
            </span>
          )}
          {/* Coloured from the category settings, so recolouring a category on
              the settings screen moves every chip that names it. */}
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
              tonePill[categoryTone(template.category)],
            )}
          >
            {categoryLabel(template.category)}
          </span>
        </span>
      </div>

      <p className="text-ink-muted mt-1.5 text-sm break-words">
        {template.description}
      </p>

      {/* Three lines, in the order somebody reads them: how big it is, when it
          is normally done, who it normally falls to. */}
      <dl className="border-line text-ink-muted mt-3 space-y-1.5 border-t pt-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex items-center gap-2">
            <ListChecks
              className="size-4 shrink-0"
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <dt className="sr-only">Steps</dt>
            {/* Counted off the list. The design states a number beside a
                checklist it cannot see. */}
            <dd>
              <span className="text-ink font-medium">{template.items.length}</span>{' '}
              step{template.items.length === 1 ? '' : 's'}
            </dd>
          </span>
          <span aria-hidden="true" className="text-line hidden sm:inline">
            |
          </span>
          <span className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
            <dt className="sr-only">Estimate</dt>
            <dd>
              Est. time:{' '}
              <span className="text-ink font-medium">
                {template.estimateMinutes} min
              </span>
            </dd>
          </span>
        </div>

        <div className="flex items-start gap-2">
          <CalendarClock
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.9}
            aria-hidden="true"
          />
          <dt className="sr-only">Usually done</dt>
          {/* Where the design has a schedule. It is a sentence for a person, and
              the line says so rather than letting it read as something that
              fires. */}
          <dd className="min-w-0 break-words">
            Usually: <span className="text-ink font-medium">{template.cadence}</span>
            <span className="text-ink-subtle block text-xs">
              A note, not a schedule — nothing raises it on its own.
            </span>
          </dd>
        </div>

        <div className="flex items-start gap-2">
          <User className="mt-0.5 size-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
          <dt className="sr-only">Usually falls to</dt>
          <dd className="min-w-0 break-words">
            Falls to:{' '}
            <span className="text-ink font-medium">
              {template.suggestedAssignee ?? 'Whoever is on the visit'}
            </span>
          </dd>
        </div>
      </dl>

      {/* The design's two statistics, in the same place, saying what this app
          can actually count: how many tasks somebody raised from it, and the
          last one they raised. Not a monthly yield and not a completion rate —
          nothing generates tasks on a clock here, and there is no completion
          history to average. */}
      <dl className="border-line mt-3 flex flex-wrap items-start justify-between gap-4 border-t pt-3">
        <div className="min-w-0">
          <dt className="text-ink-subtle text-[0.65rem] font-semibold tracking-wider uppercase">
            Tasks raised
          </dt>
          <dd className="text-ink mt-0.5 text-sm font-semibold">
            {raised.length === 0 ? (
              <span className="text-ink-subtle font-normal">None yet</span>
            ) : (
              <>
                {raised.length} this session
                <span className="text-ink-subtle block text-xs font-normal">
                  {raised.filter((t) => !t.done).length} still open
                </span>
              </>
            )}
          </dd>
        </div>
        <div className="min-w-0 text-right">
          <dt className="text-ink-subtle text-[0.65rem] font-semibold tracking-wider uppercase">
            Last raised
          </dt>
          <dd className="text-ink mt-0.5 text-sm font-semibold break-words">
            {latest ? (
              <Link
                to={`/tasks/${latest.id}`}
                className="text-brand-700 hover:text-brand-800"
              >
                {latest.assignee ?? 'Nobody'}
                <span className="text-ink-subtle block text-xs font-normal">
                  {latest.recipientName ?? 'No client'}
                </span>
              </Link>
            ) : (
              <span className="text-ink-subtle font-normal">&mdash;</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="border-line mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
        <button
          type="button"
          onClick={onUse}
          disabled={!template.active}
          className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use this
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="text-brand-700 hover:text-brand-800 inline-flex min-h-11 items-center text-sm font-medium"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="text-ink hover:text-ink-muted inline-flex min-h-11 items-center text-sm font-medium"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => setTemplateActive(template.id, !template.active)}
          className="text-ink-muted hover:text-ink inline-flex min-h-11 items-center text-sm font-medium"
        >
          {template.active ? 'Retire' : 'Put back in use'}
        </button>
        {/* Only where nothing points at it: a task raised from a template names
            it, and deleting the template would leave that task pointing at
            nothing. */}
        {raised.length === 0 && (
          <button
            type="button"
            onClick={() => deleteTemplate(template.id)}
            className="ml-auto inline-flex min-h-11 items-center text-sm font-medium text-red-700 hover:text-red-800"
          >
            Delete
          </button>
        )}
      </div>
    </article>
  )
}
