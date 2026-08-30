import type { ActivityKey, MeasurementType } from "@/types/activity";
import type { Book } from "@/types/book";
import type {
  ExecutionState,
  GapClassification,
  ReliabilityState,
  TargetRelationship,
  DirectionSignal,
} from "@/domain/evolve-engine/types";

export type ReportPeriodKey =
  | "today"
  | "this_week"
  | "this_month"
  | "previous_week"
  | "previous_month";

export type ReportPeriod = {
  key: ReportPeriodKey;
  label: string;
  rangeLabel: string;
};

export type ReadingActivityRecord = {
  id: string;
  activityKey: "reading";
  activityLabel: "Reading";
  bookId: string;
  pagesRead: number;
  occurredAt: string;
};

export type TargetActualMetric = {
  label: string;
  target: number;
  actual: number;
  unit: string;
  difference: number;
  variancePercent: number | null;
  executionState?: ExecutionState;
  rawCompletionRatio?: number | null;
  commitmentFulfillment?: number | null;
};

export type DailyReportDatum = {
  label: string;
  target?: number;
  actual: number;
  unit: string;
};

export type ActivityReport = {
  activityKey: ActivityKey;
  activityLabel: string;
  measurementType: MeasurementType;
  primaryMetric: TargetActualMetric;
  secondaryMetrics: {
    label: string;
    value: string;
  }[];
  requiredSessions?: number;
  completedSessions?: number;
  missedSessions?: number;
  chartData?: DailyReportDatum[];
  developmentSignals?: {
    reliabilityState: ReliabilityState;
    momentum: DirectionSignal;
    gapClassification: GapClassification;
    targetRelationship: TargetRelationship;
  };
};

export type ConsistencyReportItem = {
  activityKey: ActivityKey;
  activityLabel: string;
  consistencyPercent: number;
  currentStreak?: number;
  bestStreak?: number;
};

export type CompletedBookReport = {
  book: Book;
  completionDays: number | null;
};

export type ReadingReport = {
  currentBook?: {
    book: Book;
    pagesRead: number;
    pagesRemaining: number;
    progressPercent: number;
    startedLabel: string;
  };
  completedBooks: CompletedBookReport[];
  metrics: {
    booksCompleted: number;
    pagesRead: number;
    averagePagesPerDay: number;
    averageCompletionDays: number | null;
    fastestCompletionDays: number | null;
  };
};

export type PeriodComparisonMetric = {
  label: string;
  previousLabel: string;
  currentLabel: string;
  previousValue: number;
  currentValue: number;
  unit: string;
  changePercent: number | null;
};

export type ProgressionReport = {
  startingLevel: number;
  currentLevel: number;
  highestLevel: number;
  levelChange: number;
  xp: {
    activity: number;
    boss: number;
    bonus: number;
    lost: number;
    net: number;
  };
};

export type BaselineReportItem = {
  activityKey: ActivityKey;
  activityLabel: string;
  observationLabel: string;
};

export type PeriodReport = {
  period: ReportPeriod;
  overview: {
    requiredCommitments: number;
    completedCommitments: number;
    missedCommitments: number;
    overallConsistencyPercent: number | null;
    activitiesTracked: number;
  };
  activities: ActivityReport[];
  consistency: {
    overallPercent: number | null;
    items: ConsistencyReportItem[];
  };
  reading: ReadingReport;
  comparisons: {
    weekly: PeriodComparisonMetric[];
    monthly: PeriodComparisonMetric[];
    zeroPrevious: PeriodComparisonMetric;
  };
  progression: ProgressionReport;
  baseline: BaselineReportItem[];
  systemAnalysis: {
    available: boolean;
    message: string;
  };
};

export type ReportsSnapshot = {
  periods: PeriodReport[];
};
