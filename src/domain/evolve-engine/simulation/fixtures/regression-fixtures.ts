export type RegressionFixture = {
  scenarioId: string;
  duration: string;
  expectedLevelBand: readonly [number, number];
  requiredWarnings?: readonly string[];
  forbiddenWarnings?: readonly string[];
  requiredCoreWeakness?: boolean;
  maxSurplusXpRatio?: number;
};

export const phase37RegressionFixtures = [
  {
    scenarioId: "ideal-disciplined-beginner",
    duration: "3m",
    expectedLevelBand: [1, 8],
    forbiddenWarnings: ["LEVEL_GROWTH_TOO_FAST"],
  },
  {
    scenarioId: "static-easy-standard",
    duration: "12m",
    expectedLevelBand: [1, 10],
    forbiddenWarnings: ["LEVEL_GROWTH_TOO_FAST"],
  },
  {
    scenarioId: "collapsing-core-commitment",
    duration: "6m",
    expectedLevelBand: [1, 8],
    requiredCoreWeakness: true,
  },
  {
    scenarioId: "extreme-activity-farmer",
    duration: "6m",
    expectedLevelBand: [1, 10],
    maxSurplusXpRatio: 0.6,
  },
  {
    scenarioId: "strong-social-strong-execution",
    duration: "6m",
    expectedLevelBand: [1, 12],
    forbiddenWarnings: ["SOCIAL_ACTIVITY_PENALIZED_WITHOUT_EVIDENCE"],
  },
] satisfies RegressionFixture[];

export function findRegressionFixture(scenarioId: string) {
  return phase37RegressionFixtures.find((fixture) => fixture.scenarioId === scenarioId) ?? null;
}
