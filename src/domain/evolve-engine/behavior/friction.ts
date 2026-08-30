import { average, clamp, round } from "../internal/statistics";
import type {
  BehaviorInterferenceSignal,
  BehavioralFrictionState,
  DevelopmentPillar,
  RestraintEvaluation,
} from "../types";

export function deriveBehavioralFriction({
  signals,
  restraintEvaluations = [],
}: {
  signals: readonly BehaviorInterferenceSignal[];
  restraintEvaluations?: readonly RestraintEvaluation[];
}): BehavioralFrictionState {
  const activeSignals = signals.filter(
    (signal) =>
      signal.impactDirection === "NEGATIVE_ASSOCIATION" &&
      signal.recurringPattern &&
      signal.confidence >= 0.35,
  );
  const restraintViolations = restraintEvaluations.filter(
    (evaluation) =>
      evaluation.status === "VIOLATED" ||
      evaluation.status === "REPEATED_VIOLATION",
  );
  const evidenceStrength = average([
    ...activeSignals.map((signal) => signal.estimatedStrength ?? 0),
    ...restraintViolations.map((evaluation) => evaluation.violations / 3),
  ]);
  const confidence = round(
    clamp(
      average([
        ...activeSignals.map((signal) => signal.confidence),
        ...restraintViolations.map((evaluation) => evaluation.confidence),
      ]) ?? 0,
    ),
  );
  const affectedPillars = unique(
    activeSignals
      .map((signal) => signal.affectedPillar)
      .filter((pillar): pillar is DevelopmentPillar => pillar !== undefined),
  );

  return {
    state: resolveFrictionState(evidenceStrength ?? 0, confidence, restraintViolations.length),
    confidence,
    affectedPillars,
    affectedCommitments: unique(
      activeSignals
        .map((signal) => signal.affectedActivityId)
        .filter((activityId): activityId is string => activityId !== undefined),
    ),
    activeSignals,
    trend: activeSignals.length > 0 ? "DECLINING" : "STABLE",
  };
}

function resolveFrictionState(
  evidenceStrength: number,
  confidence: number,
  restraintViolationCount: number,
): BehavioralFrictionState["state"] {
  if (confidence < 0.3 || (evidenceStrength === 0 && restraintViolationCount === 0)) {
    return "NONE";
  }

  if (evidenceStrength >= 0.55 || restraintViolationCount >= 2) {
    return "HIGH";
  }

  if (evidenceStrength >= 0.3 || restraintViolationCount === 1) {
    return "MODERATE";
  }

  return "LOW";
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}
