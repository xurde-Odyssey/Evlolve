import type { TargetHistoryRecord } from "@/domain/evolve-engine/types";

export function appendTargetHistoryRecord(
  records: readonly TargetHistoryRecord[],
  nextRecord: TargetHistoryRecord,
): TargetHistoryRecord[] {
  return [...records, nextRecord].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
}

export function getCurrentTargetRecord(
  records: readonly TargetHistoryRecord[],
  at: string,
) {
  return [...records]
    .filter((record) => record.effectiveFrom <= at)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}
