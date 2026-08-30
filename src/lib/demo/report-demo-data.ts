import type { Book } from "@/types/book";
import type {
  ActivityReport,
  DailyReportDatum,
  PeriodComparisonMetric,
  PeriodReport,
  ReadingActivityRecord,
  ReportsSnapshot,
  TargetActualMetric,
} from "@/types/report";
import {
  calculateAverage,
  calculateBookCompletionDays,
  calculatePercentageChange,
  calculateTotal,
  calculateVariance,
  calculateVariancePercent,
  roundTo,
} from "@/lib/reports/calculations";
import { demoPersona } from "@/lib/demo/demo-persona";

const reportPeriods = {
  today: {
    key: "today",
    label: "Today",
    rangeLabel: "Aug 28, 2026",
  },
  thisWeek: {
    key: "this_week",
    label: "This Week",
    rangeLabel: "Aug 23-29, 2026",
  },
  thisMonth: {
    key: "this_month",
    label: "This Month",
    rangeLabel: "August 2026",
  },
  previousWeek: {
    key: "previous_week",
    label: "Previous Week",
    rangeLabel: "Aug 16-22, 2026",
  },
  previousMonth: {
    key: "previous_month",
    label: "Previous Month",
    rangeLabel: "July 2026",
  },
} as const;

export const demoBooks = [
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    totalPages: 320,
    startedAt: "2026-08-17",
    status: "reading",
  },
  {
    id: "deep-work",
    title: "Deep Work",
    totalPages: 304,
    startedAt: "2026-08-03",
    finishedAt: "2026-08-14",
    status: "completed",
  },
  {
    id: "psychology-money",
    title: "The Psychology of Money",
    totalPages: 256,
    startedAt: "2026-08-15",
    finishedAt: "2026-08-24",
    status: "completed",
  },
  {
    id: "range",
    title: "Range",
    totalPages: 282,
    startedAt: "2026-07-05",
    finishedAt: "2026-07-19",
    status: "completed",
  },
] satisfies Book[];

export const demoReadingActivityRecords = [
  {
    id: "reading-atomic-aug-17",
    activityKey: "reading",
    activityLabel: "Reading",
    bookId: "atomic-habits",
    pagesRead: 24,
    occurredAt: "2026-08-17T19:10:00.000Z",
  },
  {
    id: "reading-atomic-aug-18",
    activityKey: "reading",
    activityLabel: "Reading",
    bookId: "atomic-habits",
    pagesRead: 31,
    occurredAt: "2026-08-18T18:20:00.000Z",
  },
  {
    id: "reading-atomic-aug-21",
    activityKey: "reading",
    activityLabel: "Reading",
    bookId: "atomic-habits",
    pagesRead: 42,
    occurredAt: "2026-08-21T20:30:00.000Z",
  },
  {
    id: "reading-atomic-aug-25",
    activityKey: "reading",
    activityLabel: "Reading",
    bookId: "atomic-habits",
    pagesRead: 39,
    occurredAt: "2026-08-25T15:40:00.000Z",
  },
  {
    id: "reading-atomic-aug-27",
    activityKey: "reading",
    activityLabel: "Reading",
    bookId: "atomic-habits",
    pagesRead: 48,
    occurredAt: "2026-08-27T07:50:00.000Z",
  },
  {
    id: "reading-atomic-aug-28",
    activityKey: "reading",
    activityLabel: "Reading",
    bookId: "atomic-habits",
    pagesRead: 24,
    occurredAt: "2026-08-28T18:10:00.000Z",
  },
] satisfies ReadingActivityRecord[];

const thisWeekRunning = [
  { label: "Mon", target: 5, actual: 5.2, unit: "km" },
  { label: "Tue", target: 5, actual: 6.4, unit: "km" },
  { label: "Wed", target: 5, actual: 3.3, unit: "km" },
  { label: "Thu", target: 5, actual: 5, unit: "km" },
  { label: "Fri", target: 5, actual: 11.1, unit: "km" },
] satisfies DailyReportDatum[];

const previousWeekRunning = [
  { label: "Mon", target: 5, actual: 4, unit: "km" },
  { label: "Tue", target: 5, actual: 5, unit: "km" },
  { label: "Wed", target: 5, actual: 3, unit: "km" },
  { label: "Thu", target: 5, actual: 4, unit: "km" },
  { label: "Fri", target: 5, actual: 4, unit: "km" },
] satisfies DailyReportDatum[];

const thisWeekReading = [
  { label: "Mon", target: 30, actual: 26, unit: "pages" },
  { label: "Tue", target: 30, actual: 35, unit: "pages" },
  { label: "Wed", target: 30, actual: 30, unit: "pages" },
  { label: "Thu", target: 30, actual: 42, unit: "pages" },
  { label: "Fri", target: 30, actual: 51, unit: "pages" },
] satisfies DailyReportDatum[];

const todayActivities = [
  createActivityReport({
    activityKey: "running",
    activityLabel: "Running",
    measurementType: "distance",
    metricLabel: "Distance",
    target: 5,
    actual: 5,
    unit: "km",
    chartData: [{ label: "Today", target: 5, actual: 5, unit: "km" }],
    requiredSessions: 1,
    completedSessions: 1,
    missedSessions: 0,
    secondaryMetrics: [
      { label: "Best session", value: "5 km" },
      { label: "Sessions", value: "1" },
    ],
  }),
  createActivityReport({
    activityKey: "water",
    activityLabel: "Water",
    measurementType: "volume",
    metricLabel: "Volume",
    target: 2.5,
    actual: 2.1,
    unit: "L",
    chartData: [{ label: "Today", target: 2.5, actual: 2.1, unit: "L" }],
    secondaryMetrics: [
      { label: "Difference", value: "-0.4 L" },
      { label: "Entries", value: "4" },
    ],
  }),
];

const thisWeekActivities = [
  createActivityReport({
    activityKey: "running",
    activityLabel: "Running",
    measurementType: "distance",
    metricLabel: "Weekly distance",
    target: 25,
    actual: 31,
    unit: "km",
    chartData: thisWeekRunning,
    requiredSessions: 5,
    completedSessions: 4,
    missedSessions: 1,
    secondaryMetrics: [
      { label: "Average session", value: "6.2 km" },
      { label: "Best session", value: "11.1 km" },
      { label: "Sessions", value: "5" },
    ],
  }),
  createActivityReport({
    activityKey: "workout",
    activityLabel: "Workout",
    measurementType: "completion",
    metricLabel: "Required sessions",
    target: 4,
    actual: 3,
    unit: "sessions",
    chartData: [
      { label: "Mon", target: 1, actual: 1, unit: "session" },
      { label: "Tue", target: 1, actual: 1, unit: "session" },
      { label: "Thu", target: 1, actual: 0, unit: "session" },
      { label: "Sat", target: 1, actual: 1, unit: "session" },
    ],
    requiredSessions: 4,
    completedSessions: 3,
    missedSessions: 1,
    secondaryMetrics: [
      { label: "Completed", value: "3 of 4" },
      { label: "Missed", value: "1" },
    ],
  }),
  createActivityReport({
    activityKey: "reading",
    activityLabel: "Reading",
    measurementType: "pages",
    metricLabel: "Pages",
    target: 150,
    actual: 184,
    unit: "pages",
    chartData: thisWeekReading,
    secondaryMetrics: [
      { label: "Average pages/day", value: "36.8" },
      { label: "Active book", value: "Atomic Habits" },
    ],
  }),
  createActivityReport({
    activityKey: "coding",
    activityLabel: "Coding / Learning",
    measurementType: "duration",
    metricLabel: "Practice",
    target: 420,
    actual: 420,
    unit: "minutes",
    chartData: [
      { label: "Mon", target: 60, actual: 60, unit: "minutes" },
      { label: "Tue", target: 60, actual: 45, unit: "minutes" },
      { label: "Wed", target: 60, actual: 75, unit: "minutes" },
      { label: "Thu", target: 60, actual: 60, unit: "minutes" },
      { label: "Fri", target: 60, actual: 60, unit: "minutes" },
      { label: "Sat", target: 60, actual: 60, unit: "minutes" },
      { label: "Sun", target: 60, actual: 60, unit: "minutes" },
    ],
    secondaryMetrics: [
      { label: "Sessions", value: "7" },
      { label: "Average", value: "60 min/day" },
    ],
  }),
];

const previousWeekActivities = [
  createActivityReport({
    activityKey: "running",
    activityLabel: "Running",
    measurementType: "distance",
    metricLabel: "Weekly distance",
    target: 25,
    actual: 20,
    unit: "km",
    chartData: previousWeekRunning,
    requiredSessions: 5,
    completedSessions: 4,
    missedSessions: 1,
    secondaryMetrics: [
      { label: "Average session", value: "4 km" },
      { label: "Best session", value: "5 km" },
      { label: "Sessions", value: "5" },
    ],
  }),
  createActivityReport({
    activityKey: "workout",
    activityLabel: "Workout",
    measurementType: "completion",
    metricLabel: "Required sessions",
    target: 4,
    actual: 4,
    unit: "sessions",
    requiredSessions: 4,
    completedSessions: 4,
    missedSessions: 0,
    secondaryMetrics: [
      { label: "Completed", value: "4 of 4" },
      { label: "Missed", value: "0" },
    ],
  }),
];

const thisMonthActivities = [
  createActivityReport({
    activityKey: "running",
    activityLabel: "Running",
    measurementType: "distance",
    metricLabel: "Monthly distance",
    target: 110,
    actual: 121,
    unit: "km",
    chartData: [
      { label: "Week 1", target: 25, actual: 27, unit: "km" },
      { label: "Week 2", target: 25, actual: 30, unit: "km" },
      { label: "Week 3", target: 30, actual: 33, unit: "km" },
      { label: "Week 4", target: 30, actual: 31, unit: "km" },
    ],
    requiredSessions: 22,
    completedSessions: 20,
    missedSessions: 2,
    secondaryMetrics: [
      { label: "Average week", value: "30.3 km" },
      { label: "Best week", value: "33 km" },
    ],
  }),
  createActivityReport({
    activityKey: "reading",
    activityLabel: "Reading",
    measurementType: "pages",
    metricLabel: "Pages",
    target: 720,
    actual: 768,
    unit: "pages",
    secondaryMetrics: [
      { label: "Books completed", value: "2" },
      { label: "Average pages/day", value: "24.8" },
    ],
  }),
  createActivityReport({
    activityKey: "workout",
    activityLabel: "Workout",
    measurementType: "completion",
    metricLabel: "Required sessions",
    target: 18,
    actual: 15,
    unit: "sessions",
    requiredSessions: 18,
    completedSessions: 15,
    missedSessions: 3,
    secondaryMetrics: [
      { label: "Completed", value: "15 of 18" },
      { label: "Missed", value: "3" },
    ],
  }),
];

const previousMonthActivities = [
  createActivityReport({
    activityKey: "running",
    activityLabel: "Running",
    measurementType: "distance",
    metricLabel: "Monthly distance",
    target: 100,
    actual: 104,
    unit: "km",
    secondaryMetrics: [
      { label: "Average week", value: "26 km" },
      { label: "Best week", value: "29 km" },
    ],
  }),
  createActivityReport({
    activityKey: "reading",
    activityLabel: "Reading",
    measurementType: "pages",
    metricLabel: "Pages",
    target: 600,
    actual: 611,
    unit: "pages",
    secondaryMetrics: [
      { label: "Books completed", value: "2" },
      { label: "Average pages/day", value: "19.7" },
    ],
  }),
];

export const demoReportsSnapshot = {
  periods: [
    createPeriodReport({
      period: reportPeriods.today,
      overview: {
        requiredCommitments: 6,
        completedCommitments: 4,
        missedCommitments: 2,
        overallConsistencyPercent: 67,
        activitiesTracked: 4,
      },
      activities: todayActivities,
      progression: {
        startingLevel: demoPersona.currentLevel,
        currentLevel: demoPersona.currentLevel,
        highestLevel: demoPersona.highestLevel,
        activityXp: 0,
        bossXp: 0,
        bonusXp: 0,
        xpLost: 0,
      },
    }),
    createPeriodReport({
      period: reportPeriods.thisWeek,
      overview: {
        requiredCommitments: 32,
        completedCommitments: 27,
        missedCommitments: 5,
        overallConsistencyPercent: 84,
        activitiesTracked: 5,
      },
      activities: thisWeekActivities,
      progression: {
        startingLevel: 37,
        currentLevel: demoPersona.currentLevel,
        highestLevel: demoPersona.highestLevel,
        activityXp: 360,
        bossXp: 0,
        bonusXp: 80,
        xpLost: 40,
      },
    }),
    createPeriodReport({
      period: reportPeriods.thisMonth,
      overview: {
        requiredCommitments: 124,
        completedCommitments: 108,
        missedCommitments: 16,
        overallConsistencyPercent: 87,
        activitiesTracked: 6,
      },
      activities: thisMonthActivities,
      progression: {
        startingLevel: 36,
        currentLevel: demoPersona.currentLevel,
        highestLevel: demoPersona.highestLevel,
        activityXp: 1460,
        bossXp: 220,
        bonusXp: 300,
        xpLost: 190,
      },
    }),
    createPeriodReport({
      period: reportPeriods.previousWeek,
      overview: {
        requiredCommitments: 31,
        completedCommitments: 24,
        missedCommitments: 7,
        overallConsistencyPercent: 77,
        activitiesTracked: 5,
      },
      activities: previousWeekActivities,
      progression: {
        startingLevel: 36,
        currentLevel: 37,
        highestLevel: demoPersona.highestLevel,
        activityXp: 280,
        bossXp: 0,
        bonusXp: 30,
        xpLost: 70,
      },
    }),
    createPeriodReport({
      period: reportPeriods.previousMonth,
      overview: {
        requiredCommitments: 118,
        completedCommitments: 99,
        missedCommitments: 19,
        overallConsistencyPercent: 84,
        activitiesTracked: 5,
      },
      activities: previousMonthActivities,
      progression: {
        startingLevel: 35,
        currentLevel: 36,
        highestLevel: demoPersona.highestLevel,
        activityXp: 1220,
        bossXp: 120,
        bonusXp: 160,
        xpLost: 210,
      },
    }),
  ],
} satisfies ReportsSnapshot;

function createPeriodReport({
  period,
  overview,
  activities,
  progression,
}: {
  period: PeriodReport["period"];
  overview: PeriodReport["overview"];
  activities: ActivityReport[];
  progression: {
    startingLevel: number;
    currentLevel: number;
    highestLevel: number;
    activityXp: number;
    bossXp: number;
    bonusXp: number;
    xpLost: number;
  };
}): PeriodReport {
  const currentBook = demoBooks.find((book) => book.status === "reading");

  if (!currentBook) {
    throw new Error("Demo reports require one current book.");
  }

  const pagesRead = calculateTotal(
    demoReadingActivityRecords
      .filter((record) => record.bookId === currentBook.id)
      .map((record) => record.pagesRead),
  );
  const periodReadingPages =
    activities.find((activity) => activity.activityKey === "reading")?.primaryMetric
      .actual ?? pagesRead;
  const completedBooks = demoBooks
    .filter((book) => book.status === "completed")
    .map((book) => ({
      book,
      completionDays: calculateBookCompletionDays(book.startedAt, book.finishedAt),
    }));
  const completionDays = completedBooks
    .map((book) => book.completionDays)
    .filter((days): days is number => typeof days === "number");
  const averageCompletionDays = calculateAverage(completionDays);

  return {
    period,
    overview,
    activities,
    consistency: {
      overallPercent: overview.overallConsistencyPercent,
      items: [
        {
          activityKey: "running",
          activityLabel: "Running",
          consistencyPercent: 86,
          currentStreak: 18,
          bestStreak: 47,
        },
        {
          activityKey: "reading",
          activityLabel: "Reading",
          consistencyPercent: 94,
          currentStreak: 31,
          bestStreak: 42,
        },
        {
          activityKey: "workout",
          activityLabel: "Workout",
          consistencyPercent: 72,
          currentStreak: 12,
          bestStreak: 19,
        },
        {
          activityKey: "coding",
          activityLabel: "Coding / Learning",
          consistencyPercent: 88,
          currentStreak: 9,
          bestStreak: 21,
        },
      ],
    },
    reading: {
      currentBook: {
        book: currentBook,
        pagesRead,
        pagesRemaining: Math.max(currentBook.totalPages - pagesRead, 0),
        progressPercent: roundTo((pagesRead / currentBook.totalPages) * 100, 1),
        startedLabel: "Aug 17",
      },
      completedBooks,
      metrics: {
        booksCompleted: completedBooks.length,
        pagesRead: periodReadingPages,
        averagePagesPerDay: 27,
        averageCompletionDays:
          averageCompletionDays === null ? null : roundTo(averageCompletionDays, 1),
        fastestCompletionDays:
          completionDays.length > 0 ? Math.min(...completionDays) : null,
      },
    },
    comparisons: {
      weekly: [
        createComparison("Running", "Last week", "This week", 20, 31, "km"),
        createComparison("Workout", "Last week", "This week", 4, 3, "sessions"),
        createComparison("Reading", "Last week", "This week", 128, 208, "pages"),
      ],
      monthly: [
        createComparison("Running", "July", "August", 104, 121, "km"),
        createComparison("Reading pages", "July", "August", 611, 768, "pages"),
        createComparison("Books", "July", "August", 1, 2, "books"),
        createComparison("Workout", "July", "August", 17, 15, "sessions"),
      ],
      zeroPrevious: createComparison(
        "Meditation",
        "Previous period",
        "Current period",
        0,
        20,
        "minutes",
      ),
    },
    progression: {
      startingLevel: progression.startingLevel,
      currentLevel: progression.currentLevel,
      highestLevel: progression.highestLevel,
      levelChange: progression.currentLevel - progression.startingLevel,
      xp: {
        activity: progression.activityXp,
        boss: progression.bossXp,
        bonus: progression.bonusXp,
        lost: progression.xpLost,
        net:
          progression.activityXp +
          progression.bossXp +
          progression.bonusXp -
          progression.xpLost,
      },
    },
    baseline: [
      {
        activityKey: "running",
        activityLabel: "Running",
        observationLabel: "4 weeks of data",
      },
      {
        activityKey: "reading",
        activityLabel: "Reading",
        observationLabel: "3 weeks of data",
      },
      {
        activityKey: "workout",
        activityLabel: "Workout",
        observationLabel: "4 weeks of data",
      },
      {
        activityKey: "coding",
        activityLabel: "Coding / Learning",
        observationLabel: "2 weeks of data",
      },
    ],
    systemAnalysis: {
      available: false,
      message: "Analysis becomes available after sufficient performance data.",
    },
  };
}

function createActivityReport({
  activityKey,
  activityLabel,
  measurementType,
  metricLabel,
  target,
  actual,
  unit,
  chartData,
  secondaryMetrics,
  requiredSessions,
  completedSessions,
  missedSessions,
}: Omit<ActivityReport, "primaryMetric"> & {
  metricLabel: string;
  target: number;
  actual: number;
  unit: string;
}): ActivityReport {
  return {
    activityKey,
    activityLabel,
    measurementType,
    primaryMetric: createTargetActualMetric(metricLabel, target, actual, unit),
    secondaryMetrics,
    requiredSessions,
    completedSessions,
    missedSessions,
    chartData,
  };
}

function createTargetActualMetric(
  label: string,
  target: number,
  actual: number,
  unit: string,
): TargetActualMetric {
  return {
    label,
    target,
    actual,
    unit,
    difference: roundTo(calculateVariance(actual, target), 1),
    variancePercent: roundToNullable(calculateVariancePercent(actual, target)),
  };
}

function createComparison(
  label: string,
  previousLabel: string,
  currentLabel: string,
  previousValue: number,
  currentValue: number,
  unit: string,
): PeriodComparisonMetric {
  return {
    label,
    previousLabel,
    currentLabel,
    previousValue,
    currentValue,
    unit,
    changePercent: roundToNullable(
      calculatePercentageChange(currentValue, previousValue),
    ),
  };
}

function roundToNullable(value: number | null) {
  return value === null ? null : roundTo(value, 1);
}
