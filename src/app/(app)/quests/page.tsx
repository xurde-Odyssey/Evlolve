import { DailyQuests } from "@/components/quests/daily-quests";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getDailyQuestViewModel, getScheduledRequirementsForCurrentWeek } from "@/application/evolve";
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
        evidence={state.evidence}
        weeklyReminders={state.weeklyReminders}
        quests={getDailyQuestViewModel(state)}
        weeklyRequirements={getScheduledRequirementsForCurrentWeek(state)}
        now={state.now}
        timePolicy={state.timePolicy}
      />
    </PageContainer>
  );
}
