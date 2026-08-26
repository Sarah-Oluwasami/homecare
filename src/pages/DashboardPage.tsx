import { Download } from 'lucide-react'
import { OperationsSnapshot } from '@/features/dashboard/OperationsSnapshot'
import { TodaysSchedule } from '@/features/dashboard/TodaysSchedule'
import { CriticalAlerts } from '@/features/dashboard/CriticalAlerts'
import { ActivityTimeline } from '@/features/dashboard/ActivityTimeline'
import { QuickActions } from '@/features/dashboard/QuickActions'
import { PerformanceSnapshot } from '@/features/dashboard/PerformanceSnapshot'

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-ink text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            Welcome to Careprofs Dashboard
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Monitor today's care operations, identify critical issues, and keep
            every visit running smoothly.
          </p>
        </div>

        <button
          type="button"
          className="border-line text-ink hover:bg-sunken inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors"
        >
          <Download className="size-4" strokeWidth={1.9} />
          Download Report
        </button>
      </header>

      <OperationsSnapshot />
      <TodaysSchedule />
      <CriticalAlerts />

      {/* Timeline gets the wider column; actions collapse beneath it under 1280px */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityTimeline />
        </div>
        <QuickActions />
      </div>

      <PerformanceSnapshot />
    </div>
  )
}
