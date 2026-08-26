/**
 * Minimal class-name joiner. Swap for clsx + tailwind-merge if conflict
 * resolution becomes necessary.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
