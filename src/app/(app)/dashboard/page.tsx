import { LatestAchievementPreview } from "@/components/achievements/latest-achievement-preview";
import { BossPreview } from "@/components/boss/boss-preview";
import { CharacterAttributes } from "@/components/dashboard/character-attributes";
import { ConsistencyOverview } from "@/components/dashboard/consistency-overview";
import { DashboardIdentity } from "@/components/dashboard/dashboard-identity";
import { ProgressionCard } from "@/components/dashboard/progression-card";
import { TodayExecution } from "@/components/dashboard/today-execution";
import { ImprovementsPreview } from "@/components/improvements/improvements-preview";
import { PageContainer } from "@/components/layout/page-container";
import { DailyQuests } from "@/components/quests/daily-quests";
import { getDashboardQuery } from "@/application/evolve/server/queries";
import { completeWeeklyReminderAction } from "./actions";

export default async function DashboardPage() {
  const dashboard = await getDashboardQuery();

  return (
    <PageContainer>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <div className="space-y-6">
          <DashboardIdentity character={dashboard.character} />
          <ProgressionCard progression={dashboard.character} />
          <ConsistencyOverview consistency={dashboard.consistency} />
        </div>
        <CharacterAttributes attributes={dashboard.attributes} />
      </div>
      <TodayExecution
        execution={dashboard.dailyExecution}
        completeWeeklyReminderAction={completeWeeklyReminderAction}
      />
      <BossPreview challenge={dashboard.dashboardBoss} />
      <LatestAchievementPreview achievement={dashboard.latestAchievement} />
      <ImprovementsPreview
        areas={dashboard.improvements.areas.slice(0, 3)}
        capacity={dashboard.improvements.commitmentCapacity}
      />
      <DailyQuests
        activityRecords={dashboard.activityRecords}
        quests={dashboard.dailyQuests}
      />
    </PageContainer>
  );
}
