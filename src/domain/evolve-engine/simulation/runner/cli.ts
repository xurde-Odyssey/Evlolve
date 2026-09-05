import { createSimulationAuditReport } from "../reports/audit-report";
import { getSimulationScenario } from "../scenarios/catalog";
import { runAllSimulationScenarios, parseDuration } from "./run-all";
import { runSimulationScenario } from "./run-scenario";
import { createSensitivityReport, runSensitivityAnalysis } from "./sensitivity-analysis";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.split("=");
    return [key ?? "", value ?? "true"];
  }),
);
const duration = parseDuration(args.duration);
const seed = args.seed ? Number(args.seed) : undefined;
const scenarioId = args.scenario;
const results = scenarioId
  ? [runOne(scenarioId, { duration, seed })]
  : runAllSimulationScenarios({ duration, seed });
const report = createSimulationAuditReport(results);
const sensitivityReport = args.sensitivity === "true" ? createSensitivityReport(runSensitivityAnalysis()) : "";

process.stdout.write(`${report}${sensitivityReport}`);

if (results.some((result) => result.invariantViolations.length > 0)) {
  process.exitCode = 1;
}

function runOne(
  scenarioId: string,
  options: { duration?: ReturnType<typeof parseDuration>; seed?: number },
) {
  const scenario = getSimulationScenario(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown simulation scenario: ${scenarioId}`);
  }
  return runSimulationScenario(scenario, options);
}
