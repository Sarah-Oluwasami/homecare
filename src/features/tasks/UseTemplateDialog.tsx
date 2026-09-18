import { useId, useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { recipients } from '@/features/care-recipients/data'
import { SIGNED_IN } from '@/lib/session'
import { TODAY } from '@/lib/today'
import { assignableNames } from './data'
import { applyTemplate } from './templates'
import type { TaskTemplate } from './templates'

/**
 * Raising a task from a template.
 *
 * Three fields, because three are all that change: who, which client, and when
 * it is wanted. Everything else — the steps, the estimate, the category, the
 * priority — comes off the template, and the list is shown so nobody has to
 * take that on trust before pressing the button.
 */
export function UseTemplateDialog({
  template,
  onClose,
  onApplied,
}: {
  template: TaskTemplate
  onClose: () => void
  onApplied: (taskId: string) => void
}) {
  const [assignee, setAssignee] = useState(
    template.suggestedAssignee ?? SIGNED_IN,
  )
  const [recipientId, setRecipientId] = useState('')
  const [due, setDue] = useState(TODAY)

  const assigneeId = useId()
  const clientId = useId()
  const dueId = useId()

  const submit = () => {
    const id = applyTemplate(template.id, {
      assignee,
      recipientId: recipientId === '' ? null : recipientId,
      due: due === '' ? null : due,
    })
    onClose()
    if (id) onApplied(id)
  }

  return (
    <Drawer
      open
      onClose={onClose}
      placement="center"
      title="Raise a task"
      subtitle={template.name}
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="border-line bg-sunken rounded-lg border p-3">
          <p className="text-ink-muted text-sm break-words">
            {template.description}
          </p>
          <p className="text-ink-subtle mt-2 text-xs">
            {template.items.length} step
            {template.items.length === 1 ? '' : 's'} · about{' '}
            {template.estimateMinutes} minutes as estimated
          </p>
          {/* Shown in full: a checklist arriving on a task somebody has not read
              is how a step gets ticked without being done. */}
          <ol className="text-ink-muted mt-2 space-y-1 text-sm">
            {template.items.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="text-ink-subtle w-4 shrink-0 text-right text-xs tabular-nums"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={assigneeId} className="text-ink text-sm font-medium">
              Assign to
            </label>
            <select
              id={assigneeId}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="border-line focus:border-brand-500 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"
            >
              {assignableNames().map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={dueId} className="text-ink text-sm font-medium">
              Due
            </label>
            <input
              id={dueId}
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="border-line focus:border-brand-500 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor={clientId} className="text-ink text-sm font-medium">
            Client <span className="text-ink-subtle font-normal">(optional)</span>
          </label>
          <select
            id={clientId}
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="border-line focus:border-brand-500 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"
          >
            <option value="">Not about one client</option>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-ink-subtle text-xs">
          Raises one task now, filed by {SIGNED_IN}. Using a template again later
          raises another — nothing repeats on its own.
        </p>

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
            className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white"
          >
            Raise the task
          </button>
        </div>
      </div>
    </Drawer>
  )
}
