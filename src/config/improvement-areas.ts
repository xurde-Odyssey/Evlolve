import type {
  EvolveProgram,
  PredefinedImprovementArea,
} from "@/types/improvement";

export const predefinedImprovementAreas = [
  {
    id: "running",
    title: "Running",
    description: "Build a stronger running baseline.",
    activityKey: "running",
    progressBehavior: "cumulative",
  },
  {
    id: "strength-training",
    title: "Strength Training",
    description: "Develop repeatable physical training.",
    activityKey: "workout",
    progressBehavior: "cumulative",
  },
  {
    id: "reading",
    title: "Bookaholic",
    description: "Build consistent reading volume.",
    activityKey: "reading",
    progressBehavior: "cumulative",
  },
  {
    id: "coding",
    title: "Learning",
    description: "Build focused knowledge and technical capability.",
    activityKey: "coding",
    progressBehavior: "cumulative",
  },
  {
    id: "focused-study",
    title: "Focused Study",
    description: "Protect time for deliberate learning.",
    progressBehavior: "cumulative",
  },
  {
    id: "saving",
    title: "Saving",
    description: "Build a durable savings position.",
    progressBehavior: "state",
  },
] satisfies PredefinedImprovementArea[];

export const evolvePrograms = [
  {
    id: "physical-foundation",
    title: "Physical Foundation",
    description: "Designed to build a stronger physical baseline.",
    requiredSlots: 2,
    areas: [
      { title: "Running", activityKey: "running" },
      { title: "Strength Training", activityKey: "workout" },
    ],
  },
  {
    id: "career-accelerator",
    title: "Career Accelerator",
    description: "Focused improvement across technical practice and study.",
    requiredSlots: 4,
    areas: [
      { title: "Learning", activityKey: "coding" },
      { title: "Focused Study" },
      { title: "Bookaholic", activityKey: "reading" },
      { title: "Project Work" },
    ],
  },
] satisfies EvolveProgram[];
