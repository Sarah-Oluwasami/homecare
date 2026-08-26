import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, Plus, RotateCcw } from 'lucide-react'
import {
  addCategory,
  allCategories,
  allPriorities,
  defaultPriority,
  isDefault,
  removeCategory,
  resetTaskSettings,
  setDefaultPriority,
  setPriorityLabel,
  toneChoices,
  updateCategory,
  useTaskSettings,
} from '@/features/tasks/settings'
import type { CategorySetting } from '@/features/tasks/settings'
import { allTasks, assignableNames, useTasks } from '@/features/tasks/data'
import { allTemplates, useTemplates } from '@/features/tasks/templates'
import { Panel } from '@/components/ui/Panel'
import type { Tone } from '@/types'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

/**
 * Task settings.
 *
 * Everything on this page changes something the moment you change it — there is
 * no Save, because there is nothing to send anywhere and a button that only
 * closed a dialog would be theatre. Reset puts the shipped defaults back, and
 * only offers itself once something has actually moved.
 *
 * Two of the design's six sections are here, and the other four are named at
 * the bottom rather than mocked up as dead switches. Notifications, reminders,
 * SLAs and escalation all describe things happening while nobody is looking at
 * the screen, and nothing in this app does that.
 */
export function TaskSettingsPage() {
  useTaskSettings()
  useTasks()
  useTemplates()

  const [adding, setAdding] = useState(false)
  const tasks = allTasks()
  const templates = allTemplates()

  const countFor = (id: string) => ({
    tasks: tasks.filter((t) => t.category === id).length,
    templates: templates.filter((t) => t.category === id).length,
  })

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
            Settings
          </li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">
            Task settings
          </h1>
          <p className="text-ink-muted mt-1 max-w-2xl text-sm">
            The words the task screens are built out of. Changes take effect as
            you make them — the create form, the filters and every chip that
            names a category read these, so there is nothing to save.
          </p>
        </div>
        {!isDefault() && (
          <button
            type="button"
            onClick={resetTaskSettings}
            className="border-line text-ink hover:bg-sunken inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
          >
            <RotateCcw
              className="size-4 shrink-0"
              strokeWidth={1.9}
              aria-hidden="true"
            />
            Reset to defaults
          </button>
        )}
      </header>

      <Panel title="Categories" flush>
        <div
          tabIndex={0}
          role="region"
          aria-label="Task categories table"
          className="border-line overflow-x-auto border-t"
        >
          <table className="w-full min-w-3xl text-left text-sm">
            <thead className="text-ink bg-sunken text-[13px]">
              <tr className="border-line border-b">
                {['Category', 'Colour', 'In use', 'Falls to', 'Offered', ''].map(
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
              {allCategories().map((category) => (
                <Row
                  key={category.id}
                  category={category}
                  counts={countFor(category.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-line border-t p-4">
          {adding ? (
            <NewCategory onDone={() => setAdding(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
            >
              <Plus className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              Add a category
            </button>
          )}
        </div>

        <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
          {/* The constraint worth stating on screen rather than only in the
              code: four categories are where the worked-out rows land. */}
          Visit paperwork, compliance, incident follow-up and new client are
          where the app files the rows it works out for itself. They can be
          renamed and recoloured, but not removed or hidden — switching one off
          would not stop those rows being produced, only leave them nowhere to
          sit. &ldquo;In use&rdquo; counts what actually carries each one, so a
          category with nothing behind it can be deleted safely.
        </p>
      </Panel>

      <Panel title="Priority" flush>
        <ul className="border-line divide-line divide-y border-t">
          {allPriorities().map((priority) => (
            <li
              key={priority.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <label className="flex min-w-0 flex-1 items-center gap-3">
                <span className="text-ink-subtle w-16 shrink-0 text-xs tracking-wider uppercase">
                  {priority.id}
                </span>
                <input
                  type="text"
                  value={priority.label}
                  onChange={(e) => setPriorityLabel(priority.id, e.target.value)}
                  aria-label={`Label for ${priority.id} priority`}
                  className="border-line focus:border-brand-500 h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm sm:max-w-xs"
                />
              </label>
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="default-priority"
                  checked={defaultPriority() === priority.id}
                  onChange={() => setDefaultPriority(priority.id)}
                  className="accent-brand-600 size-4"
                />
                <span className="text-ink-muted">Default for a new task</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
          {/* Two things from the design deliberately missing from this table. */}
          The order is fixed and the colours are not editable: critical through
          low is what every screen in this app sorts and ranks by, and red for
          critical is a meaning, not a preference. No response times or
          escalation rules either — nothing here watches a clock while the tab is
          closed, so a two-hour SLA would be a number that never came due.
        </p>
      </Panel>

      <Panel title="Not on this screen">
        <p className="text-ink-muted text-sm">
          Four of the design&rsquo;s sections describe things happening while
          nobody is looking at the screen. This app has no server, no scheduler
          and no way to send anything, so each of them would be a switch with
          nothing behind it:
        </p>
        <ul className="text-ink-muted mt-3 space-y-2 text-sm">
          <Missing name="Notifications">
            push, email and SMS on assignment, due and overdue. There is no
            outbound channel of any kind — the same reason escalating an alert
            shows you a phone number instead of sending a message.
          </Missing>
          <Missing name="Reminders and digests">
            a daily summary at 8am, a weekly report on Monday. Nothing runs
            unattended, so neither would ever arrive.
          </Missing>
          <Missing name="Response times and escalation">
            an SLA per priority, escalating to a manager when it passes. Nothing
            records when a task was picked up, so there would be nothing to
            measure against.
          </Missing>
          <Missing name="Status configuration">
            custom statuses and a workflow between them. A written task is done
            or it is not, and a worked-out row has no status of its own — it goes
            when the record behind it changes.
          </Missing>
        </ul>
      </Panel>

      <p className="text-ink-subtle flex gap-2 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          Held for this session only. A reload puts the shipped categories and
          priority labels back, exactly as Reset does.
        </span>
      </p>
    </div>
  )
}

function Missing({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-2">
      <span aria-hidden="true" className="text-ink-subtle">
        —
      </span>
      <span className="min-w-0">
        <span className="text-ink font-medium">{name}</span>: {children}
      </span>
    </li>
  )
}

function Row({
  category,
  counts,
}: {
  category: CategorySetting
  counts: { tasks: number; templates: number }
}) {
  const used = counts.tasks + counts.templates

  return (
    <tr className="hover:bg-canvas transition-colors">
      <th scope="row" className="px-4 py-3 text-left">
        <input
          type="text"
          value={category.label}
          onChange={(e) =>
            updateCategory(category.id, { ...category, label: e.target.value })
          }
          aria-label={`Name for the ${category.label} category`}
          className="border-line focus:border-brand-500 text-ink h-10 w-full max-w-52 rounded-lg border px-3 text-sm font-medium"
        />
        {category.derived && (
          <span className="text-ink-subtle mt-1 block text-xs">
            The app files rows here
          </span>
        )}
      </th>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {toneChoices.map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => updateCategory(category.id, { ...category, tone })}
              aria-label={`${tone} for ${category.label}`}
              aria-pressed={category.tone === tone}
              className={cn(
                'size-6 rounded-full border-2 transition-colors',
                tonePill[tone],
                category.tone === tone ? 'border-ink' : 'border-transparent',
              )}
            />
          ))}
        </div>
      </td>
      <td className="text-ink-muted px-4 py-3 text-xs whitespace-nowrap">
        {/* Counted, not stored. The design has a per-category task count with
            nothing under it; this one moves when a task does. */}
        {counts.tasks} task{counts.tasks === 1 ? '' : 's'}
        <span className="block">
          {counts.templates} template{counts.templates === 1 ? '' : 's'}
        </span>
      </td>
      <td className="px-4 py-3">
        <select
          value={category.defaultAssignee ?? ''}
          onChange={(e) =>
            updateCategory(category.id, {
              ...category,
              defaultAssignee: e.target.value === '' ? null : e.target.value,
            })
          }
          aria-label={`Default assignee for ${category.label}`}
          className="border-line focus:border-brand-500 text-ink h-10 w-full max-w-48 rounded-lg border px-2 text-sm"
        >
          <option value="">Nobody in particular</option>
          {assignableNames().map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={category.offered}
            disabled={category.derived}
            onChange={(e) =>
              updateCategory(category.id, { ...category, offered: e.target.checked })
            }
            className="accent-brand-600 size-4 disabled:opacity-50"
          />
          <span className="text-ink-muted text-xs">In the create form</span>
        </label>
      </td>
      <td className="px-4 py-3 text-right">
        {/* Delete only where nothing carries it — a category with tasks behind
            it would leave them labelled with an id nobody recognises. */}
        {!category.derived && used === 0 ? (
          <button
            type="button"
            onClick={() => removeCategory(category.id)}
            className="text-sm font-medium text-red-700 hover:text-red-800"
          >
            Delete
          </button>
        ) : (
          <span className="text-ink-subtle text-xs whitespace-nowrap">
            {category.derived ? 'Built in' : `${used} in use`}
          </span>
        )}
      </td>
    </tr>
  )
}

function NewCategory({ onDone }: { onDone: () => void }) {
  const [label, setLabel] = useState('')
  const [tone, setTone] = useState<Tone>('blue')

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-sm sm:max-w-xs">
        <span className="text-ink font-medium">New category</span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Equipment"
          className="border-line focus:border-brand-500 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"
        />
      </label>
      <div className="flex flex-wrap items-center gap-1.5 pb-1.5">
        {toneChoices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => setTone(choice)}
            aria-label={choice}
            aria-pressed={tone === choice}
            className={cn(
              'size-6 rounded-full border-2 transition-colors',
              tonePill[choice],
              tone === choice ? 'border-ink' : 'border-transparent',
            )}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 pb-0.5">
        <button
          type="button"
          onClick={onDone}
          className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={label.trim() === ''}
          onClick={() => {
            addCategory({
              label: label.trim(),
              tone,
              defaultAssignee: null,
              offered: true,
            })
            onDone()
          }}
          className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}
