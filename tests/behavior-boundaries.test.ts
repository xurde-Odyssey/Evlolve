import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveBehaviorBoundaryState,
  evaluateBehaviorBoundary,
  type BehaviorBoundary,
  type BehaviorOccurrence,
} from "../src/domain/evolve-engine/index";

function boundary(overrides: Partial<BehaviorBoundary> = {}): BehaviorBoundary {
  return {
    id: "boundary:drinking:1",
    userId: "user-1",
    behaviorType: "DRINKING",
    label: "Drinking",
    category: "RESTRICTED",
    intent: "REDUCE",
    mode: "WEEKLY_CAP",
    limitConfig: { cap: 1, period: "WEEK" },
    status: "ACTIVE",
    startedAt: "2026-09-01T00:00:00.000Z",
    version: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function occurrence(id: string, occurredAt: string, behaviorType: BehaviorOccurrence["behaviorType"] = "DRINKING"): BehaviorOccurrence {
  return {
    id,
    behaviorType,
    category: behaviorType === "SOCIAL_OUTING" ? "CONTEXTUAL" : "RESTRICTED",
    occurredAt,
    source: "MANUAL",
    status: "ACTIVE",
    boundaryId: `boundary:${behaviorType.toLowerCase()}:1`,
    createdAt: occurredAt,
  };
}

test("weekly cap distinguishes within-limit and violation", () => {
  const rule = boundary();
  const first = occurrence("one", "2026-09-04T18:00:00.000Z");
  const second = occurrence("two", "2026-09-05T18:00:00.000Z");

  assert.equal(evaluateBehaviorBoundary({ boundary: rule, occurrences: [first], occurredAt: first.occurredAt }).status, "APPROACHING_LIMIT");
  assert.equal(evaluateBehaviorBoundary({ boundary: rule, occurrences: [first, second], occurredAt: second.occurredAt }).status, "VIOLATED");
});

test("zero-tolerance smoking violation resets the boundary streak without deleting history", () => {
  const rule = boundary({
    id: "boundary:smoking:1",
    behaviorType: "SMOKING",
    label: "Smoking",
    intent: "QUIT",
    mode: "ZERO_TOLERANCE",
    limitConfig: {},
  });
  const event = occurrence("smoke", "2026-09-04T18:00:00.000Z", "SMOKING");
  const evaluation = evaluateBehaviorBoundary({ boundary: rule, occurrences: [event], occurredAt: event.occurredAt });
  const state = deriveBehaviorBoundaryState({ boundary: rule, occurrences: [{ ...event, evaluation }], now: "2026-09-05T18:00:00.000Z" });

  assert.equal(evaluation.status, "VIOLATED");
  assert.equal(state.currentStreak, 1);
  assert.equal(state.recentViolations, 1);
});

test("context-only social outings never become boundary violations", () => {
  const rule = boundary({
    id: "boundary:social:1",
    behaviorType: "SOCIAL_OUTING",
    label: "Social Outing",
    category: "CONTEXTUAL",
    intent: "CONTEXT_ONLY",
    mode: "CONTEXT_ONLY",
    limitConfig: {},
  });
  const event = occurrence("outing", "2026-09-04T18:00:00.000Z", "SOCIAL_OUTING");

  assert.equal(evaluateBehaviorBoundary({ boundary: rule, occurrences: [event], occurredAt: event.occurredAt }).status, "NO_ACTIVE_BOUNDARY");
});

test("corrected behavior is excluded from current usage", () => {
  const rule = boundary();
  const event = { ...occurrence("one", "2026-09-04T18:00:00.000Z"), status: "CORRECTED" as const };

  assert.equal(evaluateBehaviorBoundary({ boundary: rule, occurrences: [event], occurredAt: event.occurredAt }).usage, 0);
});
