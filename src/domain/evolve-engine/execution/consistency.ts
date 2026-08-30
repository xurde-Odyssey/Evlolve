import type {
  ActivityExecutionEvidence,
  ConsistencyContribution,
} from "@/domain/evolve-engine/types";

export function deriveConsistencyContribution(
  evidence: ActivityExecutionEvidence,
): ConsistencyContribution {
  if (
    evidence.executionState === "EXCLUDED" ||
    evidence.requirementState === "NO_REQUIREMENT" ||
    evidence.requirementState === "EXCLUDED"
  ) {
    return {
      executionState: evidence.executionState,
      requirementState: evidence.requirementState,
      includedInDenominator: false,
      contribution: 0,
    };
  }

  if (evidence.executionState === "FULL") {
    return contributionFor(evidence, 1);
  }

  if (evidence.executionState === "QUALIFYING_PARTIAL") {
    return contributionFor(evidence, evidence.commitmentFulfillment ?? 0);
  }

  return contributionFor(evidence, 0);
}

function contributionFor(
  evidence: ActivityExecutionEvidence,
  contribution: number,
): ConsistencyContribution {
  return {
    executionState: evidence.executionState,
    requirementState: evidence.requirementState,
    includedInDenominator: true,
    contribution: clamp(contribution, 0, 1),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
