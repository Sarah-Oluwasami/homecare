import { FileText, MoreVertical } from 'lucide-react'
import type { CareDocument, DocumentStatus } from '../documents-data'
import {
  documentStatusLabels,
  effectiveStatus,
  formatSize,
  formatUploadDate,
} from '../documents-data'
import { cn } from '@/lib/cn'

const statusChip: Record<DocumentStatus, string> = {
  current: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  verified: 'bg-blue-50 text-blue-700',
  expiring: 'bg-red-50 text-red-700',
  expired: 'bg-red-100 text-red-800',
}

function StatusChip({ doc }: { doc: CareDocument }) {
  const status = effectiveStatus(doc)
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
          statusChip[status],
        )}
      >
        {documentStatusLabels[status]}
      </span>
      {/* An expiry chip is meaningless without the date behind it */}
      {doc.expiresAt && (status === 'expiring' || status === 'expired') && (
        <span className="text-ink-subtle text-[0.65rem] whitespace-nowrap">
          {status === 'expired' ? 'Expired' : 'Expires'}{' '}
          {formatUploadDate(doc.expiresAt)}
        </span>
      )}
    </span>
  )
}

function RowActions({ doc }: { doc: CareDocument }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="text-brand-700 hover:text-brand-800 text-sm font-medium"
      >
        View<span className="sr-only"> {doc.name}</span>
      </button>
      <button
        type="button"
        className="text-brand-700 hover:text-brand-800 text-sm font-medium"
      >
        Download<span className="sr-only"> {doc.name}</span>
      </button>
      <button
        type="button"
        aria-label={`More actions for ${doc.name}`}
        className="text-ink-subtle hover:bg-sunken hover:text-ink grid size-9 shrink-0 place-items-center rounded-lg"
      >
        <MoreVertical className="size-4.5" />
      </button>
    </div>
  )
}

const columns = [
  'Document Name',
  'Category',
  'Date Uploaded',
  'Uploaded By',
  'Status',
  'Size',
]

export function DocumentTable({ rows }: { rows: CareDocument[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-ink-subtle px-4 py-16 text-center text-sm">
        No documents match these filters.
      </p>
    )
  }

  return (
    <>
      {/* Seven columns need ~896px; below xl the same rows read as cards */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Documents table"
        className="hidden overflow-x-auto xl:block"
      >
        <table className="w-full min-w-4xl text-left text-sm">
          <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-4 py-3 font-semibold tracking-wide uppercase"
                >
                  {col}
                </th>
              ))}
              <th
                scope="col"
                className="px-4 py-3 text-right font-semibold tracking-wide uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-line divide-y">
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-canvas transition-colors">
                <th scope="row" className="px-4 py-3 font-normal">
                  <span className="flex items-center gap-2.5">
                    <span className="bg-brand-50 text-brand-600 grid size-8 shrink-0 place-items-center rounded-lg">
                      <FileText
                        className="size-4"
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-ink font-medium break-all">
                      {d.name}
                    </span>
                  </span>
                </th>
                <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                  {d.category}
                </td>
                <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                  {formatUploadDate(d.uploadedAt)}
                </td>
                <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                  {d.uploadedBy}
                </td>
                <td className="px-4 py-3">
                  <StatusChip doc={d} />
                </td>
                <td className="text-ink-muted px-4 py-3 whitespace-nowrap tabular-nums">
                  {formatSize(d.sizeKb)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <RowActions doc={d} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-line border-line divide-y border-t xl:hidden">
        {rows.map((d) => (
          <li key={d.id} className="p-4">
            <div className="flex items-start gap-2.5">
              <span className="bg-brand-50 text-brand-600 grid size-8 shrink-0 place-items-center rounded-lg">
                <FileText
                  className="size-4"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm font-medium break-all">
                  {d.name}
                </p>
                <p className="text-ink-subtle mt-0.5 text-xs">
                  {d.category} · {formatSize(d.sizeKb)}
                </p>
              </div>
              <StatusChip doc={d} />
            </div>

            <p className="text-ink-muted mt-2 text-sm break-words">
              {formatUploadDate(d.uploadedAt)} · {d.uploadedBy}
            </p>

            <div className="mt-2">
              <RowActions doc={d} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
