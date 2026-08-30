import { BossChallengeWorkspace } from "@/components/boss/boss-challenge-workspace";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { demoBossChallenges } from "@/lib/demo/evolve-demo-data";

export default function GoalsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="/goals"
        title="Boss Challenges"
        description="Adaptive challenges based on demonstrated capability."
      />
      <BossChallengeWorkspace initialChallenges={demoBossChallenges} />
    </PageContainer>
  );
}
