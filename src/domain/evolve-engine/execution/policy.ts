import type { ActivityKey, MeasurementType } from "@/types/activity";

export type ExecutionClassificationPolicy = {
  fullCompletionRatio: number;
  qualifyingPartialMinRatio: number;
  attemptMinRatio: number;
  completionWithoutNumericTarget?: "full" | "attempt";
};

export type ExecutionPolicyMap = Partial<
  Record<ActivityKey | MeasurementType | string, ExecutionClassificationPolicy>
>;

export const conservativeExecutionPolicy = {
  fullCompletionRatio: 1,
  qualifyingPartialMinRatio: 0.5,
  attemptMinRatio: 0.1,
  completionWithoutNumericTarget: "full",
} satisfies ExecutionClassificationPolicy;

export function resolveExecutionPolicy(
  key: ActivityKey | MeasurementType | string | undefined,
  policyMap: ExecutionPolicyMap = {},
  fallback: ExecutionClassificationPolicy = conservativeExecutionPolicy,
) {
  if (!key) {
    return fallback;
  }

  return policyMap[key] ?? fallback;
}
