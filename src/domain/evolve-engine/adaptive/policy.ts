export const defaultAdaptiveIntelligencePolicy = {
  version: "phase-6-adaptive-v1",
  stagnation: {
    minimumConfidence: 0.6,
    minimumSamples: 6,
    minimumConsistency: 0.8,
  },
  breakthrough: {
    minimumConfidence: 0.7,
    minimumSamples: 6,
    minimumQualifyingSamples: 4,
  },
  frontier: {
    surplusMultiplier: 1.08,
    maximumConfidence: 1,
  },
} as const;

export type AdaptiveIntelligencePolicy = typeof defaultAdaptiveIntelligencePolicy;
