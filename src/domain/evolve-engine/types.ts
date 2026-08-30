import type { ActivityKey, MeasurementType } from "@/types/activity";

export type EvidenceSource =
  | "MANUAL"
  | "TRACKED"
  | "VERIFIED"
  | "SYSTEM_DERIVED";

export type EvidenceQuality = "UNKNOWN" | "LOW" | "STANDARD" | "HIGH";

export type RequirementState =
  | "REQUIRED"
  | "MISSED"
  | "NO_REQUIREMENT"
  | "EXCLUDED"
  | "UNKNOWN";

export type ExclusionState =
  | "NONE"
  | "SCHEDULED_REST"
  | "INACTIVE"
  | "READING_RECOVERY"
  | "APPROVED_EXCLUSION";

export type DeadlineState =
  | "ON_TIME"
  | "AFTER_DEADLINE"
  | "NO_DEADLINE"
  | "UNKNOWN";

export type ExecutionState =
  | "FULL"
  | "QUALIFYING_PARTIAL"
  | "ATTEMPT"
  | "INSUFFICIENT_EFFORT"
  | "MISSED"
  | "EXCLUDED";

export type EvidenceMetadataValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[];

export type EvidenceMetadata = Record<string, EvidenceMetadataValue>;

export type ActivityExecutionEvidence = {
  id: string;
  activityId: ActivityKey | string;
  commitmentId?: string;
  userId?: string;
  occurredAt?: string;
  scheduledFor?: string;
  targetValue?: number;
  actualValue?: number;
  unit?: string;
  measurementType?: MeasurementType;
  source: EvidenceSource;
  evidenceQuality: EvidenceQuality;
  requirementState: RequirementState;
  exclusionState: ExclusionState;
  executionState: ExecutionState;
  deadlineState: DeadlineState;
  rawCompletionRatio?: number;
  commitmentFulfillment?: number;
  metadata?: EvidenceMetadata;
  createdAt: string;
  updatedAt?: string;
};

export type ExecutionDistribution = Record<ExecutionState, number>;

export type ConsistencyContribution = {
  executionState: ExecutionState;
  requirementState: RequirementState;
  includedInDenominator: boolean;
  contribution: number;
};

export type AggregatedActivityEvidence = {
  activityId: ActivityKey | string;
  eligibleRequirements: number;
  fullCount: number;
  qualifyingPartialCount: number;
  attemptCount: number;
  insufficientCount: number;
  missedCount: number;
  excludedCount: number;
  totalConsistencyContribution: number;
  consistencyPercentage: number | null;
  expectedOutput: number;
  rawActualOutput: number;
  rawOutputRatio: number | null;
  effectiveOutput: number;
  executionDistribution: ExecutionDistribution;
};

export type EvidenceAggregation = {
  periodStart: string;
  periodEnd: string;
  eligibleRequirements: number;
  fullCount: number;
  qualifyingPartialCount: number;
  attemptCount: number;
  insufficientCount: number;
  missedCount: number;
  excludedCount: number;
  totalConsistencyContribution: number;
  consistencyPercentage: number | null;
  expectedOutput: number;
  rawActualOutput: number;
  rawOutputRatio: number | null;
  effectiveOutput: number;
  executionDistribution: ExecutionDistribution;
};

export type MonthlyEvidenceAggregation = EvidenceAggregation & {
  activityBreakdown: AggregatedActivityEvidence[];
};

export type ConfidenceValue<T> = {
  value: T;
  confidence: number;
};

export type BaselineState = "NEW" | "BUILDING" | "ESTABLISHED" | "REBUILDING";

export type ActivityBaseline = {
  activityId: ActivityKey | string;
  baselineState: BaselineState;
  sustainableCapability: ConfidenceValue<number | null>;
  peakCapability: ConfidenceValue<number | null>;
  confidence: number;
  volatility: number | null;
  momentum: number | null;
  sampleCount: number;
  qualifyingSampleCount: number;
  lastUpdatedAt: string;
};

export type BaselineEstimatorInput = {
  activityId: ActivityKey | string;
  evidence: readonly ActivityExecutionEvidence[];
  now?: string;
};

export type BaselineEstimator = {
  estimate(input: BaselineEstimatorInput): ActivityBaseline;
};

export type TargetChangeReason =
  | "INITIAL"
  | "SYSTEM_RECOMMENDATION"
  | "USER_ACCEPTED_RECOMMENDATION"
  | "USER_REQUESTED"
  | "ADMIN_CORRECTION"
  | "UNKNOWN";

export type TargetUserDecision =
  | "ACCEPTED"
  | "REJECTED"
  | "PENDING"
  | "NOT_APPLICABLE";

export type TargetHistoryRecord = {
  id: string;
  activityId: ActivityKey | string;
  commitmentId?: string;
  previousTargetValue?: number;
  targetValue: number;
  unit: string;
  effectiveFrom: string;
  reason: TargetChangeReason;
  recommendationRef?: string;
  userDecision?: TargetUserDecision;
  createdAt: string;
};

export type DirectionSignal =
  | "STRONGLY_DECLINING"
  | "DECLINING"
  | "STABLE"
  | "IMPROVING"
  | "STRONGLY_IMPROVING"
  | "UNKNOWN";

export type ComparisonDirection =
  | "IMPROVING"
  | "DECLINING"
  | "STABLE"
  | "INSUFFICIENT_EVIDENCE";

export type ReliabilityState =
  | "UNKNOWN"
  | "UNSTABLE"
  | "DEVELOPING"
  | "RELIABLE"
  | "HIGHLY_RELIABLE"
  | "DETERIORATING"
  | "REBUILDING";

export type GapClassification =
  | "NO_MEANINGFUL_GAP"
  | "DISCIPLINE_GAP"
  | "CAPABILITY_GAP"
  | "MIXED_GAP"
  | "INSUFFICIENT_EVIDENCE";

export type TargetRelationship =
  | "UNKNOWN"
  | "BELOW_CAPABILITY"
  | "APPROPRIATE"
  | "CHALLENGING"
  | "POTENTIALLY_UNSUSTAINABLE";

export type ScheduledDistribution = Record<
  "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY",
  number
>;

export type ConsistencyPatternSignals = {
  consecutiveMissCount: number;
  longestMissCluster: number;
  longestFullCluster: number;
  recoveryCount: number;
  partialHeavyRatio: number | null;
  attemptRatio: number | null;
  consistencyStability: number | null;
  weakDaysOfWeek: string[];
};

export type ConsistencySummary = {
  activityId: ActivityKey | string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  eligibleOpportunities: number;
  completedFull: number;
  qualifyingPartials: number;
  attempts: number;
  insufficientEfforts: number;
  missed: number;
  excluded: number;
  totalConsistencyCredit: number;
  consistencyRatio: number | null;
  scheduledDistribution: ScheduledDistribution;
  executionDistribution: ExecutionDistribution;
  patternSignals: ConsistencyPatternSignals;
  recentDirection: DirectionSignal;
  confidence: number;
};

export type ActivityConsistencyProfile = {
  activityId: ActivityKey | string;
  currentWeek: ConsistencySummary;
  previousWeek: ConsistencySummary;
  currentMonth: ConsistencySummary;
  previousMonth: ConsistencySummary;
  rollingRecent: ConsistencySummary;
};

export type AttendanceSummary = {
  value: number | null;
  confidence: number;
  strongAttendanceCount: number;
  weakAttendanceCount: number;
  missedCount: number;
  eligibleOpportunities: number;
};

export type ReliabilityResult = {
  value: number | null;
  confidence: number;
  state: ReliabilityState;
  signals: {
    consistencyRatio: number | null;
    attendanceRatio: number | null;
    longestMissCluster: number;
    recentDirection: DirectionSignal;
    volatility: number | null;
  };
};

export type CapabilityPolicyType =
  | "QUANTITATIVE"
  | "FREQUENCY"
  | "MILESTONE"
  | "BINARY";

export type CapabilityPolicy = {
  type: CapabilityPolicyType;
  sampleWindow?: number;
  recentWindow?: number;
};

export type CapabilitySummary = {
  activityId: ActivityKey | string;
  policyType: CapabilityPolicyType;
  sustainableCapability: ConfidenceValue<number | null>;
  peakCapability: ConfidenceValue<number | null>;
  recentCapability: ConfidenceValue<number | null>;
  establishedCapability: ConfidenceValue<number | null>;
  confidence: number;
  volatility: number | null;
  momentum: DirectionSignal;
  direction: DirectionSignal;
  sampleCount: number;
  qualifyingSampleCount: number;
  baselineState: BaselineState;
};

export type TargetRelationshipResult = {
  state: TargetRelationship;
  confidence: number;
  evidence: string[];
};

export type GapClassificationResult = {
  classification: GapClassification;
  confidence: number;
  supportingEvidence: string[];
};

export type PeriodComparisonResult = {
  previous: number | null;
  current: number | null;
  absoluteChange: number | null;
  relativeChange: number | null;
  direction: ComparisonDirection;
  confidence: number;
};

export type ActivityDevelopmentState = {
  activityId: ActivityKey | string;
  executionSummary: EvidenceAggregation;
  consistency: {
    value: number | null;
    confidence: number;
    direction: DirectionSignal;
    profile: ActivityConsistencyProfile;
  };
  reliability: ReliabilityResult;
  attendance: AttendanceSummary;
  capability: CapabilitySummary;
  targetRelationship: TargetRelationshipResult;
  gapClassification: GapClassificationResult;
  updatedAt: string;
};

export type DevelopmentPillar = "HEALTH" | "DISCIPLINE" | "CAPABILITY" | "BALANCE";

export type PillarContributionRole = "PRIMARY" | "SECONDARY" | "SUPPORTING";

export type ActivityPillarContribution = {
  activityId: ActivityKey | string;
  pillar: DevelopmentPillar;
  contributionRole: PillarContributionRole;
  weightPolicyRef?: string;
};

export type PillarPressureFlag =
  | "CORE_WEAKNESS"
  | "BEHAVIOR_INTERFERENCE"
  | "RESTRAINT_VIOLATION"
  | "IMBALANCE"
  | "LOW_CONFIDENCE";

export type DevelopmentPillarState = {
  pillar: DevelopmentPillar;
  direction: DirectionSignal;
  confidence: number;
  supportingActivities: string[];
  weakActivities: string[];
  evidenceSummary: string[];
  recentState: DirectionSignal;
  establishedState: DirectionSignal;
  stability: number | null;
  momentum: DirectionSignal;
  pressureFlags: PillarPressureFlag[];
};

export type BehaviorCategory = "DEVELOPMENT" | "LIFESTYLE" | "RESTRICTED";

export type BehaviorEvent = {
  id: string;
  behaviorId: string;
  behaviorType: string;
  category: BehaviorCategory;
  userId?: string;
  occurredAt: string;
  quantity?: number;
  unit?: string;
  source: EvidenceSource;
  notes?: string;
  metadata?: EvidenceMetadata;
  createdAt: string;
};

export type RestraintMode =
  | "ZERO"
  | "FREQUENCY_CAP"
  | "QUANTITY_CAP"
  | "SPACING_RULE"
  | "REDUCTION_TARGET";

export type RestraintContract = {
  id: string;
  behaviorId: string;
  userId?: string;
  mode: RestraintMode;
  period: "DAY" | "WEEK" | "MONTH";
  allowedOccurrences?: number;
  allowedQuantity?: number;
  unit?: string;
  active: boolean;
  startedAt: string;
};

export type RestraintEvaluationStatus =
  | "NO_DATA"
  | "WITHIN_LIMIT"
  | "APPROACHING_LIMIT"
  | "VIOLATED"
  | "REPEATED_VIOLATION";

export type RestraintEvaluation = {
  contractId: string;
  behaviorId: string;
  status: RestraintEvaluationStatus;
  occurrences: number;
  allowedOccurrences: number | null;
  violations: number;
  adherence: number | null;
  confidence: number;
  evidenceRefs: string[];
};

export type BehaviorImpactDirection =
  | "NO_MEANINGFUL_INTERFERENCE"
  | "NEGATIVE_ASSOCIATION"
  | "POSITIVE_ASSOCIATION"
  | "UNKNOWN";

export type BehaviorInterferenceSignal = {
  behaviorId: string;
  affectedActivityId?: string;
  affectedPillar?: DevelopmentPillar;
  impactDirection: BehaviorImpactDirection;
  estimatedStrength: number | null;
  confidence: number;
  sampleCount: number;
  recurringPattern: boolean;
  evidenceRefs: string[];
  explanation: string;
};

export type BehavioralFrictionLevel =
  | "NONE"
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "RECOVERING";

export type BehavioralFrictionState = {
  state: BehavioralFrictionLevel;
  confidence: number;
  affectedPillars: DevelopmentPillar[];
  affectedCommitments: string[];
  activeSignals: BehaviorInterferenceSignal[];
  trend: DirectionSignal;
};

export type BehavioralDebtLevel = "NONE" | "WATCHING" | "FORMING" | "ACTIVE";

export type BehavioralDebtState = {
  state: BehavioralDebtLevel;
  affectedPillars: DevelopmentPillar[];
  evidenceStrength: number | null;
  confidence: number;
  recentDirection: DirectionSignal;
  unresolvedPatterns: string[];
};

export type DevelopmentPressure = {
  pillar: DevelopmentPillar;
  reason: string;
  confidence: number;
  severity: "LOW" | "MODERATE" | "HIGH";
  evidenceRefs: string[];
};

export type PillarImbalanceState =
  | "NO_MEANINGFUL_IMBALANCE"
  | "WATCH"
  | "IMBALANCED"
  | "INSUFFICIENT_EVIDENCE";

export type PillarImbalance = {
  pillar: DevelopmentPillar;
  state: PillarImbalanceState;
  confidence: number;
  relativeToPersonalHistory: DirectionSignal;
  contributingSignals: string[];
};

export type CoreWeaknessSignal = {
  commitmentId: string;
  activityId: string;
  pillar: DevelopmentPillar;
  severity: "LOW" | "MODERATE" | "HIGH";
  confidence: number;
  persistence: number;
  evidenceRefs: string[];
};

export type DisciplineDevelopmentState = {
  direction: DirectionSignal;
  confidence: number;
  reliabilityPattern: ReliabilityState;
  majorWeaknesses: string[];
  majorStrengths: string[];
  recentTrend: DirectionSignal;
};

export type MonthlyBehaviorReport = {
  behaviorId: string;
  behaviorLabel: string;
  occurrences: number;
  restraintStatus?: RestraintEvaluationStatus;
  detectedInterference: boolean;
  confidence: number;
  affectedActivities: string[];
  affectedPillars: DevelopmentPillar[];
  noInterferenceFinding: boolean;
  trendFromPreviousMonth: ComparisonDirection;
  summary: string;
};

export type DevelopmentAnalysis = {
  strongestDevelopment: DevelopmentPillar[];
  weakestDevelopment: DevelopmentPillar[];
  improvingPillars: DevelopmentPillar[];
  deterioratingPillars: DevelopmentPillar[];
  behavioralFriction: BehavioralFrictionState;
  restraintSummary: RestraintEvaluation[];
  balanceSummary: DevelopmentPillarState | null;
  evidenceConfidence: number;
};

export type MonthlyEvaluationOutcome =
  | "FAIL"
  | "PASS"
  | "STRONG_PASS"
  | "FULL_COMPLETION";

export type MonthlyEvaluationRecord = {
  id: string;
  period: string;
  outcome: MonthlyEvaluationOutcome;
  confidence: number;
  evidenceRefs: string[];
};

export type ProgressionRatingBreakdown = {
  disciplineContribution: number;
  capabilityContribution: number;
  healthContribution: number;
  balanceContribution: number;
  commitmentExecutionContribution: number;
  progressionEvidenceContribution: number;
  recoveryContribution: number;
  coreWeaknessPressure: number;
  behavioralFrictionPressure: number;
  instabilityPressure: number;
  rebuildingPressure: number;
  confidence: number;
  finalRating: number;
};

export type ProgressionRatingInput = {
  activityStates: readonly ActivityDevelopmentState[];
  pillarStates: readonly DevelopmentPillarState[];
  coreWeaknesses?: readonly CoreWeaknessSignal[];
  behavioralFriction?: BehavioralFrictionState;
  behavioralDebt?: BehavioralDebtState;
  developmentPressure?: readonly DevelopmentPressure[];
  monthlyEvaluations?: readonly MonthlyEvaluationRecord[];
  recoveryMemory?: LevelMemory;
  lifetimeXp?: number;
};

export type LevelCandidateStatus =
  | "NONE"
  | "EMERGING"
  | "CONFIRMING"
  | "CONFIRMED"
  | "LOST";

export type LevelCandidateState = {
  candidateLevel: number | null;
  startedAt?: string;
  evidenceStrength: number;
  confidence: number;
  qualifyingPeriods: number;
  interruptions: number;
  status: LevelCandidateStatus;
  evidenceRefs: string[];
};

export type LevelRiskStatus =
  | "SAFE"
  | "WATCH"
  | "AT_RISK"
  | "CONFIRMING_DEMOTION"
  | "DEMOTED"
  | "RECOVERING";

export type LevelRiskState = {
  currentLevel: number;
  supportedLevel: number;
  startedAt?: string;
  deteriorationStrength: number;
  confidence: number;
  evidencePeriods: number;
  status: LevelRiskStatus;
  evidenceRefs: string[];
};

export type HighestLevelRecord = {
  level: number;
  firstReachedAt: string;
  lastReachedAt: string;
  establishmentStrength: number;
  durationMaintainedPeriods: number;
  supportingEvidenceSummary: string[];
};

export type RecoveryState =
  | "NONE"
  | "EARLY_COMEBACK"
  | "ACTIVE_RECOVERY"
  | "NEAR_PREVIOUS_STANDARD"
  | "PREVIOUS_STANDARD_RESTORED";

export type LevelMemory = {
  highestLevel: HighestLevelRecord;
  currentLevel: number;
  collapseCount: number;
  recoveryState: RecoveryState;
  recoveryAdvantage: number;
};

export type LevelEstablishmentStrength = {
  level: number;
  value: number;
  confidence: number;
  durationMaintainedPeriods: number;
  confirmationQuality: number;
  volatility: number | null;
};

export type ProgressionDomainEventType =
  | "PROGRESSION_RATING_UPDATED"
  | "LEVEL_CANDIDATE_STARTED"
  | "LEVEL_CANDIDATE_LOST"
  | "LEVEL_CONFIRMED"
  | "LEVEL_RISK_STARTED"
  | "LEVEL_RISK_RECOVERED"
  | "LEVEL_DEMOTED"
  | "HIGHEST_LEVEL_UPDATED"
  | "RECOVERY_STARTED"
  | "PREVIOUS_LEVEL_RESTORED";

export type ProgressionDomainEvent = {
  id: string;
  type: ProgressionDomainEventType;
  occurredAt: string;
  level?: number;
  rating?: number;
  evidenceRefs: string[];
};

export type RatingHistoryEntry = {
  timestamp: string;
  progressionRating: number;
  confidence: number;
  currentLevel: number;
  candidateLevel?: number;
  levelRiskStatus: LevelRiskStatus;
  componentSummary: Pick<
    ProgressionRatingBreakdown,
    | "disciplineContribution"
    | "capabilityContribution"
    | "healthContribution"
    | "balanceContribution"
    | "coreWeaknessPressure"
    | "behavioralFrictionPressure"
  >;
};

export type LevelSummaryViewModel = {
  currentLevel: number;
  highestLevel: number;
  state:
    | "STABLE"
    | "RISING"
    | "CONFIRMING"
    | "LEVEL_AT_RISK"
    | "RECOVERING";
  candidateLevel?: number;
  candidateProgress?: "EARLY" | "BUILDING" | "STRONG";
  riskState?: LevelRiskStatus;
  direction: DirectionSignal;
  confidence: number;
};

export type LevelProgressionState = {
  currentLevel: number;
  highestLevel: HighestLevelRecord;
  supportedLevel: number;
  rating: ProgressionRatingBreakdown;
  candidate: LevelCandidateState;
  risk: LevelRiskState;
  establishment: LevelEstablishmentStrength;
  recovery: LevelMemory;
  historyEntry: RatingHistoryEntry;
  events: ProgressionDomainEvent[];
  view: LevelSummaryViewModel;
};
