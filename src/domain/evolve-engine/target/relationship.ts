import type {
  CapabilitySummary,
  TargetRelationshipResult,
} from "../types";

export function deriveTargetRelationship(
  capability: CapabilitySummary,
  targetValue: number | null | undefined,
): TargetRelationshipResult {
  const sustainable = capability.sustainableCapability.value;

  if (
    targetValue === null ||
    targetValue === undefined ||
    targetValue <= 0 ||
    sustainable === null ||
    capability.confidence < 0.35
  ) {
    return {
      state: "UNKNOWN",
      confidence: capability.confidence,
      evidence: ["Insufficient target or capability evidence."],
    };
  }

  const ratio = targetValue / sustainable;

  if (ratio <= 0.82 && capability.volatility !== null && capability.volatility <= 0.2) {
    return {
      state: "BELOW_CAPABILITY",
      confidence: capability.confidence,
      evidence: ["Target is below repeated sustainable output."],
    };
  }

  if (ratio <= 1.08) {
    return {
      state: "APPROPRIATE",
      confidence: capability.confidence,
      evidence: ["Target is close to demonstrated sustainable output."],
    };
  }

  if (ratio <= 1.35) {
    return {
      state: "CHALLENGING",
      confidence: capability.confidence,
      evidence: ["Target is above sustainable output but within challenge range."],
    };
  }

  return {
    state: "POTENTIALLY_UNSUSTAINABLE",
    confidence: capability.confidence,
    evidence: ["Target is materially above demonstrated sustainable output."],
  };
}
