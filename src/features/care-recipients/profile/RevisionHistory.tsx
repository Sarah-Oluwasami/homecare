import type { Revision } from '../care-plan-data'
import { Panel } from '@/components/ui/Panel'

export function RevisionHistory({ revisions }: { revisions: Revision[] }) {
  return (
    <Panel title="Revision History">
      {/* Separate tinted blocks rather than a divided list — the same row
          treatment the care instructions use. */}
      <ul className="space-y-2">
        {revisions.map((r) => (
          <li
            key={r.id}
            className="bg-sunken flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg px-4 py-3"
          >
            <span className="text-ink-subtle shrink-0 truncate text-xs">
              {r.date}
            </span>
            <span
              aria-hidden="true"
              className="bg-line hidden h-3.5 w-px shrink-0 self-center sm:block"
            />
            {/* min-w-48 gives the row a wrap threshold — with flex-basis 0 the
                summary would otherwise shrink to ~60px and break mid-word */}
            <span className="text-ink min-w-48 flex-1 text-sm break-words">
              {r.summary}
            </span>
            <span className="text-brand-700 shrink-0 text-sm">{r.author}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
