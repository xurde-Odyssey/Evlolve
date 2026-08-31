import { createProgressionXpTransaction, defaultXpPolicy, type XpPolicy } from "../xp/policy";
import { defaultAchievementDefinitions } from "./definitions";
import type {
  AchievementAward,
  AchievementDefinition,
  ActivityDevelopmentState,
  BossHistoryRecord,
  LevelProgressionState,
  MonthlyEvaluationRecord,
  XpTransaction,
} from "../types";

export function evaluateAchievements({
  definitions = defaultAchievementDefinitions,
  existingAwards = [],
  activityStates = [],
  monthlyEvaluations = [],
  bossHistory = [],
  levelState,
  now,
  xpPolicy = defaultXpPolicy,
}: {
  definitions?: readonly AchievementDefinition[];
  existingAwards?: readonly AchievementAward[];
  activityStates?: readonly ActivityDevelopmentState[];
  monthlyEvaluations?: readonly MonthlyEvaluationRecord[];
  bossHistory?: readonly BossHistoryRecord[];
  levelState?: LevelProgressionState | null;
  now: string;
  xpPolicy?: XpPolicy;
}): { awards: AchievementAward[]; xpTransactions: XpTransaction[] } {
  const earnedKeys = new Set(existingAwards.map((award) => award.key));
  const awards = definitions
    .filter((definition) => !earnedKeys.has(definition.key))
    .filter((definition) =>
      isDefinitionEarned(definition, {
        activityStates,
        monthlyEvaluations,
        bossHistory,
        levelState,
      }),
    )
    .map((definition) => awardFromDefinition(definition, now));
  const xpTransactions = awards
    .map((award) => {
      const definition = definitions.find((item) => item.id === award.definitionId);
      const rewardPolicy = definition?.rewardPolicy ?? "NONE";
      const amount = xpPolicy.achievementXp[rewardPolicy];

      return createProgressionXpTransaction({
        sourceId: award.id,
        category: "ACHIEVEMENT",
        amount,
        occurredAt: now,
        reason: `Achievement earned: ${award.name}`,
        evidenceRefs: award.supportingEvidence,
        policy: xpPolicy,
      });
    })
    .filter((transaction) => transaction !== null);

  return { awards, xpTransactions };
}

function isDefinitionEarned(
  definition: AchievementDefinition,
  context: {
    activityStates: readonly ActivityDevelopmentState[];
    monthlyEvaluations: readonly MonthlyEvaluationRecord[];
    bossHistory: readonly BossHistoryRecord[];
    levelState?: LevelProgressionState | null;
  },
) {
  switch (definition.evaluationPolicy) {
    case "FIRST_ESTABLISHED_BASELINE":
      return context.activityStates.some((state) => state.capability.baselineState === "ESTABLISHED");
    case "FIRST_FULL_MONTH":
      return context.monthlyEvaluations.some((record) => record.outcome === "FULL_COMPLETION");
    case "FIRST_CONFIRMED_LEVEL_UP":
      return context.levelState?.events.some((event) => event.type === "LEVEL_CONFIRMED") ?? false;
    case "FIRST_BOSS_COMPLETION":
    case "BOSS_BREAKTHROUGH":
      return context.bossHistory.some((boss) => boss.status === "COMPLETED");
    case "RECOVERED_PREVIOUS_STANDARD":
    case "COMEBACK_COMPLETE":
      return context.levelState?.recovery.recoveryState === "PREVIOUS_STANDARD_RESTORED";
    case "SUSTAINED_HIGH_DISCIPLINE":
      return context.activityStates.length > 0 && context.activityStates.every((state) => (state.consistency.value ?? 0) >= 0.9);
    case "MULTI_CORE_STABILITY":
      return context.activityStates.filter((state) => state.reliability.state === "RELIABLE" || state.reliability.state === "HIGHLY_RELIABLE").length >= 2;
    case "ESTABLISHED_NEW_CAPABILITY":
    case "MAJOR_SKILL_MILESTONE":
    case "FIRST_YEAR_OF_EVOLVE":
      return false;
  }
}

function awardFromDefinition(definition: AchievementDefinition, earnedAt: string): AchievementAward {
  return {
    id: `achievement-award-${definition.key}`,
    definitionId: definition.id,
    key: definition.key,
    name: definition.name,
    category: definition.category,
    tier: definition.tier,
    major: definition.major,
    earnedAt,
    supportingEvidence: [definition.evaluationPolicy],
    policyVersion: definition.policyVersion,
  };
}
