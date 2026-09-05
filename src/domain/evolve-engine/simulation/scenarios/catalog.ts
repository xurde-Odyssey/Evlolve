import type { SimulatedCommitment, SimulationScenario } from "../types";

const baseCommitments = [
  commitment("running", "HEALTH", 4, "km", "three_per_week"),
  commitment("reading", "CAPABILITY", 24, "pages", "daily"),
  commitment("learning", "CAPABILITY", 45, "minutes", "weekday"),
] as const;

const socialCommitments = [
  commitment("reading", "CAPABILITY", 24, "pages", "daily"),
  commitment("learning", "CAPABILITY", 45, "minutes", "weekday"),
  commitment("meditation", "BALANCE", 10, "minutes", "daily"),
] as const;

export const simulationScenarios = [
  scenario("ideal-disciplined-beginner", "Scenario A - Ideal disciplined beginner", "ideal_beginner", "3m", 11, baseCommitments),
  scenario("static-easy-standard", "Scenario B - Perfect consistency, stagnant capability", "static_standard", "12m", 12, baseCommitments),
  scenario("high-capability-low-discipline", "Scenario C - High capability, low discipline", "capability_low_discipline", "6m", 13, baseCommitments),
  scenario("low-capability-high-attendance", "Scenario D - Low capability, high attendance", "attendance_capability_gap", "6m", 14, baseCommitments),
  scenario("mixed-failure", "Scenario E - Mixed failure", "mixed_failure", "6m", 15, baseCommitments),
  scenario("collapsing-core-commitment", "Scenario F - One collapsing Core commitment", "core_collapse", "6m", 16, baseCommitments),
  scenario("extreme-activity-farmer", "Scenario G - Extreme activity farmer", "extreme_farmer", "6m", 17, baseCommitments),
  scenario("minimum-threshold-gamer", "Scenario H - Minimum-threshold gamer", "minimum_threshold", "6m", 18, baseCommitments),
  scenario("heroic-catch-up-day", "Scenario I - One heroic catch-up day", "heroic_catchup", "3m", 19, baseCommitments),
  scenario("approved-inactive-period", "Scenario J - Approved inactive period", "inactive", "3m", 20, baseCommitments),
  scenario("reading-recovery", "Scenario K - Reading recovery", "reading_recovery", "3m", 21, baseCommitments),
  scenario("successful-adaptation", "Scenario L - Successful adaptation", "successful_adaptation", "6m", 22, [commitment("running", "HEALTH", 4, "km", "three_per_week")]),
  scenario("failed-adaptation", "Scenario M - Failed adaptation", "failed_adaptation", "6m", 23, [commitment("running", "HEALTH", 4, "km", "three_per_week")]),
  scenario("adaptation-protection-abuse", "Scenario N - Adaptation protection abuse", "adaptation_abuse", "6m", 24, [commitment("running", "HEALTH", 4, "km", "three_per_week")]),
  scenario("strong-social-strong-execution", "Scenario O - Strong social life with strong execution", "healthy_social", "6m", 25, socialCommitments),
  scenario("repeated-lifestyle-interference", "Scenario P - Repeated lifestyle interference", "lifestyle_interference", "6m", 26, baseCommitments),
  scenario("restraint-contract-maintained", "Scenario Q - Restraint contract maintained", "restraint_maintained", "3m", 27, socialCommitments),
  scenario("repeated-restraint-violations", "Scenario R - Repeated restraint violations", "restraint_violations", "6m", 28, socialCommitments),
  scenario("first-climb-to-high-level", "Scenario S - First climb to high Level", "high_level_climb", "24m", 29, baseCommitments),
  scenario("high-level-collapse", "Scenario T - High-Level collapse", "high_level_collapse", "12m", 30, baseCommitments, 32, 38),
  scenario("earned-comeback", "Scenario U - Earned comeback", "earned_comeback", "24m", 31, baseCommitments, 28, 38),
  scenario("weakly-established-high-level", "Scenario V - Weakly established high Level", "weak_high_level", "12m", 32, baseCommitments, 30, 36),
  scenario("collapse-recovery-cycling", "Scenario W - Repeated collapse/recovery cycling", "collapse_recovery_cycle", "24m", 33, baseCommitments, 20, 30),
  scenario("boss-rejection-gaming", "Scenario X - Boss rejection gaming", "boss_rejection", "12m", 34, baseCommitments),
  scenario("repeated-boss-completion", "Scenario Y - Repeated Boss completion", "boss_completion", "12m", 35, baseCommitments),
  scenario("balanced-profile-physical", "Scenario Z1 - Balanced physical profile", "balanced_profile", "12m", 36, [
    commitment("running", "HEALTH", 5, "km", "three_per_week"),
    commitment("workout", "HEALTH", 1, "session", "three_per_week"),
    commitment("reading", "CAPABILITY", 24, "pages", "daily"),
  ]),
  scenario("balanced-profile-learning", "Scenario Z2 - Balanced learning profile", "balanced_profile", "12m", 37, [
    commitment("reading", "CAPABILITY", 24, "pages", "daily"),
    commitment("learning", "CAPABILITY", 50, "minutes", "weekday"),
    commitment("career_project", "CAPABILITY", 50, "minutes", "weekday"),
  ]),
  scenario("balanced-profile-mixed", "Scenario Z3 - Balanced mixed profile", "balanced_profile", "12m", 38, [
    commitment("running", "HEALTH", 4, "km", "three_per_week"),
    commitment("learning", "CAPABILITY", 45, "minutes", "weekday"),
    commitment("meditation", "BALANCE", 10, "minutes", "daily"),
  ]),
  scenario("long-term-stagnation", "Long-term stagnation test", "long_stagnation", "24m", 39, baseCommitments),
  scenario("long-term-mastery", "Long-term mastery test", "long_mastery", "24m", 40, baseCommitments),
  scenario("boundary-baseline-maturity", "Boundary - baseline maturity", "boundary", "3m", 41, baseCommitments),
  scenario("boundary-target-increase", "Boundary - target increase eligibility", "boundary", "3m", 42, baseCommitments),
  scenario("boundary-demotion", "Boundary - demotion persistence", "boundary", "6m", 43, baseCommitments, 18, 22),
] satisfies SimulationScenario[];

export function getSimulationScenario(id: string) {
  return simulationScenarios.find((scenarioItem) => scenarioItem.id === id) ?? null;
}

function scenario(
  id: string,
  title: string,
  kind: SimulationScenario["kind"],
  defaultDuration: SimulationScenario["defaultDuration"],
  seed: number,
  commitments: readonly SimulatedCommitment[],
  initialLevel = 1,
  initialHighestLevel = initialLevel,
): SimulationScenario {
  return {
    id,
    title,
    kind,
    description: title,
    defaultDuration,
    seed,
    initialLevel,
    initialHighestLevel,
    commitments,
  };
}

function commitment(
  activityId: string,
  pillar: SimulatedCommitment["pillar"],
  targetValue: number,
  unit: string,
  schedule: SimulatedCommitment["schedule"],
): SimulatedCommitment {
  return {
    id: `core-${activityId}`,
    activityId,
    pillar,
    tier: "CORE",
    targetValue,
    unit,
    schedule,
  };
}
