import { aggregateMonthlyEvidence } from "./aggregation/monthly";
import { aggregateWeeklyEvidence } from "./aggregation/weekly";
import { evaluateAchievements } from "./achievements/engine";
import { detectInternalPatternSignals } from "./anti-gaming/signals";
import { evaluateBossEligibility } from "./boss/eligibility";
import { deriveBehavioralDebt } from "./behavior/debt";
import { deriveBehavioralFriction } from "./behavior/friction";
import { robustBaselineEstimator } from "./baseline/robust-estimator";
import { evaluateCommitmentCapacity, initialCommitmentCapacityState } from "./capacity/state";
import { buildActivityDevelopmentState } from "./development/activity-state";
import { buildPillarStates } from "./pillars/mapping";
import { deriveDevelopmentPressure } from "./pillars/pressure";
import { evaluateLevelProgression } from "./progression/level-state";
import { calculateProgressionRating } from "./progression/rating";
import { generateRecommendations } from "./recommendation/engine";
import { evaluateTargetProgression } from "./target/progression";
import { evaluateTitleEligibility } from "./titles/eligibility";
import { summarizeLifetimeXp } from "./xp/ledger";
import type {
  AchievementAward,
  ActivityExecutionEvidence,
  BehaviorEvent,
  BehaviorInterferenceSignal,
  BossHistoryRecord,
  CommitmentCapacityState,
  CoreWeaknessSignal,
  EarnedTitleRecord,
  HighestLevelRecord,
  LevelCandidateState,
  LevelRiskState,
  RecommendationHistoryRecord,
  RestraintEvaluation,
  RatingHistoryEntry,
  TargetAdaptationState,
  XpTransaction,
} from "@/domain/evolve-engine/types";

export function createDevelopmentEvidenceInspection(
  evidence: readonly ActivityExecutionEvidence[],
  anchorDate: string,
  options: {
    behaviorEvents?: readonly BehaviorEvent[];
    restraintEvaluations?: readonly RestraintEvaluation[];
    interferenceSignals?: readonly BehaviorInterferenceSignal[];
    coreWeaknesses?: readonly CoreWeaknessSignal[];
    currentLevel?: number;
    highestLevel?: HighestLevelRecord;
    candidate?: LevelCandidateState;
    risk?: LevelRiskState;
    ratingHistory?: readonly RatingHistoryEntry[];
    bossHistory?: readonly BossHistoryRecord[];
    recommendationHistory?: readonly RecommendationHistoryRecord[];
    targetValues?: Record<string, number>;
    targetAdaptations?: readonly TargetAdaptationState[];
    xpLedger?: readonly XpTransaction[];
    achievements?: readonly AchievementAward[];
    titles?: readonly EarnedTitleRecord[];
    capacity?: CommitmentCapacityState;
    activeCommitmentCount?: number;
  } = {},
) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const activityDevelopmentStates = Array.from(
    new Set(evidence.map((item) => item.activityId)),
  ).map((activityId) =>
    buildActivityDevelopmentState(evidence, {
      activityId,
      anchorDate,
    }),
  );
  const pillarStates = buildPillarStates(activityDevelopmentStates);
  const behavioralFriction = deriveBehavioralFriction({
    signals: options.interferenceSignals ?? [],
    restraintEvaluations: options.restraintEvaluations ?? [],
  });
  const developmentPressure = deriveDevelopmentPressure({
    coreWeaknesses: options.coreWeaknesses ?? [],
    interferenceSignals: options.interferenceSignals ?? [],
  });
  const progressionRating = calculateProgressionRating({
    activityStates: activityDevelopmentStates,
    pillarStates,
    coreWeaknesses: options.coreWeaknesses ?? [],
    behavioralFriction,
    developmentPressure,
  });
  const levelState =
    options.currentLevel && options.highestLevel
      ? evaluateLevelProgression({
          currentLevel: options.currentLevel,
          highestLevel: options.highestLevel,
          rating: progressionRating,
          now: anchorDate,
          candidate: options.candidate,
          risk: options.risk,
          ratingHistory: options.ratingHistory,
        })
      : null;
  const targetProgression = activityDevelopmentStates
    .map((state) => {
      const targetValue = options.targetValues?.[String(state.activityId)];

      return targetValue
        ? evaluateTargetProgression({
            activityState: state,
            currentTargetValue: targetValue,
            now: anchorDate,
          })
        : null;
    })
    .filter((item) => item !== null);
  const bossEligibility = evaluateBossEligibility({
    activityStates: activityDevelopmentStates,
    targetRecommendations: targetProgression,
    coreWeaknesses: options.coreWeaknesses ?? [],
    behavioralFriction,
    developmentPressure,
    levelState,
    bossHistory: options.bossHistory ?? [],
    now: anchorDate,
  });
  const capacity = evaluateCommitmentCapacity({
    previous: options.capacity ?? initialCommitmentCapacityState(options.activeCommitmentCount ?? 0),
    activityStates: activityDevelopmentStates,
    coreWeaknesses: options.coreWeaknesses ?? [],
    behavioralFriction,
    levelState,
    activeCommitmentCount: options.activeCommitmentCount ?? activityDevelopmentStates.length,
  });
  const recommendations = generateRecommendations({
    activityStates: activityDevelopmentStates,
    targetRecommendations: targetProgression,
    coreWeaknesses: options.coreWeaknesses ?? [],
    behavioralFriction,
    developmentPressure,
    bossEligibility,
    levelState,
    commitmentCapacity: capacity,
    recommendationHistory: options.recommendationHistory ?? [],
    now: anchorDate,
  });
  const achievements = evaluateAchievements({
    existingAwards: options.achievements ?? [],
    activityStates: activityDevelopmentStates,
    bossHistory: options.bossHistory ?? [],
    levelState,
    now: anchorDate,
  });

  return {
    evidence,
    weeklyAggregation: aggregateWeeklyEvidence(evidence, anchorDate),
    monthlyAggregation: aggregateMonthlyEvidence(evidence, anchorDate),
    baselines: Array.from(new Set(evidence.map((item) => item.activityId))).map(
      (activityId) =>
        robustBaselineEstimator.estimate({
          activityId,
          evidence: evidence.filter((item) => item.activityId === activityId),
          now: anchorDate,
        }),
    ),
    activityDevelopmentStates,
    pillarStates,
    behaviorEvents: options.behaviorEvents ?? [],
    restraintEvaluations: options.restraintEvaluations ?? [],
    interferenceSignals: options.interferenceSignals ?? [],
    coreWeaknesses: options.coreWeaknesses ?? [],
    behavioralFriction,
    behavioralDebt: deriveBehavioralDebt({
      friction: behavioralFriction,
      restraintEvaluations: options.restraintEvaluations ?? [],
    }),
    developmentPressure,
    progressionRating,
    levelState,
    targetProgression,
    targetAdaptations: options.targetAdaptations ?? [],
    bossEligibility,
    recommendations,
    xp: summarizeLifetimeXp(options.xpLedger ?? [], anchorDate),
    achievements: {
      existing: options.achievements ?? [],
      newlyEligible: achievements.awards,
    },
    titles: evaluateTitleEligibility({
      titles: options.titles ?? [],
      achievements: [...(options.achievements ?? []), ...achievements.awards],
      activityStates: activityDevelopmentStates,
      levelState,
    }),
    capacity,
    internalPatternSignals: detectInternalPatternSignals({
      activityStates: activityDevelopmentStates,
      bossHistory: options.bossHistory ?? [],
    }),
  };
}
