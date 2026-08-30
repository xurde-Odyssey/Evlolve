export type LevelThresholdPolicy = {
  thresholdForLevel(level: number): number;
  levelForRating(rating: number, maxLevel?: number): number;
  confirmationPeriodsForLevel(level: number): number;
};
