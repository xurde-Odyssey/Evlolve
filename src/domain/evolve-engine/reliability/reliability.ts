import { derivePatternSignals } from "../consistency/summary";
import { summarizeAttendance } from "./attendance";
import { clamp, round } from "../internal/statistics";
import type {
  ActivityExecutionEvidence,
  ConsistencySummary,
  ReliabilityResult,
  ReliabilityState,
} from "../types";

export function evaluateReliability(
  consistency: ConsistencySummary,
  evidence: readonly ActivityExecutionEvidence[],
  volatility: number | null = null,
): ReliabilityResult {
  const attendance = summarizeAttendance(evidence);
  const patternSignals = derivePatternSignals(evidence);
  const consistencyRatio = consistency.consistencyRatio;

  if (
    consistencyRatio === null ||
    attendance.value === null ||
    consistency.eligibleOpportunities < 4
  ) {
    return {
      value: null,
      confidence: consistency.confidence,
      state: "UNKNOWN",
      signals: {
        consistencyRatio,
        attendanceRatio: attendance.value,
        longestMissCluster: patternSignals.longestMissCluster,
        recentDirection: consistency.recentDirection,
        volatility,
      },
    };
  }

  const clusterPenalty = Math.min(patternSignals.longestMissCluster * 0.08, 0.28);
  const volatilityPenalty = volatility === null ? 0 : Math.min(volatility * 0.2, 0.2);
  const value = round(
    clamp(
      consistencyRatio * 0.6 + attendance.value * 0.4 - clusterPenalty - volatilityPenalty,
    ),
  );
  const confidence = round(
    clamp((consistency.confidence + attendance.confidence) / 2),
  );

  return {
    value,
    confidence,
    state: resolveReliabilityState(value, confidence, consistency.recentDirection),
    signals: {
      consistencyRatio,
      attendanceRatio: attendance.value,
      longestMissCluster: patternSignals.longestMissCluster,
      recentDirection: consistency.recentDirection,
      volatility,
    },
  };
}

function resolveReliabilityState(
  value: number,
  confidence: number,
  recentDirection: ConsistencySummary["recentDirection"],
): ReliabilityState {
  if (confidence < 0.35) {
    return "UNKNOWN";
  }

  if (recentDirection === "STRONGLY_DECLINING" && value < 0.75) {
    return "DETERIORATING";
  }

  if (recentDirection === "DECLINING" && value < 0.65) {
    return "REBUILDING";
  }

  if (value >= 0.9 && confidence >= 0.75) {
    return "HIGHLY_RELIABLE";
  }

  if (value >= 0.72) {
    return "RELIABLE";
  }

  if (value >= 0.5) {
    return "DEVELOPING";
  }

  return "UNSTABLE";
}
