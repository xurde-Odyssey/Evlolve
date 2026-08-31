import { aggregateMonthlyEvidence } from "../aggregation/monthly";
import { aggregateWeeklyEvidence } from "../aggregation/weekly";
import { evaluateAchievements } from "../achievements/engine";
import { evaluateBossEligibility } from "../boss/eligibility";
import { evaluateCommitmentCapacity, initialCommitmentCapacityState } from "../capacity/state";
import { buildActivityDevelopmentState } from "../development/activity-state";
import { createJourneyEvents } from "../journey/events";
import { buildPillarStates } from "../pillars/mapping";
import { deriveDevelopmentPressure } from "../pillars/pressure";
import { calculateProgressionRating } from "../progression/rating";
import { evaluateLevelProgression } from "../progression/level-state";
import { generateRecommendations } from "../recommendation/engine";
import { evaluateTargetProgression } from "../target/progression";
import { appendXpTransactions } from "../xp/ledger";
import {
  createMonthlyCommitmentXpTransaction,
  createWeeklyConsistencyXpTransaction,
  defaultXpPolicy,
  type XpPolicy,
} from "../xp/policy";
import type {
  AchievementAward,
  ActivityExecutionEvidence,
  BehavioralFrictionState,
  BossHistoryRecord,
  CloseoutResult,
  CommitmentCapacityState,
  CoreWeaknessSignal,
  HighestLevelRecord,
  JourneyProgressionEvent,
  LevelCandidateState,
  LevelRiskState,
  MonthlyDevelopmentSnapshot,
  MonthlyEvaluationRecord,
  RatingHistoryEntry,
  WeeklyDevelopmentSnapshot,
  XpTransaction,
} from "../types";

export type CloseoutInput = {
  evidence: readonly ActivityExecutionEvidence[];
  anchorDate: string;
  activityIds?: readonly string[];
  targetValues?: Record<string, number>;
  currentLevel: number;
  highestLevel: HighestLevelRecord;
  candidate?: LevelCandidateState;
  risk?: LevelRiskState;
  ratingHistory?: readonly RatingHistoryEntry[];
  monthlyEvaluations?: readonly MonthlyEvaluationRecord[];
  existingXpLedger?: readonly XpTransaction[];
  existingAchievements?: readonly AchievementAward[];
  existingJourneyEvents?: readonly JourneyProgressionEvent[];
  previousCapacity?: CommitmentCapacityState;
  activeCommitmentCount: number;
  coreWeaknesses?: readonly CoreWeaknessSignal[];
  behavioralFriction?: BehavioralFrictionState;
  bossHistory?: readonly BossHistoryRecord[];
  xpPolicy?: XpPolicy;
};

export function processWeeklyCloseout(input: CloseoutInput): CloseoutResult {
  const policy = input.xpPolicy ?? defaultXpPolicy;
  const idempotencyKey = `weekly:${input.anchorDate}:${policy.version}`;
  const { activityStates, pillarStates, rating, levelState, targetRecommendations, capacity, recommendations } =
    deriveCloseoutState(input);
  const weeklyAggregation = aggregateWeeklyEvidence(input.evidence, input.anchorDate);
  const weeklyXp = createWeeklyConsistencyXpTransaction({
    sourceId: idempotencyKey,
    consistencyRatio: weeklyAggregation.consistencyPercentage,
    reliabilityConfidence: averageConfidence(activityStates.map((state) => state.reliability.confidence)),
    distributionStability: averageConfidence(
      activityStates
        .map((state) => state.consistency.profile.currentWeek.patternSignals.consistencyStability)
        .filter((value): value is number => value !== null),
    ),
    occurredAt: input.anchorDate,
    evidenceRefs: input.evidence.map((item) => item.id),
    policy,
  });
  const ledger = appendXpTransactions(input.existingXpLedger ?? [], [weeklyXp]);
  const snapshot: WeeklyDevelopmentSnapshot = {
    id: idempotencyKey,
    periodStart: weeklyAggregation.periodStart,
    periodEnd: weeklyAggregation.periodEnd,
    policyVersion: policy.version,
    consistency: weeklyAggregation,
    activityStates,
    pillarStates,
    progressionRating: rating,
    level: levelState.view,
    behavioralFriction: input.behavioralFriction,
    coreWeaknesses: [...(input.coreWeaknesses ?? [])],
    commitmentCapacity: capacity,
    xpEarned: ledger.reduce((total, transaction) => total + transaction.amount, 0) - (input.existingXpLedger ?? []).reduce((total, transaction) => total + transaction.amount, 0),
    recommendations: [recommendations.primary, ...recommendations.secondary].filter((item) => item !== null),
  };

  void targetRecommendations;

  return {
    idempotencyKey,
    xpTransactions: ledger.filter((transaction) => !(input.existingXpLedger ?? []).some((existing) => existing.id === transaction.id)),
    achievementsEarned: [],
    journeyEvents: [],
    capacity,
    weeklySnapshot: snapshot,
  };
}

export function processMonthlyCloseout(input: CloseoutInput): CloseoutResult {
  const policy = input.xpPolicy ?? defaultXpPolicy;
  const idempotencyKey = `monthly:${input.anchorDate}:${policy.version}`;
  const { activityStates, pillarStates, rating, levelState, capacity, recommendations } = deriveCloseoutState(input);
  const monthlyAggregation = aggregateMonthlyEvidence(input.evidence, input.anchorDate);
  const monthlyXp = (input.monthlyEvaluations ?? []).map((record) =>
    createMonthlyCommitmentXpTransaction({
      sourceId: `${idempotencyKey}:${record.id}`,
      outcome: record.outcome,
      confidence: record.confidence,
      occurredAt: input.anchorDate,
      evidenceRefs: record.evidenceRefs,
      policy,
    }),
  );
  const achievements = evaluateAchievements({
    existingAwards: input.existingAchievements ?? [],
    activityStates,
    monthlyEvaluations: input.monthlyEvaluations ?? [],
    bossHistory: input.bossHistory ?? [],
    levelState,
    now: input.anchorDate,
    xpPolicy: policy,
  });
  const journeyEvents = createJourneyEvents({
    achievements: achievements.awards,
    bossHistory: input.bossHistory ?? [],
    levelState,
    capacity,
    existingEvents: input.existingJourneyEvents ?? [],
    now: input.anchorDate,
    policyVersion: policy.version,
  });
  const ledger = appendXpTransactions(input.existingXpLedger ?? [], [
    ...monthlyXp,
    ...achievements.xpTransactions,
  ]);
  const snapshot: MonthlyDevelopmentSnapshot = {
    id: idempotencyKey,
    periodStart: monthlyAggregation.periodStart,
    periodEnd: monthlyAggregation.periodEnd,
    policyVersion: policy.version,
    consistency: monthlyAggregation,
    activityStates,
    pillarStates,
    progressionRating: rating,
    level: levelState.view,
    behavioralFriction: input.behavioralFriction,
    coreWeaknesses: [...(input.coreWeaknesses ?? [])],
    commitmentCapacity: capacity,
    xpEarned: ledger.reduce((total, transaction) => total + transaction.amount, 0) - (input.existingXpLedger ?? []).reduce((total, transaction) => total + transaction.amount, 0),
    recommendations: [recommendations.primary, ...recommendations.secondary].filter((item) => item !== null),
    monthlyOutcomes: [...(input.monthlyEvaluations ?? [])],
    achievementsEarned: achievements.awards,
    bossOutcomes: [...(input.bossHistory ?? [])],
    journeyEvents,
  };

  return {
    idempotencyKey,
    xpTransactions: ledger.filter((transaction) => !(input.existingXpLedger ?? []).some((existing) => existing.id === transaction.id)),
    achievementsEarned: achievements.awards,
    journeyEvents,
    capacity,
    monthlySnapshot: snapshot,
  };
}

function deriveCloseoutState(input: CloseoutInput) {
  const activityIds = input.activityIds ?? Array.from(new Set(input.evidence.map((item) => String(item.activityId))));
  const activityStates = activityIds.map((activityId) =>
    buildActivityDevelopmentState(input.evidence, {
      activityId,
      anchorDate: input.anchorDate,
      currentTargetValue: input.targetValues?.[activityId],
    }),
  );
  const pillarStates = buildPillarStates(activityStates);
  const developmentPressure = deriveDevelopmentPressure({
    coreWeaknesses: input.coreWeaknesses ?? [],
  });
  const rating = calculateProgressionRating({
    activityStates,
    pillarStates,
    coreWeaknesses: input.coreWeaknesses ?? [],
    behavioralFriction: input.behavioralFriction,
    developmentPressure,
  });
  const levelState = evaluateLevelProgression({
    currentLevel: input.currentLevel,
    highestLevel: input.highestLevel,
    rating,
    now: input.anchorDate,
    candidate: input.candidate,
    risk: input.risk,
    ratingHistory: input.ratingHistory,
    monthlyEvaluations: input.monthlyEvaluations,
  });
  const capacity = evaluateCommitmentCapacity({
    previous: input.previousCapacity ?? initialCommitmentCapacityState(input.activeCommitmentCount),
    activityStates,
    monthlyEvaluations: input.monthlyEvaluations,
    coreWeaknesses: input.coreWeaknesses,
    behavioralFriction: input.behavioralFriction,
    levelState,
    activeCommitmentCount: input.activeCommitmentCount,
  });
  const targetRecommendations = activityStates
    .map((state) => {
      const targetValue = input.targetValues?.[String(state.activityId)];

      return targetValue
        ? evaluateTargetProgression({
            activityState: state,
            currentTargetValue: targetValue,
            now: input.anchorDate,
            competingCoreWeaknesses: input.coreWeaknesses,
          })
        : null;
    })
    .filter((item) => item !== null);
  const bossEligibility = evaluateBossEligibility({
    activityStates,
    targetRecommendations,
    coreWeaknesses: input.coreWeaknesses,
    behavioralFriction: input.behavioralFriction,
    developmentPressure,
    levelState,
    bossHistory: input.bossHistory,
    now: input.anchorDate,
  });
  const recommendations = generateRecommendations({
    activityStates,
    targetRecommendations,
    coreWeaknesses: input.coreWeaknesses,
    behavioralFriction: input.behavioralFriction,
    developmentPressure,
    bossEligibility,
    levelState,
    commitmentCapacity: capacity,
    now: input.anchorDate,
  });

  return { activityStates, pillarStates, rating, levelState, capacity, targetRecommendations, recommendations };
}

function averageConfidence(values: readonly number[]) {
  return values.length === 0 ? 0.5 : values.reduce((total, value) => total + value, 0) / values.length;
}
