/**
 * Shared control styling. In its own module because a file under `components/`
 * may only export components — a constant beside them breaks fast refresh.
 */
export const fieldControl =
  'border-line focus:border-brand-500 h-10 w-full rounded-lg border px-3 text-sm disabled:bg-sunken disabled:text-ink-subtle aria-[invalid]:border-red-400'
