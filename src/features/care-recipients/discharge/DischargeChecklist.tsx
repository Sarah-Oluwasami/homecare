import { Check, Circle, CircleAlert, TriangleAlert } from 'lucide-react'
import type {
  CheckState,
  ChecklistItem,
  DischargeAction,
} from '../discharge-data'
import { Panel } from '@/components/ui/Panel'
import { cn } from '@/lib/cn'

const marker: Record<
  CheckState,
  { icon: typeof Check; chip: string; label: string }
> = {
  clear: { icon: Check, chip: 'bg-emerald-100 text-emerald-700', label: 'Clear' },
  attention: {
    icon: TriangleAlert,
    chip: 'bg-amber-100 text-amber-700',
    label: 'Needs attention',
  },
  blocked: {
    icon: CircleAlert,
    chip: 'bg-red-100 text-red-700',
    label: 'Blocking',
  },
  'not-started': {
    icon: Circle,
    chip: 'bg-slate-100 text-slate-500',
    label: 'Not started',
  },
}

const detailTone: Record<CheckState, string> = {
  clear: 'text-ink-subtle',
  attention: 'text-amber-700',
  blocked: 'text-red-700',
  'not-started': 'text-ink-subtle',
}

export function DischargeChecklist({
  items,
  action,
}: {
  items: ChecklistItem[]
  action: DischargeAction
}) {
  const blocking = items.filter((i) => i.state === 'blocked').length
  const attention = items.filter((i) => i.state === 'attention').length

  return (
    <Panel
      title={action === 'discharge' ? 'Discharge Checklist' : 'Hold Checklist'}
      badge={
        blocking > 0 ? (
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            {blocking} blocking
          </span>
        ) : attention > 0 ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            {attention} to review
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            Ready
          </span>
        )
      }
    >
      <ul className="space-y-3">
        {items.map((item) => {
          const { icon: Icon, chip, label } = marker[item.state]
          return (
            <li key={item.id} className="flex gap-3">
              <span
                className={cn(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                  chip,
                )}
              >
                <Icon className="size-3" strokeWidth={3} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-ink text-sm font-semibold break-words">
                  {item.label}
                  {/* State is otherwise carried by icon and hue alone */}
                  <span className="sr-only"> — {label}</span>
                </p>
                <p
                  className={cn('mt-0.5 text-xs break-words', detailTone[item.state])}
                >
                  {item.detail}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
