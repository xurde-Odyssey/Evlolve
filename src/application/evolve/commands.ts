import {
  acceptBoss,
  appendXpTransactions,
  classifyExecution,
  createEvidenceFromActivityRecord,
  createExecutionXpTransaction,
  processMonthlyCloseout,
  processWeeklyCloseout,
  rejectBoss,
  startTargetAdaptation,
  type BossCandidate,
  type BossContract,
  type EvolveRecommendation,
  type MonthlyEvaluationRecord,
  type TargetHistoryRecord,
  type TargetProgressionRecommendation,
} from "../../domain/evolve-engine";
import { activityDefinitions } from "../../config/activity-definitions";
import type { ActivityRecord } from "../../types/activity";
import type { WeeklyReminder } from "../../types/weekly-reminder";
import { createMemoryEvolveRepositories, type EvolveLocalRepositories } from "./repositories";
import {
  deadlineStateForRequirement,
  findRequirementForActivity,
  getEvidenceForRequirement,
  getScheduledRequirementsForDate,
} from "./scheduling";
import type {
  ActivityLogInput,
  ActivityLogResult,
  EvolveLocalState,
  GrowthCommitment,
} from "./types";
import { EvolveCommandError } from "./types";

export function createEvolveApplication(initialState: EvolveLocalState) {
  const repositories = createMemoryEvolveRepositories(initialState);

  return {
    repositories,
    logActivity: (input: ActivityLogInput) => logActivity(repositories, input),
    completeWeeklyReminder: (id: string, completedAt: string) =>
      completeWeeklyReminder(repositories, id, completedAt),
    acceptBossChallenge: (boss: BossCandidate | BossContract, acceptedAt: string) =>
      acceptBossChallenge(repositories, boss, acceptedAt),
    rejectBossChallenge: (boss: BossCandidate | BossContract, rejectedAt: string) =>
      rejectBossChallenge(repositories, boss, rejectedAt),
    createSeriousCommitment: (commitment: GrowthCommitment) =>
      createSeriousCommitment(repositories, commitment),
    acceptTargetRecommendation: (
      recommendation: TargetProgressionRecommendation,
      acceptedAt: string,
    ) => acceptTargetRecommendation(repositories, recommendation, acceptedAt),
    rejectRecommendation: (recommendation: EvolveRecommendation, rejectedAt: string) =>
      rejectRecommendation(repositories, recommendation, rejectedAt),
    runWeeklyCloseout: (anchorDate: string) => runWeeklyCloseout(repositories, anchorDate),
    runMonthlyCloseout: (anchorDate: string) => runMonthlyCloseout(repositories, anchorDate),
  };
}

export function logActivity(
  repositories: EvolveLocalRepositories,
  input: ActivityLogInput,
): ActivityLogResult {
  const state = repositories.getState();
  const definition = activityDefinitions.find((item) => item.key === input.activityKey);
  const unit = input.unit ?? definition?.measurementOptions.find((item) => item.type === input.measurementType)?.unit;
  const record: ActivityRecord = {
    id: `activity:${input.activityKey}:${input.occurredAt}:${input.value ?? "completed"}`,
    idempotencyKey: input.idempotencyKey,
    activityKey: input.activityKey,
    activityLabel: definition?.label ?? input.activityKey,
    measurement: {
      type: input.measurementType,
      value: input.value,
      unit,
    },
    notes: input.notes?.trim() || undefined,
    occurredAt: input.occurredAt,
    status: "completed",
  };

  if (state.activityRecords.some((item) => item.id === record.id)) {
    throw new EvolveCommandError("DUPLICATE_ACTIVITY_EVIDENCE", "This activity was already recorded.");
  }

  const requirement = findRequirementForActivity(state, input.activityKey, input.occurredAt);
  if (requirement) {
    record.commitmentId = requirement.commitmentId;
    record.scheduledRequirementId = requirement.id;
    record.targetVersionId = state.commitments
      .find((commitment) => commitment.id === requirement.commitmentId)
      ?.targetHistory.at(-1)?.id;
  }
  const evidence = requirement
    ? createEvidenceForRequirement(record, state, requirement)
    : [
        createEvidenceFromActivityRecord(record, {
          requirementState: "NO_REQUIREMENT",
          deadlineState: "NO_DEADLINE",
        }),
      ];
  const xpTransactions = evidence.map((item) =>
    createExecutionXpTransaction({
      evidence: item,
      commitmentTier: commitmentTierForXp(
        state.commitments.find((commitment) => commitment.id === item.commitmentId)?.tier,
      ),
    }),
  );
  const xpLedger = appendXpTransactions(state.xpLedger, xpTransactions);
  const xpAwarded =
    xpLedger.reduce((total, transaction) => total + transaction.amount, 0) -
    state.xpLedger.reduce((total, transaction) => total + transaction.amount, 0);
  const nextBooks = state.books.map((book) => {
    if (input.activityKey !== "reading" || book.status !== "reading") return book;

    const pagesRead = [...state.evidence, ...evidence]
      .filter((item) => item.activityId === "reading")
      .filter((item) => String(item.occurredAt ?? item.scheduledFor ?? item.createdAt) >= book.startedAt)
      .reduce((total, item) => total + (item.actualValue ?? 0), 0);

    return pagesRead >= book.totalPages
      ? { ...book, status: "completed" as const, finishedAt: input.occurredAt.slice(0, 10) }
      : book;
  });
  const nextState = {
    ...state,
    activityRecords: [record, ...state.activityRecords],
    evidence: [...state.evidence, ...evidence],
    xpLedger,
    books: nextBooks,
  };

  repositories.replaceState(nextState);

  return {
    state: nextState,
    record,
    evidence,
    xpAwarded,
    matchedRequirementCount: evidence.filter((item) =>
      ["FULL", "QUALIFYING_PARTIAL"].includes(item.executionState),
    ).length,
  };
}

export function completeWeeklyReminder(
  repositories: EvolveLocalRepositories,
  id: string,
  completedAt: string,
) {
  const state = repositories.getState();
  const weeklyReminders = state.weeklyReminders.map((reminder): WeeklyReminder =>
    reminder.id === id
      ? {
          ...reminder,
          completed: true,
          completedAt,
        }
      : reminder,
  );
  const nextState = {
    ...state,
    weeklyReminders,
  };

  repositories.replaceState(nextState);

  return nextState;
}

export function acceptBossChallenge(
  repositories: EvolveLocalRepositories,
  boss: BossCandidate | BossContract,
  acceptedAt: string,
) {
  const state = repositories.getState();
  const accepted = acceptBoss(boss, acceptedAt);

  repositories.replaceState({
    ...state,
    activeBosses: upsertById(state.activeBosses, accepted.boss),
  });

  return accepted;
}

export function rejectBossChallenge(
  repositories: EvolveLocalRepositories,
  boss: BossCandidate | BossContract,
  rejectedAt: string,
) {
  const state = repositories.getState();
  const rejected = rejectBoss(boss, rejectedAt);

  repositories.replaceState({
    ...state,
    activeBosses: state.activeBosses.filter((item) => item.id !== rejected.boss.id),
    bossHistory: [...state.bossHistory, rejected.history],
  });

  return rejected;
}

export function createSeriousCommitment(
  repositories: EvolveLocalRepositories,
  commitment: GrowthCommitment,
) {
  const state = repositories.getState();
  const activeSerious = state.commitments.filter(
    (item) => item.status === "active" && item.tier !== "flexible",
  ).length;

  if (commitment.tier !== "flexible" && activeSerious >= state.capacity.currentCapacity) {
    throw new EvolveCommandError(
      "CAPACITY_EXCEEDED",
      "Commitment capacity is full for serious commitments.",
    );
  }

  const nextState = {
    ...state,
    commitments: [...state.commitments, commitment],
  };
  repositories.replaceState(nextState);

  return nextState;
}

export function acceptTargetRecommendation(
  repositories: EvolveLocalRepositories,
  recommendation: TargetProgressionRecommendation,
  acceptedAt: string,
) {
  const state = repositories.getState();
  const commitmentIndex = state.commitments.findIndex(
    (commitment) => commitment.id === recommendation.commitmentId,
  );

  if (commitmentIndex < 0 || recommendation.action !== "INCREASE") {
    throw new EvolveCommandError("INVALID_TARGET_CHANGE", "Target change is not acceptable.");
  }

  const commitment = state.commitments[commitmentIndex];
  if (!commitment) {
    throw new EvolveCommandError("INVALID_TARGET_CHANGE", "Target change is not acceptable.");
  }
  const targetValue = recommendation.proposedTargetValue ?? recommendation.currentTargetValue;
  const targetRecord: TargetHistoryRecord = {
    id: `target:${commitment.id}:${acceptedAt}`,
    activityId: commitment.activityKey,
    commitmentId: commitment.id,
    previousTargetValue: recommendation.currentTargetValue,
    targetValue,
    unit: recommendation.unit ?? commitment.unit,
    effectiveFrom: acceptedAt,
    reason: "USER_ACCEPTED_RECOMMENDATION",
    recommendationRef: recommendation.id,
    userDecision: "ACCEPTED",
    createdAt: acceptedAt,
  };
  const targetHistory = [
    ...commitment.targetHistory,
    targetRecord,
  ];
  const nextCommitments = [...state.commitments];
  nextCommitments[commitmentIndex] = {
    ...commitment,
    targetValue,
    targetHistory,
  };
  const adaptation = startTargetAdaptation({
    id: `adapt:${recommendation.id}`,
    activityId: String(recommendation.activityId),
    previousTargetValue: recommendation.currentTargetValue,
    newTargetValue: targetValue,
    unit: recommendation.unit ?? commitment.unit,
    startedAt: acceptedAt,
    recommendationRef: recommendation.id,
  });
  const nextState = {
    ...state,
    commitments: nextCommitments,
    targetAdaptations: [...state.targetAdaptations, adaptation],
    recommendations: upsertRecommendationDecision(state.recommendations, {
      id: recommendation.id,
      category: "INCREASE_TARGET",
      status: "ACCEPTED",
      createdAt: recommendation.createdAt,
      resolvedAt: acceptedAt,
      evidenceSignature: recommendation.id,
    }),
  };
  repositories.replaceState(nextState);

  return nextState;
}

export function rejectRecommendation(
  repositories: EvolveLocalRepositories,
  recommendation: EvolveRecommendation,
  rejectedAt: string,
) {
  const state = repositories.getState();
  const nextState = {
    ...state,
    recommendations: upsertRecommendationDecision(state.recommendations, {
      id: recommendation.id,
      category: recommendation.category,
      status: "REJECTED",
      createdAt: recommendation.createdAt,
      resolvedAt: rejectedAt,
      evidenceSignature: recommendation.evidenceSignature,
    }),
  };

  repositories.replaceState(nextState);

  return nextState;
}

export function runWeeklyCloseout(
  repositories: EvolveLocalRepositories,
  anchorDate: string,
) {
  const state = repositories.getState();
  const result = processWeeklyCloseout(createCloseoutInput(state, anchorDate));

  if (state.weeklySnapshots.some((snapshot) => snapshot.id === result.idempotencyKey)) {
    return state;
  }

  const nextState: EvolveLocalState = {
    ...state,
    xpLedger: appendXpTransactions(state.xpLedger, result.xpTransactions),
    capacity: result.capacity,
    weeklySnapshots: result.weeklySnapshot
      ? [...state.weeklySnapshots, result.weeklySnapshot]
      : state.weeklySnapshots,
  };

  repositories.replaceState(nextState);

  return nextState;
}

export function runMonthlyCloseout(
  repositories: EvolveLocalRepositories,
  anchorDate: string,
) {
  const state = repositories.getState();
  const monthlyEvaluation = createMonthlyEvaluation(state, anchorDate);
  const monthlyEvaluations = state.monthlyEvaluations.some((item) => item.id === monthlyEvaluation.id)
    ? state.monthlyEvaluations
    : [...state.monthlyEvaluations, monthlyEvaluation];
  const result = processMonthlyCloseout(
    createCloseoutInput(
      {
        ...state,
        monthlyEvaluations,
      },
      anchorDate,
    ),
  );

  if (state.monthlySnapshots.some((snapshot) => snapshot.id === result.idempotencyKey)) {
    return state;
  }

  const nextState: EvolveLocalState = {
    ...state,
    monthlyEvaluations,
    xpLedger: appendXpTransactions(state.xpLedger, result.xpTransactions),
    achievements: mergeByKey(state.achievements, result.achievementsEarned, (item) => item.definitionId),
    journeyEvents: mergeByKey(state.journeyEvents, result.journeyEvents, (item) => item.id),
    capacity: result.capacity,
    monthlySnapshots: result.monthlySnapshot
      ? [...state.monthlySnapshots, result.monthlySnapshot]
      : state.monthlySnapshots,
  };

  repositories.replaceState(nextState);

  return nextState;
}

function createEvidenceForRequirement(
  record: ActivityRecord,
  state: EvolveLocalState,
  requirement: ReturnType<typeof getScheduledRequirementsForDate>[number],
) {
  if (requirement.exclusionState !== "NONE") {
    return [
      createEvidenceFromActivityRecord(record, {
        commitmentId: requirement.commitmentId,
        scheduledFor: requirement.scheduledDate,
        targetValue: requirement.targetValue,
        requirementState: "EXCLUDED",
        exclusionState: requirement.exclusionState,
        deadlineState: "NO_DEADLINE",
      }),
    ];
  }

  const deadlineState = deadlineStateForRequirement(requirement, record.occurredAt);

  if (deadlineState === "ON_TIME") {
    return [
      createEvidenceFromActivityRecord(record, {
        commitmentId: requirement.commitmentId,
        scheduledFor: requirement.scheduledDate,
        targetValue: requirement.targetValue,
        deadlineState,
      }),
    ];
  }

  const existingRequirementEvidence = getEvidenceForRequirement(state.evidence, requirement);
  const missedEvidence = existingRequirementEvidence.some((item) => item.executionState === "MISSED")
    ? []
    : [
        classifyExecution({
          id: `missed:${requirement.id}`,
          activityId: requirement.activityKey,
          commitmentId: requirement.commitmentId,
          scheduledFor: requirement.scheduledDate,
          targetValue: requirement.targetValue,
          unit: requirement.unit,
          measurementType: requirement.measurementType,
          requirementState: "MISSED",
          deadlineState: "AFTER_DEADLINE",
          source: "SYSTEM_DERIVED",
          evidenceQuality: "STANDARD",
          createdAt: requirement.deadlineAt,
        }),
      ];
  const factualLateEvidence = createEvidenceFromActivityRecord(record, {
    commitmentId: requirement.commitmentId,
    scheduledFor: requirement.scheduledDate,
    targetValue: requirement.targetValue,
    requirementState: "NO_REQUIREMENT",
    deadlineState: "AFTER_DEADLINE",
  });

  return [...missedEvidence, factualLateEvidence];
}

function commitmentTierForXp(tier: GrowthCommitment["tier"] | undefined) {
  if (tier === "core" || tier === "priority") return tier;
  return "flexible";
}

function createCloseoutInput(state: EvolveLocalState, anchorDate: string) {
  const activeCommitments = state.commitments.filter((commitment) => commitment.status === "active");

  return {
    evidence: state.evidence,
    anchorDate,
    activityIds: activeCommitments.map((commitment) => commitment.activityKey),
    targetValues: Object.fromEntries(
      activeCommitments.map((commitment) => [
        commitment.activityKey,
        commitment.targetHistory.at(-1)?.targetValue ?? commitment.targetValue,
      ]),
    ),
    currentLevel: state.currentLevel,
    highestLevel: state.highestLevel,
    candidate: state.candidate,
    risk: state.risk,
    monthlyEvaluations: state.monthlyEvaluations,
    existingXpLedger: state.xpLedger,
    existingAchievements: state.achievements,
    existingJourneyEvents: state.journeyEvents,
    previousCapacity: state.capacity,
    activeCommitmentCount: activeCommitments.filter((commitment) => commitment.tier !== "flexible").length,
    bossHistory: state.bossHistory,
  };
}

function createMonthlyEvaluation(
  state: EvolveLocalState,
  anchorDate: string,
): MonthlyEvaluationRecord {
  const monthKey = anchorDate.slice(0, 7);
  const monthEvidence = state.evidence.filter((item) =>
    String(item.scheduledFor ?? item.createdAt).startsWith(monthKey),
  );
  const eligible = monthEvidence.filter((item) => item.requirementState !== "EXCLUDED");
  const credit = eligible.reduce((total, item) => total + (item.commitmentFulfillment ?? 0), 0);
  const ratio = eligible.length === 0 ? null : credit / eligible.length;
  const outcome =
    ratio === null
      ? "PASS"
      : ratio >= 0.97
        ? "FULL_COMPLETION"
        : ratio >= 0.86
          ? "STRONG_PASS"
          : ratio >= 0.68
            ? "PASS"
            : "FAIL";

  return {
    id: `month:${monthKey}`,
    period: monthKey,
    outcome,
    confidence: eligible.length === 0 ? 0.45 : Math.min(0.95, eligible.length / 20),
    evidenceRefs: monthEvidence.map((item) => item.id),
  };
}

function upsertById<TItem extends { id: string }>(
  items: readonly TItem[],
  item: TItem,
) {
  return items.some((current) => current.id === item.id)
    ? items.map((current) => current.id === item.id ? item : current)
    : [...items, item];
}

function upsertRecommendationDecision(
  records: EvolveLocalState["recommendations"],
  record: EvolveLocalState["recommendations"][number],
) {
  return records.some((item) => item.id === record.id)
    ? records.map((item) => item.id === record.id ? record : item)
    : [...records, record];
}

function mergeByKey<TItem>(
  existing: readonly TItem[],
  incoming: readonly TItem[],
  key: (item: TItem) => string,
) {
  const keys = new Set(existing.map(key));
  const next = [...existing];

  for (const item of incoming) {
    const itemKey = key(item);
    if (!keys.has(itemKey)) {
      keys.add(itemKey);
      next.push(item);
    }
  }

  return next;
}
