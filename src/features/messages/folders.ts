import {
  Bell,
  ClipboardCheck,
  Heart,
  Inbox,
  Reply,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { awaitingReply } from './data'
import type { Thread } from './data'
import type { Notice } from './notices'

/**
 * The rail.
 *
 * Two groups, not one list. The first four are conversations somebody is on the
 * other end of; the last two are records and broadcasts, which can be read and
 * opened and nothing else. Filing them as six equal folders is what let the
 * source design put a reply box under a check-in confirmation.
 */
export type Folder =
  | 'all'
  | 'awaiting'
  | 'caregivers'
  | 'families'
  | 'visits'
  | 'announcements'

export const conversationFolders: Folder[] = [
  'all',
  'awaiting',
  'caregivers',
  'families',
]

export const noticeFolders: Folder[] = ['visits', 'announcements']

export const folderLabels: Record<Folder, string> = {
  all: 'All conversations',
  // Not "Unread". Nothing in this app records that anybody has read a message,
  // so the count is of messages waiting on a reply — the same walk the families
  // directory calls an unanswered message.
  awaiting: 'Needs a reply',
  caregivers: 'Caregivers',
  families: 'Families',
  visits: 'Visit records',
  announcements: 'Announcements',
}

export const folderHints: Record<Folder, string> = {
  all: 'Every conversation with a caregiver or a family contact.',
  awaiting: 'Threads whose last message came in and has had no answer since.',
  caregivers: 'Staff on the roster.',
  families: 'Family contacts, reading the same log as each care record.',
  visits: 'Visit records filed in the last seven days. Read-only.',
  announcements: 'Written to everyone. There is nowhere to reply.',
}

export const folderIcons: Record<Folder, LucideIcon> = {
  all: Inbox,
  awaiting: Reply,
  caregivers: UserRound,
  families: Heart,
  visits: ClipboardCheck,
  announcements: Bell,
}

export function isNoticeFolder(folder: Folder): boolean {
  return folder === 'visits' || folder === 'announcements'
}

const all: Folder[] = [...conversationFolders, ...noticeFolders]

/** Falls back to the inbox rather than 404ing on a hand-edited query string. */
export function readFolder(value: string | null): Folder {
  return all.includes(value as Folder) ? (value as Folder) : 'all'
}

export function threadsIn(folder: Folder, list: Thread[]): Thread[] {
  switch (folder) {
    case 'awaiting':
      return list.filter((t) => awaitingReply(t) > 0)
    case 'caregivers':
      return list.filter((t) => t.kind === 'caregiver')
    case 'families':
      return list.filter((t) => t.kind === 'family')
    default:
      return list
  }
}

export function noticesIn(folder: Folder, list: Notice[]): Notice[] {
  if (folder === 'visits') return list.filter((n) => n.kind === 'visit')
  if (folder === 'announcements')
    return list.filter((n) => n.kind === 'announcement')
  return []
}

/**
 * Counted from what the search left rather than from everything, so the rail
 * and the list beside it never disagree about how many there are.
 */
export function folderCounts(
  threads: Thread[],
  notices: Notice[],
): Record<Folder, number> {
  return {
    all: threads.length,
    awaiting: threadsIn('awaiting', threads).length,
    caregivers: threadsIn('caregivers', threads).length,
    families: threadsIn('families', threads).length,
    visits: noticesIn('visits', notices).length,
    announcements: noticesIn('announcements', notices).length,
  }
}
