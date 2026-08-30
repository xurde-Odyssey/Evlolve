import { average, round } from "../internal/statistics";
import type {
  BehavioralFrictionState,
  DevelopmentAnalysis,
  DevelopmentPillarState,
  RestraintEvaluation,
} from "../types";

export function createDevelopmentAnalysis({
  pillarStates,
  behavioralFriction,
  restraintEvaluations = [],
}: {
  pillarStates: readonly DevelopmentPillarState[];
  behavioralFriction: BehavioralFrictionState;
  restraintEvaluations?: readonly RestraintEvaluation[];
}): DevelopmentAnalysis {
  return {
    strongestDevelopment: pillarStates
      .filter(
        (state) =>
          state.confidence >= 0.35 &&
          state.weakActivities.length === 0 &&
          (state.direction === "STABLE" ||
            state.direction === "IMPROVING" ||
            state.direction === "STRONGLY_IMPROVING"),
      )
      .map((state) => state.pillar),
    weakestDevelopment: pillarStates
      .filter((state) => state.weakActivities.length > 0)
      .map((state) => state.pillar),
    improvingPillars: pillarStates
      .filter(
        (state) =>
          state.direction === "IMPROVING" ||
          state.direction === "STRONGLY_IMPROVING",
      )
      .map((state) => state.pillar),
    deterioratingPillars: pillarStates
      .filter(
        (state) =>
          state.direction === "DECLINING" ||
          state.direction === "STRONGLY_DECLINING",
      )
      .map((state) => state.pillar),
    behavioralFriction,
    restraintSummary: [...restraintEvaluations],
    balanceSummary:
      pillarStates.find((state) => state.pillar === "BALANCE") ?? null,
    evidenceConfidence: round(average(pillarStates.map((state) => state.confidence)) ?? 0),
  };
}
