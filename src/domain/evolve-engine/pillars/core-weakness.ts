import type {
  ActivityDevelopmentState,
  ActivityPillarContribution,
  CoreWeaknessSignal,
  DevelopmentPillar,
} from "../types";

export type CoreCommitmentReference = {
  commitmentId: string;
  activityId: string;
  pillar: DevelopmentPillar;
  tier: "CORE" | "PRIORITY" | "FLEXIBLE";
};

export function detectCoreWeaknesses({
  activityStates,
  commitments,
}: {
  activityStates: readonly ActivityDevelopmentState[];
  commitments: readonly CoreCommitmentReference[];
  mappings?: readonly ActivityPillarContribution[];
}): CoreWeaknessSignal[] {
  return commitments
    .filter((commitment) => commitment.tier === "CORE")
    .map((commitment) => {
      const state = activityStates.find(
        (activityState) => activityState.activityId === commitment.activityId,
      );

      if (!state || state.consistency.confidence < 0.35) {
        return null;
      }

      const weak =
        state.gapClassification.classification === "DISCIPLINE_GAP" ||
        state.gapClassification.classification === "MIXED_GAP" ||
        state.reliability.state === "UNSTABLE" ||
        state.reliability.state === "DETERIORATING";

      if (!weak) {
        return null;
      }

      return {
        commitmentId: commitment.commitmentId,
        activityId: commitment.activityId,
        pillar: commitment.pillar,
        severity: resolveSeverity(state.consistency.value ?? 0, state.reliability.value ?? 0),
        confidence: Math.min(state.consistency.confidence, state.gapClassification.confidence),
        persistence: state.consistency.profile.rollingRecent.patternSignals.longestMissCluster,
        evidenceRefs: [String(commitment.activityId)],
      } satisfies CoreWeaknessSignal;
    })
    .filter((signal): signal is CoreWeaknessSignal => signal !== null);
}

function resolveSeverity(consistency: number, reliability: number): CoreWeaknessSignal["severity"] {
  if (consistency < 0.45 || reliability < 0.45) {
    return "HIGH";
  }

  if (consistency < 0.65 || reliability < 0.6) {
    return "MODERATE";
  }

  return "LOW";
}
