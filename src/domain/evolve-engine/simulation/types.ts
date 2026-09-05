import type {
  AchievementAward,
  ActivityDevelopmentState,
  ActivityExecutionEvidence,
  BehaviorEvent,
  BehavioralDebtState,
  BehavioralFrictionState,
  BossHistoryRecord,
  CommitmentCapacityState,
  CoreWeaknessSignal,
  EarnedTitleRecord,
  HighestLevelRecord,
  LevelCandidateState,
  LevelProgressionState,
  LevelRiskState,
  MonthlyDevelopmentSnapshot,
  ProgressionRatingBreakdown,
  RecommendationHistoryRecord,
  TargetAdaptationState,
  TargetProgressionRecommendation,
  WeeklyDevelopmentSnapshot,
  XpTransaction,
} from "../types";
import type { BossEligibilityPolicy } from "../boss/eligibility";
import type { CommitmentCapacityPolicy } from "../capacity/state";
import type { ProgressionRatingPolicy } from "../progression/policy";
import type { LevelThresholdPolicy } from "../progression/thresholds";
import type { RecommendationEnginePolicy } from "../recommendation/engine";
import type { TargetProgressionPolicy } from "../target/progression";

export type SimulationDuration =
  | "1w"
  | "1m"
  | "3m"
  | "6m"
  | "12m"
  | "24m";

export type SimulationWarningCode =
  | "LEVEL_GROWTH_TOO_FAST"
  | "LEVEL_GROWTH_WITHOUT_DEVELOPMENT"
  | "XP_DOMINATED_BY_EXCESS_OUTPUT"
  | "CORE_WEAKNESS_IGNORED"
  | "SINGLE_OUTLIER_CHANGED_BASELINE_TOO_MUCH"
  | "DEMOTION_TOO_SENSITIVE"
  | "RECOVERY_TOO_FAST"
  | "RECOVERY_TOO_SLOW"
  | "TARGET_ESCALATION_TOO_AGGRESSIVE"
  | "CAPACITY_UNLOCK_TOO_EASY"
  | "BEHAVIOR_INTERFERENCE_FALSE_POSITIVE"
  | "SOCIAL_ACTIVITY_PENALIZED_WITHOUT_EVIDENCE"
  | "BOSS_REPETITION"
  | "ADAPTATION_PROTECTION_NOT_ENDING";

export type InvariantCode =
  | "LIFETIME_XP_NEVER_DECREASES"
  | "HIGHEST_LEVEL_NEVER_DECREASES"
  | "RAW_EVIDENCE_NEVER_MUTATED"
  | "EXCLUDED_NOT_SUCCESS"
  | "EXCLUDED_NOT_FAILURE"
  | "MISS_NOT_REPAIRED_BY_SURPLUS"
  | "PEAK_NOT_EQUAL_SUSTAINABLE_BY_DEFAULT"
  | "ONE_ACTIVITY_CANNOT_UNLIMITEDLY_COMPENSATE"
  | "LOW_CONFIDENCE_NO_AGGRESSIVE_CONSEQUENCE"
  | "ONE_BAD_WEEK_NO_IMMEDIATE_MAJOR_DEMOTION"
  | "ONE_GREAT_DAY_NO_IMMEDIATE_MAJOR_LEVEL_UP"
  | "RECOVERY_BONUS_NOT_BEYOND_HIGHEST_LEVEL"
  | "CAPACITY_REDUCTION_DOES_NOT_DELETE_COMMITMENTS"
  | "BOSS_EVIDENCE_IDEMPOTENT"
  | "XP_IDEMPOTENT"
  | "MONTHLY_CLOSEOUT_IDEMPOTENT"
  | "RESTRAINT_OCCURRENCE_NOT_AUTOMATIC_VIOLATION"
  | "SOCIAL_ACTIVITY_NOT_AUTOMATIC_NEGATIVE";

export type AuditSeverity = "info" | "warning" | "failure";

export type AuditIssue<TCode extends string> = {
  code: TCode;
  severity: AuditSeverity;
  message: string;
  checkpoint?: string;
  evidenceRefs?: string[];
};

export type SimulatedCommitment = {
  id: string;
  activityId: string;
  pillar: "HEALTH" | "DISCIPLINE" | "CAPABILITY" | "BALANCE";
  tier: "CORE" | "PRIORITY" | "FLEXIBLE";
  targetValue: number;
  unit: string;
  schedule: "daily" | "weekday" | "three_per_week";
};

export type SimulationScenarioKind =
  | "ideal_beginner"
  | "static_standard"
  | "capability_low_discipline"
  | "attendance_capability_gap"
  | "mixed_failure"
  | "core_collapse"
  | "extreme_farmer"
  | "minimum_threshold"
  | "heroic_catchup"
  | "inactive"
  | "reading_recovery"
  | "successful_adaptation"
  | "failed_adaptation"
  | "adaptation_abuse"
  | "healthy_social"
  | "lifestyle_interference"
  | "restraint_maintained"
  | "restraint_violations"
  | "high_level_climb"
  | "high_level_collapse"
  | "earned_comeback"
  | "weak_high_level"
  | "collapse_recovery_cycle"
  | "boss_rejection"
  | "boss_completion"
  | "balanced_profile"
  | "long_stagnation"
  | "long_mastery"
  | "boundary";

export type SimulationScenario = {
  id: string;
  title: string;
  kind: SimulationScenarioKind;
  description: string;
  defaultDuration: SimulationDuration;
  seed: number;
  initialLevel: number;
  initialHighestLevel?: number;
  commitments: readonly SimulatedCommitment[];
};

export type SimulationOptions = {
  duration?: SimulationDuration;
  seed?: number;
  policyVersion?: string;
  policyOverrides?: SimulationPolicyOverrides;
};

export type SimulationPolicyOverrides = {
  progressionRating?: Partial<ProgressionRatingPolicy>;
  levelThresholds?: Partial<LevelThresholdPolicy>;
  targetProgression?: Partial<TargetProgressionPolicy>;
  bossEligibility?: Partial<BossEligibilityPolicy>;
  recommendation?: Partial<RecommendationEnginePolicy>;
  commitmentCapacity?: Partial<CommitmentCapacityPolicy>;
};

export type SimulationPolicySet = {
  progressionRating: ProgressionRatingPolicy;
  levelThresholds: LevelThresholdPolicy;
  targetProgression: TargetProgressionPolicy;
  bossEligibility: BossEligibilityPolicy;
  recommendation: RecommendationEnginePolicy;
  commitmentCapacity: CommitmentCapacityPolicy;
};

export type LevelHistoryEntry = {
  day: number;
  date: string;
  currentLevel: number;
  highestLevel: number;
  supportedLevel: number;
  candidate?: LevelCandidateState;
  risk?: LevelRiskState;
  recoveryState: LevelProgressionState["recovery"]["recoveryState"];
};

export type XpHistoryEntry = {
  day: number;
  date: string;
  lifetimeXp: number;
  transactions: number;
};

export type CommitmentHistoryEntry = {
  day: number;
  date: string;
  activityId: string;
  targetValue: number;
  actualValue: number | null;
  executionState: ActivityExecutionEvidence["executionState"];
  requirementState: ActivityExecutionEvidence["requirementState"];
  exclusionState: ActivityExecutionEvidence["exclusionState"];
};

export type AuditMetrics = {
  durationDays: number;
  runtimeMs: number;
  evidenceCount: number;
  behaviorEventCount: number;
  finalCurrentLevel: number;
  finalHighestLevel: number;
  finalLifetimeXp: number;
  levelDelta: number;
  maxMonthlyLevelJump: number;
  xpFromExecution: number;
  xpFromSurplus: number;
  surplusXpRatio: number;
  currentLevelPlateauMonths: number;
  demotionCount: number;
  recoveryCount: number;
  bossOfferCount: number;
  bossCompletionCount: number;
  bossRejectionCount: number;
  targetIncreaseCount: number;
  acceptedTargetChangeCount: number;
  capacityUnlockCount: number;
};

export type SimulationFinalState = {
  currentLevel: number;
  highestLevel: HighestLevelRecord;
  lifetimeXp: number;
  capacity: CommitmentCapacityState;
  candidate?: LevelCandidateState;
  risk?: LevelRiskState;
  achievements: readonly AchievementAward[];
  titles: readonly EarnedTitleRecord[];
  activityStates: readonly ActivityDevelopmentState[];
  coreWeaknesses: readonly CoreWeaknessSignal[];
  behavioralFriction: BehavioralFrictionState;
  behavioralDebt: BehavioralDebtState;
  targetAdaptations: readonly TargetAdaptationState[];
};

export type SimulationResult = {
  scenarioId: string;
  policyVersion: string;
  duration: SimulationDuration;
  durationDays: number;
  seed: number;
  finalState: SimulationFinalState;
  levelHistory: readonly LevelHistoryEntry[];
  progressionRatingHistory: readonly ProgressionRatingBreakdown[];
  xpHistory: readonly XpHistoryEntry[];
  commitmentHistory: readonly CommitmentHistoryEntry[];
  capacityHistory: readonly CommitmentCapacityState[];
  capabilityHistory: readonly ActivityDevelopmentState[];
  behaviorHistory: readonly BehaviorEvent[];
  bossHistory: readonly BossHistoryRecord[];
  recommendationHistory: readonly RecommendationHistoryRecord[];
  targetHistory: readonly TargetProgressionRecommendation[];
  adaptationHistory: readonly TargetAdaptationState[];
  achievementHistory: readonly AchievementAward[];
  xpLedger: readonly XpTransaction[];
  weeklySnapshots: readonly WeeklyDevelopmentSnapshot[];
  monthlySnapshots: readonly MonthlyDevelopmentSnapshot[];
  warnings: readonly AuditIssue<SimulationWarningCode>[];
  invariantViolations: readonly AuditIssue<InvariantCode>[];
  auditMetrics: AuditMetrics;
  sourceEvidence: readonly ActivityExecutionEvidence[];
  sourceEvidenceSnapshot: readonly ActivityExecutionEvidence[];
};

export type SensitivityVariantResult = {
  id: string;
  coefficient: string;
  scenarioId: string;
  baselineLevel: number;
  variantLevel: number;
  baselineRating: number;
  variantRating: number;
  baselineWarnings: readonly SimulationWarningCode[];
  variantWarnings: readonly SimulationWarningCode[];
  invariantViolationCount: number;
  unstable: boolean;
};

export type SensitivityAnalysisResult = {
  policyVersion: string;
  variants: readonly SensitivityVariantResult[];
  unstableVariants: readonly SensitivityVariantResult[];
};
