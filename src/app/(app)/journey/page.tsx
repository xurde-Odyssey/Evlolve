import { JourneyWorkspace } from "@/components/journey/journey-workspace";
import { PageContainer } from "@/components/layout/page-container";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";
import { createJourneySeed } from "@/application/journey/seed";

export default async function JourneyPage() {
  const state = await getCurrentEvolveState();

  return (
    <PageContainer className="journey-page-surface"><JourneyWorkspace initialData={createJourneySeed(state.profile?.goals?.[0])} /></PageContainer>
  );
}
