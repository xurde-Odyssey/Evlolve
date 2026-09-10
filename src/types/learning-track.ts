export type LearningTrackType =
  | "course"
  | "certification"
  | "skill"
  | "language"
  | "hobby"
  | "custom";

export type LearningTrackStatus = "active" | "paused" | "completed" | "archived";
export type LearningMilestoneStatus = "pending" | "in_progress" | "completed" | "archived";

export type LearningMilestone = {
  id: string;
  title: string;
  position: number;
  status: LearningMilestoneStatus;
  completedAt?: string;
};

export type LearningTrack = {
  id: string;
  commitmentId: string;
  title: string;
  type: LearningTrackType;
  provider?: string;
  startedAt: string;
  targetCompletionDate?: string;
  status: LearningTrackStatus;
  completedAt?: string;
  archivedAt?: string;
  currentMilestoneId?: string;
  milestones: LearningMilestone[];
};
