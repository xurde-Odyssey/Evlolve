import {
  getSundayToSaturdayWeek,
  isEvidenceInWindow,
} from "./date-windows";
import { aggregateEvidence } from "./aggregate";
import type {
  ActivityExecutionEvidence,
  EvidenceAggregation,
} from "@/domain/evolve-engine/types";

export function aggregateWeeklyEvidence(
  evidence: readonly ActivityExecutionEvidence[],
  anchorDate: string | Date,
): EvidenceAggregation {
  const window = getSundayToSaturdayWeek(anchorDate);
  const weeklyEvidence = evidence.filter((item) =>
    isEvidenceInWindow(item.scheduledFor ?? item.occurredAt, window),
  );

  return aggregateEvidence(weeklyEvidence, window.periodStart, window.periodEnd);
}
