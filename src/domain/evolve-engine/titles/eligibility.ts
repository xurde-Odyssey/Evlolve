import type {
  ActivityDevelopmentState,
  AchievementAward,
  EarnedTitleRecord,
  LevelProgressionState,
  TitleEligibilityResult,
} from "../types";

export function evaluateTitleEligibility({
  titles,
  achievements = [],
  activityStates = [],
  levelState,
}: {
  titles: readonly EarnedTitleRecord[];
  achievements?: readonly AchievementAward[];
  activityStates?: readonly ActivityDevelopmentState[];
  levelState?: LevelProgressionState | null;
}): TitleEligibilityResult[] {
  const earnedAchievementKeys = new Set(achievements.map((award) => award.key));

  return titles.map((title) => {
    const active =
      title.sourceType === "ACHIEVEMENT"
        ? title.sourceId ? earnedAchievementKeys.has(title.sourceId) || achievements.some((award) => award.definitionId === title.sourceId) : true
        : title.sourceType === "LEVEL"
          ? (levelState?.currentLevel ?? 0) >= 1
          : title.sourceType === "BOSS"
            ? true
            : activityStates.some((state) => state.capability.confidence >= 0.6);

    return {
      title,
      eligibility: active ? "ELIGIBLE" : "INACTIVE",
      reason: active
        ? "Current evidence supports active use of this earned title."
        : "Historical title remains earned, but current eligibility is inactive.",
      confidence: active ? 0.75 : 0.55,
    };
  });
}
