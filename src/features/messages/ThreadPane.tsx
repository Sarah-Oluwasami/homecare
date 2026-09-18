import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Phone, Send } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { RecipientStatusBadge } from '@/components/ui/StatusBadge'
import { SIGNED_IN } from '@/lib/session'
import { cn } from '@/lib/cn'
import { telHref } from '@/features/monitoring/live-data'
import {
  formatClock,
  formatThreadDay,
  sendMessage,
  threadContext,
} from './data'
import type { ContactMark, Message, Thread } from './data'

/* --------------------------------- rows ----------------------------------- */

type Row =
  | { kind: 'day'; key: string; at: string }
  | { kind: 'message'; key: string; message: Message }
  | { kind: 'mark'; key: string; mark: ContactMark }

/**
 * Messages and logged contacts in one column, cut into days.
 *
 * A contact with no clock sorts to the head of its day rather than being given
 * a time to sort by — the log records which day somebody rang, and nothing
 * more.
 */
function rowsFor(thread: Thread): Row[] {
  const entries: { at: string; time: string; row: Row }[] = [
    ...thread.messages.map((message) => ({
      at: message.at,
      time: message.time ?? '00:00',
      row: { kind: 'message', key: message.id, message } as Row,
    })),
    ...thread.marks.map((mark) => ({
      at: mark.at,
      time: '00:00',
      row: { kind: 'mark', key: mark.id, mark } as Row,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at) || a.time.localeCompare(b.time))

  const rows: Row[] = []
  let day: string | null = null
  for (const entry of entries) {
    if (entry.at !== day) {
      day = entry.at
      rows.push({ kind: 'day', key: `day-${entry.at}`, at: entry.at })
    }
    rows.push(entry.row)
  }
  return rows
}

/* -------------------------------- the pane -------------------------------- */

export function ThreadPane({
  thread,
  backTo,
}: {
  thread: Thread
  /** Returns to the list on the narrow layout, where the two share the column. */
  backTo: string
}) {
  const context = thread.about ? threadContext(thread.about.id) : undefined
  const log = useRef<HTMLDivElement>(null)

  /*
   * Open on the latest message, not the oldest. Keyed on the thread and the
   * message count, so switching conversation and sending both land at the
   * bottom — a thread that opened at the top of a year-old exchange read as
   * having nothing recent in it.
   */
  useEffect(() => {
    const panel = log.current
    if (panel) panel.scrollTop = panel.scrollHeight
  }, [thread.id, thread.messages.length])

  return (
    <section
      aria-label={`Conversation with ${thread.name}`}
      className="card flex min-h-0 flex-col lg:h-full"
    >
      <header className="border-line flex flex-wrap items-center gap-3 border-b p-4">
        <Link
          to={backTo}
          className="text-ink-muted hover:text-ink -ml-1 inline-flex size-9 items-center justify-center rounded-lg lg:hidden"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden="true" />
          <span className="sr-only">Back to the inbox</span>
        </Link>
        <Avatar name={thread.name} decorative className="size-10 text-sm" />
        <div className="min-w-0 flex-1">
          <h2 className="text-ink truncate text-base font-semibold tracking-tight">
            {thread.name}
          </h2>
          <p className="text-ink-subtle text-xs">
            {thread.role}
            {thread.about && (
              <>
                {' · about '}
                <Link
                  to={`/care-recipients/${thread.about.id}/overview`}
                  className="text-brand-700 hover:underline"
                >
                  {thread.about.name}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/*
           * Two actions, both of which do something. The source design put a
           * video-call button beside the phone; nothing in this app places a
           * call, and a number is the only contact detail every one of these
           * people actually carries.
           */}
          <a
            href={telHref(thread.phone)}
            className="border-control text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium"
          >
            <Phone className="size-4" strokeWidth={1.9} aria-hidden="true" />
            <span className="hidden sm:inline">{thread.phone}</span>
            <span className="sr-only sm:hidden">Call {thread.name}</span>
          </a>
          <Link
            to={thread.to}
            className="border-line text-ink hover:bg-sunken inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium"
          >
            <ExternalLink className="size-4" strokeWidth={1.9} aria-hidden="true" />
            <span className="hidden sm:inline">Open record</span>
            <span className="sr-only sm:hidden">Open {thread.name}&rsquo;s record</span>
          </Link>
        </div>
      </header>

      {thread.kind === 'family' && thread.about && (
        <p className="border-line bg-sunken text-ink-muted border-b px-4 py-2.5 text-xs">
          This thread is the communication log on{' '}
          <Link
            to={`/care-recipients/${thread.about.id}/family`}
            className="text-brand-700 font-medium hover:underline"
          >
            {thread.about.name}&rsquo;s record
          </Link>
          . The log keeps a subject line and the day it happened, so these carry
          no time of day.
        </p>
      )}

      <div ref={log} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {rowsFor(thread).map((row) => {
          if (row.kind === 'day') return <DaySeparator key={row.key} at={row.at} />
          if (row.kind === 'mark') return <Mark key={row.key} mark={row.mark} />
          return <Bubble key={row.key} message={row.message} />
        })}
      </div>

      {context && (
        <div className="border-line bg-canvas border-t px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Link
              to={`/care-recipients/${context.recipient.id}/overview`}
              className="text-ink hover:text-brand-700 text-sm font-semibold"
            >
              {context.recipient.name}
            </Link>
            <RecipientStatusBadge status={context.recipient.status} />
            {context.hasCarePlan && (
              <Link
                to={`/care-recipients/${context.recipient.id}/care-plan`}
                className="text-brand-700 text-xs font-medium hover:underline"
              >
                Care plan
              </Link>
            )}
            {context.hasMedicationPlan && (
              <Link
                to={`/care-recipients/${context.recipient.id}/medications`}
                className="text-brand-700 text-xs font-medium hover:underline"
              >
                Medications
              </Link>
            )}
          </div>
          <p className="text-ink-muted mt-1.5 text-xs">
            {context.next ? (
              <>
                Next visit{' '}
                <Link
                  to={`/scheduling/visits/${context.next.id}`}
                  className="text-brand-700 font-medium hover:underline"
                >
                  {context.next.reference}
                </Link>{' '}
                — {formatThreadDay(context.next.date)} at{' '}
                {formatClock(context.next.start)},{' '}
                {context.next.caregiverName ?? 'nobody assigned yet'}.
              </>
            ) : (
              'Nothing on the board for them in the next seven days.'
            )}
            {context.medications.length > 0 && (
              <> Currently on {context.medications.join(', ')}.</>
            )}
          </p>
        </div>
      )}

      <Composer thread={thread} />
    </section>
  )
}

/* --------------------------------- pieces --------------------------------- */

function DaySeparator({ at }: { at: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="bg-line h-px flex-1" />
      <span className="text-ink-subtle text-xs font-semibold">
        {formatThreadDay(at)}
      </span>
      <span aria-hidden="true" className="bg-line h-px flex-1" />
    </div>
  )
}

function Bubble({ message }: { message: Message }) {
  const outbound = message.direction === 'outbound'

  return (
    <div className={cn('flex flex-col', outbound ? 'items-end' : 'items-start')}>
      <p className="text-ink-subtle mb-1 text-xs">
        <span className="text-ink-muted font-medium">
          {outbound && message.author === SIGNED_IN
            ? `${message.author} (you)`
            : message.author}
        </span>
        {message.time && <> · {formatClock(message.time)}</>}
        {message.channel !== 'App Message' && <> · {message.channel}</>}
      </p>
      <p
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm break-words sm:max-w-[38rem]',
          outbound
            ? 'bg-brand-600 rounded-br-sm text-white'
            : 'bg-sunken text-ink rounded-bl-sm',
          // A subject line off the log is a record of a message, not the
          // message. Rendering it as if it were the words somebody typed is
          // the one thing this thread must not do.
          message.fromLog && 'italic',
        )}
      >
        {message.body}
      </p>
    </div>
  )
}

function Mark({ mark }: { mark: ContactMark }) {
  return (
    <p className="text-ink-subtle text-center text-xs">
      {mark.type} logged — &ldquo;{mark.subject}&rdquo;, {mark.staff}
    </p>
  )
}

function Composer({ thread }: { thread: Thread }) {
  const [draft, setDraft] = useState('')
  const empty = draft.trim() === ''

  return (
    <form
      className="border-line border-t p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (empty) return
        sendMessage(thread, draft)
        setDraft('')
      }}
    >
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Message {thread.name}</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line — the shape everyone
              // already has in their fingers from every other messenger.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            rows={2}
            placeholder={`Message ${thread.name.split(' ')[0]}`}
            className="border-line focus:border-brand-500 w-full resize-y rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={empty}
          className="bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white"
        >
          <Send className="size-4" strokeWidth={2} aria-hidden="true" />
          Send
        </button>
      </div>
      <p className="text-ink-subtle mt-2 text-xs">
        {thread.kind === 'family' && thread.about
          ? `Sent as ${SIGNED_IN} and written to ${thread.about.name}'s communication log, for this session only — there is no server behind this.`
          : `Sent as ${SIGNED_IN}, kept for this session only — there is no server behind this.`}
      </p>
    </form>
  )
}
