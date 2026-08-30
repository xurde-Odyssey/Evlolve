import {
  clamp,
  median,
  robustCenter,
  robustVolatility,
  round,
  splitHalfComparison,
} from "../internal/statistics";
import type {
  ActivityBaseline,
  ActivityExecutionEvidence,
  BaselineState,
  CapabilityPolicy,
  CapabilitySummary,
  DirectionSignal,
} from "../types";

const defaultCapabilityPolicy = {
  type: "QUANTITATIVE",
  sampleWindow: 30,
  recentWindow: 5,
} satisfies CapabilityPolicy;

export function estimateCapability(
  evidence: readonly ActivityExecutionEvidence[],
  options: {
    activityId: string;
    policy?: CapabilityPolicy;
    previousBaseline?: ActivityBaseline | CapabilitySummary;
  },
): CapabilitySummary {
  const policy = options.policy ?? defaultCapabilityPolicy;
  const ordered = [...evidence]
    .filter((item) => item.activityId === options.activityId)
    .sort((a, b) =>
      (a.occurredAt ?? a.scheduledFor ?? "").localeCompare(
        b.occurredAt ?? b.scheduledFor ?? "",
      )
    );
  const samples = extractCapabilitySamples(ordered).slice(
    -(policy.sampleWindow ?? defaultCapabilityPolicy.sampleWindow),
  );
  const qualifyingSampleCount = ordered.filter(
    (item) =>
      item.executionState === "FULL" ||
      item.executionState === "QUALIFYING_PARTIAL",
  ).length;
  const recentSamples = samples.slice(-(policy.recentWindow ?? 5));
  const establishedSamples =
    samples.length > recentSamples.length
      ? samples.slice(0, samples.length - recentSamples.length)
      : samples;
  const sustainable = robustCenter(samples);
  const established = robustCenter(establishedSamples);
  const recent = robustCenter(recentSamples);
  const peak = samples.length === 0 ? null : Math.max(...samples);
  const confidence = estimateCapabilityConfidence(samples.length, qualifyingSampleCount);
  const momentum = deriveMomentum(samples);
  const previousEstablished = extractPreviousEstablished(options.previousBaseline);

  return {
    activityId: options.activityId,
    policyType: policy.type,
    sustainableCapability: {
      value: sustainable === null ? null : round(sustainable),
      confidence,
    },
    peakCapability: {
      value: peak === null ? null : round(peak),
      confidence: peak === null ? 0 : confidence,
    },
    recentCapability: {
      value: recent === null ? null : round(recent),
      confidence: estimateCapabilityConfidence(
        recentSamples.length,
        Math.min(recentSamples.length, qualifyingSampleCount),
      ),
    },
    establishedCapability: {
      value: established === null ? null : round(established),
      confidence,
    },
    confidence,
    volatility: robustVolatility(samples),
    momentum,
    direction: momentum,
    sampleCount: samples.length,
    qualifyingSampleCount,
    baselineState: resolveCapabilityBaselineState({
      sampleCount: samples.length,
      qualifyingSampleCount,
      previousEstablished,
      recent,
      sustainable,
      confidence,
    }),
  };
}

function extractCapabilitySamples(evidence: readonly ActivityExecutionEvidence[]) {
  return evidence
    .filter((item) =>
      item.executionState === "FULL" ||
      item.executionState === "QUALIFYING_PARTIAL" ||
      item.executionState === "ATTEMPT"
    )
    .map((item) => item.actualValue)
    .filter((value): value is number => value !== undefined && value > 0);
}

function estimateCapabilityConfidence(sampleCount: number, qualifyingSampleCount: number) {
  if (sampleCount === 0) {
    return 0;
  }

  return round(clamp(sampleCount / 14 * 0.55 + qualifyingSampleCount / 10 * 0.45));
}

function deriveMomentum(samples: readonly number[]): DirectionSignal {
  const comparison = splitHalfComparison(samples);

  if (comparison === null || samples.length < 6) {
    return "UNKNOWN";
  }

  const change = comparison.relativeChange;

  if (change <= -0.25 && samples.length >= 8) {
    return "STRONGLY_DECLINING";
  }

  if (change <= -0.1) {
    return "DECLINING";
  }

  if (change >= 0.25 && samples.length >= 8) {
    return "STRONGLY_IMPROVING";
  }

  if (change >= 0.1) {
    return "IMPROVING";
  }

  return "STABLE";
}

function resolveCapabilityBaselineState({
  sampleCount,
  qualifyingSampleCount,
  previousEstablished,
  recent,
  sustainable,
  confidence,
}: {
  sampleCount: number;
  qualifyingSampleCount: number;
  previousEstablished: number | null;
  recent: number | null;
  sustainable: number | null;
  confidence: number;
}): BaselineState {
  if (sampleCount === 0) {
    return "NEW";
  }

  if (previousEstablished !== null && recent !== null) {
    const divergence = (recent - previousEstablished) / Math.abs(previousEstablished);
    if (divergence <= -0.18 && sampleCount >= 6) {
      return "REBUILDING";
    }
  }

  if (
    sampleCount >= 8 &&
    qualifyingSampleCount >= 6 &&
    confidence >= 0.65 &&
    sustainable !== null
  ) {
    return "ESTABLISHED";
  }

  return "BUILDING";
}

function extractPreviousEstablished(
  baseline: ActivityBaseline | CapabilitySummary | undefined,
) {
  if (!baseline) {
    return null;
  }

  if ("establishedCapability" in baseline) {
    return baseline.establishedCapability.value;
  }

  return baseline.sustainableCapability.value;
}

export function estimateRobustCenter(values: readonly number[]) {
  return robustCenter(values);
}

export function estimateMedian(values: readonly number[]) {
  return median(values);
}
