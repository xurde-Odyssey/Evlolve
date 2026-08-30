import { deriveConsistencyContribution } from "../execution/consistency";
import { clamp, round } from "../internal/statistics";
import type { ActivityExecutionEvidence, AttendanceSummary } from "../types";

export function summarizeAttendance(
  evidence: readonly ActivityExecutionEvidence[],
): AttendanceSummary {
  let eligibleOpportunities = 0;
  let attendanceCredit = 0;
  let strongAttendanceCount = 0;
  let weakAttendanceCount = 0;
  let missedCount = 0;

  for (const item of evidence) {
    if (!deriveConsistencyContribution(item).includedInDenominator) {
      continue;
    }

    eligibleOpportunities += 1;

    if (item.executionState === "FULL" || item.executionState === "QUALIFYING_PARTIAL") {
      attendanceCredit += 1;
      strongAttendanceCount += 1;
      continue;
    }

    if (item.executionState === "ATTEMPT") {
      attendanceCredit += 0.5;
      weakAttendanceCount += 1;
      continue;
    }

    if (item.executionState === "INSUFFICIENT_EFFORT") {
      attendanceCredit += 0.15;
      weakAttendanceCount += 1;
      continue;
    }

    missedCount += 1;
  }

  return {
    value:
      eligibleOpportunities === 0
        ? null
        : round(clamp(attendanceCredit / eligibleOpportunities)),
    confidence: round(clamp(eligibleOpportunities / 12)),
    strongAttendanceCount,
    weakAttendanceCount,
    missedCount,
    eligibleOpportunities,
  };
}
