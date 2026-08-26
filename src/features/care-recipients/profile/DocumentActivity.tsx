import type { CareDocument } from '../documents-data'
import { formatUploadDate } from '../documents-data'
import { Panel } from '@/components/ui/Panel'

/** Human-readable form of a filename: Care_Plan_July_2026.pdf → Care Plan July 2026 */
function readableName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/_/g, ' ')
}

export function DocumentActivity({ documents }: { documents: CareDocument[] }) {
  // Derived from the library, so it can't drift from the table above it.
  const recent = [...documents]
    .sort(
      (a, b) =>
        b.uploadedAt.localeCompare(a.uploadedAt) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 3)

  if (recent.length === 0) return null

  return (
    <Panel title="Recent Document Activity">
      <ol className="space-y-4">
        {recent.map((d) => (
          <li key={d.id} className="flex gap-3">
            <span
              aria-hidden="true"
              className="bg-brand-600 mt-1.5 size-2 shrink-0 rounded-full"
            />
            <div className="min-w-0">
              <p className="text-ink-subtle text-xs">
                {formatUploadDate(d.uploadedAt)}
              </p>
              <p className="text-ink-muted mt-0.5 text-sm break-words">
                <span className="text-ink font-semibold">
                  {readableName(d.name)}
                </span>{' '}
                was uploaded by{' '}
                <span className="text-ink font-semibold">{d.uploadedBy}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
