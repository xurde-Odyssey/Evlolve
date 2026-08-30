import type { ActivityKey } from "@/types/activity";

export type ActivityStreakStatus = "active" | "inactive";

export type ActivityStreakTodayState =
  | "completed"
  | "missed"
  | "scheduled_rest"
  | "inactive"
  | "streak_freeze"
  | "pending";

export type ActivityStreak = {
  activityKey: ActivityKey;
  activityLabel: string;
  currentStreak: number;
  bestStreak: number;
  status: ActivityStreakStatus;
  todayState: ActivityStreakTodayState;
  scheduleLabel?: string;
  inactiveDays?: number;
  inactiveLimitDays?: number;
};

export type OverallStreak = {
  currentStreak: number;
  bestStreak: number;
  qualifiedToday?: boolean;
};

export type ConsistencySnapshot = {
  overall: OverallStreak;
  activityStreaks: ActivityStreak[];
  availableFreezes: number;
  inactiveLimitDays: number;
};
