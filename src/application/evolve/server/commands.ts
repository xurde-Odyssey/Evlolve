import "server-only";

import {
  createMemoryEvolveRepositories,
  completeWeeklyReminder,
  createSeriousCommitment,
  getEngineProjection,
  getDashboardViewModel,
  logActivity,
  acceptBossChallenge,
  acceptTargetRecommendation,
  rejectBossChallenge,
  rejectRecommendation,
  runMonthlyCloseout,
  runWeeklyCloseout,
  type ActivityLogInput,
  type GrowthCommitment,
} from "@/application/evolve";
import {
  deriveReadingTargetFromBookHistory,
  type EvolveRecommendation,
  type TargetHistoryRecord,
  type TargetProgressionRecommendation,
} from "@/domain/evolve-engine";
import type { ActivityKey, MeasurementType } from "@/types/activity";
import type { ActivityConfiguration } from "@/types/settings";
import type { Book } from "@/types/book";
import type { Weekday } from "@/application/evolve/types";
import { getLocalDateKey } from "@/application/evolve/time-policy";
import { evolveEnginePolicyRegistry } from "@/domain/evolve-engine/simulation/policy-registry";
import { SupabaseEvolveStateRepository } from "@/infrastructure/supabase/evolve-state-repository";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseAuthorityConfigured } from "@/lib/supabase/env";
import {
  errorResult,
  successResult,
  type EvolveServerActionResult,
} from "./errors";

export type ServerActivityLogInput = ActivityLogInput & {
  idempotencyKey: string;
};

export type ServerActivityLogResponse = {
  xpAwarded: number;
  matchedRequirementCount: number;
  dashboard: ReturnType<typeof getDashboardViewModel>;
};

export type ServerCommandResponse = {
  dashboard: ReturnType<typeof getDashboardViewModel>;
};

export type BookaholicActivationInput = {
  configuration: ActivityConfiguration;
  bookTitle: string;
  totalPages: number;
  recoveryDays: 2 | 3;
};

export async function logActivityAuthoritatively(
  input: ServerActivityLogInput,
): Promise<EvolveServerActionResult<ServerActivityLogResponse>> {
  if (!isSupabaseAuthorityConfigured()) {
    return errorResult("SUPABASE_NOT_CONFIGURED", "Supabase authority is not configured.");
  }

  const user = await requireAuthenticatedUser();
  if (!user) return errorResult("AUTH_REQUIRED", "Sign in before logging activity.");

  if (!input.idempotencyKey || !input.activityKey || !input.measurementType) {
    return errorResult("INVALID_ACTIVITY", "Activity input is incomplete.");
  }

  const repository = new SupabaseEvolveStateRepository(createSupabaseServiceClient());
  const state = await repository.loadState(user.id, new Date().toISOString());
  const memory = createMemoryEvolveRepositories(state);

  const priorRecord = state.activityRecords.find(
    (record) => record.idempotencyKey === input.idempotencyKey,
  );
  if (priorRecord) {
    return successResult({
      xpAwarded: 0,
      matchedRequirementCount: 0,
      dashboard: getDashboardViewModel(state),
    });
  }

  try {
    const result = logActivity(memory, input);
    await repository.saveState(user.id, result.state);

    return successResult({
      xpAwarded: result.xpAwarded,
      matchedRequirementCount: result.matchedRequirementCount,
      dashboard: getDashboardViewModel(result.state),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already recorded")) {
      return successResult({
        xpAwarded: 0,
        matchedRequirementCount: 0,
        dashboard: getDashboardViewModel(state),
      });
    }

    return errorResult("INVALID_ACTIVITY", "Activity could not be recorded.");
  }
}

export async function createCommitmentAuthoritatively(
  commitment: GrowthCommitment,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    createSeriousCommitment(memory, commitment);
  });
}

export async function activateConfiguredActivityAuthoritatively(
  configuration: ActivityConfiguration,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const now = new Date().toISOString();
  const commitmentId = `commitment:${configuration.activityKey}`;

  return mutateState((memory) => {
    const state = memory.getState();
    const existing = state.commitments.find((item) => item.id === commitmentId);

    if (existing) {
      memory.replaceState({
        ...state,
        commitments: state.commitments.map((item) =>
          item.id === commitmentId ? { ...item, status: "active" } : item,
        ),
      });
      return;
    }

    createSeriousCommitment(memory, commitmentFromConfiguration(configuration, now));
  });
}

export async function activateBookaholicAuthoritatively(
  input: BookaholicActivationInput,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  if (input.configuration.activityKey !== "reading") {
    return errorResult("INVALID_ACTIVITY", "Bookaholic activation is only available for reading.");
  }
  if (!input.bookTitle.trim() || !Number.isFinite(input.totalPages) || input.totalPages <= 0) {
    return errorResult("INVALID_ACTIVITY", "Add a book title and a positive page count.");
  }
  if (input.recoveryDays !== 2 && input.recoveryDays !== 3) {
    return errorResult("INVALID_ACTIVITY", "Reading recovery must be 2 or 3 days.");
  }

  const now = new Date().toISOString();
  return mutateState((memory) => {
    const state = memory.getState();
    const commitmentId = `commitment:${input.configuration.activityKey}`;
    const existing = state.commitments.find((item) => item.id === commitmentId);
    const currentTarget = existing?.targetValue ?? 5;
    const target = deriveReadingTargetFromBookHistory(state.books, 5, currentTarget);
    const commitment = existing
      ? {
          ...existing,
          status: "active" as const,
          readingRecoveryDays: input.recoveryDays,
          targetValue: target,
          targetHistory: target === currentTarget
            ? existing.targetHistory
            : [...existing.targetHistory, {
                id: `target:${commitmentId}:${now}`,
                activityId: "reading",
                commitmentId,
                previousTargetValue: currentTarget,
                targetValue: target,
                unit: "pages",
                effectiveFrom: now,
                reason: "SYSTEM_RECOMMENDATION",
                userDecision: "NOT_APPLICABLE",
                createdAt: now,
              } satisfies TargetHistoryRecord],
        }
      : commitmentFromConfiguration(input.configuration, now, target, input.recoveryDays);
    const book: Book = {
      id: `book:${commitmentId}:${now}`,
      title: input.bookTitle.trim(),
      totalPages: Math.round(input.totalPages),
      startedAt: now.slice(0, 10),
      status: "reading",
    };
    memory.replaceState({
      ...state,
      commitments: existing
        ? state.commitments.map((item) => (item.id === commitmentId ? commitment : item))
        : [...state.commitments, commitment],
      books: [...state.books.filter((item) => item.status !== "reading"), book],
    });
  });
}

export async function deactivateConfiguredActivityAuthoritatively(
  activityKey: ActivityKey,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    const state = memory.getState();
    const commitment = state.commitments.find(
      (item) => item.activityKey === activityKey && item.status === "active",
    );

    if (!commitment) {
      throw new Error("Commitment is not currently active.");
    }

    const hasLoggedEvidence = state.activityRecords.some(
      (record) => record.commitmentId === commitment.id,
    ) || state.evidence.some((item) => item.commitmentId === commitment.id);
    const ageInDays = Math.max(
      0,
      (Date.now() - new Date(commitment.startedAt).getTime()) / 86_400_000,
    );

    if (hasLoggedEvidence && ageInDays >= 2) {
      throw new Error("Commitment is locked after two days of logged history.");
    }

    memory.replaceState({
      ...state,
      commitments: state.commitments.map((item) =>
        item.id === commitment.id ? { ...item, status: "inactive" } : item,
      ),
    });
  });
}

export async function completeWeeklyReminderAuthoritatively(
  reminderId: string,
  completedAt = new Date().toISOString(),
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    completeWeeklyReminder(memory, reminderId, completedAt);
  });
}

export async function acceptBossAuthoritatively(
  bossId: string,
  acceptedAt = new Date().toISOString(),
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    const state = memory.getState();
    const candidate = getEngineProjection(state).bossEligibility.candidates.find(
      (item) => item.id === bossId,
    );
    const active = state.activeBosses.find((item) => item.id === bossId);

    const boss = candidate ?? active;

    if (!boss) {
      throw new Error("Boss challenge is not currently acceptable.");
    }

    acceptBossChallenge(memory, boss, acceptedAt);
  });
}

export async function rejectBossAuthoritatively(
  bossId: string,
  rejectedAt = new Date().toISOString(),
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    const state = memory.getState();
    const candidate = getEngineProjection(state).bossEligibility.candidates.find(
      (item) => item.id === bossId,
    );
    const active = state.activeBosses.find((item) => item.id === bossId);

    const boss = candidate ?? active;

    if (!boss) {
      throw new Error("Boss challenge is not currently rejectable.");
    }

    rejectBossChallenge(memory, boss, rejectedAt);
  });
}

export async function acceptTargetRecommendationAuthoritatively(
  recommendation: TargetProgressionRecommendation,
  acceptedAt = new Date().toISOString(),
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    acceptTargetRecommendation(memory, recommendation, acceptedAt);
  });
}

export async function rejectRecommendationAuthoritatively(
  recommendation: EvolveRecommendation,
  rejectedAt = new Date().toISOString(),
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    rejectRecommendation(memory, recommendation, rejectedAt);
  });
}

export async function runWeeklyCloseoutAuthoritatively(
  anchorDate: string,
): Promise<EvolveServerActionResult<{ periodKey: string; policyVersion: string }>> {
  if (!isSupabaseAuthorityConfigured()) {
    return errorResult("SUPABASE_NOT_CONFIGURED", "Supabase authority is not configured.");
  }

  const user = await requireAuthenticatedUser();
  if (!user) return errorResult("AUTH_REQUIRED", "Sign in before running closeout.");

  const repository = new SupabaseEvolveStateRepository(createSupabaseServiceClient());
  const state = await repository.loadState(user.id, anchorDate);
  const memory = createMemoryEvolveRepositories(state);
  const nextState = runWeeklyCloseout(memory, anchorDate);
  const periodKey = getLocalDateKey(anchorDate, state.timePolicy.timezone);

  await repository.saveState(user.id, nextState);
  await repository.recordCloseout({
    userId: user.id,
    periodType: "WEEK",
    periodKey,
    idempotencyKey: `weekly:${anchorDate}:${evolveEnginePolicyRegistry.version}`,
  });

  return successResult({
    periodKey,
    policyVersion: evolveEnginePolicyRegistry.version,
  });
}

export async function runMonthlyCloseoutAuthoritatively(
  anchorDate: string,
): Promise<EvolveServerActionResult<{ periodKey: string; policyVersion: string }>> {
  if (!isSupabaseAuthorityConfigured()) {
    return errorResult("SUPABASE_NOT_CONFIGURED", "Supabase authority is not configured.");
  }

  const user = await requireAuthenticatedUser();
  if (!user) return errorResult("AUTH_REQUIRED", "Sign in before running closeout.");

  const repository = new SupabaseEvolveStateRepository(createSupabaseServiceClient());
  const state = await repository.loadState(user.id, anchorDate);
  const memory = createMemoryEvolveRepositories(state);
  const nextState = runMonthlyCloseout(memory, anchorDate);
  const periodKey = anchorDate.slice(0, 7);

  await repository.saveState(user.id, nextState);
  await repository.recordCloseout({
    userId: user.id,
    periodType: "MONTH",
    periodKey,
    idempotencyKey: `monthly:${anchorDate}:${evolveEnginePolicyRegistry.version}`,
  });

  return successResult({
    periodKey,
    policyVersion: evolveEnginePolicyRegistry.version,
  });
}

async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function mutateState(
  mutate: (memory: ReturnType<typeof createMemoryEvolveRepositories>) => void,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  if (!isSupabaseAuthorityConfigured()) {
    return errorResult("SUPABASE_NOT_CONFIGURED", "Supabase authority is not configured.");
  }

  const user = await requireAuthenticatedUser();
  if (!user) return errorResult("AUTH_REQUIRED", "Sign in before changing Evolve state.");

  try {
    const repository = new SupabaseEvolveStateRepository(createSupabaseServiceClient());
    const state = await repository.loadState(user.id, new Date().toISOString());
    const memory = createMemoryEvolveRepositories(state);
    mutate(memory);
    const nextState = memory.getState();
    await repository.saveState(user.id, nextState);

    return successResult({
      dashboard: getDashboardViewModel(nextState),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("capacity")) {
      return errorResult("CAPACITY_EXCEEDED", "Commitment capacity is full.");
    }

    if (error instanceof Error && error.message.includes("locked")) {
      return errorResult(
        "COMMITMENT_LOCKED",
        "This commitment is protected after two days of logged history.",
      );
    }

    return errorResult("FORBIDDEN", "Evolve state change was rejected.");
  }
}

function commitmentFromConfiguration(
  configuration: ActivityConfiguration,
  startedAt: string,
  targetOverride?: number,
  readingRecoveryDays?: 2 | 3,
): GrowthCommitment {
  const targetValue = targetOverride ?? defaultTargetFor(configuration.activityKey, configuration.measurementType);
  const targetId = `target:commitment:${configuration.activityKey}:initial`;
  const commitmentId = `commitment:${configuration.activityKey}`;

  return {
    id: commitmentId,
    title: configuration.activityLabel,
    activityKey: configuration.activityKey,
    tier: configuration.tier,
    status: "active",
    schedule: scheduleFromConfiguration(configuration),
    measurementType: configuration.measurementType,
    targetValue,
    unit: configuration.unit,
    startedAt,
    ...(readingRecoveryDays ? { readingRecoveryDays } : {}),
    targetHistory: [{
      id: targetId,
      activityId: configuration.activityKey,
      commitmentId,
      targetValue,
      unit: configuration.unit,
      effectiveFrom: startedAt,
      reason: "INITIAL",
      userDecision: "NOT_APPLICABLE",
      createdAt: startedAt,
    }],
  };
}

function scheduleFromConfiguration(
  configuration: ActivityConfiguration,
): GrowthCommitment["schedule"] {
  if (configuration.schedule.type === "daily") return { type: "daily" };
  if (configuration.schedule.type === "times_per_week") return { type: "weekday" };

  return {
    type: "specific_weekdays",
    weekdays: (configuration.schedule.selectedDays ?? []).map(
      (day) => day.toUpperCase() as Weekday,
    ),
  };
}

function defaultTargetFor(activityKey: ActivityKey, measurementType: MeasurementType) {
  const targets: Partial<Record<ActivityKey, number>> = {
    running: 5,
    reading: 5,
    workout: 1,
    coding: 30,
    meditation: 10,
    sleep: 7.5,
    water: 2.5,
  };
  return targets[activityKey] ?? (measurementType === "completion" ? 1 : 1);
}
