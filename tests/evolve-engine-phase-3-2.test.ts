import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildActivityDevelopmentState,
  classifyExecution,
  comparePeriods,
  deriveTargetRelationship,
  estimateCapability,
  evaluateReliability,
  summarizeAttendance,
  summarizeConsistency,
  type ActivityBaseline,
  type ActivityExecutionEvidence,
  type ExecutionState,
} from "../src/domain/evolve-engine/index";

const anchorDate = "2026-08-30T00:00:00.000Z";

function execution(
  index: number,
  options: {
    actualValue?: number;
    targetValue?: number;
    activityId?: string;
    executionState?: ExecutionState;
    excluded?: boolean;
  } = {},
): ActivityExecutionEvidence {
  const scheduledFor = new Date(Date.UTC(2026, 7, 2 + index)).toISOString();

  if (options.executionState === "MISSED") {
    return classifyExecution({
      id: `evidence-${index}`,
      activityId: options.activityId ?? "running",
      scheduledFor,
      targetValue: options.targetValue ?? 5,
      actualValue: undefined,
      unit: "km",
      requirementState: "MISSED",
      deadlineState: "ON_TIME",
      createdAt: scheduledFor,
    });
  }

  if (options.excluded) {
    return classifyExecution({
      id: `evidence-${index}`,
      activityId: options.activityId ?? "running",
      scheduledFor,
      targetValue: options.targetValue ?? 5,
      actualValue: undefined,
      unit: "km",
      requirementState: "EXCLUDED",
      exclusionState: "SCHEDULED_REST",
      deadlineState: "NO_DEADLINE",
      createdAt: scheduledFor,
    });
  }

  return classifyExecution({
    id: `evidence-${index}`,
    activityId: options.activityId ?? "running",
    occurredAt: scheduledFor,
    scheduledFor,
    targetValue: options.targetValue ?? 5,
    actualValue: options.actualValue ?? 5,
    unit: "km",
    requirementState: "REQUIRED",
    deadlineState: "ON_TIME",
    createdAt: scheduledFor,
  });
}

function series(values: readonly (number | "missed" | "excluded")[]) {
  return values.map((value, index) => {
    if (value === "missed") {
      return execution(index, { executionState: "MISSED" });
    }

    if (value === "excluded") {
      return execution(index, { excluded: true });
    }

    return execution(index, { actualValue: value });
  });
}

function consistency(evidence: readonly ActivityExecutionEvidence[]) {
  return summarizeConsistency(evidence, {
    activityId: "running",
    periodLabel: "test",
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: "2026-09-01T00:00:00.000Z",
  });
}

describe("capability estimation", () => {
  it("creates sustainable capability close to repeated stable performance", () => {
    const capability = estimateCapability(series([5, 5.1, 4.9, 5, 5.1, 4.9, 5, 5]), {
      activityId: "running",
    });

    assert.equal(capability.baselineState, "ESTABLISHED");
    assert.ok(Math.abs((capability.sustainableCapability.value ?? 0) - 5) < 0.15);
  });

  it("limits one outlier while preserving peak capability", () => {
    const capability = estimateCapability(series([4, 4.2, 4.1, 4.3, 8]), {
      activityId: "running",
    });

    assert.equal(capability.peakCapability.value, 8);
    assert.ok((capability.sustainableCapability.value ?? 0) < 5);
  });

  it("moves sustainable capability upward after repeated higher performances", () => {
    const before = estimateCapability(series([4, 4, 4, 4, 4, 4, 4, 4]), {
      activityId: "running",
    });
    const after = estimateCapability(series([4, 4, 4, 4, 5.4, 5.5, 5.6, 5.5, 5.4, 5.6]), {
      activityId: "running",
    });

    assert.ok((after.sustainableCapability.value ?? 0) > (before.sustainableCapability.value ?? 0));
  });

  it("creates rebuilding evidence after repeated lower performances from an established baseline", () => {
    const previousBaseline = {
      activityId: "running",
      baselineState: "ESTABLISHED",
      sustainableCapability: { value: 5, confidence: 0.9 },
      peakCapability: { value: 6, confidence: 0.9 },
      confidence: 0.9,
      volatility: 0.05,
      momentum: 0,
      sampleCount: 20,
      qualifyingSampleCount: 18,
      lastUpdatedAt: "2026-08-01T00:00:00.000Z",
    } satisfies ActivityBaseline;
    const capability = estimateCapability(
      series([5, 5, 5, 5, 5, 3.6, 3.5, 3.7, 3.6, 3.5]),
      {
        activityId: "running",
        previousBaseline,
      },
    );

    assert.equal(capability.baselineState, "REBUILDING");
    assert.ok(
      capability.momentum === "DECLINING" ||
        capability.momentum === "STRONGLY_DECLINING",
    );
  });

  it("does not trigger rebuilding from one poor execution", () => {
    const previousBaseline = {
      activityId: "running",
      baselineState: "ESTABLISHED",
      sustainableCapability: { value: 5, confidence: 0.9 },
      peakCapability: { value: 6, confidence: 0.9 },
      confidence: 0.9,
      volatility: 0.05,
      momentum: 0,
      sampleCount: 20,
      qualifyingSampleCount: 18,
      lastUpdatedAt: "2026-08-01T00:00:00.000Z",
    } satisfies ActivityBaseline;
    const capability = estimateCapability(series([5, 5, 5, 5, 5, 5, 5, 3]), {
      activityId: "running",
      previousBaseline,
    });

    assert.notEqual(capability.baselineState, "REBUILDING");
  });

  it("does not create strong positive momentum from one exceptional execution", () => {
    const capability = estimateCapability(series([4, 4, 4, 4, 4, 4, 4, 8]), {
      activityId: "running",
    });

    assert.notEqual(capability.momentum, "STRONGLY_IMPROVING");
  });

  it("reports lower volatility for stable output than highly variable output", () => {
    const stable = estimateCapability(series([4.8, 4.9, 4.7, 4.8, 4.9, 4.8]), {
      activityId: "running",
    });
    const variable = estimateCapability(series([2.5, 7, 3.2, 6.8, 4, 7.2]), {
      activityId: "running",
    });

    assert.ok((stable.volatility ?? 0) < (variable.volatility ?? 0));
  });
});

describe("consistency, attendance, reliability, and gaps", () => {
  it("keeps attempts as attendance evidence without consistency success credit", () => {
    const attempt = series([0.6]);
    const attendance = summarizeAttendance(attempt);
    const summary = consistency(attempt);

    assert.equal(summary.totalConsistencyCredit, 0);
    assert.ok((attendance.value ?? 0) > 0);
  });

  it("excludes approved opportunities from consistency denominator", () => {
    const summary = consistency(series([5, "excluded", "missed"]));

    assert.equal(summary.excluded, 1);
    assert.equal(summary.eligibleOpportunities, 2);
    assert.equal(summary.consistencyRatio, 0.5);
  });

  it("penalizes clustered misses more than isolated misses in reliability", () => {
    const clustered = series([5, 5, 5, "missed", "missed", 5, 5]);
    const isolated = series([5, "missed", 5, 5, "missed", 5, 5]);
    const clusteredReliability = evaluateReliability(consistency(clustered), clustered);
    const isolatedReliability = evaluateReliability(consistency(isolated), isolated);

    assert.ok((clusteredReliability.value ?? 0) < (isolatedReliability.value ?? 0));
  });

  it("classifies high attendance with repeated below-target output as capability gap", () => {
    const state = buildActivityDevelopmentState(series([4, 4.1, 4, 4.2, 4, 4.1, 4, 4]), {
      activityId: "running",
      anchorDate,
      currentTargetValue: 5,
    });

    assert.equal(state.gapClassification.classification, "CAPABILITY_GAP");
  });

  it("classifies proven capability with frequent misses as discipline gap", () => {
    const state = buildActivityDevelopmentState(
      series([5.2, 5.1, "missed", 5.2, "missed", 5.1, "missed", 5.2, "missed", 5.1]),
      {
        activityId: "running",
        anchorDate,
        currentTargetValue: 5,
      },
    );

    assert.equal(state.gapClassification.classification, "DISCIPLINE_GAP");
  });

  it("classifies weak attendance and weak output as mixed gap", () => {
    const state = buildActivityDevelopmentState(
      series([
        2,
        "missed",
        2.1,
        "missed",
        2,
        "missed",
        2.2,
        "missed",
        2,
        "missed",
        2.1,
        "missed",
        2,
        "missed",
        2.1,
        "missed",
        2.2,
        "missed",
        2,
        "missed",
      ]),
      {
        activityId: "running",
        anchorDate,
        currentTargetValue: 5,
      },
    );

    assert.equal(state.gapClassification.classification, "MIXED_GAP");
  });

  it("returns insufficient evidence for weak history", () => {
    const state = buildActivityDevelopmentState(series([5, "missed"]), {
      activityId: "running",
      anchorDate,
      currentTargetValue: 5,
    });

    assert.equal(state.gapClassification.classification, "INSUFFICIENT_EVIDENCE");
  });

  it("derives target relationship from sustainable capability without recommendations", () => {
    const capability = estimateCapability(series([5, 5.1, 5, 4.9, 5, 5, 5.1, 5]), {
      activityId: "running",
    });
    const relationship = deriveTargetRelationship(capability, 8);

    assert.equal(relationship.state, "POTENTIALLY_UNSUSTAINABLE");
  });

  it("does not mutate raw evidence while building development state", () => {
    const raw = series([5, 4, "missed", 6]);
    const before = structuredClone(raw);

    buildActivityDevelopmentState(raw, {
      activityId: "running",
      anchorDate,
      currentTargetValue: 5,
    });

    assert.deepEqual(raw, before);
  });
});

describe("period comparison", () => {
  it("identifies improvement, decline, and stable states", () => {
    assert.equal(comparePeriods(0.72, 0.84).direction, "IMPROVING");
    assert.equal(comparePeriods(0.84, 0.72).direction, "DECLINING");
    assert.equal(comparePeriods(0.8, 0.81, { tolerance: 0.02 }).direction, "STABLE");
  });
});
