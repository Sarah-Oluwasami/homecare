import { Link } from 'react-router-dom'
import { Bell, ClipboardCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import { tonePill } from '@/lib/tone'
import { awaitingReply, formatStamp, lastMessage } from './data'
import type { Thread } from './data'
import type { Notice } from './notices'
import { formatNoticeStamp } from './notices'

const chip =
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap'

export function ThreadRow({
  thread,
  to,
  selected,
}: {
  thread: Thread
  to: string
  selected: boolean
}) {
  const last = lastMessage(thread)
  const waiting = awaitingReply(thread)

  return (
    <li>
      <Link
        to={to}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'flex gap-3 px-4 py-3 transition-colors',
          selected
            ? 'border-brand-500 bg-brand-50 border-l-4 pl-3'
            : 'hover:bg-canvas',
        )}
      >
        <Avatar name={thread.name} decorative className="size-9" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="text-ink truncate text-sm font-semibold">
              {thread.name}
            </span>
            <span
              className={cn(
                chip,
                thread.kind === 'caregiver'
                  ? tonePill.green
                  : tonePill.purple,
                'shrink-0',
              )}
            >
              {thread.kind === 'caregiver' ? 'Caregiver' : 'Family'}
            </span>
            <span className="text-ink-subtle ml-auto shrink-0 text-xs whitespace-nowrap">
              {last ? formatStamp(last) : ''}
            </span>
          </span>
          {thread.about && (
            <span className="text-ink-subtle mt-0.5 block truncate text-xs">
              About {thread.about.name}
            </span>
          )}
          <span className="mt-1 flex items-end gap-2">
            <span className="text-ink-muted line-clamp-2 min-w-0 flex-1 text-sm">
              {last
                ? `${last.direction === 'outbound' ? 'You: ' : ''}${last.body}`
                : 'No messages yet'}
            </span>
            {waiting > 0 && (
              <span
                className="bg-brand-600 grid size-5 shrink-0 place-items-center rounded-full text-xs font-semibold text-white tabular-nums"
                title={`${waiting} message${waiting === 1 ? '' : 's'} waiting on a reply`}
              >
                {waiting}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}

export function NoticeRow({
  notice,
  to,
  selected,
}: {
  notice: Notice
  to: string
  selected: boolean
}) {
  const Icon = notice.kind === 'visit' ? ClipboardCheck : Bell

  return (
    <li>
      <Link
        to={to}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'flex gap-3 px-4 py-3 transition-colors',
          selected
            ? 'border-brand-500 bg-brand-50 border-l-4 pl-3'
            : 'hover:bg-canvas',
        )}
      >
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            notice.kind === 'visit'
              ? 'bg-blue-50 text-blue-600'
              : 'bg-amber-50 text-amber-600',
          )}
        >
          <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="text-ink truncate text-sm font-semibold">
              {notice.title}
            </span>
            <span className="text-ink-subtle ml-auto shrink-0 text-xs whitespace-nowrap">
              {formatNoticeStamp(notice)}
            </span>
          </span>
          <span className="text-ink-subtle mt-0.5 block truncate text-xs">
            {notice.reference ?? `From ${notice.author}`}
          </span>
          <span className="text-ink-muted mt-1 line-clamp-2 block text-sm">
            {notice.body}
          </span>
        </span>
      </Link>
    </li>
  )
}
