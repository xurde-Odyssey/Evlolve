import type { SimulationResult } from "../types";

export function createSimulationAuditReport(results: readonly SimulationResult[]) {
  const lines = [
    "# Evolve Phase 3.7 Simulation Audit",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `Scenarios: ${results.length}`,
    `Hard invariant failures: ${results.reduce((total, result) => total + result.invariantViolations.length, 0)}`,
    `Tuning warnings: ${results.reduce((total, result) => total + result.warnings.length, 0)}`,
    "",
    "## Scenario Results",
    "",
  ];

  for (const result of results) {
    lines.push(
      `### ${result.scenarioId}`,
      "",
      `- Duration: ${result.duration} (${result.durationDays} days)`,
      `- Seed: ${result.seed}`,
      `- Final Current Level: ${result.auditMetrics.finalCurrentLevel}`,
      `- Highest Level: ${result.auditMetrics.finalHighestLevel}`,
      `- Lifetime XP: ${result.auditMetrics.finalLifetimeXp}`,
      `- Final capacity: ${result.finalState.capacity.currentCapacity} (${result.finalState.capacity.status})`,
      `- Progression Rating direction: ${ratingDirection(result)}`,
      `- Target increase recommendations: ${result.auditMetrics.targetIncreaseCount}`,
      `- Accepted target changes: ${result.auditMetrics.acceptedTargetChangeCount}`,
      `- Boss outcomes: ${result.auditMetrics.bossCompletionCount} completed, ${result.auditMetrics.bossRejectionCount} rejected, ${result.auditMetrics.bossOfferCount} total`,
      `- Achievements: ${result.achievementHistory.map((achievement) => achievement.definitionId).join(", ") || "none"}`,
      `- Core Weaknesses: ${result.finalState.coreWeaknesses.map((weakness) => `${weakness.activityId}:${weakness.severity}`).join(", ") || "none"}`,
      `- Behavior/Friction: ${result.finalState.behavioralFriction.state} / ${result.finalState.behavioralDebt.state}`,
      `- Runtime: ${result.auditMetrics.runtimeMs}ms for ${result.auditMetrics.evidenceCount} evidence records`,
      "",
      "Timeline checkpoints:",
      ...checkpointLines(result),
      "",
      "Invariant failures:",
      ...(result.invariantViolations.length > 0
        ? result.invariantViolations.map((issue) => `- ${issue.code}: ${issue.message}`)
        : ["- none"]),
      "",
      "Warnings:",
      ...(result.warnings.length > 0
        ? result.warnings.map((issue) => `- ${issue.code}: ${issue.message}`)
        : ["- none"]),
      "",
    );
  }

  lines.push(
    "## Performance Notes",
    "",
    ...performanceLines(results),
    "",
  );

  return `${lines.join("\n")}\n`;
}

function ratingDirection(result: SimulationResult) {
  const first = result.progressionRatingHistory[0]?.finalRating ?? 0;
  const last = result.progressionRatingHistory.at(-1)?.finalRating ?? first;
  if (last > first + 4) return "improving";
  if (last < first - 4) return "declining";
  return "stable";
}

function checkpointLines(result: SimulationResult) {
  const checkpoints = result.levelHistory.filter((_, index) => index % Math.max(1, Math.floor(result.levelHistory.length / 4)) === 0);
  return checkpoints.map((entry) => `- ${entry.date.slice(0, 10)}: L${entry.currentLevel}, supported L${entry.supportedLevel}, recovery ${entry.recoveryState}`);
}

function performanceLines(results: readonly SimulationResult[]) {
  const slowest = [...results].sort((a, b) => b.auditMetrics.runtimeMs - a.auditMetrics.runtimeMs)[0];
  const largest = [...results].sort((a, b) => b.auditMetrics.evidenceCount - a.auditMetrics.evidenceCount)[0];

  if (!slowest || !largest) {
    return ["- No performance data."];
  }

  return [
    `- Slowest scenario: ${slowest.scenarioId}, ${slowest.auditMetrics.runtimeMs}ms.`,
    `- Largest history: ${largest.scenarioId}, ${largest.auditMetrics.evidenceCount} evidence records.`,
    "- Hotspot risk: current development-state derivation scans historical evidence repeatedly; Supabase integration should plan snapshot/index support before large real histories.",
  ];
}
