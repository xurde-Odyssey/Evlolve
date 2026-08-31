import { round } from "../internal/statistics";
import {
  defaultBossDifficultyPolicy,
  type BossDifficultyPolicy,
} from "./policy";
import type {
  ActivityDevelopmentState,
  BehavioralFrictionState,
  BossCandidate,
  BossEligibilityResult,
  BossFamily,
  BossHistoryRecord,
  BossReason,
  CoreWeaknessSignal,
  DevelopmentPillar,
  DevelopmentPressure,
  LevelProgressionState,
  TargetProgressionRecommendation,
} from "../types";

export type BossEligibilityPolicy = {
  minimumCandidateConfidence: number;
  aggressiveConfidenceFloor: number;
  repeatSuppressionDays: number;
};

export const defaultBossEligibilityPolicy = {
  minimumCandidateConfidence: 0.52,
  aggressiveConfidenceFloor: 0.68,
  repeatSuppressionDays: 21,
} satisfies BossEligibilityPolicy;

export function evaluateBossEligibility({
  activityStates,
  targetRecommendations = [],
  coreWeaknesses = [],
  developmentPressure = [],
  behavioralFriction,
  levelState,
  bossHistory = [],
  now,
  policy = defaultBossEligibilityPolicy,
  difficultyPolicy = defaultBossDifficultyPolicy,
}: {
  activityStates: readonly ActivityDevelopmentState[];
  targetRecommendations?: readonly TargetProgressionRecommendation[];
  coreWeaknesses?: readonly CoreWeaknessSignal[];
  developmentPressure?: readonly DevelopmentPressure[];
  behavioralFriction?: BehavioralFrictionState;
  levelState?: LevelProgressionState | null;
  bossHistory?: readonly BossHistoryRecord[];
  now: string;
  policy?: BossEligibilityPolicy;
  difficultyPolicy?: BossDifficultyPolicy;
}): BossEligibilityResult {
  const candidates = [
    ...progressionCandidates(activityStates, targetRecommendations, now, difficultyPolicy),
    ...restorationCandidates(activityStates, now, difficultyPolicy),
    ...disciplineCandidates(activityStates, now, difficultyPolicy),
    ...correctiveCandidates(activityStates, coreWeaknesses, developmentPressure, behavioralFriction, now, difficultyPolicy),
    ...comebackCandidates(activityStates, levelState, now, difficultyPolicy),
  ];
  const suppressedReasons: string[] = [];
  const filtered = candidates.filter((candidate) => {
    if (candidate.confidence < policy.minimumCandidateConfidence) {
      suppressedReasons.push(`${candidate.id}: low confidence`);
      return false;
    }

    if (isSimilarBossSuppressed(candidate, bossHistory, now, policy.repeatSuppressionDays)) {
      suppressedReasons.push(`${candidate.id}: similar recent Boss exists`);
      return false;
    }

    if (candidate.difficulty === "EDGE" && candidate.confidence < policy.aggressiveConfidenceFloor) {
      suppressedReasons.push(`${candidate.id}: edge challenge needs stronger evidence`);
      return false;
    }

    return true;
  });
  const selectedBoss = [...filtered].sort(rankBossCandidate)[0] ?? null;

  return {
    eligible: selectedBoss !== null,
    candidates: filtered,
    selectedBoss,
    suppressedReasons,
  };
}

function progressionCandidates(
  activityStates: readonly ActivityDevelopmentState[],
  targetRecommendations: readonly TargetProgressionRecommendation[],
  now: string,
  difficultyPolicy: BossDifficultyPolicy,
) {
  return targetRecommendations
    .filter((recommendation) => recommendation.action === "INCREASE")
    .map((recommendation) => {
      const state = activityStates.find((item) => item.activityId === recommendation.activityId);
      if (!state) {
        return null;
      }

      const targetValue = difficultyPolicy.edgeTarget({
        activityState: state,
        currentTargetValue: recommendation.currentTargetValue,
      });
      if (!targetValue) {
        return null;
      }

      return candidate({
        family: "PROGRESSION",
        activityId: state.activityId,
        targetValue,
        unit: recommendation.unit,
        confidence: Math.min(recommendation.confidence, state.capability.confidence),
        now,
        difficultyPolicy,
        activityState: state,
        reason: {
          category: "CAPABILITY_EDGE",
          summaryKey: "sustained_capability_above_target",
          supportingEvidence: recommendation.supportingEvidence,
          confidence: recommendation.confidence,
          affectedActivityIds: [String(state.activityId)],
          affectedPillars: [],
        },
      });
    })
    .filter((item): item is BossCandidate => item !== null);
}

function restorationCandidates(
  activityStates: readonly ActivityDevelopmentState[],
  now: string,
  difficultyPolicy: BossDifficultyPolicy,
) {
  return activityStates
    .filter(
      (state) =>
        state.capability.baselineState === "REBUILDING" ||
        state.capability.momentum === "DECLINING" ||
        state.capability.momentum === "STRONGLY_DECLINING",
    )
    .map((state) => {
      const currentTarget = state.executionSummary.expectedOutput / Math.max(state.executionSummary.eligibleRequirements, 1);
      const targetValue = difficultyPolicy.restorationTarget({
        activityState: state,
        currentTargetValue: currentTarget || state.capability.recentCapability.value || 1,
      });
      if (!targetValue) {
        return null;
      }

      return candidate({
        family: "RESTORATION",
        activityId: state.activityId,
        targetValue,
        confidence: state.capability.confidence,
        now,
        difficultyPolicy,
        activityState: state,
        reason: {
          category: "RESTORATION",
          summaryKey: "recent_capability_below_established_standard",
          supportingEvidence: ["Recent capability is below the established standard."],
          confidence: state.capability.confidence,
          affectedActivityIds: [String(state.activityId)],
          affectedPillars: [],
        },
      });
    })
    .filter((item): item is BossCandidate => item !== null);
}

function disciplineCandidates(
  activityStates: readonly ActivityDevelopmentState[],
  now: string,
  difficultyPolicy: BossDifficultyPolicy,
) {
  return activityStates
    .filter((state) => state.gapClassification.classification === "DISCIPLINE_GAP")
    .map((state) =>
      candidate({
        family: "DISCIPLINE",
        activityId: state.activityId,
        confidence: Math.min(state.gapClassification.confidence, state.reliability.confidence),
        now,
        difficultyPolicy,
        activityState: state,
        requirementDescription: `Complete every scheduled ${state.activityId} requirement across the evaluation period`,
        reason: {
          category: "DISCIPLINE_WEAKNESS",
          summaryKey: "capability_present_execution_inconsistent",
          supportingEvidence: state.gapClassification.supportingEvidence,
          confidence: state.gapClassification.confidence,
          affectedActivityIds: [String(state.activityId)],
          affectedPillars: ["DISCIPLINE"],
        },
      }),
    );
}

function correctiveCandidates(
  activityStates: readonly ActivityDevelopmentState[],
  weaknesses: readonly CoreWeaknessSignal[],
  pressure: readonly DevelopmentPressure[],
  behavioralFriction: BehavioralFrictionState | undefined,
  now: string,
  difficultyPolicy: BossDifficultyPolicy,
) {
  const fromWeakness = weaknesses
    .filter((weakness) => weakness.confidence >= 0.62)
    .map((weakness) => {
      const state = activityStates.find((item) => item.activityId === weakness.activityId);
      return candidate({
        family: "CORRECTIVE",
        activityId: weakness.activityId,
        pillar: weakness.pillar,
        confidence: weakness.confidence,
        now,
        difficultyPolicy,
        activityState: state,
        requirementDescription: `Restore reliable execution for ${weakness.activityId}`,
        reason: {
          category: "CORE_WEAKNESS",
          summaryKey: "core_weakness_requires_attention",
          supportingEvidence: ["A Core weakness remains unresolved."],
          confidence: weakness.confidence,
          affectedActivityIds: [weakness.activityId],
          affectedPillars: [weakness.pillar],
        },
      });
    });
  const fromPressure = pressure
    .filter((item) => item.confidence >= 0.62 && item.severity !== "LOW")
    .map((item) =>
      candidate({
        family: item.pillar === "BALANCE" ? "BALANCE" : "CORRECTIVE",
        pillar: item.pillar,
        confidence: item.confidence,
        now,
        difficultyPolicy,
        requirementDescription: `Complete an evidence-based ${item.pillar.toLowerCase()} restoration challenge`,
        reason: {
          category:
            item.reason.includes("interference") || behavioralFriction?.state === "HIGH"
              ? "BEHAVIOR_INTERFERENCE"
              : "CORE_WEAKNESS",
          summaryKey: "development_pressure_detected",
          supportingEvidence: [item.reason],
          confidence: item.confidence,
          affectedActivityIds: [],
          affectedPillars: [item.pillar],
        },
      }),
    );

  return [...fromWeakness, ...fromPressure];
}

function comebackCandidates(
  activityStates: readonly ActivityDevelopmentState[],
  levelState: LevelProgressionState | null | undefined,
  now: string,
  difficultyPolicy: BossDifficultyPolicy,
) {
  if (!levelState || !["ACTIVE_RECOVERY", "NEAR_PREVIOUS_STANDARD"].includes(levelState.recovery.recoveryState)) {
    return [];
  }

  const best = [...activityStates].sort(
    (a, b) => b.capability.confidence - a.capability.confidence,
  )[0];
  if (!best || best.capability.confidence < 0.55) {
    return [];
  }

  return [
    candidate({
      family: "COMEBACK",
      activityId: best.activityId,
      confidence: Math.min(best.capability.confidence, levelState.rating.confidence),
      now,
      difficultyPolicy,
      activityState: best,
      requirementDescription: `Verify recovery toward the previously demonstrated Level ${levelState.highestLevel.level} standard`,
      reason: {
        category: "RECOVERY_MEMORY",
        summaryKey: "recovery_toward_previous_standard",
        supportingEvidence: ["Recovery memory indicates a previously demonstrated higher standard."],
        confidence: levelState.rating.confidence,
        affectedActivityIds: [String(best.activityId)],
        affectedPillars: [],
      },
    }),
  ];
}

function candidate({
  family,
  activityId,
  pillar,
  targetValue,
  unit,
  confidence,
  now,
  difficultyPolicy,
  activityState,
  requirementDescription,
  reason,
}: {
  family: BossFamily;
  activityId?: string;
  pillar?: DevelopmentPillar;
  targetValue?: number;
  unit?: string;
  confidence: number;
  now: string;
  difficultyPolicy: BossDifficultyPolicy;
  activityState?: ActivityDevelopmentState;
  requirementDescription?: string;
  reason: BossReason;
}): BossCandidate {
  const difficulty = difficultyPolicy.classify({ family, activityState, targetValue });
  const id = `boss-${family.toLowerCase()}-${activityId ?? pillar ?? "development"}-${now}`;
  const targetSuffix = targetValue ? ` ${round(targetValue, 2)}${unit ? ` ${unit}` : ""}` : "";

  return {
    id,
    family,
    title: titleFor(family, activityId, pillar),
    status: "CANDIDATE",
    reason,
    requirements: [
      {
        activityId,
        pillar,
        description: requirementDescription ?? `Complete a ${family.toLowerCase()} challenge${targetSuffix}`,
        targetValue,
        unit,
        evaluationType:
          family === "DISCIPLINE" || family === "BALANCE" ? "CONSISTENCY" : "SINGLE_VALUE",
      },
    ],
    difficulty,
    confidence: round(confidence),
    evidenceRefs: reason.supportingEvidence,
    evidenceSignature: `${family}:${activityId ?? pillar ?? "development"}:${reason.summaryKey}`,
    generatedAt: now,
  };
}

function titleFor(family: BossFamily, activityId?: string, pillar?: DevelopmentPillar) {
  const subject = activityId ?? pillar?.toLowerCase() ?? "development";

  if (family === "PROGRESSION") {
    return `${subject} progression challenge`;
  }

  if (family === "COMEBACK") {
    return `${subject} comeback challenge`;
  }

  if (family === "CORRECTIVE") {
    return `${subject} corrective challenge`;
  }

  return `${subject} ${family.toLowerCase()} challenge`;
}

function rankBossCandidate(a: BossCandidate, b: BossCandidate) {
  return bossScore(b) - bossScore(a);
}

function bossScore(candidate: BossCandidate) {
  const familyPriority: Record<BossFamily, number> = {
    CORRECTIVE: 9,
    COMEBACK: 8,
    DISCIPLINE: 7,
    RESTORATION: 7,
    BALANCE: 6,
    PROGRESSION: 5,
    BREAKTHROUGH: 4,
    ENDURANCE: 4,
    SKILL: 4,
  };

  return familyPriority[candidate.family] + candidate.confidence * 3;
}

function isSimilarBossSuppressed(
  candidate: BossCandidate,
  history: readonly BossHistoryRecord[],
  now: string,
  suppressionDays: number,
) {
  const nowMs = Date.parse(now);

  return history.some((record) => {
    if (record.evidenceSignature !== candidate.evidenceSignature) {
      return false;
    }

    const offeredMs = Date.parse(record.offeredAt);

    return Number.isFinite(offeredMs) && nowMs - offeredMs < suppressionDays * 86_400_000;
  });
}
