import { clamp, round } from "../internal/statistics";
import type {
  HighestLevelRecord,
  LevelMemory,
  ProgressionRatingBreakdown,
  RecoveryState,
} from "../types";

export function deriveLevelMemory({
  currentLevel,
  highestLevel,
  rating,
  collapseCount = 0,
}: {
  currentLevel: number;
  highestLevel: HighestLevelRecord;
  rating: ProgressionRatingBreakdown;
  collapseCount?: number;
}): LevelMemory {
  const gap = Math.max(highestLevel.level - currentLevel, 0);
  const state = resolveRecoveryState({
    highestLevel,
    rating,
    gap,
  });

  return {
    highestLevel,
    currentLevel,
    collapseCount,
    recoveryState: state,
    recoveryAdvantage: round(resolveRecoveryAdvantage({ currentLevel, highestLevel, collapseCount, state })),
  };
}

function resolveRecoveryState({
  highestLevel,
  rating,
  gap,
}: {
  highestLevel: HighestLevelRecord;
  rating: ProgressionRatingBreakdown;
  gap: number;
}): RecoveryState {
  if (gap === 0) {
    return "PREVIOUS_STANDARD_RESTORED";
  }

  if (highestLevel.establishmentStrength < 0.25 || rating.confidence < 0.45) {
    return "NONE";
  }

  if (gap <= 2) {
    return "NEAR_PREVIOUS_STANDARD";
  }

  if (rating.finalRating >= 45) {
    return "ACTIVE_RECOVERY";
  }

  return "EARLY_COMEBACK";
}

function resolveRecoveryAdvantage({
  currentLevel,
  highestLevel,
  collapseCount,
  state,
}: {
  currentLevel: number;
  highestLevel: HighestLevelRecord;
  collapseCount: number;
  state: RecoveryState;
}) {
  if (state === "NONE" || state === "PREVIOUS_STANDARD_RESTORED") {
    return 0;
  }

  const remainingFrontier = Math.max(highestLevel.level - currentLevel, 0);
  const frontierFactor = remainingFrontier > 0 ? 1 : 0;
  const collapseDrag = 1 / (1 + collapseCount * 0.28);

  return clamp(highestLevel.establishmentStrength * collapseDrag * frontierFactor);
}
