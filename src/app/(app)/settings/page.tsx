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
import { activityDefinitions } from "@/config/activity-definitions";
import type { ActivityKey, MeasurementType } from "@/types/activity";
import type { ActivitySchedule, SettingsSnapshot } from "@/types/settings";
import { isSupabaseAuthorityConfigured } from "@/lib/supabase/env";
import { activateActivityAction, activateBookaholicAction, deactivateActivityAction, saveWeeklyRemindersAction, updateActivityAction } from "./actions";

export default async function SettingsPage() {
  const state = await getCurrentEvolveState();
  const settings = createSettingsSnapshot(state);

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
        updateActivityAction={isSupabaseAuthorityConfigured() ? updateActivityAction : undefined}
        saveWeeklyRemindersAction={isSupabaseAuthorityConfigured() ? saveWeeklyRemindersAction : undefined}
      />
      <PageHeader
        eyebrow="Commitments"
        title="Improvement Areas"
        description="Long-term areas and programs that shape what Evolve should expect from you."
      />
      <ImprovementsWorkspace
        snapshot={getCommitmentViewModel(state)}
        deactivateActivityAction={
          isSupabaseAuthorityConfigured() ? deactivateActivityAction : undefined
        }
      />
    </PageContainer>
  );
}

function createSettingsSnapshot(state: Awaited<ReturnType<typeof getCurrentEvolveState>>): SettingsSnapshot {
  const defaults: Record<ActivityKey, { measurementType: MeasurementType; schedule: ActivitySchedule; tier: "core" | "priority" | "flexible"; freezeEligible: boolean }> = {
    running: { measurementType: "distance", schedule: { type: "selected_days", selectedDays: ["monday", "wednesday", "friday"] }, tier: "core", freezeEligible: true },
    reading: { measurementType: "pages", schedule: { type: "daily" }, tier: "priority", freezeEligible: true },
    workout: { measurementType: "completion", schedule: { type: "times_per_week", timesPerWeek: 3 }, tier: "priority", freezeEligible: true },
    coding: { measurementType: "duration", schedule: { type: "daily" }, tier: "flexible", freezeEligible: true },
    meditation: { measurementType: "duration", schedule: { type: "times_per_week", timesPerWeek: 3 }, tier: "flexible", freezeEligible: false },
    sleep: { measurementType: "duration", schedule: { type: "daily" }, tier: "flexible", freezeEligible: false },
    water: { measurementType: "volume", schedule: { type: "daily" }, tier: "flexible", freezeEligible: false },
    custom: { measurementType: "duration", schedule: { type: "times_per_week", timesPerWeek: 3 }, tier: "priority", freezeEligible: false },
  };
  const activeCommitments = state.commitments.filter((commitment) => commitment.status === "active");
  const activityConfigurations = activityDefinitions.map((definition) => {
    const commitment = state.commitments.find((item) => item.activityKey === definition.key);
    const fallback = defaults[definition.key];
    const measurement = definition.measurementOptions.find((option) => option.type === (commitment?.measurementType ?? fallback.measurementType)) ?? definition.measurementOptions[0];
    return {
      activityKey: definition.key,
      activityLabel: commitment?.title ?? definition.label,
      active: commitment?.status === "active",
      measurementType: commitment?.measurementType ?? measurement?.type ?? fallback.measurementType,
      unit: commitment?.unit ?? measurement?.unit ?? "units",
      schedule: fromCommitmentSchedule(commitment?.schedule) ?? fallback.schedule,
      tier: commitment?.tier ?? fallback.tier,
      adaptiveTargetLabel: commitment ? `${commitment.targetValue} ${commitment.unit}` : undefined,
      freezeEligible: fallback.freezeEligible,
    };
  });

  return {
    commitmentCapacity: state.capacity.currentCapacity,
    activeCommitments: activeCommitments.length,
    warningThresholdLabel: getReminderThresholdLabel(state.timePolicy),
    progressionDeadlineLabel: getProgressionDeadlineLabel(state.timePolicy),
    calendarBoundaryLabel: getCalendarBoundaryLabel(state.timePolicy),
    reportingWeekLabel: "Sunday - Saturday",
    activityConfigurations,
    customActivityDraft: { name: "", measurementType: "duration", unit: "minutes", schedule: { type: "times_per_week", timesPerWeek: 3 }, tier: "flexible", notes: "" },
    inactiveMode: {
      available: { label: "Available", usedThisMonth: false, monthlyAllowance: 1, maxDurationDays: 7 },
      used: { label: "Used", usedThisMonth: false, monthlyAllowance: 1, maxDurationDays: 7 },
    },
    availableFreezes: 0,
    notificationPreferences: [],
    reading: { currentBookTitle: state.books.find((book) => book.status === "reading")?.title ?? "", totalPages: state.books.find((book) => book.status === "reading")?.totalPages ?? 0, recoveryDays: 2, oneActiveBookEncouraged: true },
    weeklyReminders: { maxActive: 3, reminders: state.weeklyReminders },
    systemControlled: [
      { label: "Progression deadline", value: getProgressionDeadlineLabel(state.timePolicy), description: "Required work closes at the local deadline." },
      { label: "Reporting week", value: "Sunday - Saturday", description: "Weekly evidence follows the configured reporting boundary." },
    ],
  };
}

function fromCommitmentSchedule(schedule: Awaited<ReturnType<typeof getCurrentEvolveState>>["commitments"][number]["schedule"] | undefined): ActivitySchedule | undefined {
  if (!schedule) return undefined;
  if (schedule.type === "daily") return { type: "daily" };
  if (schedule.type === "times_per_week") return { type: "times_per_week", timesPerWeek: schedule.timesPerWeek };
  if (schedule.type === "weekday") return { type: "times_per_week", timesPerWeek: 5 };
  return { type: "selected_days", selectedDays: schedule.weekdays.map((day) => day.toLowerCase() as NonNullable<ActivitySchedule["selectedDays"]>[number]) };
}
