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
    label: "Coding / Learning",
    source: "system",
    measurementOptions: [
      {
        type: "duration",
        label: "Duration",
        unit: "minutes",
      },
    ],
  },
  {
    key: "meditation",
    label: "Mental Training",
    source: "system",
    measurementOptions: [
      {
        type: "duration",
        label: "Duration",
        unit: "minutes",
      },
    ],
  },
  {
    key: "sleep",
    label: "Endurance",
    source: "system",
    measurementOptions: [
      {
        type: "duration",
        label: "Duration",
        unit: "hours",
      },
    ],
  },
  {
    key: "water",
    label: "Deep Work",
    source: "system",
    measurementOptions: [
      {
        type: "volume",
        label: "Volume",
        unit: "L",
      },
    ],
  },
] satisfies ActivityDefinition[];
