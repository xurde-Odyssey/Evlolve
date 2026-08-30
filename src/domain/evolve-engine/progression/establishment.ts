import { average, clamp, round } from "../internal/statistics";
import type {
  LevelEstablishmentStrength,
  MonthlyEvaluationRecord,
  RatingHistoryEntry,
} from "../types";

export function calculateLevelEstablishmentStrength({
  level,
  history,
  monthlyEvaluations = [],
}: {
  level: number;
  history: readonly RatingHistoryEntry[];
  monthlyEvaluations?: readonly MonthlyEvaluationRecord[];
}): LevelEstablishmentStrength {
  const maintained = history.filter((entry) => entry.currentLevel >= level);
  const confirmationQuality =
    average(monthlyEvaluations.slice(-6).map((record) => outcomeQuality(record.outcome) * record.confidence)) ?? 0;
  const confidence = average(maintained.map((entry) => entry.confidence)) ?? 0;
  const ratingValues = maintained.map((entry) => entry.progressionRating);

  return {
    level,
    value: round(
      clamp(
        maintained.length / 12 * 0.4 +
          confirmationQuality * 0.4 +
          confidence * 0.2,
      ),
    ),
    confidence: round(clamp(confidence)),
    durationMaintainedPeriods: maintained.length,
    confirmationQuality: round(confirmationQuality),
    volatility: estimateVolatility(ratingValues),
  };
}

function outcomeQuality(outcome: MonthlyEvaluationRecord["outcome"]) {
  if (outcome === "FULL_COMPLETION") {
    return 1;
  }

  if (outcome === "STRONG_PASS") {
    return 0.85;
  }

  if (outcome === "PASS") {
    return 0.6;
  }

  return 0;
}

function estimateVolatility(values: readonly number[]) {
  if (values.length < 2) {
    return null;
  }

  const avg = average(values);
  if (avg === null || avg === 0) {
    return null;
  }

  const variance = values.reduce((total, value) => total + (value - avg) ** 2, 0) / values.length;
  return round(Math.sqrt(variance) / Math.abs(avg));
}
