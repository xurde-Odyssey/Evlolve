import {
  getCalendarMonth,
  getSundayToSaturdayWeek,
  isEvidenceInWindow,
  type PeriodWindow,
} from "../aggregation/date-windows";
import { createExecutionDistribution } from "../aggregation/aggregate";
import { deriveConsistencyContribution } from "../execution/consistency";
import { clamp, round } from "../internal/statistics";
import type {
  ActivityConsistencyProfile,
  ActivityExecutionEvidence,
  ConsistencyPatternSignals,
  ConsistencySummary,
  DirectionSignal,
  ScheduledDistribution,
} from "../types";

const dayNames = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export function summarizeConsistency(
  evidence: readonly ActivityExecutionEvidence[],
  options: {
    activityId: string;
    periodLabel: string;
    periodStart: string;
    periodEnd: string;
  },
): ConsistencySummary {
  const activityEvidence = orderEvidence(
    evidence.filter((item) => item.activityId === options.activityId),
  );
  const executionDistribution = createExecutionDistribution();
  const scheduledDistribution = createScheduledDistribution();
  let eligibleOpportunities = 0;
  let totalConsistencyCredit = 0;

  for (const item of activityEvidence) {
    executionDistribution[item.executionState] += 1;

    const date = item.scheduledFor ?? item.occurredAt;
    if (date) {
      const parsed = new Date(date);
      if (Number.isFinite(parsed.getTime())) {
        const day = resolveDayName(parsed);
        scheduledDistribution[day] += 1;
      }
    }

    const contribution = deriveConsistencyContribution(item);
    if (contribution.includedInDenominator) {
      eligibleOpportunities += 1;
      totalConsistencyCredit += contribution.contribution;
    }
  }

  const consistencyRatio =
    eligibleOpportunities === 0
      ? null
      : round(totalConsistencyCredit / eligibleOpportunities);
  const patternSignals = derivePatternSignals(activityEvidence);

  return {
    activityId: options.activityId,
    periodLabel: options.periodLabel,
    periodStart: options.periodStart,
    periodEnd: options.periodEnd,
    eligibleOpportunities,
    completedFull: executionDistribution.FULL,
    qualifyingPartials: executionDistribution.QUALIFYING_PARTIAL,
    attempts: executionDistribution.ATTEMPT,
    insufficientEfforts: executionDistribution.INSUFFICIENT_EFFORT,
    missed: executionDistribution.MISSED,
    excluded: executionDistribution.EXCLUDED,
    totalConsistencyCredit: round(totalConsistencyCredit),
    consistencyRatio,
    scheduledDistribution,
    executionDistribution,
    patternSignals,
    recentDirection: deriveRecentDirection(activityEvidence),
    confidence: deriveConsistencyConfidence(eligibleOpportunities),
  };
}

export function buildActivityConsistencyProfile(
  evidence: readonly ActivityExecutionEvidence[],
  activityId: string,
  anchorDate: string | Date,
): ActivityConsistencyProfile {
  const currentWeek = getSundayToSaturdayWeek(anchorDate);
  const previousWeek = shiftWindowDays(currentWeek, -7);
  const currentMonth = getCalendarMonth(anchorDate);
  const previousMonth = previousCalendarMonth(currentMonth.start);
  const rollingRecent = shiftWindowDays(currentWeek, -28, 35);

  return {
    activityId,
    currentWeek: summarizeWindow(evidence, activityId, "current_week", currentWeek),
    previousWeek: summarizeWindow(evidence, activityId, "previous_week", previousWeek),
    currentMonth: summarizeWindow(evidence, activityId, "current_month", currentMonth),
    previousMonth: summarizeWindow(
      evidence,
      activityId,
      "previous_month",
      previousMonth,
    ),
    rollingRecent: summarizeWindow(
      evidence,
      activityId,
      "rolling_recent",
      rollingRecent,
    ),
  };
}

export function derivePatternSignals(
  evidence: readonly ActivityExecutionEvidence[],
): ConsistencyPatternSignals {
  const eligible = orderEvidence(
    evidence.filter((item) => deriveConsistencyContribution(item).includedInDenominator),
  );
  let currentMissCluster = 0;
  let longestMissCluster = 0;
  let currentFullCluster = 0;
  let longestFullCluster = 0;
  let recoveryCount = 0;
  let previousWasMiss = false;
  const partials = eligible.filter(
    (item) => item.executionState === "QUALIFYING_PARTIAL",
  ).length;
  const attempts = eligible.filter((item) => item.executionState === "ATTEMPT").length;
  const creditValues = eligible.map(
    (item) => deriveConsistencyContribution(item).contribution,
  );

  for (const item of eligible) {
    if (item.executionState === "MISSED") {
      currentMissCluster += 1;
      currentFullCluster = 0;
      previousWasMiss = true;
    } else {
      if (
        previousWasMiss &&
        (item.executionState === "FULL" ||
          item.executionState === "QUALIFYING_PARTIAL")
      ) {
        recoveryCount += 1;
      }

      currentMissCluster = 0;
      currentFullCluster =
        item.executionState === "FULL" ? currentFullCluster + 1 : 0;
      previousWasMiss = false;
    }

    longestMissCluster = Math.max(longestMissCluster, currentMissCluster);
    longestFullCluster = Math.max(longestFullCluster, currentFullCluster);
  }

  return {
    consecutiveMissCount: currentMissCluster,
    longestMissCluster,
    longestFullCluster,
    recoveryCount,
    partialHeavyRatio: eligible.length === 0 ? null : round(partials / eligible.length),
    attemptRatio: eligible.length === 0 ? null : round(attempts / eligible.length),
    consistencyStability: deriveCreditStability(creditValues),
    weakDaysOfWeek: deriveWeakDays(eligible),
  };
}

function summarizeWindow(
  evidence: readonly ActivityExecutionEvidence[],
  activityId: string,
  periodLabel: string,
  window: PeriodWindow,
) {
  return summarizeConsistency(
    evidence.filter((item) => isEvidenceInWindow(item.scheduledFor ?? item.occurredAt, window)),
    {
      activityId,
      periodLabel,
      periodStart: window.periodStart,
      periodEnd: window.periodEnd,
    },
  );
}

function deriveRecentDirection(
  evidence: readonly ActivityExecutionEvidence[],
): DirectionSignal {
  const eligible = evidence.filter(
    (item) => deriveConsistencyContribution(item).includedInDenominator,
  );

  if (eligible.length < 6) {
    return "UNKNOWN";
  }

  const midpoint = Math.floor(eligible.length / 2);
  const previous = averageCredit(eligible.slice(0, midpoint));
  const current = averageCredit(eligible.slice(midpoint));
  const change = current - previous;

  if (change <= -0.25) {
    return "STRONGLY_DECLINING";
  }

  if (change <= -0.1) {
    return "DECLINING";
  }

  if (change >= 0.25) {
    return "STRONGLY_IMPROVING";
  }

  if (change >= 0.1) {
    return "IMPROVING";
  }

  return "STABLE";
}

function averageCredit(evidence: readonly ActivityExecutionEvidence[]) {
  if (evidence.length === 0) {
    return 0;
  }

  return (
    evidence.reduce(
      (total, item) => total + deriveConsistencyContribution(item).contribution,
      0,
    ) / evidence.length
  );
}

function deriveCreditStability(values: readonly number[]) {
  if (values.length < 3) {
    return null;
  }

  const average = values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.reduce((total, value) => total + (value - average) ** 2, 0) /
    values.length;

  return round(1 - clamp(Math.sqrt(variance), 0, 1));
}

function deriveWeakDays(evidence: readonly ActivityExecutionEvidence[]) {
  const byDay = new Map<string, { total: number; misses: number }>();

  for (const item of evidence) {
    const date = item.scheduledFor ?? item.occurredAt;
    if (!date) {
      continue;
    }

    const parsed = new Date(date);
    if (!Number.isFinite(parsed.getTime())) {
      continue;
    }

    const day = resolveDayName(parsed);
    const current = byDay.get(day) ?? { total: 0, misses: 0 };
    byDay.set(day, {
      total: current.total + 1,
      misses: current.misses + (item.executionState === "MISSED" ? 1 : 0),
    });
  }

  return Array.from(byDay.entries())
    .filter(([, value]) => value.total >= 2 && value.misses / value.total >= 0.5)
    .map(([day]) => day);
}

function deriveConsistencyConfidence(eligibleOpportunities: number) {
  return round(clamp(eligibleOpportunities / 12));
}

function createScheduledDistribution(): ScheduledDistribution {
  return {
    SUNDAY: 0,
    MONDAY: 0,
    TUESDAY: 0,
    WEDNESDAY: 0,
    THURSDAY: 0,
    FRIDAY: 0,
    SATURDAY: 0,
  };
}

function resolveDayName(date: Date) {
  return dayNames[date.getUTCDay()] ?? "SUNDAY";
}

function orderEvidence(evidence: readonly ActivityExecutionEvidence[]) {
  return [...evidence].sort((a, b) =>
    (a.scheduledFor ?? a.occurredAt ?? "").localeCompare(
      b.scheduledFor ?? b.occurredAt ?? "",
    ),
  );
}

function shiftWindowDays(window: PeriodWindow, days: number, durationDays = 7) {
  const start = new Date(window.start);
  start.setUTCDate(start.getUTCDate() + days);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + durationDays);

  return {
    start,
    end,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}

function previousCalendarMonth(currentMonthStart: Date) {
  const start = new Date(
    Date.UTC(
      currentMonthStart.getUTCFullYear(),
      currentMonthStart.getUTCMonth() - 1,
      1,
    ),
  );
  const end = new Date(
    Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth(), 1),
  );

  return {
    start,
    end,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}
