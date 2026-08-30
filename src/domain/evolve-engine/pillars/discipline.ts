import { average, round } from "../internal/statistics";
import type {
  ActivityDevelopmentState,
  DisciplineDevelopmentState,
  RestraintEvaluation,
} from "../types";

export function summarizeDisciplineDevelopment({
  activityStates,
  restraintEvaluations = [],
}: {
  activityStates: readonly ActivityDevelopmentState[];
  restraintEvaluations?: readonly RestraintEvaluation[];
}): DisciplineDevelopmentState {
  const reliabilityValues = activityStates
    .map((state) => state.reliability.value)
    .filter((value): value is number => value !== null);
  const averageReliability = average(reliabilityValues);
  const violations = restraintEvaluations.filter(
    (evaluation) =>
      evaluation.status === "VIOLATED" ||
      evaluation.status === "REPEATED_VIOLATION",
  );
  const majorWeaknesses = activityStates
    .filter(
      (state) =>
        state.gapClassification.classification === "DISCIPLINE_GAP" ||
        state.gapClassification.classification === "MIXED_GAP",
    )
    .map((state) => String(state.activityId));
  const majorStrengths = activityStates
    .filter((state) => (state.reliability.value ?? 0) >= 0.82)
    .map((state) => String(state.activityId));

  return {
    direction:
      violations.length > 0 || majorWeaknesses.length > majorStrengths.length
        ? "DECLINING"
        : majorStrengths.length > 0
          ? "STABLE"
          : "UNKNOWN",
    confidence: round(average(activityStates.map((state) => state.reliability.confidence)) ?? 0),
    reliabilityPattern:
      averageReliability === null
        ? "UNKNOWN"
        : averageReliability >= 0.82
          ? "RELIABLE"
          : averageReliability >= 0.6
            ? "DEVELOPING"
            : "UNSTABLE",
    majorWeaknesses,
    majorStrengths,
    recentTrend:
      majorWeaknesses.length > majorStrengths.length ? "DECLINING" : "STABLE",
  };
}
