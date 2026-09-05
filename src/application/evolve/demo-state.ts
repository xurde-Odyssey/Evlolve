import {
  appendXpTransactions,
  classifyExecution,
  createExecutionXpTransaction,
  initialCommitmentCapacityState,
  type HighestLevelRecord,
  type TargetHistoryRecord,
  type XpTransaction,
} from "../../domain/evolve-engine";
import { demoPersona } from "../../lib/demo/demo-persona";
import type { ActivityRecord } from "../../types/activity";
import type { Book } from "../../types/book";
import type { WeeklyReminder } from "../../types/weekly-reminder";
import { defaultUserTimePolicy } from "./time-policy";
import type { EvolveLocalState, GrowthCommitment } from "./types";

const demoNow = "2026-08-28T15:33:00.000Z";

export function createDemoEvolveState(): EvolveLocalState {
  const commitments = createDemoCommitments();
  const activityRecords = createDemoActivityRecords();
  const evidence = [
    classifyExecution({
      id: "evidence-running-2026-08-24",
      activityId: "running",
      commitmentId: "commitment-running",
      scheduledFor: "2026-08-24",
      occurredAt: "2026-08-24T01:20:00.000Z",
      targetValue: 5,
      actualValue: 5.2,
      unit: "km",
      measurementType: "distance",
      deadlineState: "ON_TIME",
      source: "MANUAL",
      evidenceQuality: "STANDARD",
      createdAt: "2026-08-24T01:20:00.000Z",
    }),
    classifyExecution({
      id: "evidence-running-2026-08-26",
      activityId: "running",
      commitmentId: "commitment-running",
      scheduledFor: "2026-08-26",
      occurredAt: "2026-08-26T01:10:00.000Z",
      targetValue: 5,
      actualValue: 4.1,
      unit: "km",
      measurementType: "distance",
      deadlineState: "ON_TIME",
      source: "MANUAL",
      evidenceQuality: "STANDARD",
      createdAt: "2026-08-26T01:10:00.000Z",
    }),
    classifyExecution({
      id: "evidence-reading-2026-08-28",
      activityId: "reading",
      commitmentId: "commitment-reading",
      scheduledFor: "2026-08-28",
      occurredAt: "2026-08-28T12:25:00.000Z",
      targetValue: 5,
      actualValue: 24,
      unit: "pages",
      measurementType: "pages",
      deadlineState: "ON_TIME",
      source: "MANUAL",
      evidenceQuality: "STANDARD",
      createdAt: "2026-08-28T12:25:00.000Z",
    }),
    classifyExecution({
      id: "evidence-water-2026-08-28",
      activityId: "water",
      commitmentId: "commitment-water",
      scheduledFor: "2026-08-28",
      occurredAt: "2026-08-28T10:00:00.000Z",
      targetValue: 2.5,
      actualValue: 2.5,
      unit: "L",
      measurementType: "volume",
      deadlineState: "ON_TIME",
      source: "MANUAL",
      evidenceQuality: "STANDARD",
      createdAt: "2026-08-28T10:00:00.000Z",
    }),
  ];
  const xpFromEvidence = appendXpTransactions(
    [],
    evidence.map((item) =>
      createExecutionXpTransaction({
        evidence: item,
        commitmentTier: commitments.find((commitment) => commitment.id === item.commitmentId)?.tier ?? "flexible",
      }),
    ),
  );
  const xpLedger = appendXpTransactions(xpFromEvidence, [
    {
      id: "xp-system-demo-opening-balance",
      sourceType: "SYSTEM",
      sourceId: "demo-opening-balance",
      category: "SYSTEM_ADJUSTMENT",
      amount: Math.max(
        demoPersona.totalXp - xpFromEvidence.reduce((total, transaction) => total + transaction.amount, 0),
        0,
      ),
      occurredAt: "2026-08-01T00:00:00.000Z",
      reason: "Demo opening balance from prior local history.",
      evidenceRefs: [],
      policyVersion: "phase-3.8-local-demo",
    } satisfies XpTransaction,
  ]);
  const highestLevel: HighestLevelRecord = {
    level: demoPersona.highestLevel,
    firstReachedAt: "2026-07-01T00:00:00.000Z",
    lastReachedAt: "2026-08-10T00:00:00.000Z",
    establishmentStrength: 0.72,
    durationMaintainedPeriods: 5,
    supportingEvidenceSummary: ["Local demo history imported as preserved historical state."],
  };

  return {
    userId: "demo-user",
    now: demoNow,
    timePolicy: defaultUserTimePolicy,
    commitments,
    activityRecords,
    evidence,
    xpLedger,
    weeklyReminders: createDemoWeeklyReminders(),
    books: createDemoBooks(),
    activeBosses: [],
    bossHistory: [],
    recommendations: [],
    targetAdaptations: [],
    achievements: [],
    titles: [],
    journeyEvents: [],
    weeklySnapshots: [],
    monthlySnapshots: [],
    monthlyEvaluations: [],
    currentLevel: demoPersona.currentLevel,
    highestLevel,
    capacity: {
      ...initialCommitmentCapacityState(3),
      currentCapacity: 4,
      highestCapacity: 4,
      canAddCommitment: true,
      status: "STABLE",
      reason: "Demo state uses confirmed Phase 3.6 capacity.",
    },
  };
}

function createDemoBooks(): Book[] {
  return [
    {
      id: "atomic-habits",
      title: "Atomic Habits",
      totalPages: 320,
      startedAt: "2026-08-17",
      status: "reading",
    },
    {
      id: "deep-work",
      title: "Deep Work",
      totalPages: 296,
      startedAt: "2026-08-01",
      finishedAt: "2026-08-12",
      status: "completed",
    },
  ];
}

function createDemoCommitments(): GrowthCommitment[] {
  return [
    commitment("commitment-running", "Running", "running", "core", 5, "km", "distance", {
      type: "specific_weekdays",
      weekdays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
    }),
    commitment("commitment-reading", "Bookaholic", "reading", "core", 5, "pages", "pages", {
      type: "daily",
    }),
    commitment("commitment-workout", "Workout", "workout", "priority", 1, "session", "completion", {
      type: "specific_weekdays",
      weekdays: ["TUESDAY", "THURSDAY"],
    }),
    {
      ...commitment("commitment-meditation", "Mental Training", "meditation", "flexible", 10, "minutes", "duration", {
        type: "weekday",
      }),
      inactiveUntil: "2026-08-30",
    },
    commitment("commitment-water", "Deep Work", "water", "flexible", 2.5, "L", "volume", {
      type: "daily",
    }),
  ];
}

function commitment(
  id: string,
  title: string,
  activityKey: GrowthCommitment["activityKey"],
  tier: GrowthCommitment["tier"],
  targetValue: number,
  unit: string,
  measurementType: GrowthCommitment["measurementType"],
  schedule: GrowthCommitment["schedule"],
): GrowthCommitment {
  const targetHistory: TargetHistoryRecord[] = [
    {
      id: `target:${id}:initial`,
      activityId: activityKey,
      commitmentId: id,
      targetValue,
      unit,
      effectiveFrom: "2026-08-01T00:00:00.000Z",
      reason: "INITIAL",
      userDecision: "NOT_APPLICABLE",
      createdAt: "2026-08-01T00:00:00.000Z",
    },
  ];

  return {
    id,
    title,
    activityKey,
    tier,
    status: "active",
    schedule,
    measurementType,
    targetValue,
    unit,
    startedAt: "2026-08-01",
    targetHistory,
  };
}

function createDemoActivityRecords(): ActivityRecord[] {
  return [
    {
      id: "activity-reading-2026-08-28",
      activityKey: "reading",
      activityLabel: "Bookaholic",
      measurement: { type: "pages", value: 24, unit: "pages" },
      occurredAt: "2026-08-28T12:25:00.000Z",
      status: "completed",
    },
    {
      id: "activity-water-2026-08-28",
      activityKey: "water",
      activityLabel: "Deep Work",
      measurement: { type: "volume", value: 2.5, unit: "L" },
      occurredAt: "2026-08-28T10:00:00.000Z",
      status: "completed",
    },
    {
      id: "activity-running-2026-08-26",
      activityKey: "running",
      activityLabel: "Running",
      measurement: { type: "distance", value: 4.1, unit: "km" },
      notes: "Qualifying partial preserved from the real record.",
      occurredAt: "2026-08-26T01:10:00.000Z",
      status: "completed",
    },
  ];
}

function createDemoWeeklyReminders(): WeeklyReminder[] {
  return [
    {
      id: "linkedin",
      title: "Post on LinkedIn",
      enabled: true,
      completed: false,
      createdAt: "2026-08-23",
      completedAt: null,
    },
    {
      id: "friend",
      title: "Meet a friend",
      enabled: true,
      completed: false,
      createdAt: "2026-08-23",
      completedAt: null,
    },
    {
      id: "workspace",
      title: "Clean workspace",
      enabled: true,
      completed: true,
      createdAt: "2026-08-23",
      completedAt: "2026-08-27",
    },
  ];
}
