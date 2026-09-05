import {
  initialCommitmentCapacityState,
  type HighestLevelRecord,
} from "../../domain/evolve-engine";
import { defaultUserTimePolicy, type UserTimePolicy } from "./time-policy";
import type { EvolveLocalState } from "./types";

export function createEmptyEvolveState({
  userId,
  now = new Date().toISOString(),
  timezone = defaultUserTimePolicy.timezone,
}: {
  userId: string;
  now?: string;
  timezone?: string;
}): EvolveLocalState {
  const highestLevel: HighestLevelRecord = {
    level: 1,
    firstReachedAt: now,
    lastReachedAt: now,
    establishmentStrength: 0,
    durationMaintainedPeriods: 0,
    supportingEvidenceSummary: [],
  };
  const timePolicy: UserTimePolicy = {
    ...defaultUserTimePolicy,
    timezone,
  };

  return {
    userId,
    now,
    timePolicy,
    commitments: [],
    activityRecords: [],
    evidence: [],
    xpLedger: [],
    weeklyReminders: [],
    books: [],
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
    currentLevel: 1,
    highestLevel,
    capacity: initialCommitmentCapacityState(0),
  };
}
