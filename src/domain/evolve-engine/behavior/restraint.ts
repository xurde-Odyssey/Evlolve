import { clamp, round, sum } from "../internal/statistics";
import type {
  BehaviorEvent,
  RestraintContract,
  RestraintEvaluation,
} from "../types";

export function evaluateRestraintContract({
  contract,
  events,
  periodStart,
  periodEnd,
}: {
  contract: RestraintContract;
  events: readonly BehaviorEvent[];
  periodStart: string;
  periodEnd: string;
}): RestraintEvaluation {
  const relevantEvents = events.filter(
    (event) =>
      event.behaviorId === contract.behaviorId &&
      event.occurredAt >= periodStart &&
      event.occurredAt < periodEnd,
  );
  const occurrences = relevantEvents.length;
  const quantity = sum(relevantEvents.map((event) => event.quantity ?? 1));
  const allowedOccurrences = resolveAllowedOccurrences(contract);
  const violations = resolveViolationCount({
    contract,
    occurrences,
    quantity,
    allowedOccurrences,
  });

  return {
    contractId: contract.id,
    behaviorId: contract.behaviorId,
    status: resolveStatus({
      occurrences,
      violations,
      allowedOccurrences,
    }),
    occurrences,
    allowedOccurrences,
    violations,
    adherence:
      allowedOccurrences === null
        ? null
        : round(clamp(1 - violations / Math.max(allowedOccurrences, 1))),
    confidence: contract.active ? round(clamp(occurrences / 4 + 0.5)) : 0,
    evidenceRefs: relevantEvents.map((event) => event.id),
  };
}

function resolveAllowedOccurrences(contract: RestraintContract) {
  if (!contract.active) {
    return null;
  }

  if (contract.mode === "ZERO") {
    return 0;
  }

  if (contract.mode === "FREQUENCY_CAP") {
    return contract.allowedOccurrences ?? null;
  }

  return contract.allowedOccurrences ?? null;
}

function resolveViolationCount({
  contract,
  occurrences,
  quantity,
  allowedOccurrences,
}: {
  contract: RestraintContract;
  occurrences: number;
  quantity: number;
  allowedOccurrences: number | null;
}) {
  if (!contract.active) {
    return 0;
  }

  if (contract.mode === "QUANTITY_CAP" && contract.allowedQuantity !== undefined) {
    return quantity > contract.allowedQuantity ? 1 : 0;
  }

  if (allowedOccurrences === null) {
    return 0;
  }

  return Math.max(occurrences - allowedOccurrences, 0);
}

function resolveStatus({
  occurrences,
  violations,
  allowedOccurrences,
}: {
  occurrences: number;
  violations: number;
  allowedOccurrences: number | null;
}): RestraintEvaluation["status"] {
  if (occurrences === 0) {
    return "NO_DATA";
  }

  if (violations >= 2) {
    return "REPEATED_VIOLATION";
  }

  if (violations === 1) {
    return "VIOLATED";
  }

  if (allowedOccurrences !== null && occurrences >= allowedOccurrences) {
    return "APPROACHING_LIMIT";
  }

  return "WITHIN_LIMIT";
}
