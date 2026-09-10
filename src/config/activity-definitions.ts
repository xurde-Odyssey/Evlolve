import type { ActivityDefinition } from "@/types/activity";

export const activityDefinitions = [
  {
    key: "workout",
    label: "Workout",
    source: "system",
    measurementOptions: [
      {
        type: "duration",
        label: "Duration",
        unit: "minutes",
      },
      {
        type: "completion",
        label: "Completion",
        unit: "completed",
      },
    ],
  },
  {
    key: "running",
    label: "Running",
    source: "system",
    measurementOptions: [
      {
        type: "distance",
        label: "Distance",
        unit: "km",
      },
    ],
  },
  {
    key: "reading",
    label: "Bookaholic",
    source: "system",
    measurementOptions: [
      {
        type: "pages",
        label: "Pages",
        unit: "pages",
      },
      {
        type: "duration",
        label: "Duration",
        unit: "minutes",
      },
    ],
  },
  {
    key: "coding",
    label: "Learning",
    source: "system",
    measurementOptions: [
      {
        type: "duration",
        label: "Duration",
        unit: "minutes",
      },
    ],
  },
] satisfies ActivityDefinition[];
