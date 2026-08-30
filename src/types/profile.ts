import type { Achievement, UserTitle } from "@/types/achievement";
import type { ActivityKey } from "@/types/activity";
import type { CommitmentTier } from "@/types/improvement";

export type CharacterAvatar = {
  asset?: string;
  label?: string;
};

export type PersonalProfile = {
  name: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  goals?: string[];
};

export type ProfileLevelSummary = {
  currentLevel: number;
  highestLevel: number;
  totalXp: number;
  evolvingSince: string;
  activeDays: number;
};

export type ProfileConsistencySummary = {
  currentConsistencyPercent: number;
  currentOverallStreak: number;
  bestOverallStreak: number;
  disciplineLabel: string;
  activityConsistency: {
    activityKey: ActivityKey;
    activityLabel: string;
    consistencyPercent: number;
  }[];
};

export type ProfileDevelopmentArea = {
  id: string;
  title: string;
  tier: Extract<CommitmentTier, "core" | "priority">;
};

export type ProfileEvidenceMetric = {
  id: string;
  label: string;
  value: string;
  context: string;
};

export type PersonalRecord = {
  id: string;
  label: string;
  value: string;
};

export type LifetimeStatistic = {
  id: string;
  label: string;
  value: string;
};

export type AnalysisInsightDirection = "strong" | "weak" | "neutral";

export type AnalysisInsight = {
  id: string;
  activityKey?: ActivityKey;
  title: string;
  evidence: string[];
  direction: AnalysisInsightDirection;
};

export type MonthlyAnalysis = {
  periodLabel: string;
  strongestAreas: AnalysisInsight[];
  weakAreas: AnalysisInsight[];
  summary?: string;
};

export type ProfileSnapshot = {
  personal: PersonalProfile;
  avatar: CharacterAvatar;
  level: ProfileLevelSummary;
  titles: UserTitle[];
  consistency: ProfileConsistencySummary;
  currentDevelopment: ProfileDevelopmentArea[];
  recentPerformance: ProfileEvidenceMetric[];
  lifetime: LifetimeStatistic[];
  records: PersonalRecord[];
  monthlyAnalysis: MonthlyAnalysis;
  majorAchievements: Achievement[];
  progressionHistory: ProfileEvidenceMetric[];
};
