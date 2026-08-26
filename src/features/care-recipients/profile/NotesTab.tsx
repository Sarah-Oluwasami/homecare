import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { NotebookPen, Search } from 'lucide-react'
import type { RecipientProfile } from '../profile-data'
import {
  NOTES_PAGE_SIZE,
  authors,
  categoryCounts,
  flaggedCount,
  getCareNotes,
  noteCategories,
  noteSortOptions,
  notesThisMonth,
  sortNotes,
  TODAY,
  type NoteCategory,
  type NoteSort,
} from '../notes-data'
import { NoteCard } from './NoteCard'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { cn } from '@/lib/cn'

type CategoryFilter = NoteCategory | 'all'

export function NotesTab() {
  const profile = useOutletContext<RecipientProfile>()
  const notes = useMemo(() => getCareNotes(profile.id), [profile.id])

  const [category, setCategory] = useState<CategoryFilter>('all')
  const [author, setAuthor] = useState('all')
  const [sort, setSort] = useState<NoteSort>('latest')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(NOTES_PAGE_SIZE)
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set())

  const flagged = flaggedCount(notes)
  const thisMonth = notesThisMonth(notes)
  const authorOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...authors(notes).map((a) => ({ value: a, label: a })),
    ],
    [notes],
  )

  /*
   * Pill counts respect the author filter and the search, so they can't read
   * "Visit Notes 5" above a list showing one. Category is applied after, since
   * a pill shouldn't affect its own count.
   */
  const beforeCategory = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes.filter((n) => {
      if (author !== 'all' && n.author !== author) return false
      if (!q) return true
      return [n.body, n.author, n.authorRole].join(' ').toLowerCase().includes(q)
    })
  }, [notes, author, query])

  const counts = useMemo(() => categoryCounts(beforeCategory), [beforeCategory])

  const rows = useMemo(() => {
    const filtered =
      category === 'all'
        ? beforeCategory
        : beforeCategory.filter((n) => n.category === category)
    return sortNotes(filtered, sort)
  }, [beforeCategory, category, sort])

  const shown = rows.slice(0, visible)
  const remaining = rows.length - shown.length

  /** Any filter change restarts the reveal count. */
  const reset =
    <T,>(setter: (v: T) => void) =>
    (value: T) => {
      setter(value)
      setVisible(NOTES_PAGE_SIZE)
    }

  const toggleAcknowledge = (id: string) =>
    setAcknowledged((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (notes.length === 0) {
    return (
      <div className="card grid place-items-center px-6 py-20 text-center">
        <span className="bg-sunken text-ink-subtle grid size-11 place-items-center rounded-full">
          <NotebookPen className="size-5" strokeWidth={1.8} />
        </span>
        <h2 className="text-ink mt-3 text-sm font-semibold">No care notes</h2>
        <p className="text-ink-muted mt-1 max-w-sm text-sm">
          {profile.name} has no logged notes yet. Caregiver, clinical and family
          entries appear here as they are recorded.
        </p>
        <button
          type="button"
          className="bg-brand-600 hover:bg-brand-700 mt-5 inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white transition-colors"
        >
          Add Note
        </button>
      </div>
    )
  }

  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${TODAY}T00:00:00Z`))

  const stats = [
    {
      id: 'total',
      label: 'Total Notes',
      value: String(notes.length),
      hint: 'All cumulative logs since onboarding',
      emphasise: false,
    },
    {
      id: 'month',
      label: 'This Month',
      value: String(thisMonth),
      hint: `New activity logs in ${monthName}`,
      emphasise: false,
    },
    {
      id: 'flagged',
      label: 'Flagged for Review',
      value: String(flagged),
      hint: 'Requiring supervisor attention',
      emphasise: flagged > 0,
    },
  ]

  return (
    <div className="space-y-4">
      <section aria-labelledby="notes-snapshot">
        <h2
          id="notes-snapshot"
          className="text-ink mb-3 text-base font-semibold tracking-tight"
        >
          Notes Summary Snapshot
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map(({ id, label, value, hint, emphasise }) => (
            <article
              key={id}
              className={cn(
                'card p-4',
                emphasise && 'border-red-200 bg-red-50/40',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-ink-subtle text-xs font-semibold tracking-wider uppercase">
                  {label}
                </p>
                {emphasise && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-700">
                    Attention required
                  </span>
                )}
              </div>
              <p
                className={cn(
                  'mt-2 text-3xl font-bold tracking-tight tabular-nums',
                  emphasise ? 'text-red-700' : 'text-ink',
                )}
              >
                {value}
              </p>
              <p className="text-ink-subtle mt-1.5 text-xs">{hint}</p>
            </article>
          ))}
        </div>
      </section>

      <div
        role="group"
        aria-label="Filter notes by category"
        className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1"
      >
        {(
          [
            { value: 'all' as const, label: 'All' },
            ...noteCategories.map((c) => ({ value: c.value, label: c.label })),
          ] satisfies { value: CategoryFilter; label: string }[]
        ).map(({ value, label }) => {
          const selected = category === value
          const count =
            value === 'all' ? beforeCategory.length : counts[value]
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => reset(setCategory)(value)}
              className={cn(
                'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
                selected
                  ? 'bg-brand-600 text-white'
                  : 'text-ink-muted hover:bg-sunken',
              )}
            >
              {label}
              <span
                className={cn(
                  'text-xs tabular-nums',
                  selected ? 'text-white' : 'text-ink-subtle',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:w-72">
          <Search
            aria-hidden="true"
            className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            strokeWidth={1.8}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => reset(setQuery)(e.target.value)}
            aria-label="Search care notes"
            placeholder="Search care notes..."
            className="border-line bg-surface text-ink placeholder:text-ink-subtle focus:border-brand-400 h-10 w-full rounded-lg border pr-3 pl-9 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
          <SelectFilter
            label="Author"
            value={author}
            onChange={reset(setAuthor)}
            options={authorOptions}
          />
          <SelectFilter
            label="Sort"
            value={sort}
            onChange={(v) => reset(setSort)(v as NoteSort)}
            options={noteSortOptions}
          />
        </div>
      </div>

      {/* Filtering otherwise changes the result set silently */}
      <p aria-live="polite" className="text-ink-muted text-sm">
        {rows.length === 0
          ? 'No care notes match these filters'
          : `Showing ${shown.length} of ${rows.length} notes`}
      </p>

      {rows.length === 0 ? (
        <div className="card px-6 py-16 text-center">
          <p className="text-ink-subtle text-sm">
            No care notes match these filters.
          </p>
        </div>
      ) : (
        <section aria-label="Care notes">
          <ul className="space-y-3">
            {shown.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                acknowledged={acknowledged.has(note.id)}
                onAcknowledge={toggleAcknowledge}
              />
            ))}
          </ul>
        </section>
      )}

      {/* aria-disabled, not disabled: a focused button that becomes `disabled`
          is pulled out of the focus order and the browser resets focus to
          <body>, so the final click would strand a keyboard user. */}
      {rows.length > NOTES_PAGE_SIZE && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => remaining > 0 && setVisible((v) => v + NOTES_PAGE_SIZE)}
            aria-disabled={remaining === 0}
            className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium transition-colors aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
          >
            {remaining === 0 ? 'All notes shown' : 'Load More Notes'}
            {remaining > 0 && (
              <span className="text-ink-subtle ml-1.5">({remaining})</span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
