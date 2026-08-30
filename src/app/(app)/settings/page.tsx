import { ImprovementsWorkspace } from "@/components/improvements/improvements-workspace";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { demoImprovements } from "@/lib/demo/evolve-demo-data";
import { demoSettings } from "@/lib/demo/settings-demo-data";

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="/settings"
        title="Settings"
        description="Configure commitments, schedules, activity measurements, reminders, and reading preferences."
      />
      <SettingsWorkspace snapshot={demoSettings} />
      <PageHeader
        eyebrow="Commitments"
        title="Improvement Areas"
        description="Long-term areas and programs that shape what Evolve should expect from you."
      />
      <ImprovementsWorkspace snapshot={demoImprovements} />
    </PageContainer>
  );
}
