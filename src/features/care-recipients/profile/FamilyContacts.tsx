import { Mail, MapPin, MessageSquare, MoreVertical, Phone } from 'lucide-react'
import type { CommunicationEntry, FamilyMember } from '../family-data'
import {
  accessLabels,
  accessTones,
  formatContactDate,
  lastContact,
} from '../family-data'
import { Avatar } from '@/components/ui/Avatar'
import { tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

function ContactCard({
  member,
  log,
}: {
  member: FamilyMember
  log: CommunicationEntry[]
}) {
  const latest = lastContact(log, member.id)
  const primary = member.roles.includes('Primary Contact')

  return (
    <li
      className={cn(
        'card flex flex-col p-4',
        primary && 'ring-brand-500 ring-2',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={member.name} decorative className="size-11" />
          <div className="min-w-0">
            <h3 className="text-ink truncate text-base font-semibold">
              {member.name}
            </h3>
            <p className="text-ink-subtle mt-0.5 flex flex-wrap items-center gap-2 text-sm">
              {member.relationship}
              {primary && (
                <span className="bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                  Primary Contact
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={`More actions for ${member.name}`}
          className="text-ink-subtle hover:bg-sunken hover:text-ink grid size-9 shrink-0 place-items-center rounded-lg"
        >
          <MoreVertical className="size-4.5" />
        </button>
      </div>

      <ul className="text-ink-muted mt-4 space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <Phone className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">Phone: </span>
          {member.phone}
        </li>
        <li className="flex items-center gap-2">
          <Mail className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">Email: </span>
          <span className="min-w-0 break-all">{member.email}</span>
        </li>
        {member.location && (
          <li className="flex items-center gap-2">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">Location: </span>
            <span className="min-w-0 break-words">{member.location}</span>
          </li>
        )}
      </ul>

      {/* Grid on the dl itself — a wrapper div inside a dl must contain the
          dt/dd pair directly, so it can't be used purely for layout. */}
      <dl className="border-line mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4">
        <div className="col-span-2">
          <dt className="text-ink-subtle text-[0.65rem] font-semibold tracking-wider uppercase">
            Designated roles
          </dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {member.roles.map((r) => (
              <span
                key={r}
                className="bg-brand-50 text-brand-700 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              >
                {r}
              </span>
            ))}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="text-ink-subtle text-[0.65rem] font-semibold tracking-wider uppercase">
            Access level
          </dt>
          <dd className="mt-1">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                tonePill[accessTones[member.access]],
              )}
            >
              {accessLabels[member.access]}
            </span>
          </dd>
        </div>

        <div className="min-w-0 text-right">
          <dt className="text-ink-subtle text-[0.65rem] font-semibold tracking-wider uppercase">
            Preferred contact
          </dt>
          <dd className="text-ink mt-1 text-sm break-words">
            {member.preferred}
          </dd>
        </div>

        <div className="col-span-2">
          <dt className="text-ink-subtle text-[0.65rem] font-semibold tracking-wider uppercase">
            Last contact
          </dt>
          {/* Read from the communication log, not stated per card — the two
              disagreed in the original design. */}
          <dd className="text-ink mt-1 text-sm break-words">
            {latest ? (
              <>
                <time dateTime={latest.at}>
                  {formatContactDate(latest.at)}
                </time>{' '}
                — {latest.type.toLowerCase()}
              </>
            ) : (
              'No contact recorded'
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="border-control text-ink hover:bg-sunken inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors"
        >
          <MessageSquare className="size-4" strokeWidth={1.9} aria-hidden="true" />
          Message<span className="sr-only"> {member.name}</span>
        </button>
        <button
          type="button"
          className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Phone className="size-4" strokeWidth={1.9} aria-hidden="true" />
          Call<span className="sr-only"> {member.name}</span>
        </button>
      </div>
    </li>
  )
}

export function FamilyContacts({
  members,
  log,
}: {
  members: FamilyMember[]
  log: CommunicationEntry[]
}) {
  return (
    <section aria-labelledby="registered-contacts">
      <h2
        id="registered-contacts"
        className="text-ink text-base font-semibold tracking-tight"
      >
        Registered Family Contacts
      </h2>
      <p className="text-ink-muted mt-1 mb-3 text-sm">
        Individuals authorised to receive updates, participate in scheduling and
        manage care operations.
      </p>

      <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {members.map((m) => (
          <ContactCard key={m.id} member={m} log={log} />
        ))}
      </ul>
    </section>
  )
}
