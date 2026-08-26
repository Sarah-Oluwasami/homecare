import { useSyncExternalStore } from 'react'

/**
 * Subscribes to a media query. Used to distinguish the mobile drawer from the
 * static desktop sidebar — the two need different a11y semantics.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    // Server/prerender fallback: assume desktop so nothing is hidden.
    () => true,
  )
}

/** Matches Tailwind's `lg` breakpoint (64rem). */
export const LG_QUERY = '(min-width: 64rem)'
