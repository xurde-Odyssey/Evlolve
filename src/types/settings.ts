import type { ActivityKey, MeasurementType } from "@/types/activity";
import type { CommitmentTier } from "@/types/improvement";
import type { WeeklyReminderSnapshot } from "@/types/weekly-reminder";

export type Weekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type ActivityScheduleType =
  | "daily"
  | "times_per_week"
  | "selected_days";

export type ActivitySchedule = {
  type: ActivityScheduleType;
  timesPerWeek?: number;
  selectedDays?: Weekday[];
};

export type ActivityConfiguration = {
  activityKey: ActivityKey;
  activityLabel: string;
  active: boolean;
  measurementType: MeasurementType;
  unit: string;
  schedule: ActivitySchedule;
  tier: CommitmentTier;
  adaptiveTargetLabel?: string;
  freezeEligible: boolean;
};

export type CustomActivityDraft = {
  name: string;
  measurementType: MeasurementType;
  unit: string;
  schedule: ActivitySchedule;
  tier: CommitmentTier;
  notes: string;
};

export type InactiveModeSettings = {
  label: string;
  usedThisMonth: boolean;
  monthlyAllowance: number;
  maxDurationDays: number;
  availableAgainLabel?: string;
};

export type NotificationCategory =
  | "activity_reminders"
  | "daily_deadline_warning"
  | "boss_deadline"
  | "inactive_mode_expiry"
  | "reading_reminder"
  | "quest_updates";

export type NotificationPreference = {
  key: NotificationCategory;
  label: string;
  enabled: boolean;
};

export type ReadingRecoveryDays = 2 | 3;

export type ReadingSettings = {
  currentBookTitle: string;
  totalPages: number;
  recoveryDays: ReadingRecoveryDays;
  oneActiveBookEncouraged: boolean;
};

export type SystemControlledSetting = {
  label: string;
  value: string;
  description: string;
};

export type SettingsSnapshot = {
  commitmentCapacity: number;
  activeCommitments: number;
  progressionDeadlineLabel: "10:00 PM";
  calendarBoundaryLabel: "12:00 AM";
  reportingWeekLabel: "Sunday - Saturday";
  activityConfigurations: ActivityConfiguration[];
  customActivityDraft: CustomActivityDraft;
  inactiveMode: {
    available: InactiveModeSettings;
    used: InactiveModeSettings;
  };
  availableFreezes: number;
  notificationPreferences: NotificationPreference[];
  reading: ReadingSettings;
  weeklyReminders: WeeklyReminderSnapshot;
  systemControlled: SystemControlledSetting[];
};
