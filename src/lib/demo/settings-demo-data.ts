import { activityDefinitions } from "@/config/activity-definitions";
import {
  demoConsistency,
  demoImprovements,
  demoWeeklyReminders,
} from "@/lib/demo/evolve-demo-data";
import { demoBooks } from "@/lib/demo/report-demo-data";
import type { ActivityKey, MeasurementType } from "@/types/activity";
import type {
  ActivityConfiguration,
  ActivitySchedule,
  SettingsSnapshot,
} from "@/types/settings";

const defaultUnits: Record<MeasurementType, string> = {
  distance: "km",
  duration: "minutes",
  pages: "pages",
  volume: "L",
  completion: "completed",
};

const activityConfigSeed: Record<
  ActivityKey,
  {
    active: boolean;
    measurementType: MeasurementType;
    schedule: ActivitySchedule;
    tier: ActivityConfiguration["tier"];
    adaptiveTargetLabel?: string;
    freezeEligible: boolean;
  }
> = {
  workout: {
    active: true,
    measurementType: "completion",
    schedule: { type: "times_per_week", timesPerWeek: 4 },
    tier: "priority",
    adaptiveTargetLabel: "4 sessions",
    freezeEligible: true,
  },
  running: {
    active: true,
    measurementType: "distance",
    schedule: {
      type: "selected_days",
      selectedDays: ["sunday", "tuesday", "thursday", "saturday"],
    },
    tier: "core",
    adaptiveTargetLabel: "5 km",
    freezeEligible: true,
  },
  reading: {
    active: true,
    measurementType: "pages",
    schedule: { type: "daily" },
    tier: "priority",
    adaptiveTargetLabel: "5 pages",
    freezeEligible: true,
  },
  coding: {
    active: true,
    measurementType: "duration",
    schedule: { type: "daily" },
    tier: "flexible",
    adaptiveTargetLabel: "60 minutes",
    freezeEligible: true,
  },
  meditation: {
    active: false,
    measurementType: "duration",
    schedule: { type: "times_per_week", timesPerWeek: 3 },
    tier: "flexible",
    adaptiveTargetLabel: "10 minutes",
    freezeEligible: false,
  },
  sleep: {
    active: false,
    measurementType: "duration",
    schedule: { type: "daily" },
    tier: "flexible",
    adaptiveTargetLabel: "7.5 hours",
    freezeEligible: false,
  },
  water: {
    active: false,
    measurementType: "volume",
    schedule: { type: "daily" },
    tier: "flexible",
    adaptiveTargetLabel: "2.5 L",
    freezeEligible: false,
  },
  custom: {
    active: false,
    measurementType: "duration",
    schedule: { type: "times_per_week", timesPerWeek: 3 },
    tier: "priority",
    freezeEligible: false,
  },
};

const activeBook = demoBooks.find((book) => book.status === "reading");

export const demoSettings = {
  commitmentCapacity: demoImprovements.commitmentCapacity,
  activeCommitments: demoImprovements.areas.filter(
    (area) => area.status === "active",
  ).length,
  warningThresholdLabel: "5:00 PM",
  progressionDeadlineLabel: "10:00 PM",
  calendarBoundaryLabel: "12:00 AM",
  reportingWeekLabel: "Sunday - Saturday",
  activityConfigurations: activityDefinitions.map((definition) => {
    const seed = activityConfigSeed[definition.key];
    const measurementOption =
      definition.measurementOptions.find(
        (option) => option.type === seed.measurementType,
      ) ?? definition.measurementOptions[0];

    return {
      activityKey: definition.key,
      activityLabel: definition.label,
      active: seed.active,
      measurementType: measurementOption?.type ?? seed.measurementType,
      unit: measurementOption?.unit ?? defaultUnits[seed.measurementType],
      schedule: seed.schedule,
      tier: seed.tier,
      adaptiveTargetLabel: seed.adaptiveTargetLabel,
      freezeEligible: seed.freezeEligible,
    };
  }),
  customActivityDraft: {
    name: "Public Speaking Practice",
    measurementType: "duration",
    unit: "minutes",
    schedule: { type: "times_per_week", timesPerWeek: 3 },
    tier: "priority",
    notes: "Practice structured speaking.",
  },
  inactiveMode: {
    available: {
      label: "Running",
      usedThisMonth: false,
      monthlyAllowance: 1,
      maxDurationDays: demoConsistency.inactiveLimitDays,
    },
    used: {
      label: "Mental Training",
      usedThisMonth: true,
      monthlyAllowance: 1,
      maxDurationDays: demoConsistency.inactiveLimitDays,
      availableAgainLabel: "Next calendar month",
    },
  },
  availableFreezes: demoConsistency.availableFreezes,
  notificationPreferences: [
    {
      key: "activity_reminders",
      label: "Activity reminders",
      enabled: true,
    },
    {
      key: "daily_deadline_warning",
      label: "Daily deadline warning",
      enabled: true,
    },
    {
      key: "boss_deadline",
      label: "Boss Challenge deadline",
      enabled: true,
    },
    {
      key: "inactive_mode_expiry",
      label: "Inactive Mode expiry",
      enabled: true,
    },
    {
      key: "reading_reminder",
      label: "Reading reminder",
      enabled: false,
    },
    {
      key: "quest_updates",
      label: "Quest updates",
      enabled: true,
    },
  ],
  reading: {
    currentBookTitle: activeBook?.title ?? "",
    totalPages: activeBook?.totalPages ?? 0,
    recoveryDays: 2,
    oneActiveBookEncouraged: true,
  },
  weeklyReminders: demoWeeklyReminders,
  systemControlled: [
    {
      label: "Adaptive Target",
      value: "Managed by Evolve",
      description: "Adjusted from performance history.",
    },
    {
      label: "XP Reward",
      value: "Managed by Evolve",
      description: "Not configurable in Settings.",
    },
    {
      label: "Difficulty",
      value: "Managed by Evolve",
      description: "Set by future progression systems.",
    },
    {
      label: "Consistency Formula",
      value: "Managed by Evolve",
      description: "Qualification rules are not user-editable.",
    },
    {
      label: "Inactive Monthly Allowance",
      value: "1 session",
      description: "Calendar-month rule, server enforcement deferred.",
    },
  ],
} satisfies SettingsSnapshot;
