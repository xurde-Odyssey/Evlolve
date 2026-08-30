import type {
  ActivityBaseline,
  BaselineEstimator,
  BaselineEstimatorInput,
  BaselineState,
} from "@/domain/evolve-engine/types";

export class RobustBaselineEstimator implements BaselineEstimator {
  estimate(input: BaselineEstimatorInput): ActivityBaseline {
    const samples = input.evidence
      .filter((item) =>
        item.executionState === "FULL" ||
        item.executionState === "QUALIFYING_PARTIAL" ||
        item.executionState === "ATTEMPT"
      )
      .map((item) => item.actualValue)
      .filter((value): value is number => value !== undefined && value > 0)
      .sort((a, b) => a - b);

    const qualifyingSamples = input.evidence.filter(
      (item) =>
        item.executionState === "FULL" ||
        item.executionState === "QUALIFYING_PARTIAL",
    );
    const peak = samples.length === 0 ? null : samples[samples.length - 1] ?? null;
    const sustainable = estimateSustainableCapability(samples);
    const confidence = estimateConfidence(samples.length, qualifyingSamples.length);

    return {
      activityId: input.activityId,
      baselineState: resolveBaselineState(samples.length, qualifyingSamples.length),
      sustainableCapability: {
        value: sustainable,
        confidence,
      },
      peakCapability: {
        value: peak,
        confidence: peak === null ? 0 : confidence,
      },
      confidence,
      volatility: estimateVolatility(samples),
      momentum: estimateMomentum(input.evidence),
      sampleCount: samples.length,
      qualifyingSampleCount: qualifyingSamples.length,
      lastUpdatedAt: input.now ?? new Date().toISOString(),
    };
  }
}

export const robustBaselineEstimator = new RobustBaselineEstimator();

function estimateSustainableCapability(samples: readonly number[]) {
  if (samples.length === 0) {
    return null;
  }

  if (samples.length < 4) {
    return median(samples);
  }

  const trimmed = samples.slice(1, -1);
  const trimmedAverage =
    trimmed.reduce((total, sample) => total + sample, 0) / trimmed.length;

  return (median(samples) + trimmedAverage) / 2;
}

function resolveBaselineState(
  sampleCount: number,
  qualifyingSampleCount: number,
): BaselineState {
  if (sampleCount === 0) {
    return "NEW";
  }

  if (sampleCount < 6 || qualifyingSampleCount < 4) {
    return "BUILDING";
  }

  return "ESTABLISHED";
}

function estimateConfidence(sampleCount: number, qualifyingSampleCount: number) {
  if (sampleCount === 0) {
    return 0;
  }

  const sampleConfidence = Math.min(sampleCount / 12, 1);
  const qualifyingConfidence = Math.min(qualifyingSampleCount / 8, 1);

  return round((sampleConfidence + qualifyingConfidence) / 2, 3);
}

function estimateVolatility(samples: readonly number[]) {
  if (samples.length < 2) {
    return null;
  }

  const average = samples.reduce((total, sample) => total + sample, 0) / samples.length;
  const variance =
    samples.reduce((total, sample) => total + (sample - average) ** 2, 0) /
    samples.length;

  return average === 0 ? null : round(Math.sqrt(variance) / average, 3);
}

function estimateMomentum(evidence: readonly BaselineEstimatorInput["evidence"][number][]) {
  const ordered = [...evidence]
    .filter((item) => item.actualValue !== undefined)
    .sort((a, b) =>
      (a.occurredAt ?? a.scheduledFor ?? "").localeCompare(
        b.occurredAt ?? b.scheduledFor ?? "",
      )
    );

  if (ordered.length < 4) {
    return null;
  }

  const midpoint = Math.floor(ordered.length / 2);
  const first = averageDefined(ordered.slice(0, midpoint));
  const second = averageDefined(ordered.slice(midpoint));

  if (first === null || second === null || first === 0) {
    return null;
  }

  return round((second - first) / first, 3);
}

function averageDefined(evidence: readonly BaselineEstimatorInput["evidence"][number][]) {
  const values = evidence
    .map((item) => item.actualValue)
    .filter((value): value is number => value !== undefined);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(samples: readonly number[]) {
  const midpoint = Math.floor(samples.length / 2);

  if (samples.length % 2 === 1) {
    return samples[midpoint] ?? 0;
  }

  return ((samples[midpoint - 1] ?? 0) + (samples[midpoint] ?? 0)) / 2;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}
