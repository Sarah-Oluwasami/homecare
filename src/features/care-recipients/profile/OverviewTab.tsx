import { useOutletContext } from 'react-router-dom'
import type { RecipientProfile } from '../profile-data'
import {
  CareNotesPanel,
  CareSummaryPanel,
  PersonalInformation,
  RecentVisitsPanel,
} from './OverviewMain'
import {
  CareTeamPanel,
  MedicationsPanel,
  QuickStatsPanel,
  UpcomingVisitsPanel,
} from './OverviewAside'

export function OverviewTab() {
  const profile = useOutletContext<RecipientProfile>()

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <PersonalInformation profile={profile} />
        <CareSummaryPanel profile={profile} />
        <RecentVisitsPanel profile={profile} />
        <CareNotesPanel profile={profile} />
      </div>

      {/* Two-up on tablet so the aside doesn't become a long thin column */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1 xl:content-start">
        <QuickStatsPanel profile={profile} />
        <MedicationsPanel profile={profile} />
        <CareTeamPanel profile={profile} />
        <UpcomingVisitsPanel profile={profile} />
      </div>
    </div>
  )
}
