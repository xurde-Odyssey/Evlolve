import type {
  BossCandidate,
  BossContract,
  BossDomainEvent,
  BossHistoryRecord,
} from "../types";

export function offerBoss(candidate: BossCandidate, offeredAt = candidate.generatedAt): BossContract {
  return {
    ...candidate,
    status: "OFFERED",
    offeredAt,
    completionEvidenceRefs: [],
  };
}

export function acceptBoss(
  boss: BossCandidate | BossContract,
  acceptedAt: string,
): { boss: BossContract; event: BossDomainEvent } {
  const contract = ensureContract(boss, acceptedAt);
  const accepted: BossContract = {
    ...contract,
    status: "ACCEPTED",
    acceptedAt,
  };

  return {
    boss: accepted,
    event: bossEvent("BOSS_ACCEPTED", accepted, acceptedAt),
  };
}

export function rejectBoss(
  boss: BossCandidate | BossContract,
  rejectedAt: string,
): { boss: BossContract; event: BossDomainEvent; history: BossHistoryRecord } {
  const contract = ensureContract(boss, rejectedAt);
  const rejected: BossContract = {
    ...contract,
    status: "REJECTED",
    rejectedAt,
    outcomeQuality: "NONE",
  };

  return {
    boss: rejected,
    event: bossEvent("BOSS_REJECTED", rejected, rejectedAt),
    history: historyFromBoss(rejected),
  };
}

export function completeBoss(
  boss: BossContract,
  options: {
    completedAt: string;
    actualResult?: number;
    evidenceRefs?: readonly string[];
    frontierExtended?: boolean;
    standardRestored?: boolean;
  },
): { boss: BossContract; event: BossDomainEvent; history: BossHistoryRecord } {
  const completed: BossContract = {
    ...boss,
    status: "COMPLETED",
    completedAt: options.completedAt,
    actualResult: options.actualResult,
    completionEvidenceRefs: [...(options.evidenceRefs ?? [])],
    outcomeQuality: options.frontierExtended
      ? "FRONTIER_EXTENDED"
      : options.standardRestored
        ? "STANDARD_RESTORED"
        : "QUALIFIED",
  };

  return {
    boss: completed,
    event: bossEvent("BOSS_COMPLETED", completed, options.completedAt),
    history: historyFromBoss(completed),
  };
}

export function failBoss(
  boss: BossContract,
  options: {
    failedAt: string;
    actualResult?: number;
    evidenceRefs?: readonly string[];
    meaningfulEffort?: boolean;
  },
): { boss: BossContract; event: BossDomainEvent; history: BossHistoryRecord } {
  const failed: BossContract = {
    ...boss,
    status: "FAILED",
    failedAt: options.failedAt,
    actualResult: options.actualResult,
    completionEvidenceRefs: [...(options.evidenceRefs ?? [])],
    outcomeQuality: options.meaningfulEffort ? "PARTIAL_EFFORT" : "NONE",
  };

  return {
    boss: failed,
    event: bossEvent("BOSS_FAILED", failed, options.failedAt),
    history: historyFromBoss(failed),
  };
}

export function expireBoss(
  boss: BossContract,
  expiredAt: string,
): { boss: BossContract; event: BossDomainEvent; history: BossHistoryRecord } {
  const expired: BossContract = {
    ...boss,
    status: "EXPIRED",
  };

  return {
    boss: expired,
    event: bossEvent("BOSS_EXPIRED", expired, expiredAt),
    history: historyFromBoss(expired, expiredAt),
  };
}

function ensureContract(boss: BossCandidate | BossContract, timestamp: string): BossContract {
  if ("offeredAt" in boss) {
    return boss;
  }

  return offerBoss(boss, timestamp);
}

function bossEvent(
  type: BossDomainEvent["type"],
  boss: BossContract,
  occurredAt: string,
): BossDomainEvent {
  return {
    id: `${type.toLowerCase()}-${boss.id}-${occurredAt}`,
    type,
    occurredAt,
    bossId: boss.id,
    family: boss.family,
    evidenceRefs: [...boss.evidenceRefs, ...boss.completionEvidenceRefs],
  };
}

function historyFromBoss(boss: BossContract, resolvedAt?: string): BossHistoryRecord {
  const firstRequirement = boss.requirements[0];

  return {
    bossId: boss.id,
    family: boss.family,
    activityId: firstRequirement?.activityId ? String(firstRequirement.activityId) : undefined,
    pillar: firstRequirement?.pillar,
    status: boss.status,
    difficulty: boss.difficulty,
    offeredAt: boss.offeredAt,
    resolvedAt:
      resolvedAt ?? boss.completedAt ?? boss.failedAt ?? boss.rejectedAt ?? boss.expiresAt,
    evidenceSignature: boss.evidenceSignature,
    outcomeQuality: boss.outcomeQuality,
  };
}
