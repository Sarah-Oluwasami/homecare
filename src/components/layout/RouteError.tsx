import { Link, useRouteError } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'

/**
 * Rendered inside the shell, not instead of it. A thrown render error used to
 * produce the same "Page not found" screen as a missing URL, with the
 * navigation stripped away — which told the user the wrong thing and left them
 * nowhere to go but the browser's back button.
 *
 * Unmatched URLs are not routed here: `path: '*'` handles those with
 * `NotFoundPage`, so this only ever sees a genuine failure.
 */
export function RouteError() {
  const error = useRouteError()

  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div className="max-w-md">
        <span className="text-ink-subtle grid size-11 place-items-center rounded-full bg-amber-50 text-amber-700">
          <TriangleAlert className="size-5" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <h1 className="text-ink mt-4 text-xl font-semibold tracking-tight">
          Something went wrong on this screen
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          The rest of the app is still working — pick another section from the
          navigation, or try this one again.
        </p>
        {import.meta.env.DEV && error instanceof Error && (
          <pre className="bg-sunken text-ink-muted mt-4 overflow-x-auto rounded-lg p-3 text-left text-xs">
            {error.message}
          </pre>
        )}
        <Link
          to="/dashboard"
          className="bg-brand-600 hover:bg-brand-700 mt-5 inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
