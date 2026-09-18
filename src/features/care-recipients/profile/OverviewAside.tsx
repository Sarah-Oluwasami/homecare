import type { RecipientProfile } from '../profile-data'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { toneText } from '@/lib/tone'
import { cn } from '@/lib/cn'

export function QuickStatsPanel({ profile }: { profile: RecipientProfile }) {
  return (
    <Panel title="Quick Stats (This Month)">
      {/*
        * No rules between the rows. Five label/value pairs already read as a
        * list from the alignment alone, and a line under each one made the
        * panel look like a table that had lost its headers.
        */}
      <dl className="text-sm">
        {profile.quickStats.map(({ label, value, tone }) => (
          <div
            key={label}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 first:pt-0 last:pb-0"
          >
            <dt className="text-ink-muted shrink-0">{label}</dt>
            <dd
              className={cn(
                'min-w-0 text-right font-medium',
                tone ? toneText[tone] : 'text-ink',
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}

export function MedicationsPanel({ profile }: { profile: RecipientProfile }) {
  const meds = profile.medications

  return (
    <Panel
      title="Medications"
      badge={
        meds.length > 0 ? (
          <span className="text-brand-700 shrink-0 text-xs font-semibold">
            {meds.length} Active
          </span>
        ) : undefined
      }
      flush
      action={
        meds.length > 0
          ? {
              label: 'View All Medications',
              to: `/care-recipients/${profile.id}/medications`,
            }
          : undefined
      }
    >
      {meds.length === 0 ? (
        <p className="text-ink-subtle px-4 pb-4 text-sm">
          No active medications recorded.
        </p>
      ) : (
        /*
         * Inset rules, and none under the header. The padding sits on the list
         * rather than on each row, so the lines stop where the text stops —
         * full-bleed rules cut the card into bands and made a four-item list
         * look like a table.
         */
        <ul className="divide-line divide-y px-4">
          {meds.map((m) => (
            <li key={m.id} className="py-2.5">
              <p className="text-ink text-sm font-semibold">{m.name}</p>
              <p className="text-ink-subtle mt-0.5 text-xs">{m.schedule}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function CareTeamPanel({ profile }: { profile: RecipientProfile }) {
  return (
    <Panel
      title="Assigned Care Team"
      action={{
        label: 'Manage Care Team',
        to: `/care-recipients/${profile.id}/caregivers`,
      }}
    >
      <ul className="space-y-3">
        {profile.team.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <Avatar name={m.name} decorative className="size-8" />
            <div className="min-w-0">
              <p className="text-ink truncate text-sm font-semibold">
                {m.name}
              </p>
              <p className="text-ink-subtle truncate text-xs">{m.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function UpcomingVisitsPanel({ profile }: { profile: RecipientProfile }) {
  const upcoming = profile.upcoming

  return (
    <Panel
      title="Upcoming Visits"
      action={{
        label: 'View Full Schedule',
        to: `/care-recipients/${profile.id}/visits`,
      }}
    >
      {upcoming.length === 0 ? (
        <p className="text-ink-subtle text-sm">No upcoming visits scheduled.</p>
      ) : (
        <ul>
          {upcoming.map((v) => (
            <li key={v.id} className="group flex gap-3">
              {/* Dot and the line beneath it are one column, so the thread
                  runs between entries and stops at the last one. */}
              <span
                aria-hidden="true"
                className="flex shrink-0 flex-col items-center"
              >
                <span className="bg-brand-600 mt-1.5 size-2 rounded-full" />
                <span className="bg-line w-px flex-1 group-last:hidden" />
              </span>
              <div className="min-w-0 pb-4 group-last:pb-0">
                <p className="text-ink text-sm font-semibold">{v.when}</p>
                <p className="text-ink mt-0.5 text-sm break-words">{v.title}</p>
                <p className="text-ink-subtle mt-0.5 text-xs">{v.caregiver}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
