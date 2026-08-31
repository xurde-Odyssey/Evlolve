import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendXpTransactions,
  buildActivityDevelopmentState,
  classifyExecution,
  completeBoss,
  createBossXpTransaction,
  createExecutionXpTransaction,
  createJourneyEvents,
  createMonthlyCommitmentXpTransaction,
  createWeeklyConsistencyXpTransaction,
  defaultAchievementDefinitions,
  defaultXpPolicy,
  evaluateAchievements,
  evaluateCommitmentCapacity,
  evaluateLevelProgression,
  evaluateTitleEligibility,
  failBoss,
  initialCommitmentCapacityState,
  offerBoss,
  processMonthlyCloseout,
  processWeeklyCloseout,
  summarizeLifetimeXp,
  type ActivityDevelopmentState,
  type ActivityExecutionEvidence,
  type BossCandidate,
  type CommitmentCapacityState,
  type CoreWeaknessSignal,
  type EarnedTitleRecord,
  type HighestLevelRecord,
  type MonthlyEvaluationRecord,
  type ProgressionRatingBreakdown,
  type XpTransaction,
} from "../src/domain/evolve-engine/index";

const now = "2026-08-30T12:00:00.000Z";

function execution(
  id: string,
  value: number | "missed" | "excluded",
  targetValue = 4,
): ActivityExecutionEvidence {
  return classifyExecution({
    id,
    activityId: "running",
    scheduledFor: now,
    occurredAt: typeof value === "number" ? now : undefined,
    targetValue,
    actualValue: typeof value === "number" ? value : undefined,
    requirementState: value === "missed" ? "MISSED" : value === "excluded" ? "EXCLUDED" : "REQUIRED",
    exclusionState: value === "excluded" ? "SCHEDULED_REST" : "NONE",
    deadlineState: "ON_TIME",
    createdAt: now,
    unit: "km",
    evidenceQuality: "STANDARD",
  });
}

function evidenceSeries(activityId: string, values: readonly (number | "missed")[], target = 4) {
  return values.map((value, index) =>
    classifyExecution({
      id: `${activityId}-${index}`,
      activityId,
      scheduledFor: new Date(Date.UTC(2026, 7, 3 + index, 9)).toISOString(),
      occurredAt: value === "missed" ? undefined : new Date(Date.UTC(2026, 7, 3 + index, 9)).toISOString(),
      targetValue: target,
      actualValue: value === "missed" ? undefined : value,
      requirementState: value === "missed" ? "MISSED" : "REQUIRED",
      deadlineState: "ON_TIME",
      createdAt: now,
      unit: "units",
    }),
  );
}

function state(activityId: string, values: readonly (number | "missed")[], target = 4): ActivityDevelopmentState {
  return buildActivityDevelopmentState(evidenceSeries(activityId, values, target), {
    activityId,
    anchorDate: now,
    currentTargetValue: target,
  });
}

function rating(overrides: Partial<ProgressionRatingBreakdown> = {}): ProgressionRatingBreakdown {
  return {
    disciplineContribution: 12,
    capabilityContribution: 12,
    healthContribution: 12,
    balanceContribution: 4,
    commitmentExecutionContribution: 10,
    progressionEvidenceContribution: 0,
    recoveryContribution: 0,
    coreWeaknessPressure: 0,
    behavioralFrictionPressure: 0,
    instabilityPressure: 0,
    rebuildingPressure: 0,
    confidence: 0.8,
    finalRating: 55,
    ...overrides,
  };
}

function highest(level: number): HighestLevelRecord {
  return {
    level,
    firstReachedAt: "2026-01-01T00:00:00.000Z",
    lastReachedAt: "2026-01-01T00:00:00.000Z",
    establishmentStrength: 0.7,
    durationMaintainedPeriods: 8,
    supportingEvidenceSummary: ["Historical standard."],
  };
}

function month(outcome: MonthlyEvaluationRecord["outcome"], id: string = outcome): MonthlyEvaluationRecord {
  return {
    id,
    period: id,
    outcome,
    confidence: 0.9,
    evidenceRefs: [id],
  };
}

function weakness(activityId = "learning"): CoreWeaknessSignal {
  return {
    commitmentId: `core-${activityId}`,
    activityId,
    pillar: "CAPABILITY",
    severity: "HIGH",
    confidence: 0.88,
    persistence: 4,
    evidenceRefs: [`${activityId}-weakness`],
  };
}

describe("Lifetime XP ledger", () => {
  it("only increases Lifetime XP through non-negative ledger transactions", () => {
    const full = createExecutionXpTransaction({ evidence: execution("full", 4), commitmentTier: "core" });
    const ledger = appendXpTransactions([], [full, { ...full!, id: "negative", amount: -50 }]);

    assert.equal(summarizeLifetimeXp(ledger, now).totalLifetimeXp, full?.amount);
  });

  it("does not subtract Lifetime XP for normal misses", () => {
    const missed = createExecutionXpTransaction({ evidence: execution("missed", "missed") });

    assert.equal(missed, null);
  });

  it("awards normal execution XP for FULL execution", () => {
    const tx = createExecutionXpTransaction({ evidence: execution("full", 4) });

    assert.ok((tx?.amount ?? 0) >= defaultXpPolicy.baseExecutionXp);
  });

  it("awards proportional XP for QUALIFYING_PARTIAL", () => {
    const full = createExecutionXpTransaction({ evidence: execution("full", 4) });
    const partial = createExecutionXpTransaction({ evidence: execution("partial", 2.8) });

    assert.ok(partial);
    assert.ok(full);
    assert.ok(partial.amount < full.amount);
    assert.ok(partial.amount > 0);
  });

  it("does not give ATTEMPT full execution XP", () => {
    const full = createExecutionXpTransaction({ evidence: execution("full", 4) });
    const attempt = createExecutionXpTransaction({ evidence: execution("attempt", 0.4) });

    assert.ok(attempt);
    assert.ok(full);
    assert.ok(attempt.amount < full.amount);
  });

  it("gives EXCLUDED no XP", () => {
    assert.equal(createExecutionXpTransaction({ evidence: execution("excluded", "excluded") }), null);
  });

  it("applies diminishing returns to excess output", () => {
    const normal = createExecutionXpTransaction({ evidence: execution("normal", 4) });
    const surplus = createExecutionXpTransaction({ evidence: execution("surplus", 8) });
    const extreme = createExecutionXpTransaction({ evidence: execution("extreme", 40) });

    assert.ok(normal && surplus && extreme);
    assert.ok(surplus.amount > normal.amount);
    assert.ok(extreme.amount < normal.amount * 1.6);
  });

  it("preserves raw extreme output despite XP saturation", () => {
    const extreme = execution("extreme", 40, 4);
    const before = structuredClone(extreme);

    createExecutionXpTransaction({ evidence: extreme });

    assert.equal(extreme.actualValue, 40);
    assert.deepEqual(extreme, before);
  });

  it("does not award duplicate execution XP twice", () => {
    const tx = createExecutionXpTransaction({ evidence: execution("same", 4) });
    const ledger = appendXpTransactions([], [tx, tx]);

    assert.equal(ledger.length, 1);
  });

  it("does not award weekly consistency XP twice", () => {
    const tx = createWeeklyConsistencyXpTransaction({
      sourceId: "week-1",
      consistencyRatio: 1,
      reliabilityConfidence: 0.9,
      distributionStability: 0.9,
      occurredAt: now,
      evidenceRefs: ["a"],
    });
    const ledger = appendXpTransactions([], [tx, tx]);

    assert.equal(ledger.length, 1);
  });

  it("does not award monthly XP twice", () => {
    const tx = createMonthlyCommitmentXpTransaction({
      sourceId: "month-1",
      outcome: "STRONG_PASS",
      confidence: 0.9,
      occurredAt: now,
      evidenceRefs: ["m"],
    });
    const ledger = appendXpTransactions([], [tx, tx]);

    assert.equal(ledger.length, 1);
  });
});

describe("Boss XP, achievements, titles, and Journey", () => {
  it("does not award Boss XP twice", () => {
    const boss = completeBoss(offerBoss(candidate()), {
      completedAt: now,
      actualResult: 6,
      evidenceRefs: ["boss-evidence"],
    }).boss;
    const tx = createBossXpTransaction({ boss, occurredAt: now });
    const ledger = appendXpTransactions([], [tx, tx]);

    assert.equal(ledger.length, 1);
  });

  it("does not award Boss completion XP for failed Bosses", () => {
    const failed = failBoss(offerBoss(candidate()), {
      failedAt: now,
      meaningfulEffort: true,
    }).boss;

    assert.equal(createBossXpTransaction({ boss: failed, occurredAt: now }), null);
  });

  it("does not earn the same achievement twice", () => {
    const first = evaluateAchievements({
      activityStates: [state("running", [4, 4, 4, 4, 4, 4, 4, 4])],
      now,
    });
    const second = evaluateAchievements({
      existingAwards: first.awards,
      activityStates: [state("running", [4, 4, 4, 4, 4, 4, 4, 4])],
      now,
    });

    assert.ok(first.awards.length > 0);
    assert.equal(second.awards.length, 0);
  });

  it("creates a Journey event once for a major achievement", () => {
    const award = evaluateAchievements({
      activityStates: [state("running", [4, 4, 4, 4, 4, 4, 4, 4])],
      now,
    }).awards[0]!;
    const first = createJourneyEvents({
      achievements: [award],
      now,
      policyVersion: "test",
    });
    const second = createJourneyEvents({
      achievements: [award],
      existingEvents: first,
      now,
      policyVersion: "test",
    });

    assert.equal(first.length, 1);
    assert.equal(second.length, 0);
  });

  it("does not create Journey noise for minor achievements", () => {
    const minor = {
      id: "minor",
      definitionId: "minor",
      key: "MINOR",
      name: "Minor",
      category: "DISCIPLINE",
      major: false,
      earnedAt: now,
      supportingEvidence: [] as string[],
      policyVersion: "test",
    } as const;
    const events = createJourneyEvents({ achievements: [minor], now, policyVersion: "test" });

    assert.equal(events.length, 0);
  });

  it("keeps hidden achievement definitions hidden until earned", () => {
    const hidden = defaultAchievementDefinitions.find((definition) => definition.visibility === "HIDDEN_UNTIL_EARNED");
    const result = evaluateAchievements({
      definitions: hidden ? [hidden] : [],
      activityStates: [state("running", [4, 4, 4, 4, 4, 4, 4, 4])],
      now,
    });

    assert.equal(result.awards.length, 0);
    assert.equal(hidden?.visibility, "HIDDEN_UNTIL_EARNED");
  });

  it("keeps title history earned when active eligibility is lost", () => {
    const title: EarnedTitleRecord = {
      id: "disciplined",
      titleKey: "DISCIPLINED",
      name: "Disciplined",
      sourceType: "ACHIEVEMENT",
      sourceId: "missing-achievement",
      earnedAt: "2026-01-01T00:00:00.000Z",
      selected: true,
    };
    const result = evaluateTitleEligibility({ titles: [title], achievements: [] });

    assert.equal(result[0]?.title.id, title.id);
    assert.equal(result[0]?.eligibility, "INACTIVE");
  });
});

describe("Current Level separation", () => {
  it("does not let huge Lifetime XP directly change Current Level", () => {
    const level = evaluateLevelProgression({
      currentLevel: 20,
      highestLevel: highest(24),
      rating: rating({ finalRating: 35 }),
      now,
    });
    const ledger = appendXpTransactions([], [
      {
        id: "huge",
        sourceType: "SYSTEM",
        sourceId: "migration",
        category: "SYSTEM_ADJUSTMENT",
        amount: 1_000_000,
        occurredAt: now,
        reason: "Migration",
        evidenceRefs: [],
        policyVersion: "test",
      },
    ]);

    assert.equal(level.currentLevel, 20);
    assert.equal(summarizeLifetimeXp(ledger, now).totalLifetimeXp, 1_000_000);
  });

  it("allows Current Level to fall while Lifetime XP remains unchanged", () => {
    const demoted = evaluateLevelProgression({
      currentLevel: 24,
      highestLevel: highest(30),
      rating: rating({ finalRating: 15, confidence: 0.9 }),
      risk: {
        currentLevel: 24,
        supportedLevel: 12,
        deteriorationStrength: 0.9,
        confidence: 0.9,
        evidencePeriods: 2,
        status: "CONFIRMING_DEMOTION",
        evidenceRefs: [],
      },
      now,
    });
    const ledger: XpTransaction[] = [
      {
        id: "xp",
        sourceType: "ACTIVITY_EXECUTION",
        sourceId: "old",
        category: "EXECUTION",
        amount: 100,
        occurredAt: now,
        reason: "Old work",
        evidenceRefs: [],
        policyVersion: "test",
      },
    ];

    assert.ok(demoted.currentLevel < 24);
    assert.equal(summarizeLifetimeXp(ledger, now).totalLifetimeXp, 100);
    assert.equal(demoted.highestLevel.level, 30);
  });

  it("allows Lifetime XP to rise while Level remains unchanged", () => {
    const tx = createExecutionXpTransaction({ evidence: execution("full", 4) });
    const level = evaluateLevelProgression({
      currentLevel: 20,
      highestLevel: highest(20),
      rating: rating({ finalRating: 35 }),
      now,
    });

    assert.ok((tx?.amount ?? 0) > 0);
    assert.equal(level.currentLevel, 20);
  });
});

describe("Commitment capacity", () => {
  it("begins at the intended starting state", () => {
    const capacity = initialCommitmentCapacityState(0);

    assert.equal(capacity.currentCapacity, 3);
  });

  it("does not unlock from one strong week", () => {
    const capacity = evaluateCommitmentCapacity({
      activityStates: [state("running", [4, 4, 4, 4, 4, 4, 4, 4])],
      monthlyEvaluations: [month("STRONG_PASS")],
      activeCommitmentCount: 2,
    });

    assert.notEqual(capacity.currentCapacity, 4);
    assert.equal(capacity.status, "CONFIRMING_UNLOCK");
  });

  it("creates candidate capacity from sustained high-quality evidence", () => {
    const capacity = evaluateCommitmentCapacity({
      previous: { ...initialCommitmentCapacityState(2), qualifyingPeriods: 1 },
      activityStates: [state("running", [4, 4, 4, 4, 4, 4, 4, 4])],
      monthlyEvaluations: [month("STRONG_PASS")],
      activeCommitmentCount: 2,
    });

    assert.equal(capacity.currentCapacity, 4);
  });

  it("confirms capacity unlock with continued evidence", () => {
    const previous: CommitmentCapacityState = {
      ...initialCommitmentCapacityState(2),
      status: "CONFIRMING_UNLOCK",
      candidateCapacity: 4,
      qualifyingPeriods: 1,
    };
    const capacity = evaluateCommitmentCapacity({
      previous,
      activityStates: [state("running", [4, 4, 4, 4, 4, 4, 4, 4])],
      monthlyEvaluations: [month("FULL_COMPLETION")],
      activeCommitmentCount: 2,
    });

    assert.equal(capacity.currentCapacity, 4);
    assert.equal(capacity.highestCapacity, 4);
  });

  it("does not reduce capacity from one bad week", () => {
    const previous: CommitmentCapacityState = {
      ...initialCommitmentCapacityState(4),
      currentCapacity: 4,
      highestCapacity: 4,
    };
    const capacity = evaluateCommitmentCapacity({
      previous,
      activityStates: [state("running", [4, "missed", 4, "missed", 4, "missed", 4, "missed"])],
      coreWeaknesses: [weakness("running")],
      activeCommitmentCount: 4,
    });

    assert.equal(capacity.currentCapacity, 4);
    assert.equal(capacity.status, "AT_RISK");
  });

  it("creates capacity risk from persistent high-confidence discipline collapse", () => {
    const previous: CommitmentCapacityState = {
      ...initialCommitmentCapacityState(4),
      currentCapacity: 4,
      highestCapacity: 4,
      riskPeriods: 1,
    };
    const capacity = evaluateCommitmentCapacity({
      previous,
      activityStates: [state("running", [4, "missed", 4, "missed", 4, "missed", 4, "missed"])],
      coreWeaknesses: [weakness("running")],
      activeCommitmentCount: 4,
    });

    assert.equal(capacity.status, "AT_RISK");
  });

  it("can confirm capacity reduction without deleting active locked commitments", () => {
    const previous: CommitmentCapacityState = {
      ...initialCommitmentCapacityState(5),
      currentCapacity: 5,
      highestCapacity: 5,
      riskPeriods: 2,
    };
    const capacity = evaluateCommitmentCapacity({
      previous,
      activityStates: [state("running", [4, "missed", 4, "missed", 4, "missed", 4, "missed"])],
      coreWeaknesses: [weakness("running")],
      activeCommitmentCount: 5,
    });

    assert.equal(capacity.currentCapacity, 4);
    assert.equal(capacity.activeCommitmentCount, 5);
  });

  it("prevents adding another commitment when active commitments exceed reduced capacity", () => {
    const capacity = {
      ...initialCommitmentCapacityState(5),
      currentCapacity: 4,
      highestCapacity: 5,
      activeCommitmentCount: 5,
      canAddCommitment: false,
    } satisfies CommitmentCapacityState;

    assert.equal(capacity.canAddCommitment, false);
  });

  it("lets reduced capacity be re-earned through sustained evidence", () => {
    const previous: CommitmentCapacityState = {
      ...initialCommitmentCapacityState(3),
      currentCapacity: 3,
      highestCapacity: 4,
      status: "REBUILDING",
      qualifyingPeriods: 1,
    };
    const capacity = evaluateCommitmentCapacity({
      previous,
      activityStates: [state("running", [4, 4, 4, 4, 4, 4, 4, 4])],
      monthlyEvaluations: [month("STRONG_PASS")],
      activeCommitmentCount: 3,
    });

    assert.equal(capacity.currentCapacity, 4);
  });

  it("does not unlock capacity from one strong commitment while another Core commitment collapses", () => {
    const capacity = evaluateCommitmentCapacity({
      previous: { ...initialCommitmentCapacityState(2), qualifyingPeriods: 1 },
      activityStates: [
        state("running", [4, 4, 4, 4, 4, 4, 4, 4]),
        state("learning", [1, "missed", 1, "missed", 1, "missed", 1, "missed"], 4),
      ],
      monthlyEvaluations: [month("STRONG_PASS")],
      coreWeaknesses: [weakness("learning")],
      activeCommitmentCount: 2,
    });

    assert.notEqual(capacity.currentCapacity, 4);
  });
});

describe("closeout orchestration and snapshots", () => {
  it("processes monthly closeout in a deterministic order", () => {
    const result = processMonthlyCloseout(closeoutInput());

    assert.ok(result.monthlySnapshot);
    assert.ok(result.capacity);
    assert.ok(result.idempotencyKey.startsWith("monthly:"));
  });

  it("keeps monthly closeout idempotent", () => {
    const first = processMonthlyCloseout(closeoutInput());
    const second = processMonthlyCloseout({
      ...closeoutInput(),
      existingXpLedger: first.xpTransactions,
      existingAchievements: first.achievementsEarned,
      existingJourneyEvents: first.journeyEvents,
    });

    assert.equal(second.xpTransactions.length, 0);
    assert.equal(second.achievementsEarned.length, 0);
    assert.equal(second.journeyEvents.length, 0);
  });

  it("keeps weekly closeout idempotent", () => {
    const first = processWeeklyCloseout(closeoutInput());
    const second = processWeeklyCloseout({
      ...closeoutInput(),
      existingXpLedger: first.xpTransactions,
    });

    assert.equal(second.xpTransactions.length, 0);
  });

  it("preserves policy version in weekly and monthly snapshots", () => {
    const weekly = processWeeklyCloseout(closeoutInput());
    const monthly = processMonthlyCloseout(closeoutInput());

    assert.equal(weekly.weeklySnapshot?.policyVersion, defaultXpPolicy.version);
    assert.equal(monthly.monthlySnapshot?.policyVersion, defaultXpPolicy.version);
  });

  it("does not mutate historical snapshot when current policy configuration changes", () => {
    const snapshot = processMonthlyCloseout(closeoutInput()).monthlySnapshot!;
    const changedPolicy = { ...defaultXpPolicy, version: "future-policy", weeklyConsistencyBaseXp: 999 };

    processMonthlyCloseout({ ...closeoutInput(), xpPolicy: changedPolicy });

    assert.equal(snapshot.policyVersion, defaultXpPolicy.version);
  });

  it("creates major progression Journey event only once", () => {
    const first = processMonthlyCloseout(closeoutInput());
    const second = processMonthlyCloseout({
      ...closeoutInput(),
      existingAchievements: first.achievementsEarned,
      existingJourneyEvents: first.journeyEvents,
      existingXpLedger: first.xpTransactions,
    });

    assert.ok(first.journeyEvents.length > 0);
    assert.equal(second.journeyEvents.length, 0);
  });
});

function candidate(): BossCandidate {
  return {
    id: "boss-running",
    family: "PROGRESSION",
    title: "Running progression challenge",
    status: "CANDIDATE",
    reason: {
      category: "CAPABILITY_EDGE",
      summaryKey: "test",
      supportingEvidence: ["edge"],
      confidence: 0.8,
      affectedActivityIds: ["running"],
      affectedPillars: ["HEALTH"],
    },
    requirements: [
      {
        activityId: "running",
        description: "Complete one hard run",
        targetValue: 6,
        unit: "km",
        evaluationType: "SINGLE_VALUE",
      },
    ],
    difficulty: "EDGE",
    confidence: 0.8,
    evidenceRefs: ["edge"],
    evidenceSignature: "boss:running",
    generatedAt: now,
  };
}

function closeoutInput() {
  return {
    evidence: evidenceSeries("running", [4, 4, 4, 4, 4, 4, 4, 4]),
    anchorDate: now,
    targetValues: { running: 4 },
    currentLevel: 20,
    highestLevel: highest(20),
    monthlyEvaluations: [month("FULL_COMPLETION", "august")],
    activeCommitmentCount: 2,
  };
}
