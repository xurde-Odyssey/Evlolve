import { average, clamp, round } from "../internal/statistics";
import type {
  ActivityDevelopmentState,
  ActivityExecutionEvidence,
  BehaviorEvent,
  BehaviorInterferenceSignal,
  DevelopmentPillar,
} from "../types";

export type InterferenceWindowPolicy = {
  lookaheadDays: number;
  affectedActivityId?: string;
  affectedPillar?: DevelopmentPillar;
};

export function detectBehaviorInterference({
  behaviorId,
  events,
  evidence,
  activityStates,
  policy,
}: {
  behaviorId: string;
  events: readonly BehaviorEvent[];
  evidence: readonly ActivityExecutionEvidence[];
  activityStates: readonly ActivityDevelopmentState[];
  policy: InterferenceWindowPolicy;
}): BehaviorInterferenceSignal {
  const relevantEvents = events.filter((event) => event.behaviorId === behaviorId);
  const comparisons = relevantEvents
    .map((event) =>
      findRelatedEvidence(event, evidence, policy).map((item) =>
        evaluatePostBehaviorEvidence(item, activityStates),
      ),
    )
    .flat();
  const affected = comparisons.filter((comparison) => comparison.weak);
  const sampleCount = comparisons.length;

  if (sampleCount === 0) {
    return noMeaningfulSignal(behaviorId, policy, 0, []);
  }

  const weakRatio = affected.length / sampleCount;
  const strength = round(
    average(affected.map((comparison) => comparison.strength).filter(Boolean)) ?? 0,
  );
  const confidence = round(clamp(sampleCount / 8 * weakRatio));

  if (sampleCount < 3 || confidence < 0.35) {
    return {
      behaviorId,
      affectedActivityId: policy.affectedActivityId,
      affectedPillar: policy.affectedPillar,
      impactDirection: weakRatio > 0 ? "UNKNOWN" : "NO_MEANINGFUL_INTERFERENCE",
      estimatedStrength: weakRatio > 0 ? strength : null,
      confidence,
      sampleCount,
      recurringPattern: false,
      evidenceRefs: affected.map((comparison) => comparison.evidenceId),
      explanation:
        weakRatio > 0
          ? "Low-confidence association observed; no consequence is implied."
          : "No meaningful interference detected.",
    };
  }

  if (weakRatio >= 0.55) {
    return {
      behaviorId,
      affectedActivityId: policy.affectedActivityId,
      affectedPillar: policy.affectedPillar,
      impactDirection: "NEGATIVE_ASSOCIATION",
      estimatedStrength: strength,
      confidence,
      sampleCount,
      recurringPattern: affected.length >= 3,
      evidenceRefs: affected.map((comparison) => comparison.evidenceId),
      explanation: "Repeated association detected between behavior events and weaker execution.",
    };
  }

  return noMeaningfulSignal(
    behaviorId,
    policy,
    round(clamp(sampleCount / 8)),
    comparisons.map((comparison) => comparison.evidenceId),
  );
}

function findRelatedEvidence(
  event: BehaviorEvent,
  evidence: readonly ActivityExecutionEvidence[],
  policy: InterferenceWindowPolicy,
) {
  const eventDate = new Date(event.occurredAt).getTime();
  const windowEnd = eventDate + policy.lookaheadDays * 86_400_000;

  return evidence.filter((item) => {
    if (policy.affectedActivityId && item.activityId !== policy.affectedActivityId) {
      return false;
    }

    if (item.exclusionState !== "NONE" || item.requirementState === "EXCLUDED") {
      return false;
    }

    const scheduledDate = new Date(item.scheduledFor ?? item.occurredAt ?? "").getTime();

    return Number.isFinite(scheduledDate) && scheduledDate > eventDate && scheduledDate <= windowEnd;
  });
}

function evaluatePostBehaviorEvidence(
  evidence: ActivityExecutionEvidence,
  activityStates: readonly ActivityDevelopmentState[],
) {
  const state = activityStates.find((item) => item.activityId === evidence.activityId);
  const established = state?.capability.establishedCapability.value ?? null;
  const actual = evidence.actualValue ?? 0;
  const target = evidence.targetValue ?? null;
  const targetWeak = target !== null && actual < target * 0.85;
  const personalWeak = established !== null && actual < established * 0.8;
  const missed = evidence.executionState === "MISSED";
  const weak = missed || targetWeak || personalWeak;
  const baseline = established ?? target ?? 1;

  return {
    evidenceId: evidence.id,
    weak,
    strength: baseline === 0 ? 0 : clamp((baseline - actual) / Math.abs(baseline)),
  };
}

function noMeaningfulSignal(
  behaviorId: string,
  policy: InterferenceWindowPolicy,
  confidence: number,
  evidenceRefs: string[],
): BehaviorInterferenceSignal {
  return {
    behaviorId,
    affectedActivityId: policy.affectedActivityId,
    affectedPillar: policy.affectedPillar,
    impactDirection: "NO_MEANINGFUL_INTERFERENCE",
    estimatedStrength: null,
    confidence,
    sampleCount: evidenceRefs.length,
    recurringPattern: false,
    evidenceRefs,
    explanation: "No meaningful interference detected.",
  };
}
