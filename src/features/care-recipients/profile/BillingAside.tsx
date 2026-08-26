import { Check } from 'lucide-react'
import type { BillingRecord, Payment } from '../billing-data'
import { formatMoney, formatShortDate, servicesTotal } from '../billing-data'
import { Panel } from '@/components/ui/Panel'
import { Donut } from '@/components/ui/Donut'
import { toneText } from '@/lib/tone'

export function ServiceBreakdown({ record }: { record: BillingRecord }) {
  const total = servicesTotal(record.services)

  return (
    <Panel title="Service Breakdown (YTD)">
      <Donut
        segments={record.services.map((s) => ({
          id: s.id,
          label: s.label,
          value: s.amount,
          colourClass: toneText[s.tone],
        }))}
        centreLabel="Total"
        centreValue={formatMoney(total)}
        caption="Year-to-date billing by service line"
        columns={['Service', 'Amount', 'Share']}
        formatValue={formatMoney}
      />
    </Panel>
  )
}

export function PaymentHistory({
  history,
  method,
}: {
  history: Payment[]
  method: BillingRecord['method']
}) {
  if (history.length === 0) {
    return (
      <Panel title="Payment History">
        <p className="text-ink-subtle text-sm">No payments recorded yet.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Payment History">
      <ol className="space-y-4">
        {history.map((p) => (
          <li key={p.id} className="flex gap-3">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-ink text-sm font-semibold tabular-nums">
                  {formatMoney(p.amount)} received
                </p>
                <p className="text-ink-subtle shrink-0 text-xs">
                  {formatShortDate(p.paidAt)}
                </p>
              </div>
              <p className="text-ink-subtle mt-0.5 text-xs break-words">
                {method.brand} •••• {method.last4}
                {method.autoPay && ' (Auto-pay)'} · {p.invoiceNumber}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
