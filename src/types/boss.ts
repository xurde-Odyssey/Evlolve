import type { ActivityKey, MeasurementType } from "@/types/activity";

export type BossChallengeStatus =
  | "offered"
  | "accepted"
  | "completed"
  | "failed"
  | "rejected";

export type BossEvaluationType =
  | "single_value"
  | "cumulative"
  | "frequency"
  | "consistency"
  | "deadline";

export type BossEvidenceItem = {
  label: string;
  value: string;
};

export type BossChallenge = {
  id: string;
  title: string;
  description?: string;
  activityKey: ActivityKey;
  activityLabel: string;
  evaluationType: BossEvaluationType;
  measurement: {
    type: MeasurementType;
    target: number;
    unit: string;
  };
  currentProgress?: number;
  actualResult?: number;
  status: BossChallengeStatus;
  deadline?: string;
  deadlineLabel?: string;
  completedAt?: string;
  generatedReason?: string;
  evidence?: BossEvidenceItem[];
};
