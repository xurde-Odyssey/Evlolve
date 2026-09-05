import type { ActivityKey, MeasurementType } from "@/types/activity";

export type QuestSource = "system" | "user";

export type QuestStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "qualifying_partial"
  | "attempted"
  | "missed"
  | "excluded";

export type DailyQuest = {
  id: string;
  title: string;
  description?: string;
  source: QuestSource;
  status: QuestStatus;
  scheduleLabel?: string;
  target?: {
    activityKey: ActivityKey;
    measurementType: MeasurementType;
    value?: number;
    unit?: string;
  };
};
