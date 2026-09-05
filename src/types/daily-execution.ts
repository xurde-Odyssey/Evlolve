import type { ActivityKey } from "@/types/activity";
import type { BossChallengeStatus } from "@/types/boss";
import type { WeeklyReminderSnapshot } from "@/types/weekly-reminder";

export type DailyExecutionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "qualifying_partial"
  | "attempted"
  | "missed"
  | "inactive"
  | "scheduled_rest";

export type ExecutionAlertLevel = "reminder" | "warning" | "critical";

export type DailyDeadlineState =
  | "before_warning"
  | "reminder"
  | "warning"
  | "critical"
  | "complete"
  | "closeout";

export type DailyExecutionItem = {
  id: string;
  title: string;
  activityKey?: ActivityKey;
  targetLabel?: string;
  actualLabel?: string;
  status: DailyExecutionStatus;
  streakAtRisk?: boolean;
  streakLabel?: string;
};

export type DailyCloseoutState = {
  requiredCommitments: number;
  completedCommitments: number;
  missedCommitments: number;
  overallEvaluationLabel: string;
  progressionImpactLabel: string;
};

export type TodayBossAlert = {
  id: string;
  title: string;
  status: BossChallengeStatus;
  targetLabel?: string;
  actualLabel?: string;
  progressLabel?: string;
  deadlineLabel?: string;
  message: string;
};

export type TodayReadingState = {
  title: string;
  bookTitle: string;
  pagesRead: number;
  totalPages: number;
  pagesRemaining: number;
  requiredToday: boolean;
  status: "pending" | "completed" | "recovery";
  recoveryDaysRemaining?: number;
};

export type TodayInactiveAlert = {
  id: string;
  title: string;
  message: string;
  daysRemaining?: number;
  state: "started" | "expires_tomorrow" | "expired";
};

export type EvolveNotificationSeverity =
  | "reminder"
  | "warning"
  | "critical"
  | "success";

export type EvolveNotificationType =
  | "activity"
  | "deadline"
  | "streak"
  | "boss"
  | "inactive"
  | "reading";

export type EvolveNotification = {
  id: string;
  type: EvolveNotificationType;
  severity: EvolveNotificationSeverity;
  title: string;
  message: string;
  createdAt: string;
  mandatory?: boolean;
};

export type DailyExecutionScenario = {
  id: string;
  label: string;
  description: string;
  alertLevel?: ExecutionAlertLevel;
  deadlineState: DailyDeadlineState;
};

export type DailyExecutionSnapshot = {
  currentTimeLabel: string;
  warningThresholdLabel: string;
  deadlineLabel: string;
  calendarBoundaryLabel: string;
  timeRemainingLabel?: string;
  alertLevel?: ExecutionAlertLevel;
  deadlineState: DailyDeadlineState;
  items: DailyExecutionItem[];
  bossAlerts: TodayBossAlert[];
  reading?: TodayReadingState;
  inactiveAlerts: TodayInactiveAlert[];
  notifications: EvolveNotification[];
  weeklyReminders: WeeklyReminderSnapshot;
  scenarios: DailyExecutionScenario[];
  closeout?: DailyCloseoutState;
  automaticFreezeAvailable: boolean;
};
