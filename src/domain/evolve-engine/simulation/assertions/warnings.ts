import type { AuditIssue, SimulationResult, SimulationWarningCode } from "../types";

export function detectSimulationWarnings(
  result: SimulationResult,
): AuditIssue<SimulationWarningCode>[] {
  const warnings: AuditIssue<SimulationWarningCode>[] = [];
  const metrics = result.auditMetrics;

  if (metrics.levelDelta > Math.max(4, Math.ceil(metrics.durationDays / 90) * 3)) {
    warnings.push(warning("LEVEL_GROWTH_TOO_FAST", "Current Level growth may be too fast for the simulated duration."));
  }

  if (
    ["static-easy-standard", "long-term-stagnation"].includes(result.scenarioId) &&
    metrics.levelDelta > 4
  ) {
    warnings.push(warning("LEVEL_GROWTH_WITHOUT_DEVELOPMENT", "Static standards still produced notable Current Level growth."));
  }

  if (metrics.surplusXpRatio > 0.45) {
    warnings.push(warning("XP_DOMINATED_BY_EXCESS_OUTPUT", "Surplus output dominates XP composition."));
  }

  if (
    result.scenarioId === "collapsing-core-commitment" &&
    result.finalState.coreWeaknesses.length === 0
  ) {
    warnings.push(warning("CORE_WEAKNESS_IGNORED", "Collapsing Core commitment did not remain visible."));
  }

  if (metrics.maxMonthlyLevelJump > 1) {
    warnings.push(warning("SINGLE_OUTLIER_CHANGED_BASELINE_TOO_MUCH", "A checkpoint produced a large level jump."));
  }

  if (result.scenarioId === "high-level-collapse" && metrics.demotionCount > 0 && result.durationDays < 60) {
    warnings.push(warning("DEMOTION_TOO_SENSITIVE", "High-level collapse demoted too quickly."));
  }

  if (result.scenarioId === "earned-comeback" && metrics.levelDelta > 16) {
    warnings.push(warning("RECOVERY_TOO_FAST", "Comeback may be restoring too much too quickly."));
  }

  if (result.scenarioId === "earned-comeback" && metrics.recoveryCount === 0) {
    warnings.push(warning("RECOVERY_TOO_SLOW", "Comeback scenario did not activate recovery memory."));
  }

  if (metrics.targetIncreaseCount > Math.ceil(metrics.durationDays / 60)) {
    warnings.push(warning("TARGET_ESCALATION_TOO_AGGRESSIVE", "Target increases are frequent for the duration."));
  }

  if (metrics.capacityUnlockCount > Math.ceil(metrics.durationDays / 180) + 1) {
    warnings.push(warning("CAPACITY_UNLOCK_TOO_EASY", "Capacity unlock cadence may be too permissive."));
  }

  if (
    result.scenarioId === "strong-social-strong-execution" &&
    result.finalState.behavioralFriction.state !== "NONE"
  ) {
    warnings.push(warning("SOCIAL_ACTIVITY_PENALIZED_WITHOUT_EVIDENCE", "Social behavior created friction despite strong execution."));
  }

  if (
    result.scenarioId === "repeated-lifestyle-interference" &&
    result.finalState.behavioralFriction.confidence < 0.35 &&
    result.finalState.behavioralFriction.state !== "NONE"
  ) {
    warnings.push(warning("BEHAVIOR_INTERFERENCE_FALSE_POSITIVE", "Behavior friction appeared with weak confidence."));
  }

  if (hasRepeatedBossFamily(result)) {
    warnings.push(warning("BOSS_REPETITION", "Similar Boss outcomes appear repeatedly."));
  }

  if (
    result.scenarioId === "adaptation-protection-abuse" &&
    result.finalState.targetAdaptations.some((adaptation) => adaptation.protectionActive)
  ) {
    warnings.push(warning("ADAPTATION_PROTECTION_NOT_ENDING", "Adaptation protection remained active after abuse pattern."));
  }

  return warnings;
}

function warning(
  code: SimulationWarningCode,
  message: string,
): AuditIssue<SimulationWarningCode> {
  return { code, severity: "warning", message };
}

function hasRepeatedBossFamily(result: SimulationResult) {
  const seen = new Set<string>();
  for (const boss of result.bossHistory) {
    const key = `${boss.family}:${boss.activityId ?? "none"}:${boss.status}`;
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
  }
  return false;
}
