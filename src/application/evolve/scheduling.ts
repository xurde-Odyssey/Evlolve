import type { ActivityExecutionEvidence } from "../../domain/evolve-engine";
import type { ActivityKey } from "../../types/activity";
import {
  getDeadlineState,
  getLocalDateKey,
  getLocalDateParts,
  getProgressionDeadlineAt,
  getSundayToSaturdayDateKeys,
  type UserTimePolicy,
} from "./time-policy";
import type { EvolveLocalState, GrowthCommitment, ScheduledRequirement } from "./types";

export function getScheduledRequirementsForDate(
  state: EvolveLocalState,
  dateKey = getLocalDateKey(state.now, state.timePolicy.timezone),
): ScheduledRequirement[] {
  return state.commitments
    .filter((commitment) => commitment.status === "active")
    .filter((commitment) => isCommitmentScheduledOn(commitment, dateKey, state.timePolicy))
    .map((commitment) => ({
      id: requirementId(commitment.id, dateKey),
      commitmentId: commitment.id,
      activityKey: commitment.activityKey,
      title: commitment.title,
      tier: commitment.tier,
      scheduledDate: dateKey,
      timezone: state.timePolicy.timezone,
      deadlineAt: getProgressionDeadlineAt(dateKey, state.timePolicy),
      targetValue: currentTargetValue(commitment),
      unit: commitment.unit,
      measurementType: commitment.measurementType,
      exclusionState: exclusionForCommitment(commitment, dateKey),
    }));
}

export function getScheduledRequirementsForCurrentWeek(state: EvolveLocalState) {
  return getSundayToSaturdayDateKeys(state.now, state.timePolicy.timezone).flatMap((dateKey) =>
    getScheduledRequirementsForDate(state, dateKey),
  );
}

export function findRequirementForActivity(
  state: EvolveLocalState,
  activityKey: ActivityKey,
  occurredAt: string,
) {
  const dateKey = getLocalDateKey(occurredAt, state.timePolicy.timezone);

  return getScheduledRequirementsForDate(state, dateKey).find(
    (requirement) => requirement.activityKey === activityKey,
  );
}

export function getEvidenceForRequirement(
  evidence: readonly ActivityExecutionEvidence[],
  requirement: ScheduledRequirement,
) {
  return evidence.filter(
    (item) =>
      item.commitmentId === requirement.commitmentId &&
      item.scheduledFor === requirement.scheduledDate,
  );
}

export function isRequirementSatisfied(
  evidence: readonly ActivityExecutionEvidence[],
  requirement: ScheduledRequirement,
) {
  return getEvidenceForRequirement(evidence, requirement).some(
    (item) =>
      item.deadlineState === "ON_TIME" &&
      (item.executionState === "FULL" || item.executionState === "QUALIFYING_PARTIAL"),
  );
}

export function isCommitmentScheduledOn(
  commitment: GrowthCommitment,
  dateKey: string,
  policy: UserTimePolicy,
) {
  const weekday = getLocalDateParts(`${dateKey}T12:00:00.000Z`, policy.timezone).weekday;

  if (commitment.schedule.type === "daily") return true;
  if (commitment.schedule.type === "weekday") {
    return !["SUNDAY", "SATURDAY"].includes(weekday);
  }

  return commitment.schedule.weekdays.includes(weekday);
}

export function deadlineStateForRequirement(
  requirement: ScheduledRequirement,
  occurredAt: string,
) {
  return getDeadlineState({
    now: occurredAt,
    deadlineAt: requirement.deadlineAt,
  });
}

export function requirementId(commitmentId: string, dateKey: string) {
  return `requirement:${commitmentId}:${dateKey}`;
}

function currentTargetValue(commitment: GrowthCommitment) {
  return commitment.targetHistory.at(-1)?.targetValue ?? commitment.targetValue;
}

function exclusionForCommitment(
  commitment: GrowthCommitment,
  dateKey: string,
): ActivityExecutionEvidence["exclusionState"] {
  if (commitment.inactiveUntil && dateKey <= commitment.inactiveUntil) {
    return "INACTIVE";
  }

  if (commitment.readingRecoveryUntil && dateKey <= commitment.readingRecoveryUntil) {
    return "READING_RECOVERY";
  }

  return "NONE";
}
