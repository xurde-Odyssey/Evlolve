export type ActivityKey =
  | "workout"
  | "running"
  | "reading"
  | "coding"
  | "meditation"
  | "sleep"
  | "water"
  | "custom";

export type MeasurementType =
  | "distance"
  | "duration"
  | "pages"
  | "volume"
  | "completion";

export type MeasurementOption = {
  type: MeasurementType;
  label: string;
  unit: string;
};

export type ActivityDefinition = {
  key: ActivityKey;
  label: string;
  measurementOptions: MeasurementOption[];
  source: "system" | "user";
};

export type ActivityRecord = {
  id: string;
  activityKey: ActivityKey;
  activityLabel: string;
  measurement: {
    type: MeasurementType;
    value?: number;
    unit?: string;
  };
  notes?: string;
  occurredAt: string;
  status: "completed";
};
