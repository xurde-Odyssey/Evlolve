export type AchievementCategory =
  | "milestone"
  | "mastery"
  | "discipline"
  | "boss"
  | "lifetime";

export type AchievementStatus = "locked" | "in_progress" | "earned";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  status: AchievementStatus;
  tier?: number;
  tierLabel?: string;
  progress?: {
    current: number;
    target: number;
    unit?: string;
  };
  earnedAt?: string;
  hiddenUntilEarned?: boolean;
  major?: boolean;
};

export type TitleSourceType =
  | "achievement"
  | "level"
  | "boss"
  | "mastery"
  | "progression";

export type TitleEligibility = "active" | "inactive";

export type UserTitle = {
  id: string;
  name: string;
  description?: string;
  sourceType: TitleSourceType;
  sourceId?: string;
  eligibility: TitleEligibility;
  earnedAt: string;
  selected: boolean;
};

export type AchievementSnapshot = {
  achievements: Achievement[];
  titles: UserTitle[];
};
