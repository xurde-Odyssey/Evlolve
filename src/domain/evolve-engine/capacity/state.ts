import { clamp, round } from "../internal/statistics";
import type {
  ActivityDevelopmentState,
  BehavioralFrictionState,
  CommitmentCapacityState,
  CoreWeaknessSignal,
  LevelProgressionState,
  MonthlyEvaluationRecord,
} from "../types";

export type CommitmentCapacityPolicy = {
  version: string;
  startingCapacity: 3;
  maxCapacity: 5;
  unlockConfirmationPeriods: number;
  reductionConfirmationPeriods: number;
};

export const defaultCommitmentCapacityPolicy = {
  version: "phase-3.6-capacity",
  startingCapacity: 3,
  maxCapacity: 5,
  unlockConfirmationPeriods: 2,
  reductionConfirmationPeriods: 3,
} satisfies CommitmentCapacityPolicy;

export function initialCommitmentCapacityState(
  activeCommitmentCount = 0,
  policy: CommitmentCapacityPolicy = defaultCommitmentCapacityPolicy,
): CommitmentCapacityState {
  return {
    currentCapacity: policy.startingCapacity,
    highestCapacity: policy.startingCapacity,
    status: "STABLE",
    confidence: 0.5,
    reason: "Starting serious commitment capacity.",
    qualifyingPeriods: 0,
    riskPeriods: 0,
    activeCommitmentCount,
    canAddCommitment: activeCommitmentCount < policy.startingCapacity,
    policyVersion: policy.version,
  };
}

export function evaluateCommitmentCapacity({
  previous,
  activityStates,
  monthlyEvaluations = [],
  coreWeaknesses = [],
  behavioralFriction,
  levelState,
  activeCommitmentCount,
  policy = defaultCommitmentCapacityPolicy,
}: {
  previous?: CommitmentCapacityState;
  activityStates: readonly ActivityDevelopmentState[];
  monthlyEvaluations?: readonly MonthlyEvaluationRecord[];
  coreWeaknesses?: readonly CoreWeaknessSignal[];
  behavioralFriction?: BehavioralFrictionState;
  levelState?: LevelProgressionState | null;
  activeCommitmentCount: number;
  policy?: CommitmentCapacityPolicy;
}): CommitmentCapacityState {
  const current = previous ?? initialCommitmentCapacityState(activeCommitmentCount, policy);
  const confidence = capacityConfidence(activityStates, monthlyEvaluations, levelState);
  const stableExecution =
    activityStates.length > 0 &&
    activityStates.every(
      (state) =>
        (state.consistency.value ?? 0) >= 0.82 &&
        ["RELIABLE", "HIGHLY_RELIABLE"].includes(state.reliability.state),
    );
  const unstable =
    coreWeaknesses.some((weakness) => weakness.severity === "HIGH" && weakness.confidence >= 0.7) ||
    behavioralFriction?.state === "HIGH" ||
    activityStates.some((state) => state.gapClassification.classification === "DISCIPLINE_GAP" && state.gapClassification.confidence >= 0.7);
  const recentStrongMonths = monthlyEvaluations.slice(-2).filter((record) =>
    ["STRONG_PASS", "FULL_COMPLETION"].includes(record.outcome),
  ).length;
  const qualifyingPeriods = stableExecution && recentStrongMonths > 0
    ? current.qualifyingPeriods + 1
    : Math.max(0, current.qualifyingPeriods - 1);
  const riskPeriods = unstable ? current.riskPeriods + 1 : Math.max(0, current.riskPeriods - 1);

  if (
    current.currentCapacity < policy.maxCapacity &&
    stableExecution &&
    confidence >= 0.68 &&
    qualifyingPeriods >= policy.unlockConfirmationPeriods
  ) {
    const unlocked = (current.currentCapacity + 1) as 4 | 5;
    return {
      currentCapacity: unlocked,
      highestCapacity: Math.max(current.highestCapacity, unlocked) as 3 | 4 | 5,
      status: "STABLE",
      confidence: round(confidence),
      reason: "Sustained execution confirmed additional commitment capacity.",
      qualifyingPeriods: 0,
      riskPeriods: 0,
      activeCommitmentCount,
      canAddCommitment: activeCommitmentCount < unlocked,
      policyVersion: policy.version,
    };
  }

  if (current.currentCapacity < policy.maxCapacity && stableExecution && confidence >= 0.62) {
    const candidateCapacity = (current.currentCapacity + 1) as 4 | 5;
    return {
      ...current,
      candidateCapacity,
      status: qualifyingPeriods > 0 ? "CONFIRMING_UNLOCK" : "ELIGIBLE_TO_UNLOCK",
      confidence: round(confidence),
      reason: "Evidence may support more responsibility if it remains stable.",
      qualifyingPeriods,
      riskPeriods,
      activeCommitmentCount,
      canAddCommitment: activeCommitmentCount < current.currentCapacity,
      policyVersion: policy.version,
    };
  }

  if (riskPeriods >= policy.reductionConfirmationPeriods && current.currentCapacity > policy.startingCapacity) {
    const reduced = (current.currentCapacity - 1) as 3 | 4;
    return {
      currentCapacity: reduced,
      highestCapacity: current.highestCapacity,
      status: "REDUCED",
      confidence: round(confidence),
      reason: "Persistent instability reduced available new commitment capacity.",
      qualifyingPeriods: 0,
      riskPeriods,
      activeCommitmentCount,
      canAddCommitment: activeCommitmentCount < reduced,
      policyVersion: policy.version,
    };
  }

  if (unstable && riskPeriods > 0) {
    return {
      ...current,
      status: current.currentCapacity > policy.startingCapacity ? "AT_RISK" : "REBUILDING",
      confidence: round(confidence),
      reason: "Existing commitments should stabilize before adding responsibility.",
      qualifyingPeriods,
      riskPeriods,
      activeCommitmentCount,
      canAddCommitment: activeCommitmentCount < current.currentCapacity && !unstable,
      policyVersion: policy.version,
    };
  }

  return {
    ...current,
    status: current.status === "REDUCED" ? "REBUILDING" : "STABLE",
    confidence: round(confidence),
    reason: "Current capacity is stable.",
    qualifyingPeriods,
    riskPeriods,
    activeCommitmentCount,
    canAddCommitment: activeCommitmentCount < current.currentCapacity,
    policyVersion: policy.version,
  };
}

function capacityConfidence(
  activityStates: readonly ActivityDevelopmentState[],
  monthlyEvaluations: readonly MonthlyEvaluationRecord[],
  levelState?: LevelProgressionState | null,
) {
  const activityConfidence =
    activityStates.length === 0
      ? 0
      : activityStates.reduce((total, state) => total + Math.min(state.consistency.confidence, state.reliability.confidence), 0) / activityStates.length;
  const monthlyConfidence =
    monthlyEvaluations.length === 0
      ? 0.45
      : monthlyEvaluations.slice(-3).reduce((total, record) => total + record.confidence, 0) / Math.min(monthlyEvaluations.length, 3);

  return clamp((activityConfidence * 0.55) + (monthlyConfidence * 0.3) + ((levelState?.rating.confidence ?? 0.45) * 0.15));
}
