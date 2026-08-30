import { JourneyTimeline } from "@/components/journey/journey-timeline";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { demoJourney } from "@/lib/demo/evolve-demo-data";

export default function JourneyPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="/journey"
        title="Your Journey"
        description="A long-term record of completed milestones, current position, and upcoming progression markers across Evolve."
      />
      <JourneyTimeline journey={demoJourney} />
    </PageContainer>
  );
}
