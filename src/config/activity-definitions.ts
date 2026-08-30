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
    label: "Reading",
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
    label: "Meditation",
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
    label: "Sleep",
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
    label: "Water",
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
