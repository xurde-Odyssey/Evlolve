import { clamp, round } from "../internal/statistics";
import type {
  ActivityDevelopmentState,
  CoreWeaknessSignal,
  TargetAdaptationState,
  TargetProgressionRecommendation,
} from "../types";

export type TargetProgressionPolicy = {
  hardMaxIncreaseRatio: number;
  normalIncreaseRatio: number;
  minimumIncreaseSurplus: number;
  highVolatilityLimit: number;
  highConfidenceFloor: number;
  strongConsistencyFloor: number;
  adaptationEvidenceFloor: number;
};

export const defaultTargetProgressionPolicy = {
  hardMaxIncreaseRatio: 0.3,
  normalIncreaseRatio: 0.14,
  minimumIncreaseSurplus: 0.1,
  highVolatilityLimit: 0.24,
  highConfidenceFloor: 0.62,
  strongConsistencyFloor: 0.78,
  adaptationEvidenceFloor: 5,
} satisfies TargetProgressionPolicy;

export function evaluateTargetProgression({
  activityState,
  currentTargetValue,
  unit,
  commitmentId,
  competingCoreWeaknesses = [],
  now,
  policy = defaultTargetProgressionPolicy,
}: {
  activityState: ActivityDevelopmentState;
  currentTargetValue: number;
  unit?: string;
  commitmentId?: string;
  competingCoreWeaknesses?: readonly CoreWeaknessSignal[];
  now: string;
  policy?: TargetProgressionPolicy;
}): TargetProgressionRecommendation {
  const sustainable = activityState.capability.sustainableCapability.value;
  const peak = activityState.capability.peakCapability.value;
  const confidence = Math.min(
    activityState.capability.confidence,
    activityState.consistency.confidence,
    activityState.targetRelationship.confidence,
  );
  const sustainableSurplusRatio =
    sustainable === null ? null : (sustainable - currentTargetValue) / currentTargetValue;
  const peakSurplusRatio =
    peak === null ? null : (peak - currentTargetValue) / currentTargetValue;
  const volatility = activityState.capability.volatility ?? 0;
  const hasSeriousCompetingWeakness = competingCoreWeaknesses.some(
    (weakness) =>
      weakness.activityId !== activityState.activityId &&
      weakness.severity === "HIGH" &&
      weakness.confidence >= 0.65,
  );
  const common = {
    id: `target-${activityState.activityId}-${now}`,
    activityId: activityState.activityId,
    commitmentId,
    currentTargetValue,
    unit,
    sustainableSurplusRatio: roundNullable(sustainableSurplusRatio),
    peakSurplusRatio: roundNullable(peakSurplusRatio),
    confidence: round(confidence),
    createdAt: now,
    userDecisionRequired: false,
  };

  if (activityState.gapClassification.classification === "CAPABILITY_GAP") {
    const intermediate = sustainable === null
      ? currentTargetValue * 0.9
      : Math.max(sustainable * 0.94, currentTargetValue * 0.7);

    return {
      ...common,
      action:
        activityState.targetRelationship.state === "POTENTIALLY_UNSUSTAINABLE"
          ? "INTERMEDIATE_TARGET"
          : "RECALIBRATE_DOWNWARD",
      proposedTargetValue: round(Math.min(intermediate, currentTargetValue * 0.96), 2),
      reason: "Evidence suggests the current target may be ahead of demonstrated sustainable capability.",
      supportingEvidence: [
        "Capability gap detected.",
        ...activityState.gapClassification.supportingEvidence,
      ],
      userDecisionRequired: true,
    };
  }

  if (
    sustainableSurplusRatio !== null &&
    sustainableSurplusRatio >= policy.minimumIncreaseSurplus &&
    activityState.capability.baselineState === "ESTABLISHED" &&
    activityState.targetRelationship.state === "BELOW_CAPABILITY" &&
    confidence >= policy.highConfidenceFloor &&
    (activityState.consistency.value ?? 0) >= policy.strongConsistencyFloor &&
    volatility <= policy.highVolatilityLimit &&
    !hasSeriousCompetingWeakness
  ) {
    const sustainableValue = sustainable ?? currentTargetValue;
    const increaseRatio = Math.min(
      sustainableSurplusRatio * 0.55,
      policy.normalIncreaseRatio,
      policy.hardMaxIncreaseRatio,
    );
    const proposed = Math.min(
      currentTargetValue * (1 + increaseRatio),
      currentTargetValue * (1 + policy.hardMaxIncreaseRatio),
      sustainableValue * 0.95,
    );

    return {
      ...common,
      action: "INCREASE",
      proposedTargetValue: round(proposed, 2),
      reason: "Repeated stable surplus suggests the target may now trail demonstrated capability.",
      supportingEvidence: [
        "Sustainable capability is above the current target.",
        "Recent consistency is strong enough to consider a controlled increase.",
      ],
      userDecisionRequired: true,
    };
  }

  if (hasSeriousCompetingWeakness) {
    return {
      ...common,
      action: "MAINTAIN",
      reason: "A more serious Core weakness should take priority before increasing this target.",
      supportingEvidence: ["Opportunity cost favors restoring the weaker Core area first."],
    };
  }

  return {
    ...common,
    action: "MAINTAIN",
    reason:
      activityState.gapClassification.classification === "DISCIPLINE_GAP"
        ? "The target remains credible; execution reliability needs restoration before target changes."
        : "Current evidence favors stabilizing the existing target.",
    supportingEvidence:
      volatility > policy.highVolatilityLimit
        ? ["Output volatility is still too high for a confident target increase."]
        : ["No target mutation is recommended from the current evidence."],
  };
}

export function startTargetAdaptation({
  id,
  activityId,
  previousTargetValue,
  newTargetValue,
  unit,
  startedAt,
  recommendationRef,
}: {
  id: string;
  activityId: string;
  previousTargetValue: number;
  newTargetValue: number;
  unit?: string;
  startedAt: string;
  recommendationRef?: string;
}): TargetAdaptationState {
  return {
    id,
    activityId,
    previousTargetValue,
    newTargetValue,
    unit,
    status: "ADAPTING",
    startedAt,
    evidenceCount: 0,
    qualifyingCount: 0,
    underperformanceCount: 0,
    confidence: 0,
    protectionActive: true,
    evidenceRefs: recommendationRef ? [recommendationRef] : [],
  };
}

export function evaluateTargetAdaptation({
  adaptation,
  activityState,
  userRejectedRecalibration = adaptation.userRejectedRecalibration ?? false,
  policy = defaultTargetProgressionPolicy,
}: {
  adaptation: TargetAdaptationState;
  activityState: ActivityDevelopmentState;
  userRejectedRecalibration?: boolean;
  policy?: TargetProgressionPolicy;
}): TargetAdaptationState {
  if (adaptation.status === "ESTABLISHED" || adaptation.status === "UNSUSTAINABLE") {
    return adaptation;
  }

  const evidenceCount = adaptation.evidenceCount + activityState.executionSummary.eligibleRequirements;
  const qualifyingCount =
    adaptation.qualifyingCount +
    activityState.executionSummary.fullCount +
    activityState.executionSummary.qualifyingPartialCount;
  const underperformanceCount =
    adaptation.underperformanceCount +
    activityState.executionSummary.missedCount +
    activityState.executionSummary.insufficientCount;
  const ratio = evidenceCount === 0 ? null : qualifyingCount / evidenceCount;
  const confidence = clamp(
    Math.min(activityState.consistency.confidence, activityState.capability.confidence) +
      Math.min(evidenceCount, 8) * 0.025,
  );
  const capabilityGap = activityState.gapClassification.classification === "CAPABILITY_GAP";
  const status =
    evidenceCount >= policy.adaptationEvidenceFloor && (ratio ?? 0) >= 0.82
      ? "ESTABLISHED"
      : evidenceCount >= policy.adaptationEvidenceFloor &&
          capabilityGap &&
          underperformanceCount >= Math.ceil(evidenceCount * 0.45)
        ? "UNSUSTAINABLE"
        : (ratio ?? 0) >= 0.68
          ? "STABILIZING"
          : "ADAPTING";
  const protectionActive =
    status !== "ESTABLISHED" &&
    !(status === "UNSUSTAINABLE" && userRejectedRecalibration && evidenceCount >= policy.adaptationEvidenceFloor + 2);

  return {
    ...adaptation,
    status,
    evidenceCount,
    qualifyingCount,
    underperformanceCount,
    confidence: round(confidence),
    protectionActive,
    userRejectedRecalibration,
    evidenceRefs: [
      ...adaptation.evidenceRefs,
      ...Object.entries(activityState.executionSummary.executionDistribution)
        .filter(([, count]) => count > 0)
        .map(([state]) => `${activityState.activityId}:${state}`),
    ],
  };
}

function roundNullable(value: number | null) {
  return value === null ? null : round(value);
}
