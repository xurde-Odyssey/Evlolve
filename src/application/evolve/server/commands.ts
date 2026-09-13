import "server-only";

import {
  createMemoryEvolveRepositories,
  completeWeeklyReminder,
  createSeriousCommitment,
  createLearningTrack,
  createMajorMilestoneCommand,
  createNotepadNote,
  updateNotepadNote,
  deleteNotepadNote,
  getEngineProjection,
  getDashboardViewModel,
  logActivity,
  acceptBossChallenge,
  acceptTargetRecommendation,
  rejectBossChallenge,
  rejectRecommendation,
  runMonthlyCloseout,
  runWeeklyCloseout,
  setLearningTrackStatus,
  type ActivityLogInput,
  type GrowthCommitment,
} from "@/application/evolve";
import {
  deriveReadingTargetFromBookHistory,
  type EvolveRecommendation,
  type TargetHistoryRecord,
  type TargetProgressionRecommendation,
  evaluateBehaviorBoundary,
  defaultBehaviorBoundaryPolicy,
  type BehaviorBoundary,
  type BehaviorBoundaryMode,
  type BehaviorOccurrence,
  type BehaviorType,
} from "@/domain/evolve-engine";
import type { ActivityKey, ActivityRecord, MeasurementType } from "@/types/activity";
import type { ActivityConfiguration } from "@/types/settings";
import type { Book } from "@/types/book";
import type { WeeklyReminder } from "@/types/weekly-reminder";
import type { Weekday } from "@/application/evolve/types";
import type { CreateLearningTrackInput } from "@/application/evolve/commands";
import type { CreateMajorMilestoneInput } from "@/application/evolve/commands";
import type { CreateNotepadNoteInput, UpdateNotepadNoteInput } from "@/application/evolve/commands";
import type { NotepadNote } from "@/types/notepad";
import { getLocalDateKey } from "@/application/evolve/time-policy";
import { evolveEnginePolicyRegistry } from "@/domain/evolve-engine/simulation/policy-registry";
import { SupabaseEvolveStateRepository } from "@/infrastructure/supabase/evolve-state-repository";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseAuthorityConfigured } from "@/lib/supabase/env";
import { lookupBookMetadata } from "@/lib/books/open-library";
import {
  errorResult,
  successResult,
  type EvolveServerActionResult,
} from "./errors";

export type ServerActivityLogInput = ActivityLogInput & {
  idempotencyKey: string;
};

export type ServerActivityLogResponse = {
  record?: ActivityRecord;
  xpAwarded: number;
  matchedRequirementCount: number;
  dashboard: ReturnType<typeof getDashboardViewModel>;
};

export type ServerCommandResponse = {
  dashboard: ReturnType<typeof getDashboardViewModel>;
  notepadNote?: NotepadNote;
};

export type BookaholicActivationInput = {
  configuration: ActivityConfiguration;
  bookTitle: string;
  totalPages: number;
  recoveryDays: 2 | 3;
};

export type ProfileUpdateInput = {
  name: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  goals?: string[];
};

export type WeeklyReminderInput = Pick<WeeklyReminder, "id" | "title" | "enabled">;

export type LearningTrackInput = CreateLearningTrackInput;
export type MajorMilestoneInput = CreateMajorMilestoneInput;
export type NotepadNoteInput = CreateNotepadNoteInput;
export type NotepadNoteUpdateInput = UpdateNotepadNoteInput;

export type BehaviorBoundaryInput = {
  behaviorType: BehaviorType;
  label?: string;
  intent: "QUIT" | "REDUCE" | "CONTEXT_ONLY";
  mode: BehaviorBoundaryMode;
  limitConfig?: BehaviorBoundary["limitConfig"];
  replaceBoundaryId?: string;
};

export type BehaviorOccurrenceInput = {
  idempotencyKey: string;
  behaviorType: BehaviorType;
  occurredAt: string;
  quantity?: number;
  unit?: string;
  tags?: string[];
  notes?: string;
};

export type BehaviorOccurrenceCorrection = "CORRECTED" | "VOIDED";

export async function createBehaviorBoundaryAuthoritatively(
  input: BehaviorBoundaryInput,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    const state = memory.getState();
    const activeBoundaries = state.behaviorBoundaries.filter((boundary) => ["ACTIVE", "ESTABLISHED", "REOPENED"].includes(boundary.status));
    const existing = activeBoundaries.find((boundary) => boundary.behaviorType === input.behaviorType);
    if (existing && existing.id !== input.replaceBoundaryId) {
      throw new Error("active boundary already exists");
    }
    const seriousActiveCount = activeBoundaries.filter((boundary) => boundary.category === "RESTRICTED").length;
    if (!existing && input.intent !== "CONTEXT_ONLY" && seriousActiveCount >= defaultBehaviorBoundaryPolicy.maxActiveBoundaries) {
      throw new Error("boundary capacity reached");
    }
    const now = new Date().toISOString();
    const previousVersions = state.behaviorBoundaries.filter((item) => item.behaviorType === input.behaviorType);
    const boundary: BehaviorBoundary = {
      id: `boundary:${input.behaviorType.toLowerCase()}:${now}`,
      behaviorType: input.behaviorType,
      label: input.label?.trim() || behaviorLabel(input.behaviorType),
      category: input.behaviorType === "SOCIAL_OUTING" ? "CONTEXTUAL" : "RESTRICTED",
      intent: input.intent,
      mode: input.mode,
      limitConfig: input.limitConfig ?? {},
      status: "ACTIVE",
      startedAt: now,
      version: previousVersions.reduce((highest, item) => Math.max(highest, item.version), 0) + 1,
      createdAt: now,
      updatedAt: now,
    };
    memory.replaceState({
      ...state,
      behaviorBoundaries: [
        ...state.behaviorBoundaries.map((item) =>
          item.behaviorType === boundary.behaviorType && ["ACTIVE", "ESTABLISHED", "REOPENED"].includes(item.status)
            ? { ...item, status: "DEACTIVATED" as const, updatedAt: now }
            : item,
        ),
        boundary,
      ],
    });
    return boundary;
  });
}

export async function correctBehaviorOccurrenceAuthoritatively(
  occurrenceId: string,
  correction: BehaviorOccurrenceCorrection,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    const state = memory.getState();
    const occurrence = state.behaviorOccurrences.find((item) => item.id === occurrenceId);
    if (!occurrence || occurrence.status !== "ACTIVE") throw new Error("behavior occurrence not found");
    const nextOccurrences = state.behaviorOccurrences.map((item) =>
      item.id === occurrenceId ? { ...item, status: correction, correctedAt: new Date().toISOString() } : item,
    );
    const boundary = occurrence.boundaryId
      ? state.behaviorBoundaries.find((item) => item.id === occurrence.boundaryId)
      : undefined;
    const recalculated = boundary
      ? nextOccurrences.map((item) => {
        if (item.boundaryId !== boundary.id || item.status !== "ACTIVE") return item;
        return {
          ...item,
          evaluation: evaluateBehaviorBoundary({
            boundary,
            occurrences: nextOccurrences,
            occurredAt: item.occurredAt,
          }),
        };
      })
      : nextOccurrences;
    memory.replaceState({ ...state, behaviorOccurrences: recalculated });
  });
}

export async function logBehaviorOccurrenceAuthoritatively(
  input: BehaviorOccurrenceInput,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    const state = memory.getState();
    if (state.behaviorOccurrences.some((occurrence) => occurrence.idempotencyKey === input.idempotencyKey)) return;
    const now = new Date().toISOString();
    const boundary = state.behaviorBoundaries
      .filter((item) => item.behaviorType === input.behaviorType && ["ACTIVE", "ESTABLISHED", "REOPENED"].includes(item.status))
      .sort((a, b) => b.version - a.version)[0];
    const base: BehaviorOccurrence = {
      id: `behavior:${input.behaviorType.toLowerCase()}:${input.idempotencyKey}`,
      behaviorType: input.behaviorType,
      category: input.behaviorType === "SOCIAL_OUTING" ? "CONTEXTUAL" : "RESTRICTED",
      occurredAt: input.occurredAt,
      quantity: input.quantity,
      unit: input.unit,
      tags: input.tags,
      notes: input.notes,
      source: "MANUAL",
      status: "ACTIVE",
      boundaryId: boundary?.id,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
    };
    const evaluation = boundary
      ? evaluateBehaviorBoundary({ boundary, occurrences: [...state.behaviorOccurrences, base], occurredAt: input.occurredAt })
      : { status: "NO_ACTIVE_BOUNDARY" as const, usage: 0, periodKey: "none", evidenceRefs: [], adherencePercent: null };
    memory.replaceState({
      ...state,
      behaviorOccurrences: [...state.behaviorOccurrences, { ...base, evaluation }],
    });
  });
}

function behaviorLabel(type: BehaviorType) {
  return {
    DRINKING: "Drinking",
    SMOKING: "Puffing",
    LATE_NIGHT: "Late Night",
    SOCIAL_OUTING: "Social Outing",
    CUSTOM: "Behavior",
  }[type];
}

export async function createNotepadNoteAuthoritatively(input: NotepadNoteInput): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateNotepadState((memory) => createNotepadNote(memory, input));
}

export async function updateNotepadNoteAuthoritatively(id: string, input: NotepadNoteUpdateInput): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateNotepadState((memory) => updateNotepadNote(memory, id, input));
}

export async function deleteNotepadNoteAuthoritatively(id: string): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateNotepadState((memory) => { deleteNotepadNote(memory, id); return id; }, id);
}

export async function createMajorMilestoneAuthoritatively(
  input: MajorMilestoneInput,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    createMajorMilestoneCommand(memory, input);
  });
}

export async function createLearningTrackAuthoritatively(
  input: LearningTrackInput,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    createLearningTrack(memory, input);
  });
}

export async function completeLearningTrackAuthoritatively(
  trackId: string,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    setLearningTrackStatus(memory, trackId, "completed");
  });
}

export async function archiveLearningTrackAuthoritatively(
  trackId: string,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    setLearningTrackStatus(memory, trackId, "archived");
  });
}

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
      record: priorRecord,
      xpAwarded: 0,
      matchedRequirementCount: 0,
      dashboard: getDashboardViewModel(state),
    });
  }

  try {
    const result = logActivity(memory, input);
    await repository.saveState(user.id, result.state);

    return successResult({
      record: result.record,
      xpAwarded: result.xpAwarded,
      matchedRequirementCount: result.matchedRequirementCount,
      dashboard: getDashboardViewModel(result.state),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already recorded")) {
      return successResult({
        record: priorRecord,
        xpAwarded: 0,
        matchedRequirementCount: 0,
        dashboard: getDashboardViewModel(state),
      });
    }

    return errorResult("INVALID_ACTIVITY", "Activity could not be recorded.");
  }
}

export async function updateProfileAuthoritatively(
  input: ProfileUpdateInput,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const user = await requireAuthenticatedUser();
  if (!user) return errorResult("AUTH_REQUIRED", "Sign in before updating your profile.");
  if (!input.name.trim()) return errorResult("INVALID_PROFILE", "Name is required.");
  if (input.age !== undefined && (!Number.isInteger(input.age) || input.age < 0 || input.age > 130)) {
    return errorResult("INVALID_PROFILE", "Age must be between 0 and 130.");
  }
  if (input.heightCm !== undefined && input.heightCm <= 0) {
    return errorResult("INVALID_PROFILE", "Height must be positive.");
  }
  if (input.weightKg !== undefined && input.weightKg <= 0) {
    return errorResult("INVALID_PROFILE", "Weight must be positive.");
  }

  const serviceClient = createSupabaseServiceClient();
  const response = await serviceClient.from("profiles").update({
    display_name: input.name.trim(),
    age: input.age ?? null,
    height_cm: input.heightCm ?? null,
    weight_kg: input.weightKg ?? null,
    goals: input.goals?.map((goal) => goal.trim()).filter(Boolean) ?? [],
  }).eq("id", user.id);
  if (response.error) return errorResult("INVALID_PROFILE", "Profile could not be updated.");

  const state = await new SupabaseEvolveStateRepository(serviceClient).loadState(user.id);
  return successResult({ dashboard: getDashboardViewModel(state) });
}

export async function selectTitleAuthoritatively(
  titleId: string,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const user = await requireAuthenticatedUser();
  if (!user) return errorResult("AUTH_REQUIRED", "Sign in before selecting a title.");
  const serviceClient = createSupabaseServiceClient();
  const repository = new SupabaseEvolveStateRepository(serviceClient);
  const state = await repository.loadState(user.id);
  const title = state.titles.find((item) => item.id === titleId);
  if (!title) {
    return errorResult("TITLE_NOT_ELIGIBLE", "That title is not currently eligible.");
  }
  const titleRow = await serviceClient.from("title_awards").select("id").eq("user_id", user.id).eq("domain_id", titleId).maybeSingle();
  if (titleRow.error || !titleRow.data) return errorResult("TITLE_NOT_ELIGIBLE", "That title is not currently eligible.");
  const response = await serviceClient.from("profiles").update({ selected_title_id: titleRow.data.id }).eq("id", user.id);
  if (response.error) return errorResult("TITLE_NOT_ELIGIBLE", "Title selection could not be saved.");
  return successResult({ dashboard: getDashboardViewModel(await repository.loadState(user.id)) });
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

export async function updateConfiguredActivityAuthoritatively(
  configuration: ActivityConfiguration,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    const state = memory.getState();
    const commitment = state.commitments.find(
      (item) => item.activityKey === configuration.activityKey,
    );

    if (!commitment) {
      throw new Error("Commitment is not currently configured.");
    }

    memory.replaceState({
      ...state,
      commitments: state.commitments.map((item) =>
        item.id === commitment.id
          ? {
              ...item,
              title: configuration.activityLabel,
              measurementType: configuration.measurementType,
              unit: configuration.unit,
              schedule: scheduleFromConfiguration(configuration),
            }
          : item,
      ),
    });
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
  const metadata = await lookupBookMetadata(input.bookTitle);
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
      metadata,
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

export async function saveWeeklyRemindersAuthoritatively(
  reminders: WeeklyReminderInput[],
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  return mutateState((memory) => {
    const state = memory.getState();
    const activeCount = reminders.filter((reminder) => reminder.enabled).length;

    if (reminders.length > 3 || activeCount > 3) {
      throw new Error("Weekly reminder limit exceeded.");
    }

    const existingById = new Map(state.weeklyReminders.map((reminder) => [reminder.id, reminder]));
    const nextReminders = reminders.map((input, index) => {
      const title = input.title.trim();
      if (!title) throw new Error("Reminder name is required.");

      const existing = existingById.get(input.id);
      return existing
        ? { ...existing, title, enabled: input.enabled }
        : {
            id: input.id || `weekly-reminder:${state.userId}:${index + 1}`,
            title,
            enabled: input.enabled,
            completed: false,
            createdAt: state.now,
            completedAt: null,
          };
    });

    memory.replaceState({ ...state, weeklyReminders: nextReminders });
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
  mutate: (memory: ReturnType<typeof createMemoryEvolveRepositories>) => unknown,
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
    const mutationResult = mutate(memory);
    const nextState = memory.getState();
    await repository.saveState(user.id, nextState);

    const response: ServerCommandResponse = {
      dashboard: getDashboardViewModel(nextState),
    };
    if (mutationResult && typeof mutationResult === "object" && "id" in mutationResult) {
      response.notepadNote = mutationResult as NotepadNote;
    }
    return successResult(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes("capacity")) {
      return errorResult("CAPACITY_EXCEEDED", "Commitment capacity is full.");
    }

    if (error instanceof Error && error.message.includes("active boundary")) {
      return errorResult("FORBIDDEN", "An active boundary already exists for this behavior. Edit the existing boundary instead.");
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

async function mutateNotepadState(
  mutate: (memory: ReturnType<typeof createMemoryEvolveRepositories>) => unknown,
  deletedNoteId?: string,
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
    const mutationResult = mutate(memory);
    const nextState = memory.getState();

    if (deletedNoteId) {
      await repository.deleteNotepadNote(user.id, deletedNoteId);
    } else if (mutationResult && typeof mutationResult === "object" && "id" in mutationResult) {
      await repository.saveNotepadNote(user.id, mutationResult as NotepadNote);
    }

    const response: ServerCommandResponse = {
      dashboard: getDashboardViewModel(nextState),
    };
    if (!deletedNoteId && mutationResult && typeof mutationResult === "object" && "id" in mutationResult) {
      response.notepadNote = mutationResult as NotepadNote;
    }
    return successResult(response);
  } catch {
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
  if (configuration.schedule.type === "times_per_week") {
    return {
      type: "times_per_week",
      timesPerWeek: configuration.schedule.timesPerWeek ?? 1,
    };
  }

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
