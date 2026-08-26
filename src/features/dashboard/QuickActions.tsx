import { quickActions } from './data'
import { SectionHeading } from '@/components/ui/SectionHeading'

export function QuickActions() {
  return (
    <section aria-labelledby="quick-actions">
      <SectionHeading id="quick-actions" title="Quick Actions" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
        {quickActions.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="card hover:border-brand-300 hover:bg-brand-50/40 group flex flex-col gap-3 p-4 text-left transition-colors"
          >
            <span className="bg-sunken text-ink-muted group-hover:bg-brand-100 group-hover:text-brand-600 grid size-9 place-items-center rounded-lg transition-colors">
              <Icon className="size-4.5" strokeWidth={1.9} />
            </span>
            <span className="text-ink text-sm leading-snug font-semibold">
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
