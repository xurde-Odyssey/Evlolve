import type { ActivityRecord } from "@/types/activity";
import type {
  ActivityExecutionEvidence,
  DeadlineState,
  EvidenceQuality,
  EvidenceSource,
  ExclusionState,
  RequirementState,
} from "@/domain/evolve-engine/types";
import {
  classifyExecution,
  type ExecutionClassificationInput,
} from "../execution/classifier";
import type { ExecutionClassificationPolicy } from "../execution/policy";

export type ActivityRecordEvidenceOptions = {
  commitmentId?: string;
  userId?: string;
  scheduledFor?: string;
  targetValue?: number;
  source?: EvidenceSource;
  evidenceQuality?: EvidenceQuality;
  requirementState?: RequirementState;
  exclusionState?: ExclusionState;
  deadlineState?: DeadlineState;
  policy?: ExecutionClassificationPolicy;
};

export function createEvidenceFromActivityRecord(
  record: ActivityRecord,
  options: ActivityRecordEvidenceOptions = {},
): ActivityExecutionEvidence {
  const input: ExecutionClassificationInput = {
    id: `evidence-${record.id}`,
    activityId: record.activityKey,
    commitmentId: options.commitmentId,
    userId: options.userId,
    occurredAt: record.occurredAt,
    scheduledFor: options.scheduledFor,
    targetValue: options.targetValue,
    actualValue: record.measurement.value,
    unit: record.measurement.unit,
    measurementType: record.measurement.type,
    source: options.source ?? "MANUAL",
    evidenceQuality: options.evidenceQuality ?? "STANDARD",
    requirementState: options.requirementState ?? "REQUIRED",
    exclusionState: options.exclusionState ?? "NONE",
    deadlineState: options.deadlineState ?? "UNKNOWN",
    metadata: {
      activityLabel: record.activityLabel,
      recordStatus: record.status,
      ...(record.notes ? { notes: record.notes } : {}),
    },
    createdAt: record.occurredAt,
    policy: options.policy,
  };

  return classifyExecution(input);
}
