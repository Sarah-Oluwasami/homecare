import {
  AlertTriangle,
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  House,
  Megaphone,
  PlayCircle,
  Star,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Priority, Severity, Tone, VisitStatus } from '@/types'

/* ---------------------------------- types --------------------------------- */

export interface Stat {
  id: string
  label: string
  value: string
  meta: string
  /** Direction of `meta` relative to the previous period. */
  trend?: 'up' | 'down'
  icon: LucideIcon
  tone: Tone
}

export interface Visit {
  id: string
  time: string
  recipient: string
  caregiver: string | null
  type: string
  status: VisitStatus
  priority: Priority
}

export interface Alert {
  id: string
  title: string
  severity: Severity
  detail: string
  coordinator: string
  action: string
  /** Destructive actions get a red button. */
  destructive?: boolean
}

export interface ActivityEntry {
  id: string
  title: string
  detail: string
  ago: string
  icon: LucideIcon
  tone: Tone
}

export interface QuickAction {
  id: string
  label: string
  icon: LucideIcon
}

export interface Metric {
  id: string
  label: string
  value: string
  /** 0–100, drives the progress bar width. */
  percent: number
  tone: Tone
  emphasis?: boolean
}

/* ---------------------------------- data ---------------------------------- */

export const stats: Stat[] = [
  {
    id: 'active-visits',
    label: 'Active Home Visits',
    value: '24',
    meta: '12%',
    trend: 'up',
    icon: House,
    tone: 'green',
  },
  {
    id: 'scheduled',
    label: "Today's Scheduled Visits",
    value: '67',
    meta: '89% complete',
    icon: CalendarPlus,
    tone: 'blue',
  },
  {
    id: 'available',
    label: 'Available Caregivers',
    value: '18',
    meta: '18 of 42',
    icon: Users,
    tone: 'purple',
  },
  {
    id: 'starting',
    label: 'Visits Starting Soon',
    value: '8',
    meta: 'next hour',
    icon: Clock,
    tone: 'amber',
  },
  {
    id: 'alerts',
    label: 'Critical Alerts',
    value: '3',
    meta: 'requires action',
    icon: AlertTriangle,
    tone: 'red',
  },
  {
    id: 'quality',
    label: 'Care Quality Score',
    value: '94.2%',
    meta: '2.1%',
    trend: 'up',
    icon: Star,
    tone: 'green',
  },
]

export const visits: Visit[] = [
  {
    id: 'v1',
    time: '8:00 AM',
    recipient: 'Margaret Johnson',
    caregiver: 'Sarah Williams',
    type: 'Morning Care',
    status: 'completed',
    priority: 'normal',
  },
  {
    id: 'v2',
    time: '9:30 AM',
    recipient: 'Robert Chen',
    caregiver: 'David Park',
    type: 'Medication',
    status: 'in-progress',
    priority: 'high',
  },
  {
    id: 'v3',
    time: '10:00 AM',
    recipient: 'Eleanor Davis',
    caregiver: 'Maria Garcia',
    type: 'Physical Therapy',
    status: 'starting-soon',
    priority: 'normal',
  },
  {
    id: 'v4',
    time: '10:30 AM',
    recipient: 'James Wilson',
    caregiver: null,
    type: 'Wound Care',
    status: 'unassigned',
    priority: 'urgent',
  },
  {
    id: 'v5',
    time: '11:00 AM',
    recipient: 'Patricia Brown',
    caregiver: 'Lisa Thompson',
    type: 'Companionship',
    status: 'upcoming',
    priority: 'low',
  },
  {
    id: 'v6',
    time: '11:30 AM',
    recipient: 'William Taylor',
    caregiver: 'John Adams',
    type: 'Morning Care',
    status: 'upcoming',
    priority: 'normal',
  },
]

export const alerts: Alert[] = [
  {
    id: 'a1',
    title: 'Late Caregiver',
    severity: 'high',
    detail: 'Sarah Williams 15min late for Margaret Johnson visit.',
    coordinator: 'Mike Chen',
    action: 'Reassign',
  },
  {
    id: 'a2',
    title: 'Missed Clock-in',
    severity: 'critical',
    detail: "David Park hasn't clocked in for 9:30 AM visit.",
    coordinator: 'Jane Smith',
    action: 'Contact',
    destructive: true,
  },
  {
    id: 'a3',
    title: 'Certification Expiring',
    severity: 'medium',
    detail: 'Maria Garcia CPR cert expires in 3 days.',
    coordinator: 'HR Team',
    action: 'Notify',
  },
  {
    id: 'a4',
    title: 'Medication Issue',
    severity: 'high',
    detail: 'Dosage discrepancy flagged for Eleanor Davis.',
    coordinator: 'Clinical Team',
    action: 'Review',
  },
]

export const activity: ActivityEntry[] = [
  {
    id: 't1',
    title: 'Visit Started',
    detail: 'Sarah Williams began morning care for Margaret Johnson.',
    ago: '2 min ago',
    icon: PlayCircle,
    tone: 'green',
  },
  {
    id: 't2',
    title: 'Medication Recorded',
    detail: 'David Park logged medication for Robert Chen.',
    ago: '8 min ago',
    icon: CheckCircle2,
    tone: 'blue',
  },
  {
    id: 't3',
    title: 'Visit Completed',
    detail: 'Lisa Thompson finished companionship visit.',
    ago: '15 min ago',
    icon: CheckCircle2,
    tone: 'green',
  },
  {
    id: 't4',
    title: 'Caregiver Assigned',
    detail: 'John Adams assigned to William Taylor.',
    ago: '22 min ago',
    icon: UserPlus,
    tone: 'blue',
  },
  {
    id: 't5',
    title: 'Payment Received',
    detail: 'Invoice #4521 paid by Johnson family.',
    ago: '45 min ago',
    icon: CreditCard,
    tone: 'green',
  },
]

export const quickActions: QuickAction[] = [
  { id: 'q1', label: 'Assign Caregiver', icon: UserPlus },
  { id: 'q2', label: 'Schedule Visit', icon: CalendarPlus },
  { id: 'q3', label: 'Create Care Plan', icon: FileText },
  { id: 'q4', label: 'Register Care Recipient', icon: UserRound },
  { id: 'q5', label: 'Broadcast Announcement', icon: Megaphone },
  { id: 'q6', label: 'Generate Report', icon: BarChart3 },
]

export const metrics: Metric[] = [
  {
    id: 'm1',
    label: "Today's Completion Rate",
    value: '89%',
    percent: 89,
    tone: 'green',
  },
  {
    id: 'm2',
    label: 'Average Arrival Time',
    value: '-2 min early',
    percent: 92,
    tone: 'green',
    emphasis: true,
  },
  {
    id: 'm3',
    label: 'Client Satisfaction',
    value: '4.8/5.0',
    percent: 96,
    tone: 'amber',
  },
  {
    id: 'm4',
    label: 'Revenue Today',
    value: '₦12,450',
    percent: 74,
    tone: 'blue',
  },
  { id: 'm5', label: 'Open Tasks', value: '14', percent: 45, tone: 'slate' },
]
