import type { BillingRecord } from '../billing-data'
import { RATE_PER_VISIT, formatMoney } from '../billing-data'
import { Panel } from '@/components/ui/Panel'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-subtle text-[0.65rem] font-semibold tracking-wider uppercase">
        {label}
      </dt>
      <dd className="text-ink mt-1 text-sm break-words">{children}</dd>
    </div>
  )
}

export function BillingInfo({ record }: { record: BillingRecord }) {
  const { contact, method, insurance } = record
  const patientRate = Math.round((1 - insurance.coverageRate) * 100)

  return (
    <Panel title="Billing & Insurance Information">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
        <Field label="Billing Contact">
          <span className="font-semibold">{contact.name}</span>{' '}
          <span className="text-ink-subtle">({contact.relationship})</span>
          <span className="text-ink-muted mt-1 block">
            {contact.email} • {contact.phone}
          </span>
        </Field>

        <Field label="Primary Insurance">
          <span className="font-semibold">{insurance.provider}</span>
          <span className="text-ink-subtle">
            {' '}
            — Policy #{insurance.policyNumber}
          </span>
          <span className="text-ink-muted mt-1 block">
            Coverage:{' '}
            <span className="font-semibold text-emerald-700">
              {Math.round(insurance.coverageRate * 100)}%
            </span>{' '}
            of home care services.
          </span>
        </Field>

        <Field label="Payment Method">
          <span className="flex flex-wrap items-center gap-2">
            <span className="border-line text-ink-muted rounded border px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide">
              {method.brand}
            </span>
            <span>Ending in {method.last4}</span>
            {method.autoPay && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-emerald-500"
                />
                Auto-pay enabled
              </span>
            )}
          </span>
        </Field>

        <Field label="Guarantor Share & Secondary Insurance">
          {/* Derived from the coverage rate so it can't disagree with the
              per-invoice split in the table below. */}
          {patientRate}% coinsurance — about{' '}
          {formatMoney(Math.round(RATE_PER_VISIT * (1 - insurance.coverageRate)))}{' '}
          per visit.
          <span className="text-ink-subtle mt-1 block">
            Secondary insurance: {insurance.secondary ?? 'None registered.'}
          </span>
        </Field>
      </dl>
    </Panel>
  )
}
