import {
  demoAchievements,
  demoBossChallenges,
  demoConsistency,
  demoImprovements,
  demoJourney,
} from "@/lib/demo/evolve-demo-data";
import { demoPersona } from "@/lib/demo/demo-persona";
import type { ProfileSnapshot } from "@/types/profile";

export const demoProfile = {
  personal: {
    name: demoPersona.name,
    age: 29,
    heightCm: 178,
    weightKg: 74,
    goals: [
      "Improve endurance",
      "Read more consistently",
      "Build career skills",
      "Improve discipline",
    ],
  },
  avatar: {
    asset: "/evolve.svg",
    label: "Level-based avatar placeholder",
  },
  level: {
    currentLevel: demoPersona.currentLevel,
    highestLevel: demoPersona.highestLevel,
    totalXp: demoPersona.totalXp,
    evolvingSince: demoPersona.evolvingSince,
    activeDays: demoPersona.activeDays,
  },
  titles: demoAchievements.titles.map((title) => ({
    ...title,
    selected: title.id === "endurance-title",
  })),
  consistency: {
    currentConsistencyPercent: 91,
    currentOverallStreak: demoConsistency.overall.currentStreak,
    bestOverallStreak: 47,
    disciplineLabel: "Strong recent execution",
    activityConsistency: [
      {
        activityKey: "running",
        activityLabel: "Running",
        consistencyPercent: 94,
      },
      {
        activityKey: "reading",
        activityLabel: "Reading",
        consistencyPercent: 88,
      },
      {
        activityKey: "workout",
        activityLabel: "Workout",
        consistencyPercent: 91,
      },
    ],
  },
  currentDevelopment: demoImprovements.areas
    .filter(
      (area) =>
        area.status === "active" &&
        (area.tier === "core" || area.tier === "priority"),
    )
    .map((area) => ({
      id: area.id,
      title: area.title,
      tier: area.tier,
    })),
  recentPerformance: [
    {
      id: "weekly-running",
      label: "Running",
      value: "31 km",
      context: "this week",
    },
    {
      id: "monthly-workouts",
      label: "Workouts",
      value: "15 sessions",
      context: "this month",
    },
    {
      id: "monthly-pages",
      label: "Reading",
      value: "768 pages",
      context: "this month",
    },
    {
      id: "yearly-books",
      label: "Books",
      value: "14 completed",
      context: "this year",
    },
  ],
  lifetime: [
    {
      id: "distance-run",
      label: "Distance run",
      value: "1,284 km",
    },
    {
      id: "books-completed",
      label: "Books completed",
      value: "47",
    },
    {
      id: "workouts-completed",
      label: "Workouts completed",
      value: "326",
    },
    {
      id: "bosses-defeated",
      label: "Bosses defeated",
      value: String(
        demoBossChallenges.filter((challenge) => challenge.status === "completed")
          .length + 17,
      ),
    },
    {
      id: "active-days",
      label: "Active days",
      value: "412",
    },
  ],
  records: [
    {
      id: "longest-run",
      label: "Longest run",
      value: "14.2 km",
    },
    {
      id: "best-running-week",
      label: "Best running week",
      value: "42.7 km",
    },
    {
      id: "longest-streak",
      label: "Longest streak",
      value: "47 days",
    },
    {
      id: "fastest-book",
      label: "Fastest book",
      value: "8 days",
    },
    {
      id: "best-consistency-month",
      label: "Best consistency month",
      value: "94%",
    },
  ],
  monthlyAnalysis: {
    periodLabel: "August 2026",
    summary:
      "Running is currently the strongest development signal. Reading volume improved in total pages, but reading consistency still needs attention.",
    strongestAreas: [
      {
        id: "strong-running",
        activityKey: "running",
        title: "Running",
        direction: "strong",
        evidence: [
          "Exceeded monthly distance target by 11 km.",
          "Completed 94% of required running sessions.",
          "Best recent session reached 11.1 km.",
        ],
      },
    ],
    weakAreas: [
      {
        id: "weak-reading-consistency",
        activityKey: "reading",
        title: "Reading consistency",
        direction: "weak",
        evidence: [
          "Reading consistency trailed running by 6 percentage points.",
          "Daily reading volume varied more than the month target expects.",
        ],
      },
      {
        id: "weak-workout-misses",
        activityKey: "workout",
        title: "Workout completion",
        direction: "weak",
        evidence: [
          "15 of 18 required sessions completed this month.",
          "Three missed sessions remain visible as performance evidence.",
        ],
      },
    ],
  },
  majorAchievements: demoAchievements.achievements.filter(
    (achievement) => achievement.major && achievement.status === "earned",
  ),
  progressionHistory: [
    {
      id: "current-position",
      label: "Current milestone",
      value: `Level ${demoPersona.currentLevel} - Endurance standard`,
      context: "Journey",
    },
    {
      id: "highest-level",
      label: "Highest level reached",
      value: `Level ${demoPersona.highestLevel}`,
      context: "Historical",
    },
    {
      id: "completed-milestones",
      label: "Journey milestones",
      value: `${demoJourney.completedMilestoneCount} completed`,
      context: "Lifetime",
    },
  ],
} satisfies ProfileSnapshot;
