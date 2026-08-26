import {
  Activity,
  BarChart3,
  CalendarDays,
  CreditCard,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Settings,
  SquareCheck,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavChild {
  label: string
  to: string
  /** Match the parent's own path exactly; children own their subtrees. */
  end?: boolean
}

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  children?: NavChild[]
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Care Recipients',
    to: '/care-recipients',
    icon: Users,
    /*
     * Intake and the directory are the same section: a care request becomes a
     * recipient the moment it is approved, and coordinators move between the
     * two all day.
     */
    children: [
      { label: 'Directory', to: '/care-recipients', end: true },
      { label: 'Care Requests', to: '/care-recipients/requests' },
    ],
  },
  { label: 'Families', to: '/families', icon: Heart },
  { label: 'Caregivers', to: '/caregivers', icon: UserRound },
  {
    label: 'Scheduling',
    to: '/scheduling',
    icon: CalendarDays,
    /*
     * The rules that govern the board belong beside it, not buried in
     * organisation-wide Settings — a coordinator changing business hours is
     * doing scheduling work, not administration.
     */
    children: [
      { label: 'Board', to: '/scheduling', end: true },
      { label: 'Schedule Settings', to: '/scheduling/settings' },
    ],
  },
  {
    label: 'Live Monitoring',
    to: '/live-monitoring',
    icon: Activity,
    /*
     * Two different things, which were one view switcher until it became clear
     * they are not the same list. The board's views are all lists of *visits*
     * — happening now, all of today, on a map. Alerts are a different entity
     * entirely: they come from medication plans, care notes and the scheduling
     * board as well as from visits, and one alert can outlive the visit that
     * raised it. Filing them as a fourth "view" of the board put a list of
     * alerts behind a control whose other options were lists of visits.
     */
    children: [
      { label: 'Board', to: '/live-monitoring', end: true },
      { label: 'Alerts & Incidents', to: '/live-monitoring/alerts' },
      // Three tenses, one section: right now, today, and days that have
      // finished. History was reachable from nowhere before this — no link, no
      // route, no page.
      { label: 'Monitoring History', to: '/live-monitoring/history' },
    ],
  },
  {
    label: 'Tasks',
    to: '/tasks',
    icon: SquareCheck,
    /*
     * The list and the checklists behind it. A template is only ever raised by
     * hand here, so it belongs beside the tasks rather than under settings.
     */
    children: [
      { label: 'All Tasks', to: '/tasks', end: true },
      { label: 'Templates', to: '/tasks/templates' },
      { label: 'Task Settings', to: '/tasks/settings' },
    ],
  },
  { label: 'Messages', to: '/messages', icon: MessageSquare },
  {
    label: 'Plans & Billing',
    to: '/billing',
    icon: CreditCard,
    /*
     * The catalogue and the workspace are reachable by drilling down from the
     * overview, but "Create New Plan" and "Bulk Actions" are top-level jobs —
     * nobody should have to route through a dashboard to add a plan.
     */
    children: [
      { label: 'Overview', to: '/billing', end: true },
      { label: 'Care Plans', to: '/billing/plans' },
      { label: 'Subscriptions', to: '/billing/subscriptions' },
    ],
  },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
]
