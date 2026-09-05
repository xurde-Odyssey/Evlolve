import { evaluateAchievements } from "../../achievements/engine";
import { evaluateBossEligibility } from "../../boss/eligibility";
import { completeBoss, failBoss, offerBoss, rejectBoss } from "../../boss/state";
import { deriveBehavioralDebt } from "../../behavior/debt";
import { deriveBehavioralFriction } from "../../behavior/friction";
import { detectBehaviorInterference } from "../../behavior/interference";
import { evaluateRestraintContract } from "../../behavior/restraint";
import {
  evaluateCommitmentCapacity,
  initialCommitmentCapacityState,
} from "../../capacity/state";
import { buildActivityDevelopmentState } from "../../development/activity-state";
import { classifyExecution } from "../../execution/classifier";
import { createJourneyEvents } from "../../journey/events";
import { buildPillarStates } from "../../pillars/mapping";
import { detectCoreWeaknesses } from "../../pillars/core-weakness";
import { deriveDevelopmentPressure } from "../../pillars/pressure";
import { evaluateLevelProgression } from "../../progression/level-state";
import { calculateProgressionRating } from "../../progression/rating";
import { generateRecommendations } from "../../recommendation/engine";
import {
  evaluateTargetAdaptation,
  evaluateTargetProgression,
  startTargetAdaptation,
} from "../../target/progression";
import { evaluateTitleEligibility } from "../../titles/eligibility";
import { appendXpTransactions, summarizeLifetimeXp } from "../../xp/ledger";
import {
  createBossXpTransaction,
  createExecutionXpTransaction,
  createProgressionXpTransaction,
} from "../../xp/policy";
import { processMonthlyCloseout, processWeeklyCloseout } from "../../orchestration/closeout";
import { assertSimulationInvariants } from "../assertions/invariants";
import { detectSimulationWarnings } from "../assertions/warnings";
import { createSeededPrng, deterministicJitter } from "../generators/prng";
import {
  addDays,
  durationToDays,
  isMonthCloseout,
  isScheduled,
  isWeekCloseout,
  periodKey,
} from "../generators/timeline";
import { createSimulationPolicySet, resolveSimulationPolicyVersion } from "../policy-registry";
import type {
  AuditMetrics,
  CommitmentHistoryEntry,
  LevelHistoryEntry,
  SimulatedCommitment,
  SimulationOptions,
  SimulationPolicySet,
  SimulationResult,
  SimulationScenario,
  XpHistoryEntry,
} from "../types";
import type {
  ActivityDevelopmentState,
  ActivityExecutionEvidence,
  AchievementAward,
  BehaviorEvent,
  BossHistoryRecord,
  CommitmentCapacityState,
  CoreWeaknessSignal,
  EarnedTitleRecord,
  HighestLevelRecord,
  JourneyProgressionEvent,
  LevelCandidateState,
  LevelRiskState,
  MonthlyDevelopmentSnapshot,
  MonthlyEvaluationRecord,
  RatingHistoryEntry,
  RecommendationHistoryRecord,
  RestraintContract,
  TargetAdaptationState,
  TargetProgressionRecommendation,
  WeeklyDevelopmentSnapshot,
  XpTransaction,
  ProgressionRatingBreakdown,
  BossContract,
  TitleEligibilityResult,
} from "../../types";

const startDate = "2026-01-04T09:00:00.000Z";

export function runSimulationScenario(
  scenario: SimulationScenario,
  options: SimulationOptions = {},
): SimulationResult {
  const startedAt = Date.now();
  const duration = options.duration ?? scenario.defaultDuration;
  const durationDays = durationToDays(duration);
  const seed = options.seed ?? scenario.seed;
  const prng = createSeededPrng(seed);
  const policyVersion = resolveSimulationPolicyVersion(options.policyVersion);
  const simulationPolicies = createSimulationPolicySet(options.policyOverrides);
  const evidence: ActivityExecutionEvidence[] = [];
  const behaviorEvents: BehaviorEvent[] = [];
  const sourceEvidenceSnapshot: ActivityExecutionEvidence[] = [];
  const commitmentHistory: CommitmentHistoryEntry[] = [];
  const levelHistory: LevelHistoryEntry[] = [];
  const xpHistory: XpHistoryEntry[] = [];
  const progressionRatingHistory: RatingHistoryEntry[] = [];
  const ratingBreakdownHistory: ProgressionRatingBreakdown[] = [];
  const capacityHistory: CommitmentCapacityState[] = [];
  const capabilityHistory: ActivityDevelopmentState[] = [];
  const targetHistory: TargetProgressionRecommendation[] = [];
  const adaptationHistory: TargetAdaptationState[] = [];
  const bossHistory: BossHistoryRecord[] = [];
  const recommendationHistory: RecommendationHistoryRecord[] = [];
  const weeklySnapshots: WeeklyDevelopmentSnapshot[] = [];
  const monthlySnapshots: MonthlyDevelopmentSnapshot[] = [];
  const monthlyEvaluationHistory: MonthlyEvaluationRecord[] = [];
  let achievements: AchievementAward[] = [];
  let titles: EarnedTitleRecord[] = [];
  let journeyEvents: JourneyProgressionEvent[] = [];
  let xpLedger: XpTransaction[] = [];
  let currentLevel = scenario.initialLevel;
  let highestLevel: HighestLevelRecord = {
    level: scenario.initialHighestLevel ?? scenario.initialLevel,
    firstReachedAt: startDate,
    lastReachedAt: startDate,
    establishmentStrength: scenario.initialHighestLevel && scenario.initialHighestLevel > scenario.initialLevel ? 0.72 : 0.25,
    durationMaintainedPeriods: scenario.initialHighestLevel && scenario.initialHighestLevel > scenario.initialLevel ? 8 : 1,
    supportingEvidenceSummary: ["Simulation initial state."],
  };
  let candidate: LevelCandidateState | undefined;
  let risk: LevelRiskState | undefined;
  let capacity = initialCommitmentCapacityState(scenario.commitments.length);
  let targetValues = Object.fromEntries(
    scenario.commitments.map((commitment) => [commitment.activityId, commitment.targetValue]),
  );
  let targetAdaptations: TargetAdaptationState[] = [];
  let finalActivityStates: ActivityDevelopmentState[] = [];
  let finalCoreWeaknesses: CoreWeaknessSignal[] = [];
  let finalFriction = deriveBehavioralFriction({ signals: [], restraintEvaluations: [] });
  let finalDebt = deriveBehavioralDebt({ friction: finalFriction, restraintEvaluations: [] });

  for (let day = 0; day < durationDays; day += 1) {
    const date = addDays(startDate, day);
    addBehaviorEvents({ scenario, day, date, behaviorEvents });

    for (const commitment of scenario.commitments) {
      if (!isScheduled(commitment.schedule, date)) {
        continue;
      }

      const generated = createEvidence({ scenario, commitment, day, date, prng, targetValue: targetValues[commitment.activityId] ?? commitment.targetValue });
      evidence.push(generated);
      sourceEvidenceSnapshot.push(structuredClone(generated));
      commitmentHistory.push({
        day,
        date,
        activityId: commitment.activityId,
        targetValue: generated.targetValue ?? commitment.targetValue,
        actualValue: generated.actualValue ?? null,
        executionState: generated.executionState,
        requirementState: generated.requirementState,
        exclusionState: generated.exclusionState,
      });
      xpLedger = appendXpTransactions(xpLedger, [
        createExecutionXpTransaction({
          evidence: generated,
          commitmentTier: commitment.tier.toLowerCase() as "core" | "priority" | "flexible",
        }),
      ]);
    }

    const nextDate = day + 1 < durationDays ? addDays(startDate, day + 1) : null;
    const monthCloseout = isMonthCloseout(date, nextDate);
    const checkpoint = isWeekCloseout(date) || monthCloseout;

    if (!checkpoint) {
      continue;
    }

    const currentMonthlyEvaluation = monthCloseout ? createMonthlyEvaluation(evidence, date) : null;
    const closeoutState = deriveState({
      scenario,
      evidence,
      behaviorEvents,
      targetValues,
      currentLevel,
      highestLevel,
      candidate,
      risk,
      progressionRatingHistory,
      capacity,
      bossHistory,
      recommendationHistory,
      targetAdaptations,
      monthlyEvaluations: currentMonthlyEvaluation
        ? [...monthlyEvaluationHistory, currentMonthlyEvaluation]
        : monthlyEvaluationHistory,
      levelMonthlyEvaluations: currentMonthlyEvaluation ? [currentMonthlyEvaluation] : [],
      simulationPolicies,
      date,
    });

    currentLevel = closeoutState.levelState.currentLevel;
    highestLevel = closeoutState.levelState.highestLevel;
    candidate = closeoutState.levelState.candidate;
    risk = closeoutState.levelState.risk;
    capacity = closeoutState.capacity;
    finalActivityStates = closeoutState.activityStates;
    finalCoreWeaknesses = closeoutState.coreWeaknesses;
    finalFriction = closeoutState.behavioralFriction;
    finalDebt = closeoutState.behavioralDebt;
    ratingBreakdownHistory.push(closeoutState.rating);
    progressionRatingHistory.push(closeoutState.levelState.historyEntry);
    capacityHistory.push(capacity);
    capabilityHistory.push(...closeoutState.activityStates);
    targetHistory.push(...closeoutState.targetRecommendations);
    targetAdaptations = closeoutState.targetAdaptations;
    adaptationHistory.push(...targetAdaptations);

    const progressionXp = createProgressionXpTransaction({
      sourceId: `progression:${scenario.id}:${date}`,
      amount: Math.max(0, currentLevel - (levelHistory.at(-1)?.currentLevel ?? scenario.initialLevel)) * 150,
      reason: "Level progression checkpoint.",
      occurredAt: date,
      evidenceRefs: closeoutState.levelState.events.map((event) => event.id),
    });
    xpLedger = appendXpTransactions(xpLedger, [progressionXp]);

    const bossRecord = maybeResolveBoss({
      scenario,
      day,
      date,
      eligibility: closeoutState.bossEligibility,
      bossHistory,
    });
    if (bossRecord) {
      bossHistory.push(bossRecord);
      xpLedger = appendXpTransactions(xpLedger, [
        createBossXpTransaction({ boss: bossRecordToContractLike(bossRecord), occurredAt: date }),
      ]);
    }

    recommendationHistory.push(
      ...[closeoutState.recommendations.primary, ...closeoutState.recommendations.secondary]
        .filter((item) => item !== null)
        .map((item) => ({
          id: item.id,
          category: item.category,
          status: scenario.kind === "boss_rejection" ? "REJECTED" : "PENDING",
          createdAt: item.createdAt,
          resolvedAt: scenario.kind === "boss_rejection" ? date : undefined,
          evidenceSignature: item.evidenceSignature,
        }) satisfies RecommendationHistoryRecord),
    );

    for (const recommendation of closeoutState.targetRecommendations) {
      if (shouldAcceptTargetRecommendation(scenario.kind, recommendation, targetAdaptations)) {
        targetValues = {
          ...targetValues,
          [String(recommendation.activityId)]: recommendation.proposedTargetValue ?? recommendation.currentTargetValue,
        };
        targetAdaptations.push(
          startTargetAdaptation({
            id: `adapt:${recommendation.id}`,
            activityId: String(recommendation.activityId),
            previousTargetValue: recommendation.currentTargetValue,
            newTargetValue: recommendation.proposedTargetValue ?? recommendation.currentTargetValue,
            unit: recommendation.unit,
            startedAt: date,
            recommendationRef: recommendation.id,
          }),
        );
      }
    }

    const achievementResult = evaluateAchievements({
      existingAwards: achievements,
      activityStates: closeoutState.activityStates,
      monthlyEvaluations: closeoutState.monthlyEvaluations,
      bossHistory,
      levelState: closeoutState.levelState,
      now: date,
    });
    achievements = [...achievements, ...achievementResult.awards];
    xpLedger = appendXpTransactions(xpLedger, achievementResult.xpTransactions);
    titles = activeTitles(evaluateTitleEligibility({
      titles,
      achievements,
      activityStates: closeoutState.activityStates,
      levelState: closeoutState.levelState,
    }));
    journeyEvents = createJourneyEvents({
      achievements,
      bossHistory,
      levelState: closeoutState.levelState,
      capacity,
      existingEvents: journeyEvents,
      now: date,
      policyVersion,
    });

    if (isWeekCloseout(date)) {
      const weeklyCloseout = processWeeklyCloseout({
        evidence,
        anchorDate: date,
        currentLevel,
        highestLevel,
        candidate,
        risk,
        ratingHistory: progressionRatingHistory,
        monthlyEvaluations: closeoutState.monthlyEvaluations,
        existingXpLedger: xpLedger,
        previousCapacity: capacity,
        activeCommitmentCount: scenario.commitments.length,
        coreWeaknesses: closeoutState.coreWeaknesses,
        behavioralFriction: closeoutState.behavioralFriction,
        bossHistory,
        targetValues,
      });
      if (weeklyCloseout.weeklySnapshot) {
        weeklySnapshots.push(weeklyCloseout.weeklySnapshot);
      }
      xpLedger = appendXpTransactions(xpLedger, weeklyCloseout.xpTransactions);
    }

    if (monthCloseout) {
      monthlyEvaluationHistory.splice(
        0,
        monthlyEvaluationHistory.length,
        ...closeoutState.monthlyEvaluations,
      );
      const monthlyCloseout = processMonthlyCloseout({
        evidence,
        anchorDate: date,
        currentLevel,
        highestLevel,
        candidate,
        risk,
        ratingHistory: progressionRatingHistory,
        monthlyEvaluations: closeoutState.monthlyEvaluations,
        existingXpLedger: xpLedger,
        existingAchievements: achievements,
        existingJourneyEvents: journeyEvents,
        previousCapacity: capacity,
        activeCommitmentCount: scenario.commitments.length,
        coreWeaknesses: closeoutState.coreWeaknesses,
        behavioralFriction: closeoutState.behavioralFriction,
        bossHistory,
        targetValues,
      });
      if (monthlyCloseout.monthlySnapshot) {
        monthlySnapshots.push(monthlyCloseout.monthlySnapshot);
      }
      xpLedger = appendXpTransactions(xpLedger, monthlyCloseout.xpTransactions);
    }

    const xpSummary = summarizeLifetimeXp(xpLedger, date);
    levelHistory.push({
      day,
      date,
      currentLevel,
      highestLevel: highestLevel.level,
      supportedLevel: closeoutState.levelState.supportedLevel,
      candidate,
      risk,
      recoveryState: closeoutState.levelState.recovery.recoveryState,
    });
    xpHistory.push({
      day,
      date,
      lifetimeXp: xpSummary.totalLifetimeXp,
      transactions: xpLedger.length,
    });
  }

  const finalXp = summarizeLifetimeXp(xpLedger, addDays(startDate, durationDays));
  const resultWithoutAudits: Omit<SimulationResult, "warnings" | "invariantViolations"> = {
    scenarioId: scenario.id,
    policyVersion,
    duration,
    durationDays,
    seed,
    finalState: {
      currentLevel,
      highestLevel,
      lifetimeXp: finalXp.totalLifetimeXp,
      capacity,
      candidate,
      risk,
      achievements,
      titles,
      activityStates: finalActivityStates,
      coreWeaknesses: finalCoreWeaknesses,
      behavioralFriction: finalFriction,
      behavioralDebt: finalDebt,
      targetAdaptations,
    },
    levelHistory,
    progressionRatingHistory: ratingBreakdownHistory,
    xpHistory,
    commitmentHistory,
    capacityHistory,
    capabilityHistory,
    behaviorHistory: behaviorEvents,
    bossHistory,
    recommendationHistory,
    targetHistory,
    adaptationHistory,
    achievementHistory: achievements,
    xpLedger,
    weeklySnapshots,
    monthlySnapshots,
    auditMetrics: createAuditMetrics({
      durationDays,
      runtimeMs: Date.now() - startedAt,
      evidence,
      behaviorEvents,
      levelHistory,
      xpLedger,
      initialLevel: scenario.initialLevel,
      finalLevel: currentLevel,
      finalHighestLevel: highestLevel.level,
      finalXp: finalXp.totalLifetimeXp,
      capacityHistory,
      bossHistory,
      targetHistory,
      adaptationHistory,
    }),
    sourceEvidence: evidence,
    sourceEvidenceSnapshot,
  };
  const result = {
    ...resultWithoutAudits,
    warnings: [],
    invariantViolations: [],
  } satisfies SimulationResult;

  return {
    ...result,
    invariantViolations: assertSimulationInvariants(result),
    warnings: detectSimulationWarnings(result),
  };
}

function deriveState({
  scenario,
  evidence,
  behaviorEvents,
  targetValues,
  currentLevel,
  highestLevel,
  candidate,
  risk,
  progressionRatingHistory,
  capacity,
  bossHistory,
  recommendationHistory,
  targetAdaptations,
  monthlyEvaluations,
  levelMonthlyEvaluations,
  simulationPolicies,
  date,
}: {
  scenario: SimulationScenario;
  evidence: readonly ActivityExecutionEvidence[];
  behaviorEvents: readonly BehaviorEvent[];
  targetValues: Record<string, number>;
  currentLevel: number;
  highestLevel: HighestLevelRecord;
  candidate?: LevelCandidateState;
  risk?: LevelRiskState;
  progressionRatingHistory: readonly RatingHistoryEntry[];
  capacity: CommitmentCapacityState;
  bossHistory: readonly BossHistoryRecord[];
  recommendationHistory: readonly RecommendationHistoryRecord[];
  targetAdaptations: readonly TargetAdaptationState[];
  monthlyEvaluations: readonly MonthlyEvaluationRecord[];
  levelMonthlyEvaluations: readonly MonthlyEvaluationRecord[];
  simulationPolicies: SimulationPolicySet;
  date: string;
}) {
  const activityStates = scenario.commitments.map((commitment) =>
    buildActivityDevelopmentState(evidence, {
      activityId: commitment.activityId,
      anchorDate: date,
      currentTargetValue: targetValues[commitment.activityId] ?? commitment.targetValue,
    }),
  );
  const coreWeaknesses = detectCoreWeaknesses({
    activityStates,
    commitments: scenario.commitments.map((commitment) => ({
      commitmentId: commitment.id,
      activityId: commitment.activityId,
      pillar: commitment.pillar,
      tier: commitment.tier,
    })),
  });
  const restraintEvaluations = createRestraintEvaluations({ scenario, behaviorEvents, date });
  const interferenceSignals = createInterferenceSignals({ scenario, behaviorEvents, evidence, activityStates });
  const behavioralFriction = deriveBehavioralFriction({
    signals: interferenceSignals,
    restraintEvaluations,
  });
  const behavioralDebt = deriveBehavioralDebt({
    friction: behavioralFriction,
    restraintEvaluations,
  });
  const pillarStates = buildPillarStates(activityStates);
  const developmentPressure = deriveDevelopmentPressure({
    coreWeaknesses,
    interferenceSignals,
  });
  const rating = calculateProgressionRating(
    {
      activityStates,
      pillarStates,
      coreWeaknesses,
      behavioralFriction,
      behavioralDebt,
      developmentPressure,
      monthlyEvaluations,
    },
    simulationPolicies.progressionRating,
  );
  const levelState = evaluateLevelProgression({
    currentLevel,
    highestLevel,
    rating,
    now: date,
    candidate,
    risk,
    ratingHistory: progressionRatingHistory,
    monthlyEvaluations: levelMonthlyEvaluations,
    thresholdPolicy: simulationPolicies.levelThresholds,
    ratingPolicy: simulationPolicies.progressionRating,
  });
  const nextCapacity = evaluateCommitmentCapacity({
    previous: capacity,
    activityStates,
    monthlyEvaluations: levelMonthlyEvaluations,
    coreWeaknesses,
    behavioralFriction,
    levelState,
    activeCommitmentCount: scenario.commitments.length,
    policy: simulationPolicies.commitmentCapacity,
  });
  const targetRecommendations = activityStates.map((state) => {
    const activityId = String(state.activityId);
    return evaluateTargetProgression({
      activityState: state,
      currentTargetValue: targetValues[activityId] ?? 1,
      unit: scenario.commitments.find((commitment) => commitment.activityId === activityId)?.unit,
      commitmentId: scenario.commitments.find((commitment) => commitment.activityId === activityId)?.id,
      competingCoreWeaknesses: coreWeaknesses,
      now: date,
      policy: simulationPolicies.targetProgression,
    });
  });
  const evaluatedAdaptations = targetAdaptations.map((adaptation) => {
    const activityState = activityStates.find((state) => state.activityId === adaptation.activityId);
    return activityState
      ? evaluateTargetAdaptation({
          adaptation,
          activityState,
          userRejectedRecalibration: scenario.kind === "adaptation_abuse" || scenario.kind === "failed_adaptation",
          policy: simulationPolicies.targetProgression,
        })
      : adaptation;
  });
  const bossEligibility = evaluateBossEligibility({
    activityStates,
    targetRecommendations,
    coreWeaknesses,
    developmentPressure,
    behavioralFriction,
    levelState,
    bossHistory,
    now: date,
    policy: simulationPolicies.bossEligibility,
  });
  const recommendations = generateRecommendations({
    activityStates,
    targetRecommendations,
    coreWeaknesses,
    behavioralFriction,
    developmentPressure,
    bossEligibility,
    levelState,
    commitmentCapacity: nextCapacity,
    recommendationHistory,
    now: date,
    policy: simulationPolicies.recommendation,
  });

  return {
    activityStates,
    coreWeaknesses,
    restraintEvaluations,
    interferenceSignals,
    behavioralFriction,
    behavioralDebt,
    pillarStates,
    developmentPressure,
    monthlyEvaluations,
    rating,
    levelState,
    capacity: nextCapacity,
    targetRecommendations,
    targetAdaptations: evaluatedAdaptations,
    bossEligibility,
    recommendations,
  };
}

function createEvidence({
  scenario,
  commitment,
  day,
  date,
  prng,
  targetValue,
}: {
  scenario: SimulationScenario;
  commitment: SimulatedCommitment;
  day: number;
  date: string;
  prng: ReturnType<typeof createSeededPrng>;
  targetValue: number;
}) {
  const excluded = exclusionFor(scenario, commitment, day);
  if (excluded) {
    return classifyExecution({
      id: `${scenario.id}:${commitment.activityId}:${day}`,
      activityId: commitment.activityId,
      commitmentId: commitment.id,
      scheduledFor: date,
      requirementState: "EXCLUDED",
      exclusionState: excluded,
      deadlineState: "NO_DEADLINE",
      targetValue,
      unit: commitment.unit,
      createdAt: date,
      evidenceQuality: "STANDARD",
    });
  }

  const actualValue = actualForScenario({ scenario, commitment, day, prng, targetValue });
  const missed = actualValue === null;
  return classifyExecution({
    id: `${scenario.id}:${commitment.activityId}:${day}`,
    activityId: commitment.activityId,
    commitmentId: commitment.id,
    scheduledFor: date,
    occurredAt: missed ? undefined : date,
    targetValue,
    actualValue: missed ? undefined : actualValue,
    requirementState: missed ? "MISSED" : "REQUIRED",
    exclusionState: "NONE",
    deadlineState: "ON_TIME",
    source: "SYSTEM_DERIVED",
    evidenceQuality: "STANDARD",
    unit: commitment.unit,
    createdAt: date,
  });
}

function actualForScenario({
  scenario,
  commitment,
  day,
  prng,
  targetValue,
}: {
  scenario: SimulationScenario;
  commitment: SimulatedCommitment;
  day: number;
  prng: ReturnType<typeof createSeededPrng>;
  targetValue: number;
}) {
  const activity = commitment.activityId;
  const jitter = deterministicJitter(prng, 0.035);

  if (scenario.kind === "capability_low_discipline") {
    return day % 2 === 1 ? null : targetValue * (activity === "running" ? 1.7 : 1.32) * jitter;
  }
  if (scenario.kind === "attendance_capability_gap") {
    return targetValue * prng.range(0.58, 0.78);
  }
  if (scenario.kind === "mixed_failure") {
    return day % 3 === 0 ? null : targetValue * prng.range(0.45, 0.82);
  }
  if (scenario.kind === "core_collapse") {
    return activity === "learning" ? targetValue * prng.range(0.35, 0.5) : targetValue * prng.range(0.93, 1.12);
  }
  if (scenario.kind === "extreme_farmer") {
    return activity === "running" ? targetValue * prng.range(3.75, 6.25) : day % 5 === 0 ? null : targetValue * prng.range(0.62, 0.9);
  }
  if (scenario.kind === "minimum_threshold") {
    return targetValue * prng.range(0.66, 0.72);
  }
  if (scenario.kind === "heroic_catchup") {
    return day % 10 < 4 ? null : day % 10 === 4 ? targetValue * 5.5 : targetValue * prng.range(0.82, 1.02);
  }
  if (scenario.kind === "successful_adaptation") {
    return day < 45 ? targetValue * prng.range(1.12, 1.28) : targetValue * prng.range(day < 75 ? 0.82 : 0.96, 1.12);
  }
  if (scenario.kind === "failed_adaptation" || scenario.kind === "adaptation_abuse") {
    return day < 70 ? targetValue * prng.range(1.14, 1.28) : targetValue * prng.range(0.55, 0.78);
  }
  if (scenario.kind === "lifestyle_interference" && day % 7 >= 5) {
    return targetValue * prng.range(0.4, 0.78);
  }
  if (scenario.kind === "high_level_collapse") {
    return day < 90 ? targetValue * prng.range(1.02, 1.22) : day % 3 === 0 ? null : targetValue * prng.range(0.35, 0.74);
  }
  if (scenario.kind === "earned_comeback") {
    if (day < 120) return day % 3 === 0 ? null : targetValue * prng.range(0.35, 0.72);
    return targetValue * prng.range(1.02, 1.24);
  }
  if (scenario.kind === "weak_high_level") {
    return day < 35 ? targetValue * prng.range(1.35, 1.65) : day % 3 === 0 ? null : targetValue * prng.range(0.42, 0.8);
  }
  if (scenario.kind === "collapse_recovery_cycle") {
    const phase = Math.floor(day / 90) % 2;
    return phase === 0 ? targetValue * prng.range(1.0, 1.2) : day % 3 === 0 ? null : targetValue * prng.range(0.45, 0.82);
  }
  if (scenario.kind === "long_stagnation" || scenario.kind === "static_standard") {
    return targetValue * prng.range(0.98, 1.03);
  }
  if (scenario.kind === "long_mastery" || scenario.kind === "high_level_climb") {
    return targetValue * (1 + Math.min(day / 900, 0.42)) * jitter;
  }
  if (scenario.kind === "boundary") {
    return targetValue * (day % 2 === 0 ? 0.79 : 0.83) * jitter;
  }

  return day % 17 === 0 ? targetValue * prng.range(0.68, 0.88) : targetValue * prng.range(0.92, 1.16);
}

function exclusionFor(
  scenario: SimulationScenario,
  commitment: SimulatedCommitment,
  day: number,
): ActivityExecutionEvidence["exclusionState"] | null {
  if (scenario.kind === "inactive" && commitment.activityId === "learning" && day >= 20 && day <= 33) {
    return "INACTIVE";
  }
  if (scenario.kind === "reading_recovery" && commitment.activityId === "reading" && day >= 28 && day <= 34) {
    return "READING_RECOVERY";
  }
  return null;
}

function addBehaviorEvents({
  scenario,
  day,
  date,
  behaviorEvents,
}: {
  scenario: SimulationScenario;
  day: number;
  date: string;
  behaviorEvents: BehaviorEvent[];
}) {
  const socialScenario =
    scenario.kind === "healthy_social" ||
    scenario.kind === "restraint_maintained" ||
    scenario.kind === "restraint_violations";
  if (socialScenario && day % 5 === 0) {
    behaviorEvents.push(behaviorEvent(scenario.id, "social", "LIFESTYLE", day, date));
  }
  if (scenario.kind === "lifestyle_interference" && day % 7 === 4) {
    behaviorEvents.push(behaviorEvent(scenario.id, "late_night", "LIFESTYLE", day, date));
  }
  if (scenario.kind === "restraint_maintained" && day % 8 === 0) {
    behaviorEvents.push(behaviorEvent(scenario.id, "alcohol", "RESTRICTED", day, date));
  }
  if (scenario.kind === "restraint_violations" && day % 3 === 0) {
    behaviorEvents.push(behaviorEvent(scenario.id, "alcohol", "RESTRICTED", day, date));
  }
}

function behaviorEvent(
  scenarioId: string,
  behaviorId: string,
  category: BehaviorEvent["category"],
  day: number,
  date: string,
): BehaviorEvent {
  return {
    id: `${scenarioId}:behavior:${behaviorId}:${day}`,
    behaviorId,
    behaviorType: behaviorId,
    category,
    occurredAt: date,
    source: "SYSTEM_DERIVED",
    createdAt: date,
  };
}

function createRestraintEvaluations({
  scenario,
  behaviorEvents,
  date,
}: {
  scenario: SimulationScenario;
  behaviorEvents: readonly BehaviorEvent[];
  date: string;
}) {
  if (scenario.kind !== "restraint_maintained" && scenario.kind !== "restraint_violations") {
    return [];
  }
  const contract: RestraintContract = {
    id: `${scenario.id}:alcohol-cap`,
    behaviorId: "alcohol",
    mode: "FREQUENCY_CAP",
    period: "WEEK",
    allowedOccurrences: 1,
    active: true,
    startedAt: startDate,
  };
  const end = new Date(date);
  const start = new Date(end.getTime() - 7 * 86_400_000);
  return [
    evaluateRestraintContract({
      contract,
      events: behaviorEvents,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    }),
  ];
}

function createInterferenceSignals({
  scenario,
  behaviorEvents,
  evidence,
  activityStates,
}: {
  scenario: SimulationScenario;
  behaviorEvents: readonly BehaviorEvent[];
  evidence: readonly ActivityExecutionEvidence[];
  activityStates: readonly ActivityDevelopmentState[];
}) {
  if (scenario.kind === "lifestyle_interference") {
    return [
      detectBehaviorInterference({
        behaviorId: "late_night",
        events: behaviorEvents,
        evidence,
        activityStates,
        policy: { lookaheadDays: 2, affectedPillar: "HEALTH" },
      }),
    ];
  }
  if (scenario.kind === "healthy_social") {
    return [
      detectBehaviorInterference({
        behaviorId: "social",
        events: behaviorEvents,
        evidence,
        activityStates,
        policy: { lookaheadDays: 1, affectedPillar: "BALANCE" },
      }),
    ];
  }
  return [];
}

function createMonthlyEvaluation(
  evidence: readonly ActivityExecutionEvidence[],
  date: string,
): MonthlyEvaluationRecord {
  const currentPeriod = periodKey(date);
  const periodEvidence = evidence.filter((item) => periodKey(item.scheduledFor ?? item.createdAt) === currentPeriod);
  const eligible = periodEvidence.filter((item) => item.requirementState !== "EXCLUDED");
  const credit = eligible.reduce((total, item) => total + (item.commitmentFulfillment ?? 0), 0);
  const ratio = eligible.length === 0 ? null : credit / eligible.length;
  const outcome =
    ratio === null
      ? "PASS"
      : ratio >= 0.97
        ? "FULL_COMPLETION"
        : ratio >= 0.86
          ? "STRONG_PASS"
          : ratio >= 0.68
            ? "PASS"
            : "FAIL";

  return {
    id: `month:${currentPeriod}`,
    period: currentPeriod,
    outcome,
    confidence: eligible.length === 0 ? 0.45 : Math.min(0.95, eligible.length / 20),
    evidenceRefs: periodEvidence.map((item) => item.id),
  };
}

function maybeResolveBoss({
  scenario,
  day,
  date,
  eligibility,
  bossHistory,
}: {
  scenario: SimulationScenario;
  day: number;
  date: string;
  eligibility: ReturnType<typeof evaluateBossEligibility>;
  bossHistory: readonly BossHistoryRecord[];
}) {
  if (!eligibility.selectedBoss || day % 45 !== 0) {
    return null;
  }
  const offered = offerBoss(eligibility.selectedBoss, date);
  const existing = bossHistory.some((boss) => boss.bossId === offered.id);
  if (existing) {
    return null;
  }
  if (scenario.kind === "boss_rejection") {
    return rejectBoss(offered, date).history;
  }
  if (scenario.kind === "boss_completion" || scenario.kind === "ideal_beginner" || scenario.kind === "long_mastery") {
    return completeBoss(offered, {
      completedAt: date,
      actualResult: offered.requirements[0]?.targetValue ?? 1,
      evidenceRefs: [offered.id],
    }).history;
  }
  if (scenario.kind === "mixed_failure" || scenario.kind === "high_level_collapse") {
    return failBoss(offered, { failedAt: date, meaningfulEffort: true }).history;
  }
  return {
    bossId: offered.id,
    family: offered.family,
    activityId: offered.requirements[0]?.activityId ? String(offered.requirements[0].activityId) : undefined,
    pillar: offered.requirements[0]?.pillar,
    status: offered.status,
    difficulty: offered.difficulty,
    offeredAt: offered.offeredAt,
    resolvedAt: offered.expiresAt,
    evidenceSignature: offered.evidenceSignature,
    outcomeQuality: offered.outcomeQuality,
  };
}

function bossRecordToContractLike(record: BossHistoryRecord): BossContract {
  return {
    id: record.bossId,
    title: `${record.family} simulation Boss`,
    family: record.family,
    status: record.status,
    difficulty: record.difficulty,
    reason: {
      category: "SKILL_EVIDENCE",
      summaryKey: "simulation_boss_outcome",
      supportingEvidence: ["Simulation Boss outcome."],
      confidence: 0.8,
      affectedActivityIds: record.activityId ? [record.activityId] : [],
      affectedPillars: record.pillar ? [record.pillar] : [],
    },
    generatedAt: record.offeredAt,
    offeredAt: record.offeredAt,
    completedAt: record.status === "COMPLETED" ? record.resolvedAt ?? record.offeredAt : undefined,
    requirements: [
      {
        activityId: record.activityId,
        pillar: record.pillar,
        description: "Simulation Boss requirement.",
        evaluationType: "SINGLE_VALUE",
      },
    ],
    confidence: 0.8,
    evidenceSignature: record.evidenceSignature,
    evidenceRefs: [record.evidenceSignature],
    completionEvidenceRefs: record.status === "COMPLETED" ? [record.evidenceSignature] : [],
    outcomeQuality: record.outcomeQuality,
  };
}

function activeTitles(results: readonly TitleEligibilityResult[]) {
  return results
    .filter((result) => result.eligibility === "ELIGIBLE")
    .map((result) => result.title);
}

function shouldAcceptTargetRecommendation(
  kind: SimulationScenario["kind"],
  recommendation: TargetProgressionRecommendation,
  adaptations: readonly TargetAdaptationState[],
) {
  if (recommendation.action !== "INCREASE") {
    return false;
  }
  const acceptsIncrease = ["successful_adaptation", "failed_adaptation", "adaptation_abuse", "long_mastery", "high_level_climb"].includes(kind);
  const alreadyAdapting = adaptations.some(
    (adaptation) =>
      adaptation.activityId === recommendation.activityId &&
      adaptation.status !== "ESTABLISHED" &&
      adaptation.status !== "UNSUSTAINABLE",
  );

  return acceptsIncrease && !alreadyAdapting;
}

function createAuditMetrics({
  durationDays,
  runtimeMs,
  evidence,
  behaviorEvents,
  levelHistory,
  xpLedger,
  initialLevel,
  finalLevel,
  finalHighestLevel,
  finalXp,
  capacityHistory,
  bossHistory,
  targetHistory,
  adaptationHistory,
}: {
  durationDays: number;
  runtimeMs: number;
  evidence: readonly ActivityExecutionEvidence[];
  behaviorEvents: readonly BehaviorEvent[];
  levelHistory: readonly LevelHistoryEntry[];
  xpLedger: readonly XpTransaction[];
  initialLevel: number;
  finalLevel: number;
  finalHighestLevel: number;
  finalXp: number;
  capacityHistory: readonly CommitmentCapacityState[];
  bossHistory: readonly BossHistoryRecord[];
  targetHistory: readonly TargetProgressionRecommendation[];
  adaptationHistory: readonly TargetAdaptationState[];
}): AuditMetrics {
  const levelDeltas = levelHistory.map((entry, index) => {
    const previous = levelHistory[index - 1];
    return previous ? entry.currentLevel - previous.currentLevel : 0;
  });
  const xpFromExecution = xpLedger
    .filter((transaction) => transaction.sourceType === "ACTIVITY_EXECUTION")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const xpFromSurplus = xpLedger
    .filter((transaction) => transaction.sourceType === "ACTIVITY_EXECUTION")
    .reduce((total, transaction) => {
      const source = evidence.find((item) => item.id === transaction.sourceId);
      const ratio = source?.rawCompletionRatio ?? 0;
      const surplusShare = ratio > 1 ? (ratio - 1) / ratio : 0;
      return total + transaction.amount * surplusShare;
    }, 0);
  const capacityUnlockCount = capacityHistory.filter(
    (entry, index) => entry.currentCapacity > (capacityHistory[index - 1]?.currentCapacity ?? entry.currentCapacity),
  ).length;

  return {
    durationDays,
    runtimeMs,
    evidenceCount: evidence.length,
    behaviorEventCount: behaviorEvents.length,
    finalCurrentLevel: finalLevel,
    finalHighestLevel,
    finalLifetimeXp: finalXp,
    levelDelta: finalLevel - initialLevel,
    maxMonthlyLevelJump: Math.max(0, ...levelDeltas),
    xpFromExecution,
    xpFromSurplus,
    surplusXpRatio: xpFromExecution === 0 ? 0 : xpFromSurplus / xpFromExecution,
    currentLevelPlateauMonths: countTrailingPlateauMonths(levelHistory),
    demotionCount: levelHistory.filter((entry) => entry.risk?.status === "DEMOTED").length,
    recoveryCount: levelHistory.filter((entry) => entry.recoveryState === "ACTIVE_RECOVERY").length,
    bossOfferCount: bossHistory.length,
    bossCompletionCount: bossHistory.filter((boss) => boss.status === "COMPLETED").length,
    bossRejectionCount: bossHistory.filter((boss) => boss.status === "REJECTED").length,
    targetIncreaseCount: targetHistory.filter((target) => target.action === "INCREASE").length,
    acceptedTargetChangeCount: new Set(adaptationHistory.map((adaptation) => adaptation.id)).size,
    capacityUnlockCount,
  };
}

function countTrailingPlateauMonths(levelHistory: readonly LevelHistoryEntry[]) {
  const monthLevels = new Map<string, number>();
  for (const entry of levelHistory) {
    monthLevels.set(periodKey(entry.date), entry.currentLevel);
  }
  const monthly = [...monthLevels.values()];
  const last = monthly.at(-1);
  if (last === undefined) {
    return 0;
  }
  let count = 0;
  for (let index = monthly.length - 1; index >= 0; index -= 1) {
    if (monthly[index] !== last) {
      break;
    }
    count += 1;
  }
  return count;
}
