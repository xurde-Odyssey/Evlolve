import { JourneyTimeline } from "@/components/journey/journey-timeline";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getJourneyViewModel } from "@/application/evolve";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";

export default async function JourneyPage() {
  const state = await getCurrentEvolveState();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="/journey"
        title="Your Journey"
        description="A long-term record of completed milestones, current position, and upcoming progression markers across Evolve."
      />
      <JourneyTimeline journey={getJourneyViewModel(state)} />
    </PageContainer>
  );
}
