import type {
  AchievementAward,
  BossHistoryRecord,
  CommitmentCapacityState,
  JourneyProgressionEvent,
  LevelProgressionState,
} from "../types";

export function createJourneyEvents({
  achievements = [],
  bossHistory = [],
  levelState,
  capacity,
  existingEvents = [],
  now,
  policyVersion,
}: {
  achievements?: readonly AchievementAward[];
  bossHistory?: readonly BossHistoryRecord[];
  levelState?: LevelProgressionState | null;
  capacity?: CommitmentCapacityState;
  existingEvents?: readonly JourneyProgressionEvent[];
  now: string;
  policyVersion: string;
}): JourneyProgressionEvent[] {
  const existingIds = new Set(existingEvents.map((event) => event.id));
  const events: JourneyProgressionEvent[] = [];

  for (const achievement of achievements) {
    if (!achievement.major) {
      continue;
    }

    events.push({
      id: `journey-achievement-${achievement.id}`,
      type: "MAJOR_ACHIEVEMENT",
      occurredAt: achievement.earnedAt,
      title: achievement.name,
      description: "Major achievement earned.",
      sourceId: achievement.id,
      evidenceRefs: achievement.supportingEvidence,
      policyVersion,
    });
  }

  for (const boss of bossHistory) {
    if (boss.status === "COMPLETED" && boss.outcomeQuality === "FRONTIER_EXTENDED") {
      events.push({
        id: `journey-boss-${boss.bossId}`,
        type: "BOSS_BREAKTHROUGH",
        occurredAt: boss.resolvedAt ?? now,
        title: "Boss breakthrough",
        description: "A Boss Challenge extended the demonstrated frontier.",
        sourceId: boss.bossId,
        evidenceRefs: [boss.evidenceSignature],
        policyVersion,
      });
    }
  }

  if (levelState?.events.some((event) => event.type === "LEVEL_CONFIRMED")) {
    events.push({
      id: `journey-level-${levelState.currentLevel}`,
      type: "LEVEL_MILESTONE_CONFIRMED",
      occurredAt: now,
      title: `Level ${levelState.currentLevel} confirmed`,
      sourceId: `level-${levelState.currentLevel}`,
      evidenceRefs: levelState.events.flatMap((event) => event.evidenceRefs),
      policyVersion,
    });
  }

  if (levelState?.recovery.recoveryState === "PREVIOUS_STANDARD_RESTORED") {
    events.push({
      id: `journey-recovery-${levelState.highestLevel.level}`,
      type: "PREVIOUS_STANDARD_RECOVERED",
      occurredAt: now,
      title: "Previous standard restored",
      sourceId: `recovery-${levelState.highestLevel.level}`,
      evidenceRefs: levelState.highestLevel.supportingEvidenceSummary,
      policyVersion,
    });
  }

  if (capacity?.status === "STABLE" && capacity.currentCapacity === capacity.highestCapacity && capacity.highestCapacity > 3) {
    events.push({
      id: `journey-capacity-${capacity.currentCapacity}`,
      type: "COMMITMENT_CAPACITY_UNLOCKED",
      occurredAt: now,
      title: `Commitment capacity ${capacity.currentCapacity} unlocked`,
      description: "Additional responsibility was earned through sustained execution.",
      sourceId: `capacity-${capacity.currentCapacity}`,
      evidenceRefs: [capacity.reason],
      policyVersion,
    });
  }

  return events.filter((event) => !existingIds.has(event.id));
}
