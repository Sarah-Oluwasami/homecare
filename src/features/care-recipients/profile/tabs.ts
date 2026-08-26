import {
  CalendarPlus,
  ClipboardList,
  Download,
  MessageSquare,
  Plus,
  Printer,
  SquarePen,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface ProfileTab {
  slug: string
  label: string
}

export const profileTabs: ProfileTab[] = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'care-plan', label: 'Care Plan' },
  { slug: 'visits', label: 'Visits' },
  { slug: 'health', label: 'Health' },
  { slug: 'medications', label: 'Medications' },
  { slug: 'caregivers', label: 'Caregivers' },
  { slug: 'family', label: 'Family' },
  { slug: 'documents', label: 'Documents' },
  { slug: 'notes', label: 'Notes' },
  { slug: 'billing', label: 'Billing' },
  { slug: 'activity', label: 'Activity' },
]

export interface TabAction {
  label: string
  icon: LucideIcon
  primary?: boolean
}

const defaultActions: TabAction[] = [
  { label: 'Edit Profile', icon: SquarePen },
  { label: 'Schedule Visit', icon: CalendarPlus, primary: true },
]

/** Header buttons change with the active tab; anything unlisted falls back. */
const actionsByTab: Record<string, TabAction[]> = {
  'care-plan': [
    { label: 'Edit Care Plan', icon: SquarePen, primary: true },
    { label: 'Print', icon: Printer },
  ],
  medications: [
    { label: 'View Care Plan', icon: ClipboardList },
    { label: 'Add Medication', icon: Plus, primary: true },
  ],
  health: [
    { label: 'Export', icon: Download },
    { label: 'Add Health Event', icon: Plus, primary: true },
  ],
  caregivers: [
    { label: 'Contact Family', icon: MessageSquare },
    { label: 'Assign Caregiver', icon: Plus, primary: true },
  ],
  documents: [{ label: 'Upload Document', icon: Upload, primary: true }],
  billing: [
    { label: 'Export', icon: Download },
    { label: 'Create Invoice', icon: Plus, primary: true },
  ],
  notes: [{ label: 'Add Note', icon: Plus, primary: true }],
  family: [
    { label: 'Message All', icon: MessageSquare },
    { label: 'Add Family Member', icon: Plus, primary: true },
  ],
  activity: [{ label: 'Export Audit Trail', icon: Download }],
}

export function actionsForTab(slug: string | undefined): TabAction[] {
  // hasOwn, not a bare lookup — `actionsByTab['constructor']` would otherwise
  // return a function and blow up the caller's .map().
  if (slug && Object.hasOwn(actionsByTab, slug)) return actionsByTab[slug]
  return defaultActions
}
