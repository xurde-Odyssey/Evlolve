import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptBoss,
  buildActivityDevelopmentState,
  classifyExecution,
  completeBoss,
  defaultTargetProgressionPolicy,
  detectInternalPatternSignals,
  evaluateBossEligibility,
  evaluateTargetAdaptation,
  evaluateTargetProgression,
  failBoss,
  generateRecommendations,
  offerBoss,
  rejectBoss,
  startTargetAdaptation,
  type ActivityDevelopmentState,
  type ActivityExecutionEvidence,
  type BehavioralFrictionState,
  type CoreWeaknessSignal,
  type DevelopmentPressure,
  type LevelProgressionState,
  type RecommendationHistoryRecord,
  type TargetAdaptationState,
} from "../src/domain/evolve-engine/index";

const now = "2026-08-30T12:00:00.000Z";

function evidence(
  activityId: string,
  value: number | "missed",
  index: number,
  targetValue = 4,
): ActivityExecutionEvidence {
  const scheduledFor = new Date(Date.UTC(2026, 7, 3 + index, 9)).toISOString();

  return classifyExecution({
    id: `${activityId}-${index}`,
    activityId,
    scheduledFor,
    occurredAt: value === "missed" ? undefined : scheduledFor,
    targetValue,
    actualValue: value === "missed" ? undefined : value,
    requirementState: value === "missed" ? "MISSED" : "REQUIRED",
    deadlineState: "ON_TIME",
    createdAt: scheduledFor,
    unit: "units",
  });
}

function state(
  activityId: string,
  values: readonly (number | "missed")[],
  targetValue = 4,
): ActivityDevelopmentState {
  return buildActivityDevelopmentState(values.map((value, index) => evidence(activityId, value, index, targetValue)), {
    activityId,
    anchorDate: now,
    currentTargetValue: targetValue,
  });
}

function withOverrides(
  base: ActivityDevelopmentState,
  overrides: Partial<ActivityDevelopmentState>,
): ActivityDevelopmentState {
  return {
    ...base,
    ...overrides,
    capability: {
      ...base.capability,
      ...(overrides.capability ?? {}),
    },
    consistency: {
      ...base.consistency,
      ...(overrides.consistency ?? {}),
    },
    reliability: {
      ...base.reliability,
      ...(overrides.reliability ?? {}),
    },
    targetRelationship: {
      ...base.targetRelationship,
      ...(overrides.targetRelationship ?? {}),
    },
    gapClassification: {
      ...base.gapClassification,
      ...(overrides.gapClassification ?? {}),
    },
  };
}

function coreWeakness(activityId = "learning", severity: CoreWeaknessSignal["severity"] = "HIGH"): CoreWeaknessSignal {
  return {
    commitmentId: `core-${activityId}`,
    activityId,
    pillar: "CAPABILITY",
    severity,
    confidence: 0.88,
    persistence: 4,
    evidenceRefs: [`${activityId}-weakness`],
  };
}

describe("adaptive target progression", () => {
  it("does not generate a recurring target increase from one peak session", () => {
    const running = state("running", [4, 4, 4, 4, 4, 4, 4, 8], 4);
    const recommendation = evaluateTargetProgression({
      activityState: running,
      currentTargetValue: 4,
      now,
    });

    assert.equal(recommendation.action, "MAINTAIN");
    assert.ok((recommendation.peakSurplusRatio ?? 0) > 0.5);
  });

  it("makes target increase eligible after repeated stable sustainable surplus", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 5], 4);
    const recommendation = evaluateTargetProgression({
      activityState: running,
      currentTargetValue: 4,
      unit: "km",
      now,
    });

    assert.equal(recommendation.action, "INCREASE");
    assert.ok((recommendation.proposedTargetValue ?? 0) > 4);
  });

  it("delays target increase when output volatility is high", () => {
    const running = state("running", [3, 7, 3.2, 7.2, 3.4, 7.4, 3.1, 7.1], 4);
    const recommendation = evaluateTargetProgression({
      activityState: running,
      currentTargetValue: 4,
      now,
    });

    assert.equal(recommendation.action, "MAINTAIN");
    assert.ok(running.capability.volatility !== null && running.capability.volatility > 0.24);
  });

  it("trails sustainable capability instead of chasing peak", () => {
    const running = state("running", [5, 5, 5, 5, 5.1, 5, 5, 7.5], 4);
    const recommendation = evaluateTargetProgression({
      activityState: running,
      currentTargetValue: 4,
      now,
    });

    assert.equal(recommendation.action, "INCREASE");
    assert.ok((recommendation.proposedTargetValue ?? 0) < (running.capability.peakCapability.value ?? 0));
  });

  it("does not exceed the configured hard increase ceiling", () => {
    const running = state("running", [9, 9, 9, 9, 9, 9, 9, 9], 4);
    const recommendation = evaluateTargetProgression({
      activityState: running,
      currentTargetValue: 4,
      now,
    });

    assert.ok((recommendation.proposedTargetValue ?? 0) <= 4 * (1 + defaultTargetProgressionPolicy.hardMaxIncreaseRatio));
  });

  it("deprioritizes target increase when another Core area is seriously weak", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 5], 4);
    const recommendation = evaluateTargetProgression({
      activityState: running,
      currentTargetValue: 4,
      competingCoreWeaknesses: [coreWeakness("learning")],
      now,
    });

    assert.equal(recommendation.action, "MAINTAIN");
  });

  it("does not treat Discipline Gap as automatic downward recalibration", () => {
    const running = withOverrides(state("running", [4, "missed", 4, "missed", 4, "missed", 4, "missed"], 4), {
      gapClassification: {
        classification: "DISCIPLINE_GAP",
        confidence: 0.8,
        supportingEvidence: ["Capability exists.", "Execution is inconsistent."],
      },
      targetRelationship: {
        state: "APPROPRIATE",
        confidence: 0.8,
        evidence: [],
      },
    });
    const recommendation = evaluateTargetProgression({
      activityState: running,
      currentTargetValue: 4,
      now,
    });

    assert.equal(recommendation.action, "MAINTAIN");
  });

  it("can recommend recalibration for Capability Gap evidence", () => {
    const running = withOverrides(state("running", [3, 3.1, 3, 3.2, 3, 3.1, 3, 3.2], 5), {
      gapClassification: {
        classification: "CAPABILITY_GAP",
        confidence: 0.82,
        supportingEvidence: ["Attendance remains present.", "Output remains below target."],
      },
      targetRelationship: {
        state: "POTENTIALLY_UNSUSTAINABLE",
        confidence: 0.82,
        evidence: [],
      },
    });
    const recommendation = evaluateTargetProgression({
      activityState: running,
      currentTargetValue: 5,
      now,
    });

    assert.equal(recommendation.action, "INTERMEDIATE_TARGET");
    assert.ok((recommendation.proposedTargetValue ?? 5) < 5);
  });
});

describe("adaptation state", () => {
  it("creates Adaptation State after accepting a target increase", () => {
    const adaptation = startTargetAdaptation({
      id: "adapt-running",
      activityId: "running",
      previousTargetValue: 4,
      newTargetValue: 4.5,
      startedAt: now,
    });

    assert.equal(adaptation.status, "ADAPTING");
    assert.equal(adaptation.protectionActive, true);
  });

  it("keeps early adaptation difficulty from immediately ending protection", () => {
    const adaptation = startTargetAdaptation({
      id: "adapt-running",
      activityId: "running",
      previousTargetValue: 4,
      newTargetValue: 5,
      startedAt: now,
    });
    const next = evaluateTargetAdaptation({
      adaptation,
      activityState: state("running", [4.2, "missed"], 5),
    });

    assert.equal(next.status, "ADAPTING");
    assert.equal(next.protectionActive, true);
  });

  it("stabilizes the new target after repeated qualifying evidence", () => {
    const adaptation = {
      ...startTargetAdaptation({
        id: "adapt-running",
        activityId: "running",
        previousTargetValue: 4,
        newTargetValue: 5,
        startedAt: now,
      }),
      evidenceCount: 2,
      qualifyingCount: 2,
    } satisfies TargetAdaptationState;
    const next = evaluateTargetAdaptation({
      adaptation,
      activityState: state("running", [5, 5.1, 5, 5.2], 5),
    });

    assert.equal(next.status, "ESTABLISHED");
  });

  it("classifies a new target as unsustainable after repeated capability-gap evidence", () => {
    const adaptation = startTargetAdaptation({
      id: "adapt-running",
      activityId: "running",
      previousTargetValue: 4,
      newTargetValue: 6,
      startedAt: now,
    });
    const struggling = withOverrides(state("running", [3.8, "missed", 3.7, "missed", 3.8, "missed"], 6), {
      gapClassification: {
        classification: "CAPABILITY_GAP",
        confidence: 0.8,
        supportingEvidence: ["Repeated legitimate attempts remain below target."],
      },
    });
    const next = evaluateTargetAdaptation({ adaptation, activityState: struggling });

    assert.equal(next.status, "UNSUSTAINABLE");
  });

  it("ends adaptation protection after rejected recalibration and sufficient evidence", () => {
    const adaptation = {
      ...startTargetAdaptation({
        id: "adapt-running",
        activityId: "running",
        previousTargetValue: 4,
        newTargetValue: 6,
        startedAt: now,
      }),
      evidenceCount: 3,
      underperformanceCount: 3,
      userRejectedRecalibration: true,
    } satisfies TargetAdaptationState;
    const struggling = withOverrides(state("running", [3.8, "missed", 3.7, "missed"], 6), {
      gapClassification: {
        classification: "CAPABILITY_GAP",
        confidence: 0.82,
        supportingEvidence: ["Target remains unsustainable."],
      },
    });
    const next = evaluateTargetAdaptation({
      adaptation,
      activityState: struggling,
      userRejectedRecalibration: true,
    });

    assert.equal(next.status, "UNSUSTAINABLE");
    assert.equal(next.protectionActive, false);
  });
});

describe("Boss eligibility and state", () => {
  it("does not create a corrective Boss for social activity without interference", () => {
    const eligibility = evaluateBossEligibility({
      activityStates: [state("running", [4, 4, 4, 4, 4, 4, 4, 4], 4)],
      developmentPressure: [],
      now,
    });

    assert.equal(eligibility.candidates.some((boss) => boss.family === "CORRECTIVE"), false);
  });

  it("creates corrective Boss eligibility from high-confidence behavior interference pressure", () => {
    const pressure: DevelopmentPressure = {
      pillar: "HEALTH",
      reason: "Repeated behavior association may be interfering with development.",
      confidence: 0.84,
      severity: "HIGH",
      evidenceRefs: ["late-night"],
    };
    const eligibility = evaluateBossEligibility({
      activityStates: [state("running", [4, 4, 4, 4, 4, 4, 4, 4], 4)],
      developmentPressure: [pressure],
      behavioralFriction: friction("HIGH"),
      now,
    });

    assert.equal(eligibility.candidates.some((boss) => boss.family === "CORRECTIVE"), true);
  });

  it("keeps corrective physical Bosses based on demonstrated capability rather than behavior punishment", () => {
    const running = state("running", [4, 4.1, 4, 4.2, 4, 4.1, 4, 4.2], 4);
    const eligibility = evaluateBossEligibility({
      activityStates: [running],
      coreWeaknesses: [{ ...coreWeakness("running"), pillar: "HEALTH" }],
      now,
    });
    const boss = eligibility.candidates.find((candidate) => candidate.family === "CORRECTIVE");

    assert.ok(boss);
    const targetValue = boss.requirements[0]?.targetValue;
    assert.equal(targetValue === undefined || targetValue <= (running.capability.peakCapability.value ?? 0), true);
  });

  it("lets Progression Boss challenge closer to the edge than normal target recommendation", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 7], 4);
    const target = evaluateTargetProgression({
      activityState: running,
      currentTargetValue: 4,
      unit: "km",
      now,
    });
    const eligibility = evaluateBossEligibility({
      activityStates: [running],
      targetRecommendations: [target],
      now,
    });
    const boss = eligibility.candidates.find((candidate) => candidate.family === "PROGRESSION");

    assert.ok(boss);
    assert.ok((boss.requirements[0]?.targetValue ?? 0) > (target.proposedTargetValue ?? 0));
  });

  it("preserves actual evidence when completing a Boss", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 7], 4);
    const target = evaluateTargetProgression({ activityState: running, currentTargetValue: 4, now });
    const boss = evaluateBossEligibility({
      activityStates: [running],
      targetRecommendations: [target],
      now,
    }).selectedBoss;
    assert.ok(boss);
    const accepted = acceptBoss(boss, now).boss;
    const completed = completeBoss(accepted, {
      completedAt: "2026-08-31T12:00:00.000Z",
      actualResult: 6.8,
      evidenceRefs: ["boss-run"],
      frontierExtended: true,
    });

    assert.equal(completed.boss.status, "COMPLETED");
    assert.equal(completed.boss.actualResult, 6.8);
    assert.deepEqual(completed.boss.completionEvidenceRefs, ["boss-run"]);
  });

  it("keeps Boss failure and rejection distinct", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 7], 4);
    const target = evaluateTargetProgression({ activityState: running, currentTargetValue: 4, now });
    const boss = evaluateBossEligibility({
      activityStates: [running],
      targetRecommendations: [target],
      now,
    }).selectedBoss;
    assert.ok(boss);
    const offered = offerBoss(boss);
    const failed = failBoss(offered, {
      failedAt: "2026-08-31T12:00:00.000Z",
      actualResult: 4.5,
      meaningfulEffort: true,
    });
    const rejected = rejectBoss(boss, "2026-08-31T13:00:00.000Z");

    assert.equal(failed.boss.status, "FAILED");
    assert.equal(rejected.boss.status, "REJECTED");
    assert.notEqual(failed.event.type, rejected.event.type);
  });

  it("suppresses repetitive similar Bosses without new evidence", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 7], 4);
    const target = evaluateTargetProgression({ activityState: running, currentTargetValue: 4, now });
    const first = evaluateBossEligibility({
      activityStates: [running],
      targetRecommendations: [target],
      now,
    }).selectedBoss;
    assert.ok(first);
    const second = evaluateBossEligibility({
      activityStates: [running],
      targetRecommendations: [target],
      bossHistory: [
        {
          bossId: first.id,
          family: first.family,
          activityId: String(first.requirements[0]?.activityId),
          status: "REJECTED",
          difficulty: first.difficulty,
          offeredAt: now,
          evidenceSignature: first.evidenceSignature,
        },
      ],
      now: "2026-09-02T12:00:00.000Z",
    });

    assert.equal(second.selectedBoss, null);
    assert.ok(second.suppressedReasons.length > 0);
  });

  it("uses recovery history for Comeback Boss eligibility", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 5], 4);
    const eligibility = evaluateBossEligibility({
      activityStates: [running],
      levelState: levelState("ACTIVE_RECOVERY"),
      now,
    });

    assert.equal(eligibility.candidates.some((boss) => boss.family === "COMEBACK"), true);
  });

  it("does not generate aggressive Bosses from low-confidence evidence", () => {
    const running = state("running", [7], 4);
    const target = evaluateTargetProgression({ activityState: running, currentTargetValue: 4, now });
    const eligibility = evaluateBossEligibility({
      activityStates: [running],
      targetRecommendations: [target],
      now,
    });

    assert.equal(eligibility.selectedBoss, null);
  });
});

describe("recommendation ranking and history", () => {
  it("prevents repetitive recommendation nagging without new evidence", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 5], 4);
    const target = evaluateTargetProgression({ activityState: running, currentTargetValue: 4, now });
    const history: RecommendationHistoryRecord[] = [
      {
        id: "old",
        category: "INCREASE_TARGET",
        status: "REJECTED",
        createdAt: now,
        evidenceSignature: `target:${target.activityId}:${target.action}:${target.proposedTargetValue ?? "none"}`,
      },
    ];
    const result = generateRecommendations({
      activityStates: [running],
      targetRecommendations: [target],
      recommendationHistory: history,
      now: "2026-09-01T12:00:00.000Z",
    });

    assert.equal(result.primary, null);
    assert.ok(result.suppressed.length > 0);
  });

  it("chooses primary recommendation by overall opportunity cost", () => {
    const running = state("running", [5, 5, 5, 5, 5, 5, 5, 5], 4);
    const target = evaluateTargetProgression({ activityState: running, currentTargetValue: 4, now });
    const result = generateRecommendations({
      activityStates: [running],
      targetRecommendations: [target],
      coreWeaknesses: [coreWeakness("learning")],
      now,
    });

    assert.equal(result.primary?.category, "PRIORITIZE_CORE_AREA");
  });

  it("keeps weak Core recommendation priority despite strong overperformance elsewhere", () => {
    const running = state("running", [8, 8, 8, 8, 8, 8, 8, 8], 4);
    const result = generateRecommendations({
      activityStates: [running],
      targetRecommendations: [
        evaluateTargetProgression({
          activityState: running,
          currentTargetValue: 4,
          competingCoreWeaknesses: [coreWeakness("learning")],
          now,
        }),
      ],
      coreWeaknesses: [coreWeakness("learning")],
      now,
    });

    assert.equal(result.primary?.affectedActivities.includes("learning"), true);
  });

  it("exposes internal anti-gaming hooks without applying consequences", () => {
    const running = state("running", [4, 4, 4, 4, 4, 4, 4, 9], 4);
    const signals = detectInternalPatternSignals({ activityStates: [running] });

    assert.equal(signals.every((signal) => signal.internalOnly), true);
    assert.equal(signals.some((signal) => signal.type === "EXTREME_SPIKE"), true);
  });
});

function friction(stateValue: BehavioralFrictionState["state"]): BehavioralFrictionState {
  return {
    state: stateValue,
    confidence: 0.84,
    affectedPillars: ["HEALTH"],
    affectedCommitments: [],
    activeSignals: [],
    trend: "DECLINING",
  };
}

function levelState(recoveryState: LevelProgressionState["recovery"]["recoveryState"]): LevelProgressionState {
  return {
    currentLevel: 27,
    supportedLevel: 29,
    highestLevel: {
      level: 35,
      firstReachedAt: "2026-01-01T00:00:00.000Z",
      lastReachedAt: "2026-05-01T00:00:00.000Z",
      establishmentStrength: 0.82,
      durationMaintainedPeriods: 10,
      supportingEvidenceSummary: ["Previously established higher standard."],
    },
    rating: {
      disciplineContribution: 15,
      capabilityContribution: 16,
      healthContribution: 14,
      balanceContribution: 5,
      commitmentExecutionContribution: 12,
      progressionEvidenceContribution: 3,
      recoveryContribution: 4,
      coreWeaknessPressure: 0,
      behavioralFrictionPressure: 0,
      instabilityPressure: 0,
      rebuildingPressure: 0,
      confidence: 0.78,
      finalRating: 62,
    },
    candidate: {
      candidateLevel: null,
      evidenceStrength: 0,
      confidence: 0,
      qualifyingPeriods: 0,
      interruptions: 0,
      status: "NONE",
      evidenceRefs: [],
    },
    risk: {
      currentLevel: 27,
      supportedLevel: 29,
      deteriorationStrength: 0,
      confidence: 0.78,
      evidencePeriods: 0,
      status: "SAFE",
      evidenceRefs: [],
    },
    establishment: {
      level: 27,
      value: 0.55,
      confidence: 0.75,
      durationMaintainedPeriods: 3,
      confirmationQuality: 0.7,
      volatility: 0.1,
    },
    recovery: {
      highestLevel: {
        level: 35,
        firstReachedAt: "2026-01-01T00:00:00.000Z",
        lastReachedAt: "2026-05-01T00:00:00.000Z",
        establishmentStrength: 0.82,
        durationMaintainedPeriods: 10,
        supportingEvidenceSummary: ["Previously established higher standard."],
      },
      currentLevel: 27,
      collapseCount: 1,
      recoveryState,
      recoveryAdvantage: 0.5,
    },
    historyEntry: {
      timestamp: now,
      progressionRating: 62,
      confidence: 0.78,
      currentLevel: 27,
      levelRiskStatus: "SAFE",
      componentSummary: {
        disciplineContribution: 15,
        capabilityContribution: 16,
        healthContribution: 14,
        balanceContribution: 5,
        coreWeaknessPressure: 0,
        behavioralFrictionPressure: 0,
      },
    },
    events: [],
    view: {
      currentLevel: 27,
      highestLevel: 35,
      state: "RECOVERING",
      direction: "IMPROVING",
      confidence: 0.78,
    },
  };
}
