import type { Revision } from '../care-plan-data'
import { Panel } from '@/components/ui/Panel'

export function RevisionHistory({ revisions }: { revisions: Revision[] }) {
  return (
    <Panel title="Revision History" flush>
      <ul className="divide-line border-line divide-y border-t">
        {revisions.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3"
          >
            <span className="text-ink-subtle w-24 shrink-0 truncate text-xs">
              {r.date}
            </span>
            {/* min-w-48 gives the row a wrap threshold — with flex-basis 0 the
                summary would otherwise shrink to ~60px and break mid-word */}
            <span className="text-ink-muted min-w-48 flex-1 text-sm break-words">
              {r.summary}
            </span>
            <span className="text-brand-700 shrink-0 text-sm">{r.author}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
