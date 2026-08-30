import { average, clamp, round } from "../internal/statistics";
import type {
  BehavioralDebtState,
  BehavioralFrictionState,
  RestraintEvaluation,
} from "../types";

export function deriveBehavioralDebt({
  friction,
  restraintEvaluations = [],
}: {
  friction: BehavioralFrictionState;
  restraintEvaluations?: readonly RestraintEvaluation[];
}): BehavioralDebtState {
  const repeatedViolations = restraintEvaluations.filter(
    (evaluation) => evaluation.status === "REPEATED_VIOLATION",
  );
  const evidenceStrength = average([
    ...(friction.state === "NONE" ? [] : [friction.confidence]),
    ...repeatedViolations.map((evaluation) => evaluation.confidence),
  ]);
  const confidence = round(clamp(evidenceStrength ?? 0));

  return {
    state: resolveDebtState(friction, repeatedViolations.length, confidence),
    affectedPillars: friction.affectedPillars,
    evidenceStrength: evidenceStrength === null ? null : round(evidenceStrength),
    confidence,
    recentDirection: friction.trend,
    unresolvedPatterns: [
      ...friction.activeSignals.map((signal) => signal.behaviorId),
      ...repeatedViolations.map((evaluation) => evaluation.behaviorId),
    ],
  };
}

function resolveDebtState(
  friction: BehavioralFrictionState,
  repeatedViolationCount: number,
  confidence: number,
): BehavioralDebtState["state"] {
  if (confidence < 0.35) {
    return "NONE";
  }

  if (friction.state === "HIGH" || repeatedViolationCount > 0) {
    return "ACTIVE";
  }

  if (friction.state === "MODERATE") {
    return "FORMING";
  }

  if (friction.state === "LOW") {
    return "WATCHING";
  }

  return "NONE";
}
