import type {
  ActivityDevelopmentState,
  AntiGamingSignal,
  BossHistoryRecord,
} from "../types";

export function detectInternalPatternSignals({
  activityStates,
  bossHistory = [],
}: {
  activityStates: readonly ActivityDevelopmentState[];
  bossHistory?: readonly BossHistoryRecord[];
}): AntiGamingSignal[] {
  const activitySignals = activityStates.flatMap((state) => {
    const signals: AntiGamingSignal[] = [];
    const peak = state.capability.peakCapability.value;
    const sustainable = state.capability.sustainableCapability.value;

    if (peak && sustainable && peak > sustainable * 1.8 && state.capability.confidence >= 0.45) {
      signals.push({
        type: "EXTREME_SPIKE",
        activityId: String(state.activityId),
        confidence: Math.min(state.capability.confidence, 0.8),
        evidenceRefs: [`${state.activityId}:peak`],
        internalOnly: true,
      });
    }

    if (
      state.executionSummary.eligibleRequirements >= 4 &&
      state.executionSummary.qualifyingPartialCount >= state.executionSummary.fullCount &&
      state.executionSummary.qualifyingPartialCount > 0
    ) {
      signals.push({
        type: "MINIMUM_QUALIFYING_PATTERN",
        activityId: String(state.activityId),
        confidence: Math.min(state.consistency.confidence, 0.7),
        evidenceRefs: [`${state.activityId}:partials`],
        internalOnly: true,
      });
    }

    return signals;
  });
  const rejectedBosses = bossHistory.filter((boss) => boss.status === "REJECTED");
  const bossSignal =
    rejectedBosses.length >= 3
      ? [
          {
            type: "REPEATED_BOSS_REJECTION",
            confidence: Math.min(0.35 + rejectedBosses.length * 0.1, 0.8),
            evidenceRefs: rejectedBosses.map((boss) => boss.bossId),
            internalOnly: true,
          } satisfies AntiGamingSignal,
        ]
      : [];

  return [...activitySignals, ...bossSignal];
}
