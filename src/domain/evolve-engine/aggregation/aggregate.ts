import { deriveConsistencyContribution } from "../execution/consistency";
import type {
  ActivityExecutionEvidence,
  EvidenceAggregation,
  ExecutionDistribution,
} from "@/domain/evolve-engine/types";

export function aggregateEvidence(
  evidence: readonly ActivityExecutionEvidence[],
  periodStart: string,
  periodEnd: string,
): EvidenceAggregation {
  const distribution = createExecutionDistribution();
  let eligibleRequirements = 0;
  let totalConsistencyContribution = 0;
  let expectedOutput = 0;
  let rawActualOutput = 0;
  let effectiveOutput = 0;

  for (const item of evidence) {
    distribution[item.executionState] += 1;

    const contribution = deriveConsistencyContribution(item);

    if (contribution.includedInDenominator) {
      eligibleRequirements += 1;
      totalConsistencyContribution += contribution.contribution;
      expectedOutput += item.targetValue ?? 0;
      effectiveOutput += Math.min(item.actualValue ?? 0, item.targetValue ?? 0);
    }

    rawActualOutput += item.actualValue ?? 0;
  }

  const consistencyPercentage =
    eligibleRequirements === 0
      ? null
      : (totalConsistencyContribution / eligibleRequirements) * 100;
  const rawOutputRatio =
    expectedOutput === 0 ? null : rawActualOutput / expectedOutput;

  return {
    periodStart,
    periodEnd,
    eligibleRequirements,
    fullCount: distribution.FULL,
    qualifyingPartialCount: distribution.QUALIFYING_PARTIAL,
    attemptCount: distribution.ATTEMPT,
    insufficientCount: distribution.INSUFFICIENT_EFFORT,
    missedCount: distribution.MISSED,
    excludedCount: distribution.EXCLUDED,
    totalConsistencyContribution,
    consistencyPercentage,
    expectedOutput,
    rawActualOutput,
    rawOutputRatio,
    effectiveOutput,
    executionDistribution: distribution,
  };
}

export function createExecutionDistribution(): ExecutionDistribution {
  return {
    FULL: 0,
    QUALIFYING_PARTIAL: 0,
    ATTEMPT: 0,
    INSUFFICIENT_EFFORT: 0,
    MISSED: 0,
    EXCLUDED: 0,
  };
}
