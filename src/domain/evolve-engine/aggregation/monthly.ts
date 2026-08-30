import {
  getCalendarMonth,
  isEvidenceInWindow,
} from "./date-windows";
import { aggregateEvidence } from "./aggregate";
import type {
  ActivityExecutionEvidence,
  AggregatedActivityEvidence,
  MonthlyEvidenceAggregation,
} from "@/domain/evolve-engine/types";

export function aggregateMonthlyEvidence(
  evidence: readonly ActivityExecutionEvidence[],
  anchorDate: string | Date,
): MonthlyEvidenceAggregation {
  const window = getCalendarMonth(anchorDate);
  const monthlyEvidence = evidence.filter((item) =>
    isEvidenceInWindow(item.scheduledFor ?? item.occurredAt, window),
  );
  const aggregate = aggregateEvidence(
    monthlyEvidence,
    window.periodStart,
    window.periodEnd,
  );

  return {
    ...aggregate,
    activityBreakdown: aggregateByActivity(monthlyEvidence),
  };
}

function aggregateByActivity(
  evidence: readonly ActivityExecutionEvidence[],
): AggregatedActivityEvidence[] {
  const grouped = new Map<string, ActivityExecutionEvidence[]>();

  for (const item of evidence) {
    const current = grouped.get(item.activityId) ?? [];
    grouped.set(item.activityId, [...current, item]);
  }

  return Array.from(grouped.entries()).map(([activityId, activityEvidence]) => ({
    activityId,
    ...aggregateEvidence(activityEvidence, "", ""),
  }));
}
