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
    title: "Reading",
    description: "Build consistent reading volume.",
    activityKey: "reading",
    progressBehavior: "cumulative",
  },
  {
    id: "coding",
    title: "Coding",
    description: "Practice focused technical work.",
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
    id: "meditation",
    title: "Meditation",
    description: "Develop a regular meditation practice.",
    activityKey: "meditation",
    progressBehavior: "cumulative",
  },
  {
    id: "sleep",
    title: "Sleep",
    description: "Improve recovery and consistency.",
    activityKey: "sleep",
    progressBehavior: "state",
  },
  {
    id: "hydration",
    title: "Hydration",
    description: "Maintain daily hydration.",
    activityKey: "water",
    progressBehavior: "state",
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
    requiredSlots: 4,
    areas: [
      { title: "Running", activityKey: "running" },
      { title: "Strength Training", activityKey: "workout" },
      { title: "Sleep", activityKey: "sleep" },
      { title: "Hydration", activityKey: "water" },
    ],
  },
  {
    id: "career-accelerator",
    title: "Career Accelerator",
    description: "Focused improvement across technical practice and study.",
    requiredSlots: 4,
    areas: [
      { title: "Technical Practice", activityKey: "coding" },
      { title: "Focused Study" },
      { title: "Reading", activityKey: "reading" },
      { title: "Project Work" },
    ],
  },
] satisfies EvolveProgram[];
