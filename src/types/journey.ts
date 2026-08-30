export type JourneyMilestoneType =
  | "level"
  | "achievement"
  | "boss"
  | "title"
  | "unlock"
  | "phase"
  | "goal";

export type JourneyMilestoneStatus = "completed" | "current" | "upcoming";

export type JourneyRewardPreview = {
  label: string;
  detail: string;
};

export type JourneyMilestone = {
  id: string;
  type: JourneyMilestoneType;
  title: string;
  status: JourneyMilestoneStatus;
  description?: string;
  level?: number;
  completedAt?: string;
  reward?: JourneyRewardPreview;
};

export type JourneySnapshot = {
  currentLevel: number;
  highestLevel: number;
  completedMilestoneCount: number;
  currentMilestoneLabel: string;
  milestones: JourneyMilestone[];
};
