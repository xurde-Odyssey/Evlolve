import { average, clamp, round } from "../internal/statistics";
import type {
  ActivityDevelopmentState,
  ActivityPillarContribution,
  DevelopmentPillar,
  DevelopmentPillarState,
  DirectionSignal,
  PillarContributionRole,
} from "../types";

export const defaultActivityPillarContributions = [
  { activityId: "running", pillar: "HEALTH", contributionRole: "PRIMARY" },
  { activityId: "running", pillar: "DISCIPLINE", contributionRole: "SUPPORTING" },
  { activityId: "workout", pillar: "HEALTH", contributionRole: "PRIMARY" },
  { activityId: "sleep", pillar: "HEALTH", contributionRole: "PRIMARY" },
  { activityId: "meditation", pillar: "HEALTH", contributionRole: "SECONDARY" },
  { activityId: "meditation", pillar: "BALANCE", contributionRole: "PRIMARY" },
  { activityId: "reading", pillar: "CAPABILITY", contributionRole: "PRIMARY" },
  { activityId: "coding", pillar: "CAPABILITY", contributionRole: "PRIMARY" },
  { activityId: "custom", pillar: "CAPABILITY", contributionRole: "SECONDARY" },
] satisfies ActivityPillarContribution[];

export function buildPillarStates(
  activityStates: readonly ActivityDevelopmentState[],
  mappings: readonly ActivityPillarContribution[] = defaultActivityPillarContributions,
): DevelopmentPillarState[] {
  const pillars: DevelopmentPillar[] = [
    "HEALTH",
    "DISCIPLINE",
    "CAPABILITY",
    "BALANCE",
  ];

  return pillars.map((pillar) => buildPillarState(pillar, activityStates, mappings));
}

function buildPillarState(
  pillar: DevelopmentPillar,
  activityStates: readonly ActivityDevelopmentState[],
  mappings: readonly ActivityPillarContribution[],
): DevelopmentPillarState {
  const mapped = activityStates.filter((state) =>
    mappings.some(
      (mapping) => mapping.activityId === state.activityId && mapping.pillar === pillar,
    ),
  );
  const confidenceValues = mapped.map((state) =>
    Math.min(state.consistency.confidence, state.capability.confidence),
  );
  const reliableActivities = mapped.filter(
    (state) =>
      (state.reliability.value ?? 0) >= 0.72 &&
      state.gapClassification.classification !== "MIXED_GAP",
  );
  const weakActivities = mapped.filter(
    (state) =>
      state.gapClassification.classification !== "NO_MEANINGFUL_GAP" &&
      state.gapClassification.classification !== "INSUFFICIENT_EVIDENCE",
  );
  const confidence = round(average(confidenceValues) ?? 0);
  const direction = derivePillarDirection(mapped);

  return {
    pillar,
    direction,
    confidence,
    supportingActivities: reliableActivities.map((state) => String(state.activityId)),
    weakActivities: weakActivities.map((state) => String(state.activityId)),
    evidenceSummary: createEvidenceSummary(mapped),
    recentState: direction,
    establishedState: deriveEstablishedState(mapped),
    stability: derivePillarStability(mapped),
    momentum: direction,
    pressureFlags: [
      ...(weakActivities.length > 0 ? ["CORE_WEAKNESS" as const] : []),
      ...(confidence > 0 && confidence < 0.4 ? ["LOW_CONFIDENCE" as const] : []),
    ],
  };
}

function derivePillarDirection(
  states: readonly ActivityDevelopmentState[],
): DirectionSignal {
  if (states.length === 0) {
    return "UNKNOWN";
  }

  const improving = states.filter(
    (state) =>
      state.capability.direction === "IMPROVING" ||
      state.capability.direction === "STRONGLY_IMPROVING",
  ).length;
  const declining = states.filter(
    (state) =>
      state.capability.direction === "DECLINING" ||
      state.capability.direction === "STRONGLY_DECLINING" ||
      state.reliability.state === "DETERIORATING",
  ).length;

  if (declining > improving) {
    return declining >= 2 ? "STRONGLY_DECLINING" : "DECLINING";
  }

  if (improving > declining) {
    return improving >= 2 ? "STRONGLY_IMPROVING" : "IMPROVING";
  }

  return "STABLE";
}

function deriveEstablishedState(
  states: readonly ActivityDevelopmentState[],
): DirectionSignal {
  if (states.length === 0) {
    return "UNKNOWN";
  }

  const established = states.filter(
    (state) => state.capability.baselineState === "ESTABLISHED",
  ).length;

  return established >= Math.max(1, Math.ceil(states.length / 2)) ? "STABLE" : "UNKNOWN";
}

function derivePillarStability(states: readonly ActivityDevelopmentState[]) {
  const values = states
    .map((state) => state.capability.volatility)
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return round(clamp(1 - (average(values) ?? 0)));
}

function createEvidenceSummary(states: readonly ActivityDevelopmentState[]) {
  return states.map(
    (state) =>
      `${state.activityId}: ${state.reliability.state}, ${state.gapClassification.classification}`,
  );
}

export function contributionWeight(role: PillarContributionRole) {
  if (role === "PRIMARY") {
    return 1;
  }

  if (role === "SECONDARY") {
    return 0.7;
  }

  return 0.4;
}
