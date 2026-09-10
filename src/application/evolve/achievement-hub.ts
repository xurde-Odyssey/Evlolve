import type { Achievement, AchievementSnapshot } from "@/types/achievement";
import type { Book } from "@/types/book";

export type HubArtifactVariant =
  | "boss-monolith"
  | "lifetime-core"
  | "mastery-stone";

export type HubAchievementPresentation = {
  achievement: Achievement;
  destination: "frame" | "desk";
  visualVariant: "major-frame" | HubArtifactVariant;
  priority: number;
  size: "small" | "medium" | "large";
  slot: number;
};

export type AchievementHubViewModel = {
  frames: HubAchievementPresentation[];
  deskArtifacts: HubAchievementPresentation[];
  completedBooks: Book[];
  selectedTitle?: AchievementSnapshot["titles"][number];
};

const frameSlots = 8;

function categoryPriority(achievement: Achievement) {
  switch (achievement.category) {
    case "lifetime":
      return 100;
    case "boss":
      return 90;
    case "mastery":
      return 80;
    case "discipline":
      return 70;
    case "milestone":
      return 60;
  }
}

function artifactVariant(achievement: Achievement): HubArtifactVariant | undefined {
  if (achievement.category === "lifetime") return "lifetime-core";
  if (achievement.category === "boss") return "boss-monolith";
  if (achievement.category === "mastery" && achievement.tierLabel === "MASTER") {
    return "mastery-stone";
  }
  return undefined;
}

function compareAchievements(left: Achievement, right: Achievement) {
  return (
    categoryPriority(right) - categoryPriority(left) ||
    Number(right.major) - Number(left.major) ||
    (right.earnedAt ?? "").localeCompare(left.earnedAt ?? "") ||
    left.id.localeCompare(right.id)
  );
}

/** Maps the existing achievement registry into stable visual room objects. */
export function getAchievementHubViewModel(
  snapshot: AchievementSnapshot,
  books: readonly Book[],
): AchievementHubViewModel {
  const earned = snapshot.achievements
    .filter((achievement) => achievement.status === "earned" && achievement.major)
    .sort(compareAchievements);

  const deskArtifacts: HubAchievementPresentation[] = [];
  earned.forEach((achievement) => {
    const visualVariant = artifactVariant(achievement);
    if (!visualVariant || deskArtifacts.length >= 3) return;

    deskArtifacts.push({
      achievement,
      destination: "desk",
      visualVariant,
      priority: categoryPriority(achievement),
      size: achievement.category === "lifetime" ? "large" : "medium",
      slot: deskArtifacts.length,
    });
  });

  const deskIds = new Set(deskArtifacts.map((item) => item.achievement.id));
  const frames = earned
    .filter((achievement) => !deskIds.has(achievement.id))
    .slice(0, frameSlots)
    .map((achievement, index) => ({
      achievement,
      destination: "frame" as const,
      visualVariant: "major-frame" as const,
      priority: categoryPriority(achievement),
      size: index === 0 ? "large" : index < 3 ? "medium" : "small",
      slot: index,
    } satisfies HubAchievementPresentation));

  return {
    frames,
    deskArtifacts,
    completedBooks: books
      .filter((book) => book.status === "completed")
      .sort((left, right) => (right.finishedAt ?? "").localeCompare(left.finishedAt ?? "")),
    selectedTitle: snapshot.titles.find((title) => title.selected),
  };
}
