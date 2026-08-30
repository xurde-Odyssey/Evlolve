import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateWeeklyEvidence,
  appendTargetHistoryRecord,
  classifyExecution,
  deriveConsistencyContribution,
  robustBaselineEstimator,
  type ActivityExecutionEvidence,
  type TargetHistoryRecord,
} from "../src/domain/evolve-engine/index";

function evidence(
  overrides: Partial<Parameters<typeof classifyExecution>[0]> = {},
): ActivityExecutionEvidence {
  return classifyExecution({
    id: "evidence",
    activityId: "running",
    occurredAt: "2026-08-24T12:00:00.000Z",
    scheduledFor: "2026-08-24T00:00:00.000Z",
    targetValue: 4,
    actualValue: 4,
    unit: "km",
    requirementState: "REQUIRED",
    deadlineState: "ON_TIME",
    createdAt: "2026-08-24T12:00:00.000Z",
    ...overrides,
  });
}

describe("execution classification", () => {
  it("classifies 4 km target and 4 km actual as full execution", () => {
    const result = evidence();

    assert.equal(result.executionState, "FULL");
    assert.equal(result.rawCompletionRatio, 1);
    assert.equal(result.commitmentFulfillment, 1);
  });

  it("preserves 200% raw output while capping fulfillment at 100%", () => {
    const result = evidence({ actualValue: 8 });

    assert.equal(result.executionState, "FULL");
    assert.equal(result.rawCompletionRatio, 2);
    assert.equal(result.commitmentFulfillment, 1);
  });

  it("gives legitimate partial execution proportional consistency contribution", () => {
    const result = evidence({ actualValue: 2.4 });
    const contribution = deriveConsistencyContribution(result);

    assert.equal(result.executionState, "QUALIFYING_PARTIAL");
    assert.equal(contribution.includedInDenominator, true);
    assert.equal(contribution.contribution, 0.6);
  });

  it("does not give completion consistency credit to an attempt", () => {
    const result = evidence({ actualValue: 0.4 });
    const contribution = deriveConsistencyContribution(result);

    assert.equal(result.executionState, "ATTEMPT");
    assert.equal(contribution.contribution, 0);
  });

  it("keeps a missed requirement missed even when another day has excess output", () => {
    const missed = evidence({
      id: "missed",
      actualValue: undefined,
      requirementState: "MISSED",
      scheduledFor: "2026-08-24T00:00:00.000Z",
    });
    const excess = evidence({
      id: "excess",
      actualValue: 8,
      scheduledFor: "2026-08-25T00:00:00.000Z",
    });
    const weekly = aggregateWeeklyEvidence([missed, excess], "2026-08-26T00:00:00.000Z");

    assert.equal(weekly.missedCount, 1);
    assert.equal(weekly.fullCount, 1);
    assert.equal(weekly.eligibleRequirements, 2);
    assert.equal(weekly.consistencyPercentage, 50);
  });

  it("excludes approved exclusions from success counts and eligible denominator", () => {
    const excluded = evidence({
      id: "rest",
      actualValue: undefined,
      requirementState: "EXCLUDED",
      exclusionState: "SCHEDULED_REST",
    });
    const contribution = deriveConsistencyContribution(excluded);

    assert.equal(excluded.executionState, "EXCLUDED");
    assert.equal(contribution.includedInDenominator, false);
    assert.equal(contribution.contribution, 0);
  });

  it("preserves no-requirement as distinct from missed", () => {
    const noRequirement = evidence({
      id: "rest-day",
      actualValue: undefined,
      requirementState: "NO_REQUIREMENT",
      exclusionState: "NONE",
    });

    assert.equal(noRequirement.requirementState, "NO_REQUIREMENT");
    assert.notEqual(noRequirement.executionState, "MISSED");
  });
});

describe("baseline estimation", () => {
  it("does not let one extreme performance immediately redefine sustainable capability", () => {
    const samples = [
      evidence({ id: "run-1", actualValue: 4 }),
      evidence({ id: "run-2", actualValue: 4 }),
      evidence({ id: "run-3", actualValue: 4 }),
      evidence({ id: "run-4", actualValue: 20 }),
    ];
    const baseline = robustBaselineEstimator.estimate({
      activityId: "running",
      evidence: samples,
      now: "2026-08-30T00:00:00.000Z",
    });

    assert.equal(baseline.peakCapability.value, 20);
    assert.ok((baseline.sustainableCapability.value ?? 0) < 10);
  });

  it("allows peak capability to increase independently from sustainable capability", () => {
    const prior = robustBaselineEstimator.estimate({
      activityId: "running",
      evidence: [
        evidence({ id: "run-1", actualValue: 4 }),
        evidence({ id: "run-2", actualValue: 4 }),
        evidence({ id: "run-3", actualValue: 4 }),
      ],
      now: "2026-08-29T00:00:00.000Z",
    });
    const next = robustBaselineEstimator.estimate({
      activityId: "running",
      evidence: [
        evidence({ id: "run-1", actualValue: 4 }),
        evidence({ id: "run-2", actualValue: 4 }),
        evidence({ id: "run-3", actualValue: 4 }),
        evidence({ id: "run-4", actualValue: 20 }),
      ],
      now: "2026-08-30T00:00:00.000Z",
    });

    assert.equal(prior.peakCapability.value, 4);
    assert.equal(next.peakCapability.value, 20);
    assert.equal(next.sustainableCapability.value, prior.sustainableCapability.value);
  });
});

describe("aggregation", () => {
  it("uses Sunday-to-Saturday weekly windows", () => {
    const sunday = evidence({
      id: "sunday",
      scheduledFor: "2026-08-23T00:00:00.000Z",
    });
    const saturday = evidence({
      id: "saturday",
      scheduledFor: "2026-08-29T23:00:00.000Z",
    });
    const nextSunday = evidence({
      id: "next-sunday",
      scheduledFor: "2026-08-30T00:00:00.000Z",
    });
    const weekly = aggregateWeeklyEvidence(
      [sunday, saturday, nextSunday],
      "2026-08-26T00:00:00.000Z",
    );

    assert.equal(weekly.eligibleRequirements, 2);
    assert.equal(weekly.periodStart, "2026-08-23T00:00:00.000Z");
    assert.equal(weekly.periodEnd, "2026-08-30T00:00:00.000Z");
  });

  it("does not mutate raw evidence during aggregation", () => {
    const raw = [evidence({ id: "raw", actualValue: 8 })];
    const before = structuredClone(raw);

    aggregateWeeklyEvidence(raw, "2026-08-26T00:00:00.000Z");

    assert.deepEqual(raw, before);
  });
});

describe("target history", () => {
  it("preserves historical target records after target changes", () => {
    const initial: TargetHistoryRecord = {
      id: "target-1",
      activityId: "running",
      targetValue: 4,
      unit: "km",
      effectiveFrom: "2026-08-01T00:00:00.000Z",
      reason: "INITIAL",
      createdAt: "2026-08-01T00:00:00.000Z",
    };
    const next: TargetHistoryRecord = {
      id: "target-2",
      activityId: "running",
      previousTargetValue: 4,
      targetValue: 5,
      unit: "km",
      effectiveFrom: "2026-08-20T00:00:00.000Z",
      reason: "SYSTEM_RECOMMENDATION",
      recommendationRef: "recommendation-running-august",
      userDecision: "PENDING",
      createdAt: "2026-08-18T00:00:00.000Z",
    };
    const history = appendTargetHistoryRecord([initial], next);

    assert.equal(history.length, 2);
    assert.equal(history[0]?.targetValue, 4);
    assert.equal(history[1]?.targetValue, 5);
    assert.equal(history[1]?.previousTargetValue, 4);
  });
});
