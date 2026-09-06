import type {
  ActivityDevelopmentState,
  ActivityExecutionEvidence,
  DevelopmentPillar,
  DirectionSignal,
  GapClassification,
  TargetRelationship,
} from "../types";

export type DevelopmentDomain =
  | "PHYSICAL_TRAINING"
  | "RECOVERY"
  | "MENTAL_TRAINING"
  | "KNOWLEDGE"
  | "SKILL_DEVELOPMENT"
  | "DEEP_WORK"
  | "CAREER_CRAFT";

export type SupportingHealthSignal =
  | "SLEEP"
  | "HYDRATION"
  | "RECOVERY"
  | "FATIGUE";

export type AdaptiveDevelopmentState =
  | "UNKNOWN"
  | "BUILDING"
  | "STABLE"
  | "IMPROVING"
  | "STRONGLY_IMPROVING"
  | "STAGNATING"
  | "DECLINING"
  | "REBUILDING"
  | "BREAKTHROUGH"
  | "NEAR_FRONTIER";

export type CapabilityTrajectory =
  | "EMERGING"
  | "DEVELOPING"
  | "ESTABLISHING"
  | "ESTABLISHED"
  | "EXPANDING"
  | "PLATEAUED"
  | "DETERIORATING"
  | "REBUILDING";

export type CommitmentDifficulty =
  | "UNDERLOADED"
  | "APPROPRIATE"
  | "CHALLENGING"
  | "OVERREACHING"
  | "UNSUSTAINABLE"
  | "UNKNOWN";

export type DeadlineBehavior =
  | "EARLY_EXECUTOR"
  | "DISTRIBUTED"
  | "LATE_BUT_RELIABLE"
  | "DEADLINE_DEPENDENT"
  | "DEADLINE_FAILURE_RISK"
  | "UNKNOWN";

export type AdaptiveActivityProfile = {
  activityId: string;
  domain: DevelopmentDomain;
  pillar: DevelopmentPillar;
  state: AdaptiveDevelopmentState;
  trajectory: CapabilityTrajectory;
  difficulty: CommitmentDifficulty;
  targetRelationship: TargetRelationship;
  gap: GapClassification;
  confidence: number;
  deadlineBehavior: DeadlineBehavior;
  evidenceRefs: string[];
};

export type DevelopmentFrontier = {
  activityId: string;
  sustainableValue: number | null;
  frontierValue: number | null;
  confidence: number;
  state: "UNKNOWN" | "ESTABLISHED" | "EXPANDING" | "NEAR_FRONTIER";
};

export type AdaptiveClaim = {
  type: "STRENGTH" | "CONSTRAINT" | "CHANGE" | "FOCUS" | "BEHAVIOR";
  text: string;
  evidenceRefs: string[];
  confidence: number;
};

export type MonthlyDevelopmentAnalysis = {
  strongestDevelopment: string[];
  primaryConstraint: string | null;
  meaningfulChange: string | null;
  capabilityChange: DirectionSignal;
  disciplineChange: DirectionSignal;
  balanceChange: DirectionSignal;
  recommendedFocus: string | null;
  confidence: number;
  claims: AdaptiveClaim[];
};

export type PersonalDevelopmentModel = {
  domains: DevelopmentDomain[];
  pillars: DevelopmentPillar[];
  activities: AdaptiveActivityProfile[];
  sustainableCapabilities: Record<string, number | null>;
  peakCapabilities: Record<string, number | null>;
  baselineMaturity: Record<string, string>;
  strengths: string[];
  constraints: string[];
  opportunities: string[];
  confidence: number;
  updatedAt: string;
};

export type AdaptiveIntelligenceResult = {
  model: PersonalDevelopmentModel;
  frontiers: DevelopmentFrontier[];
  analysis: MonthlyDevelopmentAnalysis;
  noIntervention: boolean;
};

export type AdaptiveIntelligenceInput = {
  activityStates: readonly ActivityDevelopmentState[];
  evidence: readonly ActivityExecutionEvidence[];
  commitments: readonly { id: string; activityKey: string; tier: string }[];
  now: string;
};
