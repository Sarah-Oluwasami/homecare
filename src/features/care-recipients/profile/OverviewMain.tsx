import type { RecipientProfile } from '../profile-data'
import { Panel } from '@/components/ui/Panel'
import { DetailGrid, DetailRows } from '@/components/ui/DetailList'
import { VisitStatusBadge } from '@/components/ui/StatusBadge'

export function PersonalInformation({ profile }: { profile: RecipientProfile }) {
  const p = profile.personal

  return (
    <Panel title="Personal Information">
      <DetailGrid
        items={[
          { label: 'Phone', value: p.phone },
          { label: 'Email', value: p.email },
          { label: 'Address', value: p.address },
          {
            label: 'Date of Birth',
            value: p.dateOfBirth,
            hint: `(Age ${profile.age})`,
          },
          {
            label: 'Family Member',
            value: (
              <>
                {p.familyMember.name}{' '}
                <span className="text-ink-subtle">
                  ({p.familyMember.relationship})
                </span>{' '}
                — {p.familyMember.phone}
              </>
            ),
          },
          { label: 'Languages', value: p.languages },
        ]}
      />
    </Panel>
  )
}

export function CareSummaryPanel({ profile }: { profile: RecipientProfile }) {
  const s = profile.summary
  const ec = s.emergencyContact

  return (
    <Panel title="Care Summary">
      <DetailRows
        divided
        items={[
          { label: 'Care Level', value: profile.careLevel },
          { label: 'Start Date', value: s.startDate },
          { label: 'Primary Diagnosis', value: s.primaryDiagnosis },
          { label: 'Secondary Diagnosis', value: s.secondaryDiagnosis },
          {
            label: 'Primary Caregiver',
            value: profile.caregiver ?? 'Unassigned',
          },
          { label: 'Coordinator', value: s.coordinator },
          { label: 'Next Scheduled Visit', value: s.nextVisit },
          {
            label: 'Emergency Contact',
            value: `${ec.name} (${ec.relationship}) - ${ec.phone}`,
          },
        ]}
      />
    </Panel>
  )
}

export function RecentVisitsPanel({ profile }: { profile: RecipientProfile }) {
  const visits = profile.recentVisits

  return (
    <Panel
      title="Recent Visits"
      flush
      action={{
        label: 'View All Visits',
        to: `/care-recipients/${profile.id}/visits`,
      }}
    >
      {visits.length === 0 ? (
        <p className="text-ink-subtle px-4 pb-6 text-sm">
          No visits recorded yet.
        </p>
      ) : (
        <>
          {/* Table above sm; the same rows read as a stacked list below it.
              Focusable so the scroll region is reachable by keyboard — there
              are no focusable cells to tab into. */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Recent visits"
            // Padded, so the header band and the row rules stop where the
            // card's content stops rather than running edge to edge.
            className="hidden overflow-x-auto px-4 sm:block"
          >
            <table className="w-full min-w-xl text-left text-sm">
              {/* No rule above the band — the fill is already the edge. */}
              <thead className="border-line bg-sunken text-ink-muted border-b text-xs">
                <tr>
                  {['Date', 'Caregiver', 'Type', 'Duration', 'Status'].map(
                    (col) => (
                      <th
                        key={col}
                        scope="col"
                        className="py-2.5 pr-4 font-semibold tracking-wide uppercase"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {visits.map((v) => (
                  <tr key={v.id}>
                    {/* Who came and when is what the row is scanned for; the
                        type and the length of the visit are its detail. */}
                    <th
                      scope="row"
                      className="text-ink py-3 pr-4 font-normal whitespace-nowrap"
                    >
                      {v.date}
                    </th>
                    <td className="text-ink py-3 pr-4">{v.caregiver}</td>
                    <td className="text-ink-muted py-3 pr-4">{v.type}</td>
                    <td className="text-ink-muted py-3 pr-4 whitespace-nowrap">
                      {v.duration}
                    </td>
                    <td className="py-3">
                      <VisitStatusBadge status={v.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-line border-line divide-y border-t sm:hidden">
            {visits.map((v) => (
              <li key={v.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-ink min-w-0 text-sm font-medium break-words">
                    {v.date}
                  </p>
                  <VisitStatusBadge status={v.status} />
                </div>
                <p className="text-ink-muted mt-1 text-sm">
                  {v.caregiver} · {v.type} · {v.duration}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}

export function CareNotesPanel({ profile }: { profile: RecipientProfile }) {
  const notes = profile.notes

  return (
    <Panel
      title="Latest Care Notes"
      action={{
        label: 'View All Notes',
        to: `/care-recipients/${profile.id}/notes`,
      }}
    >
      {notes.length === 0 ? (
        <p className="text-ink-subtle text-sm">No care notes recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="bg-canvas rounded-lg p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h3 className="text-ink min-w-0 text-sm font-semibold break-words">
                  {n.author}, {n.role}
                </h3>
                <span className="text-ink-subtle shrink-0 text-xs">{n.at}</span>
              </div>
              <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
