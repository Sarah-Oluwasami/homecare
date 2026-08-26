import { Activity, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Instruction, InstructionLevel } from '../care-plan-data'
import { Panel } from '@/components/ui/Panel'
import { cn } from '@/lib/cn'

const accent: Record<InstructionLevel, string> = {
  standard: 'bg-line',
  caution: 'bg-amber-500',
  critical: 'bg-red-500',
}

const text: Record<InstructionLevel, string> = {
  standard: 'text-ink-muted',
  caution: 'text-amber-700 font-medium',
  critical: 'text-red-700 font-medium',
}

const iconColour: Record<InstructionLevel, string> = {
  standard: 'text-ink-subtle',
  caution: 'text-amber-600',
  critical: 'text-red-600',
}

function InstructionList({
  heading,
  items,
  icon: Icon,
}: {
  heading: string
  items: Instruction[]
  icon: LucideIcon
}) {
  const headingId = `instructions-${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <div>
      <h3 id={headingId} className="text-ink text-sm font-semibold">
        {heading}
      </h3>

      <ul aria-labelledby={headingId} className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="border-line relative flex items-center gap-2.5 overflow-hidden rounded-lg border py-2.5 pr-3 pl-4"
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-y-0 left-0 w-1',
                accent[item.level],
              )}
            />
            <Icon
              className={cn('size-4 shrink-0', iconColour[item.level])}
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <span className={cn('min-w-0 text-sm break-words', text[item.level])}>
              {/* Level is otherwise conveyed by hue alone (WCAG 1.4.1) */}
              {item.level !== 'standard' && (
                <span className="sr-only">
                  {item.level === 'critical' ? 'Critical: ' : 'Caution: '}
                </span>
              )}
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CareInstructions({
  medicalNeeds,
  behavioural,
}: {
  medicalNeeds: Instruction[]
  behavioural: Instruction[]
}) {
  return (
    <Panel title="Care Instructions">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
        <InstructionList
          heading="Medical Needs"
          items={medicalNeeds}
          icon={Activity}
        />
        <InstructionList
          heading="Behavioral Notes & Protocols"
          items={behavioural}
          icon={MessageSquare}
        />
      </div>
    </Panel>
  )
}
