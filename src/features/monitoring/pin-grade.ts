import type { LiveAlert, LiveVisit } from './live-data'

/* --------------------------------- grading --------------------------------- */

/**
 * What a pin encodes.
 *
 * Not the live state: eleven states collapse onto five tones, which left two
 * pairs pixel-identical and a legend that could not resolve itself. A pin
 * carries the worst alert raised against that visit — four values, four
 * distinct shapes — and the exact state stays in the label, the tooltip and
 * the panel where there is room to say it.
 */
export type PinGrade = 'critical' | 'high' | 'medium' | 'clear'

export const pinGradeLabels: Record<PinGrade, string> = {
  critical: 'Needs someone now',
  high: 'Needs chasing',
  medium: 'Worth a look',
  clear: 'Nothing raised',
}

export function gradeOf(visit: LiveVisit, alerts: LiveAlert[]): PinGrade {
  const mine = alerts.filter((a) => a.id.endsWith(visit.id))
  if (mine.some((a) => a.severity === 'critical')) return 'critical'
  if (mine.some((a) => a.severity === 'high')) return 'high'
  if (mine.some((a) => a.severity === 'medium')) return 'medium'
  return 'clear'
}

/** Full class strings — Tailwind cannot see a name built at runtime. */
export const gradeFill: Record<PinGrade, string> = {
  critical: 'fill-red-600',
  high: 'fill-red-400',
  medium: 'fill-amber-500',
  clear: 'fill-emerald-500',
}

export const gradeStroke: Record<PinGrade, string> = {
  critical: 'stroke-red-600',
  high: 'stroke-red-400',
  medium: 'stroke-amber-500',
  clear: 'stroke-emerald-500',
}

export const gradeDot: Record<PinGrade, string> = {
  critical: 'bg-red-600',
  high: 'bg-red-400',
  medium: 'bg-amber-500',
  clear: 'bg-emerald-500',
}
