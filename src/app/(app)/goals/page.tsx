import { BossChallengeWorkspace } from "@/components/boss/boss-challenge-workspace";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getBossViewModel } from "@/application/evolve";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";
import { acceptBossAction, rejectBossAction } from "./actions";

export default async function GoalsPage() {
  const state = await getCurrentEvolveState();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="/goals"
        title="Boss Challenges"
        description="Adaptive challenges based on demonstrated capability."
      />
      <BossChallengeWorkspace
        initialChallenges={getBossViewModel(state)}
        initialState={state}
        acceptBossAction={acceptBossAction}
        rejectBossAction={rejectBossAction}
      />
    </PageContainer>
  );
}
