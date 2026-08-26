import { useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Download, Plus, Upload } from 'lucide-react'
import {
  ACCOUNTS_PAGE_SIZE,
  accountStatus,
  billingLabels,
  billingState,
  billingTones,
  familyAccounts,
  formatActivity,
  getFamilyAccount,
  directorySummary,
  relationshipLabel,
  sortAccounts,
  sortOptions,
  statusLabels,
  statusTones,
  unreadCount,
} from '@/features/families/directory-data'
import type {
  AccountSort,
  AccountStatus,
  FamilyAccount,
} from '@/features/families/directory-data'
import { FamilyPreview } from '@/features/families/FamilyPreview'
import { Panel } from '@/components/ui/Panel'
import { Pagination } from '@/components/ui/Pagination'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { Drawer } from '@/components/ui/Drawer'
import { Avatar } from '@/components/ui/Avatar'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

const chip =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap'

const tabs: (AccountStatus | 'all')[] = ['all', 'active', 'inactive', 'pending']

const tabLabels: Record<AccountStatus | 'all', string> = {
  all: 'All',
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending verification',
}

function isStatus(value: string | null): AccountStatus | 'all' {
  return value === 'active' || value === 'inactive' || value === 'pending'
    ? value
    : 'all'
}

export function FamiliesPage() {
  const { accountId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const query = params.get('q') ?? ''
  const status = isStatus(params.get('status'))
  const sort = (sortOptions.find((o) => o.value === params.get('sort'))?.value ??
    'name') as AccountSort
  const page = Math.max(1, Math.floor(Number(params.get('page') ?? '1')) || 1)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    // Only keystrokes replace. A tab or a sort is a decision, so Back undoes it.
    setParams(next, { replace: key === 'q' })
  }

  /*
   * Split from the status filter so the tabs can count what the search left,
   * rather than advertising 14 above a table showing 1.
   */
  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return familyAccounts
    // Guarded: `''.includes('')` is true, so an alphabetic query used to match
    // every row through the phone clause.
    const digits = needle.replace(/\D/g, '')
    return familyAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.ref.toLowerCase().includes(needle) ||
        a.email.toLowerCase().includes(needle) ||
        (digits.length > 0 && a.phone.replace(/\D/g, '').includes(digits)) ||
        a.links.some((l) => l.name.toLowerCase().includes(needle)),
    )
  }, [query])

  // Counted from what the search left, so the tabs and the table agree.
  const counts = useMemo(() => {
    const tally: Record<AccountStatus, number> = {
      active: 0,
      inactive: 0,
      pending: 0,
    }
    for (const account of searched) tally[accountStatus(account)] += 1
    return tally
  }, [searched])
  const summary = useMemo(() => directorySummary(), [])

  const filtered = useMemo(
    () =>
      sortAccounts(
        searched.filter((a) => status === 'all' || accountStatus(a) === status),
        sort,
      ),
    [searched, status, sort],
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / ACCOUNTS_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * ACCOUNTS_PAGE_SIZE
  const rows = filtered.slice(start, start + ACCOUNTS_PAGE_SIZE)

  const search = new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(sort !== 'name' ? { sort } : {}),
    ...(safePage > 1 ? { page: String(safePage) } : {}),
  }).toString()
  const suffix = search ? `?${search}` : ''

  const selected = getFamilyAccount(accountId)
  const closeDrawer = () => navigate(`/families${suffix}`, { replace: true })

  // An id that resolves to nothing left the URL stale and the drawer shut.
  if (accountId && !selected) return <Navigate to={`/families${suffix}`} replace />

  // The open contact can sit outside the filters or on another page; saying so
  // beats a highlighted row the reader cannot find.
  const selectionHidden = Boolean(selected) && !rows.some((a) => a.id === accountId)

  /*
   * Two different populations, which the source design stacked as "187 total
   * families" above "203 primary contacts" — impossible if a family designates
   * one. Contacts is the row count; families is the households behind them.
   */
  const tiles: { id: string; label: string; value: number; hint: string }[] = [
    {
      id: 'contacts',
      label: 'Family contacts',
      value: summary.accounts,
      hint: `Covering ${summary.recipientsCovered} care recipients`,
    },
    {
      id: 'primary',
      label: 'Primary contacts',
      value: summary.primaryContacts,
      hint: 'One designated per household',
    },
    {
      id: 'care',
      label: 'With active care',
      value: summary.withActiveCare,
      hint: summary.accounts
        ? `${Math.round((summary.withActiveCare / summary.accounts) * 100)}% of contacts`
        : 'No contacts yet',
    },
    {
      id: 'unread',
      label: 'Unanswered messages',
      value: summary.unreadMessages,
      hint: 'Inbound with no reply after',
    },
    {
      id: 'billing',
      label: 'Billing overdue',
      value: summary.outstandingPayments,
      hint: 'Of the contacts who are billed',
    },
    {
      id: 'pending',
      label: 'Pending verification',
      value: summary.pendingVerification,
      hint: 'Invited, portal not yet used',
    },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">Families</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Family accounts, communication, portal permissions and the care
            recipients each contact is attached to.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Import', icon: Upload },
            { label: 'Export', icon: Download },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
            >
              <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
              {label}
            </button>
          ))}
          <button
            type="button"
            className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white"
          >
            <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
            Add contact
          </button>
        </div>
      </header>

      <section aria-labelledby="family-kpis">
        <h2 id="family-kpis" className="sr-only">
          Directory totals
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {tiles.map((t) => (
            <article key={t.id} className="card p-4">
              <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
                {t.label}
              </p>
              <p className="text-ink mt-2 text-2xl font-bold tracking-tight tabular-nums">
                {t.value}
              </p>
              <p className="text-ink-subtle mt-1 text-xs break-words">{t.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <Panel title="Family contacts" flush>
        <div
          role="group"
          aria-label="Filter contacts by status"
          className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-3"
        >
          {tabs.map((value) => {
            const active = status === value
            const count =
              value === 'all' ? familyAccounts.length : counts[value]
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setParam('status', value === 'all' ? null : value)}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-muted hover:bg-sunken',
                )}
              >
                {tabLabels[value]}
                <span className={active ? 'text-white' : 'text-ink-subtle'}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {selectionHidden && selected && (
          <p className="border-brand-200 bg-brand-50 text-brand-800 mx-4 mb-3 rounded-lg border px-3 py-2 text-xs">
            {selected.name} is open in the preview but hidden by the current
            filters.{' '}
            <Link to={`/families/${selected.id}`} className="font-semibold underline">
              Clear the filters
            </Link>{' '}
            to see the row.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search contacts</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Search name, reference, email, phone or recipient"
              className="border-line focus:border-brand-500 h-10 w-full min-w-40 rounded-lg border px-3 text-sm"
            />
          </label>
          <SelectFilter
            label="Sort"
            value={sort}
            onChange={(v) => setParam('sort', v === 'name' ? null : v)}
            options={sortOptions}
          />
        </div>

        {rows.length === 0 ? (
          <p
            role="status"
            className="text-ink-subtle border-line border-t px-4 py-10 text-center text-sm"
          >
            No contacts match these filters.
          </p>
        ) : (
          <>
            <div
              tabIndex={0}
              role="region"
              aria-label="Family contacts table"
              className="hidden overflow-x-auto xl:block"
            >
              <table className="w-full min-w-4xl text-left text-sm">
                <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
                  <tr>
                    {['Contact', 'Relationship', 'Linked recipients', 'Phone', 'Messages', 'Billing', 'Last activity'].map(
                      (col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-4 py-2.5 font-semibold tracking-wide uppercase"
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {rows.map((account) => (
                    <ContactRow
                      key={account.id}
                      account={account}
                      selected={account.id === accountId}
                      to={`/families/${account.id}${suffix}`}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-line border-line divide-y border-t xl:hidden">
              {rows.map((account) => (
                <ContactCard
                  key={account.id}
                  account={account}
                  selected={account.id === accountId}
                  to={`/families/${account.id}${suffix}`}
                />
              ))}
            </ul>

            <Pagination
              page={safePage}
              pageCount={pageCount}
              onPageChange={(next) =>
                setParam('page', next === 1 ? null : String(next))
              }
              summary={`Showing ${start + 1}–${start + rows.length} of ${filtered.length} contacts`}
            />
          </>
        )}
      </Panel>

      <p className="text-ink-subtle text-xs">
        One row per person, not per household — a contact acting for two
        recipients appears once, with both links. The per-recipient view lives
        on each{' '}
        <Link to="/care-recipients" className="text-brand-700">
          care record&rsquo;s Family tab
        </Link>
        .
      </p>

      <Drawer
        open={Boolean(selected)}
        onClose={closeDrawer}
        title="Quick preview"
        subtitle={selected?.name}
      >
        {selected && <FamilyPreview account={selected} />}
      </Drawer>
    </div>
  )
}

/* ---------------------------------- rows ---------------------------------- */

function LinkedRecipients({ account }: { account: FamilyAccount }) {
  const [first, ...rest] = account.links
  return (
    <>
      <span className="text-ink-muted">{first.name}</span>
      {rest.length > 0 && (
        <span className="text-ink-subtle block text-xs">
          and {rest.map((l) => l.name).join(', ')}
        </span>
      )}
    </>
  )
}

function MessageCell({ account }: { account: FamilyAccount }) {
  const unread = unreadCount(account)
  if (unread > 0)
    return (
      <span className="text-xs font-semibold text-amber-800">
        {unread} unanswered
      </span>
    )
  const inbound = account.log.some((e) => e.direction === 'inbound')
  return (
    <span className="text-ink-subtle text-xs">
      {account.log.length === 0
        ? 'No activity'
        : inbound
          ? 'All answered'
          : 'Outbound only'}
    </span>
  )
}

function ContactRow({
  account,
  selected,
  to,
}: {
  account: FamilyAccount
  selected: boolean
  to: string
}) {
  const status = accountStatus(account)
  const billing = billingState(account)

  return (
    <tr
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'transition-colors',
        selected
          ? 'bg-brand-50 [&>*:first-child]:border-brand-500 [&>*:first-child]:border-l-4'
          : 'hover:bg-canvas',
      )}
    >
      <th scope="row" className="px-4 py-3 font-normal whitespace-nowrap">
        <span className="flex items-center gap-2.5">
          <Avatar name={account.name} decorative className="size-8 shrink-0 text-xs" />
          <span className="min-w-0">
            <Link to={to} className="text-ink hover:text-brand-700 font-medium">
              {account.name}
            </Link>
            <span className="text-ink-subtle block text-xs">
              {account.ref} · {statusLabels[status]}
            </span>
          </span>
        </span>
      </th>
      <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
        {relationshipLabel(account)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <LinkedRecipients account={account} />
      </td>
      <td className="text-ink-muted px-4 py-3 whitespace-nowrap">{account.phone}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <MessageCell account={account} />
      </td>
      <td className="px-4 py-3">
        <span className={cn(chip, tonePill[billingTones[billing]])}>
          {billingLabels[billing]}
        </span>
      </td>
      <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
        {formatActivity(account)}
      </td>
    </tr>
  )
}

function ContactCard({
  account,
  selected,
  to,
}: {
  account: FamilyAccount
  selected: boolean
  to: string
}) {
  const status = accountStatus(account)
  const billing = billingState(account)

  return (
    <li
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'p-4',
        selected && 'border-brand-500 bg-brand-50 border-l-4 pl-3',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={account.name} decorative className="size-9 shrink-0 text-xs" />
          <span className="min-w-0">
            <Link
              to={to}
              className="text-ink hover:text-brand-700 text-sm font-semibold break-words"
            >
              {account.name}
            </Link>
            <span className="text-ink-subtle block text-xs break-words">
              {account.ref} · {relationshipLabel(account)}
            </span>
          </span>
        </span>
        <span className={cn(chip, tonePill[statusTones[status]])}>
          {statusLabels[status]}
        </span>
      </div>
      <p className="text-ink-muted mt-2 text-sm break-words">
        {account.links.map((l) => l.name).join(', ')} · {account.phone}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <MessageCell account={account} />
        <span className={cn(chip, tonePill[billingTones[billing]])}>
          {billingLabels[billing]}
        </span>
        <span className="text-ink-subtle">{formatActivity(account)}</span>
      </p>
    </li>
  )
}
