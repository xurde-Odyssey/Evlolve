import {
  aggregateWeeklyEvidence,
  buildActivityDevelopmentState,
  buildPillarStates,
  calculateProgressionRating,
  detectCoreWeaknesses,
  deriveBehavioralDebt,
  deriveBehavioralFriction,
  deriveDevelopmentPressure,
  evaluateAchievements,
  evaluateBossEligibility,
  evaluateCommitmentCapacity,
  evaluateLevelProgression,
  evaluateTitleEligibility,
  generateRecommendations,
  summarizeLifetimeXp,
  type ActivityDevelopmentState,
  type CoreWeaknessSignal,
  type DevelopmentPillar,
  type LevelProgressionState,
} from "../../domain/evolve-engine";
import { defaultAchievementDefinitions } from "../../domain/evolve-engine/achievements/definitions";
import { createDevelopmentAnalysis } from "../../domain/evolve-engine/analysis/development-analysis";
import { activityDefinitions } from "../../config/activity-definitions";
import { demoPersona } from "../../lib/demo/demo-persona";
import type { CharacterAttribute } from "../../components/dashboard/character-attributes";
import type { CharacterIdentityData } from "../../components/dashboard/dashboard-identity";
import type { AchievementSnapshot, Achievement, UserTitle } from "../../types/achievement";
import type { Book } from "../../types/book";
import type { BossChallenge } from "../../types/boss";
import type { ConsistencySnapshot } from "../../types/consistency";
import type { DailyExecutionSnapshot, DailyExecutionStatus } from "../../types/daily-execution";
import type { ImprovementArea, ImprovementSnapshot } from "../../types/improvement";
import type { JourneyMilestone, JourneySnapshot } from "../../types/journey";
import type { ProfileSnapshot } from "../../types/profile";
import type { DailyQuest, QuestStatus } from "../../types/quest";
import type { PeriodReport, ReportsSnapshot } from "../../types/report";
import type { WeeklyReminderSnapshot } from "../../types/weekly-reminder";
import {
  getCalendarBoundaryLabel,
  getNotificationDeadlineState,
  getProgressionDeadlineLabel,
  getReminderThresholdLabel,
} from "./time-policy";
import {
  getEvidenceForRequirement,
  getScheduledRequirementsForCurrentWeek,
  getScheduledRequirementsForDate,
} from "./scheduling";
import type { EvolveLocalState, ScheduledRequirement } from "./types";

export type EvolveEngineProjection = {
  activityStates: ActivityDevelopmentState[];
  coreWeaknesses: CoreWeaknessSignal[];
  levelState: LevelProgressionState;
  xp: ReturnType<typeof summarizeLifetimeXp>;
  capacity: ReturnType<typeof evaluateCommitmentCapacity>;
  recommendations: ReturnType<typeof generateRecommendations>;
  bossEligibility: ReturnType<typeof evaluateBossEligibility>;
  achievements: ReturnType<typeof evaluateAchievements>["awards"];
};

export function getEngineProjection(state: EvolveLocalState): EvolveEngineProjection {
  const activityStates = state.commitments.map((commitment) =>
    buildActivityDevelopmentState(state.evidence, {
      activityId: commitment.activityKey,
      anchorDate: state.now,
      currentTargetValue: commitment.targetValue,
    }),
  );
  const commitments = state.commitments.map((commitment) => ({
    commitmentId: commitment.id,
    activityId: commitment.activityKey,
    pillar: pillarForActivity(commitment.activityKey),
    tier: commitment.tier.toUpperCase() as "CORE" | "PRIORITY" | "FLEXIBLE",
  }));
  const coreWeaknesses = detectCoreWeaknesses({ activityStates, commitments });
  const behavioralFriction = deriveBehavioralFriction({ signals: [], restraintEvaluations: [] });
  const behavioralDebt = deriveBehavioralDebt({ friction: behavioralFriction, restraintEvaluations: [] });
  const pillarStates = buildPillarStates(activityStates);
  const developmentPressure = deriveDevelopmentPressure({ coreWeaknesses, interferenceSignals: [] });
  const rating = calculateProgressionRating({
    activityStates,
    pillarStates,
    coreWeaknesses,
    behavioralFriction,
    behavioralDebt,
    developmentPressure,
    monthlyEvaluations: state.monthlyEvaluations,
  });
  const levelState = evaluateLevelProgression({
    currentLevel: state.currentLevel,
    highestLevel: state.highestLevel,
    rating,
    now: state.now,
    candidate: state.candidate,
    risk: state.risk,
    monthlyEvaluations: [],
  });
  const capacity = evaluateCommitmentCapacity({
    previous: state.capacity,
    activityStates,
    monthlyEvaluations: state.monthlyEvaluations,
    coreWeaknesses,
    behavioralFriction,
    levelState,
    activeCommitmentCount: state.commitments.filter((commitment) => commitment.status === "active" && commitment.tier !== "flexible").length,
  });
  const bossEligibility = evaluateBossEligibility({
    activityStates,
    coreWeaknesses,
    developmentPressure,
    behavioralFriction,
    levelState,
    bossHistory: state.bossHistory,
    now: state.now,
  });
  const recommendations = generateRecommendations({
    activityStates,
    coreWeaknesses,
    developmentPressure,
    behavioralFriction,
    bossEligibility,
    levelState,
    commitmentCapacity: capacity,
    recommendationHistory: state.recommendations,
    now: state.now,
  });
  const achievementResult = evaluateAchievements({
    existingAwards: state.achievements,
    activityStates,
    monthlyEvaluations: state.monthlyEvaluations,
    bossHistory: state.bossHistory,
    levelState,
    now: state.now,
  });

  return {
    activityStates,
    coreWeaknesses,
    levelState,
    xp: summarizeLifetimeXp(state.xpLedger, state.now),
    capacity,
    recommendations,
    bossEligibility,
    achievements: [...state.achievements, ...achievementResult.awards],
  };
}

export function getDashboardViewModel(state: EvolveLocalState) {
  const projection = getEngineProjection(state);

  return {
    character: getDashboardProgressionViewModel(state, projection),
    consistency: getConsistencyViewModel(state, projection),
    dailyExecution: getTodayViewModel(state),
    dailyQuests: getDailyQuestViewModel(state),
    activityRecords: getActivityHistoryViewModel(state),
    weeklyReminders: getWeeklyReminderSnapshot(state),
    dashboardBoss: getBossViewModel(state, projection)[0],
    latestAchievement: getAchievementSnapshot(state, projection).achievements.find((achievement) => achievement.status === "earned"),
    improvements: getCommitmentViewModel(state, projection),
    attributes: getProgressSnapshotAttributes(state, projection),
  };
}

export function getDashboardProgressionViewModel(
  state: EvolveLocalState,
  projection = getEngineProjection(state),
): CharacterIdentityData {
  return {
    name: demoPersona.name,
    level: projection.levelState.currentLevel,
    highestLevel: projection.levelState.highestLevel.level,
    currentXp: projection.xp.totalLifetimeXp,
    levelStateLabel: levelDirectionLabel(projection.levelState),
    title: selectedTitleLabel(state, projection),
    streakDays: currentBestStreak(projection.activityStates).current,
    bestStreakDays: currentBestStreak(projection.activityStates).best,
  };
}

export function getDailyQuestViewModel(state: EvolveLocalState): DailyQuest[] {
  const requirements = getScheduledRequirementsForDate(state);

  return requirements.map((requirement) => {
    const evidence = getEvidenceForRequirement(state.evidence, requirement);
    const status = questStatusFromEvidence(requirement, evidence, state.now);

    return {
      id: requirement.id,
      title: requirement.title,
      source: "system",
      status,
      scheduleLabel: scheduleLabel(requirement, state),
      target: {
        activityKey: requirement.activityKey,
        measurementType: requirement.measurementType,
        value: requirement.targetValue,
        unit: requirement.unit,
      },
    };
  });
}

export function getActivityHistoryViewModel(state: EvolveLocalState) {
  return state.activityRecords;
}

export function getRecommendationsViewModel(
  state: EvolveLocalState,
  projection = getEngineProjection(state),
) {
  const decisions = new Map(state.recommendations.map((item) => [item.id, item.status]));

  return projection.recommendations.candidates.map((recommendation) => ({
    ...recommendation,
    status: decisions.get(recommendation.id) ?? recommendation.status,
  }));
}

export function getTodayViewModel(state: EvolveLocalState): DailyExecutionSnapshot {
  const quests = getDailyQuestViewModel(state);
  const unresolved = quests.filter((quest) => quest.status === "pending" || quest.status === "in_progress");
  const deadlineState = getNotificationDeadlineState({
    now: state.now,
    hasUnresolvedRequiredWork: unresolved.length > 0,
    policy: state.timePolicy,
  });
  const requiredCommitments = quests.filter((quest) => quest.status !== "excluded").length;
  const completedCommitments = quests.filter((quest) => quest.status === "completed" || quest.status === "qualifying_partial").length;
  const missedCommitments = quests.filter((quest) => quest.status === "missed").length;

  return {
    currentTimeLabel: formatTime(state.now, state.timePolicy.timezone),
    warningThresholdLabel: getReminderThresholdLabel(state.timePolicy),
    deadlineLabel: getProgressionDeadlineLabel(state.timePolicy),
    calendarBoundaryLabel: getCalendarBoundaryLabel(state.timePolicy),
    timeRemainingLabel: deadlineState === "closeout" ? undefined : "Before progression deadline",
    alertLevel: deadlineState === "critical" ? "critical" : deadlineState === "warning" ? "warning" : deadlineState === "before_warning" ? undefined : "reminder",
    deadlineState,
    automaticFreezeAvailable: false,
    items: quests.map((quest) => ({
      id: quest.id,
      title: quest.title,
      activityKey: quest.target?.activityKey,
      targetLabel: quest.target?.value ? `${quest.target.value} ${quest.target.unit}` : undefined,
      actualLabel: actualLabelForQuest(state, quest),
      status: dailyStatusFromQuest(quest.status),
    })),
    bossAlerts: getBossViewModel(state).slice(0, 1).map((boss) => ({
      id: boss.id,
      title: boss.title,
      status: boss.status,
      targetLabel: `${boss.measurement.target} ${boss.measurement.unit}`,
      progressLabel: boss.currentProgress ? `${boss.currentProgress} ${boss.measurement.unit}` : undefined,
      deadlineLabel: boss.deadlineLabel,
      message: boss.generatedReason ?? "Generated from current engine evidence.",
    })),
    reading: getReadingTodayState(state),
    inactiveAlerts: state.commitments
      .filter((commitment) => commitment.inactiveUntil)
      .map((commitment) => ({
        id: `inactive:${commitment.id}`,
        title: "Inactive Mode",
        message: `${commitment.title} is excluded until ${commitment.inactiveUntil}.`,
        state: "started" as const,
      })),
    notifications: unresolved.length > 0
      ? [
          {
            id: "deadline-unresolved",
            type: "deadline",
            severity: deadlineState === "critical" || deadlineState === "closeout" ? "critical" : "reminder",
            title: "Required work remains",
            message: `${unresolved.length} Daily Quest${unresolved.length === 1 ? "" : "s"} unresolved before ${getProgressionDeadlineLabel(state.timePolicy)}.`,
            createdAt: formatTime(state.now, state.timePolicy.timezone),
            mandatory: true,
          },
        ]
      : [],
    weeklyReminders: getWeeklyReminderSnapshot(state),
    scenarios: [
      { id: "before-5", label: `Before ${getReminderThresholdLabel(state.timePolicy)}`, description: "Unresolved work remains normal priority.", deadlineState: "before_warning" },
      { id: "after-5", label: `After ${getReminderThresholdLabel(state.timePolicy)}`, description: "Unresolved work receives attention.", alertLevel: "reminder", deadlineState: "reminder" },
      { id: "critical", label: `Approaching ${getProgressionDeadlineLabel(state.timePolicy)}`, description: "Unresolved work is critical.", alertLevel: "critical", deadlineState: "critical" },
      { id: "closed", label: `After ${getProgressionDeadlineLabel(state.timePolicy)}`, description: "Unresolved requirements close as missed.", deadlineState: "closeout" },
    ],
    closeout: {
      requiredCommitments,
      completedCommitments,
      missedCommitments,
      overallEvaluationLabel: completedCommitments === requiredCommitments ? "Complete" : "Open",
      progressionImpactLabel: "Progression uses classified evidence only.",
    },
  };
}

export function getConsistencyViewModel(
  state: EvolveLocalState,
  projection = getEngineProjection(state),
): ConsistencySnapshot {
  const streaks = projection.activityStates.map((activityState) => {
    const commitment = state.commitments.find((item) => item.activityKey === activityState.activityId);
    const current = streakForActivity(state, String(activityState.activityId));

    return {
      activityKey: activityState.activityId as ConsistencySnapshot["activityStreaks"][number]["activityKey"],
      activityLabel: activityLabel(String(activityState.activityId)),
      currentStreak: current.current,
      bestStreak: current.best,
      status: commitment?.inactiveUntil ? "inactive" : "active",
      todayState: todayStateForActivity(state, String(activityState.activityId)),
      scheduleLabel: commitment ? scheduleLabelForCommitment(commitment) : "Active",
      inactiveDays: commitment?.inactiveUntil ? 1 : undefined,
      inactiveLimitDays: 7,
    } satisfies ConsistencySnapshot["activityStreaks"][number];
  });

  return {
    overall: {
      currentStreak: Math.max(...streaks.map((item) => item.currentStreak), 0),
      bestStreak: Math.max(...streaks.map((item) => item.bestStreak), 0),
      qualifiedToday: getDailyQuestViewModel(state).some((quest) => quest.status === "completed"),
    },
    activityStreaks: streaks,
    availableFreezes: 0,
    inactiveLimitDays: 7,
  };
}

export function getProgressSnapshotAttributes(
  state: EvolveLocalState,
  projection = getEngineProjection(state),
): CharacterAttribute[] {
  const weekRequirements = getScheduledRequirementsForCurrentWeek(state);

  return state.commitments.slice(0, 7).map((commitment) => {
    const activityEvidence = state.evidence.filter((item) => item.activityId === commitment.activityKey);
    const weeklyEvidence = activityEvidence.filter((item) =>
      weekRequirements.some((requirement) => requirement.id === `requirement:${item.commitmentId}:${item.scheduledFor}`),
    );
    const actual = weeklyEvidence.reduce((total, item) => total + (item.actualValue ?? 0), 0);
    const target = weekRequirements
      .filter((requirement) => requirement.commitmentId === commitment.id)
      .reduce((total, requirement) => total + requirement.targetValue, 0);
    const stateForActivity = projection.activityStates.find((item) => item.activityId === commitment.activityKey);

    return {
      key: attributeKeyForActivity(commitment.activityKey),
      label: commitment.title,
      value: actual > 0 ? `${round(actual)} ${commitment.unit}` : statusLabel(stateForActivity?.capability.baselineState ?? "NEW"),
      context: actual > 0 ? "This week" : "Baseline",
      progress: target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : Math.round((stateForActivity?.consistency.value ?? 0) * 100),
    };
  });
}

export function getCommitmentViewModel(
  state: EvolveLocalState,
  projection = getEngineProjection(state),
): ImprovementSnapshot {
  const areas: ImprovementArea[] = state.commitments.map((commitment) => {
    const activityState = projection.activityStates.find((item) => item.activityId === commitment.activityKey);
    const adaptation = state.targetAdaptations.find((item) => item.activityId === commitment.activityKey);

    return {
      id: commitment.id,
      title: commitment.title,
      activityKey: commitment.activityKey,
      tier: commitment.tier,
      status: commitment.status,
      startedAt: commitment.startedAt,
      inactiveSince: commitment.inactiveUntil,
      completedAt: commitment.completedAt,
      source: "predefined",
      progressBehavior: "cumulative",
      measurementLabel: [
        `${commitment.targetValue} ${commitment.unit}`,
        scheduleLabelForCommitment(commitment),
        activityState ? relationshipLabel(activityState.targetRelationship.state) : null,
        adaptation ? adaptation.status : null,
      ].filter(Boolean).join(" / "),
    };
  });

  return {
    commitmentCapacity: projection.capacity.currentCapacity,
    inactiveLimitDays: 7,
    areas,
    predefinedAreas: [],
    programs: [],
  };
}

export function getBossViewModel(
  state: EvolveLocalState,
  projection = getEngineProjection(state),
): BossChallenge[] {
  const activeBosses = state.activeBosses.map((boss): BossChallenge => {
    const requirement = boss.requirements[0];

    return {
      id: boss.id,
      title: boss.title,
      description: undefined,
      activityKey: (requirement?.activityId ?? "custom") as BossChallenge["activityKey"],
      activityLabel: activityLabel(String(requirement?.activityId ?? "custom")),
      evaluationType: "single_value",
      measurement: {
        type: "distance",
        target: requirement?.targetValue ?? 1,
        unit: requirement?.unit ?? "units",
      },
      currentProgress: currentBossProgress(state, boss),
      status: boss.status.toLowerCase() as BossChallenge["status"],
      deadline: boss.expiresAt,
      deadlineLabel: boss.expiresAt ? "Evidence window active" : undefined,
      generatedReason: boss.reason.supportingEvidence[0] ?? boss.reason.summaryKey,
      evidence: boss.reason.supportingEvidence.map((item, index) => ({
        label: `Evidence ${index + 1}`,
        value: item,
      })),
    };
  });
  const offered = projection.bossEligibility.candidates
    .filter((candidate) => !state.activeBosses.some((boss) => boss.id === candidate.id))
    .map((candidate): BossChallenge => {
    const requirement = candidate.requirements[0];
    const activityState = projection.activityStates.find((item) => item.activityId === requirement?.activityId);

    return {
      id: candidate.id,
      title: candidate.title,
      description: undefined,
      activityKey: (requirement?.activityId ?? "custom") as BossChallenge["activityKey"],
      activityLabel: activityLabel(String(requirement?.activityId ?? "custom")),
      evaluationType: "single_value",
      measurement: {
        type: "distance",
        target: requirement?.targetValue ?? 1,
        unit: requirement?.unit ?? "units",
      },
      currentProgress: activityState?.capability.peakCapability.value ?? undefined,
      status: "offered",
      deadline: candidate.expiresAt,
      deadlineLabel: candidate.expiresAt ? "Evidence window active" : undefined,
      generatedReason: candidate.reason.supportingEvidence[0] ?? candidate.reason.summaryKey,
      evidence: candidate.reason.supportingEvidence.map((item, index) => ({
        label: `Evidence ${index + 1}`,
        value: item,
      })),
    };
  });

  return [...activeBosses, ...offered];
}

export function getAchievementSnapshot(
  state: EvolveLocalState,
  projection = getEngineProjection(state),
): AchievementSnapshot {
  const earned = new Set(projection.achievements.map((award) => award.definitionId));
  const achievements: Achievement[] = defaultAchievementDefinitions
    .filter((definition) => definition.visibility !== "HIDDEN_UNTIL_EARNED" || earned.has(definition.id))
    .map((definition) => {
      const award = projection.achievements.find((item) => item.definitionId === definition.id);

      return {
        id: definition.id,
        title: definition.name,
        description: definition.description,
        category: definition.category.toLowerCase() as Achievement["category"],
        status: award ? "earned" : "locked",
        tierLabel: definition.tier,
        earnedAt: award?.earnedAt?.slice(0, 10),
        hiddenUntilEarned: definition.visibility === "HIDDEN_UNTIL_EARNED",
        major: definition.major,
      };
    });
  const titles = titleViewModels(state, projection);

  return { achievements, titles };
}

export function getJourneyViewModel(
  state: EvolveLocalState,
  projection = getEngineProjection(state),
): JourneySnapshot {
  const achievementMilestones = getAchievementSnapshot(state, projection).achievements
    .filter((achievement) => achievement.status === "earned" && achievement.major)
    .map((achievement): JourneyMilestone => ({
      id: `journey:${achievement.id}`,
      type: "achievement",
      title: achievement.title,
      description: achievement.description,
      status: "completed",
      completedAt: achievement.earnedAt,
    }));
  const current: JourneyMilestone = {
    id: "journey:current-level",
    type: "level",
    title: `Current Level ${projection.levelState.currentLevel}`,
    description: levelDirectionLabel(projection.levelState),
    status: "current",
    level: projection.levelState.currentLevel,
  };

  return {
    currentLevel: projection.levelState.currentLevel,
    highestLevel: projection.levelState.highestLevel.level,
    completedMilestoneCount: achievementMilestones.length,
    currentMilestoneLabel: current.title,
    milestones: [...achievementMilestones, current],
  };
}

export function getReportsViewModel(
  state: EvolveLocalState,
  projection = getEngineProjection(state),
): ReportsSnapshot {
  const weekly = aggregateWeeklyEvidence(state.evidence, state.now);
  const period: PeriodReport = {
    period: {
      key: "this_week",
      label: "This Week",
      rangeLabel: "Sunday-Saturday",
    },
    overview: {
      requiredCommitments: weekly.eligibleRequirements,
      completedCommitments: weekly.fullCount + weekly.qualifyingPartialCount,
      missedCommitments: weekly.missedCount,
      overallConsistencyPercent: weekly.consistencyPercentage,
      activitiesTracked: projection.activityStates.length,
    },
    activities: projection.activityStates.map((activityState) => ({
      activityKey: activityState.activityId as PeriodReport["activities"][number]["activityKey"],
      activityLabel: activityLabel(String(activityState.activityId)),
      measurementType: "completion",
      primaryMetric: {
        label: "Output",
        target: activityState.executionSummary.expectedOutput,
        actual: activityState.executionSummary.rawActualOutput,
        unit: String(state.commitments.find((commitment) => commitment.activityKey === activityState.activityId)?.unit ?? "units"),
        difference: activityState.executionSummary.rawActualOutput - activityState.executionSummary.expectedOutput,
        variancePercent: activityState.executionSummary.rawOutputRatio === null ? null : Math.round((activityState.executionSummary.rawOutputRatio - 1) * 100),
      },
      secondaryMetrics: [
        { label: "Reliability", value: activityState.reliability.state },
        { label: "Capability", value: statusLabel(activityState.capability.baselineState) },
      ],
      requiredSessions: activityState.executionSummary.eligibleRequirements,
      completedSessions: activityState.executionSummary.fullCount + activityState.executionSummary.qualifyingPartialCount,
      missedSessions: activityState.executionSummary.missedCount,
      developmentSignals: {
        reliabilityState: activityState.reliability.state,
        momentum: activityState.consistency.direction,
        gapClassification: activityState.gapClassification.classification,
        targetRelationship: activityState.targetRelationship.state,
      },
    })),
    consistency: {
      overallPercent: weekly.consistencyPercentage,
      items: projection.activityStates.map((activityState) => ({
        activityKey: activityState.activityId as PeriodReport["consistency"]["items"][number]["activityKey"],
        activityLabel: activityLabel(String(activityState.activityId)),
        consistencyPercent: Math.round((activityState.consistency.value ?? 0) * 100),
        currentStreak: streakForActivity(state, String(activityState.activityId)).current,
        bestStreak: streakForActivity(state, String(activityState.activityId)).best,
      })),
    },
    reading: getReadingReport(state),
    comparisons: {
      weekly: [],
      monthly: [],
      zeroPrevious: {
        label: "No previous comparison",
        previousLabel: "Previous",
        currentLabel: "Current",
        previousValue: 0,
        currentValue: weekly.fullCount,
        unit: "sessions",
        changePercent: null,
      },
    },
    progression: {
      startingLevel: state.currentLevel,
      currentLevel: projection.levelState.currentLevel,
      highestLevel: projection.levelState.highestLevel.level,
      levelChange: projection.levelState.currentLevel - state.currentLevel,
      xp: {
        activity: projection.xp.executionXp,
        boss: projection.xp.bossXp,
        bonus: projection.xp.achievementXp + projection.xp.progressionXp,
        lost: 0,
        net: projection.xp.totalLifetimeXp,
      },
    },
    baseline: projection.activityStates.map((activityState) => ({
      activityKey: activityState.activityId as PeriodReport["baseline"][number]["activityKey"],
      activityLabel: activityLabel(String(activityState.activityId)),
      observationLabel: statusLabel(activityState.capability.baselineState),
    })),
    systemAnalysis: {
      available: state.monthlySnapshots.length > 0,
      message: state.monthlySnapshots.length > 0
        ? "Historical snapshot available."
        : "No stored monthly snapshot yet; current view uses live local projection.",
    },
  };

  return { periods: [period] };
}

export function getProfileViewModel(
  state: EvolveLocalState,
  projection = getEngineProjection(state),
): ProfileSnapshot {
  const pillarStates = buildPillarStates(projection.activityStates);
  const analysis = createDevelopmentAnalysis({
    pillarStates,
    behavioralFriction: deriveBehavioralFriction({ signals: [], restraintEvaluations: [] }),
  });
  const achievements = getAchievementSnapshot(state, projection);

  return {
    personal: {
      name: demoPersona.name,
      age: 29,
      goals: ["Improve endurance", "Read consistently", "Build career skills"],
    },
    avatar: { asset: "/evolve.svg", label: "Evolve profile mark" },
    level: {
      currentLevel: projection.levelState.currentLevel,
      highestLevel: projection.levelState.highestLevel.level,
      totalXp: projection.xp.totalLifetimeXp,
      evolvingSince: demoPersona.evolvingSince,
      activeDays: demoPersona.activeDays,
    },
    titles: achievements.titles,
    consistency: {
      currentConsistencyPercent: Math.round(aggregateWeeklyEvidence(state.evidence, state.now).consistencyPercentage ?? 0),
      currentOverallStreak: getConsistencyViewModel(state, projection).overall.currentStreak,
      bestOverallStreak: getConsistencyViewModel(state, projection).overall.bestStreak,
      disciplineLabel: projection.coreWeaknesses.length > 0 ? "Rebuilding core consistency" : "Stable recent execution",
      activityConsistency: projection.activityStates.map((activityState) => ({
        activityKey: activityState.activityId as ProfileSnapshot["consistency"]["activityConsistency"][number]["activityKey"],
        activityLabel: activityLabel(String(activityState.activityId)),
        consistencyPercent: Math.round((activityState.consistency.value ?? 0) * 100),
      })),
    },
    currentDevelopment: state.commitments
      .filter((commitment): commitment is typeof commitment & { tier: "core" | "priority" } => commitment.status === "active" && commitment.tier !== "flexible")
      .map((commitment) => ({ id: commitment.id, title: commitment.title, tier: commitment.tier })),
    recentPerformance: getProgressSnapshotAttributes(state, projection).map((attribute) => ({
      id: attribute.key,
      label: attribute.label,
      value: attribute.value,
      context: attribute.context,
    })),
    lifetime: [
      { id: "lifetime-xp", label: "Lifetime XP", value: projection.xp.totalLifetimeXp.toLocaleString("en-US") },
      { id: "records", label: "Activity records", value: String(state.activityRecords.length) },
      { id: "bosses", label: "Bosses completed", value: String(state.bossHistory.filter((boss) => boss.status === "COMPLETED").length) },
    ],
    records: projection.activityStates.map((activityState) => ({
      id: `record:${activityState.activityId}`,
      label: `${activityLabel(String(activityState.activityId))} peak`,
      value: activityState.capability.peakCapability.value === null ? "Building" : String(round(activityState.capability.peakCapability.value)),
    })),
    monthlyAnalysis: {
      periodLabel: "Current month",
      summary: monthlySummary(analysis.strongestDevelopment, analysis.weakestDevelopment),
      strongestAreas: analysis.strongestDevelopment.map((pillar) => ({
        id: `strong:${pillar}`,
        title: pillar,
        direction: "strong",
        evidence: ["Current domain analysis marks this pillar as a stronger area."],
      })),
      weakAreas: analysis.weakestDevelopment.map((pillar) => ({
        id: `weak:${pillar}`,
        title: pillar,
        direction: "weak",
        evidence: ["Current domain analysis marks this pillar as limiting."],
      })),
    },
    majorAchievements: achievements.achievements.filter((achievement) => achievement.major && achievement.status === "earned"),
    progressionHistory: [
      { id: "current-level", label: "Current Level", value: `Level ${projection.levelState.currentLevel}`, context: levelDirectionLabel(projection.levelState) },
      { id: "highest-level", label: "Highest Level", value: `Level ${projection.levelState.highestLevel.level}`, context: "Historical" },
      { id: "journey-events", label: "Journey milestones", value: String(getJourneyViewModel(state, projection).completedMilestoneCount), context: "Major events" },
    ],
  };
}

function questStatusFromEvidence(
  requirement: ScheduledRequirement,
  evidence: ReturnType<typeof getEvidenceForRequirement>,
  now: string,
): QuestStatus {
  if (requirement.exclusionState !== "NONE") return "excluded";
  if (evidence.some((item) => item.executionState === "FULL")) return "completed";
  if (evidence.some((item) => item.executionState === "QUALIFYING_PARTIAL")) return "qualifying_partial";
  if (evidence.some((item) => item.executionState === "ATTEMPT" || item.executionState === "INSUFFICIENT_EFFORT")) return "attempted";
  if (evidence.some((item) => item.executionState === "MISSED")) return "missed";
  if (new Date(now).getTime() > new Date(requirement.deadlineAt).getTime()) return "missed";
  return "pending";
}

function dailyStatusFromQuest(status: QuestStatus): DailyExecutionStatus {
  if (status === "completed" || status === "qualifying_partial") return "completed";
  if (status === "missed") return "missed";
  if (status === "excluded") return "inactive";
  if (status === "attempted") return "pending";
  return "pending";
}

function actualLabelForQuest(state: EvolveLocalState, quest: DailyQuest) {
  const requirement = getScheduledRequirementsForDate(state).find((item) => item.id === quest.id);
  if (!requirement) return undefined;
  const actual = getEvidenceForRequirement(state.evidence, requirement).reduce((total, item) => total + (item.actualValue ?? 0), 0);

  return actual > 0 ? `${round(actual)} ${requirement.unit}` : undefined;
}

function getReadingTodayState(state: EvolveLocalState): DailyExecutionSnapshot["reading"] {
  const reading = state.commitments.find((commitment) => commitment.activityKey === "reading");
  if (!reading) return undefined;
  const currentBook = getCurrentBook(state.books);
  if (!currentBook) return undefined;
  const pagesRead = getReadingPagesRead(state, currentBook);
  const pagesRemaining = Math.max(currentBook.totalPages - pagesRead, 0);

  return {
    title: "Reading",
    bookTitle: currentBook.title,
    pagesRead,
    totalPages: currentBook.totalPages,
    pagesRemaining,
    requiredToday: getDailyQuestViewModel(state).some((quest) => quest.target?.activityKey === "reading"),
    status: reading.readingRecoveryUntil ? "recovery" : pagesRemaining === 0 ? "completed" : "pending",
  };
}

function getReadingReport(state: EvolveLocalState): PeriodReport["reading"] {
  const currentBook = getCurrentBook(state.books);
  const readingEvidence = state.evidence.filter((item) => item.activityId === "reading");
  const totalPagesRead = readingEvidence.reduce((total, item) => total + (item.actualValue ?? 0), 0);
  const completedBooks = state.books
    .filter((book) => book.status === "completed")
    .map((book) => ({
      book,
      completionDays: book.finishedAt ? daysBetween(book.startedAt, book.finishedAt) : null,
    }));
  const completionDays = completedBooks
    .map((item) => item.completionDays)
    .filter((value): value is number => value !== null);
  const activeDays = currentBook ? Math.max(daysBetween(currentBook.startedAt, state.now.slice(0, 10)), 1) : 1;

  return {
    currentBook: currentBook
      ? {
          book: currentBook,
          pagesRead: Math.min(totalPagesRead, currentBook.totalPages),
          pagesRemaining: Math.max(currentBook.totalPages - totalPagesRead, 0),
          progressPercent: currentBook.totalPages > 0
            ? Math.min(Math.round((totalPagesRead / currentBook.totalPages) * 100), 100)
            : 0,
          startedLabel: formatDate(currentBook.startedAt, state.timePolicy.timezone),
        }
      : undefined,
    completedBooks,
    metrics: {
      booksCompleted: completedBooks.length,
      pagesRead: totalPagesRead,
      averagePagesPerDay: currentBook ? round(totalPagesRead / activeDays) : 0,
      averageCompletionDays: completionDays.length > 0 ? round(average(completionDays)) : null,
      fastestCompletionDays: completionDays.length > 0 ? Math.min(...completionDays) : null,
    },
  };
}

function getCurrentBook(books: readonly Book[]) {
  return books.find((book) => book.status === "reading");
}

function getReadingPagesRead(state: EvolveLocalState, book: Book) {
  return state.evidence
    .filter((item) => item.activityId === "reading")
    .filter((item) => String(item.occurredAt ?? item.scheduledFor ?? item.createdAt) >= book.startedAt)
    .reduce((total, item) => total + (item.actualValue ?? 0), 0);
}

function currentBossProgress(state: EvolveLocalState, boss: EvolveLocalState["activeBosses"][number]) {
  const requirement = boss.requirements[0];
  if (!requirement?.activityId) return undefined;

  return state.evidence
    .filter((item) => item.activityId === requirement.activityId)
    .filter((item) => item.deadlineState === "ON_TIME")
    .reduce((best, item) => Math.max(best, item.actualValue ?? 0), 0);
}

function getWeeklyReminderSnapshot(state: EvolveLocalState): WeeklyReminderSnapshot {
  return {
    maxActive: 3,
    reminders: state.weeklyReminders,
  };
}

function titleViewModels(
  state: EvolveLocalState,
  projection: EvolveEngineProjection,
): UserTitle[] {
  const titles = state.titles;

  return evaluateTitleEligibility({
    titles,
    achievements: projection.achievements,
    activityStates: projection.activityStates,
    levelState: projection.levelState,
  }).map((result) => ({
    id: result.title.id,
    name: result.title.name,
    description: result.reason,
    sourceType: result.title.sourceType.toLowerCase() as UserTitle["sourceType"],
    sourceId: result.title.sourceId,
    eligibility: result.eligibility === "ELIGIBLE" ? "active" : "inactive",
    earnedAt: result.title.earnedAt.slice(0, 10),
    selected: Boolean(result.title.selected && result.eligibility === "ELIGIBLE"),
  }));
}

function selectedTitleLabel(state: EvolveLocalState, projection: EvolveEngineProjection) {
  return titleViewModels(state, projection).find((title) => title.selected)?.name ?? "Evolving";
}

function currentBestStreak(activityStates: readonly ActivityDevelopmentState[]) {
  const current = Math.max(...activityStates.map((state) => streakLength(state)), 0);
  return { current, best: current };
}

function streakForActivity(state: EvolveLocalState, activityId: string) {
  const activityEvidence = state.evidence
    .filter((item) => String(item.activityId) === activityId)
    .sort((a, b) => String(a.scheduledFor ?? a.occurredAt).localeCompare(String(b.scheduledFor ?? b.occurredAt)));
  let current = 0;
  let best = 0;

  for (const evidence of activityEvidence) {
    if (evidence.executionState === "EXCLUDED") continue;
    if (evidence.executionState === "FULL" || evidence.executionState === "QUALIFYING_PARTIAL") {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return { current, best };
}

function streakLength(state: ActivityDevelopmentState) {
  const signals = state.consistency.profile.currentWeek.patternSignals;
  return signals.longestFullCluster;
}

function todayStateForActivity(
  state: EvolveLocalState,
  activityId: string,
): ConsistencySnapshot["activityStreaks"][number]["todayState"] {
  const quest = getDailyQuestViewModel(state).find((item) => item.target?.activityKey === activityId);
  if (!quest) return "scheduled_rest";
  if (quest.status === "completed" || quest.status === "qualifying_partial") return "completed";
  if (quest.status === "missed") return "missed";
  if (quest.status === "excluded") return "inactive";
  return "pending";
}

function scheduleLabel(requirement: ScheduledRequirement, state: EvolveLocalState) {
  return `${requirement.scheduledDate} by ${getProgressionDeadlineLabel(state.timePolicy)}`;
}

function scheduleLabelForCommitment(commitment: { schedule: { type: string; weekdays?: readonly string[] } }) {
  if (commitment.schedule.type === "daily") return "Daily";
  if (commitment.schedule.type === "weekday") return "Weekdays";
  return commitment.schedule.weekdays?.join(" / ") ?? "Scheduled";
}

function activityLabel(activityId: string) {
  return activityDefinitions.find((definition) => definition.key === activityId)?.label ?? activityId;
}

function pillarForActivity(activityId: string): DevelopmentPillar {
  if (activityId === "running" || activityId === "workout" || activityId === "sleep" || activityId === "water") return "HEALTH";
  if (activityId === "meditation") return "BALANCE";
  if (activityId === "reading" || activityId === "coding") return "CAPABILITY";
  return "DISCIPLINE";
}

function attributeKeyForActivity(activityId: string): CharacterAttribute["key"] {
  if (activityId === "running") return "running";
  if (activityId === "reading") return "reading";
  if (activityId === "workout") return "training";
  if (activityId === "coding" || activityId === "learning" || activityId === "career_project") return "career";
  if (activityId === "meditation") return "social";
  if (activityId === "sleep" || activityId === "water") return "health";
  return "discipline";
}

function relationshipLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function statusLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function levelDirectionLabel(levelState: LevelProgressionState) {
  if (levelState.view.state === "LEVEL_AT_RISK") return "At risk";
  if (levelState.view.state === "CONFIRMING") return "Confirming";
  if (levelState.view.state === "RECOVERING") return "Recovering";
  if (levelState.view.state === "RISING") return "Rising";
  return "Stable";
}

function monthlySummary(strongest: readonly string[], weakest: readonly string[]) {
  if (weakest.length > 0) {
    return `${weakest[0]} is currently the main limiting area.`;
  }

  if (strongest.length > 0) {
    return `${strongest[0]} is the clearest current development signal.`;
  }

  return "More evidence is needed before monthly interpretation is meaningful.";
}

function formatTime(instant: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(instant));
}

function formatDate(date: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function daysBetween(start: string, end: string) {
  const startTime = new Date(`${start.slice(0, 10)}T00:00:00.000Z`).getTime();
  const endTime = new Date(`${end.slice(0, 10)}T00:00:00.000Z`).getTime();

  return Math.max(0, Math.round((endTime - startTime) / 86_400_000) + 1);
}

function average(values: readonly number[]) {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
