import { useId, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import {
  assignableNames,
  priorityLabel,
  priorityOrder,
  offeredCategories,
} from './data'
import type { TaskCategory, TaskPriority } from './data'
import { createTemplate, updateTemplate } from './templates'
import type { TaskTemplate } from './templates'

/**
 * Writing or changing a template.
 *
 * The fields are the ones a checklist actually needs: a name, what it is for,
 * the steps, and the defaults worth not retyping. There is no schedule field —
 * see the note at the top of `templates.ts` — only a line saying when it is
 * usually done, which is guidance for a person and read by nothing.
 */
export function TemplateDialog({
  template,
  onClose,
}: {
  template?: TaskTemplate
  onClose: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [category, setCategory] = useState<TaskCategory>(
    template?.category ?? 'admin',
  )
  const [priority, setPriority] = useState<TaskPriority>(
    template?.priority ?? 'medium',
  )
  const [cadence, setCadence] = useState(template?.cadence ?? '')
  const [assignee, setAssignee] = useState(template?.suggestedAssignee ?? '')
  const [estimate, setEstimate] = useState(
    template ? String(template.estimateMinutes) : '',
  )
  const [items, setItems] = useState<string[]>(template?.items ?? [])
  const [draft, setDraft] = useState('')

  const nameId = useId()
  const descriptionId = useId()
  const categoryId = useId()
  const priorityId = useId()
  const cadenceId = useId()
  const assigneeId = useId()
  const estimateId = useId()
  const stepId = useId()

  const ready = name.trim() !== '' && items.length > 0

  const submit = () => {
    if (!ready) return
    const payload = {
      name: name.trim(),
      description: description.trim(),
      category,
      priority,
      cadence: cadence.trim() === '' ? 'No usual time' : cadence.trim(),
      suggestedAssignee: assignee === '' ? null : assignee,
      estimateMinutes: estimate === '' ? 0 : Number(estimate),
      items,
    }
    if (template) updateTemplate(template.id, payload)
    else createTemplate(payload)
    onClose()
  }

  return (
    <Drawer
      open
      onClose={onClose}
      placement="center"
      title={template ? 'Edit template' : 'Create template'}
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <label htmlFor={nameId} className="text-ink text-sm font-medium">
            Name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Morning care routine"
            className="border-line focus:border-brand-500 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"
          />
        </div>

        <div>
          <label htmlFor={descriptionId} className="text-ink text-sm font-medium">
            What it is for
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Anything whoever picks it up would otherwise have to ask"
            className="border-line focus:border-brand-500 mt-1.5 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <p className="text-ink text-sm font-medium">Steps</p>
          <ul className="mt-1.5 space-y-1.5">
            {items.map((item, index) => (
              <li key={`${item}-${index}`} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="text-ink-subtle mt-0.5 w-4 shrink-0 text-right text-xs tabular-nums"
                >
                  {index + 1}
                </span>
                <span className="text-ink min-w-0 flex-1 text-sm break-words">
                  {item}
                </span>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                  className="text-ink-subtle hover:text-ink shrink-0"
                >
                  <X className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
                  <span className="sr-only">Remove step {index + 1}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id={stepId}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || draft.trim() === '') return
                e.preventDefault()
                setItems([...items, draft.trim()])
                setDraft('')
              }}
              placeholder="Add a step"
              aria-label="Add a step"
              className="border-line focus:border-brand-500 h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (draft.trim() === '') return
                setItems([...items, draft.trim()])
                setDraft('')
              }}
              disabled={draft.trim() === ''}
              className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              Add
            </button>
          </div>
          {/* Required: a template with no steps is a task title with extra
              clicks in front of it. */}
          <p className="text-ink-subtle mt-1 text-xs">
            At least one. These become the checklist on every task raised from
            it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={categoryId} className="text-ink text-sm font-medium">
              Category
            </label>
            <select
              id={categoryId}
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className="border-line focus:border-brand-500 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"
            >
              {offeredCategories().map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={priorityId} className="text-ink text-sm font-medium">
              Priority
            </label>
            <select
              id={priorityId}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="border-line focus:border-brand-500 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"
            >
              {priorityOrder.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel(p)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={assigneeId} className="text-ink text-sm font-medium">
              Usually falls to
            </label>
            <select
              id={assigneeId}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="border-line focus:border-brand-500 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"
            >
              <option value="">Whoever is on the visit</option>
              {assignableNames().map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={estimateId} className="text-ink text-sm font-medium">
              Estimate
            </label>
            <input
              id={estimateId}
              type="number"
              min={0}
              step={5}
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              placeholder="Minutes"
              className="border-line focus:border-brand-500 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"
            />
            <p className="text-ink-subtle mt-1 text-xs">
              Your estimate. Nothing times it.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor={cadenceId} className="text-ink text-sm font-medium">
            When it is usually done
          </label>
          <input
            id={cadenceId}
            type="text"
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            placeholder="Usually first thing, on the morning visit"
            className="border-line focus:border-brand-500 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"
          />
          {/* The field the design has as a schedule. It is a sentence for a
              person, and the card says so wherever it appears. */}
          <p className="text-ink-subtle mt-1 text-xs">
            A note for whoever raises it — not a schedule. Nothing in this app
            raises a task on its own.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border-control text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!ready}
            className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {template ? 'Save template' : 'Create template'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}
