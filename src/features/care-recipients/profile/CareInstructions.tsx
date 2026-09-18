import { Activity, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Instruction, InstructionLevel } from '../care-plan-data'
import { Panel } from '@/components/ui/Panel'
import { cn } from '@/lib/cn'

/** Standard instructions carry no rule; only a level worth flagging gets one. */
const accent: Partial<Record<InstructionLevel, string>> = {
  caution: 'bg-caution',
  critical: 'bg-critical',
}

const text: Record<InstructionLevel, string> = {
  standard: 'text-ink',
  // The design's caution colour is 3.1:1 on this fill. That is enough for the
  // rule and the icon, which only have to be visible, and short of the 4.5:1
  // that text needs — and this is the line that says a resident gets confused
  // in the late afternoon. amber-700 is the same hue at 4.81:1.
  caution: 'text-amber-700 font-medium',
  critical: 'text-critical font-medium',
}

const iconColour: Record<InstructionLevel, string> = {
  standard: 'text-ink-subtle',
  caution: 'text-caution',
  critical: 'text-critical',
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
            // Filled rather than outlined: the design draws these as tinted
            // blocks, and an outline plus a coloured rule gave the critical
            // ones two competing left edges.
            className="bg-sunken relative flex items-center gap-2.5 overflow-hidden rounded-lg py-2.5 pr-3 pl-4"
          >
            {accent[item.level] && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-y-0 left-0 w-1',
                  accent[item.level],
                )}
              />
            )}
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
