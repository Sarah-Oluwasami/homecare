import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  useBlocker,
  useLocation,
  useParams,
} from 'react-router-dom'
import { Check, Plus, Trash2, TriangleAlert, X } from 'lucide-react'
import {
  RATE_PER_HOUR,
  TODAY,
  changesFrom,
  credentialLabel,
  deleteBlockers,
  hasErrors,
  hoursOffered,
  marginPercent,
  statusOptions,
  supervisorOptions,
  toFormValues,
  validate,
  warnings,
} from '@/features/caregivers/edit-form'
import type { Change, FormValues } from '@/features/caregivers/edit-form'
import {
  branches,
  employmentTypes,
  getStaffMember,
  shifts,
  statusLabels,
  titles,
  weekdays,
} from '@/features/caregivers/roster-data'
import type {
  Credential,
  Employment,
  Shift,
  StaffMember,
  StaffStatus,
  Weekday,
} from '@/features/caregivers/roster-data'
import { Panel } from '@/components/ui/Panel'
import { Field } from '@/components/ui/Field'
import { fieldControl } from '@/lib/field-classes'
import { cn } from '@/lib/cn'

export function CaregiverEditPage() {
  const { caregiverId } = useParams()
  const { search } = useLocation()
  const member = getStaffMember(caregiverId)

  if (!member) return <Navigate to="/caregivers" replace />

  /*
   * Keyed on the person. The form's state used to live in this component and
   * be seeded once, so moving between two caregivers' edit screens — the same
   * route, so the same instance — left the previous one's values on screen and
   * diffed them against the new record.
   */
  return <EditForm key={member.id} member={member} search={search} />
}

function EditForm({ member, search }: { member: StaffMember; search: string }) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(member))
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState<Change[] | null>(null)
  const nextCredentialId = useRef(0)

  const summaryRef = useRef<HTMLDivElement>(null)
  const savedRef = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)

  const errors = useMemo(() => validate(values), [values])
  const notices = useMemo(() => warnings(values), [values])
  const changes = useMemo(() => changesFrom(member, values), [member, values])
  const blockers = useMemo(() => deleteBlockers(member), [member])

  const dirty = changes.length > 0
  const invalid = hasErrors(errors)
  // Carries the roster's filters, so cancelling returns to the list the user
  // was actually working through.
  const profile = `/caregivers/${member.id}/overview${search}`
  const rosterPath = `/caregivers${search}`

  /*
   * The only screen in the app that can lose typed input, so leaving with a
   * dirty form asks first — both for in-app navigation and for the tab close.
   */
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!dirty) return
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty])

  // Focus moves to the message rather than being left on a Save button that is
  // often a screenful away from the first problem.
  useEffect(() => {
    if (submitted && invalid) summaryRef.current?.focus()
  }, [submitted, invalid, attempt])

  useEffect(() => {
    if (saved) savedRef.current?.focus()
  }, [saved])

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setSaved(null)
    setValues({ ...values, [key]: value })
  }

  const show = (key: string) => (submitted ? errors[key] : undefined)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAttempt((n) => n + 1)
    setSubmitted(true)
    // Nothing to save is not an error, but it must not report "0 changes".
    if (!dirty || invalid) return
    setSaved(changes)
  }

  const rate = Number(values.hourlyRate)
  const margin = marginPercent(rate)
  const offered = hoursOffered(values.availability)

  return (
    /* noValidate: the browser's own bubbles would fire before validate() and
       phrase the same problems differently. */
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="text-ink-subtle flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link to={rosterPath} className="hover:text-ink">
              Caregivers
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to={profile} className="hover:text-ink">
              {member.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink font-medium" aria-current="page">
            Edit
          </li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">
            Edit caregiver profile
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Update {member.name}&rsquo;s details, credentials and availability.
          </p>
        </div>
        <Actions dirty={dirty} to={profile} where="at the top of the form" />
      </header>

      {submitted && invalid && (
        <div
          key={attempt}
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 focus:outline-hidden"
        >
          {/* Keyed on the attempt so a repeated submit re-announces, and it
              lists what is wrong rather than only counting it. */}
          <p className="font-semibold">
            {Object.keys(errors).length} field
            {Object.keys(errors).length === 1 ? '' : 's'} need attention before
            this can be saved.
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {Object.entries(errors).map(([key, message]) => (
              <li key={key} className="break-words">
                {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {submitted && !invalid && !dirty && !saved && (
        <p
          key={`clean-${attempt}`}
          role="status"
          className="border-line text-ink-muted rounded-lg border p-3 text-sm"
        >
          Nothing has changed yet, so there is nothing to save.
        </p>
      )}

      {/* Warnings appear and disappear as fields change, so they are announced
          rather than only rendered. */}
      {notices.length > 0 && (
        <ul aria-live="polite" className="space-y-2">
          {notices.map((notice) => (
            <li
              key={notice.id}
              className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0"
                strokeWidth={2.2}
                aria-hidden="true"
              />
              <span className="break-words">{notice.message}</span>
            </li>
          ))}
        </ul>
      )}

      {blocker.state === 'blocked' && (
        <div
          role="alertdialog"
          aria-labelledby="leave-heading"
          className="border-amber-200 bg-amber-50 rounded-lg border p-4 text-sm text-amber-900"
        >
          <p id="leave-heading" className="font-semibold">
            {changes.length} unsaved change{changes.length === 1 ? '' : 's'}
          </p>
          <p className="mt-1">
            Leaving now discards them. Nothing is written until you save.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => blocker.reset?.()}
              className="border-line bg-surface text-ink hover:bg-sunken inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={() => blocker.proceed?.()}
              className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
            >
              Discard and leave
            </button>
          </div>
        </div>
      )}

      {saved && (
        <SaveSummary
          ref={savedRef}
          changes={saved}
          name={member.name}
          to={profile}
        />
      )}

      <Panel title="Personal information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" error={show('firstName')}>
            {(p) => (
              <input
                {...p}
                className={fieldControl}
                value={values.firstName}
                onChange={(e) => set('firstName', e.target.value)}
              />
            )}
          </Field>
          <Field label="Last name" error={show('lastName')}>
            {(p) => (
              <input
                {...p}
                className={fieldControl}
                value={values.lastName}
                onChange={(e) => set('lastName', e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Date of birth"
            error={show('dateOfBirth')}
            hint="Age on the profile is computed from this."
          >
            {(p) => (
              <input
                {...p}
                type="date"
                max={TODAY}
                className={fieldControl}
                value={values.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
              />
            )}
          </Field>
          <Field label="Phone" error={show('phone')}>
            {(p) => (
              <input
                {...p}
                type="tel"
                className={fieldControl}
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Email"
            error={show('email')}
            hint="Leave blank to use firstname.lastname@careprofs.com."
            className="sm:col-span-2"
          >
            {(p) => (
              <input
                {...p}
                type="email"
                className={fieldControl}
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
              />
            )}
          </Field>
          <Field label="Street" className="sm:col-span-2">
            {(p) => (
              <input
                {...p}
                className={fieldControl}
                value={values.street}
                onChange={(e) => set('street', e.target.value)}
              />
            )}
          </Field>
          <Field label="City">
            {(p) => (
              <input
                {...p}
                className={fieldControl}
                value={values.city}
                onChange={(e) => set('city', e.target.value)}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="State">
              {(p) => (
                <input
                  {...p}
                  className={fieldControl}
                  value={values.state}
                  onChange={(e) => set('state', e.target.value)}
                />
              )}
            </Field>
            <Field label="Postcode">
              {(p) => (
                <input
                  {...p}
                  inputMode="numeric"
                  className={fieldControl}
                  value={values.zip}
                  onChange={(e) => set('zip', e.target.value)}
                />
              )}
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="Employment details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Employee number"
            readOnlyNote="Issued on hire; it cannot be changed."
          >
            {(p) => (
              <input
                {...p}
                readOnly
                value={member.ref}
                className={cn(fieldControl, 'bg-sunken text-ink-subtle')}
              />
            )}
          </Field>
          <Field label="Role">
            {(p) => (
              <select
                {...p}
                className={fieldControl}
                value={values.title}
                onChange={(e) => set('title', e.target.value)}
              >
                {titles.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Employment type">
            {(p) => (
              <select
                {...p}
                className={fieldControl}
                value={values.employment}
                onChange={(e) => set('employment', e.target.value as Employment)}
              >
                {employmentTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label="Hourly pay rate"
            error={show('hourlyRate')}
            hint={
              margin === null
                ? `The client is charged ₦${RATE_PER_HOUR} an hour.`
                : `₦${RATE_PER_HOUR} charged to the client — ${margin}% gross margin.`
            }
          >
            {(p) => (
              <input
                {...p}
                inputMode="decimal"
                className={fieldControl}
                value={values.hourlyRate}
                onChange={(e) => set('hourlyRate', e.target.value)}
              />
            )}
          </Field>
          <Field label="Branch">
            {(p) => (
              <select
                {...p}
                className={fieldControl}
                value={values.branch}
                onChange={(e) => set('branch', e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Supervisor">
            {(p) => (
              <select
                {...p}
                className={fieldControl}
                value={values.supervisor}
                onChange={(e) => set('supervisor', e.target.value)}
              >
                {/* A stored value outside the list would otherwise display as
                    whichever option came first, while the diff kept the old
                    one — three parts of the screen disagreeing at once. */}
                {!supervisorOptions.includes(values.supervisor) && (
                  <option value={values.supervisor} disabled>
                    {values.supervisor} (no longer a coordinator)
                  </option>
                )}
                {supervisorOptions.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label="Start date"
            error={show('hiredAt')}
            hint="Tenure and years of experience are computed from this."
          >
            {(p) => (
              <input
                {...p}
                type="date"
                className={fieldControl}
                value={values.hiredAt}
                onChange={(e) => set('hiredAt', e.target.value)}
              />
            )}
          </Field>
          <Field label="Employment status">
            {(p) => (
              <select
                {...p}
                className={fieldControl}
                value={values.status}
                onChange={(e) => set('status', e.target.value as StaffStatus)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </Panel>

      <Panel title="Skills and languages">
        <TokenList
          label="Skills"
          placeholder="Add a skill"
          values={values.skills}
          error={show('skills')}
          onChange={(next) => set('skills', next)}
        />
        <div className="mt-5">
          <TokenList
            label="Languages"
            placeholder="Add a language"
            values={values.languages}
            error={show('languages')}
            onChange={(next) => set('languages', next)}
          />
        </div>
      </Panel>

      <Credentials
        values={values}
        errors={submitted ? errors : {}}
        nextId={() => `new-${(nextCredentialId.current += 1)}`}
        onChange={(next) => set('credentials', next)}
      />

      <Panel title="Emergency contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact name" error={show('emergencyName')}>
            {(p) => (
              <input
                {...p}
                className={fieldControl}
                value={values.emergencyName}
                onChange={(e) => set('emergencyName', e.target.value)}
              />
            )}
          </Field>
          <Field label="Phone" error={show('emergencyPhone')}>
            {(p) => (
              <input
                {...p}
                type="tel"
                className={fieldControl}
                value={values.emergencyPhone}
                onChange={(e) => set('emergencyPhone', e.target.value)}
              />
            )}
          </Field>
          <Field label="Relationship">
            {(p) => (
              <input
                {...p}
                className={fieldControl}
                value={values.emergencyRelationship}
                onChange={(e) => set('emergencyRelationship', e.target.value)}
              />
            )}
          </Field>
        </div>
      </Panel>

      <Availability
        values={values}
        errors={submitted ? errors : {}}
        offered={offered}
        onChange={(next) => set('availability', next)}
        onMax={(next) => set('maxHoursPerWeek', next)}
        onShift={(next) => set('preferredShift', next)}
        maxError={show('maxHoursPerWeek')}
      />

      <Panel title="Internal notes">
        <Field
          label="Notes and preferences"
          hint="Visible to coordinators only; families never see this."
        >
          {(p) => (
            <textarea
              {...p}
              rows={4}
              className="border-line focus:border-brand-500 w-full rounded-lg border px-3 py-2 text-sm"
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          )}
        </Field>
      </Panel>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <DeleteControl member={member} blockers={blockers} />
        <Actions dirty={dirty} to={profile} where="at the end of the form" />
      </div>
    </form>
  )
}

/* --------------------------------- actions -------------------------------- */

function Actions({
  dirty,
  to,
  where,
}: {
  dirty: boolean
  to: string
  /** Distinguishes the header pair from the footer pair for a screen reader. */
  where: string
}) {
  const reasonId = `save-reason-${where.replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to={to}
        className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium"
      >
        Cancel
        <span className="sr-only"> and return to the profile, {where}</span>
      </Link>
      {/*
        `aria-disabled`, not `disabled`: a submit button that vanishes from the
        tab order the moment the form is clean strands keyboard focus, and the
        message explaining why nothing happened has to be reachable.
      */}
      <button
        type="submit"
        aria-disabled={!dirty}
        aria-describedby={dirty ? undefined : reasonId}
        className={cn(
          'inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium',
          dirty
            ? 'bg-brand-600 hover:bg-brand-700 text-white'
            : 'bg-sunken text-ink-subtle border-line cursor-not-allowed border',
        )}
      >
        Save changes
        <span className="sr-only"> {where}</span>
      </button>
      {!dirty && (
        <span id={reasonId} className="sr-only">
          Nothing has changed yet.
        </span>
      )}
    </div>
  )
}

function SaveSummary({
  ref,
  changes,
  name,
  to,
}: {
  ref: React.Ref<HTMLDivElement>
  changes: Change[]
  name: string
  to: string
}) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 focus:outline-hidden"
    >
      <p className="flex items-center gap-2 font-semibold">
        <Check className="size-4 shrink-0" strokeWidth={2.6} aria-hidden="true" />
        {changes.length} change{changes.length === 1 ? '' : 's'} ready for{' '}
        {name}
      </p>
      {/* No backend to write to, so the screen reports the diff rather than
          claiming a save that did not happen. */}
      <p className="mt-1 text-emerald-800">
        Nothing has been written — this build has no server. Here is what would
        change:
      </p>
      <ul className="mt-2 space-y-1">
        {changes.map((change) => (
          <li key={change.field} className="break-words">
            <span className="font-medium">{change.field}:</span> {change.from} →{' '}
            {change.to}
          </li>
        ))}
      </ul>
      <Link to={to} className="mt-3 inline-flex min-h-11 items-center font-semibold underline">
        Back to the profile
      </Link>
    </div>
  )
}

function DeleteControl({
  member,
  blockers,
}: {
  member: StaffMember
  blockers: string[]
}) {
  const [confirming, setConfirming] = useState(false)
  const blocked = blockers.length > 0

  return (
    <div className="min-w-0">
      <button
        type="button"
        aria-disabled={blocked}
        aria-describedby={blocked ? 'delete-blockers' : undefined}
        onClick={() => !blocked && setConfirming(true)}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium',
          blocked
            ? 'border-line bg-sunken text-ink-subtle cursor-not-allowed'
            : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
        )}
      >
        <Trash2 className="size-4" strokeWidth={1.9} aria-hidden="true" />
        Delete profile
        <span className="sr-only"> for {member.name}</span>
      </button>
      {blocked && (
        <ul id="delete-blockers" className="text-ink-subtle mt-2 space-y-0.5 text-xs">
          {blockers.map((b) => (
            <li key={b} className="break-words">
              {b}
            </li>
          ))}
        </ul>
      )}
      {/* Says what would happen instead of looking live and doing nothing. */}
      {confirming && (
        <p
          role="status"
          className="border-line text-ink-muted mt-2 max-w-sm rounded-lg border p-3 text-xs"
        >
          Deleting {member.name} would remove the employment record, the
          credentials and the availability. Nothing has been removed — this
          build has no server.
        </p>
      )}
    </div>
  )
}

/* -------------------------------- token list ------------------------------- */

function TokenList({
  label,
  placeholder,
  values,
  error,
  onChange,
}: {
  label: string
  placeholder: string
  values: string[]
  error?: string
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const listId = `tokens-${label.toLowerCase()}`
  const errorId = `${listId}-error`

  const add = () => {
    const value = draft.trim()
    if (!value) return
    // Case-insensitive: "english" beside "English" is the same language, and
    // silently emptying the box gave the user no way to tell what happened.
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setNotice(`${value} is already in the list.`)
      return
    }
    onChange([...values, value])
    setNotice(`${value} added.`)
    setDraft('')
  }

  const remove = (value: string) => {
    onChange(values.filter((v) => v !== value))
    setNotice(`${value} removed.`)
  }

  return (
    <fieldset className="min-w-0">
      <legend className="text-ink-muted mb-1.5 text-xs font-medium">{label}</legend>
      <ul className="flex flex-wrap gap-2">
        {values.map((value) => (
          <li key={value}>
            <span className="border-line text-ink inline-flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-3 text-sm">
              {value}
              <button
                type="button"
                onClick={() => remove(value)}
                className="text-ink-subtle hover:bg-sunken hover:text-ink grid size-6 place-items-center rounded-full"
              >
                <X className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
                <span className="sr-only">
                  Remove {value} from {label.toLowerCase()}
                </span>
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{placeholder}</span>
          <input
            value={draft}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => {
              setNotice('')
              setDraft(e.target.value)
            }}
            // Enter inside a form submits it; here it should add the token.
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            className={cn(fieldControl, 'min-w-40')}
          />
        </label>
        <button
          type="button"
          onClick={add}
          className="border-line text-ink hover:bg-sunken inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
        >
          <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
          Add
          <span className="sr-only"> to {label.toLowerCase()}</span>
        </button>
      </div>

      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
      {/* Adding and removing a chip changes a list nobody is looking at, so
          the outcome is announced rather than only rendered. */}
      <p aria-live="polite" className="text-ink-subtle mt-1 text-xs">
        {notice}
      </p>
    </fieldset>
  )
}

/* ------------------------------- credentials ------------------------------- */

function Credentials({
  values,
  errors,
  nextId,
  onChange,
}: {
  values: FormValues
  errors: Record<string, string | undefined>
  /** A counter, not Date.now() — two adds in one millisecond collided. */
  nextId: () => string
  onChange: (next: Credential[]) => void
}) {
  const update = (id: string, patch: Partial<Credential>) =>
    onChange(values.credentials.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const add = () =>
    onChange([
      ...values.credentials,
      {
        id: nextId(),
        name: '',
        kind: 'certification',
        reference: '',
        issuedAt: '',
        expiresAt: '',
      },
    ])

  return (
    <Panel title="Credentials">
      <p className="text-ink-muted -mt-1 mb-3 text-sm">
        Compliance on the profile is computed from these expiry dates, so
        changing one here changes whether this caregiver can be rostered.
      </p>

      <ul className="space-y-3">
        {values.credentials.map((credential) => {
          const error = errors[`credential-${credential.id}`]
          return (
            <li
              key={credential.id}
              className={cn(
                'rounded-xl border p-3',
                error ? 'border-red-300 bg-red-50/40' : 'border-line',
              )}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Credential" error={error}>
                  {(p) => (
                    <input
                      {...p}
                      className={fieldControl}
                      value={credential.name}
                      onChange={(e) => update(credential.id, { name: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Reference">
                  {(p) => (
                    <input
                      {...p}
                      className={fieldControl}
                      value={credential.reference ?? ''}
                      onChange={(e) =>
                        update(credential.id, { reference: e.target.value })
                      }
                    />
                  )}
                </Field>
                <Field label="Issued">
                  {(p) => (
                    <input
                      {...p}
                      type="date"
                      className={fieldControl}
                      value={credential.issuedAt ?? ''}
                      onChange={(e) =>
                        update(credential.id, { issuedAt: e.target.value })
                      }
                    />
                  )}
                </Field>
                <Field label="Expires" error={error}>
                  {(p) => (
                    <input
                      {...p}
                      type="date"
                      className={fieldControl}
                      value={credential.expiresAt ?? ''}
                      onChange={(e) =>
                        update(credential.id, { expiresAt: e.target.value })
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs">
                  <CredentialState expiresAt={credential.expiresAt} />
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onChange(values.credentials.filter((c) => c.id !== credential.id))
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.9} aria-hidden="true" />
                  Remove
                  <span className="sr-only"> {credential.name || 'credential'}</span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={add}
        className="border-line text-ink hover:bg-sunken mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium"
      >
        <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
        Add credential
      </button>
    </Panel>
  )
}

/**
 * Recomputed as the date changes, so the effect of an edit is visible at once.
 * Against `TODAY`, not the wall clock — every other screen reads the fixed
 * sample clock, and a row calling a credential Valid while the warning above
 * called it expiring was two facts disagreeing on one screen.
 */
function CredentialState({ expiresAt }: { expiresAt?: string }) {
  const { label, tone } = credentialLabel(expiresAt, TODAY)
  return (
    <span
      className={cn(
        tone === 'expired'
          ? 'font-medium text-red-700'
          : tone === 'expiring'
            ? 'font-medium text-amber-700'
            : 'text-ink-subtle',
      )}
    >
      {label}
    </span>
  )
}

/* ------------------------------- availability ------------------------------ */

function Availability({
  values,
  errors,
  offered,
  onChange,
  onMax,
  onShift,
  maxError,
}: {
  values: FormValues
  errors: Record<string, string | undefined>
  offered: number
  onChange: (next: FormValues['availability']) => void
  onMax: (next: string) => void
  onShift: (next: Shift) => void
  maxError?: string
}) {
  const windowFor = (day: Weekday) => values.availability.find((w) => w.day === day)

  const toggle = (day: Weekday) => {
    const existing = windowFor(day)
    if (existing) {
      onChange(values.availability.filter((w) => w.day !== day))
      return
    }
    onChange([...values.availability, { day, start: '09:00', end: '17:00' }])
  }

  const update = (day: Weekday, patch: Partial<FormValues['availability'][number]>) =>
    onChange(values.availability.map((w) => (w.day === day ? { ...w, ...patch } : w)))

  const max = Number(values.maxHoursPerWeek)
  const over = !Number.isNaN(max) && max > 0 && offered > max

  return (
    <Panel title="Availability">
      <fieldset>
        <legend className="text-ink-muted mb-2 text-xs font-medium">
          Weekly availability
        </legend>
        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
          {weekdays.map((day) => {
            const window = windowFor(day)
            const error = errors[`availability-${day}`]
            return (
              <li
                key={day}
                className={cn(
                  'rounded-xl border p-3',
                  error ? 'border-red-300' : window ? 'border-brand-200 bg-brand-50/40' : 'border-line',
                )}
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(window)}
                    onChange={() => toggle(day)}
                    className="accent-brand-600 size-4"
                  />
                  <span className="text-ink text-sm font-semibold">{day}</span>
                </label>

                {window ? (
                  /* Stacked below 420px: two time inputs side by side fall
                     under the intrinsic width of hh:mm AM/PM at 320. */
                  <div className="mt-2 flex flex-col gap-1.5 min-[420px]:flex-row min-[420px]:items-center">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">{day} start time</span>
                      <input
                        type="time"
                        value={window.start}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `availability-${day}` : undefined}
                        onChange={(e) => update(day, { start: e.target.value })}
                        className="border-line focus:border-brand-500 h-9 w-full rounded-lg border px-2 text-sm"
                      />
                    </label>
                    <span
                      className="text-ink-subtle hidden text-xs min-[420px]:inline"
                      aria-hidden="true"
                    >
                      –
                    </span>
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">{day} finish time</span>
                      <input
                        type="time"
                        value={window.end}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `availability-${day}` : undefined}
                        onChange={(e) => update(day, { end: e.target.value })}
                        className="border-line focus:border-brand-500 h-9 w-full rounded-lg border px-2 text-sm"
                      />
                    </label>
                  </div>
                ) : (
                  <p className="text-ink-subtle mt-2 text-xs">Not available</p>
                )}

                {error && (
                  <p
                    id={`availability-${day}`}
                    className="mt-1 text-xs font-medium text-red-700"
                  >
                    {error}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </fieldset>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Maximum hours a week"
          error={maxError}
          hint={
            over
              ? `${offered} hours offered by the grid above — ${offered - max} beyond this contract.`
              : `${offered} hours offered by the grid above.`
          }
        >
          {(p) => (
            <input
              {...p}
              inputMode="numeric"
              className={fieldControl}
              value={values.maxHoursPerWeek}
              onChange={(e) => onMax(e.target.value)}
            />
          )}
        </Field>
        <Field label="Preferred shift">
          {(p) => (
            <select
              {...p}
              className={fieldControl}
              value={values.preferredShift}
              onChange={(e) => onShift(e.target.value as Shift)}
            >
              {shifts.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
        </Field>
      </div>

    </Panel>
  )
}
