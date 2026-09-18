import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bell, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatNoticeDate } from './notices'
import type { Notice } from './notices'

/**
 * A notice opened.
 *
 * There is no composer, and that is the point of keeping these out of the
 * conversation folders: a visit record has nobody on the other end of it, and
 * an announcement went to everyone at once with no thread to answer in.
 */
export function NoticePane({
  notice,
  backTo,
}: {
  notice: Notice
  backTo: string
}) {
  const visit = notice.kind === 'visit'
  const Icon = visit ? ClipboardCheck : Bell

  return (
    <section
      aria-label={notice.title}
      className="card flex min-h-0 flex-col lg:h-full"
    >
      <header className="border-line flex flex-wrap items-start gap-3 border-b p-4">
        <Link
          to={backTo}
          className="text-ink-muted hover:text-ink -ml-1 inline-flex size-9 items-center justify-center rounded-lg lg:hidden"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden="true" />
          <span className="sr-only">Back to the inbox</span>
        </Link>
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full',
            visit ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600',
          )}
        >
          <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-ink text-base font-semibold tracking-tight">
            {notice.title}
          </h2>
          <p className="text-ink-subtle mt-0.5 text-xs">
            {notice.reference && <>{notice.reference} · </>}
            {notice.author ? `Written by ${notice.author}` : 'From the visit record'}
            {' · '}
            {formatNoticeDate(notice)}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="text-ink text-sm">{notice.body}</p>

        {notice.to && (
          <Link
            to={notice.to}
            className="text-brand-700 hover:text-brand-800 mt-4 inline-flex items-center gap-1.5 text-sm font-medium"
          >
            {visit ? 'Open the visit record' : 'Open the related screen'}
            <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          </Link>
        )}
      </div>

      <p className="border-line text-ink-subtle border-t p-4 text-xs">
        {visit
          ? 'Assembled from the visit record, not sent by anyone — there is nobody to reply to. Anything on this visit that needs a decision is an alert, and lives on Alerts & Incidents.'
          : 'Written to everyone at once. This app has no group conversation for a reply to land in, so there is no reply box here.'}
      </p>
    </section>
  )
}
