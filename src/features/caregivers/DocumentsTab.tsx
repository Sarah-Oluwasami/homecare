import {
  Check,
  FileText,
  Plus,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import type { ComplianceState, StaffMember } from './staff'
import {
  RENEWAL_WINDOW_DAYS,
  complianceLabels,
  complianceTones,
  credentialStates,
} from './roster-data'
import {
  documentSummary,
  documentsFor,
  formatDate,
  formatMonth,
  renewalFor,
  trainingFor,
  trainingHours,
  trainingState,
} from './documents-data'
import type { StaffDocument, TrainingRecord } from './documents-data'
import { Panel } from '@/components/ui/Panel'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

const chip =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap'

/**
 * Per-credential wording only. The *overall* state uses `complianceLabels`,
 * the same map the roster column and the Overview card render — a local copy
 * had this panel saying "Valid" where they said "Fully compliant".
 */
const stateLabel: Record<ComplianceState, string> = {
  compliant: 'Valid',
  expiring: 'Renewal due',
  expired: 'Expired',
}

const stateTone: Record<ComplianceState, string> = {
  compliant: tonePill.green,
  expiring: tonePill.amber,
  expired: tonePill.red,
}

export function DocumentsTab({ member }: { member: StaffMember }) {
  const summary = documentSummary(member)
  const states = credentialStates(member)
  const documents = documentsFor(member)
  const training = trainingFor(member)
  const hours = trainingHours(member)

  return (
    <div className="space-y-4">
      <h2 className="sr-only">Documents and compliance</h2>

      {/* Status strip. Every figure is counted from the lists below, and the
          "next expiry" is the next one still to come — the source design
          counted down 85 days to a date four months in the past. */}
      <section className="card grid grid-cols-1 divide-y divide-[var(--color-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex items-start gap-3 p-4">
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full',
              summary.compliance === 'compliant'
                ? 'bg-emerald-50 text-emerald-700'
                : summary.compliance === 'expiring'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700',
            )}
          >
            {summary.compliance === 'compliant' ? (
              <ShieldCheck className="size-4.5" strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <TriangleAlert className="size-4.5" strokeWidth={1.9} aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
              Overall status
            </p>
            <p
              className={cn(
                'mt-1 text-lg font-bold tracking-tight break-words',
                summary.compliance === 'compliant'
                  ? 'text-emerald-700'
                  : summary.compliance === 'expiring'
                    ? 'text-amber-700'
                    : 'text-red-700',
              )}
            >
              {complianceLabels[summary.compliance]}
            </p>
            {summary.expired.length > 0 && (
              <p className="mt-0.5 text-xs break-words text-red-700">
                {summary.expired.map((c) => c.name).join(', ')} lapsed
              </p>
            )}
          </div>
        </div>

        <div className="p-4">
          <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
            Next expiry
          </p>
          {summary.nextExpiry ? (
            <>
              <p className="text-ink mt-1 text-sm font-semibold break-words">
                {summary.nextExpiry.credential.name}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-xs break-words',
                  summary.nextExpiry.days <= RENEWAL_WINDOW_DAYS
                    ? 'font-medium text-amber-700'
                    : 'text-ink-subtle',
                )}
              >
                {formatDate(summary.nextExpiry.credential.expiresAt!)} —{' '}
                {summary.nextExpiry.days} days remaining
                {summary.nextExpiry.days <= RENEWAL_WINDOW_DAYS &&
                  `, inside the ${RENEWAL_WINDOW_DAYS}-day renewal window`}
              </p>
            </>
          ) : (
            <p className="text-ink-subtle mt-1 text-sm">
              Nothing else on record carries an expiry date.
            </p>
          )}
        </div>

        <div className="p-4">
          <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
            On file
          </p>
          <p className="text-ink mt-1 text-lg font-bold tracking-tight tabular-nums">
            {summary.count} document{summary.count === 1 ? '' : 's'}
          </p>
          <p className="text-ink-subtle mt-0.5 text-xs">
            {summary.lastUpdated
              ? `Last upload ${formatDate(summary.lastUpdated)}`
              : 'Nothing uploaded yet'}
          </p>
        </div>
      </section>

      <Panel
        title="Certifications and licences"
        badge={
          <span
            className={cn(chip, tonePill[complianceTones[summary.compliance]], 'shrink-0')}
          >
            {summary.expired.length > 0
              ? `${summary.expired.length} expired`
              : complianceLabels[summary.compliance]}
          </span>
        }
        flush
      >
        <div
          tabIndex={0}
          role="region"
          aria-label="Certifications and licences table"
          className="hidden overflow-x-auto xl:block"
        >
          <table className="w-full min-w-3xl text-left text-sm">
            <thead className="border-line bg-sunken text-ink-muted border-y text-xs">
              <tr>
                {['Credential', 'Reference', 'Issued or cleared', 'Expires', 'Status', 'File'].map(
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
              {states.map(({ credential, state, daysRemaining }) => {
                const renewal = renewalFor(member, credential.id)
                const file = documents.find((d) => d.credentialId === credential.id)
                return (
                  <tr key={credential.id} className="hover:bg-canvas transition-colors">
                    <th
                      scope="row"
                      className="text-ink px-4 py-3 font-medium whitespace-nowrap"
                    >
                      {credential.name}
                      {renewal && (
                        <span className="text-ink-subtle block text-xs">
                          {renewal.name}: {renewal.hours} of{' '}
                          {renewal.requiredHours} hours
                        </span>
                      )}
                    </th>
                    <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                      {credential.reference ?? '—'}
                    </td>
                    <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                      {credential.issuedAt
                        ? formatMonth(credential.issuedAt)
                        : credential.clearedAt
                          ? formatMonth(credential.clearedAt)
                          : '—'}
                    </td>
                    <td className="text-ink-muted px-4 py-3 whitespace-nowrap">
                      {credential.expiresAt ? formatMonth(credential.expiresAt) : 'No expiry'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(chip, stateTone[state])}>
                        {credential.expiresAt ? stateLabel[state] : 'Cleared'}
                      </span>
                      {credential.expiresAt && daysRemaining !== null && (
                        <span
                          className={cn(
                            'block text-xs',
                            state === 'expired'
                              ? 'font-medium text-red-700'
                              : 'text-ink-subtle',
                          )}
                        >
                          {daysRemaining < 0
                            ? `${Math.abs(daysRemaining)} days ago`
                            : `in ${daysRemaining} days`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {file ? <FileLink file={file} /> : <NoFile />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <ul className="divide-line border-line divide-y border-t xl:hidden">
          {states.map(({ credential, state, daysRemaining }) => {
            const renewal = renewalFor(member, credential.id)
            const file = documents.find((d) => d.credentialId === credential.id)
            return (
              <li key={credential.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-ink min-w-0 text-sm font-semibold break-words">
                    {credential.name}
                  </p>
                  <span className={cn(chip, stateTone[state])}>
                    {credential.expiresAt ? stateLabel[state] : 'Cleared'}
                  </span>
                </div>
                <p className="text-ink-muted mt-1 text-sm break-words">
                  {credential.reference ?? 'No reference'} ·{' '}
                  {credential.expiresAt
                    ? `expires ${formatMonth(credential.expiresAt)}`
                    : 'no expiry'}
                  {daysRemaining !== null &&
                    ` · ${
                      daysRemaining < 0
                        ? `${Math.abs(daysRemaining)} days ago`
                        : `in ${daysRemaining} days`
                    }`}
                </p>
                {/* The renewal line and the file were table-only, so below
                    1280px a lapsed credential's explanation and its evidence
                    were both unreachable. */}
                {renewal && (
                  <p className="text-ink-subtle mt-0.5 text-xs break-words">
                    {renewal.name}: {renewal.hours} of {renewal.requiredHours}{' '}
                    hours
                  </p>
                )}
                <div className="mt-1">
                  {file ? <FileLink file={file} /> : <NoFile />}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="border-line border-t p-4">
          <button
            type="button"
            className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
          >
            <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
            Add credential
            <span className="sr-only"> for {member.name}</span>
          </button>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Employment documents" flush>
          <ul className="divide-line border-line divide-y border-t">
            {documents
              .filter((d) => d.category === 'employment')
              .map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-medium break-words">
                      {doc.name}
                    </p>
                    <p className="text-ink-subtle mt-0.5 text-xs break-words">
                      {doc.kind} · filed {formatMonth(doc.uploadedAt)} by{' '}
                      {doc.uploadedBy}
                    </p>
                  </div>
                  <FileLink file={doc} />
                </li>
              ))}
          </ul>
        </Panel>

        <Panel
          title="Training"
          badge={
            <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
              {hours.completed}h completed
            </span>
          }
          flush
        >
          {training.length === 0 ? (
            <p className="text-ink-subtle border-line border-t px-4 py-8 text-center text-sm">
              No training recorded.
            </p>
          ) : (
            <ul className="divide-line border-line divide-y border-t">
              {training.map((record) => (
                <TrainingRow key={record.id} record={record} />
              ))}
            </ul>
          )}
          {training.length > 0 && (
            <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
              {summary.trainingComplete} complete, {summary.trainingInProgress}{' '}
              outstanding. {hours.inProgress}h logged against courses still
              running.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="Upload history"
        badge={
          <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
            {documents.length}
          </span>
        }
        flush
      >
        {/* A view of the same list, not a second one — the source design's
            history said a card was renewed in the month the table showed it
            expiring. */}
        <ol className="divide-line border-line divide-y border-t">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
              <p className="text-ink-muted w-full text-sm sm:w-32 sm:shrink-0">
                {formatDate(doc.uploadedAt)}
              </p>
              <div className="min-w-0 flex-1 basis-40">
                <p className="text-ink text-sm font-medium break-words">
                  {doc.name}
                </p>
                <p className="text-ink-subtle mt-0.5 text-xs break-all">
                  {doc.fileName}
                </p>
              </div>
              <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
                {doc.uploadedBy}
              </span>
              {/* The only complete list of files, so it is the only place a
                  training certificate can be opened. */}
              <FileLink file={doc} />
            </li>
          ))}
        </ol>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white"
        >
          <Upload className="size-4" strokeWidth={1.9} aria-hidden="true" />
          Upload document
          <span className="sr-only"> for {member.name}</span>
        </button>
        <button
          type="button"
          className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
        >
          <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
          Record training
          <span className="sr-only"> for {member.name}</span>
        </button>
      </div>
    </div>
  )
}

/* ---------------------------------- parts --------------------------------- */

function FileLink({ file }: { file: StaffDocument }) {
  return (
    <button
      type="button"
      className="text-brand-700 hover:text-brand-800 inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium"
    >
      <FileText className="size-3.5" strokeWidth={1.9} aria-hidden="true" />
      View
      <span className="sr-only"> {file.fileName}</span>
    </button>
  )
}

function NoFile() {
  return <span className="text-ink-subtle text-sm">No file</span>
}

function TrainingRow({ record }: { record: TrainingRecord }) {
  const state = trainingState(record)
  const done = state === 'complete'
  const percent =
    record.requiredHours > 0
      ? Math.round((record.hours / record.requiredHours) * 100)
      : 0

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-ink min-w-0 text-sm font-medium break-words">
          {record.name}
        </p>
        <span
          className={cn(
            chip,
            state === 'complete'
              ? tonePill.green
              : state === 'in-progress'
                ? tonePill.amber
                : tonePill.slate,
            'inline-flex items-center gap-1',
          )}
        >
          {done && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
          {state === 'complete'
            ? 'Complete'
            : state === 'in-progress'
              ? 'In progress'
              : 'Not started'}
        </span>
      </div>

      <p className="text-ink-muted mt-1 text-sm">
        {done
          ? `${record.hours} hours · completed ${formatMonth(record.completedAt!)}`
          : `${record.hours} of ${record.requiredHours} hours`}
      </p>

      {!done && (
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${record.name} progress`}
          className="bg-sunken mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
        >
          <div
            className="bg-brand-600 h-full rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </li>
  )
}
