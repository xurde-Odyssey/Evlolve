import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDemoEvolveState,
  createEvolveApplication,
  getDashboardProgressionViewModel,
  getDailyQuestViewModel,
  getReportsViewModel,
  getTodayViewModel,
  type GrowthCommitment,
} from "../src/application/evolve/index";
import type {
  BossCandidate,
  TargetProgressionRecommendation,
  XpTransaction,
} from "../src/domain/evolve-engine/index";

describe("Phase 3.8 application engine integration", () => {
  it("derives Daily Quests from active commitment schedules", () => {
    const state = createDemoEvolveState();
    const quests = getDailyQuestViewModel(state);

    assert.ok(quests.some((quest) => quest.id === "requirement:commitment-running:2026-08-28"));
    assert.ok(quests.some((quest) => quest.id === "requirement:commitment-reading:2026-08-28"));
    assert.equal(quests.some((quest) => quest.title === "Hardcoded Quest"), false);
  });

  it("logs before-deadline activity through one command with evidence and XP", () => {
    const app = createEvolveApplication(createDemoEvolveState());
    const result = app.logActivity({
      activityKey: "running",
      measurementType: "distance",
      value: 5,
      occurredAt: "2026-08-28T15:00:00.000Z",
    });

    assert.equal(result.record.activityKey, "running");
    assert.equal(result.evidence.some((item) => item.executionState === "FULL" && item.deadlineState === "ON_TIME"), true);
    assert.ok(result.xpAwarded > 0);
  });

  it("preserves late activity without repairing the missed required session", () => {
    const app = createEvolveApplication(createDemoEvolveState());
    const result = app.logActivity({
      activityKey: "running",
      measurementType: "distance",
      value: 5,
      occurredAt: "2026-08-28T17:00:00.000Z",
    });
    const nextState = app.repositories.getState();
    const quest = getDailyQuestViewModel(nextState).find((item) => item.id === "requirement:commitment-running:2026-08-28");

    assert.equal(result.record.measurement.value, 5);
    assert.equal(result.evidence.some((item) => item.executionState === "MISSED"), true);
    assert.equal(result.evidence.some((item) => item.requirementState === "NO_REQUIREMENT" && item.deadlineState === "AFTER_DEADLINE"), true);
    assert.equal(quest?.status, "missed");
  });

  it("keeps approved inactive and reading recovery exclusions neutral", () => {
    const state = createDemoEvolveState();
    state.commitments = state.commitments.map((commitment) =>
      commitment.id === "commitment-reading"
        ? { ...commitment, readingRecoveryUntil: "2026-08-30" }
        : commitment,
    );
    const quests = getDailyQuestViewModel(state);
    const reading = quests.find((quest) => quest.target?.activityKey === "reading");
    const meditation = quests.find((quest) => quest.target?.activityKey === "meditation");

    assert.equal(reading?.status, "excluded");
    assert.equal(meditation?.status, "excluded");
  });

  it("keeps Weekly Reminders outside XP and progression state", () => {
    const app = createEvolveApplication(createDemoEvolveState());
    const before = app.repositories.getState();
    const beforeView = getDashboardProgressionViewModel(before);
    const beforeXp = before.xpLedger.reduce((total, item) => total + item.amount, 0);

    app.completeWeeklyReminder("linkedin", before.now);

    const after = app.repositories.getState();
    const afterView = getDashboardProgressionViewModel(after);
    const afterXp = after.xpLedger.reduce((total, item) => total + item.amount, 0);

    assert.equal(after.weeklyReminders.find((item) => item.id === "linkedin")?.completed, true);
    assert.equal(afterXp, beforeXp);
    assert.equal(afterView.level, beforeView.level);
  });

  it("blocks new serious commitments when capacity is full without deleting existing commitments", () => {
    const state = createDemoEvolveState();
    state.capacity = { ...state.capacity, currentCapacity: 3, canAddCommitment: false };
    const app = createEvolveApplication(state);
    const activeBefore = app.repositories.getState().commitments.filter((item) => item.status === "active").length;

    assert.throws(
      () => app.createSeriousCommitment(testCommitment("commitment-new-core", "New Core")),
      /capacity is full/i,
    );
    assert.equal(app.repositories.getState().commitments.filter((item) => item.status === "active").length, activeBefore);
  });

  it("does not derive Current Level from manually increased Lifetime XP", () => {
    const state = createDemoEvolveState();
    const before = getDashboardProgressionViewModel(state);
    const extraXp: XpTransaction = {
      id: "xp-test-manual-large-balance",
      sourceType: "SYSTEM",
      sourceId: "manual-large-balance",
      category: "SYSTEM_ADJUSTMENT",
      amount: 1_000_000,
      occurredAt: state.now,
      reason: "Test-only ledger adjustment.",
      evidenceRefs: [],
      policyVersion: "test",
    };

    state.xpLedger = [...state.xpLedger, extraXp];

    const after = getDashboardProgressionViewModel(state);
    assert.ok(after.currentXp > before.currentXp);
    assert.equal(after.level, before.level);
  });

  it("persists Boss acceptance as active Boss state without awarding XP", () => {
    const state = createDemoEvolveState();
    const app = createEvolveApplication(state);
    const beforeXp = state.xpLedger.length;
    const candidate = testBossCandidate(state.now);

    app.acceptBossChallenge(candidate, state.now);

    const after = app.repositories.getState();
    assert.equal(after.activeBosses.some((boss) => boss.id === candidate.id && boss.status === "ACCEPTED"), true);
    assert.equal(after.xpLedger.length, beforeXp);
  });

  it("target recommendation acceptance versions future targets without rewriting historical evidence", () => {
    const app = createEvolveApplication(createDemoEvolveState());
    const beforeEvidence = app.repositories.getState().evidence.find((item) => item.commitmentId === "commitment-running");
    const recommendation: TargetProgressionRecommendation = {
      id: "target-rec-running-test",
      activityId: "running",
      commitmentId: "commitment-running",
      action: "INCREASE",
      currentTargetValue: 5,
      proposedTargetValue: 6,
      unit: "km",
      sustainableSurplusRatio: 0.2,
      peakSurplusRatio: 0.3,
      confidence: 0.8,
      reason: "Test recommendation.",
      supportingEvidence: ["Stable surplus."],
      userDecisionRequired: true,
      createdAt: "2026-08-28T12:00:00.000Z",
    };

    app.acceptTargetRecommendation(recommendation, "2026-08-28T15:30:00.000Z");

    const commitment = app.repositories.getState().commitments.find((item) => item.id === "commitment-running");
    const afterEvidence = app.repositories.getState().evidence.find((item) => item.id === beforeEvidence?.id);
    assert.equal(commitment?.targetValue, 6);
    assert.equal(commitment?.targetHistory.at(-1)?.previousTargetValue, 5);
    assert.equal(afterEvidence?.targetValue, beforeEvidence?.targetValue);
  });

  it("runs weekly and monthly closeout idempotently", () => {
    const app = createEvolveApplication(createDemoEvolveState());

    app.runWeeklyCloseout("2026-08-29T12:00:00.000Z");
    const afterWeekly = app.repositories.getState();
    app.runWeeklyCloseout("2026-08-29T12:00:00.000Z");
    assert.equal(app.repositories.getState().weeklySnapshots.length, afterWeekly.weeklySnapshots.length);
    assert.equal(app.repositories.getState().xpLedger.length, afterWeekly.xpLedger.length);

    app.runMonthlyCloseout("2026-08-31T12:00:00.000Z");
    const afterMonthly = app.repositories.getState();
    app.runMonthlyCloseout("2026-08-31T12:00:00.000Z");
    assert.equal(app.repositories.getState().monthlySnapshots.length, afterMonthly.monthlySnapshots.length);
    assert.equal(app.repositories.getState().xpLedger.length, afterMonthly.xpLedger.length);
  });

  it("derives reading report and Today reading state from books plus reading evidence", () => {
    const state = createDemoEvolveState();
    state.books = [
      {
        id: "custom-reading-book",
        title: "Custom Reading Book",
        totalPages: 48,
        startedAt: "2026-08-28",
        status: "reading",
      },
    ];
    const reports = getReportsViewModel(state);
    const today = getTodayViewModel(state);

    assert.equal(reports.periods[0]?.reading.currentBook?.book.title, "Custom Reading Book");
    assert.equal(reports.periods[0]?.reading.currentBook?.pagesRemaining, 24);
    assert.equal(today.reading?.bookTitle, "Custom Reading Book");
    assert.equal(today.reading?.pagesRemaining, 24);
  });
});

function testCommitment(id: string, title: string): GrowthCommitment {
  return {
    id,
    title,
    activityKey: "running",
    tier: "core",
    status: "active",
    schedule: { type: "daily" },
    measurementType: "distance",
    targetValue: 3,
    unit: "km",
    startedAt: "2026-08-28",
    targetHistory: [
      {
        id: `target:${id}:initial`,
        activityId: "running",
        commitmentId: id,
        targetValue: 3,
        unit: "km",
        effectiveFrom: "2026-08-28T00:00:00.000Z",
        reason: "INITIAL",
        userDecision: "NOT_APPLICABLE",
        createdAt: "2026-08-28T00:00:00.000Z",
      },
    ],
  };
}

function testBossCandidate(now: string): BossCandidate {
  return {
    id: "boss-running-test",
    family: "ENDURANCE",
    title: "Running Boss Test",
    status: "CANDIDATE",
    reason: {
      category: "SKILL_EVIDENCE",
      summaryKey: "running_boss_test",
      supportingEvidence: ["Recent running evidence supports a test Boss."],
      confidence: 0.8,
      affectedActivityIds: ["running"],
      affectedPillars: ["HEALTH"],
    },
    requirements: [
      {
        activityId: "running",
        pillar: "HEALTH",
        description: "Run at the tested edge.",
        targetValue: 6,
        unit: "km",
        evaluationType: "SINGLE_VALUE",
      },
    ],
    difficulty: "CHALLENGING",
    confidence: 0.8,
    evidenceRefs: ["evidence-running-2026-08-24"],
    evidenceSignature: "running-test-boss-signature",
    generatedAt: now,
    expiresAt: "2026-09-04T16:15:00.000Z",
  };
}
