import { evolveEnginePolicyRegistry } from "../policy-registry";
import { getSimulationScenario } from "../scenarios/catalog";
import type {
  SensitivityAnalysisResult,
  SensitivityVariantResult,
  SimulationPolicyOverrides,
} from "../types";
import { runSimulationScenario } from "./run-scenario";

const sensitivityScenarioIds = [
  "ideal-disciplined-beginner",
  "collapsing-core-commitment",
  "extreme-activity-farmer",
  "long-term-stagnation",
  "high-level-collapse",
] as const;

const sensitivityVariants = [
  {
    id: "rating-saturation-lower",
    coefficient: "progressionRating.saturationK",
    overrides: { progressionRating: { saturationK: 0.62 } },
  },
  {
    id: "rating-saturation-higher",
    coefficient: "progressionRating.saturationK",
    overrides: { progressionRating: { saturationK: 0.82 } },
  },
  {
    id: "core-weakness-pressure-lower",
    coefficient: "progressionRating.coreWeaknessBasePressure",
    overrides: { progressionRating: { coreWeaknessBasePressure: 4.5 } },
  },
  {
    id: "core-weakness-pressure-higher",
    coefficient: "progressionRating.coreWeaknessBasePressure",
    overrides: { progressionRating: { coreWeaknessBasePressure: 6.5 } },
  },
  {
    id: "candidate-confirmation-longer",
    coefficient: "levelThresholds.confirmationPeriodsForLevel",
    overrides: {
      levelThresholds: {
        confirmationPeriodsForLevel(level: number) {
          if (level >= 40) return 5;
          if (level >= 20) return 4;
          return 3;
        },
      },
    },
  },
  {
    id: "demotion-step-smaller",
    coefficient: "progressionRating.maxDemotionStep",
    overrides: { progressionRating: { maxDemotionStep: 2 } },
  },
  {
    id: "adaptation-evidence-longer",
    coefficient: "targetProgression.adaptationEvidenceFloor",
    overrides: { targetProgression: { adaptationEvidenceFloor: 7 } },
  },
] satisfies readonly {
  id: string;
  coefficient: string;
  overrides: SimulationPolicyOverrides;
}[];

export function runSensitivityAnalysis(): SensitivityAnalysisResult {
  const variants: SensitivityVariantResult[] = [];

  for (const scenarioId of sensitivityScenarioIds) {
    const scenario = getSimulationScenario(scenarioId);
    if (!scenario) {
      continue;
    }

    const baseline = runSimulationScenario(scenario);
    const baselineRating = baseline.progressionRatingHistory.at(-1)?.finalRating ?? 0;

    for (const variant of sensitivityVariants) {
      const result = runSimulationScenario(scenario, {
        policyVersion: `${evolveEnginePolicyRegistry.version}:${variant.id}`,
        policyOverrides: variant.overrides,
      });
      const variantRating = result.progressionRatingHistory.at(-1)?.finalRating ?? 0;
      const levelDelta = Math.abs(result.finalState.currentLevel - baseline.finalState.currentLevel);
      const ratingDelta = Math.abs(variantRating - baselineRating);
      const variantWarnings = result.warnings.map((warning) => warning.code);
      const unstable =
        result.invariantViolations.length > 0 ||
        levelDelta > 4 ||
        ratingDelta > 16 ||
        variantWarnings.includes("DEMOTION_TOO_SENSITIVE") ||
        variantWarnings.includes("RECOVERY_TOO_FAST");

      variants.push({
        id: variant.id,
        coefficient: variant.coefficient,
        scenarioId,
        baselineLevel: baseline.finalState.currentLevel,
        variantLevel: result.finalState.currentLevel,
        baselineRating,
        variantRating,
        baselineWarnings: baseline.warnings.map((warning) => warning.code),
        variantWarnings,
        invariantViolationCount: result.invariantViolations.length,
        unstable,
      });
    }
  }

  return {
    policyVersion: `${evolveEnginePolicyRegistry.version}:sensitivity`,
    variants,
    unstableVariants: variants.filter((variant) => variant.unstable),
  };
}

export function createSensitivityReport(result: SensitivityAnalysisResult) {
  const lines = [
    "## Sensitivity Analysis",
    "",
    `Policy version: ${result.policyVersion}`,
    `Variants: ${result.variants.length}`,
    `Unstable variants: ${result.unstableVariants.length}`,
    "",
  ];

  if (result.unstableVariants.length === 0) {
    lines.push("- No unstable coefficient variants detected in the selected audit matrix.");
  } else {
    lines.push(
      ...result.unstableVariants.map(
        (variant) =>
          `- ${variant.id} / ${variant.scenarioId}: L${variant.baselineLevel}->L${variant.variantLevel}, rating ${variant.baselineRating.toFixed(1)}->${variant.variantRating.toFixed(1)}`,
      ),
    );
  }

  return `${lines.join("\n")}\n`;
}
