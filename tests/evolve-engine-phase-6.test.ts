import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeAdaptiveIntelligence,
  buildActivityDevelopmentState,
  classifyExecution,
  developmentDomainForActivity,
  detectBreakthrough,
  detectStagnation,
  isSupportingHealthSignal,
} from "../src/domain/evolve-engine";

const now = "2026-08-30T12:00:00.000Z";

function stableRunningState() {
  const evidence = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 7, 2 + index, 9)).toISOString();
    return classifyExecution({
      id: `running-${index}`,
      activityId: "running",
      scheduledFor: date,
      occurredAt: date,
      targetValue: 4,
      actualValue: 4,
      unit: "km",
      requirementState: "REQUIRED",
      deadlineState: "ON_TIME",
      createdAt: date,
    });
  });

  return buildActivityDevelopmentState(evidence, {
    activityId: "running",
    anchorDate: now,
    currentTargetValue: 4,
  });
}

describe("Phase 6 adaptive intelligence", () => {
  it("keeps activity taxonomy separate from supporting health signals", () => {
    assert.equal(developmentDomainForActivity("reading"), "KNOWLEDGE");
    assert.equal(developmentDomainForActivity("coding"), "SKILL_DEVELOPMENT");
    assert.equal(isSupportingHealthSignal("sleep"), true);
    assert.equal(isSupportingHealthSignal("water"), true);
    assert.equal(isSupportingHealthSignal("running"), false);
  });

  it("returns no intervention for a user without evidence", () => {
    const result = analyzeAdaptiveIntelligence({
      activityStates: [],
      evidence: [],
      commitments: [],
      now,
    });

    assert.equal(result.noIntervention, true);
    assert.equal(result.analysis.primaryConstraint, null);
    assert.equal(result.model.activities.length, 0);
  });

  it("does not call stable threshold execution a breakthrough", () => {
    const state = stableRunningState();
    assert.equal(detectBreakthrough(state).detected, false);
    assert.equal(detectStagnation(state).detected, false);
  });

  it("derives a personal model and frontier from real activity state", () => {
    const state = stableRunningState();
    const result = analyzeAdaptiveIntelligence({
      activityStates: [state],
      evidence: [],
      commitments: [{ id: "commitment:running", activityKey: "running", tier: "core" }],
      now,
    });

    assert.equal(result.model.activities[0]?.domain, "PHYSICAL_TRAINING");
    assert.equal(result.frontiers[0]?.activityId, "running");
    assert.equal(result.frontiers[0]?.sustainableValue, 4);
  });
});
