import { ImprovementsWorkspace } from "@/components/improvements/improvements-workspace";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import {
  getCalendarBoundaryLabel,
  getCommitmentViewModel,
  getProgressionDeadlineLabel,
  getReminderThresholdLabel,
} from "@/application/evolve";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";
import { demoSettings } from "@/lib/demo/settings-demo-data";
import { isSupabaseAuthorityConfigured } from "@/lib/supabase/env";
import { activateActivityAction, activateBookaholicAction, deactivateActivityAction } from "./actions";

export default async function SettingsPage() {
  const state = await getCurrentEvolveState();
  const settings = {
    ...demoSettings,
    commitmentCapacity: state.capacity.currentCapacity,
    activeCommitments: state.commitments.filter(
      (commitment) => commitment.status === "active",
    ).length,
    activityConfigurations: demoSettings.activityConfigurations.map((activity) => {
      const commitment = state.commitments.find(
        (item) => item.activityKey === activity.activityKey,
      );

      return commitment
        ? {
            ...activity,
            active: commitment.status === "active",
            activityLabel: commitment.title,
            measurementType: commitment.measurementType,
            unit: commitment.unit,
            tier: commitment.tier,
            adaptiveTargetLabel: `${commitment.targetValue} ${commitment.unit}`,
          }
        : {
            ...activity,
            active: false,
          };
    }),
    progressionDeadlineLabel: getProgressionDeadlineLabel(state.timePolicy),
    calendarBoundaryLabel: getCalendarBoundaryLabel(state.timePolicy),
    warningThresholdLabel: getReminderThresholdLabel(state.timePolicy),
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="/settings"
        title="Settings"
        description="Configure commitments, schedules, activity measurements, reminders, and reading preferences."
      />
      <SettingsWorkspace
        snapshot={settings}
        activateActivityAction={isSupabaseAuthorityConfigured() ? activateActivityAction : undefined}
        activateBookaholicAction={isSupabaseAuthorityConfigured() ? activateBookaholicAction : undefined}
        deactivateActivityAction={isSupabaseAuthorityConfigured() ? deactivateActivityAction : undefined}
      />
      <PageHeader
        eyebrow="Commitments"
        title="Improvement Areas"
        description="Long-term areas and programs that shape what Evolve should expect from you."
      />
      <ImprovementsWorkspace snapshot={getCommitmentViewModel(state)} />
    </PageContainer>
  );
}
