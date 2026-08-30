import type { ActivityKey, MeasurementType } from "@/types/activity";
import type {
  ActivityExecutionEvidence,
  DeadlineState,
  EvidenceMetadata,
  EvidenceQuality,
  EvidenceSource,
  ExecutionState,
  ExclusionState,
  RequirementState,
} from "@/domain/evolve-engine/types";
import {
  conservativeExecutionPolicy,
  type ExecutionClassificationPolicy,
} from "./policy";

export type ExecutionClassificationInput = {
  id: string;
  activityId: ActivityKey | string;
  commitmentId?: string;
  userId?: string;
  occurredAt?: string;
  scheduledFor?: string;
  targetValue?: number;
  actualValue?: number;
  unit?: string;
  measurementType?: MeasurementType;
  source?: EvidenceSource;
  evidenceQuality?: EvidenceQuality;
  requirementState?: RequirementState;
  exclusionState?: ExclusionState;
  deadlineState?: DeadlineState;
  metadata?: EvidenceMetadata;
  createdAt?: string;
  updatedAt?: string;
  policy?: ExecutionClassificationPolicy;
};

export function classifyExecution(
  input: ExecutionClassificationInput,
): ActivityExecutionEvidence {
  const policy = input.policy ?? conservativeExecutionPolicy;
  const requirementState = input.requirementState ?? "REQUIRED";
  const exclusionState = input.exclusionState ?? "NONE";
  const targetValue = normalizeNonNegativeNumber(input.targetValue);
  const actualValue = normalizeNonNegativeNumber(input.actualValue);
  const ratio = calculateRawCompletionRatio(targetValue, actualValue);
  const fulfillment = ratio === undefined ? undefined : Math.min(ratio, 1);
  const executionState = resolveExecutionState({
    actualValue,
    exclusionState,
    policy,
    ratio,
    requirementState,
    targetValue,
  });

  return {
    id: input.id,
    activityId: input.activityId,
    commitmentId: input.commitmentId,
    userId: input.userId,
    occurredAt: input.occurredAt,
    scheduledFor: input.scheduledFor,
    targetValue,
    actualValue,
    unit: input.unit,
    measurementType: input.measurementType,
    source: input.source ?? "MANUAL",
    evidenceQuality: input.evidenceQuality ?? "STANDARD",
    requirementState,
    exclusionState,
    executionState,
    deadlineState: input.deadlineState ?? "UNKNOWN",
    rawCompletionRatio: ratio,
    commitmentFulfillment: fulfillment,
    metadata: input.metadata,
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: input.updatedAt,
  };
}

export function calculateRawCompletionRatio(
  targetValue: number | undefined,
  actualValue: number | undefined,
) {
  if (targetValue === undefined || actualValue === undefined || targetValue <= 0) {
    return undefined;
  }

  return actualValue / targetValue;
}

function resolveExecutionState({
  actualValue,
  exclusionState,
  policy,
  ratio,
  requirementState,
  targetValue,
}: {
  actualValue: number | undefined;
  exclusionState: ExclusionState;
  policy: ExecutionClassificationPolicy;
  ratio: number | undefined;
  requirementState: RequirementState;
  targetValue: number | undefined;
}): ExecutionState {
  if (requirementState === "EXCLUDED" || exclusionState !== "NONE") {
    return "EXCLUDED";
  }

  if (requirementState === "NO_REQUIREMENT") {
    return "EXCLUDED";
  }

  if (requirementState === "MISSED") {
    return "MISSED";
  }

  if (ratio !== undefined) {
    if (ratio >= policy.fullCompletionRatio) {
      return "FULL";
    }

    if (ratio >= policy.qualifyingPartialMinRatio) {
      return "QUALIFYING_PARTIAL";
    }

    if (ratio >= policy.attemptMinRatio) {
      return "ATTEMPT";
    }

    return actualValue && actualValue > 0 ? "INSUFFICIENT_EFFORT" : "MISSED";
  }

  if (targetValue !== undefined && actualValue === undefined) {
    return "MISSED";
  }

  if (actualValue !== undefined && actualValue > 0) {
    return policy.completionWithoutNumericTarget === "attempt" ? "ATTEMPT" : "FULL";
  }

  if (requirementState === "UNKNOWN") {
    return "ATTEMPT";
  }

  return "MISSED";
}

function normalizeNonNegativeNumber(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(value, 0);
}
