import type { CommitmentTier } from "@/types/improvement";

export type PerformanceRange = "7D" | "4W" | "3M" | "6M" | "1Y" | "ALL";
export type PerformanceGranularity = "DAY" | "WEEK" | "MONTH" | "YEAR";
export type PerformanceSeriesKind = "ACTIVITY_CONSISTENCY" | "BOUNDARY_ADHERENCE";

export type PerformancePoint = {
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  label: string;
  value: number | null;
  provisional?: boolean;
  state?: string;
};

export type PerformanceSeries = {
  id: string;
  label: string;
  kind: PerformanceSeriesKind;
  tier?: CommitmentTier;
  points: PerformancePoint[];
};

export type PerformanceContextEvent = {
  id: string;
  occurredAt: string;
  type: "SOCIAL_OUTING" | "BOUNDARY_VIOLATION" | "CORRECTIVE_CHALLENGE_STARTED" | "CORRECTIVE_CHALLENGE_COMPLETED";
  label: string;
};

export type PerformanceOverview = {
  range: PerformanceRange;
  granularity: PerformanceGranularity;
  series: PerformanceSeries[];
  contextEvents: PerformanceContextEvent[];
  summary: {
    strongestActivity?: { id: string; label: string; consistency: number };
    primaryConstraint?: { id: string; label: string; consistency: number };
    boundarySummary: { maintained: number; total: number };
    direction: string;
  };
};

export type PerformanceOverviewSet = Record<PerformanceRange, PerformanceOverview>;
