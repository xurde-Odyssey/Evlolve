import type {
  ActivityExecutionEvidence,
  BossContract,
  BossHistoryRecord,
  CommitmentCapacityState,
  EarnedTitleRecord,
  HighestLevelRecord,
  JourneyProgressionEvent,
  LevelCandidateState,
  LevelRiskState,
  MonthlyDevelopmentSnapshot,
  MonthlyEvaluationRecord,
  RecommendationHistoryRecord,
  TargetAdaptationState,
  TargetHistoryRecord,
  WeeklyDevelopmentSnapshot,
  XpTransaction,
} from "../../domain/evolve-engine";
import type { AchievementAward } from "../../domain/evolve-engine";
import type { ActivityKey, ActivityRecord, MeasurementType } from "../../types/activity";
import type { Book } from "../../types/book";
import type { WeeklyReminder } from "../../types/weekly-reminder";
import type { UserTimePolicy } from "./time-policy";

export type CommitmentSchedule =
  | { type: "daily" }
  | { type: "weekday" }
  | { type: "specific_weekdays"; weekdays: readonly Weekday[] };

export type Weekday =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

export type GrowthCommitment = {
  id: string;
  title: string;
  activityKey: ActivityKey;
  tier: "core" | "priority" | "flexible";
  status: "active" | "inactive" | "completed";
  schedule: CommitmentSchedule;
  measurementType: MeasurementType;
  targetValue: number;
  unit: string;
  startedAt: string;
  completedAt?: string;
  inactiveUntil?: string;
  readingRecoveryUntil?: string;
  readingRecoveryDays?: 2 | 3;
  targetHistory: readonly TargetHistoryRecord[];
};

export type ScheduledRequirement = {
  id: string;
  commitmentId: string;
  activityKey: ActivityKey;
  title: string;
  tier: GrowthCommitment["tier"];
  scheduledDate: string;
  timezone: string;
  deadlineAt: string;
  targetValue: number;
  unit: string;
  measurementType: MeasurementType;
  exclusionState: ActivityExecutionEvidence["exclusionState"];
};

export type EvolveLocalState = {
  userId: string;
  now: string;
  timePolicy: UserTimePolicy;
  commitments: GrowthCommitment[];
  activityRecords: ActivityRecord[];
  evidence: ActivityExecutionEvidence[];
  xpLedger: XpTransaction[];
  weeklyReminders: WeeklyReminder[];
  books: Book[];
  activeBosses: BossContract[];
  bossHistory: BossHistoryRecord[];
  recommendations: RecommendationHistoryRecord[];
  targetAdaptations: TargetAdaptationState[];
  achievements: AchievementAward[];
  titles: EarnedTitleRecord[];
  journeyEvents: JourneyProgressionEvent[];
  weeklySnapshots: WeeklyDevelopmentSnapshot[];
  monthlySnapshots: MonthlyDevelopmentSnapshot[];
  monthlyEvaluations: MonthlyEvaluationRecord[];
  currentLevel: number;
  highestLevel: HighestLevelRecord;
  candidate?: LevelCandidateState;
  risk?: LevelRiskState;
  capacity: CommitmentCapacityState;
};

export type ActivityLogInput = {
  idempotencyKey?: string;
  activityKey: ActivityKey;
  measurementType: MeasurementType;
  value?: number;
  unit?: string;
  notes?: string;
  occurredAt: string;
};

export type ActivityLogResult = {
  state: EvolveLocalState;
  record: ActivityRecord;
  evidence: ActivityExecutionEvidence[];
  xpAwarded: number;
  matchedRequirementCount: number;
};

export type EvolveCommandErrorCode =
  | "CAPACITY_EXCEEDED"
  | "COMMITMENT_LOCKED"
  | "INVALID_TARGET_CHANGE"
  | "DEADLINE_CLOSED"
  | "BOSS_NOT_ACCEPTABLE"
  | "RECOMMENDATION_SUPERSEDED"
  | "DUPLICATE_ACTIVITY_EVIDENCE"
  | "INVALID_INACTIVE_PERIOD";

export class EvolveCommandError extends Error {
  constructor(
    readonly code: EvolveCommandErrorCode,
    message: string,
  ) {
    super(message);
  }
}
