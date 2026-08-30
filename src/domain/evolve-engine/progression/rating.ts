import { average, clamp, round } from "../internal/statistics";
import {
  defaultProgressionRatingPolicy,
  type ProgressionRatingPolicy,
} from "./policy";
import type {
  ActivityDevelopmentState,
  DevelopmentPillar,
  DevelopmentPillarState,
  MonthlyEvaluationRecord,
  ProgressionRatingBreakdown,
  ProgressionRatingInput,
} from "../types";

export function calculateProgressionRating(
  input: ProgressionRatingInput,
  policy: ProgressionRatingPolicy = defaultProgressionRatingPolicy,
): ProgressionRatingBreakdown {
  const disciplineContribution = pillarContribution(input.pillarStates, "DISCIPLINE", 18);
  const capabilityContribution = pillarContribution(input.pillarStates, "CAPABILITY", 22);
  const healthContribution = pillarContribution(input.pillarStates, "HEALTH", 18);
  const balanceContribution = balanceModifier(input.pillarStates);
  const commitmentExecutionContribution = commitmentContribution(input.activityStates);
  const progressionEvidenceContribution = monthlyContribution(input.monthlyEvaluations ?? []);
  const recoveryContribution = recoveryContributionFromMemory(input.recoveryMemory?.recoveryAdvantage ?? 0);
  const coreWeaknessPressure = calculateCoreWeaknessPressure(input.coreWeaknesses ?? [], policy);
  const behavioralFrictionPressure = behavioralPressure(input, policy);
  const instabilityPressure = instabilityPressureFromActivities(input.activityStates);
  const rebuildingPressure = rebuildingPressureFromActivities(input.activityStates);
  const confidence = confidenceFor(input);
  const raw =
    disciplineContribution +
    capabilityContribution +
    healthContribution +
    balanceContribution +
    commitmentExecutionContribution +
    progressionEvidenceContribution +
    recoveryContribution -
    coreWeaknessPressure -
    behavioralFrictionPressure -
    instabilityPressure -
    rebuildingPressure;
  const conservative = raw * Math.max(confidence, policy.confidenceFloor);

  return {
    disciplineContribution: round(disciplineContribution),
    capabilityContribution: round(capabilityContribution),
    healthContribution: round(healthContribution),
    balanceContribution: round(balanceContribution),
    commitmentExecutionContribution: round(commitmentExecutionContribution),
    progressionEvidenceContribution: round(progressionEvidenceContribution),
    recoveryContribution: round(recoveryContribution),
    coreWeaknessPressure: round(coreWeaknessPressure),
    behavioralFrictionPressure: round(behavioralFrictionPressure),
    instabilityPressure: round(instabilityPressure),
    rebuildingPressure: round(rebuildingPressure),
    confidence: round(confidence),
    finalRating: round(clamp(conservative, policy.ratingFloor, policy.ratingCeiling), 2),
  };
}

function pillarContribution(
  pillars: readonly DevelopmentPillarState[],
  pillar: DevelopmentPillar,
  maxContribution: number,
) {
  const state = pillars.find((item) => item.pillar === pillar);
  if (!state || state.confidence === 0) {
    return 0;
  }

  const directionBonus = directionMultiplier(state.direction);
  const weaknessDrag = state.weakActivities.length > 0 ? 0.75 : 1;
  const stability = state.stability ?? 0.55;

  return saturate(maxContribution * state.confidence * directionBonus * weaknessDrag * stability);
}

function balanceModifier(pillars: readonly DevelopmentPillarState[]) {
  const balance = pillars.find((pillar) => pillar.pillar === "BALANCE");

  if (!balance || balance.confidence < 0.25) {
    return 3;
  }

  if (balance.weakActivities.length > 0 || balance.direction === "DECLINING") {
    return 1.5 * balance.confidence;
  }

  return 8 * balance.confidence * directionMultiplier(balance.direction);
}

function commitmentContribution(activityStates: readonly ActivityDevelopmentState[]) {
  const values = activityStates
    .map((state) =>
      state.consistency.value === null
        ? null
        : state.consistency.value * state.reliability.confidence,
    )
    .filter((value): value is number => value !== null);

  return saturate((average(values) ?? 0) * 24);
}

function monthlyContribution(records: readonly MonthlyEvaluationRecord[]) {
  if (records.length === 0) {
    return 0;
  }

  return records.slice(-4).reduce((total, record) => {
    const value =
      record.outcome === "FULL_COMPLETION"
        ? 5
        : record.outcome === "STRONG_PASS"
          ? 3.5
          : record.outcome === "PASS"
            ? 1.5
            : -4;

    return total + value * record.confidence;
  }, 0);
}

function calculateCoreWeaknessPressure(
  weaknesses: NonNullable<ProgressionRatingInput["coreWeaknesses"]>,
  policy: ProgressionRatingPolicy,
) {
  return weaknesses.reduce((total, weakness) => {
    const severity =
      weakness.severity === "HIGH" ? 1.8 : weakness.severity === "MODERATE" ? 1 : 0.45;
    const persistence = Math.min(1 + weakness.persistence * 0.18, 1.9);

    return total + policy.coreWeaknessBasePressure * severity * persistence * weakness.confidence;
  }, 0);
}

function behavioralPressure(
  input: ProgressionRatingInput,
  policy: ProgressionRatingPolicy,
) {
  const friction =
    input.behavioralFriction?.state === "HIGH"
      ? 1
      : input.behavioralFriction?.state === "MODERATE"
        ? 0.65
        : input.behavioralFriction?.state === "LOW"
          ? 0.3
          : 0;
  const debt =
    input.behavioralDebt?.state === "ACTIVE"
      ? 1
      : input.behavioralDebt?.state === "FORMING"
        ? 0.6
        : input.behavioralDebt?.state === "WATCHING"
          ? 0.25
          : 0;

  return Math.min(
    policy.behavioralPressureLimit,
    policy.behavioralPressureLimit *
      Math.max(friction * (input.behavioralFriction?.confidence ?? 0), debt * (input.behavioralDebt?.confidence ?? 0)),
  );
}

function instabilityPressureFromActivities(activityStates: readonly ActivityDevelopmentState[]) {
  return activityStates.reduce((total, state) => {
    const volatility = state.capability.volatility ?? 0;
    return total + Math.min(volatility * 2.5, 2.5) * state.capability.confidence;
  }, 0);
}

function rebuildingPressureFromActivities(activityStates: readonly ActivityDevelopmentState[]) {
  return activityStates.reduce(
    (total, state) =>
      total + (state.capability.baselineState === "REBUILDING" ? 4 * state.capability.confidence : 0),
    0,
  );
}

function recoveryContributionFromMemory(recoveryAdvantage: number) {
  return Math.min(recoveryAdvantage * 5, 5);
}

function confidenceFor(input: ProgressionRatingInput) {
  const activityConfidence = average(
    input.activityStates.map((state) =>
      Math.min(state.consistency.confidence, state.capability.confidence),
    ),
  );
  const pillarConfidence = average(input.pillarStates.map((state) => state.confidence));

  return clamp(average([activityConfidence ?? 0, pillarConfidence ?? 0]) ?? 0);
}

function directionMultiplier(direction: DevelopmentPillarState["direction"]) {
  if (direction === "STRONGLY_IMPROVING") {
    return 1.12;
  }

  if (direction === "IMPROVING") {
    return 1.06;
  }

  if (direction === "DECLINING") {
    return 0.82;
  }

  if (direction === "STRONGLY_DECLINING") {
    return 0.68;
  }

  if (direction === "UNKNOWN") {
    return 0.72;
  }

  return 1;
}

function saturate(value: number) {
  return value <= 0 ? 0 : value * (1 - Math.exp(-value / 18));
}
