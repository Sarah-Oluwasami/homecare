import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-ink text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-ink-muted mt-1 text-sm">{description}</p>
      </header>

      <div className="card grid place-items-center px-6 py-20 text-center">
        <span className="bg-sunken text-ink-subtle grid size-11 place-items-center rounded-full">
          <Construction className="size-5" strokeWidth={1.8} />
        </span>
        <p className="text-ink mt-3 text-sm font-semibold">Not built yet</p>
        <p className="text-ink-muted mt-1 max-w-sm text-sm">
          This section is scaffolded and routable — the dashboard is the first
          screen built out.
        </p>
      </div>
    </>
  )
}
