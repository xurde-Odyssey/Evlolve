import { simulationScenarios } from "../scenarios/catalog";
import type { SimulationDuration, SimulationOptions } from "../types";
import { runSimulationScenario } from "./run-scenario";

export function runAllSimulationScenarios(options: SimulationOptions = {}) {
  return simulationScenarios.map((scenario) =>
    runSimulationScenario(scenario, {
      ...options,
      duration: options.duration ?? scenario.defaultDuration,
    }),
  );
}

export function parseDuration(value: string | undefined): SimulationDuration | undefined {
  if (
    value === "1w" ||
    value === "1m" ||
    value === "3m" ||
    value === "6m" ||
    value === "12m" ||
    value === "24m"
  ) {
    return value;
  }
  return undefined;
}
