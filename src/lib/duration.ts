/**
 * One implementation of "how long", shared by every screen that shows one.
 * Two copies had already drifted at zero — one said "0 min", the other
 * "just now".
 */
export function formatSpan(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`
}

/** The same, but "just now" at the boundary — "0 min ago" reads as broken. */
export function formatGap(minutes: number): string {
  return Math.round(Math.max(0, minutes)) === 0 ? 'just now' : formatSpan(minutes)
}
