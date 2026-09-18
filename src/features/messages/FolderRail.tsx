import { cn } from '@/lib/cn'
import {
  conversationFolders,
  folderIcons,
  folderLabels,
  noticeFolders,
} from './folders'
import type { Folder } from './folders'

interface FolderRailProps {
  folder: Folder
  counts: Record<Folder, number>
  onSelect: (folder: Folder) => void
}

/**
 * Vertical beside the list from `lg`, a horizontal rail of chips below it —
 * the same pattern the live board and the alerts register use for their filter
 * rails, rather than a fourth column that would leave nothing for the reading.
 */
export function FolderRail({ folder, counts, onSelect }: FolderRailProps) {
  return (
    <nav aria-label="Message folders" className="min-w-0 lg:card lg:p-2">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible">
        <Group
          heading="Conversations"
          folders={conversationFolders}
          folder={folder}
          counts={counts}
          onSelect={onSelect}
        />
        <span
          aria-hidden="true"
          className="bg-line hidden h-px shrink-0 lg:my-2 lg:block"
        />
        <Group
          heading="Notices"
          folders={noticeFolders}
          folder={folder}
          counts={counts}
          onSelect={onSelect}
        />
      </div>
    </nav>
  )
}

function Group({
  heading,
  folders,
  folder,
  counts,
  onSelect,
}: FolderRailProps & { heading: string; folders: Folder[] }) {
  return (
    <>
      <h2 className="text-ink-subtle hidden px-2 pt-1 pb-1.5 text-xs font-semibold tracking-wider uppercase lg:block">
        {heading}
      </h2>
      {folders.map((value) => {
        const Icon = folderIcons[value]
        const active = folder === value
        return (
          <button
            key={value}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(value)}
            className={cn(
              `flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium
               whitespace-nowrap transition-colors lg:w-full`,
              active
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-muted hover:bg-sunken hover:text-ink',
            )}
          >
            <Icon
              className={cn('size-4 shrink-0', active && 'text-brand-600')}
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <span className="min-w-0 lg:truncate">{folderLabels[value]}</span>
            <span
              className={cn(
                'ml-auto pl-1 text-xs tabular-nums',
                active ? 'text-brand-700' : 'text-ink-subtle',
              )}
            >
              {counts[value]}
            </span>
          </button>
        )
      })}
    </>
  )
}
