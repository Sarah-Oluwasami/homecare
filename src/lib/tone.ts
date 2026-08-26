import type { Tone } from '@/types'

/*
 * Full class strings, not `bg-${tone}-50` — Tailwind scans source text and
 * cannot see dynamically constructed class names.
 */

/** Tinted icon chip: soft background + saturated foreground. */
export const toneChip: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
}

/** Pill styling for badges. */
export const tonePill: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  purple: 'bg-violet-50 text-violet-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
}

/** Solid fill for small dots and rails. Same values as `toneFill`, named
 *  separately so a change to bar styling doesn't silently move the dots. */
export const toneDot: Record<Tone, string> = {
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-violet-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
}

/** Solid fill, used for progress bars. */
export const toneFill: Record<Tone, string> = {
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-violet-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
}

/**
 * Foreground-only, used for trend and meta text. These land on white at
 * `text-sm`, so they need 4.5:1 — the -600 steps of emerald (3.7:1) and
 * amber (3.2:1) do not clear it.
 */
export const toneText: Record<Tone, string> = {
  green: 'text-emerald-700',
  blue: 'text-blue-600',
  purple: 'text-violet-700',
  amber: 'text-amber-700',
  red: 'text-red-600',
  rose: 'text-rose-700',
  slate: 'text-ink-subtle',
}
