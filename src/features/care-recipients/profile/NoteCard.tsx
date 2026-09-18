import { Flag, HeartPulse, MessageSquare, MoreHorizontal, Paperclip } from 'lucide-react'
import type { CareNoteEntry } from '../notes-data'
import {
  formatNoteTime,
  noteCategoryLabels,
  noteCategoryTones,
} from '../notes-data'
import { Avatar } from '@/components/ui/Avatar'
import { toneDot, tonePill } from '@/lib/tone'
import { cn } from '@/lib/cn'

interface NoteCardProps {
  note: CareNoteEntry
  acknowledged: boolean
  onAcknowledge: (id: string) => void
}

export function NoteCard({ note, acknowledged, onAcknowledge }: NoteCardProps) {
  const tone = noteCategoryTones[note.category]

  return (
    <li
      className={cn(
        'relative overflow-hidden rounded-xl border',
        note.flagged ? 'border-red-200 bg-red-50/40' : 'border-line bg-surface',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          note.flagged ? 'bg-red-500' : toneDot[tone],
        )}
      />

      <div className="p-4 pl-5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={note.author} decorative className="size-9" />
            <div className="min-w-0">
              <p className="text-ink text-sm font-semibold break-words">
                {note.author}{' '}
                <span className="text-ink-subtle font-normal">
                  • {note.authorRole}
                </span>
              </p>
              <p className="text-brand-700 mt-0.5 text-xs">
                <time dateTime={note.at}>{formatNoteTime(note.at)}</time>
              </p>
            </div>
          </div>

          {/* Wraps internally — on a flagged card the badge, pill and menu
              together exceed 320px, and the li clips rather than scrolls. */}
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
            {note.flagged && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-amber-800 uppercase">
                <Flag className="size-3 shrink-0" aria-hidden="true" />
                Flagged for review
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                tonePill[tone],
              )}
            >
              {noteCategoryLabels[note.category]}
            </span>
            <button
              type="button"
              aria-label={`More actions for note by ${note.author}`}
              className="text-ink-subtle hover:bg-sunken hover:text-ink grid size-9 shrink-0 place-items-center rounded-lg"
            >
              <MoreHorizontal className="size-4.5" />
            </button>
          </div>
        </div>

        <p className="text-ink-muted mt-3 text-sm leading-relaxed break-words">
          {note.body}
        </p>
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-2.5 pl-5',
          note.flagged ? 'border-red-200' : 'border-line',
        )}
      >
        {/* Constant accessible name + aria-pressed for state — a name that
            also changes would announce the toggle twice. Naming the author
            keeps the buttons distinguishable in a feed of identical actions. */}
        <button
          type="button"
          onClick={() => onAcknowledge(note.id)}
          aria-pressed={acknowledged}
          aria-label={`Acknowledge note by ${note.author}, ${formatNoteTime(note.at)}`}
          className={cn(
            'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors',
            acknowledged
              ? 'text-emerald-700'
              : 'text-ink-muted hover:bg-sunken hover:text-ink',
          )}
        >
          {/* The design draws acknowledgement with a heart-pulse, not a tick.
              Same glyph in both states — the label and colour carry the change,
              and a heavier stroke at this size just fills the glyph in. */}
          <HeartPulse className="size-3.5 shrink-0" aria-hidden="true" />
          {acknowledged ? 'Acknowledged' : 'Acknowledge'}
        </button>

        <button
          type="button"
          aria-label={`Add comment to note by ${note.author}, ${formatNoteTime(note.at)} (${note.comments} existing)`}
          className="text-ink-muted hover:bg-sunken hover:text-ink inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors"
        >
          <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />
          Add comment ({note.comments})
        </button>

        <p className="text-ink-subtle ml-auto inline-flex items-center gap-1.5 text-xs">
          <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
          {note.attachments === 0
            ? 'No attachments'
            : `${note.attachments} attachment${note.attachments === 1 ? '' : 's'}`}
        </p>
      </div>
    </li>
  )
}
