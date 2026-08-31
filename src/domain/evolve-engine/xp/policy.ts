import { round } from "../internal/statistics";
import type {
  ActivityExecutionEvidence,
  BossContract,
  ExecutionState,
  MonthlyEvaluationOutcome,
  XpCategory,
  XpSourceType,
  XpTransaction,
} from "../types";

export type XpPolicy = {
  version: string;
  baseExecutionXp: number;
  attemptXp: number;
  weeklyConsistencyBaseXp: number;
  monthlyOutcomeXp: Record<MonthlyEvaluationOutcome, number>;
  bossDifficultyXp: Record<BossContract["difficulty"], number>;
  achievementXp: Record<"NONE" | "SMALL" | "STANDARD", number>;
};

export const defaultXpPolicy = {
  version: "phase-3.6-demo-policy",
  baseExecutionXp: 40,
  attemptXp: 6,
  weeklyConsistencyBaseXp: 70,
  monthlyOutcomeXp: {
    FAIL: 0,
    PASS: 90,
    STRONG_PASS: 140,
    FULL_COMPLETION: 190,
  },
  bossDifficultyXp: {
    STANDARD: 120,
    CHALLENGING: 170,
    EDGE: 230,
    RESTORATIVE: 160,
  },
  achievementXp: {
    NONE: 0,
    SMALL: 25,
    STANDARD: 60,
  },
} satisfies XpPolicy;

export function createExecutionXpTransaction({
  evidence,
  occurredAt,
  commitmentTier = "flexible",
  policy = defaultXpPolicy,
}: {
  evidence: ActivityExecutionEvidence;
  occurredAt?: string;
  commitmentTier?: "core" | "priority" | "flexible";
  policy?: XpPolicy;
}): XpTransaction | null {
  const amount = calculateExecutionXp(evidence, commitmentTier, policy);

  if (amount <= 0) {
    return null;
  }

  return xpTransaction({
    id: `xp-execution-${evidence.id}-${policy.version}`,
    sourceType: "ACTIVITY_EXECUTION",
    sourceId: evidence.id,
    category: "EXECUTION",
    amount,
    occurredAt: occurredAt ?? evidence.occurredAt ?? evidence.scheduledFor ?? evidence.createdAt,
    reason: "Legitimate execution evidence.",
    evidenceRefs: [evidence.id],
    policy,
  });
}

export function calculateExecutionXp(
  evidence: ActivityExecutionEvidence,
  commitmentTier: "core" | "priority" | "flexible" = "flexible",
  policy: XpPolicy = defaultXpPolicy,
) {
  if (evidence.executionState === "MISSED" || evidence.executionState === "EXCLUDED") {
    return 0;
  }

  if (evidence.executionState === "INSUFFICIENT_EFFORT") {
    return 0;
  }

  if (evidence.executionState === "ATTEMPT") {
    return policy.attemptXp;
  }

  const tierAuthority = commitmentTier === "core" ? 1.18 : commitmentTier === "priority" ? 1.08 : 1;
  const quality = evidence.evidenceQuality === "HIGH" ? 1.05 : evidence.evidenceQuality === "LOW" ? 0.85 : 1;
  const fulfillment = evidence.commitmentFulfillment ?? 0;
  const rawRatio = evidence.rawCompletionRatio ?? fulfillment;
  const excess = Math.max(0, rawRatio - 1);
  const excessCredit = excess === 0 ? 0 : 0.35 * (1 - Math.exp(-excess / 0.8));
  const completionQuality: Record<ExecutionState, number> = {
    FULL: 1,
    QUALIFYING_PARTIAL: Math.max(0.2, fulfillment),
    ATTEMPT: 0,
    INSUFFICIENT_EFFORT: 0,
    MISSED: 0,
    EXCLUDED: 0,
  };

  return Math.max(
    0,
    Math.round(policy.baseExecutionXp * (completionQuality[evidence.executionState] + excessCredit) * tierAuthority * quality),
  );
}

export function createWeeklyConsistencyXpTransaction({
  sourceId,
  consistencyRatio,
  reliabilityConfidence,
  distributionStability,
  occurredAt,
  evidenceRefs,
  policy = defaultXpPolicy,
}: {
  sourceId: string;
  consistencyRatio: number | null;
  reliabilityConfidence: number;
  distributionStability?: number | null;
  occurredAt: string;
  evidenceRefs: string[];
  policy?: XpPolicy;
}): XpTransaction | null {
  if (consistencyRatio === null || consistencyRatio <= 0) {
    return null;
  }

  const distribution = distributionStability ?? 0.65;
  const amount = Math.round(
    policy.weeklyConsistencyBaseXp *
      consistencyRatio *
      Math.min(reliabilityConfidence, 1) *
      Math.min(Math.max(distribution, 0.35), 1),
  );

  if (amount <= 0) {
    return null;
  }

  return xpTransaction({
    id: `xp-weekly-${sourceId}-${policy.version}`,
    sourceType: "WEEKLY_CLOSEOUT",
    sourceId,
    category: "CONSISTENCY",
    amount,
    occurredAt,
    reason: "Distributed weekly consistency evidence.",
    evidenceRefs,
    policy,
  });
}

export function createMonthlyCommitmentXpTransaction({
  sourceId,
  outcome,
  confidence,
  occurredAt,
  evidenceRefs,
  policy = defaultXpPolicy,
}: {
  sourceId: string;
  outcome: MonthlyEvaluationOutcome;
  confidence: number;
  occurredAt: string;
  evidenceRefs: string[];
  policy?: XpPolicy;
}): XpTransaction | null {
  const amount = Math.round(policy.monthlyOutcomeXp[outcome] * Math.min(confidence, 1));

  if (amount <= 0) {
    return null;
  }

  return xpTransaction({
    id: `xp-monthly-${sourceId}-${policy.version}`,
    sourceType: "MONTHLY_CLOSEOUT",
    sourceId,
    category: "MONTHLY_COMMITMENT",
    amount,
    occurredAt,
    reason: "Monthly commitment outcome.",
    evidenceRefs,
    policy,
  });
}

export function createBossXpTransaction({
  boss,
  occurredAt,
  policy = defaultXpPolicy,
}: {
  boss: BossContract;
  occurredAt: string;
  policy?: XpPolicy;
}): XpTransaction | null {
  if (boss.status !== "COMPLETED") {
    return null;
  }

  const outcome =
    boss.outcomeQuality === "FRONTIER_EXTENDED"
      ? 1.25
      : boss.outcomeQuality === "STANDARD_RESTORED"
        ? 1.15
        : 1;
  const amount = Math.round(policy.bossDifficultyXp[boss.difficulty] * Math.min(boss.confidence, 1) * outcome);

  return xpTransaction({
    id: `xp-boss-${boss.id}-${policy.version}`,
    sourceType: "BOSS_COMPLETION",
    sourceId: boss.id,
    category: "BOSS",
    amount,
    occurredAt,
    reason: "Boss Challenge completed.",
    evidenceRefs: [...boss.evidenceRefs, ...boss.completionEvidenceRefs],
    policy,
  });
}

export function createProgressionXpTransaction({
  sourceId,
  category = "PROGRESSION",
  amount,
  occurredAt,
  reason,
  evidenceRefs,
  policy = defaultXpPolicy,
}: {
  sourceId: string;
  category?: Extract<XpCategory, "PROGRESSION" | "RECOVERY_MILESTONE" | "ACHIEVEMENT">;
  amount: number;
  occurredAt: string;
  reason: string;
  evidenceRefs: string[];
  policy?: XpPolicy;
}): XpTransaction | null {
  if (amount <= 0) {
    return null;
  }

  return xpTransaction({
    id: `xp-${category.toLowerCase()}-${sourceId}-${policy.version}`,
    sourceType: category === "ACHIEVEMENT" ? "ACHIEVEMENT_AWARD" : "PROGRESSION_EVENT",
    sourceId,
    category,
    amount: Math.round(amount),
    occurredAt,
    reason,
    evidenceRefs,
    policy,
  });
}

function xpTransaction({
  id,
  sourceType,
  sourceId,
  category,
  amount,
  occurredAt,
  reason,
  evidenceRefs,
  policy,
}: {
  id: string;
  sourceType: XpSourceType;
  sourceId: string;
  category: XpCategory;
  amount: number;
  occurredAt: string;
  reason: string;
  evidenceRefs: string[];
  policy: XpPolicy;
}): XpTransaction {
  return {
    id,
    sourceType,
    sourceId,
    category,
    amount: round(Math.max(0, amount), 0),
    occurredAt,
    reason,
    evidenceRefs,
    policyVersion: policy.version,
  };
}
