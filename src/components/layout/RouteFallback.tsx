/**
 * Shown while a route's code chunk loads. Mirrors the page shell so a cold
 * deep link doesn't flash an empty document.
 */
export function RouteFallback() {
  return (
    <div className="min-h-dvh">
      <div className="lg:pl-sidebar">
        <div className="border-line bg-surface h-16 border-b" />
        <div
          role="status"
          aria-live="polite"
          className="mx-auto max-w-[100rem] px-4 py-6 sm:px-6 lg:px-6 xl:px-8"
        >
          <span className="sr-only">Loading…</span>
          <div className="bg-sunken h-8 w-64 animate-pulse rounded-lg" />
          <div className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card h-28 animate-pulse" />
            ))}
          </div>
          <div className="card mt-4 h-72 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
