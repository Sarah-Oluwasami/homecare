import {
  FileText,
  Plus,
  Shield,
  TriangleAlert,
} from 'lucide-react'
import type { ComplianceState, StaffMember } from './staff'
import {
  RENEWAL_WINDOW_DAYS,
  complianceLabels,
  credentialStates,
} from './roster-data'
import {
  documentSummary,
  documentsFor,
  formatDate,
  formatMonth,
  trainingFor,
  trainingState,
} from './documents-data'
import type { StaffDocument } from './documents-data'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

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
  compliant: 'bg-brand-50 text-brand-700',
  expiring: tonePill.amber,
  expired: tonePill.red,
}

const expiryMonth = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function DocumentsTab({ member }: { member: StaffMember }) {
  const summary = documentSummary(member)
  const states = credentialStates(member)
  const documents = documentsFor(member)
  const training = trainingFor(member)

  return (
    <div className="space-y-4">
      <h2 className="sr-only">Documents and compliance</h2>

      {/* Status strip. Every figure is counted from the lists below, and the
          "next expiry" is the next one still to come — the source design
          counted down 85 days to a date four months in the past. */}
      <section
        aria-label="Compliance summary"
        className="card grid grid-cols-1 gap-y-4 px-5 py-5 sm:grid-cols-3 sm:gap-y-0"
      >
        <div className="flex items-center gap-4 sm:pr-6">
          <span
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-xl',
              summary.compliance === 'compliant'
                ? 'bg-brand-50 text-brand-600'
                : summary.compliance === 'expiring'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700',
            )}
          >
            {summary.compliance === 'compliant' ? (
              <Shield className="size-5" strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <TriangleAlert className="size-5" strokeWidth={1.9} aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-ink-subtle text-xs font-medium tracking-wide uppercase">
              Overall Status
            </p>
            <p
              className={cn(
                'mt-0.5 text-lg font-bold tracking-tight break-words',
                summary.compliance === 'compliant'
                  ? 'text-brand-700'
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

        <div className="border-line/70 min-w-0 sm:border-l sm:px-7">
          <p className="text-ink-subtle text-xs font-medium tracking-wide uppercase">
            Next Impending Expiry
          </p>
          {summary.nextExpiry ? (
            <>
              <p className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-ink text-base font-semibold break-words">
                  {summary.nextExpiry.credential.name}
                </span>
                <span className="rounded-md bg-[#fcf3cc] px-2 py-0.5 text-xs font-medium whitespace-nowrap text-[#8a4a1c]">
                  Expires {expiryMonth.format(new Date(`${summary.nextExpiry.credential.expiresAt!}T00:00:00Z`))}
                </span>
              </p>
              <p className="text-ink-subtle/70 mt-1 text-xs break-words">
                {summary.nextExpiry.days} day{summary.nextExpiry.days === 1 ? '' : 's'} remaining
                {summary.nextExpiry.days <= RENEWAL_WINDOW_DAYS
                  ? ' — schedule review shortly.'
                  : '.'}
              </p>
            </>
          ) : (
            <p className="text-ink-subtle mt-1 text-sm">
              Nothing else on record carries an expiry date.
            </p>
          )}
        </div>

        <div className="border-line/70 min-w-0 sm:border-l sm:pl-7">
          <p className="text-ink-subtle text-xs font-medium tracking-wide uppercase">
            Stats Summary
          </p>
          <p className="text-ink mt-1 text-lg font-bold tracking-tight">
            {summary.count} Document{summary.count === 1 ? '' : 's'} on File
          </p>
          <p className="text-ink-subtle mt-0.5 text-xs">
            {summary.lastUpdated
              ? `Last updated ${formatDate(summary.lastUpdated)}`
              : 'Nothing uploaded yet'}
          </p>
        </div>
      </section>

      <DocCard title="Certifications & Licenses" add="Add Certification" member={member}>
        <table className="w-full min-w-3xl text-left text-sm">
          <TableHead
            columns={['Certification', 'License #', 'Issued', 'Expires', 'Status', 'Document', 'Actions']}
          />
          <tbody className="divide-line/70 divide-y">
            {states.map(({ credential, state }) => {
              const file = documents.find((d) => d.credentialId === credential.id)
              const issued = credential.issuedAt ?? credential.clearedAt
              return (
                <tr key={credential.id}>
                  <th scope="row" className={cellName}>
                    {credential.name}
                  </th>
                  <td className={cell}>{credential.reference ?? '—'}</td>
                  <td className={cell}>{issued ? formatMonth(issued) : '—'}</td>
                  <td className={cell}>
                    {credential.expiresAt ? formatMonth(credential.expiresAt) : 'No expiry'}
                  </td>
                  <td className={cell}>
                    <StatusTag tone={credential.expiresAt ? stateTone[state] : brandTag}>
                      {credential.expiresAt ? stateLabel[state] : 'Cleared'}
                    </StatusTag>
                  </td>
                  <td className={cell}>
                    {file ? (
                      <button type="button" className={cn(linkBtn, 'inline-flex items-center gap-1.5')}>
                        <FileText className="size-4" strokeWidth={1.9} aria-hidden="true" />
                        View PDF
                        <span className="sr-only"> {file.fileName}</span>
                      </button>
                    ) : (
                      <span className="text-ink-subtle">No file</span>
                    )}
                  </td>
                  <td className={cn(cell, 'text-right')}>
                    <span className="inline-flex items-center gap-4">
                      {/* Only something that lapses can be renewed. */}
                      {credential.expiresAt && (
                        <button type="button" className={linkBtn}>
                          Renew<span className="sr-only"> {credential.name}</span>
                        </button>
                      )}
                      {file && (
                        <button type="button" className={plainBtn}>
                          Download<span className="sr-only"> {file.fileName}</span>
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </DocCard>

      <DocCard title="Employment Documents" add="Add Document" member={member}>
        <table className="w-full min-w-2xl text-left text-sm">
          <TableHead columns={['Document', 'Category', 'Date', 'Status', 'Actions']} />
          <tbody className="divide-line/70 divide-y">
            {documents
              .filter((d) => d.category === 'employment')
              .sort((a, b) => employmentOrder(a) - employmentOrder(b))
              .map((doc) => (
                <tr key={doc.id}>
                  <th scope="row" className={cellName}>
                    {titleCase(doc.name)}
                  </th>
                  <td className={cell}>{doc.kind ?? '—'}</td>
                  <td className={cell}>{formatMonth(doc.uploadedAt)}</td>
                  <td className={cell}>
                    <StatusTag tone={brandTag}>{employmentStatus(doc)}</StatusTag>
                  </td>
                  <td className={cn(cell, 'text-right')}>
                    <FileActions file={doc} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </DocCard>

      <DocCard title="Training Records" add="Record Training" member={member}>
        {training.length === 0 ? (
          <p className="text-ink-muted px-4 py-8 text-center text-sm">No training recorded.</p>
        ) : (
          <table className="w-full min-w-2xl text-left text-sm">
            <TableHead columns={['Training', 'Completed', 'Certificate', 'Hours', 'Actions']} />
            <tbody className="divide-line/70 divide-y">
              {training.map((record) => {
                const state = trainingState(record)
                const done = state === 'complete'
                return (
                  <tr key={record.id}>
                    <th scope="row" className={cellName}>
                      {record.name}
                      {state === 'in-progress' && ' (In Progress)'}
                      {state === 'not-started' && ' (Not Started)'}
                    </th>
                    <td className={cell}>
                      {record.completedAt ? formatMonth(record.completedAt) : '—'}
                    </td>
                    <td className={cell}>{done ? 'Yes' : '—'}</td>
                    <td className={cn(cell, 'tabular-nums')}>
                      {done ? `${record.hours}h` : `${record.hours}/${record.requiredHours}h`}
                    </td>
                    <td className={cn(cell, 'text-right')}>
                      <button type="button" className={linkBtn}>
                        {done ? 'View Certificate' : state === 'in-progress' ? 'Resume' : 'Start'}
                        <span className="sr-only"> {record.name}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </DocCard>

      {/* A view of the same list, not a second one — the source design's
          history said a card was renewed in the month the table showed it
          expiring. */}
      <section aria-labelledby="upload-history" className="card p-5 sm:p-6">
        <h3 id="upload-history" className="text-ink text-base font-semibold tracking-tight">
          Document Upload History
        </h3>
        <ol className="mt-4 space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <p className="text-ink-muted shrink-0 text-sm sm:w-28">{formatDate(doc.uploadedAt)}</p>
              <div className="bg-sunken flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2 rounded-lg px-4 py-3">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold break-words">{historyTitle(doc)}</p>
                  <p className="text-ink-subtle mt-0.5 text-xs break-all">File: {doc.fileName}</p>
                </div>
                <span className="bg-brand-50 text-brand-700 shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium">
                  {doc.category === 'training' ? 'Certificate Uploaded' : `Uploaded by ${doc.uploadedBy}`}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

/* ---------------------------------- parts --------------------------------- */

const cell = 'text-ink-muted px-4 py-3.5 whitespace-nowrap'
const cellName = 'text-ink px-4 py-3.5 font-semibold whitespace-nowrap'
const linkBtn = 'text-brand-700 hover:text-brand-800 text-sm font-medium'
const plainBtn = 'text-ink hover:text-brand-700 text-sm font-medium'
const brandTag = 'bg-brand-50 text-brand-700'

function DocCard({
  title,
  add,
  member,
  children,
}: {
  title: string
  add: string
  member: StaffMember
  children: React.ReactNode
}) {
  const id = `docs-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <section aria-labelledby={id} className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={id} className="text-ink text-base font-semibold tracking-tight">
          {title}
        </h3>
        <button
          type="button"
          className="border-control text-ink hover:bg-sunken inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium"
        >
          <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
          {add}
          <span className="sr-only"> for {member.name}</span>
        </button>
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-label={`${title} table`}
        className="border-line mt-4 overflow-x-auto rounded-lg border"
      >
        {children}
      </div>
    </section>
  )
}

function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead className="border-line bg-sunken text-ink-muted border-b text-xs">
      <tr>
        {columns.map((col) => (
          <th
            key={col}
            scope="col"
            className={cn('px-4 py-2.5 font-medium', col === 'Actions' && 'text-right')}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function StatusTag({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', tone)}>
      {children}
    </span>
  )
}

function FileActions({ file }: { file: StaffDocument }) {
  return (
    <span className="inline-flex items-center gap-4">
      <button type="button" className={linkBtn}>
        View<span className="sr-only"> {file.fileName}</span>
      </button>
      <button type="button" className={plainBtn}>
        Download<span className="sr-only"> {file.fileName}</span>
      </button>
    </span>
  )
}

function titleCase(text: string): string {
  return text.replace(/\b([a-z])/g, (c) => c.toUpperCase())
}

/** The Figma's order: contract, tax form, I-9, payroll, NDA. */
function employmentOrder(doc: StaffDocument): number {
  const n = doc.name.toLowerCase()
  if (n.startsWith('employment contract')) return 0
  if (n.startsWith('w-4')) return 1
  if (n.startsWith('i-9')) return 2
  if (n.startsWith('direct deposit')) return 3
  return 4
}

/** What each kind of paperwork's state is called once it is on file. */
function employmentStatus(doc: StaffDocument): string {
  const n = doc.name.toLowerCase()
  if (n.startsWith('w-4')) return 'Current'
  if (n.startsWith('i-9')) return 'Verified'
  if (n.startsWith('non-disclosure')) return 'Signed'
  return 'Active'
}

function historyTitle(doc: StaffDocument): string {
  if (doc.category === 'employment') return `${titleCase(doc.name)} uploaded`
  if (doc.category === 'training') return `${doc.name} uploaded`
  return /check/i.test(doc.name) ? `${doc.name} results uploaded` : `${doc.name} uploaded`
}
