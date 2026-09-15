import { JourneyWorkspace } from "@/components/journey/journey-workspace";
import { PageContainer } from "@/components/layout/page-container";
import { createJourneySeed } from "@/application/journey/seed";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";

export default async function JourneyDiaryPage() { const state = await getCurrentEvolveState(); return <PageContainer className="journey-page-surface"><JourneyWorkspace initialData={createJourneySeed(state.profile?.goals?.[0])} view="diary" /></PageContainer>; }
