import type {
  ActivityDevelopmentState,
  BehavioralFrictionState,
  BossEligibilityResult,
  CommitmentCapacityState,
  CoreWeaknessSignal,
  DevelopmentPressure,
  EvolveRecommendation,
  LevelProgressionState,
  RecommendationCategory,
  RecommendationEngineResult,
  RecommendationHistoryRecord,
  TargetProgressionRecommendation,
} from "../types";

export type RecommendationEnginePolicy = {
  maxSecondaryRecommendations: number;
  repeatSuppressionDays: number;
};

export const defaultRecommendationEnginePolicy = {
  maxSecondaryRecommendations: 2,
  repeatSuppressionDays: 14,
} satisfies RecommendationEnginePolicy;

export function generateRecommendations({
  activityStates,
  targetRecommendations = [],
  coreWeaknesses = [],
  developmentPressure = [],
  behavioralFriction,
  bossEligibility,
  levelState,
  recommendationHistory = [],
  commitmentCapacity,
  now,
  policy = defaultRecommendationEnginePolicy,
}: {
  activityStates: readonly ActivityDevelopmentState[];
  targetRecommendations?: readonly TargetProgressionRecommendation[];
  coreWeaknesses?: readonly CoreWeaknessSignal[];
  developmentPressure?: readonly DevelopmentPressure[];
  behavioralFriction?: BehavioralFrictionState;
  bossEligibility?: BossEligibilityResult;
  levelState?: LevelProgressionState | null;
  recommendationHistory?: readonly RecommendationHistoryRecord[];
  commitmentCapacity?: CommitmentCapacityState;
  now: string;
  policy?: RecommendationEnginePolicy;
}): RecommendationEngineResult {
  const candidates = [
    ...weaknessRecommendations(coreWeaknesses, now),
    ...targetRecommendationItems(targetRecommendations, coreWeaknesses, now),
    ...behaviorRecommendations(developmentPressure, behavioralFriction, now),
    ...bossRecommendations(bossEligibility, now),
    ...recoveryRecommendations(levelState, now),
    ...disciplineRecommendations(activityStates, now),
    ...capacityRecommendations(commitmentCapacity, coreWeaknesses, now),
  ];
  const suppressed: string[] = [];
  const filtered = candidates.filter((candidate) => {
    if (isSuppressed(candidate, recommendationHistory, now, policy.repeatSuppressionDays)) {
      suppressed.push(`${candidate.id}: repeated recommendation without new evidence`);
      return false;
    }

    return true;
  });
  const ranked = [...filtered].sort((a, b) => recommendationScore(b) - recommendationScore(a));
  const primary = ranked[0] ?? null;
  const secondary = ranked
    .slice(1)
    .filter((candidate) => !primary || candidate.evidenceSignature !== primary.evidenceSignature)
    .slice(0, policy.maxSecondaryRecommendations);

  return {
    primary,
    secondary,
    candidates: filtered,
    suppressed,
  };
}

function weaknessRecommendations(weaknesses: readonly CoreWeaknessSignal[], now: string) {
  return weaknesses
    .filter((weakness) => weakness.confidence >= 0.55)
    .map((weakness) =>
      recommendation({
        category: weakness.severity === "HIGH" ? "PRIORITIZE_CORE_AREA" : "RESTORE_WEAK_AREA",
        title: `Prioritize ${weakness.activityId}`,
        reason: "This Core area is currently the highest-value development constraint.",
        evidence: ["Core weakness remains visible despite strengths elsewhere."],
        confidence: weakness.confidence,
        urgency: weakness.severity === "HIGH" ? "HIGH" : "MODERATE",
        value: "HIGH",
        commitments: [weakness.commitmentId],
        activities: [weakness.activityId],
        pillars: [weakness.pillar],
        now,
        signature: `weakness:${weakness.commitmentId}:${weakness.severity}`,
      }),
    );
}

function targetRecommendationItems(
  targetRecommendations: readonly TargetProgressionRecommendation[],
  weaknesses: readonly CoreWeaknessSignal[],
  now: string,
) {
  const seriousWeakness = weaknesses.some(
    (weakness) => weakness.severity === "HIGH" && weakness.confidence >= 0.65,
  );

  return targetRecommendations.map((target) => {
    const category: RecommendationCategory =
      target.action === "INCREASE"
        ? "INCREASE_TARGET"
        : target.action === "MAINTAIN"
          ? "MAINTAIN_TARGET"
          : "RECALIBRATE_TARGET";
    const lowerPriorityIncrease = target.action === "INCREASE" && seriousWeakness;

    return recommendation({
      category: lowerPriorityIncrease ? "MAINTAIN_TARGET" : category,
      title:
        target.action === "INCREASE"
          ? `Review ${target.activityId} target`
          : target.action === "MAINTAIN"
            ? `Maintain ${target.activityId}`
            : `Reconsider ${target.activityId} target`,
      reason: lowerPriorityIncrease
        ? "A stronger Core weakness should be restored before optimizing this already-strong area."
        : target.reason,
      evidence: target.supportingEvidence,
      confidence: target.confidence,
      urgency: target.action === "RECALIBRATE_DOWNWARD" || target.action === "INTERMEDIATE_TARGET" ? "HIGH" : "MODERATE",
      value: target.action === "MAINTAIN" ? "MODERATE" : "HIGH",
      activities: [String(target.activityId)],
      pillars: [],
      proposedChange: {
        targetAction: target.action,
        targetValue: target.proposedTargetValue,
        unit: target.unit,
      },
      decisionRequired: target.userDecisionRequired && !lowerPriorityIncrease,
      now,
      signature: `target:${target.activityId}:${target.action}:${target.proposedTargetValue ?? "none"}`,
    });
  });
}

function behaviorRecommendations(
  pressure: readonly DevelopmentPressure[],
  friction: BehavioralFrictionState | undefined,
  now: string,
) {
  const recommendations = pressure
    .filter((item) => item.confidence >= 0.55 && item.severity !== "LOW")
    .map((item) =>
      recommendation({
        category: item.pillar === "BALANCE" ? "RESTORE_BALANCE" : "ADDRESS_BEHAVIOR_PATTERN",
        title: item.pillar === "BALANCE" ? "Restore balance" : `Address ${item.pillar.toLowerCase()} interference`,
        reason: "A recurring association is interfering with development evidence.",
        evidence: [item.reason],
        confidence: item.confidence,
        urgency: item.severity === "HIGH" ? "HIGH" : "MODERATE",
        value: item.severity === "HIGH" ? "HIGH" : "MODERATE",
        activities: [],
        pillars: [item.pillar],
        now,
        signature: `pressure:${item.pillar}:${item.reason}`,
      }),
    );

  if (!friction || friction.state === "NONE") {
    return recommendations;
  }

  return recommendations;
}

function bossRecommendations(bossEligibility: BossEligibilityResult | undefined, now: string) {
  if (!bossEligibility?.selectedBoss) {
    return [];
  }

  const boss = bossEligibility.selectedBoss;

  return [
    recommendation({
      category: "TAKE_BOSS",
      title: boss.title,
      reason: "A focused challenge is currently supported by your evidence.",
      evidence: boss.reason.supportingEvidence,
      confidence: boss.confidence,
      urgency: boss.family === "CORRECTIVE" || boss.family === "COMEBACK" ? "HIGH" : "MODERATE",
      value: boss.family === "CORRECTIVE" ? "HIGH" : "MODERATE",
      activities: boss.reason.affectedActivityIds,
      pillars: boss.reason.affectedPillars,
      decisionRequired: true,
      now,
      signature: `boss:${boss.evidenceSignature}`,
    }),
  ];
}

function recoveryRecommendations(levelState: LevelProgressionState | null | undefined, now: string) {
  if (!levelState || !["ACTIVE_RECOVERY", "NEAR_PREVIOUS_STANDARD"].includes(levelState.recovery.recoveryState)) {
    return [];
  }

  return [
    recommendation({
      category: "MAINTAIN_RECOVERY",
      title: "Maintain recovery",
      reason: "Recent evidence supports rebuilding toward a previously demonstrated standard.",
      evidence: ["Recovery memory is active."],
      confidence: levelState.rating.confidence,
      urgency: "MODERATE",
      value: "HIGH",
      activities: [],
      pillars: [],
      now,
      signature: `recovery:${levelState.currentLevel}:${levelState.highestLevel.level}`,
    }),
  ];
}

function disciplineRecommendations(activityStates: readonly ActivityDevelopmentState[], now: string) {
  return activityStates
    .filter((state) => state.gapClassification.classification === "DISCIPLINE_GAP")
    .map((state) =>
      recommendation({
        category: "REBUILD_DISCIPLINE",
        title: `Rebuild ${state.activityId} execution`,
        reason: "Capability exists, but recent execution has become unreliable.",
        evidence: state.gapClassification.supportingEvidence,
        confidence: state.gapClassification.confidence,
        urgency: "HIGH",
        value: "HIGH",
        activities: [String(state.activityId)],
        pillars: ["DISCIPLINE"],
        now,
        signature: `discipline:${state.activityId}`,
      }),
    );
}

function capacityRecommendations(
  capacity: CommitmentCapacityState | undefined,
  weaknesses: readonly CoreWeaknessSignal[],
  now: string,
) {
  if (!capacity) {
    return [];
  }

  const hasSeriousWeakness = weaknesses.some(
    (weakness) => weakness.severity === "HIGH" && weakness.confidence >= 0.65,
  );

  if (capacity.canAddCommitment && !hasSeriousWeakness && capacity.status === "STABLE") {
    return [
      recommendation({
        category: "ADD_NEW_COMMITMENT",
        title: "Consider another Growth Commitment",
        reason: "Current capacity and execution evidence can support additional responsibility.",
        evidence: [capacity.reason],
        confidence: capacity.confidence,
        urgency: "LOW",
        value: "MODERATE",
        activities: [],
        pillars: [],
        decisionRequired: true,
        now,
        signature: `capacity:add:${capacity.currentCapacity}:${capacity.activeCommitmentCount}`,
      }),
    ];
  }

  if (hasSeriousWeakness || !capacity.canAddCommitment || capacity.status !== "STABLE") {
    return [
      recommendation({
        category: "DO_NOT_ADD_COMMITMENT",
        title: "Do not add a commitment yet",
        reason: "Existing responsibility should stabilize before another serious commitment is added.",
        evidence: [capacity.reason],
        confidence: Math.max(capacity.confidence, hasSeriousWeakness ? 0.75 : 0.55),
        urgency: hasSeriousWeakness ? "HIGH" : "MODERATE",
        value: "HIGH",
        activities: weaknesses.map((weakness) => weakness.activityId),
        pillars: weaknesses.map((weakness) => weakness.pillar),
        now,
        signature: `capacity:hold:${capacity.currentCapacity}:${capacity.activeCommitmentCount}`,
      }),
    ];
  }

  return [];
}

function recommendation({
  category,
  title,
  reason,
  evidence,
  confidence,
  urgency,
  value,
  commitments = [],
  activities,
  pillars,
  proposedChange,
  decisionRequired = false,
  now,
  signature,
}: {
  category: RecommendationCategory;
  title: string;
  reason: string;
  evidence: string[];
  confidence: number;
  urgency: EvolveRecommendation["urgency"];
  value: EvolveRecommendation["expectedDevelopmentValue"];
  commitments?: string[];
  activities: string[];
  pillars: EvolveRecommendation["affectedPillars"];
  proposedChange?: EvolveRecommendation["proposedChange"];
  decisionRequired?: boolean;
  now: string;
  signature: string;
}): EvolveRecommendation {
  return {
    id: `rec-${signature}-${now}`,
    category,
    title,
    reason,
    supportingEvidence: evidence,
    confidence,
    urgency,
    expectedDevelopmentValue: value,
    affectedCommitments: commitments,
    affectedActivities: activities,
    affectedPillars: pillars,
    proposedChange,
    userDecisionRequired: decisionRequired,
    status: "PENDING",
    createdAt: now,
    evidenceSignature: signature,
  };
}

function recommendationScore(recommendation: EvolveRecommendation) {
  const urgency = recommendation.urgency === "HIGH" ? 3 : recommendation.urgency === "MODERATE" ? 2 : 1;
  const value =
    recommendation.expectedDevelopmentValue === "HIGH"
      ? 3
      : recommendation.expectedDevelopmentValue === "MODERATE"
        ? 2
        : 1;
  const categoryPriority: Partial<Record<RecommendationCategory, number>> = {
    PRIORITIZE_CORE_AREA: 4,
    RESTORE_WEAK_AREA: 3.5,
    REBUILD_DISCIPLINE: 3.2,
    RECALIBRATE_TARGET: 3,
    DO_NOT_ADD_COMMITMENT: 2.9,
    ADDRESS_BEHAVIOR_PATTERN: 2.7,
    RESTORE_BALANCE: 2.7,
    TAKE_BOSS: 2.4,
    ADD_NEW_COMMITMENT: 1.6,
    INCREASE_TARGET: 1.8,
    MAINTAIN_TARGET: 1.2,
  };

  return (categoryPriority[recommendation.category] ?? 1) + urgency + value + recommendation.confidence * 2;
}

function isSuppressed(
  recommendation: EvolveRecommendation,
  history: readonly RecommendationHistoryRecord[],
  now: string,
  suppressionDays: number,
) {
  const nowMs = Date.parse(now);

  return history.some((record) => {
    if (record.evidenceSignature !== recommendation.evidenceSignature) {
      return false;
    }

    const createdMs = Date.parse(record.createdAt);

    return Number.isFinite(createdMs) && nowMs - createdMs < suppressionDays * 86_400_000;
  });
}
