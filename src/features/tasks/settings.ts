/**
 * How tasks are labelled and sorted, and who they land on by default.
 *
 * The vocabulary lives here rather than in `data.ts` because it is the part a
 * coordinator can change: the categories on the settings screen are the same
 * objects the create form offers, the task rows colour themselves from, and the
 * filters are built out of. A settings page that edited a copy would be a
 * settings page that changed nothing.
 *
 * Four categories are marked `derived` and cannot be removed or hidden. They
 * are the ones the worked-out rows come out of — paperwork, compliance,
 * incident follow-up, intake — and switching one off would not stop the app
 * producing those rows, it would only leave them with nowhere to sit. Renaming
 * and recolouring them is fine: that is presentation, and it is the whole point
 * of the screen.
 *
 * Held in memory for the session, like everything else this app writes.
 */
import { useSyncExternalStore } from 'react'
import type { Tone } from '@/types'

/** Ids are free-form: a coordinator can add one the type never knew about. */
export type TaskCategory = string

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

export interface CategorySetting {
  id: TaskCategory
  label: string
  tone: Tone
  /** Pre-selected when a task is written in this category. */
  defaultAssignee: string | null
  /** Whether the create and template forms offer it. */
  offered: boolean
  /** True where the app itself produces rows in this category. */
  derived: boolean
}

export interface PrioritySetting {
  id: TaskPriority
  label: string
}

export const toneChoices: Tone[] = [
  'blue',
  'green',
  'amber',
  'red',
  'rose',
  'purple',
  'slate',
]

function defaults(): {
  categories: CategorySetting[]
  priorities: PrioritySetting[]
  defaultPriority: TaskPriority
} {
  return {
    categories: [
      {
        id: 'paperwork',
        label: 'Visit paperwork',
        tone: 'blue',
        defaultAssignee: null,
        offered: true,
        derived: true,
      },
      {
        id: 'compliance',
        label: 'Compliance',
        tone: 'amber',
        defaultAssignee: 'HR Team',
        offered: true,
        derived: true,
      },
      {
        id: 'incident',
        label: 'Incident follow-up',
        tone: 'red',
        defaultAssignee: null,
        offered: false,
        derived: true,
      },
      {
        id: 'intake',
        label: 'New client',
        tone: 'green',
        defaultAssignee: null,
        offered: false,
        derived: true,
      },
      {
        id: 'family',
        label: 'Family',
        tone: 'purple',
        defaultAssignee: 'Mike Chen',
        offered: true,
        derived: false,
      },
      {
        id: 'supplies',
        label: 'Supplies',
        tone: 'slate',
        defaultAssignee: 'Admin Support',
        offered: true,
        derived: false,
      },
      {
        id: 'admin',
        label: 'Admin',
        tone: 'slate',
        defaultAssignee: null,
        offered: true,
        derived: false,
      },
    ],
    priorities: [
      { id: 'critical', label: 'Critical' },
      { id: 'high', label: 'High' },
      { id: 'medium', label: 'Medium' },
      { id: 'low', label: 'Low' },
    ],
    defaultPriority: 'medium',
  }
}

let state = defaults()
let added = 0
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

export function useTaskSettings(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  )
}

/* ------------------------------- categories ------------------------------- */

export function allCategories(): CategorySetting[] {
  return state.categories
}

export function categoryById(id: TaskCategory): CategorySetting | undefined {
  return state.categories.find((c) => c.id === id)
}

/**
 * The label to print. Falls back to the id rather than to an empty cell: a task
 * written under a category somebody later deleted still has to say something.
 */
export function categoryLabel(id: TaskCategory): string {
  return categoryById(id)?.label ?? id
}

export function categoryTone(id: TaskCategory): Tone {
  return categoryById(id)?.tone ?? 'slate'
}

/** What the create and template forms offer, in the order set here. */
export function offeredCategories(): CategorySetting[] {
  return state.categories.filter((c) => c.offered)
}

export function defaultAssigneeFor(id: TaskCategory): string | null {
  return categoryById(id)?.defaultAssignee ?? null
}

export interface CategoryEdit {
  label: string
  tone: Tone
  defaultAssignee: string | null
  offered: boolean
}

export function updateCategory(id: TaskCategory, edit: CategoryEdit): void {
  const category = categoryById(id)
  if (!category) return
  // A derived category is always offered — the app files rows into it whatever
  // this screen says, and hiding it from the form would not stop that.
  Object.assign(category, edit, category.derived ? { offered: true } : {})
  emit()
}

export function addCategory(edit: CategoryEdit): string {
  added += 1
  const id = `custom-${added}`
  state.categories.push({ ...edit, id, derived: false })
  emit()
  return id
}

/** Only ever a category the app does not file rows into. */
export function removeCategory(id: TaskCategory): void {
  const at = state.categories.findIndex((c) => c.id === id && !c.derived)
  if (at === -1) return
  state.categories.splice(at, 1)
  emit()
}

/* ------------------------------- priorities ------------------------------- */

export function allPriorities(): PrioritySetting[] {
  return state.priorities
}

export const priorityOrder: TaskPriority[] = ['critical', 'high', 'medium', 'low']

export function priorityLabel(id: TaskPriority): string {
  return state.priorities.find((p) => p.id === id)?.label ?? id
}

export function setPriorityLabel(id: TaskPriority, label: string): void {
  const priority = state.priorities.find((p) => p.id === id)
  if (!priority || label.trim() === '') return
  priority.label = label.trim()
  emit()
}

export function defaultPriority(): TaskPriority {
  return state.defaultPriority
}

export function setDefaultPriority(id: TaskPriority): void {
  if (state.defaultPriority === id) return
  state.defaultPriority = id
  emit()
}

/* --------------------------------- reset ---------------------------------- */

export function resetTaskSettings(): void {
  state = defaults()
  added = 0
  emit()
}

/**
 * Whether anything has been changed from the shipped defaults.
 *
 * Compared rather than tracked with a dirty flag: a coordinator who changes a
 * label and changes it back has not changed anything, and a Reset button that
 * stayed lit would be telling them otherwise.
 */
export function isDefault(): boolean {
  return JSON.stringify(state) === JSON.stringify(defaults())
}
