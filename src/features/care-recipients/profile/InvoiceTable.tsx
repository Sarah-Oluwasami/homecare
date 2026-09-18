import type { Invoice, InvoiceStatus } from '../billing-data'
import {
  formatMoney,
  formatPeriod,
  insuranceCovered,
  invoiceAmount,
  invoiceStatus,
  patientDue,
} from '../billing-data'
import { cn } from '@/lib/cn'

const statusChip: Record<InvoiceStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  overdue: 'bg-red-50 text-red-700',
}

const statusLabel: Record<InvoiceStatus, string> = {
  paid: 'Paid',
  pending: 'Pending',
  overdue: 'Overdue',
}

function StatusChip({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        statusChip[status],
      )}
    >
      {statusLabel[status]}
    </span>
  )
}

const columns = [
  'Invoice #',
  'Period',
  'Services',
  'Amount',
  'Insurance Covered',
  'Patient Due',
  'Status',
]

export function InvoiceTable({
  rows,
  rate,
}: {
  rows: Invoice[]
  rate: number
}) {
  if (rows.length === 0) {
    return (
      <p className="text-ink-subtle px-4 py-16 text-center text-sm">
        No invoices raised yet.
      </p>
    )
  }

  return (
    <>
      {/* Eight columns need ~1024px; below xl the same rows read as cards */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Invoices table"
        className="hidden overflow-x-auto xl:block"
      >
        <table className="w-full min-w-5xl text-left text-sm">
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
            {rows.map((inv) => (
              <tr key={inv.id} className="hover:bg-canvas transition-colors">
                <th scope="row" className="px-4 py-3 font-normal">
                  <button
                    type="button"
                    className="text-brand-700 hover:text-brand-800 font-medium whitespace-nowrap"
                  >
                    {inv.number}
                  </button>
                </th>
                <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                  {formatPeriod(inv)}
                </td>
                <td className="text-ink-muted px-4 py-3">
                  {inv.services}{' '}
                  <span className="text-ink-subtle whitespace-nowrap">
                    ({inv.visits} visits)
                  </span>
                </td>
                <td className="text-ink px-4 py-3 font-medium whitespace-nowrap tabular-nums">
                  {formatMoney(invoiceAmount(inv))}
                </td>
                <td className="text-ink-muted px-4 py-3 whitespace-nowrap tabular-nums">
                  {formatMoney(insuranceCovered(inv, rate))}
                </td>
                <td className="text-ink px-4 py-3 font-medium whitespace-nowrap tabular-nums">
                  {formatMoney(patientDue(inv, rate))}
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={invoiceStatus(inv)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="border-control text-ink hover:bg-sunken h-9 rounded-lg border px-3 text-sm font-medium"
                  >
                    View<span className="sr-only"> {inv.number}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-line border-line divide-y border-t xl:hidden">
        {rows.map((inv) => (
          <li key={inv.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <button
                  type="button"
                  className="text-brand-700 hover:text-brand-800 text-sm font-semibold"
                >
                  {inv.number}
                </button>
                <p className="text-ink-subtle mt-0.5 text-xs">
                  {formatPeriod(inv)} · {inv.visits} visits
                </p>
              </div>
              <StatusChip status={invoiceStatus(inv)} />
            </div>

            <p className="text-ink-muted mt-2 text-sm break-words">
              {inv.services}
            </p>

            <dl className="text-ink-muted mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm min-[420px]:grid-cols-3">
              <div className="flex gap-1.5">
                <dt className="text-ink-subtle shrink-0">Amount:</dt>
                <dd className="text-ink font-medium tabular-nums">
                  {formatMoney(invoiceAmount(inv))}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-subtle shrink-0">Insurance:</dt>
                <dd className="tabular-nums">
                  {formatMoney(insuranceCovered(inv, rate))}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-subtle shrink-0">Due:</dt>
                <dd className="text-ink font-medium tabular-nums">
                  {formatMoney(patientDue(inv, rate))}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
