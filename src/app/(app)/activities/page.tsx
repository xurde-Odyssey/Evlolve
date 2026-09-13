import { ActivityLoggingWorkspace } from "@/components/activities/activity-logging-workspace";
import { PageContainer } from "@/components/layout/page-container";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";
import { isSupabaseAuthorityConfigured } from "@/lib/supabase/env";
import { logActivityAction, logBehaviorOccurrenceFromActivitiesAction } from "./actions";

export default async function ActivitiesPage() {
  const state = await getCurrentEvolveState();

  return (
    <PageContainer>
      <ActivityLoggingWorkspace
        key={`${state.now}:${state.activityRecords.length}`}
        initialState={state}
        logActivityAction={isSupabaseAuthorityConfigured() ? logActivityAction : undefined}
        logBehaviorOccurrenceAction={isSupabaseAuthorityConfigured() ? logBehaviorOccurrenceFromActivitiesAction : undefined}
      />
    </PageContainer>
  );
}
