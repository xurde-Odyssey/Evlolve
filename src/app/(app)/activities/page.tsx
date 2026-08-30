import { ActivityLoggingWorkspace } from "@/components/activities/activity-logging-workspace";
import { PageContainer } from "@/components/layout/page-container";
import {
  demoActivityRecords,
  demoDailyQuests,
} from "@/lib/demo/evolve-demo-data";

export default function ActivitiesPage() {
  return (
    <PageContainer>
      <ActivityLoggingWorkspace
        initialActivityRecords={demoActivityRecords}
        quests={demoDailyQuests}
      />
    </PageContainer>
  );
}
