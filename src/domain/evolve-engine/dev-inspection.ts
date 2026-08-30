import { aggregateMonthlyEvidence } from "./aggregation/monthly";
import { aggregateWeeklyEvidence } from "./aggregation/weekly";
import { deriveBehavioralDebt } from "./behavior/debt";
import { deriveBehavioralFriction } from "./behavior/friction";
import { robustBaselineEstimator } from "./baseline/robust-estimator";
import { buildActivityDevelopmentState } from "./development/activity-state";
import { buildPillarStates } from "./pillars/mapping";
import { deriveDevelopmentPressure } from "./pillars/pressure";
import { evaluateLevelProgression } from "./progression/level-state";
import { calculateProgressionRating } from "./progression/rating";
import type {
  ActivityExecutionEvidence,
  BehaviorEvent,
  BehaviorInterferenceSignal,
  HighestLevelRecord,
  LevelCandidateState,
  LevelRiskState,
  RestraintEvaluation,
  RatingHistoryEntry,
} from "@/domain/evolve-engine/types";

export function createDevelopmentEvidenceInspection(
  evidence: readonly ActivityExecutionEvidence[],
  anchorDate: string,
  options: {
    behaviorEvents?: readonly BehaviorEvent[];
    restraintEvaluations?: readonly RestraintEvaluation[];
    interferenceSignals?: readonly BehaviorInterferenceSignal[];
    currentLevel?: number;
    highestLevel?: HighestLevelRecord;
    candidate?: LevelCandidateState;
    risk?: LevelRiskState;
    ratingHistory?: readonly RatingHistoryEntry[];
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
  const progressionRating = calculateProgressionRating({
    activityStates: activityDevelopmentStates,
    pillarStates,
    behavioralFriction,
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
    behavioralFriction,
    behavioralDebt: deriveBehavioralDebt({
      friction: behavioralFriction,
      restraintEvaluations: options.restraintEvaluations ?? [],
    }),
    developmentPressure: deriveDevelopmentPressure({
      interferenceSignals: options.interferenceSignals ?? [],
    }),
    progressionRating,
    levelState,
  };
}
