import { Link } from 'react-router-dom'
import { Check, MessageSquare, TriangleAlert } from 'lucide-react'
import type { FamilyAccount } from './directory-data'
import {
  accountStatus,
  billingLabels,
  billingState,
  billingTones,
  formatActivity,
  hasInvoiceLedger,
  isEmergencyContact,
  linkedPlans,
  outstanding,
  relationshipLabel,
  statusLabels,
  statusTones,
  unreadCount,
} from './directory-data'
import { accessLabels, accessTones } from '@/features/care-recipients/family-data'
import { formatMoney } from '@/features/billing/data'
import { Avatar } from '@/components/ui/Avatar'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

const chip =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
      <dt className="text-ink-muted min-w-0 text-sm">{label}</dt>
      <dd className="text-ink min-w-0 text-right text-sm font-medium break-words">
        {children}
      </dd>
    </div>
  )
}

export function FamilyPreview({ account }: { account: FamilyAccount }) {
  const unread = unreadCount(account)
  const status = accountStatus(account)
  const billing = billingState(account)
  const owed = outstanding(account)
  const plans = linkedPlans(account)

  return (
    <div className="p-4">
      <div className="text-center">
        <Avatar name={account.name} decorative className="mx-auto size-16 text-lg" />
        <h3 className="text-ink mt-3 text-lg font-bold tracking-tight break-words">
          {account.name}
        </h3>
        <p className="text-ink-muted mt-0.5 text-sm break-words">
          {relationshipLabel(account)}
        </p>
        <p className="text-ink-subtle mt-0.5 text-xs">{account.ref}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <span className={cn(chip, tonePill[statusTones[status]])}>
            {statusLabels[status]}
          </span>
          <span className={cn(chip, tonePill[accessTones[account.access]])}>
            {accessLabels[account.access]}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 min-w-32 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white"
        >
          <MessageSquare className="size-4" strokeWidth={1.9} aria-hidden="true" />
          Send message
          <span className="sr-only"> to {account.name}</span>
        </button>
        {/* The "full profile" is the recipient's Family tab — this account has
            no page of its own, and inventing one would have been a dead link. */}
        <Link
          to={`/care-recipients/${account.links[0].recipientId}/family`}
          className="border-line text-ink hover:bg-sunken inline-flex h-10 min-w-32 flex-1 items-center justify-center rounded-lg border px-4 text-sm font-medium"
        >
          View full profile
          <span className="sr-only"> for {account.name}</span>
        </Link>
      </div>

      <section aria-labelledby="account-details" className="mt-5">
        <h4
          id="account-details"
          className="text-ink-subtle text-xs font-semibold tracking-wider uppercase"
        >
          Account details
        </h4>
        <dl className="divide-line mt-1 divide-y">
          <Row label="Phone">{account.phone}</Row>
          <Row label="Email">
            <span className="break-all">{account.email}</span>
          </Row>
          <Row label="Preferred channel">{account.preferred}</Row>
          <Row label="Emergency contact">
            {isEmergencyContact(account) ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                Yes
              </span>
            ) : (
              <span className="text-ink-subtle">No</span>
            )}
          </Row>
          <Row label="Unanswered messages">
            {unread > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                <TriangleAlert className="size-3" strokeWidth={2.4} aria-hidden="true" />
                {unread}
              </span>
            ) : (
              <span className="text-ink-subtle">None</span>
            )}
          </Row>
          <Row label="Billing">
            <span className={cn(chip, tonePill[billingTones[billing]])}>
              {billingLabels[billing]}
            </span>
          </Row>
          {/* Only where an invoice ledger exists. Billing state comes from the
              subscription, the balance from the invoices — and printing ₦0.00
              under an "Overdue" chip for a client with no ledger read as a
              contradiction. */}
          {hasInvoiceLedger(account) && (
            <Row label="Outstanding balance">{formatMoney(owed)}</Row>
          )}
          {billing === 'overdue' && !hasInvoiceLedger(account) && (
            <Row label="Outstanding balance">
              <span className="text-ink-subtle">Last charge failed, not invoiced</span>
            </Row>
          )}
          <Row label="Last activity">{formatActivity(account)}</Row>
        </dl>
      </section>

      <section aria-labelledby="linked-recipients" className="mt-5">
        <h4
          id="linked-recipients"
          className="text-ink-subtle text-xs font-semibold tracking-wider uppercase"
        >
          Linked care recipients ({account.links.length})
        </h4>
        <ul className="mt-2 space-y-2">
          {account.links.map((link) => (
            <li key={link.recipientId} className="border-line rounded-lg border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <Link
                  to={`/care-recipients/${link.recipientId}`}
                  className="text-brand-700 hover:text-brand-800 min-w-0 text-sm font-semibold break-words"
                >
                  {link.name}
                </Link>
                <span className="text-ink-subtle shrink-0 text-xs capitalize">
                  {link.status}
                </span>
              </div>
              <p className="text-ink-muted mt-0.5 text-xs break-words">
                {link.relationship} · {link.roles.join(', ')}
              </p>
            </li>
          ))}
        </ul>
        {plans.length > 0 && (
          <p className="text-ink-subtle mt-2 text-xs break-words">
            On {plans.join(', ')}.
          </p>
        )}
      </section>

      {account.log.length > 0 && (
        <section aria-labelledby="recent-contact" className="mt-5">
          <h4
            id="recent-contact"
            className="text-ink-subtle text-xs font-semibold tracking-wider uppercase"
          >
            Recent contact
          </h4>
          <ol className="mt-2 space-y-2">
            {account.log.slice(0, 4).map((entry) => (
              <li key={`${entry.recipientId}-${entry.id}`} className="text-xs">
                <p className="text-ink font-medium break-words">{entry.subject}</p>
                <p className="text-ink-subtle mt-0.5 break-words">
                  {entry.type} ·{' '}
                  {entry.direction === 'inbound' ? 'from the family' : 'from us'} ·{' '}
                  {entry.staff}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
