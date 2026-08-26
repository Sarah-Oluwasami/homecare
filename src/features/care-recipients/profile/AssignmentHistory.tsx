import type { AssignmentEntry, HistoryAction } from '../caregivers-data'
import { cn } from '@/lib/cn'

const actionChip: Record<HistoryAction, string> = {
  assigned: 'bg-emerald-50 text-emerald-700',
  removed: 'bg-red-50 text-red-700',
}

function ActionBadge({ action }: { action: HistoryAction }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        actionChip[action],
      )}
    >
      {action}
    </span>
  )
}

export function AssignmentHistory({
  history,
}: {
  history: AssignmentEntry[]
}) {
  return (
    <section aria-labelledby="assignment-history">
      <h2
        id="assignment-history"
        className="text-ink mb-3 text-base font-semibold tracking-tight"
      >
        Assignment History
      </h2>

      <div className="card overflow-hidden">
        <div
          tabIndex={0}
          role="region"
          aria-label="Assignment history table"
          className="hidden overflow-x-auto md:block"
        >
          {/* 2xl (672px) fits the ~718px content box at 1024 */}
          <table className="w-full min-w-2xl text-left text-sm">
            <thead className="border-line bg-sunken text-ink-muted border-b text-xs">
              <tr>
                {['Date', 'Action', 'Caregiver', 'Reason', 'By'].map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className="px-4 py-3 font-semibold tracking-wide uppercase"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-line divide-y">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-canvas transition-colors">
                  <th
                    scope="row"
                    className="text-ink-muted px-4 py-3 font-normal whitespace-nowrap"
                  >
                    {h.date}
                  </th>
                  <td className="px-4 py-3">
                    <ActionBadge action={h.action} />
                  </td>
                  <td className="text-ink px-4 py-3 font-medium">
                    {h.caregiver}
                  </td>
                  <td className="text-ink-muted px-4 py-3">{h.reason}</td>
                  <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                    {h.by}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-line divide-y md:hidden">
          {history.map((h) => (
            <li key={h.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold break-words">
                    {h.caregiver}
                  </p>
                  <p className="text-ink-subtle mt-0.5 text-xs">{h.date}</p>
                </div>
                <ActionBadge action={h.action} />
              </div>
              <p className="text-ink-muted mt-2 text-sm break-words">
                {h.reason}
              </p>
              <p className="text-ink-subtle mt-1 text-xs">By {h.by}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
