import { AchievementsWorkspace } from "@/components/achievements/achievements-workspace";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getAchievementSnapshot } from "@/application/evolve";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";
import { isSupabaseAuthorityConfigured } from "@/lib/supabase/env";
import { selectTitleAction } from "@/app/(app)/character/actions";

export default async function AchievementsPage() {
  const state = await getCurrentEvolveState();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="/achievements"
        title="Achievements & Titles"
        description="Permanent accomplishments and earned identity titles."
      />
      <AchievementsWorkspace
        snapshot={getAchievementSnapshot(state)}
        selectTitleAction={isSupabaseAuthorityConfigured() ? selectTitleAction : undefined}
      />
    </PageContainer>
  );
}
