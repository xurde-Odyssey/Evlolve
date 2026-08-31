import { round } from "../internal/statistics";
import type {
  ActivityDevelopmentState,
  BossDifficulty,
  BossFamily,
  BossRequirement,
} from "../types";

export type BossDifficultyPolicy = {
  classify(input: {
    family: BossFamily;
    activityState?: ActivityDevelopmentState;
    targetValue?: number;
  }): BossDifficulty;
  edgeTarget(input: {
    activityState: ActivityDevelopmentState;
    currentTargetValue: number;
  }): number | null;
  restorationTarget(input: {
    activityState: ActivityDevelopmentState;
    currentTargetValue: number;
  }): number | null;
};

export const defaultBossDifficultyPolicy: BossDifficultyPolicy = {
  classify({ family, activityState, targetValue }) {
    if (family === "RESTORATION" || family === "COMEBACK") {
      return "RESTORATIVE";
    }

    const sustainable = activityState?.capability.sustainableCapability.value;
    const peak = activityState?.capability.peakCapability.value;

    if (targetValue && sustainable && targetValue > sustainable * 1.12) {
      return "EDGE";
    }

    if (targetValue && peak && targetValue >= peak * 0.9) {
      return "EDGE";
    }

    return family === "DISCIPLINE" || family === "CORRECTIVE" ? "CHALLENGING" : "STANDARD";
  },
  edgeTarget({ activityState, currentTargetValue }) {
    const sustainable = activityState.capability.sustainableCapability.value;
    const peak = activityState.capability.peakCapability.value;

    if (!sustainable || !peak || peak <= currentTargetValue) {
      return null;
    }

    const target = Math.min(peak * 0.94, Math.max(sustainable * 1.1, currentTargetValue * 1.12));

    return round(Math.min(target, peak), 2);
  },
  restorationTarget({ activityState, currentTargetValue }) {
    const established = activityState.capability.establishedCapability.value;
    const recent = activityState.capability.recentCapability.value;

    if (!established || !recent || recent >= established) {
      return null;
    }

    return round(Math.min(established, Math.max(recent * 1.08, currentTargetValue * 0.92)), 2);
  },
};

export function requirementLabel(requirement: BossRequirement) {
  if (requirement.targetValue === undefined) {
    return requirement.description;
  }

  return `${requirement.description}: ${requirement.targetValue}${requirement.unit ? ` ${requirement.unit}` : ""}`;
}
