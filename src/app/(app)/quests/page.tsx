import { DailyQuests } from "@/components/quests/daily-quests";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getActivityHistoryViewModel, getDailyQuestViewModel } from "@/application/evolve";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";

export default async function QuestsPage() {
  const state = await getCurrentEvolveState();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="/quests"
        title="Daily Quests"
        description="Scheduled requirements derived from active Growth Commitments."
      />
      <DailyQuests
        activityRecords={getActivityHistoryViewModel(state)}
        quests={getDailyQuestViewModel(state)}
      />
    </PageContainer>
  );
}
