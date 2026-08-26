import { Check, X } from 'lucide-react'
import type { CommunicationEntry, FamilyMember } from '../family-data'
import {
  LOG_WINDOW_DAYS,
  accessLabels,
  accessSections,
  accessTones,
  communicationTones,
  formatContactDate,
  memberName,
} from '../family-data'
import { Panel } from '@/components/ui/Panel'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

export function CommunicationLog({
  entries,
  members,
}: {
  entries: CommunicationEntry[]
  members: FamilyMember[]
}) {
  return (
    <Panel
      title="Recent Communication Log"
      badge={
        <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
          Last {LOG_WINDOW_DAYS} days
        </span>
      }
      flush
    >
      {entries.length === 0 ? (
        <p className="text-ink-subtle px-4 pb-6 text-sm">
          No family contact recorded in this window.
        </p>
      ) : (
        <>
          <div
            tabIndex={0}
            role="region"
            aria-label="Communication log table"
            className="hidden overflow-x-auto lg:block"
          >
            <table className="w-full min-w-3xl text-left text-sm">
              <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
                <tr>
                  {['Date', 'Family Member', 'Type', 'Subject', 'Staff Member'].map(
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
                {entries.map((e) => (
                  <tr key={e.id}>
                    <th
                      scope="row"
                      className="text-ink-muted px-4 py-3 font-normal whitespace-nowrap"
                    >
                      <time dateTime={e.at}>{formatContactDate(e.at)}</time>
                    </th>
                    <td className="text-ink px-4 py-3 font-medium whitespace-nowrap">
                      {memberName(members, e.memberId)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                          tonePill[communicationTones[e.type]],
                        )}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td className="text-ink-muted px-4 py-3">{e.subject}</td>
                    <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                      {e.staff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-line border-line divide-y border-t lg:hidden">
            {entries.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-semibold break-words">
                      {memberName(members, e.memberId)}
                    </p>
                    <p className="text-ink-subtle mt-0.5 text-xs">
                      <time dateTime={e.at}>{formatContactDate(e.at)}</time> ·{' '}
                      {e.staff}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      tonePill[communicationTones[e.type]],
                    )}
                  >
                    {e.type}
                  </span>
                </div>
                <p className="text-ink-muted mt-1.5 text-sm break-words">
                  {e.subject}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}

export function PermissionsMatrix({ members }: { members: FamilyMember[] }) {
  return (
    <Panel title="Care Portal Permissions Matrix" flush>
      <p className="text-ink-muted px-4 pb-3 text-sm">
        Digital access permissions for HIPAA-compliant clinical care logs.
      </p>

      <div
        tabIndex={0}
        role="region"
        aria-label="Portal permissions table"
        className="hidden overflow-x-auto lg:block"
      >
        <table className="w-full min-w-3xl text-left text-sm">
          <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
            <tr>
              {['Family Member', 'Access Level', 'Authorised Sections'].map(
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
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-semibold tracking-wide uppercase"
              >
                Portal login
              </th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {members.map((m) => (
              <tr key={m.id}>
                <th
                  scope="row"
                  className="text-ink px-4 py-3 font-medium whitespace-nowrap"
                >
                  {m.name}
                </th>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                      tonePill[accessTones[m.access]],
                    )}
                  >
                    {accessLabels[m.access]}
                  </span>
                </td>
                {/* Derived from the access level, so the matrix can't grant
                    something the card doesn't. */}
                <td className="text-ink-muted px-4 py-3">
                  {accessSections[m.access]}
                </td>
                <td className="px-4 py-3 text-right">
                  <PortalChip enabled={m.portalEnabled} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-line border-line divide-y border-t lg:hidden">
        {members.map((m) => (
          <li key={m.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-ink min-w-0 text-sm font-semibold break-words">
                {m.name}
              </p>
              <PortalChip enabled={m.portalEnabled} />
            </div>
            <div className="mt-1.5">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  tonePill[accessTones[m.access]],
                )}
              >
                {accessLabels[m.access]}
              </span>
            </div>
            <p className="text-ink-muted mt-2 text-sm break-words">
              {accessSections[m.access]}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function PortalChip({ enabled }: { enabled: boolean }) {
  const Icon = enabled ? Check : X
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
      )}
    >
      <Icon className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  )
}
