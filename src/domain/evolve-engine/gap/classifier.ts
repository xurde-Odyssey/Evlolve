import type {
  AttendanceSummary,
  CapabilitySummary,
  ConsistencySummary,
  GapClassificationResult,
  ReliabilityResult,
  TargetRelationshipResult,
} from "../types";

export function classifyPerformanceGap({
  attendance,
  capability,
  consistency,
  reliability,
  targetRelationship,
}: {
  attendance: AttendanceSummary;
  capability: CapabilitySummary;
  consistency: ConsistencySummary;
  reliability: ReliabilityResult;
  targetRelationship: TargetRelationshipResult;
}): GapClassificationResult {
  if (
    consistency.eligibleOpportunities < 4 ||
    capability.confidence < 0.35 ||
    attendance.value === null ||
    consistency.consistencyRatio === null
  ) {
    return {
      classification: "INSUFFICIENT_EVIDENCE",
      confidence: Math.min(consistency.confidence, capability.confidence),
      supportingEvidence: ["Not enough execution and capability evidence."],
    };
  }

  const attendanceHigh = attendance.value >= 0.78;
  const attendanceWeak = attendance.value < 0.55;
  const consistencyWeak = consistency.consistencyRatio < 0.65;
  const capabilityBelowTarget =
    targetRelationship.state === "CHALLENGING" ||
    targetRelationship.state === "POTENTIALLY_UNSUSTAINABLE";
  const capabilityProven =
    targetRelationship.state === "APPROPRIATE" ||
    targetRelationship.state === "BELOW_CAPABILITY";

  if (attendanceHigh && capabilityBelowTarget) {
    return {
      classification: "CAPABILITY_GAP",
      confidence: combinedConfidence(consistency.confidence, capability.confidence),
      supportingEvidence: [
        "Attendance remains present.",
        "Output is repeatedly below the current target relationship.",
      ],
    };
  }

  if (capabilityProven && consistencyWeak && reliability.state !== "UNKNOWN") {
    return {
      classification: "DISCIPLINE_GAP",
      confidence: combinedConfidence(consistency.confidence, capability.confidence),
      supportingEvidence: [
        "Capability has been demonstrated.",
        "Required execution is not occurring reliably.",
      ],
    };
  }

  if (attendanceWeak && consistencyWeak && capabilityBelowTarget) {
    return {
      classification: "MIXED_GAP",
      confidence: combinedConfidence(consistency.confidence, capability.confidence),
      supportingEvidence: [
        "Attendance is weak.",
        "Output evidence is also below the target relationship.",
      ],
    };
  }

  return {
    classification: "NO_MEANINGFUL_GAP",
    confidence: combinedConfidence(consistency.confidence, capability.confidence),
    supportingEvidence: ["No strong discipline or capability gap is indicated."],
  };
}

function combinedConfidence(a: number, b: number) {
  return Math.round(Math.min(a, b) * 1000) / 1000;
}
