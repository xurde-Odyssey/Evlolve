export const coreStoneStages = [
  ["ORIGIN", 1, 9, "The foundation."],
  ["AWAKENING", 10, 19, "Potential begins to show."],
  ["FORMING", 20, 29, "Structure is taking shape."],
  ["REFINED", 30, 39, "Effort becomes clarity."],
  ["STABILIZED", 40, 49, "Consistency creates strength."],
  ["ASCENDANT", 50, 59, "Your standard is rising."],
  ["EMPOWERED", 60, 69, "Capability is becoming established."],
  ["MASTERED", 70, 79, "Discipline has become structure."],
  ["EVOLVED", 80, 89, "Built through sustained effort."],
  ["TRANSCENDENT", 90, 99, "Beyond your previous standard."],
  ["APEX", 100, Number.POSITIVE_INFINITY, "Your strongest established form."],
] as const;

export type CoreStoneStageKey = (typeof coreStoneStages)[number][0];

export type CoreStoneStage = {
  key: CoreStoneStageKey;
  index: number;
  minLevel: number;
  maxLevel: number;
  progress: number;
  description: string;
};

export function getCoreStoneStage(level: number): CoreStoneStage {
  const normalizedLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  const index = coreStoneStages.findIndex(([, min, max]) => normalizedLevel >= min && normalizedLevel <= max);
  const safeIndex = index === -1 ? coreStoneStages.length - 1 : index;
  const [key, minLevel, maxLevel, description] = coreStoneStages[safeIndex]!;
  const range = Number.isFinite(maxLevel) ? maxLevel - minLevel : 1;
  const progress = Number.isFinite(maxLevel)
    ? Math.min(Math.max((normalizedLevel - minLevel) / range, 0), 1)
    : Math.min(Math.max((normalizedLevel - minLevel) / 100, 0), 1);

  return { key, index: safeIndex, minLevel, maxLevel, progress, description };
}
