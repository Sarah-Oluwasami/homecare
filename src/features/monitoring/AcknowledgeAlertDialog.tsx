import { useId, useState } from 'react'
import { Lock } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { SeverityBadge } from '@/components/ui/StatusBadge'
import { getCaregiverRecord } from '@/features/care-recipients/caregivers-data'
import { contextFor } from '@/features/scheduling/visit-detail'
import { SIGNED_IN, SIGNED_IN_ROLE } from '@/lib/session'
import { alertKindLabels, formatTime } from './live-data'
import type { LiveAlert } from './live-data'
import { acknowledge } from './alert-actions'

interface AcknowledgeAlertDialogProps {
  alert: LiveAlert
  /** The day the alert is being read on. */
  date: string
  /** The clock the screen is running at, 24-hour. Signed onto the record. */
  now: string
  onClose: () => void
}

/**
 * Picking an alert up.
 *
 * The one place in the monitoring screens that writes rather than derives, so
 * it is careful about what it claims. It does not offer Resolve: an alert stops
 * being raised when the fact behind it stops being true, and a button saying
 * otherwise would let somebody clear a row while the client was still without a
 * caregiver. Acknowledging says "I have seen this and I am on it", which is a
 * fact about a person and cannot be worked out from the clock — which is
 * exactly why it has to be stored.
 *
 * Mounted only while it is open, so the note field starts empty every time.
 * The alternative — keeping it mounted and clearing the field in an effect —
 * carries one alert's half-typed note into the next one on any render the
 * effect misses, which is how a coordinator signs the wrong thing.
 */
export function AcknowledgeAlertDialog({
  alert,
  date,
  now,
  onClose,
}: AcknowledgeAlertDialogProps) {
  const [note, setNote] = useState('')
  const noteId = useId()

  const context = contextFor(alert.thread)
  const recipient = context?.recipient.name ?? alert.subject
  const caregiver = context
    ? (context.caregiver?.name ?? 'Nobody assigned')
    : (alert.counterpart ?? 'Not tied to one caregiver')

  /*
   * The coordinator named on the client's own care team, where the alert is
   * about a client at all. The signed-in user otherwise — a blank field would
   * be honest but useless, and naming somebody arbitrary would be worse than
   * both.
   */
  const teamCoordinator = context
    ? getCaregiverRecord(context.recipient.id)?.team.find((m) =>
        m.role.includes('Coordinator'),
      )?.name
    : undefined
  const coordinator = teamCoordinator ?? SIGNED_IN

  const submit = () => {
    acknowledge({
      thread: alert.thread,
      date,
      at: now,
      by: SIGNED_IN,
      byRole: SIGNED_IN_ROLE,
      coordinator,
      note: note.trim(),
    })
    onClose()
  }

  return (
    <Drawer
      open
      onClose={onClose}
      placement="center"
      title="Acknowledge alert"
      subtitle={alertKindLabels[alert.kind]}
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="border-line bg-sunken rounded-lg border p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-ink text-sm font-semibold">
              {alertKindLabels[alert.kind]}
            </p>
            <SeverityBadge severity={alert.severity} />
          </div>
          <p className="text-ink-muted mt-1 text-sm break-words">
            {alert.detail}
          </p>
          {/* No reference number. Nothing issues one — an alert is a fact about
              the board at a minute, not a ticket — so the row says which record
              it was read off instead, which is the thing you would go and
              check. */}
          <p className="text-ink-subtle mt-1.5 text-xs break-words">
            Read off {alert.source}
            {alert.elapsed && ` · ${alert.elapsed}`}
          </p>
        </div>

        <dl className="divide-line divide-y text-sm">
          <Row label="Care recipient" value={recipient} />
          <Row label="Assigned caregiver" value={caregiver} />
        </dl>

        <div>
          <p className="text-ink text-sm font-medium">Coordinator</p>
          <div className="border-line bg-sunken mt-1.5 flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
            <span className="text-ink text-sm">{coordinator}</span>
            <Lock
              className="text-ink-subtle size-4 shrink-0"
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>
          <p className="text-ink-subtle mt-1 text-xs">
            {teamCoordinator
              ? "Read from this client's care team. Reassigning is a rota change, not something this dialog can do."
              : 'This alert is not about one client, so it falls to whoever is signed in.'}
          </p>
        </div>

        <div>
          <label htmlFor={noteId} className="text-ink text-sm font-medium">
            Notes <span className="text-ink-subtle font-normal">(optional)</span>
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What you are doing about it"
            className="border-line focus:border-brand-500 mt-1.5 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <p className="text-ink-subtle text-xs">
          Signed as {SIGNED_IN} ({SIGNED_IN_ROLE.toLowerCase()}) at{' '}
          {formatTime(now)}. Held for this session only — this app has no server
          to send it to, so a reload clears it and nobody at another desk sees
          it.
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border-control text-ink hover:bg-sunken inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white"
          >
            Acknowledge alert
          </button>
        </div>
      </div>
    </Drawer>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink font-medium">{value}</dd>
    </div>
  )
}
