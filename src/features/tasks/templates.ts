/**
 * Reusable checklists.
 *
 * A template here is exactly one thing: a named list of steps somebody can
 * raise as a task, with the fields that are usually the same already filled in.
 * Applying one writes an ordinary task — same store, same page, same tick
 * boxes — with the steps copied onto it.
 *
 * What a template is *not*, in this app, is a schedule. The design has these
 * firing on their own ("Daily, 7:00–8:00 AM", "3x Daily", "156 generated this
 * week"), and nothing in this app runs when nobody is looking at it: there is
 * no server, no job, no clock but the one on the screen. A template that said
 * "Daily" and then produced nothing overnight would be worse than no template
 * at all, because a coordinator would stop checking. So the cadence field is
 * plain guidance, labelled as guidance, and the only count on a card is the
 * number of tasks somebody actually raised from it.
 *
 * Templates live in memory for the session, like everything else this app
 * writes.
 */
import { useSyncExternalStore } from 'react'
import { SIGNED_IN } from '@/lib/session'
import { createTask } from './data'
import type { TaskCategory, TaskPriority } from './data'

export interface TaskTemplate {
  id: string
  name: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  /**
   * When this is normally done, in words. Guidance for whoever raises it —
   * nothing reads this and nothing fires on it.
   */
  cadence: string
  /** Who it usually falls to. Pre-selected when the template is applied. */
  suggestedAssignee: string | null
  /** The creator's estimate for the whole list, in minutes. */
  estimateMinutes: number
  /** The steps, in order. */
  items: string[]
  active: boolean
  createdBy: string
}

const templates: TaskTemplate[] = [
  {
    id: 'tpl-morning',
    name: 'Morning care routine',
    description:
      'The standard morning round: personal care, medication and breakfast, in the order the care plans assume.',
    category: 'paperwork',
    priority: 'medium',
    cadence: 'Usually first thing, on the morning visit',
    suggestedAssignee: null,
    estimateMinutes: 45,
    items: [
      'Check the care plan for anything changed since the last visit',
      'Personal care and dressing',
      'Morning medication against the chart',
      'Breakfast and fluids',
      'Note anything unusual about mood or mobility',
      'Write the visit up before leaving',
    ],
    active: true,
    createdBy: 'Mike Chen',
  },
  {
    id: 'tpl-medication',
    name: 'Medication round',
    description:
      'Administering and documenting a scheduled round, including what to do about a refusal.',
    category: 'paperwork',
    priority: 'high',
    cadence: 'Usually at each scheduled round',
    suggestedAssignee: null,
    estimateMinutes: 20,
    items: [
      'Check the chart against the pack',
      'Confirm the client is able to take it now',
      'Administer and watch it taken',
      'Record the time and the dose',
      'If refused, record the reason and tell the coordinator',
    ],
    active: true,
    createdBy: 'Dr. Jane Foster',
  },
  {
    id: 'tpl-assessment',
    name: 'Weekly health check',
    description:
      'Vitals, mobility and orientation, written up against the client record.',
    category: 'paperwork',
    priority: 'medium',
    cadence: 'Usually once a week, with the senior caregiver',
    suggestedAssignee: 'Emma Wilson',
    estimateMinutes: 30,
    items: [
      'Blood pressure, pulse and temperature',
      'Weight, where the plan asks for it',
      'Skin integrity check',
      'Mobility and transfers',
      'Orientation to time, place and person',
      'Record against the health timeline',
    ],
    active: true,
    createdBy: 'Emma Wilson',
  },
  {
    id: 'tpl-incident',
    name: 'Incident follow-up',
    description:
      'What happens after a write-up is filed: telling the family, checking the environment, and deciding the outcome.',
    category: 'incident',
    priority: 'high',
    cadence: 'Usually the same day the incident is written up',
    suggestedAssignee: 'Mike Chen',
    estimateMinutes: 25,
    items: [
      'Read the write-up and the visit it came from',
      'Speak to the caregiver who filed it',
      'Tell the family and record that you did',
      'Check whether anything in the home needs changing',
      'Set the incident outcome',
    ],
    active: true,
    createdBy: SIGNED_IN,
  },
  {
    id: 'tpl-handover',
    name: 'Shift handover',
    description: 'What the next caregiver needs to know before they arrive.',
    category: 'admin',
    priority: 'medium',
    cadence: 'Usually at the end of a shift',
    suggestedAssignee: null,
    estimateMinutes: 10,
    items: [
      'Anything not done, and why',
      'Changes in mood, appetite or mobility',
      'Medication given or refused',
      'Anything the family asked for',
      'Supplies running low',
    ],
    active: true,
    createdBy: 'Amara Nwosu',
  },
  {
    id: 'tpl-review',
    name: 'Monthly care plan review',
    description:
      'Going back over the plan with the family: what is working, what has changed, what the hours should be.',
    category: 'family',
    priority: 'medium',
    cadence: 'Usually once a month',
    suggestedAssignee: 'Mike Chen',
    estimateMinutes: 60,
    items: [
      'Read the last month of visit notes',
      'Check the goals against what actually happened',
      'Look at hours used against the package',
      'Speak to the family',
      'Update the plan and record what changed',
    ],
    active: false,
    createdBy: 'Mike Chen',
  },
]

let made = 0
let version = 0
const listeners = new Set<() => void>()

function emit(): void {
  version += 1
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTemplates(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  )
}

export function allTemplates(): TaskTemplate[] {
  return [...templates].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
  )
}

export function templateById(id: string | undefined): TaskTemplate | undefined {
  return id ? templates.find((t) => t.id === id) : undefined
}

export type TemplateDraft = Omit<TaskTemplate, 'id' | 'active' | 'createdBy'>

export function createTemplate(draft: TemplateDraft): string {
  made += 1
  const id = `tpl-new-${made}`
  templates.unshift({ ...draft, id, active: true, createdBy: SIGNED_IN })
  emit()
  return id
}

export function updateTemplate(id: string, draft: TemplateDraft): void {
  const template = templateById(id)
  if (!template) return
  Object.assign(template, draft)
  emit()
}

/** A copy, clearly named as one, so the original is never edited by accident. */
export function duplicateTemplate(id: string): string | undefined {
  const template = templateById(id)
  if (!template) return undefined
  made += 1
  const copy: TaskTemplate = {
    ...template,
    id: `tpl-new-${made}`,
    name: `${template.name} (copy)`,
    items: [...template.items],
    createdBy: SIGNED_IN,
    active: true,
  }
  templates.unshift(copy)
  emit()
  return copy.id
}

/**
 * Retired rather than deleted, by default.
 *
 * A template somebody has raised tasks from is a piece of history: the tasks
 * name it, and deleting it would leave them pointing at nothing.
 */
export function setTemplateActive(id: string, active: boolean): void {
  const template = templateById(id)
  if (!template || template.active === active) return
  template.active = active
  emit()
}

export function deleteTemplate(id: string): void {
  const at = templates.findIndex((t) => t.id === id)
  if (at === -1) return
  templates.splice(at, 1)
  emit()
}

export interface ApplyOptions {
  assignee: string | null
  recipientId: string | null
  due: string | null
}

/**
 * Raise a task from a template.
 *
 * The one thing a template does in this app, and it does it when a person asks
 * — never on a clock. What comes out is an ordinary written task with the steps
 * copied onto it as an unticked checklist.
 */
export function applyTemplate(id: string, options: ApplyOptions): string | undefined {
  const template = templateById(id)
  if (!template) return undefined
  return createTask({
    title: template.name,
    description: template.description,
    category: template.category,
    priority: template.priority,
    assignee: options.assignee,
    recipientId: options.recipientId,
    due: options.due,
    estimateMinutes: template.estimateMinutes,
    items: template.items,
    fromTemplate: template.id,
  })
}
