import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { MessagesSquare } from 'lucide-react'
import { SelectFilter } from '@/components/ui/SelectFilter'
import { cn } from '@/lib/cn'
import {
  allThreads,
  awaitingReply,
  searchThreads,
  sortOptions,
  sortThreads,
  useMessageRevision,
} from '@/features/messages/data'
import type { ThreadSort } from '@/features/messages/data'
import {
  allNotices,
  searchNotices,
  sortNotices,
} from '@/features/messages/notices'
import {
  folderCounts,
  folderHints,
  folderLabels,
  isNoticeFolder,
  noticesIn,
  readFolder,
  threadsIn,
} from '@/features/messages/folders'
import { FolderRail } from '@/features/messages/FolderRail'
import { NoticeRow, ThreadRow } from '@/features/messages/InboxList'
import { NoticePane } from '@/features/messages/NoticePane'
import { ThreadPane } from '@/features/messages/ThreadPane'

/**
 * Three panes on a wide screen, one on a narrow one.
 *
 * The open conversation is a route rather than component state, so a thread can
 * be linked to and Back leaves it. The folder, the search and the sort are
 * query parameters on that route for the same reason — and because the rail has
 * to survive opening a message and coming back.
 */
export function MessagesPage() {
  const { entryId } = useParams()
  const [params, setParams] = useSearchParams()

  // Rebuilds when anything is sent, on either store.
  const revision = useMessageRevision()

  const folder = readFolder(params.get('folder'))
  const query = params.get('q') ?? ''
  const sort = (sortOptions.find((o) => o.value === params.get('sort'))?.value ??
    'recent') as ThreadSort

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    // Only keystrokes replace. Picking a folder or a sort is a decision, so
    // Back undoes it.
    setParams(next, { replace: key === 'q' })
  }

  /*
   * `revision` is the dependency: `allThreads()` reads two module-level stores
   * rather than props, and the revision is what says they have moved. ESLint
   * cannot see that from the call.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const threads = useMemo(() => allThreads(), [revision])
  const notices = useMemo(() => allNotices(), [])

  /*
   * Searched before the folder is applied, so the rail counts what the search
   * left rather than advertising thirteen above a list showing one.
   */
  const searchedThreads = useMemo(
    () => searchThreads(threads, query),
    [threads, query],
  )
  const searchedNotices = useMemo(
    () => searchNotices(notices, query),
    [notices, query],
  )
  const counts = folderCounts(searchedThreads, searchedNotices)

  const showingNotices = isNoticeFolder(folder)
  const threadRows = useMemo(
    () => sortThreads(threadsIn(folder, searchedThreads), sort),
    [folder, searchedThreads, sort],
  )
  const noticeRows = useMemo(
    () => sortNotices(noticesIn(folder, searchedNotices)),
    [folder, searchedNotices],
  )
  const rowCount = showingNotices ? noticeRows.length : threadRows.length

  const openThread = threads.find((t) => t.id === entryId)
  const openNotice = notices.find((n) => n.id === entryId)
  const open = Boolean(openThread || openNotice)

  const search = new URLSearchParams({
    ...(folder !== 'all' ? { folder } : {}),
    ...(query ? { q: query } : {}),
    ...(sort !== 'recent' ? { sort } : {}),
  }).toString()
  const suffix = search ? `?${search}` : ''
  const linkTo = (id: string) => `/messages/${id}${suffix}`

  // The open item can sit in another folder or outside the search. Saying so
  // beats a highlighted row the reader cannot find.
  const hidden =
    open &&
    !(showingNotices
      ? noticeRows.some((n) => n.id === entryId)
      : threadRows.some((t) => t.id === entryId))

  const waiting = threads.filter((t) => awaitingReply(t) > 0).length

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-ink-muted mt-1 max-w-2xl text-sm">
            Conversations with caregivers and family contacts, and the visit
            records and announcements that arrive alongside them.{' '}
            {waiting > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setParam('folder', 'awaiting')}
                  className="text-brand-700 font-medium hover:underline"
                >
                  {waiting} {waiting === 1 ? 'thread is' : 'threads are'} waiting
                  on a reply
                </button>
                .
              </>
            ) : (
              'Nothing is waiting on a reply.'
            )}
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[13.5rem_minmax(20rem,26rem)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-6">
          <FolderRail
            folder={folder}
            counts={counts}
            onSelect={(next) => setParam('folder', next === 'all' ? null : next)}
          />
        </div>

        {/* On the narrow layout the list and the open item share one column. */}
        <section
          aria-label={folderLabels[folder]}
          className={cn(
            'card flex min-h-0 min-w-0 flex-col lg:h-[calc(100dvh-16rem)] lg:min-h-[32rem]',
            open && 'hidden lg:flex',
          )}
        >
          <div className="border-line space-y-2.5 border-b p-3">
            <div>
              <h2 className="text-ink text-sm font-semibold tracking-tight">
                {folderLabels[folder]}
              </h2>
              <p className="text-ink-subtle mt-0.5 text-xs">
                {folderHints[folder]}
              </p>
            </div>
            <label className="block">
              <span className="sr-only">Search messages</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder="Search people, clients or message text"
                className="border-line focus:border-brand-500 h-10 w-full rounded-lg border px-3 text-sm"
              />
            </label>
            {!showingNotices && (
              <SelectFilter
                label="Sort"
                value={sort}
                onChange={(v) => setParam('sort', v === 'recent' ? null : v)}
                options={sortOptions}
              />
            )}
          </div>

          {hidden && (
            <p className="border-brand-200 bg-brand-50 text-brand-800 m-3 rounded-lg border px-3 py-2 text-xs">
              What you have open is not in this folder.{' '}
              <Link
                to={`/messages/${entryId}`}
                className="font-semibold underline"
              >
                Clear the filters
              </Link>{' '}
              to see its row.
            </p>
          )}

          {rowCount === 0 ? (
            <p role="status" className="text-ink-subtle px-4 py-12 text-center text-sm">
              Nothing here matches.
            </p>
          ) : (
            <ul className="divide-line min-h-0 flex-1 divide-y overflow-y-auto">
              {showingNotices
                ? noticeRows.map((notice) => (
                    <NoticeRow
                      key={notice.id}
                      notice={notice}
                      to={linkTo(notice.id)}
                      selected={notice.id === entryId}
                    />
                  ))
                : threadRows.map((thread) => (
                    <ThreadRow
                      key={thread.id}
                      thread={thread}
                      to={linkTo(thread.id)}
                      selected={thread.id === entryId}
                    />
                  ))}
            </ul>
          )}
        </section>

        <div
          className={cn(
            'min-h-0 min-w-0 lg:h-[calc(100dvh-16rem)] lg:min-h-[32rem]',
            !open && 'hidden lg:block',
          )}
        >
          {openThread ? (
            <ThreadPane thread={openThread} backTo={`/messages${suffix}`} />
          ) : openNotice ? (
            <NoticePane notice={openNotice} backTo={`/messages${suffix}`} />
          ) : (
            <div className="card grid h-full place-items-center px-6 py-16 text-center">
              <div>
                <span className="bg-sunken text-ink-subtle mx-auto grid size-11 place-items-center rounded-full">
                  <MessagesSquare className="size-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <p className="text-ink mt-3 text-sm font-semibold">
                  Nothing open
                </p>
                <p className="text-ink-muted mx-auto mt-1 max-w-xs text-sm">
                  {showingNotices
                    ? 'Pick a record on the left. Nothing in this folder was sent by anyone, so none of it can be replied to.'
                    : 'Pick a conversation on the left. Family threads read and write the communication log on the care record, so a reply sent here shows up there.'}
                </p>
                {counts.awaiting > 0 && (
                  <button
                    type="button"
                    onClick={() => setParam('folder', 'awaiting')}
                    className="text-brand-700 mt-3 text-sm font-medium hover:underline"
                  >
                    Show the {counts.awaiting} waiting on a reply
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
