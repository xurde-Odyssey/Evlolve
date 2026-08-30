import type {
  BehaviorEvent,
  BehaviorInterferenceSignal,
  MonthlyBehaviorReport,
  RestraintEvaluation,
} from "../types";

export function createMonthlyBehaviorReport({
  behaviorId,
  behaviorLabel,
  events,
  interferenceSignals,
  restraintEvaluation,
}: {
  behaviorId: string;
  behaviorLabel: string;
  events: readonly BehaviorEvent[];
  interferenceSignals: readonly BehaviorInterferenceSignal[];
  restraintEvaluation?: RestraintEvaluation;
}): MonthlyBehaviorReport {
  const relatedSignals = interferenceSignals.filter(
    (signal) => signal.behaviorId === behaviorId,
  );
  const detected = relatedSignals.some(
    (signal) => signal.impactDirection === "NEGATIVE_ASSOCIATION",
  );

  return {
    behaviorId,
    behaviorLabel,
    occurrences: events.filter((event) => event.behaviorId === behaviorId).length,
    restraintStatus: restraintEvaluation?.status,
    detectedInterference: detected,
    confidence: Math.max(0, ...relatedSignals.map((signal) => signal.confidence)),
    affectedActivities: Array.from(
      new Set(
        relatedSignals
          .map((signal) => signal.affectedActivityId)
          .filter((activityId): activityId is string => activityId !== undefined),
      ),
    ),
    affectedPillars: Array.from(
      new Set(
        relatedSignals
          .map((signal) => signal.affectedPillar)
          .filter((pillar): pillar is NonNullable<typeof pillar> => pillar !== undefined),
      ),
    ),
    noInterferenceFinding: !detected,
    trendFromPreviousMonth: "INSUFFICIENT_EVIDENCE",
    summary: detected
      ? "Repeated interference pattern detected."
      : "No meaningful interference detected.",
  };
}
