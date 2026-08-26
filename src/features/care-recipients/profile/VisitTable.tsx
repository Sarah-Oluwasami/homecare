import { MoreHorizontal } from 'lucide-react'
import type { VisitRecord } from '../visits-data'
import { formatDuration, formatVisitDate } from '../visits-data'
import { VisitStatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/cn'

const columns = [
  'Date and Time',
  'Caregiver',
  'Visit Type',
  'Duration',
  'Clock In',
  'Clock Out',
  'Status',
]

export function VisitTable({ rows }: { rows: VisitRecord[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-ink-subtle px-4 py-16 text-center text-sm">
        No visits match these filters.
      </p>
    )
  }

  return (
    <>
      {/* Eight columns need 896px; only at xl (960px content box) does that fit
          without scrolling Status — a filter dimension — off the right edge. */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Visit history table"
        className="hidden overflow-x-auto xl:block"
      >
        <table className="w-full min-w-4xl text-left text-sm">
          <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-3 py-2.5 font-semibold tracking-wide uppercase xl:px-4"
                >
                  {col}
                </th>
              ))}
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-semibold tracking-wide uppercase xl:px-4"
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-line divide-y">
            {rows.map((v) => (
              <tr key={v.id} className="hover:bg-canvas transition-colors">
                <th
                  scope="row"
                  className="text-ink px-3 py-3 font-medium whitespace-nowrap xl:px-4"
                >
                  {formatVisitDate(v)}
                </th>
                <td className="text-ink-muted px-3 py-3 xl:px-4">
                  {v.caregiver}
                </td>
                <td className="text-ink-muted px-3 py-3 xl:px-4">{v.type}</td>
                <td className="text-ink-muted px-3 py-3 whitespace-nowrap xl:px-4">
                  {formatDuration(v.durationHours)}
                </td>
                <td
                  className={cn(
                    'px-3 py-3 whitespace-nowrap xl:px-4',
                    v.clockIn ? 'text-ink-muted' : 'text-ink-subtle',
                  )}
                >
                  {v.clockIn ?? '—'}
                </td>
                <td
                  className={cn(
                    'px-3 py-3 whitespace-nowrap xl:px-4',
                    v.clockOut ? 'text-ink-muted' : 'text-ink-subtle',
                  )}
                >
                  {v.clockOut ?? '—'}
                </td>
                <td className="px-3 py-3 xl:px-4">
                  <VisitStatusBadge status={v.status} />
                </td>
                <td className="px-3 py-3 text-right xl:px-4">
                  <button
                    type="button"
                    aria-label={`Actions for visit on ${formatVisitDate(v)}`}
                    className="text-ink-subtle hover:bg-sunken hover:text-ink grid size-9 place-items-center rounded-lg"
                  >
                    <MoreHorizontal className="size-4.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile and tablet: clock times pair up as a single range line */}
      <ul className="divide-line border-line divide-y border-t xl:hidden">
        {rows.map((v) => (
          <li key={v.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-ink text-sm font-semibold break-words">
                  {formatVisitDate(v)}
                </p>
                <p className="text-ink-muted mt-0.5 text-sm">
                  {v.type} · {formatDuration(v.durationHours)}
                </p>
              </div>
              <VisitStatusBadge status={v.status} />
            </div>

            <dl className="text-ink-muted mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm min-[420px]:grid-cols-2">
              <div className="flex gap-1.5">
                <dt className="text-ink-subtle shrink-0">Caregiver:</dt>
                <dd className="min-w-0 break-words">{v.caregiver}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-subtle shrink-0">Clocked:</dt>
                <dd className={cn(!v.clockIn && 'text-ink-subtle')}>
                  {v.clockIn ? `${v.clockIn} – ${v.clockOut}` : 'No clock-in'}
                </dd>
              </div>
            </dl>

            <p className="text-ink-subtle mt-2 text-sm break-words">{v.notes}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
