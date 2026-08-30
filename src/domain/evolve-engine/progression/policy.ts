import type { LevelThresholdPolicy } from "./thresholds";

export type ProgressionRatingPolicy = {
  ratingFloor: number;
  ratingCeiling: number;
  confidenceFloor: number;
  saturationK: number;
  coreWeaknessBasePressure: number;
  behavioralPressureLimit: number;
  candidateHysteresis: number;
  riskHysteresis: number;
};

export const defaultProgressionRatingPolicy = {
  ratingFloor: 0,
  ratingCeiling: 100,
  confidenceFloor: 0.25,
  saturationK: 0.72,
  coreWeaknessBasePressure: 5.5,
  behavioralPressureLimit: 9,
  candidateHysteresis: 2.5,
  riskHysteresis: 4,
} satisfies ProgressionRatingPolicy;

export const defaultLevelThresholdPolicy = {
  thresholdForLevel(level: number) {
    if (level <= 1) {
      return 0;
    }

    return Math.min(100, 9 + level * 1.55 + level ** 1.22 * 0.58);
  },
  levelForRating(rating: number, maxLevel = 80) {
    let supported = 1;

    for (let level = 2; level <= maxLevel; level += 1) {
      if (rating >= this.thresholdForLevel(level)) {
        supported = level;
      }
    }

    return supported;
  },
  confirmationPeriodsForLevel(level: number) {
    if (level >= 40) {
      return 4;
    }

    if (level >= 20) {
      return 3;
    }

    return 2;
  },
} satisfies LevelThresholdPolicy;
