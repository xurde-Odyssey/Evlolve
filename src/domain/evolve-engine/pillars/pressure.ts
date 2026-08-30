import type {
  BehaviorInterferenceSignal,
  CoreWeaknessSignal,
  DevelopmentPillar,
  DevelopmentPressure,
} from "../types";

export function deriveDevelopmentPressure({
  coreWeaknesses = [],
  interferenceSignals = [],
}: {
  coreWeaknesses?: readonly CoreWeaknessSignal[];
  interferenceSignals?: readonly BehaviorInterferenceSignal[];
}): DevelopmentPressure[] {
  const pressureByPillar = new Map<DevelopmentPillar, DevelopmentPressure>();

  for (const weakness of coreWeaknesses) {
    pressureByPillar.set(weakness.pillar, {
      pillar: weakness.pillar,
      reason: "Core commitment weakness remains visible.",
      confidence: weakness.confidence,
      severity: weakness.severity,
      evidenceRefs: weakness.evidenceRefs,
    });
  }

  for (const signal of interferenceSignals) {
    if (
      signal.impactDirection !== "NEGATIVE_ASSOCIATION" ||
      !signal.affectedPillar
    ) {
      continue;
    }

    const existing = pressureByPillar.get(signal.affectedPillar);
    pressureByPillar.set(signal.affectedPillar, {
      pillar: signal.affectedPillar,
      reason: "Repeated behavior association may be interfering with development.",
      confidence: Math.max(existing?.confidence ?? 0, signal.confidence),
      severity: signal.confidence >= 0.7 ? "HIGH" : "MODERATE",
      evidenceRefs: [...(existing?.evidenceRefs ?? []), ...signal.evidenceRefs],
    });
  }

  return Array.from(pressureByPillar.values());
}
