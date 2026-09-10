import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createEmptyEvolveState,
  type EvolveLocalState,
  type GrowthCommitment,
} from "@/application/evolve";
import { getScheduledRequirementsForCurrentWeek } from "@/application/evolve/scheduling";
import { defaultUserTimePolicy } from "@/application/evolve/time-policy";
import { evolveEnginePolicyRegistry } from "@/domain/evolve-engine/simulation/policy-registry";
import type {
  AchievementAward,
  ActivityExecutionEvidence,
  BossContract,
  EarnedTitleRecord,
  JourneyProgressionEvent,
  MonthlyDevelopmentSnapshot,
  RecommendationHistoryRecord,
  WeeklyDevelopmentSnapshot,
  XpTransaction,
} from "@/domain/evolve-engine";
import type { ActivityRecord } from "@/types/activity";
import type { Book } from "@/types/book";
import type { LearningTrack } from "@/types/learning-track";
import type { MajorMilestone } from "@/types/major-milestone";
import type { NotepadNote } from "@/types/notepad";
import type { WeeklyReminder } from "@/types/weekly-reminder";
import { toJson, fromJson, type Json } from "./json";
import {
  activityRecordToRow,
  achievementToRow,
  bookToRow,
  bossContractToRow,
  commitmentToRow,
  evidenceToRow,
  journeyEventToRow,
  monthlySnapshotToRow,
  recommendationToRow,
  targetToRow,
  titleToRow,
  weeklyReminderToRow,
  weeklySnapshotToRow,
  scheduledRequirementToRow,
  learningTrackToRow,
  majorMilestoneToRow,
  notepadNoteToRow,
  type DomainIdRow,
  type PayloadRow,
} from "./evolve-mappers";

type SupabaseQueryError = {
  message: string;
  code?: string;
};

type ProfileRow = {
  timezone: string;
  display_name: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goals: unknown;
  evolve_since: string | null;
  onboarding_state: string;
  selected_title_id: string | null;
};

type ProgressionStateRow = {
  current_level: number;
  domain_payload: Json;
};

type CapacityStateRow = {
  domain_payload: Json;
};

export class SupabaseEvolveStateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async ensureProfile(userId: string, timezone = defaultUserTimePolicy.timezone) {
    const existing = await this.client
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .maybeSingle();

    throwIfError(existing.error);

    if (existing.data?.timezone === "UTC" && timezone !== "UTC") {
      const migrated = await this.client
        .from("profiles")
        .update({ timezone })
        .eq("id", userId)
        .select("timezone")
        .single();

      throwIfError(migrated.error);
      return (migrated.data as ProfileRow).timezone;
    }

    const response = await this.client
      .from("profiles")
      .upsert(
        {
          id: userId,
          timezone,
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("timezone")
      .maybeSingle();

    throwIfError(response.error);

    return (response.data as ProfileRow | null)?.timezone ?? timezone;
  }

  async loadState(userId: string, now = new Date().toISOString()): Promise<EvolveLocalState> {
    const profile = await this.getProfile(userId);
    const state = createEmptyEvolveState({
      userId,
      now,
      timezone: profile?.timezone ?? defaultUserTimePolicy.timezone,
    });

    const [
      commitments,
      activityRecords,
      evidence,
      xpLedger,
      weeklyReminders,
      books,
      learningTracks,
      majorMilestones,
      notepadNotes,
      activeBosses,
      recommendations,
      achievements,
      titles,
      journeyEvents,
      weeklySnapshots,
      monthlySnapshots,
      progressionState,
      capacityState,
    ] = await Promise.all([
      this.selectPayloads<GrowthCommitment>("growth_commitments", userId),
      this.selectPayloads<ActivityRecord>("activity_records", userId),
      this.selectPayloads<ActivityExecutionEvidence>("activity_execution_evidence", userId),
      this.selectPayloads<XpTransaction>("xp_transactions", userId),
      this.selectPayloads<WeeklyReminder>("weekly_reminders", userId),
      this.selectPayloads<Book>("books", userId),
      this.selectPayloads<LearningTrack>("learning_tracks", userId),
      this.selectPayloads<MajorMilestone>("major_milestones", userId),
      this.selectPayloads<NotepadNote>("notepad_notes", userId),
      this.selectPayloads<BossContract>("boss_challenges", userId),
      this.selectPayloads<RecommendationHistoryRecord>("recommendations", userId),
      this.selectPayloads<AchievementAward>("achievement_awards", userId),
      this.selectPayloads<EarnedTitleRecord>("title_awards", userId),
      this.selectPayloads<JourneyProgressionEvent>("journey_events", userId),
      this.selectPayloads<WeeklyDevelopmentSnapshot>("weekly_development_snapshots", userId),
      this.selectPayloads<MonthlyDevelopmentSnapshot>("monthly_development_snapshots", userId),
      this.getProgressionState(userId),
      this.getCapacityState(userId),
    ]);

    return {
      ...state,
      profile: profile ? {
        displayName: profile.display_name ?? undefined,
        age: profile.age ?? undefined,
        heightCm: profile.height_cm ?? undefined,
        weightKg: profile.weight_kg ?? undefined,
        goals: Array.isArray(profile.goals)
          ? profile.goals.filter((goal): goal is string => typeof goal === "string")
          : [],
        timezone: profile.timezone,
        evolveSince: profile.evolve_since ?? undefined,
        onboardingState: profile.onboarding_state,
        selectedTitleId: profile.selected_title_id ?? undefined,
      } : state.profile,
      commitments,
      activityRecords,
      evidence,
      xpLedger,
      weeklyReminders,
      books,
      learningTracks,
      majorMilestones,
      notepadNotes,
      activeBosses: activeBosses.filter((boss) =>
        ["OFFERED", "ACCEPTED", "IN_PROGRESS"].includes(boss.status),
      ),
      bossHistory: activeBosses
        .filter((boss) => !["OFFERED", "ACCEPTED", "IN_PROGRESS"].includes(boss.status))
        .map((boss) => ({
          bossId: boss.id,
          family: boss.family,
          status: boss.status,
          difficulty: boss.difficulty,
          offeredAt: boss.offeredAt,
          resolvedAt: boss.completedAt ?? boss.rejectedAt ?? boss.failedAt,
          evidenceSignature: boss.evidenceSignature,
          outcomeQuality: boss.outcomeQuality,
        })),
      recommendations,
      achievements,
      titles,
      journeyEvents,
      weeklySnapshots,
      monthlySnapshots,
      currentLevel: progressionState?.currentLevel ?? state.currentLevel,
      highestLevel: progressionState?.highestLevel ?? state.highestLevel,
      candidate: progressionState?.candidate,
      risk: progressionState?.risk,
      capacity: capacityState ?? state.capacity,
    };
  }

  async saveState(userId: string, state: EvolveLocalState) {
    await this.ensureProfile(userId, state.timePolicy.timezone);
    const commitmentIdMap = await this.persistCommitments(userId, state.commitments);
    await this.persistScheduledRequirements(userId, state, commitmentIdMap);
    await this.upsertPayloadRows(
      "learning_tracks",
      state.learningTracks
        .map((track) => ({
          track,
          commitmentDbId: commitmentIdMap.commitmentIds.get(track.commitmentId),
        }))
        .filter((item): item is { track: EvolveLocalState["learningTracks"][number]; commitmentDbId: string } =>
          Boolean(item.commitmentDbId),
        )
        .map((item) => learningTrackToRow({ userId, ...item })),
      "user_id,domain_id",
    );
    await this.upsertPayloadRows(
      "major_milestones",
      state.majorMilestones
        .map((milestone) => ({
          milestone,
          commitmentDbId: commitmentIdMap.commitmentIds.get(milestone.commitmentId),
        }))
        .filter((item): item is { milestone: EvolveLocalState["majorMilestones"][number]; commitmentDbId: string } =>
          Boolean(item.commitmentDbId),
        )
        .map((item) => majorMilestoneToRow(userId, item.milestone, item.commitmentDbId)),
      "user_id,domain_id",
    );
    await this.upsertPayloadRows(
      "notepad_notes",
      state.notepadNotes.map((note) => notepadNoteToRow(userId, note)),
      "user_id,domain_id",
    );
    const noteDelete = this.client
      .from("notepad_notes")
      .delete()
      .eq("user_id", userId);
    if (state.notepadNotes.length > 0) {
      noteDelete.not(
        "domain_id",
        "in",
        `(${state.notepadNotes.map((note) => `'${note.id.replaceAll("'", "''")}'`).join(",")})`,
      );
    }
    const noteDeleteResponse = await noteDelete;
    throwIfError(noteDeleteResponse.error);
    const learningTrackResponse = await this.client
      .from("learning_tracks")
      .select("id, domain_id")
      .eq("user_id", userId);
    throwIfError(learningTrackResponse.error);
    const learningTrackIds = new Map(
      ((learningTrackResponse.data ?? []) as DomainIdRow[]).map((row) => [row.domain_id, row.id]),
    );

    const activityRows = state.activityRecords.map((record) =>
      activityRecordToRow({
        userId,
        record,
        commitmentDbId: getMappedCommitmentId(
          commitmentIdMap.commitmentIds,
          record.commitmentId ?? commitmentIdFromRecord(state, record),
        ),
        targetVersionDbId: record.targetVersionId
          ? commitmentIdMap.targetIds.get(record.targetVersionId)
          : undefined,
        scheduledRequirementDbId: record.scheduledRequirementId
          ? commitmentIdMap.requirementIds.get(record.scheduledRequirementId)
          : undefined,
        learningTrackDbId: record.learningTrackId
          ? learningTrackIds.get(record.learningTrackId)
          : undefined,
      }),
    );
    await this.upsertPayloadRows("activity_records", activityRows, "user_id,domain_id");
    const activityResponse = await this.client
      .from("activity_records")
      .select("id, domain_id")
      .eq("user_id", userId);
    throwIfError(activityResponse.error);
    const activityIdMap = new Map(
      ((activityResponse.data ?? []) as DomainIdRow[]).map((row) => [row.domain_id, row.id]),
    );

    const reminderDelete = this.client
      .from("weekly_reminders")
      .delete()
      .eq("user_id", userId);
    if (state.weeklyReminders.length > 0) {
      reminderDelete.not(
        "domain_id",
        "in",
        `(${state.weeklyReminders.map((reminder) => `'${reminder.id.replaceAll("'", "''")}'`).join(",")})`,
      );
    }
    const reminderDeleteResponse = await reminderDelete;
    throwIfError(reminderDeleteResponse.error);

    await Promise.all([
      this.upsertPayloadRows(
        "activity_execution_evidence",
        state.evidence.map((item) =>
          evidenceToRow({
            userId,
            evidence: item,
            commitmentDbId: item.commitmentId ? commitmentIdMap.commitmentIds.get(item.commitmentId) : undefined,
            activityRecordDbId: activityIdMap.get(item.id.replace(/^evidence-/, "")),
          }),
        ),
        "id",
      ),
      this.upsertPayloadRows(
        "xp_transactions",
        state.xpLedger.map((transaction) => xpTransactionToOwnedRow(userId, transaction)),
        "id",
      ),
      this.upsertPayloadRows(
        "weekly_reminders",
        state.weeklyReminders.map((reminder) => weeklyReminderToRow(userId, reminder)),
        "user_id,domain_id",
      ),
      this.upsertPayloadRows(
        "books",
        state.books.map((book) => bookToRow(userId, book)),
        "user_id,domain_id",
      ),
      this.upsertPayloadRows(
        "boss_challenges",
        [...state.activeBosses].map((boss) => bossContractToRow(userId, boss)),
        "user_id,domain_id",
      ),
      this.upsertPayloadRows(
        "recommendations",
        state.recommendations.map((recommendation) => recommendationToRow(userId, recommendation)),
        "user_id,domain_id",
      ),
      this.upsertPayloadRows(
        "achievement_awards",
        state.achievements.map((award) => achievementToRow(userId, award)),
        "user_id,domain_id",
      ),
      this.upsertPayloadRows(
        "title_awards",
        state.titles.map((title) => titleToRow(userId, title)),
        "user_id,domain_id",
      ),
      this.upsertPayloadRows(
        "journey_events",
        state.journeyEvents.map((event) => journeyEventToRow(userId, event)),
        "id",
      ),
      this.upsertPayloadRows(
        "weekly_development_snapshots",
        state.weeklySnapshots.map((snapshot) =>
          weeklySnapshotToRow(userId, state.timePolicy.timezone, snapshot),
        ),
        "id",
      ),
      this.upsertPayloadRows(
        "monthly_development_snapshots",
        state.monthlySnapshots.map((snapshot) =>
          monthlySnapshotToRow(userId, state.timePolicy.timezone, snapshot),
        ),
        "id",
      ),
      this.persistProgressionState(userId, state),
      this.persistCapacityState(userId, state),
    ]);
  }

  async saveNotepadNote(userId: string, note: NotepadNote) {
    await this.ensureProfile(userId);
    await this.upsertPayloadRows(
      "notepad_notes",
      [notepadNoteToRow(userId, note)],
      "user_id,domain_id",
    );
  }

  async deleteNotepadNote(userId: string, noteId: string) {
    const response = await this.client
      .from("notepad_notes")
      .delete()
      .eq("user_id", userId)
      .eq("domain_id", noteId);

    throwIfError(response.error);
  }

  async recordCloseout({
    userId,
    periodType,
    periodKey,
    idempotencyKey,
  }: {
    userId: string;
    periodType: "WEEK" | "MONTH";
    periodKey: string;
    idempotencyKey: string;
  }) {
    const response = await this.client
      .from("engine_closeouts")
      .upsert(
        {
          user_id: userId,
          period_type: periodType,
          period_key: periodKey,
          status: "COMPLETED",
          policy_version: evolveEnginePolicyRegistry.version,
          completed_at: new Date().toISOString(),
          idempotency_key: idempotencyKey,
        },
        { onConflict: "user_id,period_type,period_key" },
      );

    throwIfError(response.error);
  }

  private async getProfile(userId: string) {
    const response = await this.client
      .from("profiles")
      .select("timezone, display_name, age, height_cm, weight_kg, goals, evolve_since, onboarding_state, selected_title_id")
      .eq("id", userId)
      .maybeSingle();

    throwIfError(response.error);

    return response.data as ProfileRow | null;
  }

  private async getProgressionState(userId: string) {
    const response = await this.client
      .from("user_progression_state")
      .select("current_level, domain_payload")
      .eq("user_id", userId)
      .maybeSingle();

    throwIfError(response.error);

    const row = response.data as ProgressionStateRow | null;
    return fromJson<Pick<EvolveLocalState, "currentLevel" | "highestLevel" | "candidate" | "risk">>(
      row?.domain_payload,
    );
  }

  private async getCapacityState(userId: string) {
    const response = await this.client
      .from("commitment_capacity_state")
      .select("domain_payload")
      .eq("user_id", userId)
      .maybeSingle();

    throwIfError(response.error);

    const row = response.data as CapacityStateRow | null;
    return fromJson<EvolveLocalState["capacity"]>(row?.domain_payload);
  }

  private async selectPayloads<TValue>(table: string, userId: string): Promise<TValue[]> {
    const response = await this.client
      .from(table)
      .select("domain_payload")
      .eq("user_id", userId);

    throwIfError(response.error);

    const rows = (response.data ?? []) as PayloadRow[];
    return rows
      .map((row) => fromJson<TValue>(row.domain_payload))
      .filter((item): item is TValue => item !== null);
  }

  private async persistCommitments(userId: string, commitments: readonly GrowthCommitment[]) {
    await this.upsertPayloadRows(
      "growth_commitments",
      commitments.map((commitment) => commitmentToRow(userId, commitment)),
      "user_id,domain_id",
    );

    const response = await this.client
      .from("growth_commitments")
      .select("id, domain_id")
      .eq("user_id", userId);

    throwIfError(response.error);

    const rows = (response.data ?? []) as DomainIdRow[];
    const commitmentIds = new Map(rows.map((row) => [row.domain_id, row.id]));
    const targetRows = commitments.flatMap((commitment) => {
      const commitmentDbId = commitmentIds.get(commitment.id);
      if (!commitmentDbId) return [];

      return commitment.targetHistory.map((target, index) =>
        targetToRow({
          userId,
          commitmentDbId,
          target,
          version: index + 1,
        }),
      );
    });

    await this.upsertPayloadRows("commitment_targets", targetRows, "user_id,domain_id");

    const targetResponse = await this.client
      .from("commitment_targets")
      .select("id, domain_id")
      .eq("user_id", userId);
    throwIfError(targetResponse.error);

    return {
      commitmentIds,
      targetIds: new Map(
        ((targetResponse.data ?? []) as DomainIdRow[]).map((row) => [row.domain_id, row.id]),
      ),
      requirementIds: new Map<string, string>(),
    };
  }

  private async persistScheduledRequirements(
    userId: string,
    state: EvolveLocalState,
    ids: {
      commitmentIds: ReadonlyMap<string, string>;
      targetIds: ReadonlyMap<string, string>;
      requirementIds: Map<string, string>;
    },
  ) {
    const rows = getScheduledRequirementsForCurrentWeek(state).flatMap((requirement) => {
      const commitmentDbId = ids.commitmentIds.get(requirement.commitmentId);
      if (!commitmentDbId) return [];
      const targetId = state.commitments
        .find((commitment) => commitment.id === requirement.commitmentId)
        ?.targetHistory.at(-1)?.id;
      return [scheduledRequirementToRow({
        userId,
        requirement,
        commitmentDbId,
        targetVersionDbId: targetId ? ids.targetIds.get(targetId) : undefined,
      })];
    });

    await this.upsertPayloadRows("scheduled_requirements", rows, "user_id,domain_id", true);
    const response = await this.client
      .from("scheduled_requirements")
      .select("id, domain_id")
      .eq("user_id", userId);
    throwIfError(response.error);
    for (const row of (response.data ?? []) as DomainIdRow[]) {
      ids.requirementIds.set(row.domain_id, row.id);
    }
  }

  private async persistProgressionState(userId: string, state: EvolveLocalState) {
    const response = await this.client
      .from("user_progression_state")
      .upsert(
        {
          user_id: userId,
          current_level: state.currentLevel,
          highest_level: state.highestLevel.level,
          candidate_level: state.candidate?.candidateLevel ?? null,
          level_state: state.risk?.status ?? state.candidate?.status ?? "STABLE",
          direction: "UNKNOWN",
          confidence_band: "LIMITED_EVIDENCE",
          current_rating_internal: null,
          current_policy_version: evolveEnginePolicyRegistry.version,
          last_confirmed_at: state.highestLevel.lastReachedAt,
          domain_payload: toJson({
            currentLevel: state.currentLevel,
            highestLevel: state.highestLevel,
            candidate: state.candidate,
            risk: state.risk,
          }),
        },
        { onConflict: "user_id" },
      );

    throwIfError(response.error);
  }

  private async persistCapacityState(userId: string, state: EvolveLocalState) {
    const response = await this.client
      .from("commitment_capacity_state")
      .upsert(
        {
          user_id: userId,
          current_capacity: state.capacity.currentCapacity,
          highest_capacity: state.capacity.highestCapacity,
          candidate_capacity: state.capacity.candidateCapacity ?? null,
          state: state.capacity.status,
          confidence: state.capacity.confidence,
          policy_version: state.capacity.policyVersion,
          domain_payload: toJson(state.capacity),
        },
        { onConflict: "user_id" },
      );

    throwIfError(response.error);
  }

  private async upsertPayloadRows(
    table: string,
    rows: readonly object[],
    onConflict: string,
    ignoreDuplicates = false,
  ) {
    if (rows.length === 0) return;

    const response = await this.client.from(table).upsert(rows, { onConflict, ignoreDuplicates });
    throwIfError(response.error);
  }
}

function xpTransactionToOwnedRow(userId: string, transaction: XpTransaction) {
  return {
    ...xpTransactionToRow(userId, transaction),
    domain_payload: toJson({
      ...transaction,
      userId,
    }),
  };
}

function xpTransactionToRow(userId: string, transaction: XpTransaction) {
  return {
    id: transaction.id,
    user_id: userId,
    source_type: transaction.sourceType,
    source_id: transaction.sourceId,
    category: transaction.category,
    amount: Math.max(0, Math.round(transaction.amount)),
    reason_code: transaction.reason,
    evidence_refs: transaction.evidenceRefs,
    occurred_at: transaction.occurredAt,
    policy_version: transaction.policyVersion,
    domain_payload: toJson(transaction),
  };
}

function commitmentIdFromRecord(state: EvolveLocalState, record: ActivityRecord) {
  const evidence = state.evidence.find((item) => item.occurredAt === record.occurredAt);

  return evidence?.commitmentId;
}

function getMappedCommitmentId(idMap: ReadonlyMap<string, string>, commitmentId: string | undefined) {
  return commitmentId ? idMap.get(commitmentId) : undefined;
}

function throwIfError(error: SupabaseQueryError | null) {
  if (error) {
    throw new Error(error.message);
  }
}
