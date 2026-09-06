import { defaultAdaptiveIntelligencePolicy } from "./policy";
import type {
  ActivityDevelopmentState,
  ActivityExecutionEvidence,
  DevelopmentPillar,
} from "../types";
import type {
  AdaptiveActivityProfile,
  AdaptiveDevelopmentState,
  AdaptiveIntelligenceInput,
  AdaptiveIntelligenceResult,
  CapabilityTrajectory,
  CommitmentDifficulty,
  DevelopmentDomain,
  DevelopmentFrontier,
  DeadlineBehavior,
  MonthlyDevelopmentAnalysis,
  PersonalDevelopmentModel,
} from "./types";

const domainByActivity: Record<string, DevelopmentDomain> = {
  running: "PHYSICAL_TRAINING",
  workout: "PHYSICAL_TRAINING",
  reading: "KNOWLEDGE",
  coding: "SKILL_DEVELOPMENT",
  meditation: "MENTAL_TRAINING",
  sleep: "RECOVERY",
  water: "RECOVERY",
};

export function developmentDomainForActivity(activityId: string): DevelopmentDomain {
  return domainByActivity[activityId] ?? "SKILL_DEVELOPMENT";
}

export function isSupportingHealthSignal(activityId: string): boolean {
  return activityId === "sleep" || activityId === "water";
}

export function detectStagnation(
  state: ActivityDevelopmentState,
): { detected: boolean; confidence: number; reason: string } {
  const policy = defaultAdaptiveIntelligencePolicy.stagnation;
  const consistency = state.consistency.value;
  const capability = state.capability;
  const confidence = Math.min(
    state.capability.confidence,
    state.consistency.confidence,
    state.reliability.confidence,
  );
  const detected =
    confidence >= policy.minimumConfidence &&
    capability.sampleCount >= policy.minimumSamples &&
    consistency !== null &&
    consistency >= policy.minimumConsistency &&
    capability.direction === "STABLE" &&
    state.targetRelationship.state === "BELOW_CAPABILITY";

  return {
    detected,
    confidence,
    reason: detected
      ? "Consistent execution has not produced meaningful capability movement while the target trails demonstrated capability."
      : "There is not enough evidence of a mature, easy standard that has plateaued.",
  };
}

export function detectBreakthrough(
  state: ActivityDevelopmentState,
): { detected: boolean; confidence: number; reason: string } {
  const policy = defaultAdaptiveIntelligencePolicy.breakthrough;
  const confidence = Math.min(state.capability.confidence, state.consistency.confidence);
  const detected =
    confidence >= policy.minimumConfidence &&
    state.capability.sampleCount >= policy.minimumSamples &&
    state.capability.qualifyingSampleCount >= policy.minimumQualifyingSamples &&
    (state.capability.direction === "STRONGLY_IMPROVING" ||
      state.capability.momentum === "STRONGLY_IMPROVING");

  return {
    detected,
    confidence,
    reason: detected
      ? "Repeated qualifying evidence supports a new sustainable capability frontier."
      : "A single exceptional session or weak evidence is not enough for a breakthrough.",
  };
}

export function buildDevelopmentFrontier(
  state: ActivityDevelopmentState,
): DevelopmentFrontier {
  const sustainable = state.capability.sustainableCapability.value;
  const target = state.executionSummary.expectedOutput;
  const peak = state.capability.peakCapability.value;
  const confidence = state.capability.confidence;
  const frontier = sustainable === null
    ? null
    : Math.max(sustainable, peak ?? sustainable, target) * defaultAdaptiveIntelligencePolicy.frontier.surplusMultiplier;
  const stateLabel = sustainable === null
    ? "UNKNOWN"
    : state.capability.direction === "STRONGLY_IMPROVING"
      ? "EXPANDING"
      : target > 0 && sustainable >= target * 1.08
        ? "NEAR_FRONTIER"
        : "ESTABLISHED";

  return {
    activityId: String(state.activityId),
    sustainableValue: sustainable,
    frontierValue: frontier,
    confidence,
    state: stateLabel,
  };
}

export function classifyCommitmentDifficulty(
  state: ActivityDevelopmentState,
): CommitmentDifficulty {
  if (state.capability.confidence < 0.35 || state.capability.sustainableCapability.value === null) {
    return "UNKNOWN";
  }
  if (state.gapClassification.classification === "CAPABILITY_GAP") return "OVERREACHING";
  if (state.gapClassification.classification === "MIXED_GAP") return "UNSUSTAINABLE";
  if (state.targetRelationship.state === "BELOW_CAPABILITY") return "UNDERLOADED";
  if (state.targetRelationship.state === "CHALLENGING") return "CHALLENGING";
  return "APPROPRIATE";
}

export function classifyDeadlineBehavior(
  evidence: readonly ActivityExecutionEvidence[],
  activityId: string,
): DeadlineBehavior {
  const records = evidence.filter((item) => item.activityId === activityId && item.deadlineState !== "UNKNOWN");
  if (records.length < 3) return "UNKNOWN";
  const late = records.filter((item) => item.deadlineState === "AFTER_DEADLINE").length;
  const before = records.filter((item) => item.deadlineState === "ON_TIME").length;
  const reliable = records.filter((item) => item.executionState === "FULL" || item.executionState === "QUALIFYING_PARTIAL").length / records.length;
  if (late === 0 && before === records.length) return "EARLY_EXECUTOR";
  if (reliable >= 0.8 && late / records.length >= 0.5) return "LATE_BUT_RELIABLE";
  if (late / records.length >= 0.5 && reliable < 0.8) return "DEADLINE_FAILURE_RISK";
  return "DISTRIBUTED";
}

export function analyzeAdaptiveIntelligence(input: AdaptiveIntelligenceInput): AdaptiveIntelligenceResult {
  const profiles = input.activityStates.map((state) => createActivityProfile(state, input.evidence));
  const frontiers = input.activityStates.map(buildDevelopmentFrontier);
  const model = createPersonalDevelopmentModel(profiles, input.activityStates, input.now);
  const analysis = createMonthlyDevelopmentAnalysis(input.activityStates, profiles);

  return {
    model,
    frontiers,
    analysis,
    noIntervention: profiles.length === 0 || profiles.every((profile) => profile.confidence < 0.5),
  };
}

function createActivityProfile(
  state: ActivityDevelopmentState,
  evidence: readonly ActivityExecutionEvidence[],
): AdaptiveActivityProfile {
  const activityId = String(state.activityId);
  const stagnation = detectStagnation(state);
  const breakthrough = detectBreakthrough(state);
  const stateLabel: AdaptiveDevelopmentState = breakthrough.detected
    ? "BREAKTHROUGH"
    : stagnation.detected
      ? "STAGNATING"
      : state.capability.baselineState === "NEW"
        ? "BUILDING"
        : state.capability.direction === "STRONGLY_IMPROVING"
          ? "STRONGLY_IMPROVING"
          : state.capability.direction === "IMPROVING"
            ? "IMPROVING"
            : state.capability.direction === "DECLINING" || state.capability.direction === "STRONGLY_DECLINING"
              ? "DECLINING"
              : state.gapClassification.classification === "CAPABILITY_GAP"
                ? "REBUILDING"
                : "STABLE";

  return {
    activityId,
    domain: developmentDomainForActivity(activityId),
    pillar: pillarForActivity(activityId),
    state: stateLabel,
    trajectory: trajectoryFor(state, stateLabel),
    difficulty: classifyCommitmentDifficulty(state),
    targetRelationship: state.targetRelationship.state,
    gap: state.gapClassification.classification,
    confidence: Math.min(state.capability.confidence, state.consistency.confidence),
    deadlineBehavior: classifyDeadlineBehavior(evidence, activityId),
    evidenceRefs: evidence.filter((item) => item.activityId === activityId).slice(-8).map((item) => item.id),
  };
}

function createPersonalDevelopmentModel(
  profiles: readonly AdaptiveActivityProfile[],
  states: readonly ActivityDevelopmentState[],
  updatedAt: string,
): PersonalDevelopmentModel {
  const strengths = profiles.filter((profile) => ["STABLE", "IMPROVING", "STRONGLY_IMPROVING", "BREAKTHROUGH"].includes(profile.state) && profile.confidence >= 0.5).map((profile) => profile.activityId);
  const constraints = profiles.filter((profile) => profile.gap === "DISCIPLINE_GAP" || profile.gap === "MIXED_GAP" || profile.state === "DECLINING").map((profile) => profile.activityId);
  const opportunities = profiles.filter((profile) => profile.state === "STAGNATING" || profile.difficulty === "UNDERLOADED").map((profile) => profile.activityId);
  const confidence = profiles.length === 0 ? 0 : profiles.reduce((total, profile) => total + profile.confidence, 0) / profiles.length;

  return {
    domains: [...new Set(profiles.map((profile) => profile.domain))],
    pillars: [...new Set(profiles.map((profile) => profile.pillar))],
    activities: [...profiles],
    sustainableCapabilities: Object.fromEntries(profiles.map((profile) => [profile.activityId, states.find((state) => String(state.activityId) === profile.activityId)?.capability.sustainableCapability.value ?? null])),
    peakCapabilities: Object.fromEntries(profiles.map((profile) => [profile.activityId, states.find((state) => String(state.activityId) === profile.activityId)?.capability.peakCapability.value ?? null])),
    baselineMaturity: Object.fromEntries(profiles.map((profile) => [profile.activityId, profile.state])),
    strengths,
    constraints,
    opportunities,
    confidence,
    updatedAt,
  };
}

function createMonthlyDevelopmentAnalysis(
  states: readonly ActivityDevelopmentState[],
  profiles: readonly AdaptiveActivityProfile[],
): MonthlyDevelopmentAnalysis {
  const strongest = profiles.filter((profile) => profile.confidence >= 0.5 && ["STABLE", "IMPROVING", "STRONGLY_IMPROVING", "BREAKTHROUGH"].includes(profile.state));
  const constrained = profiles.filter((profile) => profile.gap === "DISCIPLINE_GAP" || profile.gap === "MIXED_GAP" || profile.state === "DECLINING");
  const primary = constrained[0] ?? profiles.find((profile) => profile.state === "STAGNATING") ?? null;
  const primaryState = primary ? states.find((state) => String(state.activityId) === primary.activityId) : undefined;
  const confidence = primary ? primary.confidence : profiles.length > 0 ? Math.max(...profiles.map((profile) => profile.confidence)) : 0;
  const claims = [];

  if (strongest[0]) claims.push({ type: "STRENGTH" as const, text: `${strongest[0].activityId} is currently one of your stronger areas.`, evidenceRefs: strongest[0].evidenceRefs, confidence: strongest[0].confidence });
  if (primary && primaryState) claims.push({ type: "CONSTRAINT" as const, text: `${primary.activityId} is currently the main constraint on development.`, evidenceRefs: primary.evidenceRefs, confidence: primary.confidence });

  return {
    strongestDevelopment: strongest.map((profile) => profile.activityId),
    primaryConstraint: primary?.activityId ?? null,
    meaningfulChange: primary ? `${primary.activityId} needs attention before increasing another commitment.` : null,
    capabilityChange: primaryState?.capability.direction ?? "UNKNOWN",
    disciplineChange: primaryState?.consistency.direction ?? "UNKNOWN",
    balanceChange: "UNKNOWN",
    recommendedFocus: primary?.activityId ?? null,
    confidence,
    claims,
  };
}

function trajectoryFor(state: ActivityDevelopmentState, adaptiveState: AdaptiveDevelopmentState): CapabilityTrajectory {
  if (adaptiveState === "BUILDING") return "EMERGING";
  if (adaptiveState === "BREAKTHROUGH" || adaptiveState === "STRONGLY_IMPROVING") return "EXPANDING";
  if (adaptiveState === "REBUILDING") return "REBUILDING";
  if (adaptiveState === "STAGNATING") return "PLATEAUED";
  if (adaptiveState === "DECLINING") return "DETERIORATING";
  if (state.capability.baselineState === "ESTABLISHED") return "ESTABLISHED";
  return "DEVELOPING";
}

function pillarForActivity(activityId: string): DevelopmentPillar {
  if (["running", "workout", "sleep", "water"].includes(activityId)) return "HEALTH";
  if (["reading", "coding"].includes(activityId)) return "CAPABILITY";
  if (activityId === "meditation") return "DISCIPLINE";
  return "CAPABILITY";
}
