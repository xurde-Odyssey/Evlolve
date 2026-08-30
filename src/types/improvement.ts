import type { ActivityKey } from "@/types/activity";

export type CommitmentTier = "core" | "priority" | "flexible";

export type ImprovementAreaStatus = "active" | "inactive" | "completed";

export type ImprovementAreaSource = "predefined" | "custom" | "program";

export type ProgressBehavior = "cumulative" | "state";

export type ImprovementArea = {
  id: string;
  title: string;
  description?: string;
  activityKey?: ActivityKey;
  tier: CommitmentTier;
  status: ImprovementAreaStatus;
  startedAt: string;
  inactiveSince?: string;
  completedAt?: string;
  source: ImprovementAreaSource;
  programId?: string;
  progressBehavior?: ProgressBehavior;
  measurementLabel?: string;
};

export type PredefinedImprovementArea = {
  id: string;
  title: string;
  description: string;
  activityKey?: ActivityKey;
  progressBehavior: ProgressBehavior;
};

export type ProgramAreaDefinition = {
  title: string;
  activityKey?: ActivityKey;
};

export type EvolveProgram = {
  id: string;
  title: string;
  description: string;
  areas: ProgramAreaDefinition[];
  requiredSlots: number;
};

export type ImprovementSnapshot = {
  commitmentCapacity: number;
  inactiveLimitDays: number;
  areas: ImprovementArea[];
  predefinedAreas: PredefinedImprovementArea[];
  programs: EvolveProgram[];
};
