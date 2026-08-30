import { aggregateEvidence } from "../aggregation/aggregate";
import { buildActivityConsistencyProfile } from "../consistency/summary";
import { classifyPerformanceGap } from "../gap/classifier";
import { summarizeAttendance } from "../reliability/attendance";
import { evaluateReliability } from "../reliability/reliability";
import { deriveTargetRelationship } from "../target/relationship";
import { estimateCapability } from "../capability/estimator";
import type {
  ActivityDevelopmentState,
  ActivityExecutionEvidence,
  ActivityBaseline,
  CapabilityPolicy,
  CapabilitySummary,
} from "../types";

export function buildActivityDevelopmentState(
  evidence: readonly ActivityExecutionEvidence[],
  options: {
    activityId: string;
    anchorDate: string;
    currentTargetValue?: number;
    capabilityPolicy?: CapabilityPolicy;
    previousBaseline?: ActivityBaseline | CapabilitySummary;
  },
): ActivityDevelopmentState {
  const activityEvidence = evidence.filter(
    (item) => item.activityId === options.activityId,
  );
  const consistencyProfile = buildActivityConsistencyProfile(
    activityEvidence,
    options.activityId,
    options.anchorDate,
  );
  const capability = estimateCapability(activityEvidence, {
    activityId: options.activityId,
    policy: options.capabilityPolicy,
    previousBaseline: options.previousBaseline,
  });
  const attendance = summarizeAttendance(activityEvidence);
  const reliability = evaluateReliability(
    consistencyProfile.rollingRecent,
    activityEvidence,
    capability.volatility,
  );
  const targetRelationship = deriveTargetRelationship(
    capability,
    options.currentTargetValue,
  );

  return {
    activityId: options.activityId,
    executionSummary: aggregateEvidence(activityEvidence, "", ""),
    consistency: {
      value: consistencyProfile.rollingRecent.consistencyRatio,
      confidence: consistencyProfile.rollingRecent.confidence,
      direction: consistencyProfile.rollingRecent.recentDirection,
      profile: consistencyProfile,
    },
    reliability,
    attendance,
    capability,
    targetRelationship,
    gapClassification: classifyPerformanceGap({
      attendance,
      capability,
      consistency: consistencyProfile.rollingRecent,
      reliability,
      targetRelationship,
    }),
    updatedAt: options.anchorDate,
  };
}
