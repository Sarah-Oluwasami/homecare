import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, RotateCcw, TriangleAlert } from 'lucide-react'
import {
  HORIZON_BACK,
  HORIZON_DAYS,
  HORIZON_FORWARD,
  STARTING_SOON_MINUTES,
  TODAY,
  bufferImpact,
  changedCount,
  defaultSettings,
  formatTime,
  holidayImpact,
  holidayPolicyLabels,
  hoursImpact,
  isDirty,
  lapsedStaff,
  nextOccurrence,
  otherDurations,
  overtimeImpact,
  ruleDefinitions,
  ruleImpact,
  serviceAliases,
  serviceTypes,
} from '@/features/scheduling/settings-data'
import type {
  DayHours,
  Holiday,
  HolidayPolicy,
  Impact,
  RuleId,
  ScheduleSettings,
} from '@/features/scheduling/settings-data'
import { formatFullDay } from '@/features/scheduling/board-data'
import { Panel } from '@/components/ui/Panel'
import { Toggle } from '@/components/ui/Toggle'
import { fieldControl } from '@/lib/field-classes'
import { cn } from '@/lib/cn'

const dayNames: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
}

const policyOptions: HolidayPolicy[] = ['normal', 'emergency', 'closed']

/** Full class strings — Tailwind cannot see a name built at runtime. */
const policyBorder: Record<HolidayPolicy, string> = {
  normal: 'border-emerald-300',
  emergency: 'border-amber-300',
  closed: 'border-red-300',
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/** A cleared number input reads '', and Number('') is 0. */
function clamp(raw: string, min: number, max: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function ScheduleSettingsPage() {
  // The saved state and the working copy, held apart so "6 unsaved changes"
  // and Discard mean something exact rather than "the form has been touched".
  const initial = useMemo(() => defaultSettings(), [])
  const [saved, setSaved] = useState<ScheduleSettings>(initial)
  const [draft, setDraft] = useState<ScheduleSettings>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const types = useMemo(() => serviceTypes(), [])
  const dirty = isDirty(draft, saved)
  const changes = changedCount(draft, saved)

  // Save is not offered over a form that cannot be true: a day that closes
  // before it opens, or a service with no duration.
  const problems = [
    // A cleared <input type="time"> reads '', which compares below every clock
    // value — without this an empty opening time passed validation silently.
    ...draft.hours
      .filter((h) => h.open && (!h.start || !h.end))
      .map((h) => `${dayNames[h.day] ?? h.day} is missing an opening or closing time`),
    ...draft.hours
      .filter((h) => h.open && h.start && h.end && h.end <= h.start)
      .map((h) => `${dayNames[h.day] ?? h.day} closes before it opens`),
    ...types
      .filter((t) => !(draft.durations[t] > 0))
      .map((t) => `${t} has no duration`),
  ]
  const valid = problems.length === 0

  const outsideHours = useMemo(() => hoursImpact(draft.hours), [draft.hours])
  const tooTight = useMemo(() => bufferImpact(draft.buffer), [draft.buffer])
  const overtime = useMemo(
    () => overtimeImpact(draft.rules['allow-overtime']),
    [draft.rules],
  )
  // These walk 935 visits; un-memoised they re-ran on every keystroke in any
  // of the fifteen inputs.
  const ruleImpacts = useMemo(
    () =>
      Object.fromEntries(
        ruleDefinitions.map((r) => [r.id, ruleImpact(r.id, draft.rules[r.id])]),
      ) as Record<RuleId, Impact>,
    [draft.rules],
  )
  const durationNotes = useMemo(
    () =>
      Object.fromEntries(
        types.map((t) => [t, otherDurations(t, draft.durations[t] ?? 0)]),
      ) as Record<string, number[]>,
    [types, draft.durations],
  )
  const lapsed = useMemo(() => lapsedStaff(), [])

  const patch = (next: Partial<ScheduleSettings>) =>
    setDraft((d) => ({ ...d, ...next }))

  const setDay = (day: string, next: Partial<DayHours>) =>
    patch({
      hours: draft.hours.map((h) => (h.day === day ? { ...h, ...next } : h)),
    })

  const holidays = useMemo(
    () =>
      [...draft.holidays].sort((a, b) =>
        nextOccurrence(a).localeCompare(nextOccurrence(b)),
      ),
    [draft.holidays],
  )

  return (
    <div className="space-y-6 pb-56 sm:pb-32">
      <nav aria-label="Breadcrumb">
        <ol className="text-ink-subtle flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link to="/scheduling" className="hover:text-ink">
              Scheduling
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink font-medium" aria-current="page">
            Schedule settings
          </li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">
            Schedule settings
          </h1>
          <p className="text-ink-muted mt-1 max-w-2xl text-sm">
            Rules applied when visits are booked. Every setting is checked
            against the rota as it stands, so a rule that would put existing
            visits in breach says so before it is saved.
          </p>
        </div>
        {savedAt && !dirty && (
          <p
            role="status"
            className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
          >
            Saved at {savedAt}
          </p>
        )}
      </header>

      <p className="text-ink-subtle card p-3 text-xs">
        <Info
          className="mr-1.5 -mt-0.5 inline size-3.5"
          strokeWidth={2}
          aria-hidden="true"
        />
        Business hours, rules and gaps are checked over {HORIZON_DAYS} days —
        {HORIZON_BACK} back and {HORIZON_FORWARD} forward from{' '}
        {formatFullDay(TODAY)} — and a recurring slot is counted once, not once
        per week. Holidays are checked on their own date, which may fall outside
        that window.
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* ----------------------------- business hours ---------------------- */}

        <div className="space-y-4">
          <Panel
            title="Business hours"
            badge={<ImpactBadge impact={outsideHours} label="outside" />}
          >
            <p className="text-ink-subtle mb-3 text-xs">
              Seeded from the rota, not chosen for it: the window on each day
              covers the visits actually booked that day.
            </p>

            <ul className="divide-line divide-y">
              {draft.hours.map((h) => (
                <li key={h.day} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Toggle
                      label={dayNames[h.day] ?? h.day}
                      checked={h.open}
                      onChange={(open) => setDay(h.day, { open })}
                      className="min-w-32 grow"
                    />
                    {h.open ? (
                      <span className="flex shrink-0 items-center gap-1.5">
                        <label className="sr-only" htmlFor={`open-${h.day}`}>
                          {dayNames[h.day]} opening time
                        </label>
                        <input
                          id={`open-${h.day}`}
                          type="time"
                          value={h.start}
                          step={900}
                          onChange={(e) => setDay(h.day, { start: e.target.value })}
                          className={cn(fieldControl, 'w-28')}
                        />
                        <span className="text-ink-subtle text-xs">to</span>
                        <label className="sr-only" htmlFor={`close-${h.day}`}>
                          {dayNames[h.day]} closing time
                        </label>
                        <input
                          id={`close-${h.day}`}
                          type="time"
                          value={h.end}
                          step={900}
                          onChange={(e) => setDay(h.day, { end: e.target.value })}
                          className={cn(fieldControl, 'w-28')}
                        />
                      </span>
                    ) : (
                      <span className="text-ink-subtle shrink-0 text-sm">
                        Closed
                      </span>
                    )}
                  </div>
                  {h.open && (!h.start || !h.end) && (
                    <p className="mt-1.5 text-xs font-medium text-red-700">
                      Both an opening and a closing time are required.
                    </p>
                  )}
                  {h.open && h.start && h.end && h.end <= h.start && (
                    <p className="mt-1.5 text-xs font-medium text-red-700">
                      Closing time must be after opening time.
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <ImpactNote
              impact={outsideHours}
              lead="visit"
              tail="already booked outside these hours"
            />
          </Panel>

          {/* ------------------------------- rules ---------------------------- */}

          <Panel title="Scheduling rules">
            <ul className="divide-line divide-y">
              {ruleDefinitions.map((rule) => {
                const on = draft.rules[rule.id]
                const impact =
                  rule.id === 'allow-overtime' ? overtime : ruleImpacts[rule.id]
                const noteId = `${rule.id}-impact`
                return (
                  <li key={rule.id} className="py-3 first:pt-0 last:pb-0">
                    <Toggle
                      label={rule.label}
                      checked={on}
                      onChange={(next) =>
                        patch({ rules: { ...draft.rules, [rule.id]: next } })
                      }
                      // Otherwise the switch reads out its label and hint and
                      // never the warning sitting directly beneath it.
                      describedBy={impact.count > 0 ? noteId : undefined}
                      hint={
                        <>
                          {/* Says outright whether anything acts on it. */}
                          <span
                            className={cn(
                              'mr-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold',
                              rule.enforced
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-sunken text-ink-muted',
                            )}
                          >
                            {rule.enforced ? 'In force' : 'Recorded only'}
                          </span>
                          {rule.detail}
                        </>
                      }
                    />
                    <ImpactNote
                      id={noteId}
                      impact={impact}
                      lead={rule.id === 'allow-overtime' ? 'caregiver' : 'visit'}
                      tail={
                        rule.id === 'allow-overtime'
                          ? 'already rostered past their contract'
                          : 'already breaches this rule'
                      }
                    />
                  </li>
                )
              })}
            </ul>

            <ReminderRow
              minutes={draft.reminderMinutes}
              disabled={!draft.rules['send-reminders']}
              onChange={(reminderMinutes) => patch({ reminderMinutes })}
            />

            {draft.rules['certification-match'] && lapsed.length > 0 && (
              <p className="text-ink-subtle mt-3 text-xs">
                {lapsed.join(', ')} {lapsed.length === 1 ? 'has' : 'have'} a
                lapsed credential and {lapsed.length === 1 ? 'is' : 'are'}{' '}
                already blocked from new assignments regardless of this rule.
              </p>
            )}
          </Panel>
        </div>

        {/* ---------------------------- durations + buffer -------------------- */}

        <div className="space-y-4">
          <Panel
            title="Default visit durations"
            badge={
              <span className="border-line text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-xs">
                {types.length} services
              </span>
            }
          >
            <p className="text-ink-subtle mb-3 text-xs">
              Every service the rota and the visit log use, read from the board.
            </p>
            <ul className="divide-line divide-y">
              {types.map((type) => {
                const value = draft.durations[type] ?? 0
                const others = durationNotes[type] ?? []
                const alias = serviceAliases[type]
                // Slugged: an id may not contain whitespace, and eleven of
                // these service names do.
                const id = `duration-${slug(type)}`
                return (
                  <li key={type} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="min-w-0 grow">
                        <label
                          htmlFor={id}
                          className="text-ink block text-sm break-words"
                        >
                          {type}
                        </label>
                        {alias && (
                          <span className="text-ink-subtle block text-xs">
                            Also recorded as {alias}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <input
                          id={id}
                          type="number"
                          min={0.25}
                          max={24}
                          step={0.25}
                          value={value}
                          aria-invalid={value > 0 ? undefined : true}
                          onChange={(e) =>
                            patch({
                              durations: {
                                ...draft.durations,
                                [type]: clamp(e.target.value, 0, 24),
                              },
                            })
                          }
                          className={cn(fieldControl, 'w-24 text-right tabular-nums')}
                        />
                        <span className="text-ink-subtle w-12 text-xs">
                          {value === 1 ? 'hour' : 'hours'}
                        </span>
                      </span>
                    </div>
                    {others.length > 0 && (
                      <p className="text-ink-subtle mt-1 text-xs">
                        Also runs {others.map((h) => `${h}h`).join(' and ')} on
                        the rota.
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel
            title="Gaps between visits"
            badge={<ImpactBadge impact={tooTight} label="too tight" />}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label
                  htmlFor="buffer-minutes"
                  className="text-ink min-w-0 grow text-sm"
                >
                  Minimum gap between one visit ending and the next starting
                </label>
                <span className="flex shrink-0 items-center gap-1.5">
                  <input
                    id="buffer-minutes"
                    type="number"
                    min={0}
                    max={240}
                    step={5}
                    value={draft.buffer.minutes}
                    onChange={(e) =>
                      patch({
                        buffer: {
                          ...draft.buffer,
                          minutes: clamp(e.target.value, 0, 240),
                        },
                      })
                    }
                    className={cn(fieldControl, 'w-24 text-right tabular-nums')}
                  />
                  <span className="text-ink-subtle w-12 text-xs">minutes</span>
                </span>
              </div>

              <Toggle
                label="Allow visits that start the moment the last one ends"
                checked={draft.buffer.allowBackToBack}
                onChange={(allowBackToBack) =>
                  patch({ buffer: { ...draft.buffer, allowBackToBack } })
                }
                hint={
                  draft.buffer.allowBackToBack
                    ? 'A zero-minute gap is permitted even though the minimum above is higher.'
                    : `Every gap must be at least ${draft.buffer.minutes} minutes.`
                }
              />

              <Toggle
                label="Estimate travel time between visits"
                checked={draft.buffer.estimateTravel}
                onChange={(estimateTravel) =>
                  patch({ buffer: { ...draft.buffer, estimateTravel } })
                }
                hint={
                  <>
                    <span className="bg-sunken text-ink-muted mr-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold">
                      Recorded only
                    </span>
                    Addresses now carry coordinates, so straight-line distance
                    is computable — but nothing estimates a journey time from
                    it yet.
                  </>
                }
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="min-w-0 grow">
                  <label htmlFor="max-miles" className="text-ink block text-sm">
                    Maximum travel distance
                  </label>
                  <span className="text-ink-subtle mt-0.5 block text-xs">
                    <span className="bg-sunken text-ink-muted mr-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold">
                      Recorded only
                    </span>
                    Nothing rejects a booking over the limit yet — Live
                    Monitoring&rsquo;s map is where the distances are shown.
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <input
                    id="max-miles"
                    type="number"
                    min={1}
                    max={200}
                    value={draft.buffer.maxTravelMiles}
                    onChange={(e) =>
                      patch({
                        buffer: {
                          ...draft.buffer,
                          maxTravelMiles: clamp(e.target.value, 1, 200),
                        },
                      })
                    }
                    className={cn(fieldControl, 'w-24 text-right tabular-nums')}
                  />
                  <span className="text-ink-subtle w-12 text-xs">miles</span>
                </span>
              </div>
            </div>

            <ImpactNote
              impact={tooTight}
              lead="pair of visits"
              plural="pairs of visits"
              tail="on the rota sit closer than this"
            />
          </Panel>

          {/* ------------------------------ holidays -------------------------- */}

          <Panel title="Holiday calendar" flush>
            <p className="text-ink-subtle border-line border-t px-4 py-3 text-xs">
              Dates are computed from each holiday&rsquo;s rule and shown for
              their next occurrence, so none can be misdated or listed in the
              past.
            </p>
            <ul className="divide-line border-line divide-y border-t">
              {holidays.map((holiday) => (
                <HolidayRow
                  key={holiday.id}
                  holiday={holiday}
                  onChange={(policy) =>
                    patch({
                      holidays: draft.holidays.map((h) =>
                        h.id === holiday.id ? { ...h, policy } : h,
                      ),
                    })
                  }
                />
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* --------------------------------- actions ------------------------------ */}

      <div
        role="region"
        aria-label="Save settings"
        className="border-line bg-canvas fixed inset-x-0 bottom-0 z-20 border-t p-4 shadow-lg"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm" role="status">
            {problems.length > 0 ? (
              <span className="font-medium text-red-700">
                {/* Capped: nineteen sentences in a fixed bar covers the page. */}
                {problems[0]}
                {problems.length > 1 &&
                  ` and ${problems.length - 1} other problem${problems.length === 2 ? '' : 's'}`}
                .
              </span>
            ) : (
              <span className="text-ink-muted">
                {dirty
                  ? `${changes} unsaved change${changes === 1 ? '' : 's'}.`
                  : 'No unsaved changes.'}
              </span>
            )}
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(saved)}
              aria-disabled={!dirty}
              className="border-line text-ink hover:bg-sunken inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
            >
              <RotateCcw className="size-4" strokeWidth={1.9} aria-hidden="true" />
              Discard changes
            </button>
            {/* Only live when there is something to save, and it says plainly
                that nothing is written back in the sample. */}
            <button
              type="button"
              aria-disabled={!dirty || !valid}
              aria-describedby="save-note"
              onClick={() => {
                if (!dirty || !valid) return
                setSaved(draft)
                setSavedAt(formatTime(nowClock()))
              }}
              className="bg-brand-600 hover:bg-brand-700 inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-semibold text-white aria-disabled:cursor-default aria-disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        </div>
        <p id="save-note" className="text-ink-subtle mx-auto mt-2 max-w-6xl text-xs">
          Sample data — settings live for this session only and do not change the
          rota.
        </p>
      </div>
    </div>
  )
}

function nowClock(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/* --------------------------------- pieces ---------------------------------- */

function ReminderRow({
  minutes,
  disabled,
  onChange,
}: {
  minutes: number
  disabled: boolean
  onChange: (next: number) => void
}) {
  const mismatched = minutes !== STARTING_SOON_MINUTES

  return (
    <div className="border-line mt-3 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="reminder" className="text-ink min-w-0 grow text-sm">
          Reminder lead time
        </label>
        <span className="flex shrink-0 items-center gap-1.5">
          <input
            id="reminder"
            type="number"
            min={5}
            max={480}
            step={5}
            value={minutes}
            disabled={disabled}
            aria-describedby={disabled ? 'reminder-off' : undefined}
            onChange={(e) => onChange(clamp(e.target.value, 5, 480))}
            className={cn(fieldControl, 'w-24 text-right tabular-nums')}
          />
          <span className="text-ink-subtle w-12 text-xs">minutes</span>
        </span>
      </div>
      {disabled && (
        <p id="reminder-off" className="text-ink-subtle mt-1.5 text-xs">
          Turn reminders on to change this.
        </p>
      )}
      {!disabled && mismatched && (
        <p className="mt-1.5 flex gap-1.5 text-xs text-amber-900">
          <TriangleAlert
            className="mt-0.5 size-3.5 shrink-0"
            strokeWidth={2.4}
            aria-hidden="true"
          />
          {/* One window, two places. Left to drift, a caregiver would be
              reminded at a different moment than the badge appears. */}
          <span>
            Boards mark a visit &ldquo;Starting soon&rdquo;{' '}
            {STARTING_SOON_MINUTES} minutes ahead. At {minutes} minutes the
            reminder and the badge would not line up.
          </span>
        </p>
      )}
    </div>
  )
}

function HolidayRow({
  holiday,
  onChange,
}: {
  holiday: Holiday
  onChange: (policy: HolidayPolicy) => void
}) {
  const date = nextOccurrence(holiday)
  const impact = holidayImpact(holiday)
  const id = `holiday-${holiday.id}`

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 grow">
          <label htmlFor={id} className="text-ink text-sm font-semibold break-words">
            {holiday.name}
          </label>
          <p className="text-ink-subtle mt-0.5 text-sm break-words">
            {formatFullDay(date)}
          </p>
        </div>
        {/* No badge beside the select: it restated the select's own value
            verbatim, and the pair overflowed a 320px row. The border carries
            the policy without duplicating the words. */}
        <select
          id={id}
          value={holiday.policy}
          onChange={(e) => onChange(e.target.value as HolidayPolicy)}
          className={cn(fieldControl, 'w-full sm:w-44', policyBorder[holiday.policy])}
        >
          {policyOptions.map((p) => (
            <option key={p} value={p}>
              {holidayPolicyLabels[p]}
            </option>
          ))}
        </select>
      </div>
      {impact.count > 0 && (
        <p className="mt-2 flex gap-1.5 text-xs text-amber-900">
          <TriangleAlert
            className="mt-0.5 size-3.5 shrink-0"
            strokeWidth={2.4}
            aria-hidden="true"
          />
          <span className="break-words">
            {impact.count} visit{impact.count === 1 ? '' : 's'} already rostered
            that day — {impact.examples.join(', ')}
            {impact.count > impact.examples.length && ' and others'}.
          </span>
        </p>
      )}
    </li>
  )
}

function ImpactBadge({ impact, label }: { impact: Impact; label: string }) {
  if (impact.count === 0)
    return (
      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        No conflicts
      </span>
    )
  return (
    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      {impact.count} {label}
    </span>
  )
}

function ImpactNote({
  id,
  impact,
  lead,
  plural,
  tail,
}: {
  id?: string
  impact: Impact
  lead: string
  plural?: string
  tail: string
}) {
  if (impact.count === 0) return null
  const noun = impact.count === 1 ? lead : (plural ?? `${lead}s`)

  return (
    <p
      id={id}
      className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
    >
      <TriangleAlert
        className="mt-0.5 size-3.5 shrink-0"
        strokeWidth={2.4}
        aria-hidden="true"
      />
      <span className="min-w-0 break-words">
        <span className="font-semibold">
          {impact.count} {noun} {tail}.
        </span>{' '}
        {impact.examples.join('; ')}
        {impact.count > impact.examples.length && ' and others'}.
      </span>
    </p>
  )
}
