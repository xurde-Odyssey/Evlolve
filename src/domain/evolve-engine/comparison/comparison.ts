import { clamp, round } from "../internal/statistics";
import type { PeriodComparisonResult } from "../types";

export function comparePeriods(
  previous: number | null,
  current: number | null,
  options: { minConfidence?: number; tolerance?: number } = {},
): PeriodComparisonResult {
  const minConfidence = options.minConfidence ?? 0.5;
  const tolerance = options.tolerance ?? 0.03;

  if (previous === null || current === null) {
    return {
      previous,
      current,
      absoluteChange: null,
      relativeChange: null,
      direction: "INSUFFICIENT_EVIDENCE",
      confidence: 0,
    };
  }

  const absoluteChange = current - previous;
  const relativeChange = previous === 0 ? null : absoluteChange / Math.abs(previous);
  const magnitude = Math.abs(relativeChange ?? absoluteChange);
  const confidence = round(clamp(Math.max(magnitude, minConfidence)));

  return {
    previous,
    current,
    absoluteChange: round(absoluteChange),
    relativeChange: relativeChange === null ? null : round(relativeChange),
    direction:
      Math.abs(absoluteChange) <= tolerance
        ? "STABLE"
        : absoluteChange > 0
          ? "IMPROVING"
          : "DECLINING",
    confidence,
  };
}
