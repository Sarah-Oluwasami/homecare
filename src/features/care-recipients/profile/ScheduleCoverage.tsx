import type { ShiftRow, SlotOwner } from '../caregivers-data'
import { slotLabels } from '../caregivers-data'
import { cn } from '@/lib/cn'

const slotStyles: Record<SlotOwner, string> = {
  primary: 'bg-brand-700 text-white border-brand-700',
  backup: 'bg-blue-600 text-white border-blue-600',
  nurse: 'bg-emerald-600 text-white border-emerald-600',
  relief: 'bg-violet-600 text-white border-violet-600',
  open: 'border-line border-dashed text-ink-subtle bg-transparent',
}

const legend: SlotOwner[] = ['primary', 'backup', 'nurse', 'relief', 'open']

function Slot({
  owner,
  shift,
  showShiftLabel,
}: {
  owner: SlotOwner
  shift: ShiftRow
  /** The desktop table already names the shift in a row header. */
  showShiftLabel?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-h-14 flex-col justify-center gap-0.5 rounded-lg border px-2 py-2 text-center',
        slotStyles[owner],
      )}
    >
      {showShiftLabel && (
        <span className="text-[0.65rem] font-medium tracking-wide uppercase">
          {shift.label} ({shift.hours})
        </span>
      )}
      <span className="text-xs font-semibold break-words">
        {slotLabels[owner]}
      </span>
    </div>
  )
}

export function ScheduleCoverage({
  shifts,
  weekdays,
}: {
  shifts: ShiftRow[]
  weekdays: string[]
}) {
  if (shifts.length === 0) return null

  return (
    <section aria-labelledby="schedule-coverage">
      <h2
        id="schedule-coverage"
        className="text-ink mb-3 text-base font-semibold tracking-tight"
      >
        Schedule Coverage
      </h2>

      <div className="card p-4">
        {/* A real table at lg+ — as a bare grid of divs, screen readers get
            21 slots with no way to tell which day any of them belongs to. */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-3xl border-separate border-spacing-1">
            <caption className="sr-only">
              Weekly shift coverage by caregiver
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sr-only">
                  Shift
                </th>
                {weekdays.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className="text-ink-muted pb-1 text-center text-xs font-semibold tracking-wide uppercase"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id}>
                  <th
                    scope="row"
                    className="text-ink-muted w-24 pr-2 text-left text-xs font-semibold tracking-wide uppercase"
                  >
                    {shift.label}
                    <span className="text-ink-subtle block font-normal">
                      {shift.hours}
                    </span>
                  </th>
                  {shift.days.map((owner, i) => (
                    <td key={`${shift.id}-${weekdays[i]}`}>
                      <Slot owner={owner} shift={shift} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Below lg: one block per day, so nothing hides behind a scroll */}
        <ul className="divide-line divide-y lg:hidden">
          {weekdays.map((day, dayIndex) => (
            <li key={day} className="py-3 first:pt-0 last:pb-0">
              <p className="text-ink text-sm font-semibold">{day}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
                {shifts.map((shift) => (
                  <Slot
                    key={shift.id}
                    owner={shift.days[dayIndex] ?? 'open'}
                    shift={shift}
                    showShiftLabel
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>

        <ul className="border-line mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4">
          {legend.map((owner) => (
            <li key={owner} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'size-3 shrink-0 rounded-sm border',
                  slotStyles[owner],
                )}
              />
              <span className="text-ink-muted text-xs">{slotLabels[owner]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
