import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildActivityDevelopmentState,
  buildPillarStates,
  calculateLevelEstablishmentStrength,
  calculateProgressionRating,
  classifyExecution,
  deriveLevelMemory,
  evaluateLevelProgression,
  type ActivityDevelopmentState,
  type ActivityExecutionEvidence,
  type CoreWeaknessSignal,
  type HighestLevelRecord,
  type LevelCandidateState,
  type LevelRiskState,
  type MonthlyEvaluationRecord,
  type ProgressionRatingBreakdown,
  type RatingHistoryEntry,
} from "../src/domain/evolve-engine/index";

const now = "2026-08-30T00:00:00.000Z";

function evidence(activityId: string, value: number | "missed", index: number, target = 5): ActivityExecutionEvidence {
  const scheduledFor = new Date(Date.UTC(2026, 7, 1 + index)).toISOString();

  return classifyExecution({
    id: `${activityId}-${index}`,
    activityId,
    scheduledFor,
    occurredAt: value === "missed" ? undefined : scheduledFor,
    targetValue: target,
    actualValue: value === "missed" ? undefined : value,
    requirementState: value === "missed" ? "MISSED" : "REQUIRED",
    deadlineState: "ON_TIME",
    createdAt: scheduledFor,
    unit: "units",
  });
}

function state(activityId: string, values: readonly (number | "missed")[], target = 5): ActivityDevelopmentState {
  return buildActivityDevelopmentState(values.map((value, index) => evidence(activityId, value, index, target)), {
    activityId,
    anchorDate: now,
    currentTargetValue: target,
  });
}

function rating(overrides: Partial<ProgressionRatingBreakdown> = {}): ProgressionRatingBreakdown {
  return {
    disciplineContribution: 18,
    capabilityContribution: 18,
    healthContribution: 14,
    balanceContribution: 6,
    commitmentExecutionContribution: 14,
    progressionEvidenceContribution: 4,
    recoveryContribution: 0,
    coreWeaknessPressure: 0,
    behavioralFrictionPressure: 0,
    instabilityPressure: 0,
    rebuildingPressure: 0,
    confidence: 0.86,
    finalRating: 68,
    ...overrides,
  };
}

function highest(level: number, establishmentStrength = 0.75): HighestLevelRecord {
  return {
    level,
    firstReachedAt: "2026-01-01T00:00:00.000Z",
    lastReachedAt: "2026-04-01T00:00:00.000Z",
    establishmentStrength,
    durationMaintainedPeriods: 12,
    supportingEvidenceSummary: ["Established historical standard."],
  };
}

function monthly(
  outcome: MonthlyEvaluationRecord["outcome"],
  id: string = outcome,
): MonthlyEvaluationRecord {
  return {
    id,
    period: id,
    outcome,
    confidence: 0.9,
    evidenceRefs: [id],
  };
}

describe("progression rating", () => {
  it("does not use lifetime XP directly to calculate Current Level evidence", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 5]);
    const pillarStates = buildPillarStates([running]);
    const lowXp = calculateProgressionRating({
      activityStates: [running],
      pillarStates,
      lifetimeXp: 0,
    });
    const highXp = calculateProgressionRating({
      activityStates: [running],
      pillarStates,
      lifetimeXp: 1_000_000,
    });

    assert.equal(highXp.finalRating, lowXp.finalRating);
  });

  it("increases Progression Rating with strong repeated development", () => {
    const weak = state("running", [3, "missed", 3.1, "missed", 3, "missed", 3.2, "missed"]);
    const strong = state("running", [5.5, 5.4, 5.6, 5.5, 5.7, 5.6, 5.5, 5.6]);

    const weakRating = calculateProgressionRating({
      activityStates: [weak],
      pillarStates: buildPillarStates([weak]),
    });
    const strongRating = calculateProgressionRating({
      activityStates: [strong],
      pillarStates: buildPillarStates([strong]),
    });

    assert.ok(strongRating.finalRating > weakRating.finalRating);
  });

  it("keeps serious Core weakness pressure visible despite strong Running surplus", () => {
    const running = state("running", [8, 8, 8, 8, 8, 8, 8, 8]);
    const learningWeakness: CoreWeaknessSignal = {
      commitmentId: "core-learning",
      activityId: "reading",
      pillar: "CAPABILITY",
      severity: "HIGH",
      confidence: 0.9,
      persistence: 4,
      evidenceRefs: ["reading"],
    };
    const withoutWeakness = calculateProgressionRating({
      activityStates: [running],
      pillarStates: buildPillarStates([running]),
    });
    const withWeakness = calculateProgressionRating({
      activityStates: [running],
      pillarStates: buildPillarStates([running]),
      coreWeaknesses: [learningWeakness],
    });

    assert.ok(withWeakness.coreWeaknessPressure > 0);
    assert.ok(withWeakness.finalRating < withoutWeakness.finalRating);
  });

  it("shows diminishing contribution from excessive overperformance in one area", () => {
    const strong = state("running", [6, 6, 6, 6, 6, 6, 6, 6]);
    const excessive = state("running", [14, 14, 14, 14, 14, 14, 14, 14]);
    const strongRating = calculateProgressionRating({
      activityStates: [strong],
      pillarStates: buildPillarStates([strong]),
    });
    const excessiveRating = calculateProgressionRating({
      activityStates: [excessive],
      pillarStates: buildPillarStates([excessive]),
    });

    assert.ok(excessiveRating.finalRating - strongRating.finalRating < 12);
  });

  it("allows different legitimate development profiles to reach similar ratings", () => {
    const healthProfile = state("running", [6, 6, 6, 6, 6, 6, 6, 6]);
    const capabilityProfile = state("reading", [36, 36, 36, 36, 36, 36, 36, 36], 30);
    const healthRating = calculateProgressionRating({
      activityStates: [healthProfile],
      pillarStates: buildPillarStates([healthProfile]),
    });
    const capabilityRating = calculateProgressionRating({
      activityStates: [capabilityProfile],
      pillarStates: buildPillarStates([capabilityProfile]),
    });

    assert.ok(Math.abs(healthRating.finalRating - capabilityRating.finalRating) < 18);
  });

  it("keeps low-confidence evidence conservative", () => {
    const sparse = state("running", [10]);
    const sparseRating = calculateProgressionRating({
      activityStates: [sparse],
      pillarStates: buildPillarStates([sparse]),
    });

    assert.ok(sparseRating.confidence < 0.35);
    assert.ok(sparseRating.finalRating < 20);
  });

  it("uses monthly outcomes as progression evidence without calculating XP", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 5]);
    const base = calculateProgressionRating({
      activityStates: [running],
      pillarStates: buildPillarStates([running]),
      monthlyEvaluations: [monthly("FAIL", "july")],
    });
    const strong = calculateProgressionRating({
      activityStates: [running],
      pillarStates: buildPillarStates([running]),
      monthlyEvaluations: [monthly("STRONG_PASS", "july"), monthly("FULL_COMPLETION", "august")],
    });

    assert.ok(strong.progressionEvidenceContribution > base.progressionEvidenceContribution);
    assert.ok(strong.finalRating > base.finalRating);
  });
});

describe("candidate level and risk state machines", () => {
  it("turns a dramatic rating spike into a candidate, not an immediate large jump", () => {
    const result = evaluateLevelProgression({
      currentLevel: 10,
      highestLevel: highest(10),
      rating: rating({ finalRating: 95 }),
      now,
    });

    assert.equal(result.currentLevel, 10);
    assert.equal(result.candidate.candidateLevel, 11);
  });

  it("creates Candidate Level when rating crosses a threshold", () => {
    const result = evaluateLevelProgression({
      currentLevel: 20,
      highestLevel: highest(20),
      rating: rating({ finalRating: 75 }),
      now,
    });

    assert.equal(result.currentLevel, 20);
    assert.equal(result.candidate.status, "EMERGING");
  });

  it("confirms Candidate Level after sustained qualifying evidence", () => {
    const candidate: LevelCandidateState = {
      candidateLevel: 21,
      startedAt: "2026-08-01T00:00:00.000Z",
      evidenceStrength: 0.75,
      confidence: 0.86,
      qualifyingPeriods: 2,
      interruptions: 0,
      status: "CONFIRMING",
      evidenceRefs: [],
    };
    const result = evaluateLevelProgression({
      currentLevel: 20,
      highestLevel: highest(20),
      candidate,
      rating: rating({ finalRating: 75 }),
      monthlyEvaluations: [monthly("STRONG_PASS", "august")],
      now,
    });

    assert.equal(result.currentLevel, 21);
    assert.equal(result.events.some((event) => event.type === "LEVEL_CONFIRMED"), true);
  });

  it("tolerates temporary small rating fluctuation without destroying Candidate Level", () => {
    const candidate: LevelCandidateState = {
      candidateLevel: 21,
      startedAt: "2026-08-01T00:00:00.000Z",
      evidenceStrength: 0.7,
      confidence: 0.8,
      qualifyingPeriods: 1,
      interruptions: 0,
      status: "CONFIRMING",
      evidenceRefs: [],
    };
    const result = evaluateLevelProgression({
      currentLevel: 20,
      highestLevel: highest(20),
      candidate,
      rating: rating({ finalRating: 63.8 }),
      now,
    });

    assert.notEqual(result.candidate.status, "LOST");
  });

  it("cancels Candidate Level after sustained deterioration", () => {
    const candidate: LevelCandidateState = {
      candidateLevel: 21,
      startedAt: "2026-08-01T00:00:00.000Z",
      evidenceStrength: 0.7,
      confidence: 0.8,
      qualifyingPeriods: 1,
      interruptions: 1,
      status: "CONFIRMING",
      evidenceRefs: [],
    };
    const result = evaluateLevelProgression({
      currentLevel: 20,
      highestLevel: highest(20),
      candidate,
      rating: rating({ finalRating: 35 }),
      now,
    });

    assert.equal(result.candidate.status, "LOST");
  });

  it("does not demote from one bad week", () => {
    const result = evaluateLevelProgression({
      currentLevel: 25,
      highestLevel: highest(25),
      rating: rating({ finalRating: 35, confidence: 0.8 }),
      now,
    });

    assert.equal(result.currentLevel, 25);
    assert.notEqual(result.risk.status, "DEMOTED");
  });

  it("creates Level At Risk before confirmed demotion", () => {
    const result = evaluateLevelProgression({
      currentLevel: 25,
      highestLevel: highest(25),
      risk: risk({ evidencePeriods: 1 }),
      rating: rating({ finalRating: 35, confidence: 0.8 }),
      now,
    });

    assert.equal(result.view.state, "LEVEL_AT_RISK");
  });

  it("confirms demotion after sustained high-confidence deterioration", () => {
    const result = evaluateLevelProgression({
      currentLevel: 25,
      highestLevel: highest(25),
      risk: risk({ evidencePeriods: 2 }),
      rating: rating({ finalRating: 35, confidence: 0.85 }),
      now,
    });

    assert.ok(result.currentLevel < 25);
    assert.equal(result.events.some((event) => event.type === "LEVEL_DEMOTED"), true);
  });

  it("returns risk to SAFE when recovery happens before demotion confirmation", () => {
    const result = evaluateLevelProgression({
      currentLevel: 25,
      highestLevel: highest(25),
      risk: risk({ evidencePeriods: 1, status: "AT_RISK" }),
      rating: rating({ finalRating: 90, confidence: 0.85 }),
      now,
    });

    assert.equal(result.risk.status, "SAFE");
    assert.equal(result.events.some((event) => event.type === "LEVEL_RISK_RECOVERED"), true);
  });

  it("never reduces Highest Level", () => {
    const result = evaluateLevelProgression({
      currentLevel: 23,
      highestLevel: highest(40),
      rating: rating({ finalRating: 30, confidence: 0.85 }),
      now,
    });

    assert.equal(result.highestLevel.level, 40);
  });

  it("updates Highest Level when a confirmed level exceeds the previous frontier", () => {
    const candidate: LevelCandidateState = {
      candidateLevel: 21,
      startedAt: "2026-08-01T00:00:00.000Z",
      evidenceStrength: 0.8,
      confidence: 0.9,
      qualifyingPeriods: 2,
      interruptions: 0,
      status: "CONFIRMING",
      evidenceRefs: [],
    };
    const result = evaluateLevelProgression({
      currentLevel: 20,
      highestLevel: highest(20),
      candidate,
      rating: rating({ finalRating: 75, confidence: 0.9 }),
      monthlyEvaluations: [monthly("STRONG_PASS", "august")],
      now,
    });

    assert.equal(result.highestLevel.level, 21);
    assert.equal(result.events.some((event) => event.type === "HIGHEST_LEVEL_UPDATED"), true);
  });
});

describe("recovery memory and establishment", () => {
  it("gives stronger recovery advantage to established history than a briefly touched level", () => {
    const established = deriveLevelMemory({
      currentLevel: 21,
      highestLevel: highest(40, 0.9),
      rating: rating({ finalRating: 70, confidence: 0.85 }),
      collapseCount: 0,
    });
    const brief = deriveLevelMemory({
      currentLevel: 21,
      highestLevel: highest(40, 0.2),
      rating: rating({ finalRating: 70, confidence: 0.85 }),
      collapseCount: 0,
    });

    assert.ok(established.recoveryAdvantage > brief.recoveryAdvantage);
  });

  it("gives previously established users recovery advantage that first-time climbers do not have", () => {
    const recovering = deriveLevelMemory({
      currentLevel: 21,
      highestLevel: highest(40, 0.85),
      rating: rating({ finalRating: 70, confidence: 0.85 }),
      collapseCount: 0,
    });
    const firstTime = deriveLevelMemory({
      currentLevel: 21,
      highestLevel: highest(21, 0.85),
      rating: rating({ finalRating: 70, confidence: 0.85 }),
      collapseCount: 0,
    });

    assert.ok(recovering.recoveryAdvantage > firstTime.recoveryAdvantage);
    assert.equal(firstTime.recoveryAdvantage, 0);
  });

  it("ends recovery advantage at the previous Highest Level frontier", () => {
    const memory = deriveLevelMemory({
      currentLevel: 40,
      highestLevel: highest(40, 0.9),
      rating: rating({ finalRating: 90, confidence: 0.9 }),
      collapseCount: 0,
    });

    assert.equal(memory.recoveryAdvantage, 0);
    assert.equal(memory.recoveryState, "PREVIOUS_STANDARD_RESTORED");
  });

  it("weakens recovery advantage after repeated collapse", () => {
    const first = deriveLevelMemory({
      currentLevel: 22,
      highestLevel: highest(40, 0.9),
      rating: rating({ finalRating: 70, confidence: 0.85 }),
      collapseCount: 0,
    });
    const repeated = deriveLevelMemory({
      currentLevel: 22,
      highestLevel: highest(40, 0.9),
      rating: rating({ finalRating: 70, confidence: 0.85 }),
      collapseCount: 3,
    });

    assert.ok(first.recoveryAdvantage > repeated.recoveryAdvantage);
  });

  it("can rebuild establishment strength through stable recovery history", () => {
    const weakHistory = historyEntries(38, 2);
    const strongHistory = historyEntries(38, 14);
    const weak = calculateLevelEstablishmentStrength({
      level: 38,
      history: weakHistory,
      monthlyEvaluations: [monthly("PASS")],
    });
    const strong = calculateLevelEstablishmentStrength({
      level: 38,
      history: strongHistory,
      monthlyEvaluations: [monthly("STRONG_PASS"), monthly("FULL_COMPLETION")],
    });

    assert.ok(strong.value > weak.value);
  });
});

describe("immutability", () => {
  it("does not mutate raw evidence during progression rating calculations", () => {
    const raw = ([5, 5, "missed", 6] as const).map((value, index) =>
      evidence("running", value, index),
    );
    const before = structuredClone(raw);
    const running = buildActivityDevelopmentState(raw, {
      activityId: "running",
      anchorDate: now,
      currentTargetValue: 5,
    });

    calculateProgressionRating({
      activityStates: [running],
      pillarStates: buildPillarStates([running]),
    });

    assert.deepEqual(raw, before);
  });
});

function risk(overrides: Partial<LevelRiskState> = {}): LevelRiskState {
  return {
    currentLevel: 25,
    supportedLevel: 18,
    startedAt: "2026-08-01T00:00:00.000Z",
    deteriorationStrength: 0.8,
    confidence: 0.85,
    evidencePeriods: 1,
    status: "AT_RISK",
    evidenceRefs: [],
    ...overrides,
  };
}

function historyEntries(level: number, count: number): RatingHistoryEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    timestamp: new Date(Date.UTC(2026, index % 12, 1)).toISOString(),
    progressionRating: 75,
    confidence: 0.85,
    currentLevel: level,
    levelRiskStatus: "SAFE",
    componentSummary: {
      disciplineContribution: 18,
      capabilityContribution: 18,
      healthContribution: 14,
      balanceContribution: 6,
      coreWeaknessPressure: 0,
      behavioralFrictionPressure: 0,
    },
  }));
}
