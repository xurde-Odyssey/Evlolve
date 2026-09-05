import { ActivityLoggingWorkspace } from "@/components/activities/activity-logging-workspace";
import { PageContainer } from "@/components/layout/page-container";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";
import { isSupabaseAuthorityConfigured } from "@/lib/supabase/env";
import { logActivityAction } from "./actions";

export default async function ActivitiesPage() {
  const state = await getCurrentEvolveState();

  return (
    <PageContainer>
      <ActivityLoggingWorkspace
        initialState={state}
        logActivityAction={isSupabaseAuthorityConfigured() ? logActivityAction : undefined}
      />
    </PageContainer>
  );
}
