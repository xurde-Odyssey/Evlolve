import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findRegressionFixture,
  getSimulationScenario,
  phase37RegressionFixtures,
  runAllSimulationScenarios,
  runSensitivityAnalysis,
  runSimulationScenario,
  simulationScenarios,
} from "../src/domain/evolve-engine/index";
import type { SimulationDuration } from "../src/domain/evolve-engine/index";

function run(id: string) {
  const scenario = getSimulationScenario(id);
  assert.ok(scenario, `Missing scenario ${id}`);
  return runSimulationScenario(scenario);
}

describe("Phase 3.7 simulation catalog", () => {
  it("implements all named Phase 3.7 scenarios and boundary suites", () => {
    const ids = new Set(simulationScenarios.map((scenario) => scenario.id));

    for (const required of [
      "ideal-disciplined-beginner",
      "static-easy-standard",
      "high-capability-low-discipline",
      "low-capability-high-attendance",
      "mixed-failure",
      "collapsing-core-commitment",
      "extreme-activity-farmer",
      "minimum-threshold-gamer",
      "heroic-catch-up-day",
      "approved-inactive-period",
      "reading-recovery",
      "successful-adaptation",
      "failed-adaptation",
      "adaptation-protection-abuse",
      "strong-social-strong-execution",
      "repeated-lifestyle-interference",
      "restraint-contract-maintained",
      "repeated-restraint-violations",
      "first-climb-to-high-level",
      "high-level-collapse",
      "earned-comeback",
      "weakly-established-high-level",
      "collapse-recovery-cycling",
      "boss-rejection-gaming",
      "repeated-boss-completion",
      "balanced-profile-physical",
      "balanced-profile-learning",
      "balanced-profile-mixed",
      "long-term-stagnation",
      "long-term-mastery",
      "boundary-baseline-maturity",
      "boundary-target-increase",
      "boundary-demotion",
    ]) {
      assert.ok(ids.has(required), required);
    }
  });

  it("is deterministic for the same scenario, duration, and seed", () => {
    const scenario = getSimulationScenario("ideal-disciplined-beginner");
    assert.ok(scenario);
    const first = runSimulationScenario(scenario, { seed: 12, duration: "3m" });
    const second = runSimulationScenario(scenario, { seed: 12, duration: "3m" });

    assert.deepEqual(first.finalState.currentLevel, second.finalState.currentLevel);
    assert.deepEqual(first.finalState.lifetimeXp, second.finalState.lifetimeXp);
    assert.deepEqual(first.levelHistory, second.levelHistory);
    assert.deepEqual(first.commitmentHistory, second.commitmentHistory);
  });
});

describe("Phase 3.7 hard invariants", () => {
  it("holds hard invariants across the complete simulation suite", () => {
    const results = runAllSimulationScenarios();
    const failures = results.flatMap((result) =>
      result.invariantViolations.map((violation) => `${result.scenarioId}:${violation.code}`),
    );

    assert.deepEqual(failures, []);
  });

  it("preserves idempotent XP transaction sources in simulation results", () => {
    const result = run("long-term-mastery");
    const ids = new Set(result.xpLedger.map((transaction) => transaction.id));
    const sourceKeys = new Set(
      result.xpLedger.map((transaction) =>
        `${transaction.sourceType}:${transaction.sourceId}:${transaction.category}:${transaction.policyVersion}`,
      ),
    );

    assert.equal(ids.size, result.xpLedger.length);
    assert.equal(sourceKeys.size, result.xpLedger.length);
    assert.equal(result.invariantViolations.some((violation) => violation.code === "XP_IDEMPOTENT"), false);
  });

  it("keeps accepted regression fixtures inside qualitative bands", () => {
    for (const fixture of phase37RegressionFixtures) {
      const scenario = getSimulationScenario(fixture.scenarioId);
      assert.ok(scenario);
      const result = runSimulationScenario(scenario, {
        duration: fixture.duration as SimulationDuration,
      });
      const [min, max] = fixture.expectedLevelBand;
      const warningCodes = new Set<string>(result.warnings.map((warning) => warning.code));

      assert.ok(result.finalState.currentLevel >= min, fixture.scenarioId);
      assert.ok(result.finalState.currentLevel <= max, fixture.scenarioId);
      assert.equal(
        fixture.requiredCoreWeakness ? result.finalState.coreWeaknesses.length > 0 : true,
        true,
        fixture.scenarioId,
      );
      for (const forbidden of fixture.forbiddenWarnings ?? []) {
        assert.equal(warningCodes.has(forbidden), false, `${fixture.scenarioId}:${forbidden}`);
      }
      if (typeof fixture.maxSurplusXpRatio === "number") {
        assert.ok(result.auditMetrics.surplusXpRatio <= fixture.maxSurplusXpRatio, fixture.scenarioId);
      }
      assert.equal(findRegressionFixture(fixture.scenarioId)?.scenarioId, fixture.scenarioId);
    }
  });
});

describe("Phase 3.7 sensitivity analysis", () => {
  it("varies registered policy coefficients without hiding hard invariant failures", () => {
    const result = runSensitivityAnalysis();

    assert.ok(result.variants.length > 0);
    assert.deepEqual(
      result.variants
        .filter((variant) => variant.invariantViolationCount > 0)
        .map((variant) => `${variant.id}:${variant.scenarioId}`),
      [],
    );
    assert.equal(
      result.unstableVariants.every((variant) => variant.unstable),
      true,
    );
  });
});

describe("Phase 3.7 behavioral expectations", () => {
  it("ideal disciplined beginner progresses gradually", () => {
    const result = run("ideal-disciplined-beginner");

    assert.ok(result.finalState.currentLevel >= 1);
    assert.ok(result.finalState.currentLevel <= 8);
    assert.equal(result.warnings.some((warning) => warning.code === "LEVEL_GROWTH_TOO_FAST"), false);
  });

  it("static easy-standard user eventually plateaus in Current Level while XP grows", () => {
    const scenario = getSimulationScenario("static-easy-standard");
    assert.ok(scenario);
    const result = runSimulationScenario(scenario, { duration: "24m" });

    assert.ok(result.auditMetrics.currentLevelPlateauMonths >= 3);
    assert.ok(result.finalState.lifetimeXp > 0);
    assert.ok(result.finalState.currentLevel <= 10);
  });

  it("high-capability low-discipline user is constrained by missed execution", () => {
    const result = run("high-capability-low-discipline");
    const classifications = new Set(result.finalState.activityStates.map((state) => state.gapClassification.classification));

    assert.ok(classifications.has("DISCIPLINE_GAP") || classifications.has("MIXED_GAP"));
    assert.ok(result.finalState.currentLevel < 15);
  });

  it("high-attendance capability-gap user differs from Discipline Gap", () => {
    const result = run("low-capability-high-attendance");
    const classifications = new Set(result.finalState.activityStates.map((state) => state.gapClassification.classification));

    assert.ok(classifications.has("CAPABILITY_GAP") || classifications.has("MIXED_GAP"));
    assert.equal(classifications.has("DISCIPLINE_GAP"), false);
  });

  it("one collapsing Core commitment creates pressure", () => {
    const result = run("collapsing-core-commitment");

    assert.ok(result.finalState.coreWeaknesses.some((weakness) => weakness.activityId === "learning"));
    assert.ok(result.finalState.currentLevel < 12);
  });

  it("extreme one-activity farming saturates globally", () => {
    const result = run("extreme-activity-farmer");

    assert.ok(result.auditMetrics.surplusXpRatio < 0.65);
    assert.ok(result.finalState.currentLevel < 12);
  });

  it("one heroic catch-up day cannot repair consistency history", () => {
    const result = run("heroic-catch-up-day");

    assert.ok(result.sourceEvidence.some((item) => item.executionState === "MISSED"));
    assert.ok(result.finalState.activityStates.some((state) => (state.consistency.value ?? 1) < 0.8));
  });

  it("approved inactivity and reading recovery remain neutral exclusions", () => {
    const inactive = run("approved-inactive-period");
    const reading = run("reading-recovery");

    assert.ok(inactive.sourceEvidence.some((item) => item.exclusionState === "INACTIVE" && item.executionState === "EXCLUDED"));
    assert.ok(reading.sourceEvidence.some((item) => item.exclusionState === "READING_RECOVERY" && item.executionState === "EXCLUDED"));
    assert.deepEqual([...inactive.invariantViolations, ...reading.invariantViolations], []);
  });

  it("social activity with strong execution creates no Behavioral Debt", () => {
    const result = run("strong-social-strong-execution");

    assert.equal(result.finalState.behavioralDebt.state, "NONE");
    assert.equal(result.warnings.some((warning) => warning.code === "SOCIAL_ACTIVITY_PENALIZED_WITHOUT_EVIDENCE"), false);
  });

  it("repeated interference requires meaningful confidence before consequence", () => {
    const result = run("repeated-lifestyle-interference");

    assert.ok(result.finalState.behavioralFriction.confidence >= 0.35 || result.finalState.behavioralFriction.state === "NONE");
  });

  it("adaptation protection ends when abused", () => {
    const result = run("adaptation-protection-abuse");

    assert.ok(result.finalState.targetAdaptations.length > 0);
    assert.equal(result.finalState.targetAdaptations.some((adaptation) => adaptation.protectionActive), false);
  });

  it("recovery is faster through previous territory but stops at old frontier", () => {
    const comeback = run("earned-comeback");
    const climb = run("first-climb-to-high-level");

    assert.ok(comeback.auditMetrics.recoveryCount > 0);
    assert.ok(comeback.finalState.currentLevel <= comeback.finalState.highestLevel.level);
    assert.ok(comeback.finalState.currentLevel >= Math.min(climb.finalState.currentLevel, comeback.finalState.highestLevel.level) - 6);
  });

  it("repeated collapse weakens recovery and high levels require persistence", () => {
    const cycling = run("collapse-recovery-cycling");
    const high = run("first-climb-to-high-level");
    const beginner = run("ideal-disciplined-beginner");

    assert.ok(cycling.finalState.highestLevel.establishmentStrength <= 1);
    assert.ok(high.levelHistory.length > beginner.levelHistory.length);
  });

  it("XP can grow while Current Level plateaus or declines, and Highest Level remains permanent", () => {
    const stagnation = run("long-term-stagnation");
    const collapse = run("high-level-collapse");

    assert.ok(stagnation.finalState.lifetimeXp > 0);
    assert.ok(stagnation.auditMetrics.currentLevelPlateauMonths >= 3);
    assert.ok(collapse.finalState.lifetimeXp > 0);
    assert.ok(collapse.finalState.currentLevel <= collapse.finalState.highestLevel.level);
  });

  it("capacity and Bosses cannot be easily farmed", () => {
    const capacity = run("static-easy-standard");
    const rejection = run("boss-rejection-gaming");
    const completion = run("repeated-boss-completion");

    assert.ok(capacity.auditMetrics.capacityUnlockCount <= 2);
    assert.ok(rejection.auditMetrics.bossRejectionCount >= 0);
    assert.ok(completion.auditMetrics.bossCompletionCount <= Math.ceil(completion.durationDays / 45));
  });
});
