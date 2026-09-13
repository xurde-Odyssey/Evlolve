import type {
  ActivityExecutionEvidence,
  BehaviorBoundary,
  BehaviorOccurrence,
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
import type { ActivityKey, ActivityRecord, MeasurementType, WorkoutExercise } from "../../types/activity";
import type { Book } from "../../types/book";
import type { LearningTrack } from "../../types/learning-track";
import type { MajorMilestone } from "../../types/major-milestone";
import type { NotepadNote } from "../../types/notepad";
import type { WeeklyReminder } from "../../types/weekly-reminder";
import type { UserTimePolicy } from "./time-policy";

export type CommitmentSchedule =
  | { type: "daily" }
  | { type: "times_per_week"; timesPerWeek: number }
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

export type EvolveProfile = {
  displayName?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  goals?: string[];
  timezone: string;
  evolveSince?: string;
  onboardingState?: string;
  selectedTitleId?: string;
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
  weeklyQuota?: number;
};

export type EvolveLocalState = {
  userId: string;
  now: string;
  timePolicy: UserTimePolicy;
  profile?: EvolveProfile;
  commitments: GrowthCommitment[];
  activityRecords: ActivityRecord[];
  evidence: ActivityExecutionEvidence[];
  xpLedger: XpTransaction[];
  weeklyReminders: WeeklyReminder[];
  books: Book[];
  learningTracks: LearningTrack[];
  majorMilestones: MajorMilestone[];
  notepadNotes: NotepadNote[];
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
  behaviorBoundaries: BehaviorBoundary[];
  behaviorOccurrences: BehaviorOccurrence[];
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
  exercise?: WorkoutExercise;
  notes?: string;
  occurredAt: string;
  learningTrackId?: string;
  learningMilestoneId?: string;
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
  | "INVALID_ACTIVITY"
  | "INVALID_INACTIVE_PERIOD";

export class EvolveCommandError extends Error {
  constructor(
    readonly code: EvolveCommandErrorCode,
    message: string,
  ) {
    super(message);
  }
}
