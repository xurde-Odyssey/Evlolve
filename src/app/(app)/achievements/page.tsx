import { AchievementsWorkspace } from "@/components/achievements/achievements-workspace";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { demoAchievements } from "@/lib/demo/evolve-demo-data";

export default function AchievementsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="/achievements"
        title="Achievements & Titles"
        description="Permanent accomplishments and earned identity titles."
      />
      <AchievementsWorkspace snapshot={demoAchievements} />
    </PageContainer>
  );
}
