import { evolveEnginePolicyRegistry } from "@/domain/evolve-engine/simulation/policy-registry";
import type {
  AchievementAward,
  ActivityExecutionEvidence,
  BossContract,
  BossHistoryRecord,
  EarnedTitleRecord,
  JourneyProgressionEvent,
  MonthlyDevelopmentSnapshot,
  RecommendationHistoryRecord,
  WeeklyDevelopmentSnapshot,
  XpTransaction,
} from "@/domain/evolve-engine";
import type { ActivityRecord } from "@/types/activity";
import type { Book } from "@/types/book";
import type { WeeklyReminder } from "@/types/weekly-reminder";
import type { GrowthCommitment } from "@/application/evolve";
import type { ScheduledRequirement } from "@/application/evolve";
import { toJson, type Json } from "./json";

export type PayloadRow = {
  domain_payload: Json;
};

export type DomainIdRow = {
  id: string;
  domain_id: string;
};

export function commitmentToRow(userId: string, commitment: GrowthCommitment) {
  return {
    domain_id: commitment.id,
    user_id: userId,
    name: commitment.title,
    activity_type: commitment.activityKey,
    category: commitment.activityKey,
    tier: commitment.tier.toUpperCase(),
    status: commitment.status.toUpperCase(),
    measurement_type: commitment.measurementType,
    unit: commitment.unit,
    schedule_config: toJson(commitment.schedule),
    started_at: commitment.startedAt,
    completed_at: commitment.completedAt ?? null,
    domain_payload: toJson(commitment),
    metadata: toJson({}),
  };
}

export function targetToRow({
  userId,
  commitmentDbId,
  target,
  version,
}: {
  userId: string;
  commitmentDbId: string;
  target: GrowthCommitment["targetHistory"][number];
  version: number;
}) {
  return {
    domain_id: target.id,
    user_id: userId,
    commitment_id: commitmentDbId,
    version,
    target_value: target.targetValue,
    unit: target.unit,
    effective_from: target.effectiveFrom,
    effective_until: null,
    source: target.reason,
    recommendation_id: null,
    adaptation_state: null,
    policy_version: evolveEnginePolicyRegistry.version,
    domain_payload: toJson(target),
    metadata: toJson({ userDecision: target.userDecision ?? null }),
  };
}

export function activityRecordToRow({
  userId,
  record,
  commitmentDbId,
  targetVersionDbId,
  scheduledRequirementDbId,
  idempotencyKey,
}: {
  userId: string;
  record: ActivityRecord;
  commitmentDbId?: string;
  targetVersionDbId?: string;
  scheduledRequirementDbId?: string;
  idempotencyKey?: string;
}) {
  return {
    domain_id: record.id,
    user_id: userId,
    commitment_id: commitmentDbId ?? null,
    target_version_id: targetVersionDbId ?? null,
    scheduled_requirement_id: scheduledRequirementDbId ?? null,
    occurred_at: record.occurredAt,
    actual_value: record.measurement.value ?? null,
    unit: record.measurement.unit ?? null,
    measurement_type: record.measurement.type,
    source: "MANUAL",
    evidence_quality: "STANDARD",
    execution_state: record.status.toUpperCase(),
    deadline_state: null,
    record_status: "ACTIVE",
    idempotency_key: idempotencyKey ?? record.idempotencyKey ?? record.id,
    policy_version: evolveEnginePolicyRegistry.version,
    domain_payload: toJson(record),
    metadata: toJson({ notesPresent: Boolean(record.notes) }),
  };
}

export function scheduledRequirementToRow({
  userId,
  requirement,
  commitmentDbId,
  targetVersionDbId,
}: {
  userId: string;
  requirement: ScheduledRequirement;
  commitmentDbId: string;
  targetVersionDbId?: string;
}) {
  return {
    domain_id: requirement.id,
    user_id: userId,
    commitment_id: commitmentDbId,
    target_version_id: targetVersionDbId ?? null,
    scheduled_date: requirement.scheduledDate,
    timezone: requirement.timezone,
    deadline_at: requirement.deadlineAt,
    requirement_state: "PENDING",
    exclusion_type: requirement.exclusionState === "INACTIVE"
      ? "GLOBAL_INACTIVE"
      : requirement.exclusionState === "READING_RECOVERY"
        ? "READING_RECOVERY"
        : null,
    domain_payload: toJson(requirement),
  };
}

export function evidenceToRow({
  userId,
  evidence,
  commitmentDbId,
  activityRecordDbId,
}: {
  userId: string;
  evidence: ActivityExecutionEvidence;
  commitmentDbId?: string;
  activityRecordDbId?: string;
}) {
  return {
    id: evidence.id,
    user_id: userId,
    activity_record_id: activityRecordDbId ?? null,
    commitment_id: commitmentDbId ?? null,
    activity_type: String(evidence.activityId),
    scheduled_for: evidence.scheduledFor ?? null,
    occurred_at: evidence.occurredAt ?? null,
    target_value: evidence.targetValue ?? null,
    actual_value: evidence.actualValue ?? null,
    unit: evidence.unit ?? null,
    measurement_type: evidence.measurementType ?? null,
    source: evidence.source,
    evidence_quality: evidence.evidenceQuality,
    requirement_state: evidence.requirementState,
    exclusion_state: evidence.exclusionState,
    execution_state: evidence.executionState,
    deadline_state: evidence.deadlineState,
    policy_version: evolveEnginePolicyRegistry.version,
    domain_payload: toJson(evidence),
  };
}

export function xpTransactionToRow(userId: string, transaction: XpTransaction) {
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

export function weeklyReminderToRow(userId: string, reminder: WeeklyReminder) {
  return {
    domain_id: reminder.id,
    user_id: userId,
    name: reminder.title,
    enabled: reminder.enabled,
    cycle_state: reminder.enabled ? reminder.completed ? "COMPLETED" : "PENDING" : "OFF",
    completed_cycle_key: null,
    completed_at: reminder.completedAt ?? null,
    domain_payload: toJson(reminder),
  };
}

export function bookToRow(userId: string, book: Book) {
  return {
    domain_id: book.id,
    user_id: userId,
    title: book.title,
    total_pages: book.totalPages,
    status: book.status.toUpperCase(),
    started_at: book.startedAt,
    finished_at: book.finishedAt ?? null,
    domain_payload: toJson(book),
  };
}

export function bossContractToRow(userId: string, boss: BossContract) {
  return {
    domain_id: boss.id,
    user_id: userId,
    boss_type: boss.family,
    status: boss.status,
    title: boss.title,
    description: boss.reason.summaryKey,
    reason_code: boss.reason.category,
    difficulty_class: boss.difficulty,
    affected_activity_ids: boss.requirements.map((item) => String(item.activityId)),
    affected_pillars: [],
    offered_at: boss.offeredAt,
    accepted_at: boss.acceptedAt ?? null,
    deadline_at: boss.expiresAt ?? null,
    completed_at: boss.completedAt ?? null,
    rejected_at: boss.rejectedAt ?? null,
    failed_at: boss.failedAt ?? null,
    policy_version: evolveEnginePolicyRegistry.version,
    reason_snapshot: toJson({ evidenceSignature: boss.evidenceSignature }),
    target_config: toJson({ requirements: boss.requirements }),
    domain_payload: toJson(boss),
    metadata: toJson({}),
  };
}

export function bossHistoryToContract(history: BossHistoryRecord): BossContract {
  return {
    id: history.bossId,
    family: history.family,
    title: history.bossId,
    status: history.status,
    reason: {
      category: "SKILL_EVIDENCE",
      summaryKey: history.evidenceSignature,
      supportingEvidence: [],
      confidence: 0,
      affectedActivityIds: history.activityId ? [history.activityId] : [],
      affectedPillars: history.pillar ? [history.pillar] : [],
    },
    requirements: [],
    difficulty: history.difficulty,
    confidence: 0,
    evidenceRefs: [],
    evidenceSignature: history.evidenceSignature,
    generatedAt: history.offeredAt,
    offeredAt: history.offeredAt,
    rejectedAt: history.status === "REJECTED" ? history.resolvedAt : undefined,
    completedAt: history.status === "COMPLETED" ? history.resolvedAt : undefined,
    failedAt: history.status === "FAILED" ? history.resolvedAt : undefined,
    completionEvidenceRefs: [],
    outcomeQuality: history.outcomeQuality,
  };
}

export function recommendationToRow(userId: string, recommendation: RecommendationHistoryRecord) {
  return {
    domain_id: recommendation.id,
    user_id: userId,
    type: recommendation.category,
    status: recommendation.status,
    priority_class: null,
    reason: recommendation.evidenceSignature,
    affected_commitment_id: null,
    affected_activity_id: null,
    proposed_change: toJson({}),
    analysis_snapshot: toJson({ evidenceSignature: recommendation.evidenceSignature }),
    policy_version: evolveEnginePolicyRegistry.version,
    domain_payload: toJson(recommendation),
    metadata: toJson({}),
    accepted_at: recommendation.status === "ACCEPTED" ? recommendation.resolvedAt ?? null : null,
    rejected_at: recommendation.status === "REJECTED" ? recommendation.resolvedAt ?? null : null,
  };
}

export function achievementToRow(userId: string, award: AchievementAward) {
  return {
    domain_id: award.id,
    user_id: userId,
    achievement_key: award.key,
    tier: award.tier ?? null,
    earned_at: award.earnedAt,
    policy_version: award.policyVersion,
    source_type: "ENGINE",
    source_id: award.definitionId,
    evidence_snapshot: toJson({ supportingEvidence: award.supportingEvidence }),
    major: award.major,
    domain_payload: toJson(award),
  };
}

export function titleToRow(userId: string, title: EarnedTitleRecord) {
  return {
    domain_id: title.id,
    user_id: userId,
    title_key: title.titleKey,
    earned_at: title.earnedAt,
    active: true,
    policy_version: evolveEnginePolicyRegistry.version,
    domain_payload: toJson(title),
  };
}

export function journeyEventToRow(userId: string, event: JourneyProgressionEvent) {
  return {
    id: event.id,
    user_id: userId,
    event_type: event.type,
    title: event.title,
    description: event.description ?? null,
    occurred_at: event.occurredAt,
    source_type: "ENGINE",
    source_id: event.sourceId,
    major: true,
    policy_version: event.policyVersion,
    domain_payload: toJson(event),
    metadata: toJson({ evidenceRefs: event.evidenceRefs }),
  };
}

export function weeklySnapshotToRow(userId: string, timezone: string, snapshot: WeeklyDevelopmentSnapshot) {
  return {
    id: snapshot.id,
    user_id: userId,
    week_key: snapshot.periodStart,
    week_start: snapshot.periodStart,
    week_end: snapshot.periodEnd,
    timezone,
    consistency_summary: toJson(snapshot.consistency),
    rating_summary: toJson(snapshot.progressionRating),
    current_level: snapshot.level.currentLevel,
    highest_level: snapshot.level.highestLevel,
    capacity: snapshot.commitmentCapacity.currentCapacity,
    xp_earned: snapshot.xpEarned,
    policy_version: snapshot.policyVersion,
    domain_payload: toJson(snapshot),
  };
}

export function monthlySnapshotToRow(userId: string, timezone: string, snapshot: MonthlyDevelopmentSnapshot) {
  return {
    id: snapshot.id,
    user_id: userId,
    month_key: snapshot.periodStart.slice(0, 7),
    month_start: snapshot.periodStart,
    month_end: snapshot.periodEnd,
    timezone,
    commitment_outcomes: toJson(snapshot.monthlyOutcomes),
    consistency_summary: toJson(snapshot.consistency),
    output_summary: toJson({
      expectedOutput: snapshot.consistency.expectedOutput,
      rawActualOutput: snapshot.consistency.rawActualOutput,
      effectiveOutput: snapshot.consistency.effectiveOutput,
    }),
    gap_summary: toJson(snapshot.activityStates.map((item) => item.gapClassification)),
    capability_summary: toJson(snapshot.activityStates.map((item) => item.capability)),
    core_weakness_summary: toJson(snapshot.coreWeaknesses),
    behavior_summary: toJson(snapshot.behavioralFriction ?? {}),
    pillar_summary: toJson(snapshot.pillarStates),
    rating_summary: toJson(snapshot.progressionRating),
    level_summary: toJson(snapshot.level),
    xp_summary: toJson({ xpEarned: snapshot.xpEarned }),
    achievements_summary: toJson(snapshot.achievementsEarned),
    boss_summary: toJson(snapshot.bossOutcomes),
    recommendation_summary: toJson(snapshot.recommendations),
    analysis: toJson({}),
    policy_version: snapshot.policyVersion,
    domain_payload: toJson(snapshot),
  };
}
