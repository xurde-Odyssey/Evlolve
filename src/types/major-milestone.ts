import type { ActivityKey } from "./activity";

export type MajorMilestoneStatus = "active" | "completed" | "archived";
export type MajorMilestoneTargetDays = 100 | 150 | 200;

export type MajorMilestone = {
  id: string;
  title: string;
  commitmentId: string;
  activityKey: ActivityKey;
  targetDays: MajorMilestoneTargetDays;
  startedAt: string;
  status: MajorMilestoneStatus;
  completedAt?: string;
  policyVersion: string;
};

export type MajorMilestoneProgress = MajorMilestone & {
  elapsedDays: number;
  qualifyingDays: number;
  regularityPercent: number;
  progressPercent: number;
  eligibleToComplete: boolean;
};
