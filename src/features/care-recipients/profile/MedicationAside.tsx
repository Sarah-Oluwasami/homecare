import { Check, TriangleAlert } from 'lucide-react'
import type {
  AuditEntry,
  ClinicalWarning,
  DoseState,
  DoseWindow,
} from '../medications-data'
import { Panel } from '@/components/ui/Panel'
import { cn } from '@/lib/cn'

const noteTone: Record<DoseState, string> = {
  administered: 'text-emerald-700',
  scheduled: 'text-blue-600',
  missed: 'text-red-600',
}

/*
 * Every state gets the same tinted disc, so the three markers line up as one
 * column rather than a badge followed by two loose dots. The dot inside a
 * pending dose is the colour of its own status line underneath.
 */
function DoseMarker({ state }: { state: DoseState }) {
  if (state === 'administered') {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-full',
        state === 'missed' ? 'bg-red-50' : 'bg-blue-50',
      )}
    >
      <span
        className={cn(
          'size-2 rounded-full',
          state === 'missed' ? 'bg-red-500' : 'bg-blue-600',
        )}
      />
    </span>
  )
}

export function DoseSchedule({
  date,
  doses,
}: {
  date: string
  doses: DoseWindow[]
}) {
  return (
    <Panel
      title="Today's Schedule"
      badge={
        <span className="text-brand-700 shrink-0 text-xs font-medium">
          {date}
        </span>
      }
    >
      <ol>
        {doses.map((dose) => (
          <li key={dose.id} className="group flex gap-3">
            {/* Marker and the thread below it are one column, so the line runs
                between doses and stops at the last one. */}
            <span
              aria-hidden="true"
              className="flex shrink-0 flex-col items-center"
            >
              <DoseMarker state={dose.state} />
              <span className="bg-line w-px flex-1 group-last:hidden" />
            </span>

            <div className="min-w-0 pb-5 group-last:pb-0">
              <h3 className="text-ink text-sm font-semibold break-words">
                {dose.time} — {dose.title}
              </h3>
              <p className="text-ink-muted mt-0.5 text-sm break-words">
                {dose.medications}
              </p>
              <p
                className={cn(
                  'mt-1 text-sm font-medium break-words',
                  noteTone[dose.state],
                )}
              >
                {dose.note}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

export function ClinicalWarnings({
  warnings,
}: {
  warnings: ClinicalWarning[]
}) {
  return (
    <section
      aria-labelledby="clinical-warnings"
      className="rounded-card border border-amber-300 bg-amber-50/40 p-4"
    >
      <h2
        id="clinical-warnings"
        className="flex items-center gap-2 text-sm font-semibold text-amber-800"
      >
        <TriangleAlert className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
        Clinical Warning Profile
      </h2>

      <div className="mt-3 space-y-3">
        {warnings.map((w) => (
          <div key={w.id}>
            <h3 className="text-ink text-sm font-semibold break-words">
              {w.title}
            </h3>
            <p className="text-ink-muted mt-1 text-xs leading-relaxed break-words">
              {w.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function PrescriptionHistory({ audits }: { audits: AuditEntry[] }) {
  return (
    <Panel title="Prescription History & Audits" flush>
      {/* Inset rules between entries, none under the header — the padding sits
          on the list so a rule stops where the text stops. */}
      <ul className="divide-line divide-y px-4">
        {audits.map((a) => (
          <li key={a.id} className="flex gap-3 py-3">
            <span className="text-ink-subtle w-20 shrink-0 truncate text-xs">
              {a.date}
            </span>
            <div className="min-w-0">
              <h3 className="text-ink text-sm font-semibold break-words">
                {a.title}
              </h3>
              <p className="text-ink-muted mt-0.5 text-xs break-words">
                {a.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
