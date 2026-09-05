import { appendXpTransactions } from "../../xp/ledger";
import type { AuditIssue, InvariantCode, SimulationResult } from "../types";

export function assertSimulationInvariants(
  result: SimulationResult,
): AuditIssue<InvariantCode>[] {
  return [
    ...assertLifetimeXpNeverDecreases(result),
    ...assertHighestLevelNeverDecreases(result),
    ...assertRawEvidenceNeverMutated(result),
    ...assertExcludedNeutral(result),
    ...assertMissesPreserved(result),
    ...assertCapabilityNotPeakByDefault(result),
    ...assertOneActivityCompensation(result),
    ...assertLowConfidenceNoAggressiveConsequence(result),
    ...assertNoSinglePeriodLevelShock(result),
    ...assertRecoveryBounded(result),
    ...assertCapacityReductionPreservesCommitments(result),
    ...assertIdempotency(result),
    ...assertRestraintAndSocialFairness(result),
  ];
}

function issue(
  code: InvariantCode,
  message: string,
  checkpoint?: string,
): AuditIssue<InvariantCode> {
  return { code, severity: "failure", message, checkpoint };
}

function assertLifetimeXpNeverDecreases(result: SimulationResult) {
  const failures: AuditIssue<InvariantCode>[] = [];
  for (let index = 1; index < result.xpHistory.length; index += 1) {
    const previous = result.xpHistory[index - 1];
    const current = result.xpHistory[index];
    if (previous && current && current.lifetimeXp < previous.lifetimeXp) {
      failures.push(issue("LIFETIME_XP_NEVER_DECREASES", "Lifetime XP decreased.", current.date));
    }
  }
  return failures;
}

function assertHighestLevelNeverDecreases(result: SimulationResult) {
  const failures: AuditIssue<InvariantCode>[] = [];
  for (let index = 1; index < result.levelHistory.length; index += 1) {
    const previous = result.levelHistory[index - 1];
    const current = result.levelHistory[index];
    if (previous && current && current.highestLevel < previous.highestLevel) {
      failures.push(issue("HIGHEST_LEVEL_NEVER_DECREASES", "Highest Level decreased.", current.date));
    }
  }
  return failures;
}

function assertRawEvidenceNeverMutated(result: SimulationResult) {
  return JSON.stringify(result.sourceEvidence) === JSON.stringify(result.sourceEvidenceSnapshot)
    ? []
    : [issue("RAW_EVIDENCE_NEVER_MUTATED", "Source evidence changed during audit.")];
}

function assertExcludedNeutral(result: SimulationResult) {
  const failures: AuditIssue<InvariantCode>[] = [];
  for (const item of result.commitmentHistory) {
    if (item.exclusionState !== "NONE") {
      if (item.executionState !== "EXCLUDED") {
        failures.push(issue("EXCLUDED_NOT_SUCCESS", "Excluded opportunity was not classified as excluded.", item.date));
      }
      if (item.requirementState === "MISSED") {
        failures.push(issue("EXCLUDED_NOT_FAILURE", "Excluded opportunity was also treated as missed.", item.date));
      }
    }
  }
  return failures;
}

function assertMissesPreserved(result: SimulationResult) {
  const hadMiss = result.commitmentHistory.some((item) => item.executionState === "MISSED");
  const hadSurplus = result.commitmentHistory.some(
    (item) => item.actualValue !== null && item.actualValue > item.targetValue * 1.8,
  );
  const finalMisses = result.sourceEvidence.filter((item) => item.executionState === "MISSED").length;

  return hadMiss && hadSurplus && finalMisses === 0
    ? [issue("MISS_NOT_REPAIRED_BY_SURPLUS", "Surplus output appears to have removed historical misses.")]
    : [];
}

function assertCapabilityNotPeakByDefault(result: SimulationResult) {
  if (result.scenarioId !== "heroic-catch-up-day") {
    return [];
  }

  return result.finalState.activityStates.some((state) => {
    const peak = state.capability.peakCapability.value;
    const sustainable = state.capability.sustainableCapability.value;
    return peak !== null && sustainable !== null && peak > sustainable * 1.25;
  })
    ? []
    : [issue("PEAK_NOT_EQUAL_SUSTAINABLE_BY_DEFAULT", "Peak and sustainable capability collapsed together under surplus evidence.")];
}

function assertOneActivityCompensation(result: SimulationResult) {
  if (result.scenarioId !== "extreme-activity-farmer" && result.scenarioId !== "collapsing-core-commitment") {
    return [];
  }

  const hasCoreWeakness = result.finalState.coreWeaknesses.length > 0;
  const levelGrowth = result.auditMetrics.levelDelta;
  return !hasCoreWeakness && levelGrowth > 10
    ? [issue("ONE_ACTIVITY_CANNOT_UNLIMITEDLY_COMPENSATE", "One activity compensated for broad/core weakness too strongly.")]
    : [];
}

function assertLowConfidenceNoAggressiveConsequence(result: SimulationResult) {
  return result.levelHistory.some(
    (entry) => entry.risk?.status === "DEMOTED" && result.progressionRatingHistory.some((rating) => rating.confidence < 0.45),
  )
    ? [issue("LOW_CONFIDENCE_NO_AGGRESSIVE_CONSEQUENCE", "Low-confidence evidence coincided with aggressive demotion.")]
    : [];
}

function assertNoSinglePeriodLevelShock(result: SimulationResult) {
  const failures: AuditIssue<InvariantCode>[] = [];
  for (let index = 1; index < result.levelHistory.length; index += 1) {
    const previous = result.levelHistory[index - 1];
    const current = result.levelHistory[index];
    if (!previous || !current) continue;
    if (current.currentLevel - previous.currentLevel > 1) {
      failures.push(issue("ONE_GREAT_DAY_NO_IMMEDIATE_MAJOR_LEVEL_UP", "Current Level jumped by more than one checkpoint.", current.date));
    }
    if (previous.currentLevel - current.currentLevel > 4) {
      failures.push(issue("ONE_BAD_WEEK_NO_IMMEDIATE_MAJOR_DEMOTION", "Current Level dropped too sharply in one checkpoint.", current.date));
    }
  }
  return failures;
}

function assertRecoveryBounded(result: SimulationResult) {
  return result.levelHistory.some(
    (entry) =>
      entry.recoveryState === "ACTIVE_RECOVERY" &&
      entry.currentLevel > result.finalState.highestLevel.level,
  )
    ? [issue("RECOVERY_BONUS_NOT_BEYOND_HIGHEST_LEVEL", "Recovery bonus carried beyond Highest Level.")]
    : [];
}

function assertCapacityReductionPreservesCommitments(result: SimulationResult) {
  const reduced = result.capacityHistory.some((capacity) => capacity.status === "REDUCED");
  const activeCount = result.finalState.capacity.activeCommitmentCount;
  return reduced && activeCount < result.finalState.capacity.currentCapacity
    ? [issue("CAPACITY_REDUCTION_DOES_NOT_DELETE_COMMITMENTS", "Capacity reduction appears to delete active commitments.")]
    : [];
}

function assertIdempotency(result: SimulationResult) {
  const failures: AuditIssue<InvariantCode>[] = [];

  const uniqueBosses = new Set(result.bossHistory.map((boss) => `${boss.bossId}:${boss.status}`));
  if (uniqueBosses.size !== result.bossHistory.length) {
    failures.push(issue("BOSS_EVIDENCE_IDEMPOTENT", "Duplicate Boss outcome records detected."));
  }

  const transactionIds = new Set<string>();
  const transactionSources = new Set<string>();
  for (const transaction of result.xpLedger) {
    const sourceKey = `${transaction.sourceType}:${transaction.sourceId}:${transaction.category}:${transaction.policyVersion}`;
    if (transactionIds.has(transaction.id) || transactionSources.has(sourceKey)) {
      failures.push(issue("XP_IDEMPOTENT", "Duplicate XP transaction key or source detected.", transaction.occurredAt));
      break;
    }
    transactionIds.add(transaction.id);
    transactionSources.add(sourceKey);
  }

  const replayedLedger = appendXpTransactions(result.xpLedger, result.xpLedger);
  if (replayedLedger.length !== result.xpLedger.length) {
    failures.push(issue("XP_IDEMPOTENT", "Replaying the XP ledger changed transaction count."));
  }

  for (const snapshot of result.monthlySnapshots) {
    if (snapshot.id.includes("undefined")) {
      failures.push(issue("MONTHLY_CLOSEOUT_IDEMPOTENT", "Monthly closeout idempotency key is unstable.", snapshot.id));
    }
  }
  for (let index = 1; index < result.xpHistory.length; index += 1) {
    const previous = result.xpHistory[index - 1];
    const current = result.xpHistory[index];
    if (previous && current && current.transactions < previous.transactions) {
      failures.push(issue("XP_IDEMPOTENT", "XP transaction count moved backward."));
    }
  }

  return failures;
}

function assertRestraintAndSocialFairness(result: SimulationResult) {
  const failures: AuditIssue<InvariantCode>[] = [];
  if (
    result.scenarioId === "restraint-contract-maintained" &&
    result.finalState.behavioralDebt.state !== "NONE"
  ) {
    failures.push(issue("RESTRAINT_OCCURRENCE_NOT_AUTOMATIC_VIOLATION", "Within-limit restraint events created Behavioral Debt."));
  }
  if (
    result.scenarioId === "strong-social-strong-execution" &&
    result.finalState.behavioralDebt.state !== "NONE"
  ) {
    failures.push(issue("SOCIAL_ACTIVITY_NOT_AUTOMATIC_NEGATIVE", "Healthy social activity created Behavioral Debt."));
  }
  return failures;
}
