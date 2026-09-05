import { defaultBossEligibilityPolicy } from "../boss/eligibility";
import { defaultCommitmentCapacityPolicy } from "../capacity/state";
import {
  defaultLevelThresholdPolicy,
  defaultProgressionRatingPolicy,
} from "../progression/policy";
import { defaultRecommendationEnginePolicy } from "../recommendation/engine";
import { defaultTargetProgressionPolicy } from "../target/progression";
import { defaultXpPolicy } from "../xp/policy";
import type { SimulationPolicyOverrides, SimulationPolicySet } from "./types";

export const evolveEnginePolicyRegistry = {
  version: "phase-3.7-audit-registry",
  owners: {
    xp: {
      owner: "domain/evolve-engine/xp",
      policy: defaultXpPolicy,
    },
    progressionRating: {
      owner: "domain/evolve-engine/progression",
      policy: defaultProgressionRatingPolicy,
    },
    levelThresholds: {
      owner: "domain/evolve-engine/progression",
      policy: defaultLevelThresholdPolicy,
    },
    targetProgression: {
      owner: "domain/evolve-engine/target",
      policy: defaultTargetProgressionPolicy,
    },
    bossEligibility: {
      owner: "domain/evolve-engine/boss",
      policy: defaultBossEligibilityPolicy,
    },
    recommendation: {
      owner: "domain/evolve-engine/recommendation",
      policy: defaultRecommendationEnginePolicy,
    },
    commitmentCapacity: {
      owner: "domain/evolve-engine/capacity",
      policy: defaultCommitmentCapacityPolicy,
    },
  },
  invariants: [
    "Lifetime XP is ledger-derived and non-decreasing.",
    "Highest Level is historical and never decreases.",
    "Raw evidence is immutable; interpretation may evolve.",
    "Excluded opportunities are neither success nor failure.",
  ],
} as const;

export function resolveSimulationPolicyVersion(override?: string) {
  return override ?? evolveEnginePolicyRegistry.version;
}

export function createSimulationPolicySet(
  overrides: SimulationPolicyOverrides = {},
): SimulationPolicySet {
  return {
    progressionRating: {
      ...defaultProgressionRatingPolicy,
      ...overrides.progressionRating,
    },
    levelThresholds: {
      ...defaultLevelThresholdPolicy,
      ...overrides.levelThresholds,
    },
    targetProgression: {
      ...defaultTargetProgressionPolicy,
      ...overrides.targetProgression,
    },
    bossEligibility: {
      ...defaultBossEligibilityPolicy,
      ...overrides.bossEligibility,
    },
    recommendation: {
      ...defaultRecommendationEnginePolicy,
      ...overrides.recommendation,
    },
    commitmentCapacity: {
      ...defaultCommitmentCapacityPolicy,
      ...overrides.commitmentCapacity,
    },
  };
}
