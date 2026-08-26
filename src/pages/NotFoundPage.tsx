import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link
          to="/dashboard"
          className="mt-5 inline-flex h-9 items-center rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
