import type {
  BehaviorBoundary,
  BehaviorBoundaryEvaluation,
  BehaviorBoundaryState,
  BehaviorOccurrence,
  BehaviorPressureState,
} from "../types";

export const defaultBehaviorBoundaryPolicy = {
  version: "phase-6-behavior-boundaries-v1",
  maxActiveBoundaries: 5,
  pressureRecoveryRequiresCleanPeriods: 2,
  weeklyRewardCap: 5,
} as const;

export function evaluateBehaviorBoundary({
  boundary,
  occurrences,
  occurredAt,
}: {
  boundary: BehaviorBoundary;
  occurrences: readonly BehaviorOccurrence[];
  occurredAt: string;
}): BehaviorBoundaryEvaluation {
  if (boundary.mode === "CONTEXT_ONLY" || boundary.intent === "CONTEXT_ONLY") {
    return { status: "NO_ACTIVE_BOUNDARY", usage: 0, periodKey: "context", evidenceRefs: [], adherencePercent: null };
  }

  const relevant = occurrences
    .filter((occurrence) =>
      occurrence.behaviorType === boundary.behaviorType &&
      (!occurrence.boundaryId || occurrence.boundaryId === boundary.id) &&
      occurrence.status === "ACTIVE" &&
      occurrence.occurredAt >= boundary.startedAt &&
      occurrence.occurredAt <= occurredAt,
    )
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const period = periodWindow(boundary.mode, occurredAt);
  const inPeriod = relevant.filter((occurrence) => occurrence.occurredAt >= period.start && occurrence.occurredAt < period.end);
  const usage = boundary.mode === "QUANTITY_LIMIT"
    ? inPeriod.reduce((total, occurrence) => total + (occurrence.quantity ?? 1), 0)
    : inPeriod.length;
  const limit = boundary.mode === "ZERO_TOLERANCE"
    ? 0
    : boundary.limitConfig.quantity ?? boundary.limitConfig.cap;
  const spacingViolation = boundary.mode === "MINIMUM_SPACING" && hasSpacingViolation(relevant, boundary.limitConfig.spacingDays ?? 0);
  const violated = spacingViolation || (limit !== undefined && usage > limit);
  const previousViolations = relevant.filter((occurrence) => occurrence.evaluation?.status === "VIOLATED" || occurrence.evaluation?.status === "REPEATED_VIOLATION").length;

  return {
    status: violated ? (previousViolations > 0 ? "REPEATED_VIOLATION" : "VIOLATED") :
      limit !== undefined && usage >= limit && limit > 0 ? "APPROACHING_LIMIT" : "WITHIN_LIMIT",
    usage,
    limit,
    periodKey: period.key,
    evidenceRefs: inPeriod.map((occurrence) => occurrence.id),
    adherencePercent: calculateAdherence({ boundary, usage, limit, spacingViolation }),
  };
}

function calculateAdherence({
  boundary,
  usage,
  limit,
  spacingViolation,
}: {
  boundary: BehaviorBoundary;
  usage: number;
  limit?: number;
  spacingViolation: boolean;
}) {
  if (boundary.mode === "CONTEXT_ONLY" || boundary.intent === "CONTEXT_ONLY") return null;
  if (boundary.mode === "ZERO_TOLERANCE") return usage === 0 ? 100 : 0;
  if (spacingViolation) return 0;
  if (limit === undefined || usage <= limit) return 100;
  return Math.max(0, Math.min(100, Math.round((limit / usage) * 100)));
}

export function deriveBehaviorBoundaryState({
  boundary,
  occurrences,
  now,
}: {
  boundary: BehaviorBoundary;
  occurrences: readonly BehaviorOccurrence[];
  now: string;
}): BehaviorBoundaryState {
  const active = occurrences
    .filter((occurrence) =>
      occurrence.behaviorType === boundary.behaviorType &&
      (!occurrence.boundaryId || occurrence.boundaryId === boundary.id) &&
      occurrence.status === "ACTIVE",
    )
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const latest = active.at(-1);
  const evaluation = evaluateBehaviorBoundary({ boundary, occurrences: active, occurredAt: now });
  const violations = active.filter((occurrence) =>
    occurrence.evaluation?.status === "VIOLATED" || occurrence.evaluation?.status === "REPEATED_VIOLATION",
  ).length;

  return {
    boundary,
    currentStreak: calculateStreak(boundary, active, now),
    bestStreak: calculateBestStreak(boundary, active, now),
    periodUsage: evaluation.usage,
    pressure: resolvePressure(violations, evaluation.status),
    recentViolations: violations,
    latestEvaluation: latest?.evaluation ?? evaluation,
  };
}

export function isContextualBehavior(behaviorType: BehaviorBoundary["behaviorType"]) {
  return behaviorType === "SOCIAL_OUTING";
}

function resolvePressure(violations: number, status: BehaviorBoundaryEvaluation["status"]): BehaviorPressureState {
  if (violations === 0 && status !== "APPROACHING_LIMIT") return "CLEAR";
  if (violations === 0) return "WATCH";
  if (violations === 1) return "ELEVATED";
  return "HIGH";
}

function calculateStreak(boundary: BehaviorBoundary, occurrences: readonly BehaviorOccurrence[], now: string) {
  if (boundary.mode === "ZERO_TOLERANCE") {
    const lastViolation = occurrences.findLast((occurrence) => occurrence.evaluation?.status === "VIOLATED" || occurrence.evaluation?.status === "REPEATED_VIOLATION");
    return lastViolation ? daysBetween(lastViolation.occurredAt, now) : daysBetween(boundary.startedAt, now);
  }

  const evaluations = occurrences.map((occurrence) => occurrence.evaluation?.status);
  let streak = 0;
  for (let index = evaluations.length - 1; index >= 0; index -= 1) {
    if (evaluations[index] === "VIOLATED" || evaluations[index] === "REPEATED_VIOLATION") break;
    streak += 1;
  }
  return streak;
}

function calculateBestStreak(boundary: BehaviorBoundary, occurrences: readonly BehaviorOccurrence[], now: string) {
  if (boundary.mode === "ZERO_TOLERANCE") {
    let best = 0;
    let last = boundary.startedAt;
    for (const occurrence of occurrences) {
      if (occurrence.evaluation?.status === "VIOLATED" || occurrence.evaluation?.status === "REPEATED_VIOLATION") {
        best = Math.max(best, daysBetween(last, occurrence.occurredAt));
        last = occurrence.occurredAt;
      }
    }
    return Math.max(best, daysBetween(last, now));
  }
  return occurrences.reduce((best, occurrence, index) => {
    if (occurrence.evaluation?.status === "VIOLATED" || occurrence.evaluation?.status === "REPEATED_VIOLATION") return best;
    return Math.max(best, index + 1);
  }, 0);
}

function periodWindow(mode: BehaviorBoundary["mode"], occurredAt: string) {
  const date = new Date(occurredAt);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  if (mode === "MONTHLY_CAP") {
    const start = new Date(Date.UTC(year, month, 1));
    return { start: start.toISOString(), end: new Date(Date.UTC(year, month + 1, 1)).toISOString(), key: start.toISOString().slice(0, 7) };
  }
  if (mode === "WEEKLY_CAP") {
    const start = new Date(Date.UTC(year, month, day - date.getUTCDay()));
    return { start: start.toISOString(), end: new Date(start.getTime() + 7 * 86_400_000).toISOString(), key: start.toISOString().slice(0, 10) };
  }
  const start = new Date(Date.UTC(year, month, day));
  return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString(), key: start.toISOString().slice(0, 10) };
}

function hasSpacingViolation(occurrences: readonly BehaviorOccurrence[], spacingDays: number) {
  if (spacingDays <= 0) return false;
  return occurrences.some((occurrence, index) => {
    const previous = occurrences[index - 1];
    return index > 0 && previous !== undefined && daysBetween(previous.occurredAt, occurrence.occurredAt) < spacingDays;
  });
}

function daysBetween(start: string, end: string) {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
}
