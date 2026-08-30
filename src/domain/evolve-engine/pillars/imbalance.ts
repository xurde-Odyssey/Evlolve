import type { DevelopmentPillarState, PillarImbalance } from "../types";

export function detectPillarImbalances(
  pillarStates: readonly DevelopmentPillarState[],
): PillarImbalance[] {
  return pillarStates.map((state) => {
    if (state.confidence < 0.35) {
      return {
        pillar: state.pillar,
        state: "INSUFFICIENT_EVIDENCE",
        confidence: state.confidence,
        relativeToPersonalHistory: "UNKNOWN",
        contributingSignals: ["Insufficient pillar evidence."],
      } satisfies PillarImbalance;
    }

    if (
      state.weakActivities.length > 0 ||
      state.direction === "DECLINING" ||
      state.direction === "STRONGLY_DECLINING"
    ) {
      return {
        pillar: state.pillar,
        state: state.weakActivities.length >= 2 ? "IMBALANCED" : "WATCH",
        confidence: state.confidence,
        relativeToPersonalHistory: state.direction,
        contributingSignals: state.evidenceSummary,
      } satisfies PillarImbalance;
    }

    return {
      pillar: state.pillar,
      state: "NO_MEANINGFUL_IMBALANCE",
      confidence: state.confidence,
      relativeToPersonalHistory: state.direction,
      contributingSignals: state.evidenceSummary,
    } satisfies PillarImbalance;
  });
}
