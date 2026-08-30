import { round } from "../internal/statistics";
import { calculateLevelEstablishmentStrength } from "./establishment";
import {
  defaultLevelThresholdPolicy,
  defaultProgressionRatingPolicy,
  type ProgressionRatingPolicy,
} from "./policy";
import { deriveLevelMemory } from "./recovery";
import type { LevelThresholdPolicy } from "./thresholds";
import type {
  HighestLevelRecord,
  LevelCandidateState,
  LevelProgressionState,
  LevelRiskState,
  LevelSummaryViewModel,
  MonthlyEvaluationRecord,
  ProgressionDomainEvent,
  ProgressionRatingBreakdown,
  RatingHistoryEntry,
} from "../types";

export function evaluateLevelProgression({
  currentLevel,
  highestLevel,
  rating,
  now,
  candidate,
  risk,
  ratingHistory = [],
  monthlyEvaluations = [],
  collapseCount = 0,
  thresholdPolicy = defaultLevelThresholdPolicy,
  ratingPolicy = defaultProgressionRatingPolicy,
}: {
  currentLevel: number;
  highestLevel: HighestLevelRecord;
  rating: ProgressionRatingBreakdown;
  now: string;
  candidate?: LevelCandidateState;
  risk?: LevelRiskState;
  ratingHistory?: readonly RatingHistoryEntry[];
  monthlyEvaluations?: readonly MonthlyEvaluationRecord[];
  collapseCount?: number;
  thresholdPolicy?: LevelThresholdPolicy;
  ratingPolicy?: ProgressionRatingPolicy;
}): LevelProgressionState {
  const supportedLevel = thresholdPolicy.levelForRating(rating.finalRating);
  const events: ProgressionDomainEvent[] = [
    event("PROGRESSION_RATING_UPDATED", now, currentLevel, rating.finalRating),
  ];
  const nextCandidate = evaluateCandidate({
    currentLevel,
    supportedLevel,
    rating,
    now,
    candidate,
    monthlyEvaluations,
    thresholdPolicy,
    ratingPolicy,
    events,
  });
  const confirmedLevel =
    nextCandidate.status === "CONFIRMED" && nextCandidate.candidateLevel
      ? Math.max(currentLevel, nextCandidate.candidateLevel)
      : currentLevel;
  let nextHighest = updateHighestLevel(highestLevel, confirmedLevel, now, events);
  const nextRisk = evaluateRisk({
    currentLevel: confirmedLevel,
    supportedLevel,
    rating,
    now,
    risk,
    ratingPolicy,
    events,
  });
  const finalLevel =
    nextRisk.status === "DEMOTED" ? Math.max(1, nextRisk.supportedLevel) : confirmedLevel;

  nextHighest = updateHighestLevel(nextHighest, finalLevel, now, events);

  const historyEntry = createHistoryEntry({
    timestamp: now,
    rating,
    currentLevel: finalLevel,
    candidate: nextCandidate,
    risk: nextRisk,
  });
  const establishment = calculateLevelEstablishmentStrength({
    level: finalLevel,
    history: [...ratingHistory, historyEntry],
    monthlyEvaluations,
  });
  const recovery = deriveLevelMemory({
    currentLevel: finalLevel,
    highestLevel: nextHighest,
    rating,
    collapseCount: nextRisk.status === "DEMOTED" ? collapseCount + 1 : collapseCount,
  });

  if (recovery.recoveryState === "ACTIVE_RECOVERY") {
    events.push(event("RECOVERY_STARTED", now, finalLevel, rating.finalRating));
  }

  if (recovery.recoveryState === "PREVIOUS_STANDARD_RESTORED") {
    events.push(event("PREVIOUS_LEVEL_RESTORED", now, finalLevel, rating.finalRating));
  }

  return {
    currentLevel: finalLevel,
    highestLevel: nextHighest,
    supportedLevel,
    rating,
    candidate: nextCandidate.status === "CONFIRMED" ? emptyCandidate() : nextCandidate,
    risk: nextRisk.status === "DEMOTED" || nextRisk.status === "SAFE" ? safeRisk(finalLevel, supportedLevel) : nextRisk,
    establishment,
    recovery,
    historyEntry,
    events,
    view: createLevelView({
      currentLevel: finalLevel,
      highestLevel: nextHighest.level,
      candidate: nextCandidate,
      risk: nextRisk,
      rating,
      recoveryState: recovery.recoveryState,
    }),
  };
}

function evaluateCandidate({
  currentLevel,
  supportedLevel,
  rating,
  now,
  candidate,
  monthlyEvaluations,
  thresholdPolicy,
  ratingPolicy,
  events,
}: {
  currentLevel: number;
  supportedLevel: number;
  rating: ProgressionRatingBreakdown;
  now: string;
  candidate?: LevelCandidateState;
  monthlyEvaluations: readonly MonthlyEvaluationRecord[];
  thresholdPolicy: LevelThresholdPolicy;
  ratingPolicy: ProgressionRatingPolicy;
  events: ProgressionDomainEvent[];
}): LevelCandidateState {
  if (supportedLevel <= currentLevel) {
    if (candidate?.candidateLevel && rating.finalRating >= thresholdPolicy.thresholdForLevel(candidate.candidateLevel) - ratingPolicy.candidateHysteresis) {
      return {
        ...candidate,
        interruptions: candidate.interruptions,
        status: candidate.status === "NONE" ? "EMERGING" : candidate.status,
      };
    }

    if (candidate && candidate.status !== "NONE") {
      const interruptions = candidate.interruptions + 1;
      if (interruptions >= 2) {
        events.push(event("LEVEL_CANDIDATE_LOST", now, candidate.candidateLevel ?? currentLevel, rating.finalRating));
        return { ...candidate, interruptions, status: "LOST" };
      }

      return { ...candidate, interruptions };
    }

    return emptyCandidate();
  }

  const candidateLevel = Math.min(currentLevel + 1, supportedLevel);
  const existing =
    candidate?.candidateLevel === candidateLevel && candidate.status !== "LOST"
      ? candidate
      : null;
  if (!existing) {
    events.push(event("LEVEL_CANDIDATE_STARTED", now, candidateLevel, rating.finalRating));
  }

  const qualifyingPeriods =
    (existing?.qualifyingPeriods ?? 0) + qualifyingPeriodCredit(monthlyEvaluations, rating);
  const evidenceStrength = round(Math.min(1, rating.confidence * (rating.finalRating / Math.max(thresholdPolicy.thresholdForLevel(candidateLevel), 1))));
  const required = thresholdPolicy.confirmationPeriodsForLevel(candidateLevel);
  const status =
    qualifyingPeriods >= required && evidenceStrength >= 0.68
      ? "CONFIRMED"
      : qualifyingPeriods >= Math.max(1, required - 1)
        ? "CONFIRMING"
        : "EMERGING";

  if (status === "CONFIRMED") {
    events.push(event("LEVEL_CONFIRMED", now, candidateLevel, rating.finalRating));
  }

  return {
    candidateLevel,
    startedAt: existing?.startedAt ?? now,
    evidenceStrength,
    confidence: rating.confidence,
    qualifyingPeriods,
    interruptions: 0,
    status,
    evidenceRefs: monthlyEvaluations.slice(-3).flatMap((record) => record.evidenceRefs),
  };
}

function evaluateRisk({
  currentLevel,
  supportedLevel,
  rating,
  now,
  risk,
  ratingPolicy,
  events,
}: {
  currentLevel: number;
  supportedLevel: number;
  rating: ProgressionRatingBreakdown;
  now: string;
  risk?: LevelRiskState;
  ratingPolicy: ProgressionRatingPolicy;
  events: ProgressionDomainEvent[];
}): LevelRiskState {
  if (supportedLevel >= currentLevel) {
    if (risk && risk.status !== "SAFE") {
      events.push(event("LEVEL_RISK_RECOVERED", now, currentLevel, rating.finalRating));
    }
    return safeRisk(currentLevel, supportedLevel);
  }

  const levelGap = currentLevel - supportedLevel;
  const deteriorationStrength = round(Math.min(1, levelGap / 5 + (1 - rating.confidence) * 0.15));
  const evidencePeriods = (risk?.evidencePeriods ?? 0) + 1;

  if (!risk || risk.status === "SAFE") {
    events.push(event("LEVEL_RISK_STARTED", now, currentLevel, rating.finalRating));
  }

  const status =
    evidencePeriods >= 3 && rating.confidence >= 0.65 && levelGap >= 2
      ? "DEMOTED"
      : evidencePeriods >= 2 || rating.finalRating < currentLevel - ratingPolicy.riskHysteresis
        ? "CONFIRMING_DEMOTION"
        : "AT_RISK";

  if (status === "DEMOTED") {
    events.push(event("LEVEL_DEMOTED", now, supportedLevel, rating.finalRating));
  }

  return {
    currentLevel,
    supportedLevel,
    startedAt: risk?.startedAt ?? now,
    deteriorationStrength,
    confidence: rating.confidence,
    evidencePeriods,
    status,
    evidenceRefs: [],
  };
}

function updateHighestLevel(
  highest: HighestLevelRecord,
  currentLevel: number,
  now: string,
  events: ProgressionDomainEvent[],
) {
  if (currentLevel <= highest.level) {
    return highest;
  }

  events.push(event("HIGHEST_LEVEL_UPDATED", now, currentLevel));

  return {
    ...highest,
    level: currentLevel,
    firstReachedAt: now,
    lastReachedAt: now,
    establishmentStrength: Math.max(highest.establishmentStrength, 0.2),
  };
}

function createHistoryEntry({
  timestamp,
  rating,
  currentLevel,
  candidate,
  risk,
}: {
  timestamp: string;
  rating: ProgressionRatingBreakdown;
  currentLevel: number;
  candidate: LevelCandidateState;
  risk: LevelRiskState;
}): RatingHistoryEntry {
  return {
    timestamp,
    progressionRating: rating.finalRating,
    confidence: rating.confidence,
    currentLevel,
    candidateLevel: candidate.candidateLevel ?? undefined,
    levelRiskStatus: risk.status,
    componentSummary: {
      disciplineContribution: rating.disciplineContribution,
      capabilityContribution: rating.capabilityContribution,
      healthContribution: rating.healthContribution,
      balanceContribution: rating.balanceContribution,
      coreWeaknessPressure: rating.coreWeaknessPressure,
      behavioralFrictionPressure: rating.behavioralFrictionPressure,
    },
  };
}

function createLevelView({
  currentLevel,
  highestLevel,
  candidate,
  risk,
  rating,
  recoveryState,
}: {
  currentLevel: number;
  highestLevel: number;
  candidate: LevelCandidateState;
  risk: LevelRiskState;
  rating: ProgressionRatingBreakdown;
  recoveryState: string;
}): LevelSummaryViewModel {
  const confirming = candidate.status === "CONFIRMING" || candidate.status === "EMERGING";

  return {
    currentLevel,
    highestLevel,
    state:
      risk.status === "AT_RISK" || risk.status === "CONFIRMING_DEMOTION"
        ? "LEVEL_AT_RISK"
        : recoveryState === "ACTIVE_RECOVERY" || recoveryState === "EARLY_COMEBACK"
          ? "RECOVERING"
          : confirming
            ? "CONFIRMING"
            : candidate.status === "CONFIRMED"
              ? "RISING"
              : "STABLE",
    candidateLevel: candidate.candidateLevel ?? undefined,
    candidateProgress:
      candidate.status === "CONFIRMING"
        ? "STRONG"
        : candidate.status === "EMERGING"
          ? "BUILDING"
          : undefined,
    riskState: risk.status,
    direction: rating.finalRating >= 60 ? "IMPROVING" : rating.finalRating < 35 ? "DECLINING" : "STABLE",
    confidence: rating.confidence,
  };
}

function qualifyingPeriodCredit(
  monthlyEvaluations: readonly MonthlyEvaluationRecord[],
  rating: ProgressionRatingBreakdown,
) {
  const last = monthlyEvaluations.at(-1);
  if (!last) {
    return rating.confidence >= 0.8 ? 1 : 0;
  }

  if (last.outcome === "FULL_COMPLETION") {
    return 2;
  }

  if (last.outcome === "STRONG_PASS") {
    return 1.5;
  }

  if (last.outcome === "PASS") {
    return 1;
  }

  return 0;
}

function event(
  type: ProgressionDomainEvent["type"],
  occurredAt: string,
  level: number,
  rating?: number,
): ProgressionDomainEvent {
  return {
    id: `${type.toLowerCase()}-${occurredAt}-${level}`,
    type,
    occurredAt,
    level,
    rating,
    evidenceRefs: [],
  };
}

function emptyCandidate(): LevelCandidateState {
  return {
    candidateLevel: null,
    evidenceStrength: 0,
    confidence: 0,
    qualifyingPeriods: 0,
    interruptions: 0,
    status: "NONE",
    evidenceRefs: [],
  };
}

function safeRisk(currentLevel: number, supportedLevel: number): LevelRiskState {
  return {
    currentLevel,
    supportedLevel,
    deteriorationStrength: 0,
    confidence: 0,
    evidencePeriods: 0,
    status: "SAFE",
    evidenceRefs: [],
  };
}
