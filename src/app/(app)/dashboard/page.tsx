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
import {
  demoActivityRecords,
  demoDashboardBoss,
  demoCharacter,
  demoConsistency,
  demoDailyExecution,
  demoDailyQuests,
  demoDashboardImprovements,
  demoImprovements,
  demoLatestAchievement,
} from "@/lib/demo/evolve-demo-data";

export default function DashboardPage() {
  return (
    <PageContainer>
      <TodayExecution execution={demoDailyExecution} />
      <DashboardIdentity character={demoCharacter} />
      <ProgressionCard progression={demoCharacter} />
      <BossPreview challenge={demoDashboardBoss} />
      <LatestAchievementPreview achievement={demoLatestAchievement} />
      <ImprovementsPreview
        areas={demoDashboardImprovements}
        capacity={demoImprovements.commitmentCapacity}
      />
      <CharacterAttributes attributes={demoCharacter.attributes} />
      <DailyQuests
        activityRecords={demoActivityRecords}
        quests={demoDailyQuests}
      />
      <ConsistencyOverview consistency={demoConsistency} />
    </PageContainer>
  );
}
