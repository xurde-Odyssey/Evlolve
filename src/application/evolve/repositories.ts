import type { ActivityExecutionEvidence } from "../../domain/evolve-engine";
import type {
  AchievementAward,
  BossContract,
  BossHistoryRecord,
  EarnedTitleRecord,
  JourneyProgressionEvent,
  MonthlyDevelopmentSnapshot,
  RecommendationHistoryRecord,
  WeeklyDevelopmentSnapshot,
  XpTransaction,
} from "../../domain/evolve-engine";
import type { ActivityRecord } from "../../types/activity";
import type { Book } from "../../types/book";
import type { WeeklyReminder } from "../../types/weekly-reminder";
import type { EvolveLocalState, GrowthCommitment } from "./types";

export type ActivityRepository = {
  list(): readonly ActivityRecord[];
  append(record: ActivityRecord): void;
};

export type EvidenceRepository = {
  list(): readonly ActivityExecutionEvidence[];
  appendMany(evidence: readonly ActivityExecutionEvidence[]): void;
};

export type CommitmentRepository = {
  list(): readonly GrowthCommitment[];
  replaceAll(commitments: readonly GrowthCommitment[]): void;
};

export type WeeklyReminderRepository = {
  list(): readonly WeeklyReminder[];
  replaceAll(reminders: readonly WeeklyReminder[]): void;
};

export type BookRepository = {
  list(): readonly Book[];
  replaceAll(books: readonly Book[]): void;
};

export type BossRepository = {
  listActive(): readonly BossContract[];
  listHistory(): readonly BossHistoryRecord[];
  replaceActive(bosses: readonly BossContract[]): void;
  replaceHistory(history: readonly BossHistoryRecord[]): void;
};

export type RecommendationRepository = {
  list(): readonly RecommendationHistoryRecord[];
  replaceAll(recommendations: readonly RecommendationHistoryRecord[]): void;
};

export type XpRepository = {
  list(): readonly XpTransaction[];
  replaceAll(transactions: readonly XpTransaction[]): void;
};

export type AchievementRepository = {
  list(): readonly AchievementAward[];
  replaceAll(achievements: readonly AchievementAward[]): void;
};

export type TitleRepository = {
  list(): readonly EarnedTitleRecord[];
  replaceAll(titles: readonly EarnedTitleRecord[]): void;
};

export type JourneyRepository = {
  list(): readonly JourneyProgressionEvent[];
  replaceAll(events: readonly JourneyProgressionEvent[]): void;
};

export type SnapshotRepository = {
  listWeekly(): readonly WeeklyDevelopmentSnapshot[];
  listMonthly(): readonly MonthlyDevelopmentSnapshot[];
  replaceWeekly(snapshots: readonly WeeklyDevelopmentSnapshot[]): void;
  replaceMonthly(snapshots: readonly MonthlyDevelopmentSnapshot[]): void;
};

export type EvolveLocalRepositories = {
  activities: ActivityRepository;
  evidence: EvidenceRepository;
  commitments: CommitmentRepository;
  weeklyReminders: WeeklyReminderRepository;
  books: BookRepository;
  bosses: BossRepository;
  recommendations: RecommendationRepository;
  xp: XpRepository;
  achievements: AchievementRepository;
  titles: TitleRepository;
  journey: JourneyRepository;
  snapshots: SnapshotRepository;
  getState(): EvolveLocalState;
  replaceState(state: EvolveLocalState): void;
};

export function createMemoryEvolveRepositories(
  initialState: EvolveLocalState,
): EvolveLocalRepositories {
  let state = structuredClone(initialState) as EvolveLocalState;

  return {
    activities: {
      list: () => state.activityRecords,
      append(record) {
        state = {
          ...state,
          activityRecords: [record, ...state.activityRecords],
        };
      },
    },
    evidence: {
      list: () => state.evidence,
      appendMany(evidence) {
        state = {
          ...state,
          evidence: [...state.evidence, ...evidence],
        };
      },
    },
    commitments: {
      list: () => state.commitments,
      replaceAll(commitments) {
        state = {
          ...state,
          commitments: [...commitments],
        };
      },
    },
    weeklyReminders: {
      list: () => state.weeklyReminders,
      replaceAll(reminders) {
        state = {
          ...state,
          weeklyReminders: [...reminders],
        };
      },
    },
    books: {
      list: () => state.books,
      replaceAll(books) {
        state = {
          ...state,
          books: [...books],
        };
      },
    },
    bosses: {
      listActive: () => state.activeBosses,
      listHistory: () => state.bossHistory,
      replaceActive(bosses) {
        state = {
          ...state,
          activeBosses: [...bosses],
        };
      },
      replaceHistory(history) {
        state = {
          ...state,
          bossHistory: [...history],
        };
      },
    },
    recommendations: {
      list: () => state.recommendations,
      replaceAll(recommendations) {
        state = {
          ...state,
          recommendations: [...recommendations],
        };
      },
    },
    xp: {
      list: () => state.xpLedger,
      replaceAll(transactions) {
        state = {
          ...state,
          xpLedger: [...transactions],
        };
      },
    },
    achievements: {
      list: () => state.achievements,
      replaceAll(achievements) {
        state = {
          ...state,
          achievements: [...achievements],
        };
      },
    },
    titles: {
      list: () => state.titles,
      replaceAll(titles) {
        state = {
          ...state,
          titles: [...titles],
        };
      },
    },
    journey: {
      list: () => state.journeyEvents,
      replaceAll(events) {
        state = {
          ...state,
          journeyEvents: [...events],
        };
      },
    },
    snapshots: {
      listWeekly: () => state.weeklySnapshots,
      listMonthly: () => state.monthlySnapshots,
      replaceWeekly(snapshots) {
        state = {
          ...state,
          weeklySnapshots: [...snapshots],
        };
      },
      replaceMonthly(snapshots) {
        state = {
          ...state,
          monthlySnapshots: [...snapshots],
        };
      },
    },
    getState: () => state,
    replaceState(nextState) {
      state = structuredClone(nextState) as EvolveLocalState;
    },
  };
}
