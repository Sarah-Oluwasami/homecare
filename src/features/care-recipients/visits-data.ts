import { CalendarDays, CircleCheck, Users } from 'lucide-react'
import { Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Tone, VisitStatus } from '@/types'

/* ---------------------------------- types --------------------------------- */

export interface VisitRecord {
  id: string
  /** ISO date, used for range filtering. */
  date: string
  time: string
  caregiver: string
  type: string
  durationHours: number
  clockIn: string | null
  clockOut: string | null
  status: VisitStatus
  notes: string
}

export interface VisitStat {
  id: string
  label: string
  value: string
  hint: string
  icon: LucideIcon
  tone: Tone
}

export interface WeekBar {
  label: string
  count: number
}

export interface VisitHistory {
  stats: VisitStat[]
  visits: VisitRecord[]
  /** Server-side total the sample stands in for. */
  totalVisits: number
  weeklyTrend: WeekBar[]
  /** `direction` drives the colour — a fall must not render as a green win. */
  trendDelta: { value: string; direction: 'up' | 'down' }
  commonType: { name: string; share: string }
  coverage: { percent: string; detail: string }
}

export const VISITS_PAGE_SIZE = 10

/* ---------------------------------- data ---------------------------------- */

const histories: Record<string, VisitHistory> = {
  'cr-001': {
    stats: [
      {
        id: 'total',
        label: 'Total Visits',
        value: '133',
        hint: 'All-time completed',
        icon: Users,
        tone: 'blue',
      },
      {
        id: 'month',
        label: 'This Month',
        value: '28',
        hint: 'Visits in July',
        icon: CalendarDays,
        tone: 'purple',
      },
      {
        id: 'duration',
        label: 'Avg Duration',
        value: '2.2h',
        hint: 'Per scheduled visit',
        icon: Activity,
        tone: 'amber',
      },
      {
        id: 'completion',
        label: 'Completion Rate',
        value: '98.2%',
        hint: '130 successful of 133',
        icon: CircleCheck,
        tone: 'green',
      },
    ],
    /*
     * Reconciled with billing: 125 visits are invoiced across Mar 16 – Jul 15,
     * plus the six logged after Jul 15. 156 left ~21 visits that no invoice
     * covered and that predated the March 15 care start.
     */
    totalVisits: 133,
    weeklyTrend: [
      { label: 'W1', count: 5 },
      { label: 'W2', count: 6 },
      { label: 'W3', count: 8 },
      { label: 'W4', count: 5 },
      { label: 'W5', count: 4 },
    ],
    trendDelta: { value: '+14%', direction: 'up' },
    commonType: { name: 'Morning Care', share: '45% of total visits' },
    coverage: { percent: '72%', detail: 'Sarah Williams (96 visits)' },
    visits: [
      {
        id: 'vh1',
        date: '2026-07-24',
        time: '9:00 AM',
        caregiver: 'Sarah Williams',
        type: 'Morning Care',
        durationHours: 2.5,
        clockIn: '08:58 AM',
        clockOut: '11:30 AM',
        status: 'completed',
        notes: 'Routine morning assistance, medications administered.',
      },
      {
        // Evening shift — this is what covers the 8:00 PM Memantine dose that
        // the Medications tab attributes to David Park.
        id: 'vh2',
        date: '2026-07-23',
        time: '7:30 PM',
        caregiver: 'David Park',
        type: 'Evening Care',
        durationHours: 1.5,
        clockIn: '07:28 PM',
        clockOut: '08:58 PM',
        status: 'completed',
        notes: 'Evening routine, 8:00 PM medication administered.',
      },
      {
        id: 'vh2b',
        date: '2026-07-22',
        time: '2:00 PM',
        caregiver: 'David Park',
        type: 'Physical Therapy',
        durationHours: 1.5,
        clockIn: '02:05 PM',
        clockOut: '03:35 PM',
        status: 'completed',
        notes: 'Gait exercises, good tolerance.',
      },
      {
        id: 'vh3',
        date: '2026-07-21',
        time: '9:00 AM',
        caregiver: 'Sarah Williams',
        type: 'Morning Care',
        durationHours: 2.5,
        clockIn: '09:12 AM',
        clockOut: '11:42 AM',
        status: 'late-arrival',
        notes: 'Traffic delay, family notified.',
      },
      {
        id: 'vh4',
        date: '2026-07-19',
        time: '1:00 PM',
        caregiver: 'Emma Wilson',
        type: 'Clinical Checkup',
        durationHours: 1,
        clockIn: '12:55 PM',
        clockOut: '02:00 PM',
        status: 'completed',
        notes: 'Vitals within range, BP slightly elevated.',
      },
      {
        id: 'vh5',
        date: '2026-07-17',
        time: '6:00 PM',
        caregiver: 'Maria Garcia',
        type: 'Medication Review',
        durationHours: 1,
        clockIn: null,
        clockOut: null,
        status: 'cancelled',
        notes: 'Cancelled by family, rescheduled to July 18.',
      },
      {
        id: 'vh6',
        date: '2026-07-15',
        time: '9:00 AM',
        caregiver: 'Sarah Williams',
        type: 'Morning Care',
        durationHours: 2.5,
        clockIn: '08:55 AM',
        clockOut: '11:25 AM',
        status: 'completed',
        notes:
          'Minor fall in bathroom at 9:15 AM, no injury. Incident report filed. Routine assistance otherwise.',
      },
      {
        id: 'vh7',
        date: '2026-07-14',
        time: '2:00 PM',
        caregiver: 'David Park',
        type: 'Physical Therapy',
        durationHours: 1.5,
        clockIn: '01:58 PM',
        clockOut: '03:28 PM',
        status: 'completed',
        notes: 'Balance work, no incidents.',
      },
      {
        id: 'vh8',
        date: '2026-07-12',
        time: '12:00 PM',
        caregiver: 'Emma Wilson',
        type: 'Afternoon Care',
        durationHours: 3,
        clockIn: '11:54 AM',
        clockOut: '02:54 PM',
        status: 'completed',
        notes: 'Lunch, social engagement, light walking.',
      },
      {
        id: 'vh9',
        date: '2026-07-10',
        time: '9:00 AM',
        caregiver: 'Sarah Williams',
        type: 'Morning Care',
        durationHours: 2.5,
        clockIn: '08:59 AM',
        clockOut: '11:30 AM',
        status: 'completed',
        notes: 'Routine morning assistance.',
      },
      {
        id: 'vh10',
        date: '2026-07-08',
        time: '6:00 PM',
        caregiver: 'Maria Garcia',
        type: 'Medication Review',
        durationHours: 1,
        clockIn: '05:57 PM',
        clockOut: '06:57 PM',
        status: 'completed',
        notes: 'Evening dosing reviewed with family.',
      },
      /*
       * Older than 30 days on purpose — without these the date-range filter
       * would be real but unobservable, since the ten rows above all fall
       * inside the default window.
       */
      {
        id: 'vh11',
        date: '2026-06-20',
        time: '9:00 AM',
        caregiver: 'Sarah Williams',
        type: 'Morning Care',
        durationHours: 2.5,
        clockIn: '09:01 AM',
        clockOut: '11:31 AM',
        status: 'completed',
        notes: 'Routine morning assistance.',
      },
      {
        id: 'vh12',
        date: '2026-06-18',
        time: '2:00 PM',
        caregiver: 'David Park',
        type: 'Physical Therapy',
        durationHours: 1.5,
        clockIn: '02:10 PM',
        clockOut: '03:40 PM',
        status: 'late-arrival',
        notes: 'Delayed start, session shortened slightly.',
      },
      {
        id: 'vh13',
        date: '2026-06-05',
        time: '1:00 PM',
        caregiver: 'Emma Wilson',
        type: 'Clinical Checkup',
        durationHours: 1,
        clockIn: '12:58 PM',
        clockOut: '01:58 PM',
        status: 'completed',
        notes: 'Quarterly clinical review, no concerns.',
      },
      {
        id: 'vh14',
        date: '2026-05-20',
        time: '9:00 AM',
        caregiver: 'Sarah Williams',
        type: 'Morning Care',
        durationHours: 2.5,
        clockIn: '08:57 AM',
        clockOut: '11:27 AM',
        status: 'completed',
        notes: 'Routine morning assistance.',
      },
    ],
  },
}

export function getVisitHistory(recipientId: string): VisitHistory | undefined {
  return histories[recipientId]
}

/* -------------------------------- formatting ------------------------------- */

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "2026-07-24" + "9:00 AM" → "July 24, 2026, 9:00 AM" */
export function formatVisitDate(visit: VisitRecord): string {
  return `${dateFormat.format(new Date(`${visit.date}T00:00:00Z`))}, ${visit.time}`
}

export function formatDuration(hours: number): string {
  return `${hours.toFixed(1)}h`
}
