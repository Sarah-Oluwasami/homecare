import { Fragment, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { CareGoal, GoalStatus } from '../care-plan-data'
import { goalBarFill as barFill, goalStatusLabels as statusLabels } from '../care-plan-data'
import { Panel } from '@/components/ui/Panel'
import { cn } from '@/lib/cn'

const statusStyles: Record<GoalStatus, string> = {
  'on-track': 'bg-emerald-50 text-emerald-700',
  'needs-attention': 'bg-amber-50 text-amber-700',
  'at-risk': 'bg-red-50 text-red-700',
}

function GoalProgress({ goal }: { goal: CareGoal }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-valuenow={goal.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${goal.title} progress`}
        className="bg-sunken h-1.5 w-full min-w-16 overflow-hidden rounded-full"
      >
        <div
          className={cn('h-full rounded-full', barFill[goal.status])}
          style={{ width: `${goal.percent}%` }}
        />
      </div>
      <span className="text-ink-muted shrink-0 text-sm tabular-nums">
        {goal.percent}%
      </span>
    </div>
  )
}

function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        statusStyles[status],
      )}
    >
      {statusLabels[status]}
    </span>
  )
}

function GoalDetail({ goal }: { goal: CareGoal }) {
  return (
    <div className="bg-canvas rounded-lg p-3">
      <p className="text-ink-muted text-sm leading-relaxed">{goal.intent}</p>
      <dl className="text-ink-subtle mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <div className="flex gap-1.5">
          <dt>Target:</dt>
          <dd className="text-ink-muted font-medium">{goal.target}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Last reviewed by:</dt>
          <dd className="text-ink-muted font-medium">{goal.reviewedBy}</dd>
        </div>
      </dl>
    </div>
  )
}

export function CareGoals({ goals }: { goals: CareGoal[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const toggle = (id: string) => setExpanded((c) => (c === id ? null : id))

  return (
    <Panel title="Care Goals" flush>
      {/* Desktop: table. The disclosure button is the only focusable cell, so
          the region doesn't need its own tabIndex. */}
      <div className="hidden overflow-x-auto px-4 lg:block">
        {/* 2xl (672px) fits the ~718px content box at 1024 — 3xl would scroll
            the Details column, the only control that reveals clinical intent */}
        <table className="w-full min-w-2xl text-left text-sm">
          <thead className="border-line bg-sunken text-ink-muted border-b text-xs">
            <tr>
              <th scope="col" className="py-2.5 pr-4 font-semibold tracking-wide uppercase">
                Goal &amp; Clinical Intent
              </th>
              <th scope="col" className="w-56 py-2.5 pr-4 font-semibold tracking-wide uppercase">
                Progress
              </th>
              <th scope="col" className="w-40 py-2.5 pr-4 font-semibold tracking-wide uppercase">
                Status
              </th>
              <th scope="col" className="w-20 py-2.5 text-right font-semibold tracking-wide uppercase">
                Details
              </th>
            </tr>
          </thead>

          {/* Borders go on the goal rows, not via `divide-y` — that would draw
              a rule between a goal and its own expanded detail row. */}
          <tbody>
            {goals.map((goal, i) => {
              const open = expanded === goal.id
              return (
                // A detail row is a sibling <tr>, so the pair needs a keyed
                // Fragment rather than a bare one.
                <Fragment key={goal.id}>
                  <tr className={cn(i > 0 && 'border-line border-t')}>
                    <th scope="row" className="py-3 pr-4 font-normal">
                      <span className="flex items-center gap-3">
                        {/* The goal's place in the plan, given its own chip so
                            the column starts on something countable. */}
                        <span className="bg-brand-50 text-brand-700 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums">
                          {i + 1}
                        </span>
                        <span className="text-ink font-semibold">{goal.title}</span>
                      </span>
                    </th>
                    <td className="py-3 pr-4">
                      <GoalProgress goal={goal} />
                    </td>
                    <td className="py-3 pr-4">
                      <GoalStatusBadge status={goal.status} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggle(goal.id)}
                        aria-expanded={open}
                        aria-controls={open ? `goal-detail-${goal.id}` : undefined}
                        className="text-ink-subtle hover:bg-sunken hover:text-ink grid size-9 place-items-center rounded-lg"
                      >
                        <span className="sr-only">
                          {open ? 'Hide' : 'Show'} details for {goal.title}
                        </span>
                        <ChevronDown
                          className={cn(
                            'size-4.5 transition-transform',
                            open && 'rotate-180',
                          )}
                        />
                      </button>
                    </td>
                  </tr>

                  {open && (
                    <tr id={`goal-detail-${goal.id}`}>
                      <td colSpan={4} className="pt-0 pb-3">
                        <GoalDetail goal={goal} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: the same rows as a disclosure list */}
      <ul className="divide-line divide-y px-4 lg:hidden">
        {goals.map((goal, i) => {
          const open = expanded === goal.id
          return (
            <li key={goal.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-ink flex min-w-0 items-center gap-2.5 text-sm font-semibold">
                  <span className="bg-brand-50 text-brand-700 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <span className="break-words">{goal.title}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => toggle(goal.id)}
                  aria-expanded={open}
                  aria-controls={open ? `goal-detail-m-${goal.id}` : undefined}
                  className="text-ink-subtle hover:bg-sunken hover:text-ink grid size-9 shrink-0 place-items-center rounded-lg"
                >
                  <span className="sr-only">
                    {open ? 'Hide' : 'Show'} details for {goal.title}
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-4.5 transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="min-w-32 flex-1">
                  <GoalProgress goal={goal} />
                </div>
                <GoalStatusBadge status={goal.status} />
              </div>

              {open && (
                <div id={`goal-detail-m-${goal.id}`} className="mt-3">
                  <GoalDetail goal={goal} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
