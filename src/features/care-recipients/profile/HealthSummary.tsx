import type { HealthSummaryCard } from '../health-data'

export function HealthSummary({ cards }: { cards: HealthSummaryCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map(({ id, label, value, detail }) => (
        <article key={id} className="card p-4">
          <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
            {label}
          </p>
          <p className="text-ink mt-2 text-lg font-bold tracking-tight break-words">
            {value}
          </p>
          <p className="text-ink-muted mt-1 text-sm break-words">{detail}</p>
        </article>
      ))}
    </div>
  )
}
